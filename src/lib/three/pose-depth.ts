import { POSE_CONNECTIONS } from '@/lib/mediapipe/landmarks';
import type { NormalizedLandmark } from '@/trackers/types';

/** Hidung (0) + badan 11..32. Titik wajah 1..10 dilewati. */
export const BODY_JOINTS: number[] = [0, ...Array.from({ length: 22 }, (_, i) => 11 + i)];

const BODY_SET = new Set(BODY_JOINTS);

export const BODY_BONES: [number, number][] = POSE_CONNECTIONS.filter(
  ([a, b]) => BODY_SET.has(a) && BODY_SET.has(b),
);

const TORSO = new Set([11, 12, 23, 24]);

/** Salinan landmark dengan z buatan (data referensi z = 0). */
export function withDepth(
  landmarks: NormalizedLandmark[],
  orientation: 'side' | 'front',
): NormalizedLandmark[] {
  return landmarks.map((l, i) => {
    let z = 0;
    if (i >= 11 && i <= 32) {
      if (orientation === 'side') {
        const d = TORSO.has(i) ? 0.09 : 0.07;
        z = i % 2 === 1 ? -d : d;
      } else {
        z = 0.01;
      }
    }
    return { ...l, z };
  });
}

export function interpolatePose(
  a: NormalizedLandmark[],
  b: NormalizedLandmark[],
  t: number,
): NormalizedLandmark[] {
  const k = Math.min(1, Math.max(0, t));
  return a.map((p, i) => {
    const q = b[i] ?? p;
    return {
      x: p.x + (q.x - p.x) * k,
      y: p.y + (q.y - p.y) * k,
      z: p.z + (q.z - p.z) * k,
    };
  });
}
