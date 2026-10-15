'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { releasePoseDetector } from '@/lib/mediapipe/pose-detector';

export default function WorkoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Workout Session Error:', error);
    // Lepas resource MediaPipe dan WebGL saat crash
    releasePoseDetector();
  }, [error]);

  return (
    <ErrorState
      title="Sesi latihan terhenti"
      description="Kamera atau model AI gagal dimuat. Pastikan izin kamera sudah diberikan dan tidak sedang dipakai aplikasi lain."
      reset={() => {
        releasePoseDetector();
        reset();
      }}
      retryLabel="Mulai ulang"
      secondary={{ href: '/workout', label: 'Pilih latihan' }}
      detail={error?.message}
    />
  );
}
