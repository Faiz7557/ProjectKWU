import { describe, it, expect } from 'vitest';
import { sessionPayloadSchema } from '../session-schema';

const valid = {
  exercise: 'pushup',
  sessionDurationSec: 120,
  reps: 12,
  cleanReps: 10,
  formScore: 83,
  faults: [{ name: 'Pinggul Turun', count: 2 }],
  startedAt: '2026-10-15T08:00:00.000Z',
};

describe('sessionPayloadSchema', () => {
  it('accepts a well-formed session', () => {
    expect(sessionPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown exercise id', () => {
    expect(sessionPayloadSchema.safeParse({ ...valid, exercise: 'burpee' }).success).toBe(false);
  });

  it('rejects out-of-range numbers instead of clamping them (S6)', () => {
    expect(sessionPayloadSchema.safeParse({ ...valid, formScore: 101 }).success).toBe(false);
    expect(sessionPayloadSchema.safeParse({ ...valid, reps: 5000 }).success).toBe(false);
    expect(sessionPayloadSchema.safeParse({ ...valid, sessionDurationSec: 90000 }).success).toBe(false);
  });

  it('rejects cleanReps greater than reps', () => {
    expect(sessionPayloadSchema.safeParse({ ...valid, reps: 5, cleanReps: 9 }).success).toBe(false);
  });
});
