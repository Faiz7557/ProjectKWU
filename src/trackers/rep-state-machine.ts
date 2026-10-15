import type { FormFault, RepEvent } from './types';

export interface RepStateConfig {
  /** Nilai sinyal saat posisi awal/atas. Rep dimulai dan selesai di sini. */
  top: number;
  /** Nilai sinyal saat posisi bawah. Mencapainya (<=) membuat rep "lengkap". */
  bottom: number;
  /** Selisih dari top agar gerakan dianggap mulai turun. */
  startDescentDelta: number;
  /** Histeresis keluar dari bottom (nilai harus naik melewati bottom + ini). */
  bottomHysteresis: number;
  /** Kondisi harus bertahan selama ini sebelum transisi fase dikonfirmasi (anti-noise). */
  minDwellMs: number;
  /** Rep lebih cepat dari ini ditolak sebagai noise. */
  minRepMs: number;
  /** Rep lebih lambat dari ini ditandai tooSlow (tetap dihitung). */
  maxRepMs: number;
}

export const DEFAULT_REP_CONFIG: Omit<RepStateConfig, 'top' | 'bottom'> = {
  startDescentDelta: 10,
  bottomHysteresis: 8,
  minDwellMs: 80,
  minRepMs: 400,
  maxRepMs: 8000,
};

type Phase = 'top' | 'descending' | 'bottom' | 'ascending';

/**
 * State machine generik hitung-repetisi untuk sinyal 1D (sudut, dsb.).
 * Alur: TOP -> DESCENDING -> BOTTOM -> ASCENDING -> TOP.
 * - Kembali ke TOP tanpa pernah BOTTOM menghasilkan partial rep (tidak dihitung rep).
 * - Setiap transisi harus bertahan `minDwellMs` (debounce temporal).
 * - Durasi fase diukur dari timestamp, sehingga tempo nyata tersedia.
 */
export class RepStateMachine {
  private phase: Phase = 'top';
  private candidate: Phase | null = null;
  private candidateSince = 0;

  private descStart = 0;
  private bottomStart = 0;
  private ascStart = 0;
  private extremum = Infinity;
  private reachedBottom = false;

  readonly config: RepStateConfig;

  constructor(config: Pick<RepStateConfig, 'top' | 'bottom'> & Partial<RepStateConfig>) {
    this.config = { ...DEFAULT_REP_CONFIG, ...config };
  }

  get currentPhase(): Phase {
    return this.phase;
  }

  /**
   * Memasukkan satu sampel sinyal. Mengembalikan RepEvent jika rep (atau partial) selesai.
   * @param value nilai sinyal
   * @param t timestamp dalam milidetik
   */
  update(value: number, t: number): RepEvent | null {
    const c = this.config;
    const desired = this.desiredPhase(value);

    if (desired === null) {
      this.candidate = null;
      return null;
    }
    if (desired !== this.candidate) {
      this.candidate = desired;
      this.candidateSince = t;
      return null;
    }
    if (t - this.candidateSince < c.minDwellMs) return null;

    const from = this.phase;
    this.phase = desired;
    this.candidate = null;

    if (desired === 'descending') {
      this.descStart = t;
      this.extremum = value;
      this.reachedBottom = false;
      return null;
    }

    this.extremum = Math.min(this.extremum, value);

    if (desired === 'bottom') {
      if (!this.reachedBottom) {
        this.reachedBottom = true;
        this.bottomStart = t;
      }
      return null;
    }

    if (desired === 'ascending') {
      this.ascStart = t;
      return null;
    }

    // desired === 'top': rep selesai (atau partial bila tidak pernah bottom)
    return this.finishRep(from, t);
  }

  /** Membatalkan rep yang sedang berjalan (mis. tubuh hilang dari frame). Tidak menghasilkan event. */
  abort(): void {
    this.phase = 'top';
    this.candidate = null;
    this.resetRep();
  }

  private desiredPhase(value: number): Phase | null {
    const c = this.config;
    switch (this.phase) {
      case 'top':
        return value < c.top - c.startDescentDelta ? 'descending' : null;
      case 'descending':
        if (value <= c.bottom) return 'bottom';
        return value >= c.top ? 'top' : null;
      case 'bottom':
        return value > c.bottom + c.bottomHysteresis ? 'ascending' : null;
      case 'ascending':
        if (value <= c.bottom) return 'bottom';
        return value >= c.top ? 'top' : null;
    }
  }

