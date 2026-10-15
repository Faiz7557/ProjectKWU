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

const FRAME_MS = 33; // ~30 fps, cadence nyata (debounce butuh beberapa frame)

function createBlankPose(): NormalizedLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0.0, visibility: 0.95 }));
}

function setPoint(pose: NormalizedLandmark[], idx: number, x: number, y: number): void {
  pose[idx] = { x, y, z: 0, visibility: 0.95 };
}

/** Interpolasi linear dua pose (u=0 -> a, u=1 -> b). */
function lerpPose(a: NormalizedLandmark[], b: NormalizedLandmark[], u: number): NormalizedLandmark[] {
  return a.map((p, i) => ({
    x: p.x + (b[i].x - p.x) * u,
    y: p.y + (b[i].y - p.y) * u,
    z: 0,
    visibility: 0.95,
  }));
}

interface Tracker {
  processLandmarks: (lms: NormalizedLandmark[], t: number) => ReturnType<PushupTracker['processLandmarks']>;
}

/** Menahan pose selama durasi tertentu. Mengembalikan waktu akhir dan hasil terakhir. */
function hold(tracker: Tracker, pose: NormalizedLandmark[], t: number, durationMs: number) {
  let res = tracker.processLandmarks(pose, t);
  const steps = Math.round(durationMs / FRAME_MS);
  for (let i = 1; i <= steps; i++) {
    res = tracker.processLandmarks(pose, t + i * FRAME_MS);
  }
  return { t: t + steps * FRAME_MS, res };
}

/** Transisi linear dari pose a ke pose b selama durasi tertentu. */
function sweep(tracker: Tracker, a: NormalizedLandmark[], b: NormalizedLandmark[], t: number, durationMs: number) {
  const steps = Math.round(durationMs / FRAME_MS);
  let res = tracker.processLandmarks(a, t);
  for (let i = 1; i <= steps; i++) {
    res = tracker.processLandmarks(lerpPose(a, b, i / steps), t + i * FRAME_MS);
  }
  return { t: t + steps * FRAME_MS, res };
}

// ── Push-up ──────────────────────────────────────────────────────────────────

function pushupTop(): NormalizedLandmark[] {
  const pose = createBlankPose();
  // Lengan lurus (~180°), tubuh lurus (bahu-pinggul-kaki)
  setPoint(pose, 11, 0.2, 0.3); setPoint(pose, 13, 0.2, 0.5); setPoint(pose, 15, 0.2, 0.8);
  setPoint(pose, 23, 0.5, 0.4); setPoint(pose, 27, 0.8, 0.5);
  pose[12] = { ...pose[11] }; pose[14] = { ...pose[13] }; pose[16] = { ...pose[15] };
  pose[24] = { ...pose[23] }; pose[28] = { ...pose[27] };
  return pose;
}

function pushupBottom(hipY = 0.6): NormalizedLandmark[] {
  const pose = createBlankPose();
  // Siku menekuk ~90°, tubuh tetap lurus
  setPoint(pose, 11, 0.2, 0.5); setPoint(pose, 13, 0.2, 0.7); setPoint(pose, 15, 0.4, 0.7);
  setPoint(pose, 23, 0.5, hipY); setPoint(pose, 27, 0.8, 0.7);
  pose[12] = { ...pose[11] }; pose[14] = { ...pose[13] }; pose[16] = { ...pose[15] };
  pose[24] = { ...pose[23] }; pose[28] = { ...pose[27] };
  return pose;
}

