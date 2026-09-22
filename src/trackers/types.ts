export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/** Detail kesalahan form yang terdeteksi secara real-time */
export interface FormFault {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  repNumber?: number;
  severity: 'warning' | 'critical';
  bodyPart?: 'elbow' | 'knee' | 'spine' | 'hips' | 'arms' | 'feet';
}

/** Metrik asimetri bilateral kiri vs kanan */
export interface BilateralSymmetry {
  leftAngle: number;
  rightAngle: number;
  diffDegrees: number;
  balanceScore: number; // 0 - 100% (100% = seimbang sempurna)
  isImbalanced: boolean; // true jika selisih melewati batas aman
  imbalancedSide: 'left' | 'right' | 'balanced';
  jointName: string;
  feedbackMessage?: string;
}

/** Output hasil pemrosesan landmark per frame */
export interface TrackingResult {
  /** State terkini state machine: mis. "up" | "down" | "standing" | "squatting" | "holding" */
  state: string;

  /** Jumlah repetisi valid */
  repCount: number;

  /** Jumlah repetisi dengan postur bersih (clean form) */
  cleanRepCount: number;

  /** Durasi hold (detik) untuk latihan timer seperti plank */
  holdDuration?: number;

  /** Feedback form real-time untuk pengguna */
  feedback?: string;

  /** Kesalahan postur yang aktif pada frame ini (jika ada) */
  activeFault?: FormFault | null;

  /** Apakah frame ini memiliki kesalahan form */
  hasFault: boolean;

  /** Sudut-sudut yang dihitung (mis. leftElbow: 94) untuk overlay/debug */
  angles: Record<string, number>;

  /** Metrik asimetri bilateral tubuh (kiri vs kanan) */
  symmetry?: BilateralSymmetry | null;

  /** Rata-rata confidence/visibility keypoints yang dipakai (0 - 1) */
  confidence: number;

  /** Apakah subjek/landmark berhasil terdeteksi dengan confidence cukup */
  isTracking: boolean;
}

export type ExerciseType = 'counter' | 'timer';
export type CameraOrientation = 'side' | 'front';

/** Metadata konfigurasi per gerakan */
export interface ExerciseConfig {
  id: string;
  name: string;
  type: ExerciseType;
  cameraOrientation: CameraOrientation;
  instructions: string[];
  requiredLandmarks: number[];
  minVisibility: number;
}

/** Interface kontrak yang diimplementasikan seluruh exercise tracker */
export interface ExerciseTracker {
  readonly config: ExerciseConfig;

  /**
   * Memproses landmark yang sudah di-smooth dari 1 frame video.
   * @param landmarks Array 33 NormalizedLandmark MediaPipe BlazePose
   * @param timestamp Timestamp frame dalam milidetik (performance.now())
   */
  processLandmarks(
    landmarks: NormalizedLandmark[],
    timestamp: number
  ): TrackingResult;

  /** Mendapatkan daftar seluruh kesalahan yang terekam sepanjang sesi */
  getFaults(): FormFault[];

  /** Mendapatkan jumlah repetisi berpostur bersih */
  getCleanRepCount(): number;

  /** Reset status perhitungan dan state machine */
  reset(): void;
}

/** Format data ringkasan sesi latihan yang disimpan ke backend & history */
export interface SessionData {
  exercise: string;
  exerciseName?: string;
  reps: number | null;
  cleanReps?: number;
  holdDurationSec: number | null;
  sessionDurationSec: number;
  caloriesBurned?: number;
  formScore?: number;
  symmetryScore?: number;
  faultsSummary?: { name: string; count: number; description: string }[];
  startedAt: string;
  metadata?: Record<string, unknown>;
}
