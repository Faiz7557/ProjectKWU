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
  const panelTone = isWarning ? 'panel-8' : 'panel-7';

  return (
    <div
      className={`${panelTone} px-3.5 py-2 text-xs transition-all duration-300 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-xs font-bold tracking-normal text-text-2">
            Simetri {jointName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-xs num font-bold`}>
            {balanceScore}%
          </span>
          <span className="text-xs font-bold px-1.5 py-0.5 bg-ink text-paper">
            {isWarning ? 'Asimetri' : 'Seimbang'}
          </span>
        </div>
      </div>

      {/* Balance Slider Bar: L [====|====] R */}
      <div className="relative flex items-center gap-2">
        <span className="text-xs font-bold num text-text-2">L</span>
        <div className="relative flex-1 h-2 bg-ink/20 overflow-hidden">
          {/* Garis tengah ideal */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-ink z-10" />

          {/* Indikator titik keseimbangan */}
          <div
            className={`absolute top-0 bottom-0 w-3 transition-all duration-150 bg-ink`}
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
