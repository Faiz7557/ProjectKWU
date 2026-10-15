'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { AlertTriangle, CheckCircle2, FileDown, History, Lightbulb, RotateCcw } from 'lucide-react';
import type { ExerciseConfig } from '@/trackers/types';
import { ShareButton } from '@/components/workout/ShareButton';
import { generateWorkoutPDFReport } from '@/lib/reporting/pdf-generator';
import { Button } from '@/components/ui/Button';
import { Card, Stat } from '@/components/ui/Surfaces';

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
  /** Undefined = belum ada data. Tampil "—", bukan angka karangan (UI_UX_BRIEF §2.5 #29). */
  formScore?: number;
  symmetryScore?: number;
  tempoRatio?: string;
  avgTutSec?: number;
  caloriesBurned?: number;
  faultsSummary?: FaultSummaryItem[];
  /** Konfeti hanya saat target tercapai atau ada pencapaian baru. */
  celebrate?: boolean;
  onRestart: () => void;
  onSave?: () => Promise<void>;
}

const COACH_TIPS: Record<string, string> = {
  pushup: 'Kunci otot perut dan pantat seperti posisi plank agar pinggul tidak turun mendahului dada.',
  squat: 'Arahkan pinggul ke belakang seperti menduduki kursi dan jaga pandangan tetap ke depan.',
  situp: 'Angkat tubuh dengan kontraksi otot perut, bukan dengan menarik leher ke depan.',
  jumping_jack: 'Jaga ritme agar tangan dan kaki membuka serta menutup bersamaan.',
  plank: 'Bernapas teratur dan dorong lantai menjauh dari bahu untuk menstabilkan tulang belikat.',
};

const formatMinSec = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m} mnt ${s} dtk` : `${s} dtk`;
};

export function SessionSummary({
  config,
  reps,
  cleanReps,
  holdDurationSec,
  sessionDurationSec,
  formScore,
  symmetryScore,
  tempoRatio,
  avgTutSec,
  caloriesBurned = 0,
  faultsSummary = [],
  celebrate = false,
  onRestart,
}: SessionSummaryProps) {
  const isTimer = config.type === 'timer';
  const kcal = caloriesBurned > 0 ? caloriesBurned : Math.max(1, Math.round(sessionDurationSec * 0.14));
  const pace = sessionDurationSec > 0 && !isTimer ? ((reps / sessionDurationSec) * 60).toFixed(1) : null;
  const coachTip = COACH_TIPS[config.id] || 'Lakukan pemanasan dan pendinginan setiap kali berlatih.';
  const cleanPct = cleanReps !== undefined && reps > 0 ? (cleanReps / reps) * 100 : null;

  useEffect(() => {
    if (!celebrate) return;
    try {
      confetti({ particleCount: 85, spread: 75, origin: { y: 0.6 }, disableForReducedMotion: true });
    } catch {
      // Konfeti hanya dekorasi; abaikan kegagalan
    }
  }, [celebrate]);

  return (
    <article className="mx-auto w-full max-w-lg space-y-5 text-center animate-enter">
      <header className="space-y-3">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-9" aria-hidden="true" />
        </span>
        <p className="text-caption font-semibold uppercase tracking-wide text-accent-text">Latihan selesai</p>
        <h2 className="text-title-1 text-text">{config.name}</h2>
      </header>

      <Card className="grid grid-cols-2 gap-5 text-left">
        <Stat label={isTimer ? 'Waktu tahan' : 'Repetisi'} value={isTimer ? formatMinSec(holdDurationSec) : reps} tone="reps" size="l" />
        <Stat label="Durasi" value={formatMinSec(sessionDurationSec)} size="m" />
        <Stat label="Form" value={formScore ?? null} unit={formScore !== undefined ? '%' : undefined} tone="form" />
        <Stat label="Simetri" value={symmetryScore ?? null} unit={symmetryScore !== undefined ? '%' : undefined} tone="sym" />
      </Card>

      {cleanPct !== null && (
        <Card className="space-y-2 text-left">
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${cleanReps} rep bersih, ${reps - (cleanReps ?? 0)} perlu perbaikan`}>
            <div className="h-full bg-success" style={{ width: `${cleanPct}%` }} />
            <div className="h-full bg-danger" style={{ width: `${100 - cleanPct}%` }} />
          </div>
          <p className="text-footnote text-text-2">
            <span className="num font-semibold text-success">{cleanReps}</span> rep bersih ·{' '}
            <span className="num font-semibold text-danger">{reps - (cleanReps ?? 0)}</span> perlu perbaikan
          </p>
        </Card>
      )}

      <Card className="flex items-center justify-between gap-4 text-left">
        <Stat label="Estimasi kalori*" value={kcal} unit="kkal" tone="kcal" />
        {tempoRatio && (
          <div className="text-right">
            <p className="text-caption text-text-3">Ritme tempo</p>
            <p className="num text-subhead font-semibold text-text">{tempoRatio}</p>
            {avgTutSec !== undefined && <p className="num text-caption text-text-3">{avgTutSec.toFixed(1)} dtk per rep</p>}
          </div>
        )}
      </Card>
      <p className="text-caption text-text-3">*Perkiraan, bukan ukuran medis.{pace && ` Kecepatan ${pace} rep per menit.`}</p>

      {/* Analisis form */}
      <Card className="space-y-3 text-left">
        <h3 className="text-headline text-text">Analisis form</h3>
        {faultsSummary.length === 0 ? (
          <div className="flex items-start gap-3 rounded-md bg-success-soft p-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-subhead font-semibold text-text">Form bersih</p>
              <p className="text-footnote text-text-2">Tidak ada kesalahan berarti yang terdeteksi di sesi ini.</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {faultsSummary.map((fault, i) => (
              <li key={i} className="flex items-start gap-3 rounded-md bg-danger-soft p-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-subhead font-semibold text-text">
                    {fault.name} <span className="num text-text-2">({fault.count}x)</span>
                  </p>
                  <p className="text-footnote text-text-2">{fault.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-start gap-3 rounded-md bg-accent-soft p-3">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden="true" />
          <div>
            <p className="text-subhead font-semibold text-accent-text">Saran pelatih</p>
            <p className="text-footnote text-text">{coachTip}</p>
          </div>
        </div>
      </Card>

      {/* Aksi: satu primary, satu secondary, sisanya tersier */}
      <div className="space-y-3 pt-1">
        <Button href="/workout" size="xl" className="w-full">
          Selesai
        </Button>
        <ShareButton
          data={{
            exerciseName: config.name,
            reps,
            cleanReps,
            holdDurationSec,
            sessionDurationSec,
            formScore,
            caloriesBurned: kcal,
          }}
        />
        <div className="grid grid-cols-3 gap-2">
          <Button variant="tertiary" size="md" onClick={onRestart} icon={<RotateCcw className="size-4" aria-hidden="true" />} className="px-2">
            Ulangi
          </Button>
          <Button variant="tertiary" size="md" href="/history" icon={<History className="size-4" aria-hidden="true" />} className="px-2">
            Riwayat
          </Button>
          <Button
            variant="tertiary"
            size="md"
            className="px-2"
            icon={<FileDown className="size-4" aria-hidden="true" />}
            onClick={() =>
              generateWorkoutPDFReport({
                exerciseName: config.name,
                totalReps: reps,
                cleanReps,
                holdDurationSec,
                sessionDurationSec,
                caloriesBurned: kcal,
                formScore,
                symmetryScore,
                faultsSummary,
                tempoRatio,
                avgTutSec,
                coachAdvice: coachTip,
              })
            }
          >
            PDF
          </Button>
        </div>
      </div>
    </article>
  );
}
