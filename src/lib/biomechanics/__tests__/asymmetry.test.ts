import { describe, it, expect } from 'vitest';
import { analyzeBilateralSymmetry, AsymmetryAccumulator } from '../asymmetry';
import type { NormalizedLandmark } from '@/trackers/types';

function createMockLandmarks(): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  for (let i = 0; i < 33; i++) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });
  }
  return landmarks;
}

describe('Bilateral Asymmetry Analysis', () => {
  it('returns balanced result when left and right knees have equal flexion in squats', () => {
    const landmarks = createMockLandmarks();
    // Squat: Hip (23,24), Knee (25,26), Ankle (27,28)
    landmarks[23] = { x: 0.4, y: 0.4, z: 0, visibility: 0.95 };
    landmarks[25] = { x: 0.4, y: 0.7, z: 0, visibility: 0.95 };
    landmarks[27] = { x: 0.4, y: 0.9, z: 0, visibility: 0.95 };

    landmarks[24] = { x: 0.6, y: 0.4, z: 0, visibility: 0.95 };
    landmarks[26] = { x: 0.6, y: 0.7, z: 0, visibility: 0.95 };
    landmarks[28] = { x: 0.6, y: 0.9, z: 0, visibility: 0.95 };

    const result = analyzeBilateralSymmetry(landmarks, 'squat');
    expect(result).not.toBeNull();
    expect(result?.isImbalanced).toBe(false);
    expect(result?.diffDegrees).toBeLessThanOrEqual(5);
    expect(result?.balanceScore).toBeGreaterThanOrEqual(90);
  });

  it('flags imbalance when left knee bends significantly more than right knee in squats', () => {
    const landmarks = createMockLandmarks();
    // Left knee deeply bent (around 90 deg)
    landmarks[23] = { x: 0.4, y: 0.5, z: 0, visibility: 0.95 }; // hip
    landmarks[25] = { x: 0.4, y: 0.7, z: 0, visibility: 0.95 }; // knee
    landmarks[27] = { x: 0.2, y: 0.7, z: 0, visibility: 0.95 }; // ankle

    // Right knee barely bent (straight leg ~180 deg)
    landmarks[24] = { x: 0.6, y: 0.3, z: 0, visibility: 0.95 };
    landmarks[26] = { x: 0.6, y: 0.6, z: 0, visibility: 0.95 };
    landmarks[28] = { x: 0.6, y: 0.9, z: 0, visibility: 0.95 };

    const result = analyzeBilateralSymmetry(landmarks, 'squat');
    expect(result).not.toBeNull();
    expect(result?.isImbalanced).toBe(true);
    expect(result?.imbalancedSide).toBe('left');
    expect(result?.diffDegrees).toBeGreaterThan(12);
  });

  it('correctly calculates average session symmetry using AsymmetryAccumulator', () => {
    const acc = new AsymmetryAccumulator();
    expect(acc.getAverageScore()).toBe(96); // default baseline

    acc.addSample({
      leftAngle: 90,
      rightAngle: 90,
      diffDegrees: 0,
      balanceScore: 100,
      isImbalanced: false,
      imbalancedSide: 'balanced',
      jointName: 'Lutut',
    });

    acc.addSample({
      leftAngle: 85,
      rightAngle: 95,
      diffDegrees: 10,
      balanceScore: 80,
      isImbalanced: false,
      imbalancedSide: 'balanced',
      jointName: 'Lutut',
    });

    expect(acc.getAverageScore()).toBe(90);
  });
});
