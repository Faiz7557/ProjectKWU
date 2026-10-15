import { describe, it, expect, beforeEach } from 'vitest';
import { recordWorkoutSessionCompletion, getGamificationState } from '../streak';

const session = (reps: number) => ({
  exercise: 'squat',
  reps,
  holdDurationSec: null,
  sessionDurationSec: 60,
  formScore: 90,
});

describe('cumulative gamification stats', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('counts each session once and keeps counting past 50 history items (F9)', () => {
    for (let i = 0; i < 60; i++) {
      recordWorkoutSessionCompletion(session(2));
    }
    const state = getGamificationState();
    expect(state.stats.totalSessions).toBe(60);
    expect(state.stats.totalReps).toBe(120);
    expect(state.stats.exercises).toEqual(['squat']);
  });

  it('tracks distinct exercises across sessions', () => {
    recordWorkoutSessionCompletion(session(5));
    recordWorkoutSessionCompletion({ ...session(5), exercise: 'plank', reps: null, holdDurationSec: 30 });
    const state = getGamificationState();
    expect(state.stats.exercises.sort()).toEqual(['plank', 'squat']);
    expect(state.stats.totalSessions).toBe(2);
  });
});
