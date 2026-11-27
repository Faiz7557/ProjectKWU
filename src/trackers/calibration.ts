import { STORAGE_KEYS, readJson, writeJson } from '../lib/storage/storage';
import type { ExerciseTracker } from './types';

/** Satu rep: puncak (top) dan lembah (bottom) sinyal sudut. */
export interface RomSample {
  top: number;
  bottom: number;
}

interface CalibrationRecord {
  bottom: number;
  /** Ambang atas personal. Opsional: record lama hanya punya bottom. */
  top?: number;
  savedAt: string;
}

export interface Calibration {
  bottom?: number;
  top?: number;
}

/** Batas biomekanik: ambang tidak boleh di luar rentang ini walau ROM hasil kalibrasi aneh. */
const BOTTOM_LIMITS: Record<string, { min: number; max: number }> = {
  pushup: { min: 60, max: 110 },
  squat: { min: 70, max: 125 },
};

/**
 * Ambang atas hanya boleh turun dari default tracker (pushup 150, squat 160), tidak pernah naik:
 * ambang atas yang lebih tinggi dari lockout pengguna adalah penyebab rep "stuck" di bawah.
 */
const TOP_LIMITS: Record<string, { min: number; max: number }> = {
  pushup: { min: 140, max: 150 },
  squat: { min: 150, max: 160 },
};

/** ROM di bawah ini dianggap gerakan tidak cukup untuk dikalibrasi. */
const MIN_ROM_DEG = 40;

/** Jumlah rep penuh minimum sebelum hasil kalibrasi disimpan. */
export const MIN_CALIBRATION_REPS = 2;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const clamp = (v: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, v));

/** Median top/bottom dan ROM, atau null bila data tidak memadai. */
function rom(samples: RomSample[]): { top: number; rom: number } | null {
  if (samples.length < MIN_CALIBRATION_REPS) return null;
  const top = median(samples.map((s) => s.top));
  const low = median(samples.map((s) => s.bottom));
  return top - low >= MIN_ROM_DEG ? { top, rom: top - low } : null;
}

/**
 * Ambang bawah personal dari rep penuh.
 * bottom = top - 0.75 * ROM, di-clamp ke batas biomekanik. Null bila data tidak memadai.
 */
export function computeBottomThreshold(exerciseId: string, samples: RomSample[]): number | null {
  const limits = BOTTOM_LIMITS[exerciseId];
  const r = rom(samples);
  return limits && r ? clamp(r.top - 0.75 * r.rom, limits) : null;
}

/** Ambang atas personal: top - 0.1 * ROM (sedikit di bawah lockout nyata), di-clamp. */
export function computeTopThreshold(exerciseId: string, samples: RomSample[]): number | null {
  const limits = TOP_LIMITS[exerciseId];
  const r = rom(samples);
  return limits && r ? clamp(r.top - 0.1 * r.rom, limits) : null;
}

/** Menyimpan hasil kalibrasi per latihan di localStorage. */
export function saveCalibration(exerciseId: string, bottom: number, top?: number): void {
  const all = readJson<Record<string, CalibrationRecord>>(STORAGE_KEYS.calibration, {});
  all[exerciseId] = { bottom, ...(top !== undefined && { top }), savedAt: new Date().toISOString() };
  writeJson(STORAGE_KEYS.calibration, all);
}

const finite = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/** Ambang hasil kalibrasi untuk latihan ini (kosong bila belum pernah kalibrasi). */
export function loadCalibration(exerciseId: string): Calibration {
  const rec = readJson<Record<string, CalibrationRecord>>(STORAGE_KEYS.calibration, {})[exerciseId];
  return { bottom: finite(rec?.bottom), top: finite(rec?.top) };
}

/**
 * Kalibrasi otomatis: setelah sesi, ROM dari rep penuh yang terhitung disimpan untuk sesi berikutnya.
 * Hanya rep penuh yang dipakai (bukan partial), jadi standar kedalaman tidak bisa "dilatih" turun oleh half rep.
 * Mengembalikan true bila kalibrasi tersimpan.
 */
export function persistCalibration(tracker: ExerciseTracker): boolean {
  const id = tracker.config.id;
  const samples = tracker.getRomSamples?.() ?? [];
  const bottom = computeBottomThreshold(id, samples);
  if (bottom === null) return false;
  saveCalibration(id, bottom, computeTopThreshold(id, samples) ?? undefined);
  return true;
}
