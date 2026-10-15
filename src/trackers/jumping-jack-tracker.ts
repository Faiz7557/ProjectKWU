import type {
  NormalizedLandmark,
  ExerciseTracker,
  ExerciseConfig,
  TrackingResult,
  FormFault,
  FrameSize,
} from './types';
import {
  calculateAngle,
  checkLandmarkVisibility,
  distance2D,
  toPixelSpace,
  DEFAULT_FRAME,
} from './base-tracker';
import { RepStateMachine, RepAccumulator } from './rep-state-machine';

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;
const L_ANKLE = 27;
const R_ANKLE = 28;

// Sinyal = -(rata-rata sudut lengan). Tangan di samping ≈ 0-60° (top, nilai -60);
// tangan di atas kepala ≥ 130° (bottom, nilai -130).
const ARM_ANGLE_OPEN = 130;
const ARM_ANGLE_CLOSED = 60;
const ARM_ASYMMETRY_LIMIT = 35; // derajat selisih kiri-kanan
const FEET_RATIO_OPEN = 1.5;    // Lebar kaki > 1.5× lebar bahu

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

  private readonly acc = new RepAccumulator(
    new RepStateMachine({
      top: -ARM_ANGLE_CLOSED,
      bottom: -ARM_ANGLE_OPEN,
      startDescentDelta: 15,
    })
  );

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number, frame: FrameSize = DEFAULT_FRAME): TrackingResult {
    const { isVisible, avgVisibility } = checkLandmarkVisibility(
      landmarks,
      this.config.requiredLandmarks,
      this.config.minVisibility
    );

    if (!isVisible) {
      this.acc.markLost(timestamp);
      return {
        state: this.stateLabel(),
        repCount: this.acc.repCount,
        cleanRepCount: this.acc.cleanRepCount,
        feedback: 'Posisikan seluruh tubuh tampak dari depan',
        angles: {},
        confidence: avgVisibility,
        isTracking: false,
        hasFault: false,
        activeFault: null,
        formScore: this.acc.formScore(),
      };
    }
    this.acc.markVisible();

    const p = toPixelSpace(landmarks, frame);
    const leftArm = calculateAngle(p[L_HIP], p[L_SHOULDER], p[L_WRIST]);
    const rightArm = calculateAngle(p[R_HIP], p[R_SHOULDER], p[R_WRIST]);
    const avgArm = (leftArm + rightArm) / 2;

    const shoulderWidth = distance2D(p[L_SHOULDER], p[R_SHOULDER]);
    const feetRatio = shoulderWidth > 1e-4 ? distance2D(p[L_ANKLE], p[R_ANKLE]) / shoulderWidth : 0;

    const observed: FormFault[] = [];

    // Lengan asimetris: dinilai per frame, tetapi fault hanya dicatat per rep (deduplikasi).
    if (Math.abs(leftArm - rightArm) > ARM_ASYMMETRY_LIMIT) {
      observed.push({
        id: 'asymmetric_arms',
        name: 'Lengan Tidak Simetris',
        description: 'Angkat kedua tangan secara seimbang bersamaan.',
        timestamp,
        severity: 'warning',
        bodyPart: 'arms',
      });
    }

    // Kaki tidak dibuka penuh saat tangan sudah di atas.
    if (avgArm >= ARM_ANGLE_OPEN - 10 && feetRatio < FEET_RATIO_OPEN) {
      observed.push({
        id: 'feet_not_open',
        name: 'Kaki Tidak Dibuka Penuh',
        description: 'Buka kaki lebih lebar saat melompat.',
        timestamp,
        severity: 'warning',
        bodyPart: 'feet',
      });
    }

    const partialFault: FormFault = {
      id: 'incomplete_jack',
      name: 'Lengan Tidak Terangkat Penuh',
      description: 'Angkat kedua tangan lebih tinggi ke atas kepala.',
      timestamp,
      severity: 'warning',
      bodyPart: 'arms',
    };

    const { event, faults: closed } = this.acc.update(-avgArm, timestamp, observed, partialFault);
    const activeFault = observed[0] ?? null;

    let feedback: string | undefined;
    if (event) {
      feedback = event.kind === 'partial'
        ? 'Rep belum dihitung: angkat tangan lebih tinggi'
        : closed.length ? `Rep ${this.acc.repCount}: ${closed[0].name}` : 'Rep jumping jack sempurna!';
    } else if (activeFault) {
      feedback = activeFault.description;
    } else {
      feedback = this.acc.rsm.currentPhase === 'top' ? 'Lompat buka tangan dan kaki bersamaan' : 'Rapatkan tangan dan kaki kembali ke posisi awal';
    }

    return {
      state: this.stateLabel(),
      repCount: this.acc.repCount,
      cleanRepCount: this.acc.cleanRepCount,
      feedback,
      angles: {
        leftArm,
        rightArm,
        feetRatio: Number(feetRatio.toFixed(2)),
      },
      confidence: avgVisibility,
      isTracking: true,
      hasFault: activeFault !== null,
      activeFault,
      lastRep: event ?? undefined,
      formScore: this.acc.formScore(),
    };
  }

  getFaults(): FormFault[] {
    return this.acc.faults;
  }

  getCleanRepCount(): number {
    return this.acc.cleanRepCount;
  }

  reset(): void {
    this.acc.reset();
  }

  private stateLabel(): string {
    return this.acc.rsm.currentPhase === 'top' ? 'closed' : 'open';
  }
}
