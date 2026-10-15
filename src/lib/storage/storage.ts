/**
 * Satu pintu untuk localStorage: semua key terpusat di sini + versi skema.
 * Nilai key tidak diubah dari versi sebelumnya agar data pengguna lama tetap terbaca.
 */

export const STORAGE_KEYS = {
  workoutHistory: 'smartfit_workout_history',
  gamification: 'smartfit_gamification',
  customRoutines: 'smartfit_custom_routines',
  calibration: 'smartfit_calibration',
  schemaVersion: 'smartfit_schema_version',
} as const;

export const STORAGE_SCHEMA_VERSION = 2;

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`Gagal menyimpan "${key}" ke localStorage:`, e);
    return false;
  }
}

/**
 * Migrasi skema ringan. Dipanggil sebelum membaca state gamifikasi.
 * v1 -> v2: gamifikasi mendapat counter kumulatif (lihat streak.ts).
 */
export function migrateStorage(): void {
  if (typeof window === 'undefined') return;
  const version = readJson<number>(STORAGE_KEYS.schemaVersion, 1);
  if (version >= STORAGE_SCHEMA_VERSION) return;

  const gamification = readJson<Record<string, unknown> | null>(STORAGE_KEYS.gamification, null);
  if (gamification && !gamification.stats) {
    gamification.stats = { totalSessions: 0, totalReps: 0, exercises: [] };
    writeJson(STORAGE_KEYS.gamification, gamification);
  }

  writeJson(STORAGE_KEYS.schemaVersion, STORAGE_SCHEMA_VERSION);
}