describe('PushupTracker', () => {
  let tracker: PushupTracker;

  beforeEach(() => {
    tracker = new PushupTracker();
  });

  it('counts a full rep: top -> bottom -> top', () => {
    let t = hold(tracker, pushupTop(), 0, 200).t;
    t = sweep(tracker, pushupTop(), pushupBottom(), t, 800).t;
    expect(hold(tracker, pushupBottom(), t, 200).res.state).toBe('down');
    t = hold(tracker, pushupBottom(), t, 200).t;
    t = sweep(tracker, pushupBottom(), pushupTop(), t, 800).t;
    const res = hold(tracker, pushupTop(), t, 200).res;

    expect(res.state).toBe('up');
    expect(res.repCount).toBe(1);
    expect(res.cleanRepCount).toBe(1);
    expect(res.formScore).toBe(100);
  });

  it('does not count a half rep and records incomplete_depth', () => {
    // Turun ~70% jalan: siku ≈ 116°, sudah turun nyata tapi belum mencapai bottom (95°)
    const mid = lerpPose(pushupTop(), pushupBottom(), 0.7);
    let t = hold(tracker, pushupTop(), 0, 200).t;
    t = sweep(tracker, pushupTop(), mid, t, 600).t;
    t = sweep(tracker, mid, pushupTop(), t, 600).t;
    const res = hold(tracker, pushupTop(), t, 200).res;

    expect(res.repCount).toBe(0);
    expect(tracker.getFaults().some((f) => f.id === 'incomplete_depth')).toBe(true);
  });

  it('ignores a single-frame noise spike at the bottom', () => {
    let t = hold(tracker, pushupTop(), 0, 200).t;
    tracker.processLandmarks(pushupBottom(), t + FRAME_MS);
    t = hold(tracker, pushupTop(), t + FRAME_MS, 400).t;
    expect(hold(tracker, pushupTop(), t, 100).res.repCount).toBe(0);
  });

  it('detects sagging hips and records it against the completed rep', () => {
    let t = hold(tracker, pushupTop(), 0, 200).t;
    t = sweep(tracker, pushupTop(), pushupBottom(0.75), t, 800).t;
    t = hold(tracker, pushupBottom(0.75), t, 200).t;
    t = sweep(tracker, pushupBottom(0.75), pushupTop(), t, 800).t;
    const res = hold(tracker, pushupTop(), t, 200).res;

    expect(res.repCount).toBe(1);
    expect(res.cleanRepCount).toBe(0);
    expect(tracker.getFaults().some((f) => f.id === 'sagging_hips')).toBe(true);
  });

  it('rejects tracking when landmarks are occluded / low visibility', () => {
    const pose = createBlankPose();
    pose[11].visibility = 0.1;
    pose[12].visibility = 0.1;
    expect(tracker.processLandmarks(pose, 100).isTracking).toBe(false);
  });

  it('aborts an in-progress rep when tracking is lost for more than 300 ms', () => {
    let t = hold(tracker, pushupTop(), 0, 200).t;
    t = sweep(tracker, pushupTop(), pushupBottom(), t, 800).t;
    // Tubuh hilang selama ~660 ms
    const lost = createBlankPose().map((p) => ({ ...p, visibility: 0.1 }));
    for (let i = 1; i <= 20; i++) tracker.processLandmarks(lost, t + i * FRAME_MS);
    t += 20 * FRAME_MS;
    // Kembali naik: rep sudah dibatalkan, jadi tidak boleh dihitung penuh
    t = sweep(tracker, pushupBottom(), pushupTop(), t, 800).t;
    expect(hold(tracker, pushupTop(), t, 200).res.repCount).toBe(0);
  });
});

// ── Squat ────────────────────────────────────────────────────────────────────

function squatPose(hipX: number, hipY: number): NormalizedLandmark[] {
  const pose = createBlankPose();
  // Torso tegak di atas pinggul (bahu = pinggul + (0,-0.3)); lutut dan ankle tetap.
  setPoint(pose, 11, hipX, hipY - 0.3); setPoint(pose, 12, hipX, hipY - 0.3);
  setPoint(pose, 23, hipX, hipY); setPoint(pose, 24, hipX, hipY);
  setPoint(pose, 25, 0.5, 0.5); setPoint(pose, 26, 0.5, 0.5);
  setPoint(pose, 27, 0.5, 0.8); setPoint(pose, 28, 0.5, 0.8);
  return pose;
}

const SQUAT_STANDING = squatPose(0.5, 0.2);
const SQUAT_DEEP = squatPose(0.3, 0.5);       // lutut ≈ 90°
const SQUAT_HALF = squatPose(0.254, 0.328);   // lutut ≈ 125°

describe('SquatTracker', () => {
  it('counts 1 rep when knees bend below the bottom threshold and return', () => {
    const tracker = new SquatTracker();
    let t = hold(tracker, SQUAT_STANDING, 0, 200).t;
    t = sweep(tracker, SQUAT_STANDING, SQUAT_DEEP, t, 800).t;
    expect(hold(tracker, SQUAT_DEEP, t, 200).res.state).toBe('squatting');
    t = hold(tracker, SQUAT_DEEP, t, 200).t;
    t = sweep(tracker, SQUAT_DEEP, SQUAT_STANDING, t, 800).t;
    const res = hold(tracker, SQUAT_STANDING, t, 200).res;
    expect(res.state).toBe('standing');
    expect(res.repCount).toBe(1);
  });

  it('does not count a half squat and records shallow_squat', () => {
    const tracker = new SquatTracker();
    let t = hold(tracker, SQUAT_STANDING, 0, 200).t;
    t = sweep(tracker, SQUAT_STANDING, SQUAT_HALF, t, 600).t;
    t = hold(tracker, SQUAT_HALF, t, 200).t;
    t = sweep(tracker, SQUAT_HALF, SQUAT_STANDING, t, 600).t;
    const res = hold(tracker, SQUAT_STANDING, t, 200).res;
    expect(res.repCount).toBe(0);
    expect(tracker.getFaults().some((f) => f.id === 'shallow_squat')).toBe(true);
  });
});

// ── Sit-up ───────────────────────────────────────────────────────────────────

function situpPose(shoulderX: number, shoulderY: number): NormalizedLandmark[] {
  const pose = createBlankPose();
  setPoint(pose, 11, shoulderX, shoulderY); setPoint(pose, 12, shoulderX, shoulderY);
  setPoint(pose, 23, 0.4, 0.8); setPoint(pose, 24, 0.4, 0.8);
  setPoint(pose, 25, 0.7, 0.8); setPoint(pose, 26, 0.7, 0.8);
  return pose;
}

