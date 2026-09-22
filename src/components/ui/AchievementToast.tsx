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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-auto animate-bounce-subtle">
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-amber-500/40 rounded-3xl p-4 shadow-2xl shadow-amber-500/10 space-y-3">
        {/* Header Toast */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Pencapaian Terbuka!
            </span>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              onClose?.();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Level Up Banner jika ada */}
        {leveledUp && (
          <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-black text-sm">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-200">Naik Level {newLevel}!</div>
              <div className="text-[11px] text-indigo-300/80">Gelar: {levelName}</div>
            </div>
          </div>
        )}

        {/* List Badges yang Unlocked */}
        <div className="space-y-2">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className="flex items-center gap-3 p-2 rounded-2xl bg-slate-800/60 border border-slate-700/60"
            >
              <div className="text-2xl">{ach.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate">{ach.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{ach.description}</div>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
                +{ach.xpReward} XP
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
