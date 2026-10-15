'use client';

import type { RoutineStep } from '@/lib/routines/types';

interface CircuitProgressProps {
  steps: RoutineStep[];
  currentStepIndex: number;
  routineName: string;
}

// Segmen aktif terisi dan tebal, tanpa animasi pulse (UI_UX_BRIEF §7.4).
export function CircuitProgress({
  steps,
  currentStepIndex,
  routineName,
}: CircuitProgressProps) {
  const next = steps[currentStepIndex + 1];
  return (
    <div className="mx-auto w-full max-w-2xl space-y-2.5 rounded-lg border border-separator bg-surface p-4 shadow-1">
      <div className="flex items-center justify-between gap-3 text-footnote">
        <span className="min-w-0 truncate font-semibold text-text">{routineName}</span>
        <span className="num shrink-0 text-text-2">
          Gerakan {currentStepIndex + 1} dari {steps.length}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`Langkah ${currentStepIndex + 1} dari ${steps.length}`}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={currentStepIndex + 1}
        className="flex items-center gap-1.5"
      >
        {steps.map((_, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          return (
            <span
              key={idx}
              className={`h-2 flex-1 rounded-full ${isDone ? 'bg-success' : isCurrent ? 'h-2.5 bg-accent' : 'bg-surface-3'}`}
            />
          );
        })}
      </div>

      {next && <p className="text-caption text-text-2">Berikutnya: {next.exerciseName}</p>}
    </div>
  );
}
