'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sun, Maximize2, ShieldCheck, CheckCircle2, TriangleAlert, RefreshCw } from 'lucide-react';
import type { ExerciseConfig, TrackingResult } from '@/trackers/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surfaces';

interface EnvironmentCheckProps {
  config: ExerciseConfig;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  trackingResult: TrackingResult | null;
  onPassed: () => void;
  onSkip: () => void;
}

type CheckState = 'ok' | 'warn' | 'pending';

// Satu baris checklist: ikon status + judul + detail (UI_UX_BRIEF §7.3, checklist ala iOS).
function CheckRow({ state, icon: Icon, title, detail }: { state: CheckState; icon: React.ComponentType<{ className?: string }>; title: string; detail: string }) {
  const tone = state === 'ok' ? 'text-success' : state === 'warn' ? 'text-warning' : 'text-text-2';
  return (
    <li className="flex items-start gap-3 rounded-md bg-surface-3 p-3.5">
      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-canvas ${tone}`} aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-headline text-text">{title}</p>
        <p className="text-footnote text-text-2">{detail}</p>
      </div>
      <span className="mt-1 shrink-0" aria-hidden="true">
        {state === 'ok' && <CheckCircle2 className="size-5 text-success" />}
        {state === 'warn' && <TriangleAlert className="size-5 text-warning" />}
        {state === 'pending' && <RefreshCw className="size-5 animate-spin text-accent-text" />}
      </span>
    </li>
  );
}

export function EnvironmentCheck({ config, videoRef, trackingResult, onPassed, onSkip }: EnvironmentCheckProps) {
  // State 3 indikator
  const [lightingStatus, setLightingStatus] = useState<'checking' | 'good' | 'dim' | 'glare'>('checking');
  const [lightingScore, setLightingScore] = useState<number>(0);
  const [framingStatus, setFramingStatus] = useState<'checking' | 'good' | 'missing'>('checking');
  const [aiLockStatus, setAiLockStatus] = useState<'waiting' | 'locked'>('waiting');

  // Auto-progress countdown saat semua cek hijau
  const [readySeconds, setReadySeconds] = useState<number | null>(null);
  const consecutivePassCountRef = useRef(0);

  // Hidden canvas untuk sampling kecerahan frame video
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const checkEnvironment = () => {
      const video = videoRef.current;
      if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        // 1. Analisis Pencahayaan (Luminance)
        try {
          if (!sampleCanvasRef.current) {
            const c = document.createElement('canvas');
            c.width = 32;
            c.height = 24;
            sampleCanvasRef.current = c;
          }
          const ctx = sampleCanvasRef.current.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, 32, 24);
            const imgData = ctx.getImageData(0, 0, 32, 24);
            const data = imgData.data;
            let totalLum = 0;
            const pixelCount = data.length / 4;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // Standar ITU-R BT.601 perceptual luminance
              totalLum += 0.299 * r + 0.587 * g + 0.114 * b;
            }

            const avgLum = totalLum / pixelCount;
            setLightingScore(Math.round((avgLum / 255) * 100));

            if (avgLum < 45) {
              setLightingStatus('dim');
            } else if (avgLum > 235) {
              setLightingStatus('glare');
            } else {
              setLightingStatus('good');
            }
          }
        } catch {
          // Cross-origin atau browser restriction fallback
          setLightingStatus('good');
        }

        // 2. Analisis Framing & Visibilitas Landmark
        if (trackingResult?.isTracking) {
          setFramingStatus('good');
          setAiLockStatus('locked');
        } else {
          setFramingStatus('missing');
          setAiLockStatus('waiting');
        }
      }

      animId = requestAnimationFrame(checkEnvironment);
    };

    animId = requestAnimationFrame(checkEnvironment);
    return () => cancelAnimationFrame(animId);
  }, [videoRef, trackingResult]);

  const allGood = lightingStatus === 'good' && framingStatus === 'good' && aiLockStatus === 'locked';

  // Evaluasi kelulusan & auto-trigger countdown
  useEffect(() => {
    if (allGood) {
      consecutivePassCountRef.current++;
      // Butuh sekitar 1 detik stabil (30 fps ~ 30 frames)
      if (consecutivePassCountRef.current >= 30) {
        onPassed();
      } else {
        const remaining = Math.max(1, Math.ceil((30 - consecutivePassCountRef.current) / 30));
        setReadySeconds(remaining);
      }
    } else {
      consecutivePassCountRef.current = 0;
      setReadySeconds(null);
    }
  }, [allGood, onPassed]);

  const lightState: CheckState = lightingStatus === 'good' ? 'ok' : lightingStatus === 'checking' ? 'pending' : 'warn';
  const lightDetail =
    lightingStatus === 'good'
      ? `Kecerahan ${lightingScore}%. Sudah pas untuk pelacakan.`
      : lightingStatus === 'dim'
        ? `Ruangan agak gelap (${lightingScore}%). Nyalakan lampu agar tubuh terlihat jelas.`
        : lightingStatus === 'glare'
          ? 'Terlalu silau. Hindari sumber cahaya di belakang kamu.'
          : 'Menganalisis kecerahan video...';

  return (
    <Card className="mx-auto max-w-xl space-y-6 p-5 sm:p-6">
      <header className="space-y-1.5 text-center">
        <p className="text-caption font-semibold uppercase tracking-wide text-accent-text">Pemeriksaan kesiapan</p>
        <h2 className="text-title-2 text-text">Posisi kamu sudah pas?</h2>
        <p className="text-callout text-text-2">Cek ini memastikan tubuh kamu terlihat jelas sebelum latihan mulai.</p>
      </header>

      <ul className="space-y-2.5">
        <CheckRow state={lightState} icon={Sun} title="Pencahayaan ruangan" detail={lightDetail} />
        <CheckRow
          state={framingStatus === 'good' ? 'ok' : 'warn'}
          icon={Maximize2}
          title="Jarak dan posisi tubuh"
          detail={
            framingStatus === 'good'
              ? 'Seluruh sendi tubuh masuk ke frame kamera.'
              : `Mundur sekitar 2 meter dan posisikan tubuh dari arah ${config.cameraOrientation === 'side' ? 'samping' : 'depan'}.`
          }
        />
        <CheckRow
          state={aiLockStatus === 'locked' ? 'ok' : 'pending'}
          icon={ShieldCheck}
          title="Pelacakan tubuh"
          detail={aiLockStatus === 'locked' ? 'Kerangka tubuh terkunci dan siap menghitung rep.' : 'Menyelaraskan 33 titik tubuh kamu...'}
        />
      </ul>

      {readySeconds !== null && (
        <p role="status" className="rounded-md bg-success-soft p-3 text-center text-subhead font-semibold text-success">
          Posisi pas. Mulai otomatis dalam {readySeconds} detik.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {allGood ? (
          <>
            <Button size="lg" className="w-full" onClick={onPassed}>
              Mulai sekarang
            </Button>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onSkip}>
              Lewati
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="lg" className="w-full" onClick={onSkip}>
            Lewati pemeriksaan
          </Button>
        )}
      </div>
    </Card>
  );
}
