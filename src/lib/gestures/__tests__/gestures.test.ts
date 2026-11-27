import { describe, it, expect, beforeEach } from 'vitest';
import { HandsFreeGestureDetector } from '../detector';
import type { NormalizedLandmark } from '@/trackers/types';

function createDummyLandmarks(): NormalizedLandmark[] {
  const lms: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0.0,
    visibility: 0.95,
  }));
  lms[0] = { x: 0.5, y: 0.2, z: 0, visibility: 0.95 }; // Nose
  lms[11] = { x: 0.4, y: 0.35, z: 0, visibility: 0.95 }; // Left shoulder
  lms[12] = { x: 0.6, y: 0.35, z: 0, visibility: 0.95 }; // Right shoulder
  lms[15] = { x: 0.35, y: 0.7, z: 0, visibility: 0.95 }; // Left wrist (down)
  lms[16] = { x: 0.65, y: 0.7, z: 0, visibility: 0.95 }; // Right wrist (down)
  return lms;
}

describe('Hands-Free Gesture Detector', () => {
  let detector: HandsFreeGestureDetector;

  beforeEach(() => {
    detector = new HandsFreeGestureDetector();
  });

  it('should detect no gesture in neutral position', () => {
    const lms = createDummyLandmarks();
    const res = detector.processLandmarks(lms, 1000);
    expect(res.activeGesture).toBe('none');
    expect(res.triggeredAction).toBe('none');
  });

  it('should detect raise_hand when wrist is above head and trigger toggle_pause after hold duration', () => {
    const lms = createDummyLandmarks();
    lms[0] = { x: 0.5, y: 0.4, z: 0, visibility: 0.95 }; // Nose
    lms[11] = { x: 0.4, y: 0.5, z: 0, visibility: 0.95 }; // Left shoulder
    lms[15] = { x: 0.4, y: 0.15, z: 0, visibility: 0.95 }; // Left wrist high up

    // Start
    const res1 = detector.processLandmarks(lms, 1000);
    expect(res1.activeGesture).toBe('raise_hand');
    expect(res1.progress).toBeLessThan(1.0);
    expect(res1.triggeredAction).toBe('none');

    // End after 1500ms
    const res2 = detector.processLandmarks(lms, 2500);
    expect(res2.progress).toBe(1.0);
    expect(res2.triggeredAction).toBe('toggle_pause');
  });

  it('should detect cross_arms and trigger finish_workout after hold duration', () => {
    const lms = createDummyLandmarks();
    lms[11] = { x: 0.35, y: 0.45, z: 0, visibility: 0.95 }; // Left shoulder
    lms[12] = { x: 0.65, y: 0.45, z: 0, visibility: 0.95 }; // Right shoulder
    lms[15] = { x: 0.63, y: 0.46, z: 0, visibility: 0.95 }; // Left wrist near right shoulder
    lms[16] = { x: 0.37, y: 0.46, z: 0, visibility: 0.95 }; // Right wrist near left shoulder

    // Start
    const res1 = detector.processLandmarks(lms, 1000);
    expect(res1.activeGesture).toBe('cross_arms');

    // End after 1900ms
    const res2 = detector.processLandmarks(lms, 2900);
    expect(res2.triggeredAction).toBe('finish_workout');
  });

  // Regresi: di posisi push-up (tubuh tidak tegak) gestur tidak boleh terpicu.
  // Sebelumnya kepala yang turun di bawah pergelangan terbaca "angkat tangan" -> sesi dijeda (tampak "stuck").
  it('ignores gestures when the torso is not upright (push-up bottom, front view)', () => {
    const lms = createDummyLandmarks();
    lms[0] = { x: 0.5, y: 0.75, z: 0, visibility: 0.95 }; // Nose di bawah wrist
    lms[11] = { x: 0.62, y: 0.68, z: 0, visibility: 0.95 };
    lms[12] = { x: 0.38, y: 0.68, z: 0, visibility: 0.95 };
    lms[15] = { x: 0.66, y: 0.72, z: 0, visibility: 0.95 };
    lms[16] = { x: 0.34, y: 0.72, z: 0, visibility: 0.95 };
    lms[23] = { x: 0.55, y: 0.6, z: 0, visibility: 0.95 }; // Pinggul setinggi/di atas bahu
    lms[24] = { x: 0.45, y: 0.6, z: 0, visibility: 0.95 };
    detector.processLandmarks(lms, 0);
    const res = detector.processLandmarks(lms, 3000);
    expect(res.activeGesture).toBe('none');
    expect(res.triggeredAction).toBe('none');
  });

  it('ignores gestures in side-view push-up (shoulder-hip line horizontal)', () => {
    const lms = createDummyLandmarks();
    lms[0] = { x: 0.2, y: 0.55, z: 0, visibility: 0.95 };
    lms[11] = { x: 0.3, y: 0.6, z: 0, visibility: 0.95 };
    lms[12] = { x: 0.3, y: 0.6, z: 0, visibility: 0.95 };
    lms[23] = { x: 0.6, y: 0.65, z: 0, visibility: 0.95 };
    lms[24] = { x: 0.6, y: 0.65, z: 0, visibility: 0.95 };
    lms[15] = { x: 0.3, y: 0.5, z: 0, visibility: 0.95 }; // wrist di atas nose
    detector.processLandmarks(lms, 0);
    expect(detector.processLandmarks(lms, 3000).triggeredAction).toBe('none');
  });
});
