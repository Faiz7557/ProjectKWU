import { describe, it, expect } from 'vitest';
import { RepStateMachine, RepAccumulator } from '../rep-state-machine';
import { calculateAngle, toPixelSpace, bodyDeviation } from '../base-tracker';

/** Menjalankan urutan sampel (nilai, interval ms) dan mengumpulkan event yang muncul. */
function run(sm: RepStateMachine, samples: number[], stepMs = 50, startT = 0) {
  const events = [];
  let t = startT;
  for (const v of samples) {
    const ev = sm.update(v, t);
    if (ev) events.push(ev);
    t += stepMs;
  }
  return events;
}

/** Rentang linear dari a ke b (inklusif) dengan n langkah. */
function ramp(a: number, b: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

const cfg = { top: 160, bottom: 95 };

describe('RepStateMachine', () => {
  it('emits a full rep with phase durations from timestamps', () => {
    const sm = new RepStateMachine(cfg);
    const samples = [
      ...Array(5).fill(170),
      ...ramp(170, 90, 12),   // turun ~600 ms
      ...Array(6).fill(90),   // tahan ~300 ms
      ...ramp(90, 170, 12),   // naik ~600 ms
      ...Array(5).fill(170),
    ];
    const events = run(sm, samples, 50);
    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev.kind).toBe('rep');
    expect(ev.extremum).toBeLessThanOrEqual(95);
    // Fase turun dihitung dari saat sinyal melewati ambang masuk (top - delta = 150°) sampai bottom (95°):
    // ±400 ms dari ramp 600 ms. Asersi longgar karena dwell 80 ms menggeser batas per-sampel.
    expect(ev.eccMs).toBeGreaterThanOrEqual(350);
    expect(ev.pauseMs).toBeGreaterThan(150);
    expect(ev.conMs).toBeGreaterThanOrEqual(350);
    expect(ev.tooSlow).toBe(false);
  });

  it('emits a partial rep (not a rep) when returning to top without reaching bottom', () => {
    const sm = new RepStateMachine(cfg);
    const samples = [
      ...Array(5).fill(170),
      ...ramp(170, 120, 10),
      ...ramp(120, 170, 10),
      ...Array(5).fill(170),
    ];
    const events = run(sm, samples, 50);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('partial');
  });

  it('ignores a one-sample dip below bottom (debounce)', () => {
    const sm = new RepStateMachine(cfg);
    const samples = [...Array(5).fill(170), 80, ...Array(5).fill(170)];
    expect(run(sm, samples, 50)).toHaveLength(0);
  });

  it('rejects an implausibly fast rep as noise', () => {
    const sm = new RepStateMachine({ ...cfg, minDwellMs: 20 });
    // Turun-naik dalam ~300 ms total (di bawah minRepMs 400)
    const samples = [
      ...Array(3).fill(170),
      ...ramp(170, 90, 2),
      ...ramp(90, 170, 2),
      ...Array(3).fill(170),
    ];
    const events = run(sm, samples, 50);
    expect(events.filter((e) => e.kind === 'rep')).toHaveLength(0);
  });

  it('abort() cancels an in-progress rep without emitting an event', () => {
    const sm = new RepStateMachine(cfg);
    run(sm, [...Array(5).fill(170), ...ramp(170, 90, 8)], 50);
    sm.abort();
    expect(sm.currentPhase).toBe('top');
    expect(run(sm, ramp(90, 170, 8), 50, 2000)).toHaveLength(0);
  });
});

describe('RepAccumulator', () => {
  it('deduplicates faults per rep and marks clean reps correctly', () => {
    const acc = new RepAccumulator(new RepStateMachine(cfg));
    const fault = { id: 'sagging_hips', name: 'x', description: 'y', timestamp: 0, severity: 'warning' as const };
    const samples = [...Array(5).fill(170), ...ramp(170, 90, 12), ...Array(6).fill(90), ...ramp(90, 170, 12), ...Array(5).fill(170)];
    let t = 0;
    for (const v of samples) {
      acc.update(v, t, [fault, fault]);
      t += 50;
    }
    expect(acc.repCount).toBe(1);
    expect(acc.cleanRepCount).toBe(0);
    expect(acc.faults.filter((f) => f.id === 'sagging_hips')).toHaveLength(1);
    expect(acc.formScore()).toBe(0);
  });
});

describe('geometry helpers', () => {
  it('pixel-space angle differs from normalized-space angle on a 640x480 frame', () => {
    // Sudut di titik tengah b antara a->b dan c->b
    const lms = [
      { x: 0, y: 0, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
      { x: 1, y: 0.5, z: 0 },
    ];
    const normalized = calculateAngle(lms[0], lms[1], lms[2]);
    const px = toPixelSpace(lms, { width: 640, height: 480 });
    const pixel = calculateAngle(px[0], px[1], px[2]);
    expect(normalized).toBeCloseTo(135, 1);
    expect(pixel).toBeCloseTo(143.13, 1);
  });

  it('bodyDeviation is positive when hip is lower on screen than the shoulder-ankle line', () => {
    const s = { x: 0, y: 0 };
    const a = { x: 100, y: 0 };
    expect(bodyDeviation(s, { x: 50, y: 10 }, a)).toBeGreaterThan(0);
    expect(bodyDeviation(s, { x: 50, y: -10 }, a)).toBeLessThan(0);
    expect(bodyDeviation(s, { x: 50, y: 0 }, a)).toBeCloseTo(0, 6);
  });
});
