'use client';

import React from 'react';
import type { BilateralSymmetry } from '@/trackers/types';
import { Scale } from 'lucide-react';

interface SymmetryIndicatorProps {
  symmetry?: BilateralSymmetry | null;
  className?: string;
}

export function SymmetryIndicator({ symmetry, className = '' }: SymmetryIndicatorProps) {
  if (!symmetry) return null;

  const { balanceScore, diffDegrees, isImbalanced, imbalancedSide, feedbackMessage, jointName } = symmetry;

  // Hitung posisi offset indikator (-50% s.d. +50%)
  // Jika left lebih menekuk, geser ke kiri (-). Jika right lebih menekuk, geser ke kanan (+)
  let offsetPercent = 0;
  if (imbalancedSide === 'left') {
    offsetPercent = -Math.min(45, (diffDegrees / 25) * 45);
  } else if (imbalancedSide === 'right') {
    offsetPercent = Math.min(45, (diffDegrees / 25) * 45);
  }

  const isWarning = isImbalanced;
  const barColor = isWarning ? 'bg-amber-500' : 'bg-emerald-400';
  const textColor = isWarning ? 'text-amber-300' : 'text-emerald-300';
  const borderColor = isWarning ? 'border-amber-500/40' : 'border-emerald-500/30';
  const bgColor = isWarning ? 'bg-amber-950/40' : 'bg-slate-900/80';

  return (
    <div
      className={`rounded-2xl border ${borderColor} ${bgColor} backdrop-blur-md px-3.5 py-2 text-xs shadow-xl transition-all duration-300 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Scale className={`w-3.5 h-3.5 ${textColor}`} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Simetri {jointName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-mono font-black ${textColor}`}>
            {balanceScore}%
          </span>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {isWarning ? 'Asimetri' : 'Seimbang'}
          </span>
        </div>
      </div>

      {/* Balance Slider Bar: L [====|====] R */}
      <div className="relative flex items-center gap-2">
        <span className="text-[10px] font-bold font-mono text-slate-400">L</span>
        <div className="relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          {/* Garis tengah ideal */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600 z-10" />

          {/* Indikator titik keseimbangan */}
          <div
            className={`absolute top-0 bottom-0 w-3 rounded-full transition-all duration-150 ${barColor} shadow-md`}
            style={{
              left: `calc(50% + ${offsetPercent}% - 6px)`,
            }}
          />
        </div>
        <span className="text-[10px] font-bold font-mono text-slate-400">R</span>
      </div>

      {/* Sub-label informasi */}
      {feedbackMessage && (
        <div className="mt-1 text-[10px] text-slate-400 font-medium truncate text-center">
          {feedbackMessage} ({diffDegrees}°)
        </div>
      )}
    </div>
  );
}
