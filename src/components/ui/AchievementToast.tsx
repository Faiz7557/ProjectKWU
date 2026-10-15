'use client';

import { useEffect, useRef } from 'react';
import { Achievement } from '@/lib/gamification/types';
import { toast } from './Toast';

interface AchievementToastProps {
  achievements: Achievement[];
  leveledUp?: boolean;
  newLevel?: number;
  levelName?: string;
  onClose?: () => void;
}

// Pencapaian dan kenaikan level masuk ke antrean Toast global (satu per satu, UI_UX_BRIEF §7.3).
// Komponen ini tidak merender apa pun; onClose dipanggil setelah antrean terisi.
export function AchievementToast({ achievements, leveledUp, newLevel, levelName, onClose }: AchievementToastProps) {
  const queuedFor = useRef<Achievement[] | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (achievements.length === 0 && !leveledUp) return;
    // Cegah antrean ganda saat induk re-render dengan array yang sama
    if (queuedFor.current === achievements) return;
    queuedFor.current = achievements;

    if (leveledUp) {
      toast({ title: `Naik ke level ${newLevel}: ${levelName ?? ''}`.trim(), tone: 'success' });
    }
    for (const ach of achievements) {
      toast({ title: `Pencapaian terbuka: ${ach.name} (+${ach.xpReward} XP)`, tone: 'success' });
    }
    onCloseRef.current?.();
  }, [achievements, leveledUp, newLevel, levelName]);

  return null;
}
