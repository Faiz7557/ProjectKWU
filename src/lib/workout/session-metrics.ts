import type { FormFault } from '@/trackers/types';

/**
 * Nilai MET per gerakan, mengacu Compendium of Physical Activities (Ainsworth et al., 2011):
 * calisthenics berat (push-up, jumping jack) 8.0; squat/resistance 5.0;
 * calisthenics sedang (sit-up) 3.8; isometrik inti (plank) 3.8.
 */
export const MET_BY_EXERCISE: Record<string, number> = {
  pushup: 8.0,
  squat: 5.0,
  situp: 3.8,
  jumping_jack: 8.0,
  plank: 3.8,
};

/** Berat badan acuan bila profil pengguna belum ada. ponytail: ganti dengan input profil bila tersedia. */
export const DEFAULT_BODY_WEIGHT_KG = 60;

/** kkal = MET × 3.5 × berat(kg) / 200 × menit. Durasi = waktu aktif bergerak (tanpa jeda/istirahat). */
export function estimateCalories(
  exerciseId: string,
  activeSec: number,
  weightKg: number = DEFAULT_BODY_WEIGHT_KG
): number {
  const met = MET_BY_EXERCISE[exerciseId] ?? 5.0;
  return (met * 3.5 * weightKg) / 200 * (Math.max(0, activeSec) / 60);
}

export interface FaultSummaryItem {
  name: string;
  count: number;
  description: string;
}

/** Hitung frekuensi tiap jenis kesalahan (immutable; aman dipanggil berulang). */
export function summarizeFaults(faults: FormFault[]): FaultSummaryItem[] {
  const map = new Map<string, FaultSummaryItem>();
  for (const f of faults) {
    const prev = map.get(f.name);
    map.set(f.name, { name: f.name, description: f.description, count: (prev?.count ?? 0) + 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Sesi dianggap berisi latihan nyata bila ada rep atau waktu tahan. Sesi kosong tidak memberi streak/XP. */
export function hasWork(reps: number | null, holdSec: number | null): boolean {
  return (reps ?? 0) > 0 || (holdSec ?? 0) >= 1;
}
