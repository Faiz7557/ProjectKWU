import { describe, it, expect, beforeEach } from 'vitest';
import { recordWorkoutSessionCompletion, getGamificationState } from '../streak';
import { getLevelInfo, evaluateAchievements } from '../achievements';

describe('Gamification & Streak System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with level 1 and 0 streak', () => {
    const state = getGamificationState();
    expect(state.level).toBe(1);
    expect(state.levelName).toBe('Pemula');
    expect(state.streak.current).toBe(0);
    expect(state.totalXp).toBe(0);
  });

  it('should grant first_workout achievement and XP on first completed session', () => {
    const result = recordWorkoutSessionCompletion({
      exercise: 'pushup',
      reps: 15,
      holdDurationSec: null,
      sessionDurationSec: 60,
      formScore: 92,
    });

    expect(result.state.streak.current).toBe(1);
    expect(result.earnedXp).toBeGreaterThan(0);
    expect(result.newlyUnlocked.some((a) => a.id === 'first_workout')).toBe(true);
  });

  it('should calculate level progression properly from XP', () => {
    const lvl1 = getLevelInfo(50);
    expect(lvl1.level).toBe(1);

    const lvl2 = getLevelInfo(120);
    expect(lvl2.level).toBe(2);
    expect(lvl2.levelName).toBe('Pejuang Baru');

    const lvl5 = getLevelInfo(1200);
    expect(lvl5.level).toBe(5);
    expect(lvl5.levelName).toBe('Kuat');
  });

  it('should evaluate perfect_form achievement when form score is 100%', () => {
    const achs = evaluateAchievements(
      {
        exercise: 'squat',
        reps: 20,
        holdDurationSec: null,
        sessionDurationSec: 60,
        formScore: 100,
        totalSessions: 1,
        totalReps: 20,
        currentStreak: 1,
      },
      [],
      1
    );

    expect(achs.some((a) => a.id === 'perfect_form')).toBe(true);
  });
});
