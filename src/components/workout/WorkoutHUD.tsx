'use client';

import React from 'react';
import type { ExerciseConfig, TrackingResult, BilateralSymmetry } from '@/trackers/types';
import type { TempoState } from '@/lib/tempo/tempo-tracker';
import type { GestureDetectionResult } from '@/lib/gestures/detector';
import { SymmetryIndicator } from './SymmetryIndicator';
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  AlertTriangle,
  UserCheck,
  Ghost,
  BellRing,
  Gauge,
  Hand,
  Mic,
} from 'lucide-react';

interface WorkoutHUDProps {
  config: ExerciseConfig;
  trackingResult: TrackingResult | null;
  isRunning: boolean;
  elapsedSeconds: number;
  isVoiceEnabled: boolean;
  targetValue?: number;
  tempoState?: TempoState | null;
  symmetry?: BilateralSymmetry | null;
  showGhostSkeleton?: boolean;
  onToggleGhostSkeleton?: () => void;
  isMetronomeEnabled?: boolean;
  onToggleMetronome?: () => void;
  isVoiceCommandListening?: boolean;
  onToggleVoiceCommand?: () => void;
  lastVoiceCommand?: string | null;
  gestureResult?: GestureDetectionResult | null;
  onToggleVoice: () => void;
  onTogglePause: () => void;
  onReset: () => void;
  onFinish: () => void;
  onOpenReference?: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function WorkoutHUD({
  config,
  trackingResult,
  isRunning,
  elapsedSeconds,
  isVoiceEnabled,
  targetValue,
  tempoState,
  symmetry,
  showGhostSkeleton = false,
  onToggleGhostSkeleton,
  isMetronomeEnabled = false,
  onToggleMetronome,
  isVoiceCommandListening = false,
  onToggleVoiceCommand,
  lastVoiceCommand,
  gestureResult,
  onToggleVoice,
  onTogglePause,
  onReset,
  onFinish,
  onOpenReference,
}: WorkoutHUDProps) {
  const isTimer = config.type === 'timer';
  const reps = trackingResult?.repCount ?? 0;
  const holdDuration = trackingResult?.holdDuration ?? 0;
  const currentVal = isTimer ? holdDuration : reps;
  const state = trackingResult?.state ?? 'idle';
  const feedback = trackingResult?.feedback;

  const targetProgress =
    targetValue && targetValue > 0
      ? Math.min(100, Math.round((currentVal / targetValue) * 100))
      : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 text-left">
      {/* Active Voice Command Banner */}
      {lastVoiceCommand && (
        <div className="bg-rose-500/20 border border-rose-400/50 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs text-rose-200 shadow-lg shadow-rose-500/10 animate-fade-in">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="font-bold">Perintah Suara:</span>
            <span className="font-mono uppercase font-black text-rose-300">&ldquo;{lastVoiceCommand}&rdquo;</span>
          </div>
          <span className="text-[10px] text-rose-300/80 font-medium">Dieksekusi</span>
        </div>
      )}

      {/* Active Gesture Detection Banner */}
      {gestureResult && gestureResult.activeGesture !== 'none' && (
        <div className="bg-blue-600/20 border border-blue-400/50 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-blue-200 shadow-lg shadow-blue-500/10 animate-pulse">
          <div className="flex items-center gap-2">
            <Hand className="w-4 h-4 text-blue-400 animate-bounce" />
            <span className="font-bold">{gestureResult.label || 'Gestur Tangan Terdeteksi'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 transition-all duration-100"
                style={{ width: `${Math.round(gestureResult.progress * 100)}%` }}
              />
            </div>
            <span className="font-mono font-bold text-blue-300">
              {Math.round(gestureResult.progress * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* HUD Bar Metrik Utama */}
      <div className="grid grid-cols-3 gap-3">
        {/* Metrik Utama: Reps atau Hold Timer */}
        <div className="col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  {isTimer ? 'Durasi Hold' : 'Total Repetisi'}
                </span>
                {targetValue && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    🎯 Target: {targetValue} {isTimer ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 font-mono">
                  {isTimer ? formatDuration(holdDuration) : reps}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  {isTimer ? 'detik' : 'reps'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Posisi
              </span>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  state === 'down' ||
                  state === 'squatting' ||
                  state === 'crunched' ||
                  state === 'open' ||
                  state === 'holding'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}
              >
                {state}
              </span>
            </div>
          </div>

          {/* Progress Bar Target */}
          {targetProgress !== null && (
            <div className="mt-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Pencapaian Target</span>
                <span className="font-mono text-blue-400 font-bold">{targetProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${targetProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stopwatch Total Waktu & Quick Controls */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Waktu</span>
            </div>
            <button
              type="button"
              onClick={onToggleVoice}
              title={isVoiceEnabled ? 'Matikan Suara Pelatih' : 'Nyalakan Suara Pelatih'}
              className={`p-1.5 rounded-lg border transition-colors ${
                isVoiceEnabled
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {formatDuration(elapsedSeconds)}
          </div>
        </div>
      </div>

      {/* Indikator Simetri Bilateral Tubuh (Kiri vs Kanan) */}
      {symmetry && (
        <SymmetryIndicator symmetry={symmetry} />
      )}

      {/* Tempo & Time Under Tension (TUT) Gauge */}
      {tempoState?.lastRepTempo && !isTimer && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-slate-400 text-[11px]">Tempo Repetisi Terakhir:</span>
              <span className="font-mono font-bold text-slate-100 ml-1.5">
                {tempoState.lastRepTempo.tempoFormat}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">
                ({tempoState.lastRepTempo.totalTUTSec}s TUT)
              </span>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
              tempoState.lastRepTempo.isRushed
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {tempoState.lastRepTempo.isRushed ? '⚠️ Terburu-buru' : '✓ Ritme Stabil'}
          </span>
        </div>
      )}

      {/* Real-time Form Fault Warning atau Coaching Feedback */}
      {trackingResult?.activeFault ? (
        <div className="bg-gradient-to-r from-red-950/90 via-rose-900/70 to-slate-900/90 border border-red-500/60 rounded-2xl p-4 flex items-center gap-3 text-sm text-red-200 shadow-xl shadow-red-950/40 animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <span className="font-bold text-red-300 block text-xs uppercase tracking-wider">
              Perbaiki Form: {trackingResult.activeFault.name}
            </span>
            <span className="font-medium text-xs sm:text-sm text-red-100">
              {trackingResult.activeFault.description}
            </span>
          </div>
        </div>
      ) : feedback ? (
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900/40 border border-blue-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-sm text-blue-200 shadow-lg animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-medium text-xs sm:text-sm">{feedback}</span>
        </div>
      ) : null}

      {/* Toolbar Fitur Mutakhir: Ghost Skeleton, Metronom, dan Form Reference */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 px-1">
        <div className="flex items-center gap-2">
          {/* Toggle Ghost Skeleton */}
          {onToggleGhostSkeleton && (
            <button
              type="button"
              onClick={onToggleGhostSkeleton}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                showGhostSkeleton
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
              title="Tampilkan bayangan skeleton ritme ideal langsung di kamera"
            >
              <Ghost className="w-3.5 h-3.5" />
              <span>Bayangan Form {showGhostSkeleton ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Toggle Metronom Audio */}
          {onToggleMetronome && (
            <button
              type="button"
              onClick={onToggleMetronome}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isMetronomeEnabled
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
              title="Nyalakan bunyi detak pemandu ritme turun & naik"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Metronom {isMetronomeEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Toggle Perintah Suara Dua Arah (Voice Commands) */}
          {onToggleVoiceCommand && (
            <button
              type="button"
              onClick={onToggleVoiceCommand}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isVoiceCommandListening
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-md shadow-rose-500/20'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
              title="Kontrol latihan tanpa sentuh dengan suara ('Jeda', 'Lanjut', 'Selesai')"
            >
              <Mic className={`w-3.5 h-3.5 ${isVoiceCommandListening ? 'text-rose-400 animate-pulse' : ''}`} />
              <span>Voice Cmd {isVoiceCommandListening ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>

        {/* Tombol Bantuan Form */}
        {onOpenReference && (
          <button
            type="button"
            onClick={onOpenReference}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 font-semibold text-blue-400 hover:text-blue-300 transition-all shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Lihat Contoh Form</span>
          </button>
        )}
      </div>

      {/* Control Buttons (Pause/Resume, Reset, Finish) */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <button
          onClick={onTogglePause}
          className={`py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all ${
            isRunning
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Jeda</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Lanjut</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>

        <button
          onClick={onFinish}
          className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-500/30 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Check className="w-4 h-4" />
          <span>Selesai</span>
        </button>
      </div>

      {/* Petunjuk Gestur Tangan Tanpa Sentuh */}
      <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-3 pt-0.5">
        <span>✋ Angkat tangan 1.5 detik: Jeda/Lanjut</span>
        <span>&bull;</span>
        <span>❌ Silang tangan: Selesai</span>
      </div>
    </div>
  );
}
