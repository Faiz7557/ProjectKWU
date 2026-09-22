'use client';

import React, { useState, useEffect } from 'react';
import { voiceCoach } from '@/lib/audio/voice-coach';
import { FastForward } from 'lucide-react';

interface CountdownOverlayProps {
  seconds?: number;
  onComplete: () => void;
}

export function CountdownOverlay({ seconds = 5, onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    // Ucapkan angka countdown awal
    if (count > 0) {
      voiceCoach.speak(String(count), true);
    } else {
      voiceCoach.speak('Mulai!', true);
    }

    if (count <= 0) {
      const timer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="text-center space-y-4">
        <span className="text-sm font-bold uppercase tracking-widest text-blue-400 block">
          Bersiap ke Posisi
        </span>

        {/* Angka Countdown Animasi */}
        <div className="relative w-40 h-40 flex items-center justify-center mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping opacity-30" />
          <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
            <span className="text-7xl font-black text-white font-mono transition-transform transform scale-110">
              {count > 0 ? count : 'GO!'}
            </span>
          </div>
        </div>

        <p className="text-slate-300 text-sm max-w-xs mx-auto">
          Mundurlah sekitar 1.5 - 2 meter dari kamera hingga seluruh tubuh Anda terlihat.
        </p>

        {/* Tombol Lewati */}
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-all mt-4"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>Lewati Countdown</span>
        </button>
      </div>
    </div>
  );
}
