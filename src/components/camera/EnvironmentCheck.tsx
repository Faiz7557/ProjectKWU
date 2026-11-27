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

/** Semua cek harus hijau terus-menerus selama ini sebelum lanjut otomatis. */
const PASS_HOLD_MS = 1000;
/** Interval sampling kecerahan video. */
const LIGHT_SAMPLE_MS = 250;

// Satu baris checklist: ikon status + judul + detail (UI_UX_BRIEF §7.3, checklist ala iOS).
function CheckRow({ state, icon: Icon, title, detail }: { state: CheckState; icon: React.ComponentType<{ className?: string }>; title: string; detail: string }) {
  // Ikon di atas chip ink: pakai warna terang yang tetap kontras di kedua tema (bukan token teks tema/panel).
  const tone = state === 'ok' ? 'text-panel-7' : state === 'warn' ? 'text-panel-8' : 'text-paper';
  return (
    <li className="flex items-start gap-3 bg-paper p-3.5 text-ink">
      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center bg-ink ${tone}`} aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-headline">{title}</p>
        <p className="text-footnote">{detail}</p>
      </div>
      <span className="mt-1 shrink-0" aria-hidden="true">
        {state === 'ok' && <CheckCircle2 className="size-5" />}
        {state === 'warn' && <TriangleAlert className="size-5" />}
        {state === 'pending' && <RefreshCw className="size-5 animate-spin" />}
      </span>
    </li>
  );
}

export function EnvironmentCheck({ config, videoRef, trackingResult, onPassed, onSkip }: EnvironmentCheckProps) {
  const [lightingStatus, setLightingStatus] = useState<'checking' | 'good' | 'dim' | 'glare'>('checking');
  const [lightingScore, setLightingScore] = useState<number>(0);
  // Framing & kunci AI diturunkan langsung dari hasil tracking (tanpa state/loop tambahan).
  const framingStatus = trackingResult?.isTracking ? 'good' : 'missing';
  const aiLockStatus = trackingResult?.isTracking ? 'locked' : 'waiting';

  // Kecerahan dicek 4x/detik, bukan tiap frame: getImageData memaksa readback GPU->CPU sinkron
  // yang bersaing dengan inferensi pose, dan setState per frame merender ulang halaman ~60x/detik.
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const sample = () => {
      const video = videoRef.current;
      if (!ctx || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      try {
        ctx.drawImage(video, 0, 0, 32, 24);
        const data = ctx.getImageData(0, 0, 32, 24).data;
        let totalLum = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Standar ITU-R BT.601 perceptual luminance
          totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        const avgLum = totalLum / (data.length / 4);
        // Dibulatkan ke kelipatan 5% agar fluktuasi kecil tidak memicu render.
        setLightingScore(Math.round((avgLum / 255) * 20) * 5);
        setLightingStatus(avgLum < 45 ? 'dim' : avgLum > 235 ? 'glare' : 'good');
      } catch {
        // Cross-origin atau browser restriction fallback
        setLightingStatus('good');
      }
    };

    const id = setInterval(sample, LIGHT_SAMPLE_MS);
    return () => clearInterval(id);
  }, [videoRef]);

  const allGood = lightingStatus === 'good' && framingStatus === 'good' && aiLockStatus === 'locked';

  // Evaluasi kelulusan & auto-trigger countdown. Berbasis waktu, bukan jumlah render:
  // frekuensi render halaman tidak tetap (hasil tracking dipublish dengan throttle).
  const onPassedRef = useRef(onPassed);
  useEffect(() => {
    onPassedRef.current = onPassed;
  });
  useEffect(() => {
    if (!allGood) return;
    const timer = setTimeout(() => onPassedRef.current(), PASS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [allGood]);
  const readySeconds = allGood ? Math.ceil(PASS_HOLD_MS / 1000) : null;

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
    <Card tone={4} className="mx-auto max-w-xl space-y-6 p-5 sm:p-6">
      <header className="space-y-1.5 text-center">
        <p className="text-caption font-semibold uppercase tracking-[0.06em]">Pemeriksaan kesiapan</p>
        <h2 className="font-display text-title-2">Posisi kamu sudah pas?</h2>
        <p className="text-callout">Cek ini memastikan tubuh kamu terlihat jelas sebelum latihan mulai.</p>
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
        <p role="status" className="bg-panel-7 p-3 text-center text-subhead font-semibold text-on-panel-7">
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
