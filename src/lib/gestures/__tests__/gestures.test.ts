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
});
