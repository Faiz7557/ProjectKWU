'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';
import { Achievement } from '@/lib/gamification/types';

interface AchievementToastProps {
  achievements: Achievement[];
  leveledUp?: boolean;
  newLevel?: number;
  levelName?: string;
  onClose?: () => void;
}

export function AchievementToast({
  achievements,
  leveledUp,
  newLevel,
  levelName,
  onClose,
}: AchievementToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible || (achievements.length === 0 && !leveledUp)) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-auto animate-pop">
      <div className="bg-surface border border-warning/30 rounded-lg p-4 shadow-2xl shadow-2 space-y-3">
        {/* Header Toast */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-warning-soft text-warning flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold tracking-normal text-warning">
              Pencapaian Terbuka!
            </span>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              onClose?.();
            }}
            className="p-1 rounded-full text-text-2 hover:text-text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Level Up Banner jika ada */}
        {leveledUp && (
          <div className="p-2.5 rounded-md bg-accent-soft border border-accent-text/30 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-accent-soft text-accent-text flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4 text-accent-text" />
            </div>
            <div>
              <div className="text-xs font-bold text-accent-text">Naik Level {newLevel}!</div>
              <div className="text-xs text-accent-text">Gelar: {levelName}</div>
            </div>
          </div>
        )}

        {/* List Badges yang Unlocked */}
        <div className="space-y-2">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className="flex items-center gap-3 p-2 rounded-md bg-surface-3 border border-border-strong"
            >
              <div className="text-2xl">{ach.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-text truncate">{ach.name}</div>
                <div className="text-xs text-text-2 truncate">{ach.description}</div>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-warning-soft text-warning text-xs font-bold shrink-0">
                +{ach.xpReward} XP
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
