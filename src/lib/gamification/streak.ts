import { UserGamificationState, WorkoutSessionSummaryStats, Achievement } from './types';
import { getLevelInfo, evaluateAchievements } from './achievements';

const STORAGE_KEY = 'smartfit_gamification';

export function getGamificationState(): UserGamificationState {
  if (typeof window === 'undefined') {
    return {
      streak: { current: 0, longest: 0, lastWorkoutDate: null },
      totalXp: 0,
      level: 1,
      levelName: 'Pemula',
      unlockedAchievementIds: [],
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: UserGamificationState = {
        streak: { current: 0, longest: 0, lastWorkoutDate: null },
        totalXp: 0,
        level: 1,
        levelName: 'Pemula',
        unlockedAchievementIds: [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return {
      streak: { current: 0, longest: 0, lastWorkoutDate: null },
      totalXp: 0,
      level: 1,
      levelName: 'Pemula',
      unlockedAchievementIds: [],
    };
  }
}

export interface SessionCompletionResult {
  state: UserGamificationState;
  newlyUnlocked: Achievement[];
  earnedXp: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
}

export function recordWorkoutSessionCompletion(session: {
  exercise: string;
  reps: number | null;
  holdDurationSec: number | null;
  sessionDurationSec: number;
  formScore: number;
}): SessionCompletionResult {
  const currentState = getGamificationState();
  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

  // 1. Hitung Streak Harian
  let newCurrentStreak = currentState.streak.current;
  const lastDate = currentState.streak.lastWorkoutDate;

  if (!lastDate) {
    newCurrentStreak = 1;
  } else if (lastDate === today) {
    // Sesi kedua atau lebih pada hari yang sama: streak tetap sama
    newCurrentStreak = Math.max(1, newCurrentStreak);
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      // Latihan kemarin dan hari ini: streak bertambah
      newCurrentStreak += 1;
    } else {
      // Terlewat lebih dari 1 hari: streak ter-reset ke 1
      newCurrentStreak = 1;
    }
  }

  const newLongestStreak = Math.max(currentState.streak.longest, newCurrentStreak);

  // 2. Hitung Perolehan XP Sesi Ini
  const reps = session.reps ?? 0;
  const hold = session.holdDurationSec ?? 0;
  const baseScore = reps * 2 + Math.round(hold * 0.8);
  
  let formBonus = 0;
  if (session.formScore >= 95) formBonus = 40;
  else if (session.formScore >= 85) formBonus = 20;

  let multiplier = 1;
  if (newCurrentStreak >= 7) multiplier = 1.5;
  else if (newCurrentStreak >= 3) multiplier = 1.25;

  const earnedXp = Math.max(15, Math.round((baseScore + formBonus) * multiplier));

  // 3. Baca riwayat untuk statistik kumulatif
  let totalSessions = 1;
  let totalReps = reps;
  const uniqueExercises = new Set<string>([session.exercise]);

  try {
    const historyRaw = localStorage.getItem('smartfit_workout_history');
    if (historyRaw) {
      const historyList = JSON.parse(historyRaw);
      if (Array.isArray(historyList)) {
        totalSessions = historyList.length;
        for (const item of historyList) {
          if (item.reps) totalReps += item.reps;
          if (item.exercise) uniqueExercises.add(item.exercise);
        }
      }
    }
  } catch {
    // Ignore history reading error
  }

  const stats: WorkoutSessionSummaryStats = {
    exercise: session.exercise,
    reps: session.reps,
    holdDurationSec: session.holdDurationSec,
    sessionDurationSec: session.sessionDurationSec,
    formScore: session.formScore,
    totalSessions,
    totalReps,
    currentStreak: newCurrentStreak,
  };

  // 4. Evaluasi Pencapaian Baru
  const newlyUnlocked = evaluateAchievements(
    stats,
    currentState.unlockedAchievementIds,
    uniqueExercises.size
  );

  let achievementXpReward = 0;
  const newUnlockedIds = [...currentState.unlockedAchievementIds];
  for (const ach of newlyUnlocked) {
    achievementXpReward += ach.xpReward;
    newUnlockedIds.push(ach.id);
  }

  const newTotalXp = currentState.totalXp + earnedXp + achievementXpReward;
  const oldLevel = currentState.level;
  const levelInfo = getLevelInfo(newTotalXp);
  const leveledUp = levelInfo.level > oldLevel;

  const updatedState: UserGamificationState = {
    streak: {
      current: newCurrentStreak,
      longest: newLongestStreak,
      lastWorkoutDate: today,
    },
    totalXp: newTotalXp,
    level: levelInfo.level,
    levelName: levelInfo.levelName,
    unlockedAchievementIds: newUnlockedIds,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
  } catch (e) {
    console.warn('Gagal menyimpan status gamifikasi ke localStorage:', e);
  }

  return {
    state: updatedState,
    newlyUnlocked,
    earnedXp: earnedXp + achievementXpReward,
    leveledUp,
    oldLevel,
    newLevel: levelInfo.level,
  };
}
