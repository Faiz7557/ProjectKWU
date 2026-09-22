import { describe, it, expect, beforeEach } from 'vitest';
import type { NormalizedLandmark } from '../types';
import {
  PushupTracker,
  SquatTracker,
  SitupTracker,
  JumpingJackTracker,
  PlankTracker,
  createTracker,
} from '../index';

function createBlankPose(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0.0,
    visibility: 0.95,
  }));
}

describe('PushupTracker', () => {
  let tracker: PushupTracker;

  beforeEach(() => {
    tracker = new PushupTracker();
  });

  it('correctly increments rep on DOWN then UP motion', () => {
    const pose = createBlankPose();

    // 1. Initial position: arms straight (180 deg), body straight (180 deg)
    // Left shoulder (11), elbow (13), wrist (15)
    pose[11] = { x: 0.2, y: 0.3, z: 0, visibility: 0.95 };
    pose[13] = { x: 0.2, y: 0.5, z: 0, visibility: 0.95 };
    pose[15] = { x: 0.2, y: 0.8, z: 0, visibility: 0.95 };
    // Right arm
    pose[12] = { ...pose[11] };
    pose[14] = { ...pose[13] };
    pose[16] = { ...pose[15] };

    // Straight body line: Shoulder (0.2, 0.3), Hip (0.5, 0.4), Ankle (0.8, 0.5) -> 180°
    pose[23] = { x: 0.5, y: 0.4, z: 0, visibility: 0.95 };
    pose[24] = { ...pose[23] };
    pose[27] = { x: 0.8, y: 0.5, z: 0, visibility: 0.95 };
    pose[28] = { ...pose[27] };

    let res = tracker.processLandmarks(pose, 100);
    expect(res.state).toBe('up');
    expect(res.repCount).toBe(0);

    // 2. Down position: elbow bent (< 95 deg), body still straight
    // Shoulder (0.2, 0.5), Elbow (0.2, 0.7), Wrist (0.4, 0.7) -> 90 deg
    pose[11] = { x: 0.2, y: 0.5, z: 0, visibility: 0.95 };
    pose[13] = { x: 0.2, y: 0.7, z: 0, visibility: 0.95 };
    pose[15] = { x: 0.4, y: 0.7, z: 0, visibility: 0.95 };
    pose[12] = { ...pose[11] };
    pose[14] = { ...pose[13] };
    pose[16] = { ...pose[15] };

    // Straight body line in down position: Shoulder (0.2, 0.5), Hip (0.5, 0.6), Ankle (0.8, 0.7)
    pose[23] = { x: 0.5, y: 0.6, z: 0, visibility: 0.95 };
    pose[24] = { ...pose[23] };
    pose[27] = { x: 0.8, y: 0.7, z: 0, visibility: 0.95 };
    pose[28] = { ...pose[27] };

    res = tracker.processLandmarks(pose, 200);
    expect(res.state).toBe('down');
    expect(res.repCount).toBe(0);

    // 3. Up position: straight again (> 160 deg)
    pose[11] = { x: 0.2, y: 0.3, z: 0, visibility: 0.95 };
    pose[13] = { x: 0.2, y: 0.5, z: 0, visibility: 0.95 };
    pose[15] = { x: 0.2, y: 0.8, z: 0, visibility: 0.95 };
    pose[12] = { ...pose[11] };
    pose[14] = { ...pose[13] };
    pose[16] = { ...pose[15] };

    pose[23] = { x: 0.5, y: 0.4, z: 0, visibility: 0.95 };
    pose[24] = { ...pose[23] };
    pose[27] = { x: 0.8, y: 0.5, z: 0, visibility: 0.95 };
    pose[28] = { ...pose[27] };

    res = tracker.processLandmarks(pose, 300);
    expect(res.state).toBe('up');
    expect(res.repCount).toBe(1);
    expect(tracker.getCleanRepCount()).toBe(1);
  });

  it('detects sagging hips fault when hips drop', () => {
    const pose = createBlankPose();
    // Arm in down position
    pose[11] = { x: 0.2, y: 0.5, z: 0, visibility: 0.95 };
    pose[13] = { x: 0.2, y: 0.7, z: 0, visibility: 0.95 };
    pose[15] = { x: 0.4, y: 0.7, z: 0, visibility: 0.95 };
    pose[12] = { ...pose[11] };
    pose[14] = { ...pose[13] };
    pose[16] = { ...pose[15] };

    // Hips sagging: Shoulder (0.2, 0.5), Hip (0.5, 0.7), Ankle (0.8, 0.5) -> angle < 150°
    pose[23] = { x: 0.5, y: 0.7, z: 0, visibility: 0.95 };
    pose[24] = { ...pose[23] };
    pose[27] = { x: 0.8, y: 0.5, z: 0, visibility: 0.95 };
    pose[28] = { ...pose[27] };

    const res = tracker.processLandmarks(pose, 200);
    expect(res.hasFault).toBe(true);
    expect(res.activeFault?.id).toBe('sagging_hips');
  });

  it('rejects tracking when landmarks are occluded / low visibility', () => {
    const pose = createBlankPose();
    pose[11].visibility = 0.1;
    pose[12].visibility = 0.1;
    const res = tracker.processLandmarks(pose, 100);
    expect(res.isTracking).toBe(false);
  });
});

