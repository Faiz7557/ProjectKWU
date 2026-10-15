import { z } from 'zod';

export const EXERCISE_IDS = ['pushup', 'squat', 'situp', 'jumping_jack', 'plank'] as const;

const MAX_DURATION_SEC = 86400;
const MAX_REPS = 1000;

/**
 * Batas wajar payload sesi (S6). Nilai di luar batas ditolak, bukan dipotong,
 * supaya klien yang rusak atau curang tidak diam-diam tersimpan.
 */
export const sessionPayloadSchema = z
  .object({
    clientSessionId: z.string().min(8).max(64).optional(),
    exercise: z.enum(EXERCISE_IDS),
    sessionDurationSec: z.number().min(0).max(MAX_DURATION_SEC),
    reps: z.number().int().min(0).max(MAX_REPS).nullable().optional(),
    cleanReps: z.number().int().min(0).max(MAX_REPS).nullable().optional(),
    holdDurationSec: z.number().min(0).max(MAX_DURATION_SEC).nullable().optional(),
    formScore: z.number().min(0).max(100).nullable().optional(),
    symmetryScore: z.number().min(0).max(100).nullable().optional(),
    calories: z.number().min(0).max(5000).nullable().optional(),
    faults: z
      .array(
        z.object({
          name: z.string().max(100),
          count: z.number().int().min(0).max(MAX_REPS),
          description: z.string().max(300).optional(),
        })
      )
      .max(20)
      .optional(),
    startedAt: z.string().datetime({ offset: true }).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((v) => v.cleanReps == null || v.reps == null || v.cleanReps <= v.reps, {
    message: 'cleanReps tidak boleh melebihi reps.',
    path: ['cleanReps'],
  });

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;
