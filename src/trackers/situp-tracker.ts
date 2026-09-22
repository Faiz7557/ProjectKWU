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

const ANGLE_CRUNCH = 90;  // Sudut torso saat crunch terangkat (< 90°)
const ANGLE_LYING = 145;  // Sudut torso saat berbaring lurus (> 145°)

export class SitupTracker implements ExerciseTracker {
  readonly config: ExerciseConfig = {
    id: 'situp',
    name: 'Sit-up',
    type: 'counter',
    cameraOrientation: 'side',
    instructions: [
      'Posisikan kamera dari SAMPING tubuh',
      'Berbaring di matras/lantai dengan lutut ditekuk',
      'Pastikan bahu, pinggul, dan lutut terlihat jelas',
    ],
    requiredLandmarks: [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_KNEE, R_KNEE],
    minVisibility: 0.4,
  };

  private state: 'lying' | 'crunched' = 'lying';
  private repCount: number = 0;
  private cleanRepCount: number = 0;
  private faults: FormFault[] = [];
  private currentRepHasFault: boolean = false;
  private minTorsoAngleInRep: number = 180;

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number): TrackingResult {
    const minVis = this.config.minVisibility;
    const lShVis = landmarks[L_SHOULDER]?.visibility ?? 0;
    const lHipVis = landmarks[L_HIP]?.visibility ?? 0;
    const lKneeVis = landmarks[L_KNEE]?.visibility ?? 0;

    const rShVis = landmarks[R_SHOULDER]?.visibility ?? 0;
    const rHipVis = landmarks[R_HIP]?.visibility ?? 0;
    const rKneeVis = landmarks[R_KNEE]?.visibility ?? 0;

    const isLeftValid = lShVis >= minVis && lHipVis >= minVis && lKneeVis >= minVis;
    const isRightValid = rShVis >= minVis && rHipVis >= minVis && rKneeVis >= minVis;

    const leftVis = (lShVis + lHipVis + lKneeVis) / 3;
    const rightVis = (rShVis + rHipVis + rKneeVis) / 3;

    if (!isLeftValid && !isRightValid) {
      return {
        state: this.state,
        repCount: this.repCount,
        cleanRepCount: this.cleanRepCount,
        feedback: 'Pastikan bahu dan torso terlihat dari samping',
        angles: {},
        confidence: Math.max(leftVis, rightVis),
        isTracking: false,
        hasFault: false,
        activeFault: null,
      };
    }

    let torsoAngle: number;
    const angles: Record<string, number> = {};

    if (isLeftValid && isRightValid) {
      const leftAngle = calculateAngle(landmarks[L_SHOULDER], landmarks[L_HIP], landmarks[L_KNEE]);
      const rightAngle = calculateAngle(landmarks[R_SHOULDER], landmarks[R_HIP], landmarks[R_KNEE]);
      angles.leftTorso = leftAngle;
      angles.rightTorso = rightAngle;
      torsoAngle = (leftAngle + rightAngle) / 2;
    } else if (isLeftValid) {
      torsoAngle = calculateAngle(landmarks[L_SHOULDER], landmarks[L_HIP], landmarks[L_KNEE]);
      angles.leftTorso = torsoAngle;
    } else {
      torsoAngle = calculateAngle(landmarks[R_SHOULDER], landmarks[R_HIP], landmarks[R_KNEE]);
      angles.rightTorso = torsoAngle;
    }

    this.minTorsoAngleInRep = Math.min(this.minTorsoAngleInRep, torsoAngle);

    let activeFault: FormFault | null = null;
    let feedback: string | undefined;

    // State machine: lying -> crunched -> lying = 1 rep
    if (torsoAngle <= ANGLE_CRUNCH) {
      if (this.state !== 'crunched') {
        this.state = 'crunched';
      }
      feedback = 'Bagus! Turunkan kembali secara terkontrol';
    } else if (torsoAngle >= ANGLE_LYING) {
      if (this.state === 'crunched') {
        this.repCount++;

        // Cek range of motion sit-up
        if (this.minTorsoAngleInRep > ANGLE_CRUNCH + 6) {
          activeFault = {
            id: 'incomplete_crunch',
            name: 'Angkatan Kurang Tinggi',
            description: 'Angkat torso lebih tinggi mendekati paha Anda.',
            timestamp,
            repNumber: this.repCount,
            severity: 'warning',
            bodyPart: 'spine',
          };
          this.faults.push(activeFault);
          this.currentRepHasFault = true;
        }

        if (this.currentRepHasFault) {
          if (activeFault && !this.faults.includes(activeFault)) {
            this.faults.push(activeFault);
          }
        } else {
          this.cleanRepCount++;
        }

        this.state = 'lying';
        this.currentRepHasFault = false;
        this.minTorsoAngleInRep = 180;
        feedback = activeFault ? `Rep ${this.repCount}: ${activeFault.name}` : 'Rep sit-up bersih!';
      }
    } else {
      feedback = this.state === 'lying'
        ? 'Angkat torso ke arah lutut'
        : 'Rebahkan punggung kembali ke lantai';
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
    this.state = 'lying';
    this.repCount = 0;
    this.cleanRepCount = 0;
    this.faults = [];
    this.currentRepHasFault = false;
    this.minTorsoAngleInRep = 180;
  }
}
