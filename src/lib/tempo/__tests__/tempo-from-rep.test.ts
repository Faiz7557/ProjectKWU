import { describe, it, expect } from 'vitest';
import { tempoFromRepEvent } from '../tempo-tracker';
import type { RepEvent } from '../../../trackers/types';

const event = (overrides: Partial<RepEvent>): RepEvent => ({
  kind: 'rep',
  startedAt: 0,
  endedAt: 2400,
  eccMs: 1800,
  pauseMs: 200,
  conMs: 400,
  totalMs: 2400,
  extremum: 90,
  tooSlow: false,
  ...overrides,
});

describe('tempoFromRepEvent', () => {
  it('reads the real eccentric duration from the rep event (A8)', () => {
    const tempo = tempoFromRepEvent(event({}));
    expect(tempo?.eccentricSec).toBeCloseTo(1.8, 2);
    expect(tempo?.isRushed).toBe(false);
    expect(tempo?.tempoFormat).toBe('2-0-1');
  });

  it('flags a genuinely fast descent as rushed', () => {
    expect(tempoFromRepEvent(event({ eccMs: 600 }))?.isRushed).toBe(true);
  });

  it('returns null for partial reps', () => {
    expect(tempoFromRepEvent(event({ kind: 'partial' }))).toBeNull();
  });
});
