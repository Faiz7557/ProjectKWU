'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExerciseConfig, TrackingResult, BilateralSymmetry } from '@/trackers/types';
import type { TempoState } from '@/lib/tempo/tempo-tracker';
import type { GestureDetectionResult } from '@/lib/gestures/detector';
import { SymmetryIndicator } from './SymmetryIndicator';
import { ACTIVE_STATES, stateLabel } from './state-labels';
import { Button, IconButton } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Toggle } from '@/components/ui/Controls';
import { Badge, ProgressRing } from '@/components/ui/Surfaces';
import {
  AlertTriangle,
  BellRing,
  Check,
  Clock,
  Ghost,
  Gauge,
  Hand,
  Mic,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  UserCheck,
  Volume2,
  VolumeX,
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirm, setConfirm] = useState<'reset' | 'finish' | null>(null);
  const repRef = useRef<HTMLSpanElement>(null);
  const prevReps = useRef(0);

  const isTimer = config.type === 'timer';
  const reps = trackingResult?.repCount ?? 0;
  const holdDuration = trackingResult?.holdDuration ?? 0;
  const currentVal = isTimer ? holdDuration : reps;
  const state = trackingResult?.state ?? 'idle';
  const fault = trackingResult?.activeFault;
  const feedback = trackingResult?.feedback;
  const gesturePct = gestureResult ? Math.round(gestureResult.progress * 100) : 0;
  const gestureActive = !!gestureResult && gestureResult.activeGesture !== 'none';

  const targetProgress = targetValue && targetValue > 0 ? Math.min(100, Math.round((currentVal / targetValue) * 100)) : null;

  // Denyut rep: scale 1 -> 1.12 -> 1 lewat WAAPI (native, tanpa menunggu re-render React).
  // Bunyi beep dan haptic dipicu di handler sesi pada frame yang sama.
  useEffect(() => {
    if (isTimer) return;
    if (reps === prevReps.current) return;
    prevReps.current = reps;
    const el = repRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
      { duration: 450, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
  }, [reps, isTimer]);

  const requestReset = () => (reps > 0 ? setConfirm('reset') : onReset());
  const requestFinish = () => (reps > 0 ? setConfirm('finish') : onFinish());
  const runConfirmed = () => {
    if (confirm === 'reset') onReset();
    if (confirm === 'finish') onFinish();
    setConfirm(null);
  };

  // Tone feedback slot: fault (danger) > coaching (accent) > netral.
  const slotTone = fault
    ? 'border-danger/30 bg-danger-soft text-danger'
    : feedback
      ? 'border-accent-text/30 bg-accent-soft text-accent-text'
      : 'border-separator bg-surface text-text-2';

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 text-left">
      {/* Metrik utama: angka besar dan target */}
      <section aria-label="Hasil latihan" className="rounded-xl bg-surface p-5 shadow-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-subhead text-text-2">{isTimer ? 'Durasi tahan' : 'Repetisi'}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span ref={repRef} className="num inline-block origin-center text-metric-xl text-text">
                {isTimer ? formatDuration(holdDuration) : reps}
              </span>
              {!isTimer && <span className="text-headline text-text-2">rep</span>}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge tone={ACTIVE_STATES.has(state) ? 'success' : 'accent'}>{stateLabel(state)}</Badge>
            <IconButton label="Opsi latihan" icon={<SlidersHorizontal className="size-5" aria-hidden="true" />} onClick={() => setSheetOpen(true)} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          {targetProgress !== null ? (
            <div className="flex items-center gap-3">
              <ProgressRing value={targetProgress / 100} size={64} stroke={7} tone="reps" label="Pencapaian target">
                <span className="num text-subhead font-bold text-text">{targetProgress}%</span>
              </ProgressRing>
              <div className="text-footnote text-text-2">
                Target {targetValue}
                {isTimer ? ' detik' : ' rep'}
              </div>
            </div>
          ) : (
            <span />
          )}
          {gestureActive && (
            <Badge tone="accent" icon={<Hand className="size-3.5" />}>
              {gestureResult?.label || 'Gestur'} {gesturePct}%
            </Badge>
          )}
        </div>
      </section>

      {/* Slot umpan balik: tinggi tetap agar layout tidak bergeser (UI_UX_BRIEF §2.4 #17) */}
      <div role="status" aria-live="polite" className={`flex min-h-16 items-center gap-3 rounded-md border px-4 py-3 text-callout transition-colors duration-200 ${slotTone}`}>
        {fault ? (
          <>
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <strong className="block text-subhead font-semibold">Perbaiki form: {fault.name}</strong>
              <span className="text-footnote">{fault.description}</span>
            </span>
          </>
        ) : feedback ? (
          <>
            <Sparkles className="size-5 shrink-0" aria-hidden="true" />
            <span>{feedback}</span>
          </>
        ) : (
          <span className="text-text-2">{isRunning ? 'Bagus. Terus bergerak.' : 'Latihan dijeda.'}</span>
        )}
      </div>

      {/* Baris meta */}
      <div className="num flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-footnote text-text-2">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden="true" />
          {formatDuration(elapsedSeconds)}
        </span>
        {tempoState?.lastRepTempo && !isTimer && (
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="size-3.5" aria-hidden="true" />
            Tempo {tempoState.lastRepTempo.tempoFormat}
            {tempoState.lastRepTempo.isRushed && <span className="text-warning">· terburu-buru</span>}
          </span>
        )}
        {lastVoiceCommand && (
          <span className="inline-flex items-center gap-1.5 text-accent-text">
            <Mic className="size-3.5" aria-hidden="true" />
            &ldquo;{lastVoiceCommand}&rdquo;
          </span>
        )}
      </div>

      {symmetry && <SymmetryIndicator symmetry={symmetry} />}

      {/* Kontrol: 3 tombol 56px, posisi tetap */}
      <div className="grid grid-cols-3 gap-3">
        {isRunning ? (
          <Button variant="secondary" size="xl" onClick={onTogglePause} icon={<Pause className="size-5" aria-hidden="true" />} className="w-full px-2">
            Jeda
          </Button>
        ) : (
          <Button size="xl" onClick={onTogglePause} icon={<Play className="size-5" aria-hidden="true" />} className="w-full bg-success px-2 text-on-success">
            Lanjut
          </Button>
        )}
        <Button variant="secondary" size="xl" onClick={requestReset} icon={<RotateCcw className="size-5" aria-hidden="true" />} className="w-full px-2">
          Ulang
        </Button>
        <Button size="xl" onClick={requestFinish} icon={<Check className="size-5" aria-hidden="true" />} className="w-full px-2">
          Selesai
        </Button>
      </div>

      {/* Opsi sekunder: semua toggle di satu sheet */}
      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} title="Opsi latihan">
        <div className="flex flex-wrap gap-2">
          {onToggleGhostSkeleton && (
            <Toggle pressed={showGhostSkeleton} onPressedChange={() => onToggleGhostSkeleton()} label="Bayangan form" icon={<Ghost className="size-4" aria-hidden="true" />} />
          )}
          {onToggleMetronome && (
            <Toggle pressed={isMetronomeEnabled} onPressedChange={() => onToggleMetronome()} label="Metronom" icon={<BellRing className="size-4" aria-hidden="true" />} />
          )}
          {onToggleVoiceCommand && (
            <Toggle pressed={isVoiceCommandListening} onPressedChange={() => onToggleVoiceCommand()} label="Perintah suara" icon={<Mic className="size-4" aria-hidden="true" />} />
          )}
          <Toggle
            pressed={isVoiceEnabled}
            onPressedChange={() => onToggleVoice()}
            label="Suara pelatih"
            icon={isVoiceEnabled ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
          />
        </div>

        {onOpenReference && (
          <Button
            variant="secondary"
            className="mt-4 w-full"
            icon={<UserCheck className="size-4" aria-hidden="true" />}
            onClick={() => {
              setSheetOpen(false);
              onOpenReference();
            }}
          >
            Lihat contoh form
          </Button>
        )}

        <p className="mt-4 flex items-start gap-2 text-footnote text-text-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Tanpa sentuh: angkat tangan 1,5 detik untuk jeda atau lanjut. Silangkan tangan untuk selesai.
        </p>
      </Dialog>

      {/* Konfirmasi untuk tindakan yang merusak data sesi */}
      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'reset' ? 'Ulang sesi ini?' : 'Selesaikan sesi?'}
        description={
          confirm === 'reset'
            ? `${reps} rep di sesi ini akan dihapus.`
            : `Sesi dengan ${reps} rep akan disimpan ke riwayat.`
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Kembali
          </Button>
          <Button variant={confirm === 'reset' ? 'destructive' : 'primary'} onClick={runConfirmed}>
            {confirm === 'reset' ? 'Ulang' : 'Selesai'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
