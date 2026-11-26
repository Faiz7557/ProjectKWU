import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeBottomThreshold,
  computeTopThreshold,
  loadCalibration,
  persistCalibration,
  saveCalibration,
} from '../calibration';
import { RepAccumulator, RepStateMachine } from '../rep-state-machine';
import { PushupTracker } from '../index';
import { STORAGE_KEYS } from '../../lib/storage/storage';
import { prefersFullModel } from '../../lib/mediapipe/pose-detector';
import type { ExerciseTracker, NormalizedLandmark } from '../types';

function ramp(a: number, b: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

/** Satu rep sinyal: top -> low -> top, 50 ms per sampel. */
const rep = (top: number, low: number) => [
  ...Array(4).fill(top), ...ramp(top, low, 12), ...Array(4).fill(low), ...ramp(low, top, 12), ...Array(4).fill(top),
];

beforeEach(() => localStorage.clear());

describe('calibration thresholds', () => {
  it('derives personal bottom/top from full-rep ROM, clamped to biomechanical limits', () => {
    const samples = [{ top: 155, bottom: 85 }, { top: 157, bottom: 83 }];
    expect(computeBottomThreshold('pushup', samples)).toBeCloseTo(102, 1); // 156 - 0.75*72
    expect(computeTopThreshold('pushup', samples)).toBeCloseTo(148.8, 1);  // 156 - 0.1*72
    // Top tidak pernah melebihi default tracker (penyebab stuck di bawah).
    expect(computeTopThreshold('pushup', [{ top: 178, bottom: 70 }, { top: 178, bottom: 70 }])).toBe(150);
  });

  it('returns null with too few reps, too little ROM, or an uncalibrated exercise', () => {
    expect(computeBottomThreshold('pushup', [{ top: 160, bottom: 80 }])).toBeNull();
    expect(computeBottomThreshold('pushup', [{ top: 150, bottom: 120 }, { top: 150, bottom: 120 }])).toBeNull();
    expect(computeBottomThreshold('situp', [{ top: 160, bottom: 80 }, { top: 160, bottom: 80 }])).toBeNull();
  });

  it('reads legacy records that only have bottom', () => {
    localStorage.setItem(STORAGE_KEYS.calibration, JSON.stringify({ pushup: { bottom: 100, savedAt: 'x' } }));
    expect(loadCalibration('pushup')).toEqual({ bottom: 100, top: undefined });
    saveCalibration('pushup', 99, 145);
    expect(loadCalibration('pushup')).toEqual({ bottom: 99, top: 145 });
  });
});

describe('RepAccumulator ROM samples & abort notice', () => {
  it('records top/bottom per full rep only (not partial reps)', () => {
    const acc = new RepAccumulator(new RepStateMachine({ top: 150, bottom: 95 }));
    const samples = [...rep(158, 80), ...rep(156, 120), ...rep(157, 82)]; // rep 2 = half rep
    samples.forEach((v, i) => acc.update(v, i * 50, []));
    expect(acc.repCount).toBe(2);
    const rom = acc.romSamples();
    expect(rom).toHaveLength(2);
    expect(rom[0]).toEqual({ top: 158, bottom: 80 });
    expect(rom[1].bottom).toBe(82);
  });

  it('flags an aborted in-progress rep for a while, then clears', () => {
    const acc = new RepAccumulator(new RepStateMachine({ top: 150, bottom: 95 }), { lostResetMs: 600 });
    ramp(160, 100, 12).forEach((v, i) => acc.update(v, i * 50, []));
    acc.markLost(1000);
    acc.markLost(1500);
    expect(acc.abortNotice(1500)).toBe(false); // < 600 ms: belum dibatalkan
    acc.markLost(1700);
    expect(acc.abortNotice(1700)).toBe(true);
    expect(acc.abortNotice(3800)).toBe(false);
  });
});

describe('auto-calibration end to end', () => {
  const trackerWith = (samples: { top: number; bottom: number }[]) =>
    ({ config: { id: 'pushup' }, getRomSamples: () => samples }) as unknown as ExerciseTracker;

  it('persists calibration from a session for the next tracker', () => {
    expect(persistCalibration(trackerWith([{ top: 154, bottom: 86 }, { top: 156, bottom: 84 }]))).toBe(true);
    expect(loadCalibration('pushup').bottom).toBeCloseTo(102.5, 1); // 155 - 0.75*70
  });

  it('does not persist when the session has fewer than 2 full reps', () => {
    expect(persistCalibration(new PushupTracker())).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.calibration)).toBeNull();
  });
});

describe('PushupTracker camera orientation hint', () => {
  it('tells the user to move the camera to the side when viewed from the front', () => {
    const pose: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));
    const set = (i: number, x: number, y: number) => (pose[i] = { x, y, z: 0, visibility: 0.95 });
    set(11, 0.6, 0.5); set(12, 0.4, 0.5);   // bahu lebar (tampak depan)
    set(13, 0.62, 0.6); set(14, 0.38, 0.6);
    set(15, 0.62, 0.7); set(16, 0.38, 0.7);
    set(23, 0.58, 0.52); set(24, 0.42, 0.52);
    const res = new PushupTracker().processLandmarks(pose, 0);
    expect(res.feedback).toMatch(/SAMPING/);
    expect(res.repCount).toBe(0);
  });
});

describe('model selection', () => {
  it('uses the full model only on capable devices', () => {
    expect(prefersFullModel(8, 8)).toBe(true);
    expect(prefersFullModel(4, 8)).toBe(false);
    expect(prefersFullModel(8, 2)).toBe(false);
    expect(prefersFullModel(undefined, undefined)).toBe(false);
  });
});