  private finishRep(from: Phase, t: number): RepEvent | null {
    const c = this.config;
    const totalMs = t - this.descStart;

    if (!this.reachedBottom) {
      // Turun lalu naik lagi tanpa mencapai bottom: partial rep bila gerakannya nyata.
      const moved = this.extremum <= c.top - 2 * c.startDescentDelta;
      const event: RepEvent | null = moved
        ? {
            kind: 'partial',
            startedAt: this.descStart,
            endedAt: t,
            eccMs: totalMs,
            pauseMs: 0,
            conMs: 0,
            totalMs,
            extremum: this.extremum,
            tooSlow: totalMs > c.maxRepMs,
          }
        : null;
      this.resetRep();
      return event;
    }

    const conMs = from === 'ascending' ? t - this.ascStart : 0;
    const event: RepEvent | null =
      totalMs < c.minRepMs
        ? null // noise: terlalu cepat, tidak dihitung
        : {
            kind: 'rep',
            startedAt: this.descStart,
            endedAt: t,
            eccMs: this.bottomStart - this.descStart,
            pauseMs: this.ascStart - this.bottomStart,
            conMs,
            totalMs,
            extremum: this.extremum,
            tooSlow: totalMs > c.maxRepMs,
          };
    this.resetRep();
    return event;
  }

  private resetRep(): void {
    this.extremum = Infinity;
    this.reachedBottom = false;
  }
}

/** Mengembalikan segala kondisi tubuh hilang lebih lama dari ini ke posisi awal (tanpa event). */
export const LOST_RESET_MS = 300;

export interface RepUpdate {
  event: RepEvent | null;
  /** Fault milik rep yang baru selesai (kosong jika tidak ada rep selesai). */
  faults: FormFault[];
}

/**
 * Akumulator hitungan di atas RepStateMachine: rep, rep bersih, fault per-rep (deduplikasi),
 * dan reset saat tubuh hilang. Dipakai bersama oleh semua tracker counter.
 */
export class RepAccumulator {
  repCount = 0;
  cleanRepCount = 0;
  readonly faults: FormFault[] = [];
  private readonly repFaults = new Map<string, FormFault>();
  private lostSince: number | null = null;

  constructor(readonly rsm: RepStateMachine) {}

  /** Dipanggil saat landmark valid (tubuh terlihat). */
  markVisible(): void {
    this.lostSince = null;
  }

  /** Dipanggil saat landmark tidak valid. Setelah LOST_RESET_MS, rep yang berjalan dibatalkan. */
  markLost(t: number): void {
    if (this.lostSince === null) this.lostSince = t;
    if (t - this.lostSince > LOST_RESET_MS) {
      this.rsm.abort();
      this.repFaults.clear();
    }
  }

  /**
   * @param value sinyal utama (mis. sudut siku)
   * @param t timestamp (ms)
   * @param observed fault yang terlihat pada frame ini
   * @param partialFault fault yang dicatat bila gerakan selesai sebagai partial rep
   */
  update(value: number, t: number, observed: FormFault[], partialFault?: FormFault): RepUpdate {
    for (const f of observed) {
      if (!this.repFaults.has(f.id)) this.repFaults.set(f.id, { ...f, repNumber: this.repCount + 1 });
    }

    const event = this.rsm.update(value, t);
    if (!event) return { event: null, faults: [] };

    const closed = [...this.repFaults.values()];
    this.repFaults.clear();

    if (event.kind === 'rep') {
      this.repCount++;
      if (closed.length === 0) this.cleanRepCount++;
    } else if (partialFault) {
      closed.push({ ...partialFault, repNumber: this.repCount + 1 });
    }

    for (const f of closed) this.faults.push(f);
    return { event, faults: closed };
  }

  /** Skor form = rep bersih / rep total. Null bila belum ada rep. Tanpa lantai buatan. */
  formScore(): number | null {
    return this.repCount > 0 ? Math.round((this.cleanRepCount / this.repCount) * 100) : null;
  }

  reset(): void {
    this.rsm.abort();
    this.repCount = 0;
    this.cleanRepCount = 0;
    this.faults.length = 0;
    this.repFaults.clear();
    this.lostSince = null;
  }
}
