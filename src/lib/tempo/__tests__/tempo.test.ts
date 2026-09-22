import { describe, it, expect, beforeEach } from 'vitest';
import { TempoTracker } from '../tempo-tracker';

describe('Tempo & Time Under Tension (TUT) Tracker', () => {
  let tracker: TempoTracker;

  beforeEach(() => {
    tracker = new TempoTracker();
  });

  it('should initialize in idle phase', () => {
    const state = tracker.update('up', 0, 1000);
    expect(state.currentPhase).toBe('idle');
    expect(state.lastRepTempo).toBeNull();
  });

  it('should transition to descending when exercise state moves to down', () => {
    tracker.update('up', 0, 1000);
    const state = tracker.update('down', 0, 1200);
    expect(state.currentPhase).toBe('descending');
  });

  it('should calculate completed rep tempo when repCount increments', () => {
    // 1. Start top (t=0)
    tracker.update('up', 0, 0);
    // 2. Start descent (t=500)
    tracker.update('down', 0, 500);
    // 3. Reached bottom (t=2500, 2s descent)
    tracker.update('down', 0, 2500);
    // 4. Rep counted (t=3500, 1s ascent)
    const result = tracker.update('up', 1, 3500);

    expect(result.lastRepTempo).not.toBeNull();
    expect(result.lastRepTempo?.eccentricSec).toBeGreaterThanOrEqual(1.5);
    expect(result.totalTUTSec).toBeGreaterThan(0);
    expect(result.lastRepTempo?.isRushed).toBe(false);
  });

  it('should flag rushed rep when descent is too fast (<1.1s)', () => {
    tracker.update('up', 0, 0);
    tracker.update('down', 0, 200);
    const result = tracker.update('up', 1, 600); // Only 400ms total!

    expect(result.lastRepTempo?.isRushed).toBe(true);
    expect(result.rushedRepsCount).toBe(1);
    expect(result.feedback).toContain('terlalu terburu-buru');
  });
});
