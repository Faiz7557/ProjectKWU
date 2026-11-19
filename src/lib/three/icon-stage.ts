import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isWebGLAvailable } from './mount';
import { iconPose, MOTION_MS, MOTION_PARTS, REST, type IconMotion, type IconPose } from './icon-motion';

/*
 * Panggung ikon 3D: SATU WebGLRenderer untuk semua ikon di halaman (browser membatasi
 * jumlah konteks WebGL). Tiap ikon punya scene sendiri dan canvas 2D di host-nya;
 * renderer menggambar ke pojok kanvasnya lalu disalin ke canvas 2D (drawImage).
 * Geometri dibuat dari SVG lucide yang sudah ada di DOM: tiap goresan jadi tabung
 * (silinder + bola di ujung/sudut), senada dengan tulang figur hero.
 * Tanpa loop idle: render hanya saat ada animasi, resize, atau ganti tema.
 */

export interface IconHandle {
  play(m: IconMotion): void;
  drawIn(): void;
  dispose(): void;
}

interface Part {
  mesh: THREE.Mesh;
  pivot: THREE.Group;
}

interface Entry {
  host: HTMLElement;
  svg: SVGSVGElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: THREE.Group;
  parts: Part[];
  mat: THREE.MeshStandardMaterial;
  base: THREE.Color;
  accent: THREE.Color;
  w: number;
  h: number;
  visible: boolean;
  draw: number; // 0..1 bagian tabung yang sudah tergambar
  drawStart: number | null;
  anim: { m: IconMotion; start: number; step: number } | null;
  ticks: number;
  ro: ResizeObserver;
  io: IntersectionObserver;
}

const DRAW_MS = 700;
const TILT = new THREE.Euler(-0.42, 0.58, 0);
const DPR = () => Math.min(window.devicePixelRatio || 1, 1.5);
const reducedMq = () => window.matchMedia('(prefers-reduced-motion: reduce)');
const powerOut = (p: number) => 1 - (1 - p) ** 2; // power2.out

let renderer: THREE.WebGLRenderer | null = null;
let lost = false;
let bufW = 0;
let bufH = 0;
const entries = new Set<Entry>();
let themeObserver: MutationObserver | null = null;

function ensureRenderer(): THREE.WebGLRenderer | null {
  if (renderer) return lost ? null : renderer;
  if (!isWebGLAvailable()) return null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(1); // DPR diatur manual per ikon
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    renderer?.setAnimationLoop(null);
    // Kembali ke SVG untuk semua ikon.
    for (const en of entries) {
      en.canvas.remove();
      en.svg.style.visibility = '';
    }
  });
  themeObserver = new MutationObserver(() => {
    for (const en of entries) readColors(en);
    renderAll();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  return renderer;
}

function teardownRenderer() {
  renderer?.setAnimationLoop(null);
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer = null;
  themeObserver?.disconnect();
  themeObserver = null;
  lost = false;
  bufW = bufH = 0;
}

/** SVG lucide (viewBox 24) -> satu geometri tabung per elemen, koordinat [-1, 1]. */
function buildPartGeometries(svg: SVGSVGElement, radius: number): THREE.BufferGeometry[] {
  const data = new SVGLoader().parse(svg.outerHTML);
  const Y = new THREE.Vector3(0, 1, 0);
  const toV = (p: THREE.Vector2) => new THREE.Vector3((p.x - 12) / 12, (12 - p.y) / 12, 0);
  const sphere = new THREE.SphereGeometry(radius, 12, 8);
  const out: THREE.BufferGeometry[] = [];

  for (const path of data.paths) {
    const pieces: THREE.BufferGeometry[] = [];
    for (const sub of path.subPaths) {
      const raw = sub.getPoints(24).map(toV);
      if (sub.autoClose && raw.length > 2 && !raw[0].equals(raw[raw.length - 1])) raw.push(raw[0].clone());
      // Buang titik yang lebih rapat dari ~1 radius: segmen mikro di lengkung kecil saling tumpuk dan berbintik.
      const pts = raw.slice();
      for (let k = 1; k < pts.length - 1; k++) {
        if (pts[k].distanceTo(pts[k - 1]) < radius * 0.9) pts.splice(k--, 1);
      }
      if (pts.length < 2) continue;
      const closed = pts[0].distanceTo(pts[pts.length - 1]) < 1e-4;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const len = a.distanceTo(b);
        if (len < 1e-5) continue;
        const cyl = new THREE.CylinderGeometry(radius, radius, len, 10, 1, true);
        const dir = b.clone().sub(a).normalize();
        const m = new THREE.Matrix4().compose(
          a.clone().add(b).multiplyScalar(0.5),
          new THREE.Quaternion().setFromUnitVectors(Y, dir),
          new THREE.Vector3(1, 1, 1),
        );
        pieces.push(cyl.applyMatrix4(m));
        // Bola di ujung terbuka dan di sudut tajam (> 20 derajat) agar sambungan bulat seperti stroke lucide.
        const prev = i > 0 ? pts[i].clone().sub(pts[i - 1]).normalize() : null;
        const isStart = i === 0 && !closed;
        const sharp = prev ? prev.angleTo(dir) > 0.35 : false;
        if (isStart || sharp) pieces.push(sphere.clone().translate(a.x, a.y, a.z));
      }
      if (!closed) {
        const end = pts[pts.length - 1];
        pieces.push(sphere.clone().translate(end.x, end.y, end.z));
      }
    }
    if (!pieces.length) continue;
    const merged = mergeGeometries(pieces.map((g) => (g.index ? g.toNonIndexed() : g)));
    pieces.forEach((g) => g.dispose());
    if (merged) out.push(merged);
  }
  sphere.dispose();
  return out;
}

