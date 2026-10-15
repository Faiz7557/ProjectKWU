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
  const barColor = isWarning ? 'bg-warning' : 'bg-success';
  const textColor = isWarning ? 'text-warning' : 'text-success';
  const borderColor = isWarning ? 'border-warning/30' : 'border-success/30';
  const bgColor = isWarning ? 'bg-warning-soft' : 'bg-surface';

  return (
    <div
      className={`rounded-md border ${borderColor} ${bgColor} backdrop-blur-md px-3.5 py-2 text-xs shadow-xl transition-all duration-300 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Scale className={`w-3.5 h-3.5 ${textColor}`} />
          <span className="text-xs font-bold tracking-normal text-text-2">
            Simetri {jointName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-xs num font-bold ${textColor}`}>
            {balanceScore}%
          </span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-surface-3 text-text-2">
            {isWarning ? 'Asimetri' : 'Seimbang'}
          </span>
        </div>
      </div>

      {/* Balance Slider Bar: L [====|====] R */}
      <div className="relative flex items-center gap-2">
        <span className="text-xs font-bold num text-text-2">L</span>
        <div className="relative flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
          {/* Garis tengah ideal */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-surface-3 z-10" />

          {/* Indikator titik keseimbangan */}
          <div
            className={`absolute top-0 bottom-0 w-3 rounded-full transition-all duration-150 ${barColor} shadow-md`}
            style={{
              left: `calc(50% + ${offsetPercent}% - 6px)`,
            }}
          />
        </div>
        <span className="text-xs font-bold num text-text-2">R</span>
      </div>

      {/* Sub-label informasi */}
      {feedbackMessage && (
        <div className="mt-1 text-xs text-text-2 font-medium truncate text-center">
          {feedbackMessage} ({diffDegrees}°)
        </div>
      )}
    </div>
  );
}
