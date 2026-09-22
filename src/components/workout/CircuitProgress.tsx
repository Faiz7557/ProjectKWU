'use client';

import type { RoutineStep } from '@/lib/routines/types';

interface CircuitProgressProps {
  steps: RoutineStep[];
  currentStepIndex: number;
  routineName: string;
}

export function CircuitProgress({
  steps,
  currentStepIndex,
  routineName,
}: CircuitProgressProps) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="font-bold text-blue-400 uppercase tracking-wider">{routineName}</span>
        <span className="text-slate-400 font-mono">
          Gerakan {currentStepIndex + 1} dari {steps.length}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div key={idx} className="flex-1 flex items-center gap-2">
              <div
                className={`h-2 flex-1 rounded-full transition-all ${
                  isDone
                    ? 'bg-emerald-500'
                    : isCurrent
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-slate-800'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
