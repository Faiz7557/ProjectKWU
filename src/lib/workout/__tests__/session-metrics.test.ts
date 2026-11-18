import { describe, it, expect } from 'vitest';
import { estimateCalories, summarizeFaults, hasWork } from '../session-metrics';
import { localDateKey } from '../../gamification/streak';
import type { FormFault } from '@/trackers/types';

describe('session metrics', () => {
  it('kalori MET: jumping jack 10 menit, 60 kg = 8.0 × 3.5 × 60 / 200 × 10 = 84 kkal', () => {
    expect(estimateCalories('jumping_jack', 600)).toBeCloseTo(84, 5);
  });

  it('kalori bergantung gerakan (plank < push-up pada durasi sama)', () => {
    expect(estimateCalories('plank', 60)).toBeLessThan(estimateCalories('pushup', 60));
    expect(estimateCalories('pushup', 0)).toBe(0);
  });

  it('summarizeFaults menghitung frekuensi tanpa memutasi input', () => {
    const f = (name: string): FormFault => ({ id: name, name, description: 'd', timestamp: 0, severity: 'warning' });
    const input = [f('A'), f('B'), f('A')];
    expect(summarizeFaults(input)).toEqual([
      { name: 'A', description: 'd', count: 2 },
      { name: 'B', description: 'd', count: 1 },
    ]);
    expect(input).toHaveLength(3);
  });

  it('hasWork: sesi kosong tidak dihitung', () => {
    expect(hasWork(0, null)).toBe(false);
    expect(hasWork(null, 0.4)).toBe(false);
    expect(hasWork(3, null)).toBe(true);
    expect(hasWork(null, 12)).toBe(true);
  });

  it('localDateKey memakai tanggal lokal, bukan UTC', () => {
    const d = new Date(2026, 0, 5, 0, 30); // 00:30 waktu lokal
    expect(localDateKey(d)).toBe('2026-01-05');
  });
});
