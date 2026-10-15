'use client';

import React, { useState, useEffect } from 'react';
import { Coffee, FastForward } from 'lucide-react';
import type { RoutineStep } from '@/lib/routines/types';

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

  const progress = Math.min(100, Math.round(((durationSec - timeLeft) / durationSec) * 100));

  return (
    <div className="w-full max-w-md mx-auto bg-surface border border-separator rounded-lg p-6 text-center space-y-6 shadow-2xl backdrop-blur-md animate-enter">
      {/* Icon & Label */}
      <div className="space-y-2">
        <div className="w-16 h-16 rounded-md bg-warning-soft border border-warning/30 text-warning flex items-center justify-center mx-auto">
          <Coffee className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold text-warning tracking-normal block">
          Waktu Istirahat
        </span>
        <h2 className="text-2xl font-bold text-text">Tarik Napas & Minum Air</h2>
      </div>

      {/* Countdown Clock */}
      <div className="relative py-4">
        <div className="text-6xl font-bold text-warning num tracking-tight">
          {timeLeft}
          <span className="text-lg font-bold text-text-3 ml-1">detik</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-surface-3 mt-4 overflow-hidden">
          <div
            className="h-full bg-warning transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Next Exercise Preview */}
      {nextStep && (
        <div className="p-4 rounded-md bg-surface-3 border border-border-strong text-left space-y-1">
          <span className="text-xs font-bold text-accent-text tracking-normal block">
            Gerakan Berikutnya:
          </span>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-text">{nextStep.exerciseName}</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent-text">
              {nextStep.targetReps ? `${nextStep.targetReps} Reps` : `${nextStep.targetDurationSec} Detik`}
            </span>
          </div>
        </div>
      )}

      {/* Skip Button */}
      <button
        onClick={onSkip}
        className="w-full py-3 px-4 rounded-md bg-surface-3 hover:bg-surface-3 text-text-2 hover:text-text font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-border-strong"
      >
        <FastForward className="w-4 h-4" />
        <span>Lewati Istirahat (Langsung Lanjut)</span>
      </button>
    </div>
  );
}
