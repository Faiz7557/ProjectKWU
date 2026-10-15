'use client';

import React, { useState, useEffect } from 'react';
import { Timer, Plus } from 'lucide-react';
import type { RoutineStep } from '@/lib/routines/types';
import { Button } from '@/components/ui/Button';
import { Card, Badge, ProgressRing } from '@/components/ui/Surfaces';

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
    <Card className="mx-auto w-full max-w-md space-y-6 p-6 text-center animate-enter">
      <div className="space-y-2">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-warning-soft text-warning">
          <Timer className="size-7" aria-hidden="true" />
        </span>
        <p className="text-subhead font-semibold text-warning">Istirahat</p>
        <h2 className="text-title-2 text-text">Tarik napas dan minum air</h2>
      </div>

      <div className="flex flex-col items-center gap-2">
        <ProgressRing value={progress} size={176} stroke={12} tone="streak" label={`Sisa istirahat ${timeLeft} detik`}>
          <span className="flex items-baseline gap-1">
            <span className="num text-metric-l text-text">{timeLeft}</span>
            <span className="text-subhead text-text-2">dtk</span>
          </span>
        </ProgressRing>
      </div>

      {nextStep && (
        <div className="space-y-2 rounded-md bg-surface-3 p-4 text-left">
          <p className="text-caption font-semibold text-text-2">Berikutnya</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-headline text-text">{nextStep.exerciseName}</span>
            <Badge tone="accent">{nextStep.targetReps ? `${nextStep.targetReps} rep` : `${nextStep.targetDurationSec} dtk`}</Badge>
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
