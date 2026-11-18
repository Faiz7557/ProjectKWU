import type { RepEvent, TrackingResult } from '../../trackers/types';

export interface RepTempoResult {
  eccentricSec: number;
  bottomPauseSec: number;
  concentricSec: number;
  totalTUTSec: number;
  tempoFormat: string; // Misal: "3-1-1" (turun-tahan-naik)
  isRushed: boolean;
}

/** Batas bawah fase eksentrik (detik) di bawah ini rep dianggap terburu-buru. */
export const RUSHED_ECCENTRIC_SEC = 1.1;

/**
 * Pemetaan fase RepStateMachine ke fase otot:
 * - pushup/squat: sinyal turun = eksentrik (default).
 * - situp: sinyal dibalik, "descending" = torso naik (konsentrik), jadi fase ditukar.
 * - jumping jack: gerakan balistik, tempo eksentrik tidak relevan -> tidak pernah "terburu-buru".
 */
const INVERTED_EXERCISES = new Set(['situp']);
const BALLISTIC_EXERCISES = new Set(['jumping_jack']);

function fmt(ecc: number, bot: number, con: number): string {
  return `${Math.max(1, Math.round(ecc))}-${Math.round(bot)}-${Math.max(1, Math.round(con))}`;
}

/** Tempo satu rep dari RepEvent (sinyal sudut kontinu). Null untuk partial rep. */
export function tempoFromRepEvent(event: RepEvent, exerciseId?: string): RepTempoResult | null {
  if (event.kind !== 'rep') return null;
  const inverted = exerciseId !== undefined && INVERTED_EXERCISES.has(exerciseId);
  const ecc = (inverted ? event.conMs : event.eccMs) / 1000;
  const con = (inverted ? event.eccMs : event.conMs) / 1000;
  const bot = event.pauseMs / 1000;
  const total = event.totalMs / 1000;
  const ballistic = exerciseId !== undefined && BALLISTIC_EXERCISES.has(exerciseId);
  return {
    eccentricSec: Number(ecc.toFixed(2)),
    bottomPauseSec: Number(bot.toFixed(2)),
    concentricSec: Number(con.toFixed(2)),
    totalTUTSec: Number(total.toFixed(2)),
    tempoFormat: fmt(ecc, bot, con),
    isRushed: !ballistic && ecc < RUSHED_ECCENTRIC_SEC,
  };
}

export interface TempoState {
  currentPhase: 'idle' | 'descending' | 'bottom' | 'ascending';
  lastRepTempo: RepTempoResult | null;
  /** Rata-rata tempo seluruh rep sesi ini (null bila belum ada rep). */
  averageTempo: RepTempoResult | null;
  totalTUTSec: number;
  averageTUTPerRep: number;
  rushedRepsCount: number;
  repsTimed: number;
}

/**
 * Akumulator tempo & Time Under Tension per sesi.
 * Membaca fase kontinu (TrackingResult.phase) dan RepEvent yang selesai (TrackingResult.lastRep),
 * bukan label state biner, sehingga durasi tiap fase nyata.
 */
export class TempoTracker {
  private lastRepTempo: RepTempoResult | null = null;
  private sumEcc = 0;
  private sumBot = 0;
  private sumCon = 0;
  private totalTUTSec = 0;
  private reps = 0;
  private rushed = 0;

  update(res: Pick<TrackingResult, 'phase' | 'lastRep'>, exerciseId?: string): TempoState {
    const tempo = res.lastRep ? tempoFromRepEvent(res.lastRep, exerciseId) : null;
    if (tempo) {
      this.lastRepTempo = tempo;
      this.reps++;
      this.sumEcc += tempo.eccentricSec;
      this.sumBot += tempo.bottomPauseSec;
      this.sumCon += tempo.concentricSec;
      this.totalTUTSec += tempo.totalTUTSec;
      if (tempo.isRushed) this.rushed++;
    }
    return this.state(res.phase);
  }

  private state(phase: TrackingResult['phase']): TempoState {
    const n = this.reps;
    const averageTempo: RepTempoResult | null =
      n > 0
        ? {
            eccentricSec: Number((this.sumEcc / n).toFixed(2)),
            bottomPauseSec: Number((this.sumBot / n).toFixed(2)),
            concentricSec: Number((this.sumCon / n).toFixed(2)),
            totalTUTSec: Number((this.totalTUTSec / n).toFixed(2)),
            tempoFormat: fmt(this.sumEcc / n, this.sumBot / n, this.sumCon / n),
            isRushed: this.rushed > n / 2,
          }
        : null;
    return {
      currentPhase: !phase || phase === 'top' ? 'idle' : phase,
      lastRepTempo: this.lastRepTempo,
      averageTempo,
      totalTUTSec: Number(this.totalTUTSec.toFixed(1)),
      averageTUTPerRep: averageTempo ? Number(averageTempo.totalTUTSec.toFixed(1)) : 0,
      rushedRepsCount: this.rushed,
      repsTimed: n,
    };
  }

  reset(): void {
    this.lastRepTempo = null;
    this.sumEcc = this.sumBot = this.sumCon = this.totalTUTSec = 0;
    this.reps = this.rushed = 0;
  }
}
