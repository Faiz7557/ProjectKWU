import { describe, it, expect } from 'vitest';
import { OneEuroFilter, LandmarkSmoother, calculateAngle, distance2D } from '../base-tracker';

describe('OneEuroFilter and Math Utilities', () => {
  it('should compute exact angles for perpendicular and straight lines', () => {
    // 90 degree angle: (0, 1) -> (0, 0) -> (1, 0)
    const angle90 = calculateAngle({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(Math.round(angle90)).toBe(90);

    // 180 degree angle: (-1, 0) -> (0, 0) -> (1, 0)
    const angle180 = calculateAngle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(Math.round(angle180)).toBe(180);

    // Acute 45 degree angle
    const angle45 = calculateAngle({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 });
    expect(Math.round(angle45)).toBe(45);
  });

  it('should compute accurate 2D euclidean distance', () => {
    const dist = distance2D({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(dist).toBe(5);
  });

  it('should smooth out high frequency jitter on stationary coordinates', () => {
    const filter = new OneEuroFilter(1.0, 0.007);
    // Simulasikan getaran noise kecil di sekitar 0.50
    const noisySamples = [0.50, 0.54, 0.47, 0.53, 0.48, 0.52, 0.49, 0.51];
    const filteredResults: number[] = [];

    let time = 0;
    for (const sample of noisySamples) {
      filteredResults.push(filter.filter(sample, time));
      time += 0.033; // ~30 fps
    }

    // Hitung varians raw vs filtered
    const meanRaw = noisySamples.reduce((a, b) => a + b) / noisySamples.length;
    const varRaw = noisySamples.reduce((a, b) => a + (b - meanRaw) ** 2, 0) / noisySamples.length;

    const meanFiltered = filteredResults.reduce((a, b) => a + b) / filteredResults.length;
    const varFiltered = filteredResults.reduce((a, b) => a + (b - meanFiltered) ** 2, 0) / filteredResults.length;

    // Filter harus secara signifikan meredam variansi noise
    expect(varFiltered).toBeLessThan(varRaw);
  });

  it('should smooth a full 33-landmark pose set using LandmarkSmoother', () => {
    const smoother = new LandmarkSmoother(33);
    const mockLandmarks = Array.from({ length: 33 }, (_, i) => ({
      x: 0.5 + i * 0.01,
      y: 0.5,
      z: 0.0,
      visibility: 0.9,
    }));

    const result = smoother.smooth(mockLandmarks, 0.1);
    expect(result).toHaveLength(33);
    expect(result[0].x).toBeCloseTo(0.5, 2);
    expect(result[0].visibility).toBe(0.9);
  });
});
