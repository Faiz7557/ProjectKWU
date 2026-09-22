import { describe, it, expect, beforeEach } from 'vitest';
import { getExerciseProgression } from '../engine';

describe('Adaptive Progression Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default targets when no history is present', () => {
    const pushupProg = getExerciseProgression('pushup');
    expect(pushupProg.suggestedTarget).toBe(15);
    expect(pushupProg.difficulty).toBe('normal');

    const plankProg = getExerciseProgression('plank');
    expect(plankProg.suggestedTarget).toBe(45);
  });

  it('should boost target and set challenge difficulty when form score is high (>=85)', () => {
    const mockSessions = [
      { exercise: 'pushup', reps: 15, holdDurationSec: null, formScore: 92 },
      { exercise: 'pushup', reps: 14, holdDurationSec: null, formScore: 88 },
      { exercise: 'pushup', reps: 12, holdDurationSec: null, formScore: 90 },
    ];
    localStorage.setItem('smartfit_workout_history', JSON.stringify(mockSessions));

    const prog = getExerciseProgression('pushup');
    expect(prog.difficulty).toBe('challenge');
    expect(prog.trend).toBe('up');
    expect(prog.suggestedTarget).toBeGreaterThan(15);
  });

  it('should relax target and set easy difficulty when form score is low (<72)', () => {
    const mockSessions = [
      { exercise: 'squat', reps: 20, holdDurationSec: null, formScore: 65 },
      { exercise: 'squat', reps: 22, holdDurationSec: null, formScore: 68 },
    ];
    localStorage.setItem('smartfit_workout_history', JSON.stringify(mockSessions));

    const prog = getExerciseProgression('squat');
    expect(prog.difficulty).toBe('easy');
    expect(prog.suggestedTarget).toBeLessThanOrEqual(20);
  });
});
