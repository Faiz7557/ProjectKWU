import { describe, it, expect } from 'vitest';
import { analyzeBilateralSymmetry, AsymmetryAccumulator } from '../asymmetry';
import type { NormalizedLandmark } from '@/trackers/types';

function frontPose(leftElbowY: number, rightElbowY: number): NormalizedLandmark[] {
  const lm: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
  lm[11] = { x: 0.4, y: 0.3, z: 0, visibility: 0.95 }; // bahu kiri
  lm[12] = { x: 0.6, y: 0.3, z: 0, visibility: 0.95 }; // bahu kanan
  lm[23] = { x: 0.42, y: 0.6, z: 0, visibility: 0.95 }; // pinggul kiri
  lm[24] = { x: 0.58, y: 0.6, z: 0, visibility: 0.95 }; // pinggul kanan
  lm[13] = { x: 0.25, y: leftElbowY, z: 0, visibility: 0.95 };
  lm[14] = { x: 0.75, y: rightElbowY, z: 0, visibility: 0.95 };
  return lm;
}

describe('Bilateral Asymmetry Analysis', () => {
  it('seimbang saat kedua lengan terangkat setinggi', () => {
    const r = analyzeBilateralSymmetry(frontPose(0.2, 0.2), 'jumping_jack');
    expect(r).not.toBeNull();
    expect(r?.isImbalanced).toBe(false);
    expect(r?.balanceScore).toBeGreaterThanOrEqual(95);
  });

  it('menandai lengan kiri yang tertinggal', () => {
    const r = analyzeBilateralSymmetry(frontPose(0.45, 0.1), 'jumping_jack');
    expect(r?.isImbalanced).toBe(true);
    expect(r?.imbalancedSide).toBe('left');
  });

  it('tidak menilai simetri untuk latihan tampak samping', () => {
    for (const id of ['squat', 'pushup', 'plank', 'situp']) {
      expect(analyzeBilateralSymmetry(frontPose(0.2, 0.2), id)).toBeNull();
    }
  });

  it('AsymmetryAccumulator: null tanpa data, rata-rata setelah ada sampel', () => {
    const acc = new AsymmetryAccumulator();
    expect(acc.getAverageScore()).toBeNull();
    const base = { leftAngle: 90, rightAngle: 90, diffDegrees: 0, isImbalanced: false, imbalancedSide: 'balanced' as const, jointName: 'Lengan' };
    acc.addSample({ ...base, balanceScore: 100 });
    acc.addSample({ ...base, balanceScore: 80 });
    expect(acc.getAverageScore()).toBe(90);
  });
});
