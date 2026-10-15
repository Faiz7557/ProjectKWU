import { Activity, Dumbbell, Footprints, PersonStanding, Timer, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

// Ikon lucide sementara untuk tiap latihan (UI_UX_BRIEF §6 + D6). Emoji dihapus: render beda tiap OS.
const ICONS: Record<string, LucideIcon> = {
  pushup: Dumbbell,
  squat: Footprints,
  situp: Activity,
  jumping_jack: PersonStanding,
  plank: Timer,
};

export function ExerciseIcon({ exercise, className }: { exercise: string; className?: string }) {
  const Icon = ICONS[exercise] ?? Dumbbell;
  return (
    <span
      aria-hidden="true"
      className={cn('grid size-10 shrink-0 place-items-center rounded-md bg-surface-3 text-text-2', className)}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}
