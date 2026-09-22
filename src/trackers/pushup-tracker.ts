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
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;
const L_ANKLE = 27;
const R_ANKLE = 28;

const ANGLE_DOWN = 95;  // Sudut siku saat posisi bawah (< 95°)
const ANGLE_UP = 160;   // Sudut siku saat posisi atas lurus (> 160°)
const MIN_BODY_LINE = 152; // Garis lurus tubuh bahu-pinggul-pergelangan kaki

export class PushupTracker implements ExerciseTracker {
  readonly config: ExerciseConfig = {
    id: 'pushup',
    name: 'Push-up',
    type: 'counter',
    cameraOrientation: 'side',
    instructions: [
      'Posisikan kamera dari arah SAMPING tubuh',
      'Pastikan bahu, siku, dan pergelangan tangan terlihat',
      'Jaga jarak sekitar 1.5 - 2 meter dari perangkat',
    ],
    requiredLandmarks: [L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_WRIST, R_WRIST],
    minVisibility: 0.4,
  };

  private state: 'up' | 'down' = 'up';
  private repCount: number = 0;
  private cleanRepCount: number = 0;
  private faults: FormFault[] = [];
  private currentRepHasFault: boolean = false;
  private minElbowAngleInRep: number = 180;

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number): TrackingResult {
    const minVis = this.config.minVisibility;
    const lShVis = landmarks[L_SHOULDER]?.visibility ?? 0;
    const lElVis = landmarks[L_ELBOW]?.visibility ?? 0;
    const lWrVis = landmarks[L_WRIST]?.visibility ?? 0;

    const rShVis = landmarks[R_SHOULDER]?.visibility ?? 0;
    const rElVis = landmarks[R_ELBOW]?.visibility ?? 0;
    const rWrVis = landmarks[R_WRIST]?.visibility ?? 0;

    const isLeftValid = lShVis >= minVis && lElVis >= minVis && lWrVis >= minVis;
    const isRightValid = rShVis >= minVis && rElVis >= minVis && rWrVis >= minVis;

    const leftVis = (lShVis + lElVis + lWrVis) / 3;
    const rightVis = (rShVis + rElVis + rWrVis) / 3;

    if (!isLeftValid && !isRightValid) {
      return {
        state: this.state,
        repCount: this.repCount,
        cleanRepCount: this.cleanRepCount,
        feedback: 'Posisikan tubuh agar bahu dan lengan terlihat jelas',
        angles: {},
        confidence: Math.max(leftVis, rightVis),
        isTracking: false,
        hasFault: false,
        activeFault: null,
      };
    }

    let primaryElbowAngle: number;
    const angles: Record<string, number> = {};

    if (isLeftValid && isRightValid) {
      const leftAngle = calculateAngle(landmarks[L_SHOULDER], landmarks[L_ELBOW], landmarks[L_WRIST]);
      const rightAngle = calculateAngle(landmarks[R_SHOULDER], landmarks[R_ELBOW], landmarks[R_WRIST]);
      angles.leftElbow = leftAngle;
      angles.rightElbow = rightAngle;
      primaryElbowAngle = (leftAngle + rightAngle) / 2;
    } else if (isLeftValid) {
      primaryElbowAngle = calculateAngle(landmarks[L_SHOULDER], landmarks[L_ELBOW], landmarks[L_WRIST]);
      angles.leftElbow = primaryElbowAngle;
    } else {
      primaryElbowAngle = calculateAngle(landmarks[R_SHOULDER], landmarks[R_ELBOW], landmarks[R_WRIST]);
      angles.rightElbow = primaryElbowAngle;
    }

    // Rekam sudut siku terdalam selama repetisi ini
    this.minElbowAngleInRep = Math.min(this.minElbowAngleInRep, primaryElbowAngle);

    // ── ANALISIS KESALAHAN FORM 1: Kelurusan Garis Tubuh (Sagging Hips) ──
    let activeFault: FormFault | null = null;
    const hipVisible =
      (landmarks[L_HIP]?.visibility ?? 0) >= minVis ||
      (landmarks[R_HIP]?.visibility ?? 0) >= minVis;
    const ankleVisible =
      (landmarks[L_ANKLE]?.visibility ?? 0) >= minVis ||
      (landmarks[R_ANKLE]?.visibility ?? 0) >= minVis;

    if (hipVisible && ankleVisible) {
      const bodyAngle = isLeftValid
        ? calculateAngle(landmarks[L_SHOULDER], landmarks[L_HIP], landmarks[L_ANKLE])
        : calculateAngle(landmarks[R_SHOULDER], landmarks[R_HIP], landmarks[R_ANKLE]);

      angles.bodyLine = bodyAngle;

      if (bodyAngle < MIN_BODY_LINE) {
        activeFault = {
          id: 'sagging_hips',
          name: 'Pinggul Turun / Melengkung',
          description: 'Jaga otot perut kencang agar pinggul sejajar dengan bahu dan kaki.',
          timestamp,
          repNumber: this.repCount + 1,
          severity: 'warning',
          bodyPart: 'spine',
        };
        this.currentRepHasFault = true;
      }
    }

    let feedback: string | undefined;

    // State machine siklus rep: UP -> DOWN -> UP
    if (primaryElbowAngle <= ANGLE_DOWN) {
      if (this.state !== 'down') {
        this.state = 'down';
      }
      feedback = activeFault ? activeFault.description : 'Bagus! Dorong kembali ke atas';
    } else if (primaryElbowAngle >= ANGLE_UP) {
      if (this.state === 'down') {
        this.repCount++;

        // ── ANALISIS KESALAHAN FORM 2: Setengah Rep (Incomplete Depth) ──
        if (this.minElbowAngleInRep > ANGLE_DOWN + 5) {
          const depthFault: FormFault = {
            id: 'incomplete_depth',
            name: 'Kedalaman Kurang (Half Rep)',
            description: 'Turunkan dada lebih dekat ke lantai hingga siku menekuk 90°.',
            timestamp,
            repNumber: this.repCount,
            severity: 'warning',
            bodyPart: 'elbow',
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

        // Reset tracking repetisi berikutnya
        this.state = 'up';
        this.currentRepHasFault = false;
        this.minElbowAngleInRep = 180;
        feedback = activeFault ? `Rep ${this.repCount}: ${activeFault.name}` : 'Rep sempurna tercatat!';
      }
    } else {
      feedback = activeFault
        ? activeFault.description
        : this.state === 'down'
        ? 'Luruskan lengan sepenuhnya ke atas'
        : 'Turunkan dada lebih rendah';
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
    this.state = 'up';
    this.repCount = 0;
    this.cleanRepCount = 0;
    this.faults = [];
    this.currentRepHasFault = false;
    this.minElbowAngleInRep = 180;
  }
}
