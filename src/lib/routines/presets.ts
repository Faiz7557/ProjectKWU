import { WorkoutRoutine, RoutineStep } from './types';
export type { WorkoutRoutine, RoutineStep };

export const WORKOUT_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'full-body-burn',
    name: 'Full Body Blast',
    description: 'Rangkaian sirkuit menyeluruh untuk melatih kekuatan dada, paha, inti perut, dan kardio.',
    level: 'Menengah',
    estimatedMinutes: 8,
    steps: [
      {
        exerciseId: 'pushup',
        exerciseName: 'Push-up',
        targetReps: 12,
        restSecAfter: 30,
      },
      {
        exerciseId: 'squat',
        exerciseName: 'Squat',
        targetReps: 15,
        restSecAfter: 30,
      },
      {
        exerciseId: 'plank',
        exerciseName: 'Plank Hold',
        targetDurationSec: 35,
        restSecAfter: 30,
      },
      {
        exerciseId: 'jumping_jack',
        exerciseName: 'Jumping Jack',
        targetReps: 25,
        restSecAfter: 0,
      },
    ],
  },
  {
    id: 'upper-body-core',
    name: 'Upper Body & Core',
    description: 'Fokus melatih otot dada, lengan, punggung, serta penguatan stabilitas perut (abs).',
    level: 'Pemula',
    estimatedMinutes: 6,
    steps: [
      {
        exerciseId: 'pushup',
        exerciseName: 'Push-up',
        targetReps: 10,
        restSecAfter: 25,
      },
      {
        exerciseId: 'situp',
        exerciseName: 'Sit-up',
        targetReps: 12,
        restSecAfter: 25,
      },
      {
        exerciseId: 'plank',
        exerciseName: 'Plank Hold',
        targetDurationSec: 40,
        restSecAfter: 0,
      },
    ],
  },
  {
    id: 'hiit-cardio',
    name: 'Quick HIIT Fat Burn',
    description: 'Sirkuit intensitas tinggi untuk memicu pembakaran kalori maksimal dalam waktu singkat.',
    level: 'Lanjutan',
    estimatedMinutes: 7,
    steps: [
      {
        exerciseId: 'jumping_jack',
        exerciseName: 'Jumping Jack',
        targetReps: 35,
        restSecAfter: 20,
      },
      {
        exerciseId: 'squat',
        exerciseName: 'Speed Squat',
        targetReps: 20,
        restSecAfter: 20,
      },
      {
        exerciseId: 'jumping_jack',
        exerciseName: 'Jumping Jack Akhir',
        targetReps: 35,
        restSecAfter: 0,
      },
    ],
  },
];

const CUSTOM_ROUTINES_KEY = 'smartfit_custom_routines';

export function getCustomRoutines(): WorkoutRoutine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_ROUTINES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomRoutine(routine: WorkoutRoutine): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomRoutines();
    const updated = [routine, ...existing.filter((r) => r.id !== routine.id)];
    localStorage.setItem(CUSTOM_ROUTINES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Gagal menyimpan program sirkuit kustom:', e);
  }
}

export function deleteCustomRoutine(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomRoutines();
    const filtered = existing.filter((r) => r.id !== id);
    localStorage.setItem(CUSTOM_ROUTINES_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Gagal menghapus program sirkuit kustom:', e);
  }
}

export function getAllRoutines(): WorkoutRoutine[] {
  return [...getCustomRoutines(), ...WORKOUT_ROUTINES];
}

export function getRoutineById(id: string): WorkoutRoutine | undefined {
  const custom = getCustomRoutines().find((r) => r.id === id);
  if (custom) return custom;
  return WORKOUT_ROUTINES.find((r) => r.id === id);
}
