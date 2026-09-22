export interface RoutineStep {
  exerciseId: string;
  exerciseName: string;
  targetReps?: number;
  targetDurationSec?: number;
  restSecAfter: number; // Durasi istirahat setelah gerakan ini (detik)
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  description: string;
  level: 'Pemula' | 'Menengah' | 'Lanjutan';
  estimatedMinutes: number;
  steps: RoutineStep[];
}