const SITUP_LYING = situpPose(0.1, 0.8);
const SITUP_CRUNCH = situpPose(0.4, 0.4);    // torso ≈ 90°
const SITUP_PARTIAL = situpPose(0.22, 0.64); // torso ≈ 34°

describe('SitupTracker', () => {
  it('counts 1 rep on lying -> crunched -> lying', () => {
    const tracker = new SitupTracker();
    let t = hold(tracker, SITUP_LYING, 0, 200).t;
    expect(tracker.processLandmarks(SITUP_LYING, t).state).toBe('lying');
    t = sweep(tracker, SITUP_LYING, SITUP_CRUNCH, t, 800).t;
    expect(hold(tracker, SITUP_CRUNCH, t, 200).res.state).toBe('crunched');
    t = hold(tracker, SITUP_CRUNCH, t, 200).t;
    t = sweep(tracker, SITUP_CRUNCH, SITUP_LYING, t, 800).t;
    const res = hold(tracker, SITUP_LYING, t, 200).res;
    expect(res.repCount).toBe(1);
    expect(res.cleanRepCount).toBe(1);
  });

  it('does not count a partial crunch', () => {
    const tracker = new SitupTracker();
    let t = hold(tracker, SITUP_LYING, 0, 200).t;
    t = sweep(tracker, SITUP_LYING, SITUP_PARTIAL, t, 600).t;
    t = sweep(tracker, SITUP_PARTIAL, SITUP_LYING, t, 600).t;
    expect(hold(tracker, SITUP_LYING, t, 200).res.repCount).toBe(0);
  });
});

// ── Jumping jack ─────────────────────────────────────────────────────────────

function jackPose(open: boolean): NormalizedLandmark[] {
  const pose = createBlankPose();
  setPoint(pose, 11, 0.45, 0.2); setPoint(pose, 12, 0.55, 0.2);
  setPoint(pose, 23, 0.47, 0.5); setPoint(pose, 24, 0.53, 0.5);
  setPoint(pose, 15, open ? 0.4 : 0.44, open ? 0.05 : 0.5);
  setPoint(pose, 16, open ? 0.6 : 0.56, open ? 0.05 : 0.5);
  setPoint(pose, 27, open ? 0.35 : 0.46, 0.9);
  setPoint(pose, 28, open ? 0.65 : 0.54, 0.9);
  return pose;
}

describe('JumpingJackTracker', () => {
  it('counts 1 rep on closed -> open -> closed', () => {
    const tracker = new JumpingJackTracker();
    let t = hold(tracker, jackPose(false), 0, 200).t;
    expect(tracker.processLandmarks(jackPose(false), t).state).toBe('closed');
    t = sweep(tracker, jackPose(false), jackPose(true), t, 400).t;
    expect(hold(tracker, jackPose(true), t, 200).res.state).toBe('open');
    t = hold(tracker, jackPose(true), t, 200).t;
    t = sweep(tracker, jackPose(true), jackPose(false), t, 400).t;
    const res = hold(tracker, jackPose(false), t, 200).res;
    expect(res.repCount).toBe(1);
    expect(res.cleanRepCount).toBe(1);
  });
});

// ── Plank ────────────────────────────────────────────────────────────────────

function plankPose(hipY: number): NormalizedLandmark[] {
  const pose = createBlankPose();
  setPoint(pose, 11, 0.2, 0.5); setPoint(pose, 12, 0.2, 0.5);
  setPoint(pose, 23, 0.5, hipY); setPoint(pose, 24, 0.5, hipY);
  setPoint(pose, 27, 0.8, 0.5); setPoint(pose, 28, 0.8, 0.5);
  return pose;
}

describe('PlankTracker', () => {
  it('accumulates hold time when in straight body alignment', () => {
    const tracker = new PlankTracker();
    let res = tracker.processLandmarks(plankPose(0.5), 1000);
    expect(res.state).toBe('holding');

    res = tracker.processLandmarks(plankPose(0.5), 2000);
    expect(res.state).toBe('holding');
    expect(res.holdDuration).toBeGreaterThan(0.9);
    expect(res.formScore).toBe(100);
  });

  it('distinguishes sagging from piking hips', () => {
    const sag = new PlankTracker();
    sag.processLandmarks(plankPose(0.5), 0);
    expect(sag.processLandmarks(plankPose(0.7), 500).activeFault?.id).toBe('sagging_hips');

    const pike = new PlankTracker();
    pike.processLandmarks(plankPose(0.5), 0);
    expect(pike.processLandmarks(plankPose(0.3), 500).activeFault?.id).toBe('pike_hips');
  });

  it('records one fault per episode, not per frame', () => {
    const tracker = new PlankTracker();
    tracker.processLandmarks(plankPose(0.5), 0);
    for (let i = 1; i <= 30; i++) tracker.processLandmarks(plankPose(0.7), i * FRAME_MS);
    expect(tracker.getFaults()).toHaveLength(1);
  });
});

describe('createTracker Factory', () => {
  it('throws descriptive error on unknown exercise id', () => {
    expect(() => createTracker('unknown_exercise')).toThrowError(/tidak ditemukan/);
  });
});
