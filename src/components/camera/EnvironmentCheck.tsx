'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sun, Maximize2, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import type { ExerciseConfig, TrackingResult } from '@/trackers/types';

interface EnvironmentCheckProps {
  config: ExerciseConfig;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  trackingResult: TrackingResult | null;
  onPassed: () => void;
  onSkip: () => void;
}

export function EnvironmentCheck({
  config,
  videoRef,
  trackingResult,
  onPassed,
  onSkip,
}: EnvironmentCheckProps) {
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

  // Evaluasi kelulusan & auto-trigger countdown
  useEffect(() => {
    const isAllGood =
      lightingStatus === 'good' &&
      framingStatus === 'good' &&
      aiLockStatus === 'locked';

    if (isAllGood) {
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
  }, [lightingStatus, framingStatus, aiLockStatus, onPassed]);

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl backdrop-blur-md animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 inline-block">
          Pemeriksaan Kesiapan Kamera & Ruangan
        </span>
        <h2 className="text-xl font-bold text-slate-100">Setup Posisi Latihan</h2>
        <p className="text-xs text-slate-400">
          Sistem memastikan tubuh Anda terlihat optimal oleh AI vision sebelum memulai.
        </p>
      </div>

      {/* 3 Status Cards */}
      <div className="space-y-3">
        {/* 1. Pencahayaan */}
        <div
          className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
            lightingStatus === 'good'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : lightingStatus === 'dim'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                lightingStatus === 'good'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <span>Pencahayaan Ruangan</span>
                <span className="text-xs font-mono opacity-75">({lightingScore}%)</span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {lightingStatus === 'good' && 'Kecerahan optimal untuk pelacakan pose.'}
                {lightingStatus === 'dim' && 'Ruangan agak gelap. Nyalakan lampu agar tubuh terlihat jelas.'}
                {lightingStatus === 'glare' && 'Terlalu banyak cahaya silau/backlight di belakang Anda.'}
                {lightingStatus === 'checking' && 'Menganalisis kecerahan video...'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {lightingStatus === 'good' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
          </div>
        </div>

        {/* 2. Framing & Jarak */}
        <div
          className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
            framingStatus === 'good'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                framingStatus === 'good'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Jarak & Posisi Tubuh</div>
              <p className="text-xs opacity-80 mt-0.5">
                {framingStatus === 'good' && 'Seluruh sendi tubuh masuk ke dalam frame kamera.'}
                {framingStatus !== 'good' &&
                  `Mundur sekitar 2 meter dan posisikan tubuh dari arah ${
                    config.cameraOrientation === 'side' ? 'SAMPING' : 'DEPAN'
                  }.`}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {framingStatus === 'good' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
          </div>
        </div>

        {/* 3. Penguncian AI Vision */}
        <div
          className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
            aiLockStatus === 'locked'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                aiLockStatus === 'locked'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Model Vision AI (MediaPipe)</div>
              <p className="text-xs opacity-80 mt-0.5">
                {aiLockStatus === 'locked'
                  ? 'Skeleton terkunci stabil dan siap menghitung repetisi!'
                  : 'Menyelaraskan 33 landmark tubuh Anda...'}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {aiLockStatus === 'locked' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* Auto-Ready Progress Callout */}
      {readySeconds !== null && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center animate-pulse">
          <p className="text-xs font-bold text-emerald-300">
            🎉 Posisi Sempurna! Memulai sesi latihan dalam {readySeconds} detik...
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onSkip}
          className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25"
        >
          <span>Lanjut ke Latihan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
