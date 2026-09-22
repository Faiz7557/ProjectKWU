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

export interface UserGamificationState {
  streak: UserStreak;
  totalXp: number;
  level: number;
  levelName: string;
  unlockedAchievementIds: string[];
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
