import { Achievement, WorkoutSessionSummaryStats } from './types';

export const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_workout',
    name: 'Langkah Pertama',
    description: 'Selesaikan sesi latihan pertama Anda di SMART-FIT',
    tier: 'bronze',
    icon: '🎯',
    xpReward: 50,
  },
  {
    id: 'five_workouts',
    name: 'Mulai Terbiasa',
    description: 'Selesaikan total 5 sesi latihan terpandu',
    tier: 'bronze',
    icon: '💪',
    xpReward: 100,
  },
  {
    id: 'streak_3',
    name: 'Tiga Hari Berturut',
    description: 'Pertahankan latihan selama 3 hari berturut-turut',
    tier: 'bronze',
    icon: '🔥',
    xpReward: 120,
  },
  {
    id: 'century_reps',
    name: 'Century Club',
    description: 'Tembus akumulasi 100 total repetisi bersih',
    tier: 'silver',
    icon: '💯',
    xpReward: 200,
  },
  {
    id: 'perfect_form',
    name: 'Form Sempurna',
    description: 'Raih Form Score 100% tanpa kesalahan dalam satu sesi',
    tier: 'silver',
    icon: '✨',
    xpReward: 250,
  },
  {
    id: 'iron_core',
    name: 'Core of Steel',
    description: 'Tahan posisi plank selama minimal 60 detik',
    tier: 'silver',
    icon: '🛡️',
    xpReward: 200,
  },
  {
    id: 'streak_7',
    name: '7-Day Warrior',
    description: 'Pertahankan api latihan selama 7 hari berturut-turut',
    tier: 'gold',
    icon: '⚔️',
    xpReward: 400,
  },
  {
    id: 'all_rounder',
    name: 'Atlet Lengkap',
    description: 'Latih seluruh 5 variasi gerakan (Pushup, Squat, Situp, Jumping Jack, Plank)',
    tier: 'gold',
    icon: '🌟',
    xpReward: 350,
  },
  {
    id: 'beast_500',
    name: 'Mesin Repetisi',
    description: 'Akumulasikan total 500 repetisi di seluruh riwayat latihan',
    tier: 'gold',
    icon: '⚡',
    xpReward: 500,
  },
  {
    id: 'streak_30',
    name: 'Komitmen Baja',
    description: 'Luar biasa! Raih streak latihan 30 hari berturut-turut',
    tier: 'diamond',
    icon: '🏆',
    xpReward: 1000,
  },
];

export const LEVEL_TIERS = [
  { level: 1, name: 'Pemula', minXp: 0 },
  { level: 2, name: 'Pejuang Baru', minXp: 100 },
  { level: 3, name: 'Rajin', minXp: 250 },
  { level: 4, name: 'Menengah', minXp: 500 },
  { level: 5, name: 'Kuat', minXp: 1000 },
  { level: 6, name: 'Mahir', minXp: 2000 },
  { level: 7, name: 'Elite', minXp: 4000 },
  { level: 8, name: 'Master Fit', minXp: 8000 },
];

export function getLevelInfo(totalXp: number): { level: number; levelName: string; nextLevelXp: number; currentTierBaseXp: number } {
  let currentTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1];

  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_TIERS[i].minXp) {
      currentTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || { level: currentTier.level + 1, name: 'Legenda', minXp: currentTier.minXp * 2 };
      break;
    }
  }

  return {
    level: currentTier.level,
    levelName: currentTier.name,
    nextLevelXp: nextTier.minXp,
    currentTierBaseXp: currentTier.minXp,
  };
}

export function evaluateAchievements(
  stats: WorkoutSessionSummaryStats,
  alreadyUnlockedIds: string[],
  uniqueExercisesCount: number
): Achievement[] {
  const newUnlocked: Achievement[] = [];

  for (const ach of ALL_ACHIEVEMENTS) {
    if (alreadyUnlockedIds.includes(ach.id)) continue;

    let isEligible = false;

    switch (ach.id) {
      case 'first_workout':
        isEligible = stats.totalSessions >= 1;
        break;
      case 'five_workouts':
        isEligible = stats.totalSessions >= 5;
        break;
      case 'streak_3':
        isEligible = stats.currentStreak >= 3;
        break;
      case 'streak_7':
        isEligible = stats.currentStreak >= 7;
        break;
      case 'streak_30':
        isEligible = stats.currentStreak >= 30;
        break;
      case 'century_reps':
        isEligible = stats.totalReps >= 100;
        break;
      case 'beast_500':
        isEligible = stats.totalReps >= 500;
        break;
      case 'perfect_form':
        isEligible = stats.formScore >= 100;
        break;
      case 'iron_core':
        isEligible = (stats.holdDurationSec ?? 0) >= 60;
        break;
      case 'all_rounder':
        isEligible = uniqueExercisesCount >= 5;
        break;
    }

    if (isEligible) {
      newUnlocked.push(ach);
    }
  }

  return newUnlocked;
}
