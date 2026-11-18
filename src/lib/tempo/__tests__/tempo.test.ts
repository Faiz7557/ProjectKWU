import { describe, it, expect, beforeEach } from 'vitest';
import { TempoTracker } from '../tempo-tracker';
import type { RepEvent } from '../../../trackers/types';

const rep = (o: Partial<RepEvent> = {}): RepEvent => ({
  kind: 'rep',
  startedAt: 0,
  endedAt: 3000,
  eccMs: 2000,
  pauseMs: 0,
  conMs: 1000,
  totalMs: 3000,
  extremum: 90,
  tooSlow: false,
  ...o,
});

describe('TempoTracker (berbasis RepEvent)', () => {
  let tracker: TempoTracker;

  beforeEach(() => {
    tracker = new TempoTracker();
  });

  it('idle saat di posisi atas dan belum ada rep', () => {
    const state = tracker.update({ phase: 'top' });
    expect(state.currentPhase).toBe('idle');
    expect(state.lastRepTempo).toBeNull();
    expect(state.averageTempo).toBeNull();
  });

  it('meneruskan fase kontinu tracker untuk metronom', () => {
    expect(tracker.update({ phase: 'descending' }).currentPhase).toBe('descending');
    expect(tracker.update({ phase: 'bottom' }).currentPhase).toBe('bottom');
  });

  it('menghitung tempo nyata dan rata-rata dari rep yang selesai', () => {
    tracker.update({ phase: 'top', lastRep: rep() }, 'pushup');
    const s = tracker.update({ phase: 'top', lastRep: rep({ eccMs: 1000, totalMs: 2000 }) }, 'pushup');
    expect(s.repsTimed).toBe(2);
    expect(s.averageTempo?.eccentricSec).toBeCloseTo(1.5, 2);
    expect(s.totalTUTSec).toBeCloseTo(5, 1);
    expect(s.rushedRepsCount).toBe(1); // rep kedua turun 1 dtk < 1.1
  });

  it('partial rep tidak dihitung ke tempo', () => {
    const s = tracker.update({ phase: 'top', lastRep: rep({ kind: 'partial' }) }, 'pushup');
    expect(s.repsTimed).toBe(0);
  });

  it('jumping jack tidak pernah ditandai terburu-buru', () => {
    const s = tracker.update({ lastRep: rep({ eccMs: 300, totalMs: 700 }) }, 'jumping_jack');
    expect(s.lastRepTempo?.isRushed).toBe(false);
  });

  it('sit-up memakai fase rebah (sinyal naik) sebagai eksentrik', () => {
    const s = tracker.update({ lastRep: rep({ eccMs: 800, conMs: 2000 }) }, 'situp');
    expect(s.lastRepTempo?.eccentricSec).toBeCloseTo(2, 2);
    expect(s.lastRepTempo?.isRushed).toBe(false);
  });
});
