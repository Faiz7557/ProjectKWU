export interface ProgressionResult {
  suggestedTarget: number;
  difficulty: 'easy' | 'normal' | 'challenge';
  trend: 'up' | 'stable' | 'down';
  coachTip: string;
  avgFormScore: number;
  lastReps: number;
}

interface SavedSessionRecord {
  exercise: string;
  reps: number | null;
  holdDurationSec: number | null;
  formScore?: number;
  startedAt?: string;
  faultsSummary?: { name: string; count: number; description: string }[];
}

const DEFAULT_TARGETS: Record<string, number> = {
  pushup: 15,
  squat: 20,
  situp: 15,
  jumping_jack: 30,
  plank: 45, // detik
};

export function getExerciseProgression(exerciseId: string): ProgressionResult {
  const defaultTarget = DEFAULT_TARGETS[exerciseId] ?? 15;

  if (typeof window === 'undefined') {
    return {
      suggestedTarget: defaultTarget,
      difficulty: 'normal',
      trend: 'stable',
      coachTip: 'Fokus pada bentuk postur tubuh yang benar dan stabil.',
      avgFormScore: 90,
      lastReps: defaultTarget,
    };
  }

  try {
    const raw = localStorage.getItem('smartfit_workout_history');
    if (!raw) {
      return {
        suggestedTarget: defaultTarget,
        difficulty: 'normal',
        trend: 'stable',
        coachTip: 'Sesi perdana! Awali dengan ritme santai dan form ideal.',
        avgFormScore: 90,
        lastReps: 0,
      };
    }

    const allSessions: SavedSessionRecord[] = JSON.parse(raw);
    const exerciseSessions = allSessions
      .filter((s) => s.exercise === exerciseId)
      .slice(0, 5); // 5 sesi terbaru

    if (exerciseSessions.length === 0) {
      return {
        suggestedTarget: defaultTarget,
        difficulty: 'normal',
        trend: 'stable',
        coachTip: 'Mulai latihan untuk mengaktifkan target adaptif otomatis.',
        avgFormScore: 90,
        lastReps: 0,
      };
    }

    const isTimer = exerciseId === 'plank';
    const values = exerciseSessions.map((s) => (isTimer ? s.holdDurationSec ?? 30 : s.reps ?? 10));
    const scores = exerciseSessions.map((s) => s.formScore ?? 85);

    const avgVal = values.reduce((a, b) => a + b, 0) / values.length;
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const latestVal = values[0];

    // Cek tren
    let trend: 'up' | 'stable' | 'down' = 'stable';
    if (values.length >= 2) {
      if (values[0] > values[values.length - 1] * 1.1) {
        trend = 'up';
      } else if (values[0] < values[values.length - 1] * 0.9) {
        trend = 'down';
      }
    }

    // Evaluasi tingkat kesulitan & target
    if (avgScore >= 85 && trend !== 'down') {
      const boosted = Math.ceil(Math.max(avgVal * 1.12, latestVal + (isTimer ? 10 : 2)));
      return {
        suggestedTarget: boosted,
        difficulty: 'challenge',
        trend: 'up',
        coachTip: `Form Anda sangat solid (${avgScore}%)! Tantang diri dengan target ${boosted} ${
          isTimer ? 'detik' : 'rep'
        }.`,
        avgFormScore: avgScore,
        lastReps: latestVal,
      };
    } else if (avgScore < 72) {
      const relaxed = Math.max(isTimer ? 20 : 8, Math.floor(avgVal * 0.9));
      return {
        suggestedTarget: relaxed,
        difficulty: 'easy',
        trend: 'down',
        coachTip: `Prioritaskan kualitas gerakan di atas repetisi. Target ${relaxed} ${
          isTimer ? 'detik' : 'rep'
        } yang bersih.`,
        avgFormScore: avgScore,
        lastReps: latestVal,
      };
    } else {
      const maintained = Math.round(avgVal);
      return {
        suggestedTarget: maintained,
        difficulty: 'normal',
        trend,
        coachTip: `Pertahankan konsistensi postur pada target ${maintained} ${
          isTimer ? 'detik' : 'rep'
        }.`,
        avgFormScore: avgScore,
        lastReps: latestVal,
      };
    }
  } catch {
    return {
      suggestedTarget: defaultTarget,
      difficulty: 'normal',
      trend: 'stable',
      coachTip: 'Fokus pada bentuk postur tubuh yang benar dan stabil.',
      avgFormScore: 90,
      lastReps: defaultTarget,
    };
  }
}