describe('SquatTracker', () => {
  it('counts 1 rep when knees bend below 100° and return above 160°', () => {
    const tracker = new SquatTracker();
    const pose = createBlankPose();

    // Standing straight: Hip (23), Knee (25), Ankle (27)
    pose[23] = { x: 0.5, y: 0.2, z: 0, visibility: 0.95 };
    pose[25] = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 };
    pose[27] = { x: 0.5, y: 0.8, z: 0, visibility: 0.95 };
    pose[24] = { ...pose[23] };
    pose[26] = { ...pose[25] };
    pose[28] = { ...pose[27] };

    let res = tracker.processLandmarks(pose, 100);
    expect(res.state).toBe('standing');
    expect(res.repCount).toBe(0);

    // Squatting down: 90 deg at knee
    pose[23] = { x: 0.3, y: 0.5, z: 0, visibility: 0.95 };
    pose[25] = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 };
    pose[27] = { x: 0.5, y: 0.8, z: 0, visibility: 0.95 };
    pose[24] = { ...pose[23] };
    pose[26] = { ...pose[25] };
    pose[28] = { ...pose[27] };

    res = tracker.processLandmarks(pose, 200);
    expect(res.state).toBe('squatting');
    expect(res.repCount).toBe(0);

    // Return standing straight
    pose[23] = { x: 0.5, y: 0.2, z: 0, visibility: 0.95 };
    pose[25] = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 };
    pose[27] = { x: 0.5, y: 0.8, z: 0, visibility: 0.95 };
    pose[24] = { ...pose[23] };
    pose[26] = { ...pose[25] };
    pose[28] = { ...pose[27] };

    res = tracker.processLandmarks(pose, 300);
    expect(res.state).toBe('standing');
    expect(res.repCount).toBe(1);
  });
});

describe('SitupTracker', () => {
  it('counts 1 rep on lying -> crunched -> lying', () => {
    const tracker = new SitupTracker();
    const pose = createBlankPose();

    // 1. Lying flat: Shoulder (11), Hip (23), Knee (25) -> straight line (180 deg)
    pose[11] = { x: 0.1, y: 0.8, z: 0, visibility: 0.95 };
    pose[23] = { x: 0.4, y: 0.8, z: 0, visibility: 0.95 };
    pose[25] = { x: 0.7, y: 0.8, z: 0, visibility: 0.95 };
    pose[12] = { ...pose[11] };
    pose[24] = { ...pose[23] };
    pose[26] = { ...pose[25] };

    let res = tracker.processLandmarks(pose, 100);
    expect(res.state).toBe('lying');
    expect(res.repCount).toBe(0);

    // 2. Crunched: Shoulder lifted up, ~80 deg at hip
    pose[11] = { x: 0.4, y: 0.4, z: 0, visibility: 0.95 };
    pose[23] = { x: 0.4, y: 0.8, z: 0, visibility: 0.95 };
    pose[25] = { x: 0.7, y: 0.8, z: 0, visibility: 0.95 };
    pose[12] = { ...pose[11] };
    pose[24] = { ...pose[23] };
    pose[26] = { ...pose[25] };

    res = tracker.processLandmarks(pose, 200);
    expect(res.state).toBe('crunched');
    expect(res.repCount).toBe(0);

    // 3. Return lying
    pose[11] = { x: 0.1, y: 0.8, z: 0, visibility: 0.95 };
    pose[23] = { x: 0.4, y: 0.8, z: 0, visibility: 0.95 };
    pose[25] = { x: 0.7, y: 0.8, z: 0, visibility: 0.95 };
    pose[12] = { ...pose[11] };
    pose[24] = { ...pose[23] };
    pose[26] = { ...pose[25] };

    res = tracker.processLandmarks(pose, 300);
    expect(res.state).toBe('lying');
    expect(res.repCount).toBe(1);
  });
});