function readColors(en: Entry) {
  const cs = getComputedStyle(en.host);
  en.base.set(cs.color || '#ffffff');
  // Ink murni terlalu pekat untuk menampakkan shading; naikkan sedikit.
  const hsl = { h: 0, s: 0, l: 0 };
  en.base.getHSL(hsl);
  if (hsl.l < 0.2) en.base.lerp(new THREE.Color(0xffffff), 0.06);
  const acc = cs.getPropertyValue('--panel-8').trim();
  en.accent.set(acc || '#e3b867');
  en.mat.color.copy(en.base);
}

function applyPose(en: Entry, pose: IconPose) {
  en.root.position.y = pose.y;
  en.root.rotation.set(TILT.x + pose.rx, TILT.y + pose.ry, TILT.z + pose.rz);
  en.root.scale.set(1, pose.sy, 1);
  en.parts.forEach((part, i) => {
    part.pivot.scale.setScalar(pose.partScale[i] ?? 1);
    // Jarum metronom tetap di posisi ketukan terakhir di luar animasi.
    const keep = i === MOTION_PARTS.tickHand ? part.pivot.rotation.z : 0;
    part.pivot.rotation.z = pose.partRz[i] ?? keep;
  });
  en.mat.color.copy(en.base).lerp(en.accent, pose.glow);
}

function applyDraw(en: Entry) {
  for (const part of en.parts) {
    const count = (part.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).count;
    const n = Math.floor((count * en.draw) / 3) * 3;
    part.mesh.geometry.setDrawRange(0, n);
  }
}

function renderEntry(en: Entry) {
  if (!renderer || lost || !en.visible || !en.w || !en.h) return;
  const dpr = DPR();
  const W = Math.max(1, Math.round(en.w * dpr));
  const H = Math.max(1, Math.round(en.h * dpr));
  if (W > bufW || H > bufH) {
    bufW = Math.max(bufW, W);
    bufH = Math.max(bufH, H);
    renderer.setSize(bufW, bufH, false);
  }
  if (en.canvas.width !== W || en.canvas.height !== H) {
    en.canvas.width = W;
    en.canvas.height = H;
  }
  renderer.setViewport(0, 0, W, H);
  renderer.setScissor(0, 0, W, H);
  renderer.setScissorTest(true);
  renderer.clear();
  renderer.render(en.scene, en.camera);
  // Viewport WebGL mulai dari kiri bawah kanvas renderer.
  en.ctx.clearRect(0, 0, W, H);
  en.ctx.drawImage(renderer.domElement, 0, bufH - H, W, H, 0, 0, W, H);
}

function renderAll() {
  for (const en of entries) renderEntry(en);
}

function animating(en: Entry) {
  return en.anim !== null || en.drawStart !== null;
}

