import * as THREE from 'three';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export interface MountOptions {
  build: (ctx: SceneContext) => void | (() => void);
  onFrame?: (ctx: SceneContext, timeSec: number, dtSec: number) => void;
  continuous?: boolean;
  fov?: number;
  onContextLost?: () => void;
}

export function isWebGLAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function mountScene(host: HTMLElement, options: MountOptions) {
  if (!isWebGLAvailable()) return null;

  const { continuous = true, fov = 35 } = options;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  const ctx: SceneContext = { scene, camera, renderer };

  let disposed = false;
  let lost = false;
  let visible = true;
  let running = false;
  let last = 0;
  const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  const renderOnce = () => {
    if (disposed || lost) return;
    renderer.render(scene, camera);
  };

  const tick = (ms: number) => {
    const t = ms / 1000;
    const dt = last ? t - last : 0;
    last = t;
    options.onFrame?.(ctx, t, dt);
    renderOnce();
  };

  const sync = () => {
    if (disposed) return;
    const should = continuous && visible && !reducedMq.matches && !lost;
    if (should) {
      if (!running) {
        running = true;
        last = 0;
        renderer.setAnimationLoop(tick);
      }
      return;
    }
    if (running) {
      running = false;
      renderer.setAnimationLoop(null);
    }
    // Satu frame statis (onFrame pada t=0 agar pose awal benar).
    options.onFrame?.(ctx, 0, 0);
    renderOnce();
  };

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!running) renderOnce();
  };

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      sync();
    },
    { rootMargin: '200px' },
  );
  io.observe(host);
  reducedMq.addEventListener('change', sync);

  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    running = false;
    renderer.setAnimationLoop(null);
    options.onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const cleanupBuild = options.build(ctx);
  resize();
  sync();

  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    ro.disconnect();
    io.disconnect();
    reducedMq.removeEventListener('change', sync);
    canvas.removeEventListener('webglcontextlost', onLost);
    if (typeof cleanupBuild === 'function') cleanupBuild();
    scene.traverse((obj) => {
      const o = obj as THREE.Mesh;
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const mat of mats) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
        mat.dispose();
      }
    });
    renderer.dispose();
    // Lepas konteks WebGL segera agar MediaPipe (GPU delegate) tidak berebut konteks di HP.
    renderer.forceContextLoss();
    canvas.remove();
  }

  return { ...ctx, renderOnce, dispose };
}
