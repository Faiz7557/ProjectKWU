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
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANKLE = 27;
const R_ANKLE = 28;

const ANGLE_SQUAT = 100;     // Sudut lutut saat squat jongkok dalam (< 100°)
const ANGLE_STANDING = 160;  // Sudut lutut saat berdiri tegak (> 160°)

export class SquatTracker implements ExerciseTracker {
  readonly config: ExerciseConfig = {
    id: 'squat',
    name: 'Squat',
    type: 'counter',
    cameraOrientation: 'side',
    instructions: [
      'Posisikan kamera dari SAMPING tubuh',
      'Pastikan pinggul, lutut, dan pergelangan kaki terlihat',
      'Berdiri tegak dengan kaki dibuka selebar bahu',
    ],
    requiredLandmarks: [L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE],
    minVisibility: 0.4,
  };

  private state: 'standing' | 'squatting' = 'standing';
  private repCount: number = 0;
  private cleanRepCount: number = 0;
  private faults: FormFault[] = [];
  private currentRepHasFault: boolean = false;
  private minKneeAngleInRep: number = 180;

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number): TrackingResult {
    const minVis = this.config.minVisibility;
    const lHipVis = landmarks[L_HIP]?.visibility ?? 0;
    const lKneeVis = landmarks[L_KNEE]?.visibility ?? 0;
    const lAnkVis = landmarks[L_ANKLE]?.visibility ?? 0;

    const rHipVis = landmarks[R_HIP]?.visibility ?? 0;
    const rKneeVis = landmarks[R_KNEE]?.visibility ?? 0;
    const rAnkVis = landmarks[R_ANKLE]?.visibility ?? 0;

    const isLeftValid = lHipVis >= minVis && lKneeVis >= minVis && lAnkVis >= minVis;
    const isRightValid = rHipVis >= minVis && rKneeVis >= minVis && rAnkVis >= minVis;

    const leftVis = (lHipVis + lKneeVis + lAnkVis) / 3;
    const rightVis = (rHipVis + rKneeVis + rAnkVis) / 3;

    if (!isLeftValid && !isRightValid) {
      return {
        state: this.state,
        repCount: this.repCount,
        cleanRepCount: this.cleanRepCount,
        feedback: 'Pastikan kaki dari pinggul ke pergelangan terlihat kamera',
        angles: {},
        confidence: Math.max(leftVis, rightVis),
        isTracking: false,
        hasFault: false,
        activeFault: null,
      };
    }

    let primaryKneeAngle: number;
    const angles: Record<string, number> = {};

    if (isLeftValid && isRightValid) {
      const leftAngle = calculateAngle(landmarks[L_HIP], landmarks[L_KNEE], landmarks[L_ANKLE]);
      const rightAngle = calculateAngle(landmarks[R_HIP], landmarks[R_KNEE], landmarks[R_ANKLE]);
      angles.leftKnee = leftAngle;
      angles.rightKnee = rightAngle;
      primaryKneeAngle = (leftAngle + rightAngle) / 2;
    } else if (isLeftValid) {
      primaryKneeAngle = calculateAngle(landmarks[L_HIP], landmarks[L_KNEE], landmarks[L_ANKLE]);
      angles.leftKnee = primaryKneeAngle;
    } else {
      primaryKneeAngle = calculateAngle(landmarks[R_HIP], landmarks[R_KNEE], landmarks[R_ANKLE]);
      angles.rightKnee = primaryKneeAngle;
    }

    this.minKneeAngleInRep = Math.min(this.minKneeAngleInRep, primaryKneeAngle);

    // ── ANALISIS KESALAHAN FORM SQUAT ──
    let activeFault: FormFault | null = null;

    // Kesalahan 1: Lutut terlalu maju melebihi ujung kaki (Knee forward drift)
    if (this.state === 'squatting') {
      const activeKnee = isLeftValid ? landmarks[L_KNEE] : landmarks[R_KNEE];
      const activeAnkle = isLeftValid ? landmarks[L_ANKLE] : landmarks[R_ANKLE];
      const kneeDrift = Math.abs(activeKnee.x - activeAnkle.x);

      if (kneeDrift > 0.13) {
        activeFault = {
          id: 'knee_over_toes',
          name: 'Lutut Terlalu Maju',
          description: 'Dorong pinggul lebih ke belakang seperti ingin duduk di kursi.',
          timestamp,
          repNumber: this.repCount + 1,
          severity: 'warning',
          bodyPart: 'knee',
        };
        this.currentRepHasFault = true;
      }
    }

    // Kesalahan 2: Dada terlalu membungkuk ke depan (Torso Collapse)
    const shoulderVis =
      (landmarks[L_SHOULDER]?.visibility ?? 0) >= minVis ||
      (landmarks[R_SHOULDER]?.visibility ?? 0) >= minVis;

    if (shoulderVis && this.state === 'squatting') {
      const torsoAngle = isLeftValid
        ? calculateAngle(landmarks[L_SHOULDER], landmarks[L_HIP], landmarks[L_KNEE])
        : calculateAngle(landmarks[R_SHOULDER], landmarks[R_HIP], landmarks[R_KNEE]);

      angles.torsoLean = torsoAngle;
      if (torsoAngle < 65) {
        activeFault = {
          id: 'torso_collapse',
          name: 'Dada Terlalu Membungkuk',
          description: 'Busungkan dada dan jaga pandangan tetap lurus ke depan.',
          timestamp,
          repNumber: this.repCount + 1,
          severity: 'warning',
          bodyPart: 'spine',
        };
        this.currentRepHasFault = true;
      }
    }

    let feedback: string | undefined;

    // State machine: standing -> squatting -> standing = 1 rep
    if (primaryKneeAngle <= ANGLE_SQUAT) {
      if (this.state !== 'squatting') {
        this.state = 'squatting';
      }
      feedback = activeFault ? activeFault.description : 'Bagus! Kedalaman tercapai, dorong berdiri';
    } else if (primaryKneeAngle >= ANGLE_STANDING) {
      if (this.state === 'squatting') {
        this.repCount++;

        // Cek apakah jongkoknya nanggung (Half Squat)
        if (this.minKneeAngleInRep > ANGLE_SQUAT + 8) {
          const depthFault: FormFault = {
            id: 'shallow_squat',
            name: 'Jongkok Kurang Dalam (Half Squat)',
            description: 'Turunkan paha hingga sejajar lantai (90°-100°).',
            timestamp,
            repNumber: this.repCount,
            severity: 'warning',
            bodyPart: 'knee',
          };
          this.faults.push(depthFault);
          this.currentRepHasFault = true;
          activeFault = depthFault;
        }

        if (this.currentRepHasFault) {
          if (activeFault) {
            this.faults.push(activeFault);
          }
        } else {
          this.cleanRepCount++;
        }

        this.state = 'standing';
        this.currentRepHasFault = false;
        this.minKneeAngleInRep = 180;
        feedback = activeFault ? `Rep ${this.repCount}: ${activeFault.name}` : 'Rep squat sempurna!';
      }
    } else {
      feedback = activeFault
        ? activeFault.description
        : this.state === 'standing'
        ? 'Turunkan pinggul lebih rendah'
        : 'Berdiri hingga lutut lurus kembali';
    }

    return {
      state: this.state,
      repCount: this.repCount,
      cleanRepCount: this.cleanRepCount,
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
    return this.cleanRepCount;
  }

  reset(): void {
    this.state = 'standing';
    this.repCount = 0;
    this.cleanRepCount = 0;
    this.faults = [];
    this.currentRepHasFault = false;
    this.minKneeAngleInRep = 180;
  }
}