function frame(ms: number) {
  let any = false;
  for (const en of entries) {
    if (!animating(en)) continue;
    any = true;
    if (en.drawStart !== null) {
      const p = Math.min(1, (ms - en.drawStart) / DRAW_MS);
      en.draw = powerOut(p);
      applyDraw(en);
      if (p >= 1) en.drawStart = null;
    }
    if (en.anim) {
      const { m, start, step } = en.anim;
      const p = Math.min(1, (ms - start) / MOTION_MS[m]);
      applyPose(en, iconPose(m, p, step));
      if (p >= 1) en.anim = null;
    }
    renderEntry(en);
  }
  if (!any) renderer?.setAnimationLoop(null);
}

function kick() {
  renderer?.setAnimationLoop(frame);
}

export function registerIcon(host: HTMLElement, svg: SVGSVGElement, opts: { drawn: boolean }): IconHandle | null {
  const r = ensureRenderer();
  if (!r) return null;

  const strokeWidth = Number(svg.getAttribute('stroke-width')) || 2;
  // Sedikit lebih tebal dari stroke asli agar terbaca sebagai volume.
  const geos = buildPartGeometries(svg, (strokeWidth / 2 / 12) * 1.6);
  if (!geos.length) return null;

  const scene = new THREE.Scene();
  // FOV lebar + kamera dekat = perspektif lebih kuat, kedalaman tabung lebih terasa.
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(0, 0, 3.6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(-2, 3, 4);
  scene.add(sun);

  // Plastik mengilap: kilap spekular membuat tabung terbaca 3D bahkan saat warnanya ink.
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0 });
  const root = new THREE.Group();
  const isTimer = svg.classList.contains('lucide-timer');
  const parts: Part[] = geos.map((geo, i) => {
    // Pivot: pusat bagian, kecuali jarum timer berputar di pusat lingkaran (12, 14).
    geo.computeBoundingBox();
    const c = new THREE.Vector3();
    geo.boundingBox!.getCenter(c);
    if (isTimer && i === MOTION_PARTS.tickHand) c.set(0, (12 - 14) / 12, 0);
    geo.translate(-c.x, -c.y, -c.z);
    const mesh = new THREE.Mesh(geo, mat);
    const pivot = new THREE.Group();
    pivot.position.copy(c);
    pivot.add(mesh);
    root.add(pivot);
    return { mesh, pivot };
  });
  scene.add(root);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const en: Entry = {
    host,
    svg,
    canvas,
    ctx,
    scene,
    camera,
    root,
    parts,
    mat,
    base: new THREE.Color(),
    accent: new THREE.Color(),
    w: 0,
    h: 0,
    visible: false,
    draw: opts.drawn ? 1 : 0,
    drawStart: null,
    anim: null,
    ticks: 0,
    ro: new ResizeObserver(() => {
      en.w = host.clientWidth;
      en.h = host.clientHeight;
      camera.aspect = en.w && en.h ? en.w / en.h : 1;
      camera.updateProjectionMatrix();
      renderEntry(en);
    }),
    io: new IntersectionObserver(
      ([e]) => {
        en.visible = e?.isIntersecting ?? true;
        if (en.visible) renderEntry(en);
      },
      { rootMargin: '200px' },
    ),
  };
  readColors(en);
  applyPose(en, REST);
  applyDraw(en);
  host.appendChild(canvas);
  svg.style.visibility = 'hidden';
  entries.add(en);
  en.ro.observe(host);
  en.io.observe(host);

  return {
    play(m) {
      if (lost) return;
      if (en.anim && m !== 'tick') return; // satu gerakan per pemicu, tanpa antrean
      const motion: IconMotion = reducedMq().matches ? 'flash' : m;
      if (en.anim?.m === 'tick') applyPose(en, iconPose('tick', 1, en.anim.step)); // selesaikan ketukan sebelumnya
      const step = motion === 'tick' ? en.ticks++ : 0;
      en.anim = { m: motion, start: performance.now(), step };
      kick();
    },
    drawIn() {
      if (lost || en.draw >= 1 || en.drawStart !== null) return;
      if (reducedMq().matches) {
        en.draw = 1;
        applyDraw(en);
        renderEntry(en);
        return;
      }
      en.drawStart = performance.now();
      kick();
    },
    dispose() {
      en.ro.disconnect();
      en.io.disconnect();
      entries.delete(en);
      en.canvas.remove();
      en.svg.style.visibility = '';
      en.parts.forEach((p) => p.mesh.geometry.dispose());
      en.mat.dispose();
      if (!entries.size) teardownRenderer();
    },
  };
}
