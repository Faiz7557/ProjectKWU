import type {
  NormalizedLandmark,
  ExerciseTracker,
  ExerciseConfig,
  TrackingResult,
  FormFault,
} from './types';
import { calculateAngle, distance2D, checkLandmarkVisibility } from './base-tracker';

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;
const L_ANKLE = 27;
const R_ANKLE = 28;

const ARM_ANGLE_OPEN = 130;    // Lengan diangkat tinggi (> 130°)
const ARM_ANGLE_CLOSED = 60;   // Lengan di samping badan (< 60°)

const FEET_RATIO_OPEN = 1.5;   // Lebar kaki > 1.5× lebar bahu
const FEET_RATIO_CLOSED = 1.1; // Kaki merapat < 1.1× lebar bahu

export class JumpingJackTracker implements ExerciseTracker {
  readonly config: ExerciseConfig = {
    id: 'jumping_jack',
    name: 'Jumping Jack',
    type: 'counter',
    cameraOrientation: 'front',
    instructions: [
      'Posisikan kamera dari DEPAN tubuh',
      'Pastikan seluruh tubuh dari kepala hingga kaki tampak di layar',
      'Mulai dari posisi berdiri tegak dengan tangan di samping paha',
    ],
    requiredLandmarks: [
      L_SHOULDER, R_SHOULDER,
      L_WRIST, R_WRIST,
      L_HIP, R_HIP,
      L_ANKLE, R_ANKLE,
    ],
    minVisibility: 0.45,
  };

  private state: 'closed' | 'open' = 'closed';
  private repCount: number = 0;
  private cleanRepCount: number = 0;
  private faults: FormFault[] = [];
  private currentRepHasFault: boolean = false;

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number): TrackingResult {
    const { isVisible, avgVisibility } = checkLandmarkVisibility(
      landmarks,
      this.config.requiredLandmarks,
      this.config.minVisibility
    );

    if (!isVisible) {
      return {
        state: this.state,
        repCount: this.repCount,
        cleanRepCount: this.cleanRepCount,
        feedback: 'Posisikan seluruh tubuh tampak dari depan',
        angles: {},
        confidence: avgVisibility,
        isTracking: false,
        hasFault: false,
        activeFault: null,
      };
    }

    // 1. Sudut tangan terhadap torso (Hip - Shoulder - Wrist)
    const leftArmAngle = calculateAngle(landmarks[L_HIP], landmarks[L_SHOULDER], landmarks[L_WRIST]);
    const rightArmAngle = calculateAngle(landmarks[R_HIP], landmarks[R_SHOULDER], landmarks[R_WRIST]);
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;

    // 2. Rasio jarak pergelangan kaki terhadap lebar bahu
    const shoulderWidth = distance2D(landmarks[L_SHOULDER], landmarks[R_SHOULDER]);
    const ankleDistance = distance2D(landmarks[L_ANKLE], landmarks[R_ANKLE]);
    const feetRatio = shoulderWidth > 1e-4 ? ankleDistance / shoulderWidth : 0;

    let activeFault: FormFault | null = null;

    // ── ANALISIS KESALAHAN JUMPING JACK ──
    // Asimetri lengan (satu tangan tertinggal)
    if (Math.abs(leftArmAngle - rightArmAngle) > 35) {
      activeFault = {
        id: 'asymmetric_arms',
        name: 'Lengan Tidak Simetris',
        description: 'Angkat kedua tangan secara seimbang bersamaan.',
        timestamp,
        repNumber: this.repCount + 1,
        severity: 'warning',
        bodyPart: 'arms',
      };
      this.currentRepHasFault = true;
    }

    const isArmOpen = avgArmAngle >= ARM_ANGLE_OPEN;
    const isFeetOpen = feetRatio >= FEET_RATIO_OPEN;

    const isArmClosed = avgArmAngle <= ARM_ANGLE_CLOSED;
    const isFeetClosed = feetRatio <= FEET_RATIO_CLOSED;

    let feedback: string | undefined;

    if (isArmOpen && isFeetOpen) {
      if (this.state !== 'open') {
        this.state = 'open';
      }
      feedback = activeFault ? activeFault.description : 'Bagus! Lompat rapatkan kembali';
    } else if (isArmClosed && isFeetClosed) {
      if (this.state === 'open') {
        this.repCount++;

        if (this.currentRepHasFault) {
          if (activeFault) {
            this.faults.push(activeFault);
          }
        } else {
          this.cleanRepCount++;
        }

        this.state = 'closed';
        this.currentRepHasFault = false;
        feedback = activeFault ? `Rep ${this.repCount}: ${activeFault.name}` : 'Rep jumping jack sempurna!';
      }
    } else {
      if (this.state === 'closed') {
        if (!isArmOpen && isFeetOpen) {
          feedback = 'Angkat kedua tangan lebih tinggi ke atas kepala';
        } else if (isArmOpen && !isFeetOpen) {
          feedback = 'Buka kedua kaki lebih lebar saat melompat';
        } else {
          feedback = 'Lompat buka tangan dan kaki bersamaan';
        }
      } else {
        feedback = 'Rapatkan tangan dan kaki kembali ke posisi awal';
      }
    }

    return {
      state: this.state,
      repCount: this.repCount,
      cleanRepCount: this.cleanRepCount,
      feedback,
      angles: {
        leftArm: leftArmAngle,
        rightArm: rightArmAngle,
        feetRatio: Number(feetRatio.toFixed(2)),
      },
      confidence: avgVisibility,
      isTracking: true,
      hasFault: activeFault !== null,
      activeFault,
    };
  }

  getFaults(): FormFault[] {
    return this.faults;
  }

  getCleanRepCount(): number {
    return this.cleanRepCount;
  }

  reset(): void {
    this.state = 'closed';
    this.repCount = 0;
    this.cleanRepCount = 0;
    this.faults = [];
    this.currentRepHasFault = false;
  }
}
