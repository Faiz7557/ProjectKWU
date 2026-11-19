import type { NormalizedLandmark } from '@/trackers/types';

/*
 * Interpolasi pose yang menjaga panjang tulang: tiap tulang diputar (slerp arah) dari
 * induknya, bukan posisi sendi digeser lurus. Interpolasi linear posisi (interpolatePose)
 * membuat tungkai memendek di tengah gerakan, yang terlihat jelas pada manekin bervolume.
 */

const ROOT = -1;
/** Induk tiap sendi inti BlazePose; akar = titik tengah pinggul. Urutan = urutan proses. */
const CHAIN: Array<[child: number, parent: number]> = [
  [23, ROOT],
  [24, ROOT],
  [11, ROOT],
  [12, ROOT],
  [0, 11],
  [13, 11],
  [14, 12],
  [15, 13],
  [16, 14],
  [25, 23],
  [26, 24],
  [27, 25],
  [28, 26],
];

type V = { x: number; y: number; z: number };
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (a: V) => Math.hypot(a.x, a.y, a.z);
const mid = (a: V, b: V): V => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });

/** Slerp dua vektor satuan. */
function slerpDir(a: V, b: V, t: number): V {
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z));
  const ang = Math.acos(dot);
  if (ang < 1e-5 || Math.PI - ang < 1e-3) {
    // Sama arah, atau berlawanan (jarang di data pose): lerp lalu normalisasi.
    const v = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    const l = len(v) || 1;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  }
  const s = Math.sin(ang);
  const wa = Math.sin((1 - t) * ang) / s;
  const wb = Math.sin(t * ang) / s;
  return { x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb, z: a.z * wa + b.z * wb };
}

export function blendPose(a: NormalizedLandmark[], b: NormalizedLandmark[], t: number): NormalizedLandmark[] {
  const k = Math.min(1, Math.max(0, t));
  // Sendi di luar rantai: lerp biasa.
  const out: NormalizedLandmark[] = a.map((p, i) => {
    const q = b[i] ?? p;
    return { ...p, x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, z: p.z + (q.z - p.z) * k };
  });
  const rootA = mid(a[23], a[24]);
  const rootB = mid(b[23], b[24]);
  const root: V = {
    x: rootA.x + (rootB.x - rootA.x) * k,
    y: rootA.y + (rootB.y - rootA.y) * k,
    z: rootA.z + (rootB.z - rootA.z) * k,
  };
  for (const [c, p] of CHAIN) {
    const va = sub(a[c], p === ROOT ? rootA : a[p]);
    const vb = sub(b[c], p === ROOT ? rootB : b[p]);
    const la = len(va);
    const lb = len(vb);
    const base = p === ROOT ? root : out[p];
    if (la < 1e-9 || lb < 1e-9) continue;
    const d = slerpDir({ x: va.x / la, y: va.y / la, z: va.z / la }, { x: vb.x / lb, y: vb.y / lb, z: vb.z / lb }, k);
    const l = la + (lb - la) * k;
    out[c] = { ...out[c], x: base.x + d.x * l, y: base.y + d.y * l, z: base.z + d.z * l };
  }
  return out;
}
