import { UserGamificationState, WorkoutSessionSummaryStats, Achievement } from './types';
import { getLevelInfo, evaluateAchievements } from './achievements';
import { STORAGE_KEYS, readJson, writeJson, migrateStorage } from '../storage/storage';

function emptyState(): UserGamificationState {
  return {
    streak: { current: 0, longest: 0, lastWorkoutDate: null },
    totalXp: 0,
    level: 1,
    levelName: 'Pemula',
    unlockedAchievementIds: [],
    stats: { totalSessions: 0, totalReps: 0, exercises: [] },
  };
}

export function getGamificationState(): UserGamificationState {
  if (typeof window === 'undefined') return emptyState();
  migrateStorage();

  const stored = readJson<UserGamificationState | null>(STORAGE_KEYS.gamification, null);
  if (!stored) {
    const initial = emptyState();
    writeJson(STORAGE_KEYS.gamification, initial);
    return initial;
  }
  return { ...emptyState(), ...stored };
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

  // 3. Statistik kumulatif: counter terpisah, tidak bergantung pada history
  // (history sudah berisi sesi ini saat fungsi dipanggil, dan dibatasi 50 item).
  const prevStats = currentState.stats;
  const exercises = new Set<string>([...prevStats.exercises, session.exercise]);
  const totalSessions = prevStats.totalSessions + 1;
  const totalReps = prevStats.totalReps + reps;

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
    exercises.size
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
    stats: { totalSessions, totalReps, exercises: [...exercises] },
  };

  writeJson(STORAGE_KEYS.gamification, updatedState);

  return {
    state: updatedState,
    newlyUnlocked,
    earnedXp: earnedXp + achievementXpReward,
    leveledUp,
    oldLevel,
    newLevel: levelInfo.level,
  };
}
