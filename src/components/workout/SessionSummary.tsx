'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  RotateCcw,
  History,
  ArrowRight,
  Award,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Scale,
  FileDown,
} from 'lucide-react';
import type { ExerciseConfig } from '@/trackers/types';
import Link from 'next/link';
import { ShareButton } from '@/components/workout/ShareButton';
import { generateWorkoutPDFReport } from '@/lib/reporting/pdf-generator';

export interface FaultSummaryItem {
  name: string;
  count: number;
  description: string;
}

interface SessionSummaryProps {
  config: ExerciseConfig;
  reps: number;
  cleanReps?: number;
  holdDurationSec: number;
  sessionDurationSec: number;
  formScore?: number;
  symmetryScore?: number;
  tempoRatio?: string;
  avgTutSec?: number;
  caloriesBurned?: number;
  faultsSummary?: FaultSummaryItem[];
  onRestart: () => void;
  onSave?: () => Promise<void>;
}

const COACH_TIPS: Record<string, string> = {
  pushup: 'Kunci otot perut dan pantat (glutes) seperti posisi plank agar pinggul tidak turun mendahului dada.',
  squat: 'Arahkan pinggul ke belakang seperti menduduki kursi dan pertahankan pandangan lurus ke depan.',
  situp: 'Fokus angkat tubuh dengan kontraksi otot perut, bukan dengan menarik leher ke depan.',
  jumping_jack: 'Jaga ritme lompatan agar tangan dan kaki membuka serta menutup secara simetris bersamaan.',
  plank: 'Bernapas teratur dan dorong lantai menjauh dari bahu untuk menstabilkan tulang belikat.',
};

export function SessionSummary({
  config,
  reps,
  cleanReps,
  holdDurationSec,
  sessionDurationSec,
  formScore = 92,
  symmetryScore = 95,
  tempoRatio,
  avgTutSec,
  caloriesBurned = 0,
  faultsSummary = [],
  onRestart,
}: SessionSummaryProps) {
  const isTimer = config.type === 'timer';

  useEffect(() => {
    try {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore
    }
  }, []);

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s} detik`;
  };

  const pace = sessionDurationSec > 0 && !isTimer
    ? ((reps / sessionDurationSec) * 60).toFixed(1)
    : null;

  const coachTip = COACH_TIPS[config.id] || 'Lakukan pemanasan dan pendinginan setiap kali berlatih.';

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl text-center animate-fade-in space-y-6">
      <div>
        {/* Trophy Badge */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-yellow-500/30 text-yellow-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/10">
          <Trophy className="w-10 h-10" />
        </div>

        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest block mb-1">
          Sesi Latihan Selesai
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100">
          {config.name}
        </h2>
      </div>

      {/* Grid Metrik Utama */}
      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-semibold block mb-1">
            {isTimer ? 'Waktu Hold' : 'Total Repetisi'}
          </span>
          <div className="text-3xl font-extrabold text-blue-400 font-mono">
            {isTimer ? formatMinSec(holdDurationSec) : reps}
          </div>
          {!isTimer && cleanReps !== undefined && (
            <span className="text-xs text-emerald-400 font-semibold block mt-1">
              {cleanReps} Clean / {reps - cleanReps} Perlu Perbaikan
            </span>
          )}
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-semibold block mb-1">
            Durasi Total
          </span>
          <div className="text-3xl font-extrabold text-slate-200 font-mono">
            {formatMinSec(sessionDurationSec)}
          </div>
          {pace && (
            <span className="text-xs text-slate-400 font-medium block mt-1">
              Pace: {pace} reps/menit
            </span>
          )}
        </div>

        {/* Kualitas Form */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">
              Kualitas Form
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono flex items-center gap-1">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>{formScore}%</span>
            </div>
          </div>
        </div>

        {/* Simetri Bilateral Tubuh */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">
              Simetri Tubuh
            </span>
            <div className="text-2xl font-extrabold text-teal-400 font-mono flex items-center gap-1">
              <Scale className="w-5 h-5 text-teal-400" />
              <span>{symmetryScore}%</span>
            </div>
          </div>
        </div>

        {/* Kalori Terbakar (Lebar Penuh) */}
        <div className="col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Estimasi Kalori</span>
              <span className="text-lg font-bold text-orange-400 font-mono">
                {caloriesBurned > 0 ? caloriesBurned : Math.max(1, Math.round(sessionDurationSec * 0.14))} kcal
              </span>
            </div>
          </div>
          {tempoRatio && (
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold block">Ritme Tempo</span>
              <span className="text-xs font-bold text-indigo-400 font-mono">{tempoRatio}</span>
            </div>
          )}
        </div>
      </div>

      {/* ⚠️ ANALISIS KESALAHAN GERAKAN */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 text-left space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Analisis Kesalahan Postur</span>
        </div>

        {faultsSummary.length === 0 ? (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <strong className="block font-semibold">Postur Sempurna!</strong>
              Tidak terdeteksi kesalahan form signifikan selama sesi ini. Pertahankan teknik Anda!
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {faultsSummary.map((fault, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-slate-300 flex items-start justify-between gap-3"
              >
                <div>
                  <span className="font-bold text-red-300 block mb-0.5">
                    {fault.name} ({fault.count}x terdeteksi)
                  </span>
                  <p className="text-slate-400 text-xs leading-relaxed">{fault.description}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold shrink-0">
                  Perbaiki
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Saran Pelatih / Coach Advice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
          <Lightbulb className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
          <div>
            <span className="font-bold text-blue-300 block mb-0.5">Rekomendasi Pelatih:</span>
            <span>{coachTip}</span>
          </div>
        </div>
      </div>

      {/* Tombol Unduh Laporan PDF Biomekanika */}
      <button
        type="button"
        onClick={() => {
          generateWorkoutPDFReport({
            exerciseName: config.name,
            totalReps: reps,
            cleanReps,
            holdDurationSec,
            sessionDurationSec,
            caloriesBurned: caloriesBurned > 0 ? caloriesBurned : Math.max(1, Math.round(sessionDurationSec * 0.14)),
            formScore,
            symmetryScore,
            faultsSummary,
            tempoRatio,
            avgTutSec,
            coachAdvice: coachTip,
          });
        }}
        className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-teal-500/20 transition-all border border-teal-400/30"
      >
        <FileDown className="w-4 h-4" />
        <span>Unduh Laporan Audit PDF Biomekanika</span>
      </button>

      {/* Tombol Share Prestasi */}
      <ShareButton
        data={{
          exerciseName: config.name,
          reps,
          cleanReps,
          holdDurationSec,
          sessionDurationSec,
          formScore,
          caloriesBurned: caloriesBurned > 0 ? caloriesBurned : Math.max(1, Math.round(sessionDurationSec * 0.14)),
        }}
      />

      {/* Tombol Aksi */}
      <div className="space-y-3 pt-1">
        <button
          onClick={onRestart}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Ulangi Latihan</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/history"
            className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <History className="w-4 h-4 text-blue-400" />
            <span>Lihat Riwayat</span>
          </Link>

          <Link
            href="/workout"
            className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <span>Pilih Gerakan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
