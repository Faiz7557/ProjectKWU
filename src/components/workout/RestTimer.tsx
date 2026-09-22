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
    <div className="w-full max-w-md mx-auto bg-slate-900/95 border border-slate-800 rounded-3xl p-6 text-center space-y-6 shadow-2xl backdrop-blur-md animate-fade-in">
      {/* Icon & Label */}
      <div className="space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Coffee className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
          Waktu Istirahat
        </span>
        <h2 className="text-2xl font-bold text-slate-100">Tarik Napas & Minum Air</h2>
      </div>

      {/* Countdown Clock */}
      <div className="relative py-4">
        <div className="text-6xl font-black text-amber-400 font-mono tracking-tight">
          {timeLeft}
          <span className="text-lg font-bold text-slate-500 ml-1">detik</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 mt-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Next Exercise Preview */}
      {nextStep && (
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left space-y-1">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
            Gerakan Berikutnya:
          </span>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-100">{nextStep.exerciseName}</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300">
              {nextStep.targetReps ? `${nextStep.targetReps} Reps` : `${nextStep.targetDurationSec} Detik`}
            </span>
          </div>
        </div>
      )}

      {/* Skip Button */}
      <button
        onClick={onSkip}
        className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700"
      >
        <FastForward className="w-4 h-4" />
        <span>Lewati Istirahat (Langsung Lanjut)</span>
      </button>
    </div>
  );
}
