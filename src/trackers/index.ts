import type { ExerciseTracker, ExerciseConfig } from './types';
import { PushupTracker } from './pushup-tracker';
import { SquatTracker } from './squat-tracker';
import { SitupTracker } from './situp-tracker';
import { JumpingJackTracker } from './jumping-jack-tracker';
import { PlankTracker } from './plank-tracker';

const TRACKER_REGISTRY: Record<string, () => ExerciseTracker> = {
  pushup: () => new PushupTracker(),
  squat: () => new SquatTracker(),
  situp: () => new SitupTracker(),
  jumping_jack: () => new JumpingJackTracker(),
  plank: () => new PlankTracker(),
};

/**
 * Factory untuk membuat instance tracker berdasarkan ID gerakan
 */
export function createTracker(exerciseId: string): ExerciseTracker {
  const factory = TRACKER_REGISTRY[exerciseId];
  if (!factory) {
    throw new Error(
      `Exercise tracker "${exerciseId}" tidak ditemukan. Pilihan: ${Object.keys(TRACKER_REGISTRY).join(', ')}`
    );
  }
  return factory();
}

/**
 * Mendapatkan daftar seluruh konfigurasi latihan yang tersedia
 */
export function getAllExerciseConfigs(): ExerciseConfig[] {
  return Object.values(TRACKER_REGISTRY).map(factory => factory().config);
}

export {
  PushupTracker,
  SquatTracker,
  SitupTracker,
  JumpingJackTracker,
  PlankTracker,
};
export type {
  ExerciseTracker,
  ExerciseConfig,
  TrackingResult,
  NormalizedLandmark,
  SessionData,
  ExerciseType,
  CameraOrientation,
} from './types';
