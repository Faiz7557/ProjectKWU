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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-xl bg-canvas/80 p-4 text-center backdrop-blur-md animate-enter">
      <p className="text-subhead font-semibold text-accent-text">Bersiap di posisi</p>

      {/* Angka countdown: animasi pop per hitungan (ketukan ritmis), tanpa loop */}
      <span key={count} className="num grid size-36 place-items-center rounded-full bg-accent text-metric-l text-on-accent animate-pop">
        {count > 0 ? count : 'Mulai'}
      </span>

      <p className="max-w-xs text-callout text-text-2">Mundur 1,5 sampai 2 meter dari kamera agar seluruh tubuh terlihat.</p>

      <Button variant="tertiary" size="md" onClick={() => onCompleteRef.current()} icon={<FastForward className="size-4" aria-hidden="true" />}>
        Lewati hitungan
      </Button>
    </div>
  );
}
