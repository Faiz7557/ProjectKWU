import { BicepsFlexed, Flame, Medal, Shield, Sparkles, Star, Swords, Target, Trophy, Zap, type LucideIcon } from 'lucide-react';

/**
 * Ikon lucide per lencana, pengganti emoji di achievements.ts (emoji tampil beda tiap OS
 * dan tidak bisa dirender 3D). Landing memakai versi 3D (Icon3D), /history versi 2D.
 */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  first_workout: Target,
  five_workouts: BicepsFlexed,
  streak_3: Flame,
  century_reps: Medal,
  perfect_form: Sparkles,
  iron_core: Shield,
  streak_7: Swords,
  all_rounder: Star,
  beast_500: Zap,
  streak_30: Trophy,
};

export const achievementIcon = (id: string): LucideIcon => ACHIEVEMENT_ICONS[id] ?? Medal;
