'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'not_found'
  | 'not_supported'
  | 'error';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment' = 'user') => {
    if (typeof window === 'undefined') return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('not_supported');
      setError('Browser ini tidak mendukung akses kamera langsung (getUserMedia).');
      return;
    }

    // Hentikan stream aktif sebelumnya jika ada
    stopCamera();

    setStatus('requesting');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus('active');
    } catch (err: unknown) {
      const domErr = err as { name?: string; message?: string };
      if (domErr?.name === 'NotAllowedError' || domErr?.name === 'PermissionDeniedError') {
        setStatus('denied');
        setError('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.');
      } else if (domErr?.name === 'NotFoundError' || domErr?.name === 'DevicesNotFoundError') {
        setStatus('not_found');
        setError('Kamera tidak terdeteksi pada perangkat.');
      } else {
        setStatus('error');
        setError(domErr?.message || 'Gagal memulai koneksi video kamera.');
      }
    }
  }, [stopCamera]);

  const toggleFacingMode = useCallback(() => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  useEffect(() => {
    return () => {
      // Cleanup saat komponen unmount
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  return {
    videoRef,
    status,
    error,
    facingMode,
    startCamera,
    stopCamera,
    toggleFacingMode,
  };
}
