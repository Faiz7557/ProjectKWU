'use client';

import React, { useState, useEffect } from 'react';
import { Timer, Plus } from 'lucide-react';
import type { RoutineStep } from '@/lib/routines/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surfaces';

interface RestTimerProps {
  durationSec: number;
  nextStep: RoutineStep | null;
  onComplete: () => void;
  onSkip: () => void;
}

export function RestTimer({
  durationSec,
  nextStep,
  onComplete,
  onSkip,
}: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(durationSec);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  const progress = Math.min(1, Math.max(0, (durationSec - timeLeft) / durationSec));

  return (
    <Card tone={7} className="mx-auto w-full max-w-md space-y-6 p-6 text-center animate-enter">
      <div className="space-y-2">
        <span className="mx-auto grid size-14 place-items-center bg-ink text-paper">
          <Timer className="size-7" aria-hidden="true" />
        </span>
        <p className="text-caption font-semibold uppercase tracking-[0.06em]">Istirahat</p>
        <h2 className="font-display text-title-2">Tarik napas dan minum air</h2>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="flex items-baseline gap-2">
          <span className="num font-display text-metric-xl">{timeLeft}</span>
          <span className="text-headline">dtk</span>
        </span>
        <div
          role="progressbar"
          aria-label={`Sisa istirahat ${timeLeft} detik`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="h-2 w-full bg-ink/20"
        >
          <div className="h-full w-full origin-left bg-ink" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>

      {nextStep && (
        <div className="space-y-2 bg-paper p-4 text-left text-ink">
          <p className="text-caption font-semibold">Berikutnya</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-headline">{nextStep.exerciseName}</span>
            <span className="bg-ink px-2.5 py-1 text-caption font-semibold text-paper">{nextStep.targetReps ? `${nextStep.targetReps} rep` : `${nextStep.targetDurationSec} dtk`}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="w-full" onClick={onSkip}>
          Mulai sekarang
        </Button>
        <Button variant="tertiary" size="lg" className="w-full" onClick={() => setTimeLeft((t) => t + 15)} icon={<Plus className="size-4" aria-hidden="true" />}>
          15 detik
        </Button>
      </div>
    </Card>
  );
}
