import { STORAGE_KEYS, readJson, writeJson } from '../lib/storage/storage';

/** Satu rep pemanasan: puncak (top) dan lembah (bottom) sinyal sudut. */
export interface RomSample {
  top: number;
  bottom: number;
}

interface CalibrationRecord {
  bottom: number;
  savedAt: string;
}

/** Batas biomekanik: ambang bawah tidak boleh di luar rentang ini walau ROM hasil kalibrasi aneh. */
const BOTTOM_LIMITS: Record<string, { min: number; max: number }> = {
  pushup: { min: 60, max: 110 },
  squat: { min: 70, max: 125 },
};

/** ROM di bawah ini dianggap gerakan tidak cukup untuk dikalibrasi. */
const MIN_ROM_DEG = 40;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Menghitung ambang bawah personal dari 2 rep pemanasan.
 * bottom = top - 0.75 * ROM, di-clamp ke batas biomekanik. Null bila data tidak memadai.
 */
export function computeBottomThreshold(exerciseId: string, samples: RomSample[]): number | null {
  const limits = BOTTOM_LIMITS[exerciseId];
  if (!limits || samples.length < 2) return null;

  const top = median(samples.map((s) => s.top));
  const low = median(samples.map((s) => s.bottom));
  const rom = top - low;
  if (rom < MIN_ROM_DEG) return null;

  const bottom = top - 0.75 * rom;
  return Math.min(limits.max, Math.max(limits.min, bottom));
}

/** Menyimpan hasil kalibrasi per latihan di localStorage. */
export function saveBottomThreshold(exerciseId: string, bottom: number): void {
  const all = readJson<Record<string, CalibrationRecord>>(STORAGE_KEYS.calibration, {});
  all[exerciseId] = { bottom, savedAt: new Date().toISOString() };
  writeJson(STORAGE_KEYS.calibration, all);
}

/** Ambang bawah hasil kalibrasi untuk latihan ini, atau undefined bila belum kalibrasi. */
export function loadBottomThreshold(exerciseId: string): number | undefined {
  const all = readJson<Record<string, CalibrationRecord>>(STORAGE_KEYS.calibration, {});
  const bottom = all[exerciseId]?.bottom;
  return typeof bottom === 'number' && Number.isFinite(bottom) ? bottom : undefined;
}
