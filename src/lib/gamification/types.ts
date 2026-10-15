export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  icon: string;
  xpReward: number;
  unlockedAt?: string;
}

export interface UserStreak {
  current: number;
  longest: number;
  lastWorkoutDate: string | null; // Format YYYY-MM-DD
}

/** Counter kumulatif seumur hidup, tidak dibatasi jumlah item history. */
export interface CumulativeStats {
  totalSessions: number;
  totalReps: number;
  exercises: string[];
}

export interface UserGamificationState {
  streak: UserStreak;
  totalXp: number;
  level: number;
  levelName: string;
  unlockedAchievementIds: string[];
  stats: CumulativeStats;
}

export interface WorkoutSessionSummaryStats {
  exercise: string;
  reps: number | null;
  holdDurationSec: number | null;
  sessionDurationSec: number;
  formScore: number;
  totalSessions: number;
  totalReps: number;
  currentStreak: number;
}
