import type {
  NormalizedLandmark,
  ExerciseTracker,
  ExerciseConfig,
  TrackingResult,
  FormFault,
} from './types';
import { calculateAngle } from './base-tracker';

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;
const L_ANKLE = 27;
const R_ANKLE = 28;

// Sudut lurus garis bahu - pinggul - pergelangan kaki
const MIN_PLANK_ANGLE = 160;
const MAX_PLANK_ANGLE = 185;

export class PlankTracker implements ExerciseTracker {
  readonly config: ExerciseConfig = {
    id: 'plank',
    name: 'Plank',
    type: 'timer',
    cameraOrientation: 'side',
    instructions: [
      'Posisikan kamera dari SAMPING tubuh',
      'Lakukan posisi plank lurus dengan bertumpu pada lengan bawah',
      'Tahan posisi lurus dari kepala, pinggul, hingga tumit',
    ],
    requiredLandmarks: [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_ANKLE, R_ANKLE],
    minVisibility: 0.4,
  };

  private holdDurationSec: number = 0;
  private cleanHoldDurationSec: number = 0;
  private lastValidTimestamp: number | null = null;
  private isHolding: boolean = false;
  private faults: FormFault[] = [];
  private lastRecordedFaultTime: number = 0;

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number): TrackingResult {
    const minVis = this.config.minVisibility;
    const lShVis = landmarks[L_SHOULDER]?.visibility ?? 0;
    const lHipVis = landmarks[L_HIP]?.visibility ?? 0;
    const lAnkVis = landmarks[L_ANKLE]?.visibility ?? 0;

    const rShVis = landmarks[R_SHOULDER]?.visibility ?? 0;
    const rHipVis = landmarks[R_HIP]?.visibility ?? 0;
    const rAnkVis = landmarks[R_ANKLE]?.visibility ?? 0;

    const isLeftValid = lShVis >= minVis && lHipVis >= minVis && lAnkVis >= minVis;
    const isRightValid = rShVis >= minVis && rHipVis >= minVis && rAnkVis >= minVis;

    const leftVis = (lShVis + lHipVis + lAnkVis) / 3;
    const rightVis = (rShVis + rHipVis + rAnkVis) / 3;

    if (!isLeftValid && !isRightValid) {
      this.isHolding = false;
      this.lastValidTimestamp = null;
      return {
        state: 'pause',
        repCount: 0,
        cleanRepCount: 0,
        holdDuration: Number(this.holdDurationSec.toFixed(1)),
        feedback: 'Posisikan seluruh tubuh tampak dari samping',
        angles: {},
        confidence: Math.max(leftVis, rightVis),
        isTracking: false,
        hasFault: false,
        activeFault: null,
      };
    }

    let spineAngle: number;
    const angles: Record<string, number> = {};

    if (isLeftValid && isRightValid) {
      const leftAngle = calculateAngle(landmarks[L_SHOULDER], landmarks[L_HIP], landmarks[L_ANKLE]);
      const rightAngle = calculateAngle(landmarks[R_SHOULDER], landmarks[R_HIP], landmarks[R_ANKLE]);
      angles.leftSpine = leftAngle;
      angles.rightSpine = rightAngle;
      spineAngle = (leftAngle + rightAngle) / 2;
    } else if (isLeftValid) {
      spineAngle = calculateAngle(landmarks[L_SHOULDER], landmarks[L_HIP], landmarks[L_ANKLE]);
      angles.leftSpine = spineAngle;
    } else {
      spineAngle = calculateAngle(landmarks[R_SHOULDER], landmarks[R_HIP], landmarks[R_ANKLE]);
      angles.rightSpine = spineAngle;
    }

    const isGoodForm = spineAngle >= MIN_PLANK_ANGLE && spineAngle <= MAX_PLANK_ANGLE;
    let activeFault: FormFault | null = null;
    let feedback: string | undefined;

    if (isGoodForm) {
      if (this.lastValidTimestamp !== null) {
        const delta = Math.max(0, (timestamp - this.lastValidTimestamp) / 1000);
        if (delta <= 2.0) {
          this.holdDurationSec += delta;
          this.cleanHoldDurationSec += delta;
        }
      }
      this.lastValidTimestamp = timestamp;
      this.isHolding = true;
      feedback = 'Postur lurus sempurna! Tahan posisi...';
    } else {
      this.isHolding = false;
      this.lastValidTimestamp = null;

      if (spineAngle < MIN_PLANK_ANGLE) {
        activeFault = {
          id: 'pike_hips',
          name: 'Pinggul Terlalu Naik (Pike)',
          description: 'Turunkan pinggul agar sejajar lurus dengan garis punggung.',
          timestamp,
          severity: 'warning',
          bodyPart: 'hips',
        };
        feedback = activeFault.description;
      } else {
        activeFault = {
          id: 'sagging_hips',
          name: 'Pinggul Turun / Melengkung',
          description: 'Kencangkan otot inti (core) agar pinggul tidak merosot ke bawah.',
          timestamp,
          severity: 'warning',
          bodyPart: 'spine',
        };
        feedback = activeFault.description;
      }

      // Catat kesalahan jika jeda minimal 3 detik dari catatan sebelumnya
      if (timestamp - this.lastRecordedFaultTime > 3000) {
        this.faults.push(activeFault);
        this.lastRecordedFaultTime = timestamp;
      }
    }

    return {
      state: this.isHolding ? 'holding' : 'pause',
      repCount: 0,
      cleanRepCount: 0,
      holdDuration: Number(this.holdDurationSec.toFixed(1)),
      feedback,
      angles,
      confidence: Math.max(leftVis, rightVis),
      isTracking: true,
      hasFault: activeFault !== null,
      activeFault,
    };
  }

  getFaults(): FormFault[] {
    return this.faults;
  }

  getCleanRepCount(): number {
    return Math.round(this.cleanHoldDurationSec);
  }

  reset(): void {
    this.holdDurationSec = 0;
    this.cleanHoldDurationSec = 0;
    this.lastValidTimestamp = null;
    this.isHolding = false;
    this.faults = [];
    this.lastRecordedFaultTime = 0;
  }
}