describe('JumpingJackTracker', () => {
  it('counts 1 rep on closed -> open -> closed dual criteria', () => {
    const tracker = new JumpingJackTracker();
    const pose = createBlankPose();

    // Closed: Shoulders at 0.45 & 0.55 (width 0.10)
    // Wrists at side (low angle)
    // Ankles at 0.46 & 0.54 (width 0.08, ratio 0.8 < 1.1)
    pose[11] = { x: 0.45, y: 0.2, z: 0, visibility: 0.95 };
    pose[12] = { x: 0.55, y: 0.2, z: 0, visibility: 0.95 };
    pose[23] = { x: 0.47, y: 0.5, z: 0, visibility: 0.95 };
    pose[24] = { x: 0.53, y: 0.5, z: 0, visibility: 0.95 };
    pose[15] = { x: 0.44, y: 0.5, z: 0, visibility: 0.95 }; // Arm down
    pose[16] = { x: 0.56, y: 0.5, z: 0, visibility: 0.95 };
    pose[27] = { x: 0.46, y: 0.9, z: 0, visibility: 0.95 }; // Feet together
    pose[28] = { x: 0.54, y: 0.9, z: 0, visibility: 0.95 };

    let res = tracker.processLandmarks(pose, 100);
    expect(res.state).toBe('closed');
    expect(res.repCount).toBe(0);

    // Open: Wrists up high, ankles wide (ratio > 1.5)
    pose[15] = { x: 0.40, y: 0.05, z: 0, visibility: 0.95 }; // Arms up
    pose[16] = { x: 0.60, y: 0.05, z: 0, visibility: 0.95 };
    pose[27] = { x: 0.35, y: 0.9, z: 0, visibility: 0.95 }; // Feet wide (width 0.30, ratio 3.0)
    pose[28] = { x: 0.65, y: 0.9, z: 0, visibility: 0.95 };

    res = tracker.processLandmarks(pose, 200);
    expect(res.state).toBe('open');
    expect(res.repCount).toBe(0);

    // Return to closed
    pose[15] = { x: 0.44, y: 0.5, z: 0, visibility: 0.95 };
    pose[16] = { x: 0.56, y: 0.5, z: 0, visibility: 0.95 };
    pose[27] = { x: 0.46, y: 0.9, z: 0, visibility: 0.95 };
    pose[28] = { x: 0.54, y: 0.9, z: 0, visibility: 0.95 };

    res = tracker.processLandmarks(pose, 300);
    expect(res.state).toBe('closed');
    expect(res.repCount).toBe(1);
  });
});

describe('PlankTracker', () => {
  it('accumulates hold time when in straight body alignment', () => {
    const tracker = new PlankTracker();
    const pose = createBlankPose();

    // Straight body: Shoulder (0.2, 0.5), Hip (0.5, 0.5), Ankle (0.8, 0.5) -> 180 deg
    pose[11] = { x: 0.2, y: 0.5, z: 0, visibility: 0.95 };
    pose[23] = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 };
    pose[27] = { x: 0.8, y: 0.5, z: 0, visibility: 0.95 };
    pose[12] = { ...pose[11] };
    pose[24] = { ...pose[23] };
    pose[28] = { ...pose[27] };

    // Initial frame
    let res = tracker.processLandmarks(pose, 1000);
    expect(res.state).toBe('holding');

    // After 1000ms (1 second)
    res = tracker.processLandmarks(pose, 2000);
    expect(res.state).toBe('holding');
    expect(res.holdDuration).toBeGreaterThan(0.9);

    // Form break (sagging hips): Angle drops below 160°
    pose[23] = { x: 0.5, y: 0.7, z: 0, visibility: 0.95 };
    pose[24] = { ...pose[23] };

    res = tracker.processLandmarks(pose, 2500);
    expect(res.state).toBe('pause');
  });
});

describe('createTracker Factory', () => {
  it('throws descriptive error on unknown exercise id', () => {
    expect(() => createTracker('unknown_exercise')).toThrowError(/tidak ditemukan/);
  });
});
