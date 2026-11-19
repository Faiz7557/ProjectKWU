import { describe, expect, it } from 'vitest';
import { blendPose } from '../pose-blend';
import { withDepth } from '../pose-depth';
import { EXERCISE_REFERENCES } from '@/lib/mediapipe/reference-poses';

const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe('blendPose', () => {
  const ref = EXERCISE_REFERENCES.squat;
  const [a, b] = ref.phases.map((p) => withDepth(p.landmarks, ref.orientation));

  it('t=0 dan t=1 sama dengan pose ujung', () => {
    for (const i of [11, 13, 15, 23, 25, 27]) {
      expect(dist(blendPose(a, b, 0)[i], a[i])).toBeCloseTo(0, 6);
      expect(dist(blendPose(a, b, 1)[i], b[i])).toBeCloseTo(0, 6);
    }
  });

  it('panjang paha tetap di tengah gerakan (bukan tali busur)', () => {
    const lenA = dist(a[23], a[25]);
    const lenB = dist(b[23], b[25]);
    const half = blendPose(a, b, 0.5);
    expect(dist(half[23], half[25])).toBeCloseTo((lenA + lenB) / 2, 6);
  });
});
