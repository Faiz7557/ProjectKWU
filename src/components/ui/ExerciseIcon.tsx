import { Activity, Dumbbell, Footprints, PersonStanding, Timer, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

// Ikon lucide sementara untuk tiap latihan (UI_UX_BRIEF §6 + D6). Emoji dihapus: render beda tiap OS.
export const EXERCISE_ICONS: Record<string, LucideIcon> = {
  pushup: Dumbbell,
  squat: Footprints,
  situp: Activity,
  jumping_jack: PersonStanding,
  plank: Timer,
};

/** Warna panel tetap per gerakan (REDESIGN_PLAN §2.2). */
export const EXERCISE_PANEL: Record<string, 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8> = {
  pushup: 1,
  squat: 3,
  situp: 7,
  jumping_jack: 8,
  plank: 5,
};

const PANEL_CLASS = ['', 'panel-1', 'panel-2', 'panel-3', 'panel-4', 'panel-5', 'panel-6', 'panel-7', 'panel-8'];

export function ExerciseIcon({ exercise, className }: { exercise: string; className?: string }) {
  const Icon = EXERCISE_ICONS[exercise] ?? Dumbbell;
  const panel = EXERCISE_PANEL[exercise];
  return (
    <span
      aria-hidden="true"
      className={cn('grid size-10 shrink-0 place-items-center', panel ? PANEL_CLASS[panel] : 'bg-surface-3 text-text-2', className)}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}
