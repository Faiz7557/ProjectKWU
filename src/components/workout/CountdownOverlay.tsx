'use client';

import { useEffect, useRef, useState } from 'react';
import { voiceCoach } from '@/lib/audio/voice-coach';
import { FastForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CountdownOverlayProps {
  seconds?: number;
  onComplete: () => void;
}

// Overlay di atas panggung kamera (bukan layar penuh), agar pengguna tetap melihat dirinya.
export function CountdownOverlay({ seconds = 5, onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState(seconds);
  // Simpan callback di ref: perubahan identitas callback tidak boleh me-reset hitungan.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Ucapkan angka countdown awal
    if (count > 0) {
      voiceCoach.speak(String(count), true);
    } else {
      voiceCoach.speak('Mulai!', true);
    }

    if (count <= 0) {
      const timer = setTimeout(() => onCompleteRef.current(), 500);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [count]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-ink p-4 text-center text-paper animate-enter">
      <p className="text-caption font-semibold uppercase tracking-[0.06em]">Bersiap di posisi</p>

      {/* Angka countdown: animasi pop per hitungan (ketukan ritmis), tanpa loop */}
      <span key={count} className="num panel-1 grid size-36 place-items-center font-display text-metric-l animate-pop">
        {count > 0 ? count : 'Mulai'}
      </span>

      <p className="max-w-xs text-callout">Mundur 1,5 sampai 2 meter dari kamera agar seluruh tubuh terlihat.</p>

      <Button variant="tertiary" size="md" className="text-paper" onClick={() => onCompleteRef.current()} icon={<FastForward className="size-4" aria-hidden="true" />}>
        Lewati hitungan
      </Button>
    </div>
  );
}
