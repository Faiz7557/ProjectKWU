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
  toPixelSpace,
  angleBetweenVectors,
  DEFAULT_FRAME,
  SideSelector,
} from './base-tracker';
import { RepStateMachine, RepAccumulator } from './rep-state-machine';

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANKLE = 27;
const R_ANKLE = 28;
const L_HEEL = 29;
const R_HEEL = 30;
const L_FOOT_INDEX = 31;
const R_FOOT_INDEX = 32;

const ANGLE_SQUAT = 100;     // Sudut lutut posisi bawah (default; bisa dikalibrasi)
const ANGLE_STANDING = 160;  // Sudut lutut berdiri tegak
const LEAN_LIMIT = 50;       // Sudut torso vs tibia (derajat). Di atas ini = lean berlebih.
const HEEL_LIFT_LIMIT = 0.06; // Selisih tinggi tumit vs ujung kaki, dinormalisasi panjang tungkai

export interface SquatOptions {
  /** Ambang bawah hasil kalibrasi personal. */
  bottom?: number;
}

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

  private readonly acc: RepAccumulator;
  private readonly sides = new SideSelector();

  constructor(options: SquatOptions = {}) {
    this.acc = new RepAccumulator(
      new RepStateMachine({ top: ANGLE_STANDING, bottom: options.bottom ?? ANGLE_SQUAT })
    );
  }

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number, frame: FrameSize = DEFAULT_FRAME): TrackingResult {
    const minVis = this.config.minVisibility;
    const vis = (i: number) => landmarks[i]?.visibility ?? 0;

    const isLeftValid = vis(L_HIP) >= minVis && vis(L_KNEE) >= minVis && vis(L_ANKLE) >= minVis;
    const isRightValid = vis(R_HIP) >= minVis && vis(R_KNEE) >= minVis && vis(R_ANKLE) >= minVis;
    const leftVis = (vis(L_HIP) + vis(L_KNEE) + vis(L_ANKLE)) / 3;
    const rightVis = (vis(R_HIP) + vis(R_KNEE) + vis(R_ANKLE)) / 3;

    if (!isLeftValid && !isRightValid) {
      this.acc.markLost(timestamp);
      return this.lostResult('Pastikan kaki dari pinggul ke pergelangan terlihat kamera', Math.max(leftVis, rightVis));
    }
    this.acc.markVisible();

    const useLeft = isLeftValid && (this.sides.choose(leftVis, rightVis) === 'left' || !isRightValid);
    const p = toPixelSpace(landmarks, frame);
    const S = useLeft ? L_SHOULDER : R_SHOULDER;
    const Hp = useLeft ? L_HIP : R_HIP;
    const K = useLeft ? L_KNEE : R_KNEE;
    const A = useLeft ? L_ANKLE : R_ANKLE;
    const heel = useLeft ? L_HEEL : R_HEEL;
    const toe = useLeft ? L_FOOT_INDEX : R_FOOT_INDEX;

    const kneeAngle = calculateAngle(p[Hp], p[K], p[A]);
    const angles: Record<string, number> = { [useLeft ? 'leftKnee' : 'rightKnee']: kneeAngle };

    const observed: FormFault[] = [];

    // Lean berlebih: sudut antara torso (pinggul->bahu) dan tibia (ankle->lutut), keduanya menunjuk ke atas.
    if (vis(S) >= minVis || vis(Hp) >= minVis) {
      const lean = angleBetweenVectors(
        { x: p[S].x - p[Hp].x, y: p[S].y - p[Hp].y },
        { x: p[K].x - p[A].x, y: p[K].y - p[A].y }
      );
      angles.torsoLean = Number(lean.toFixed(1));
      if (lean > LEAN_LIMIT) {
        observed.push({
          id: 'torso_collapse',
          name: 'Dada Terlalu Membungkuk',
          description: 'Busungkan dada dan jaga pandangan tetap lurus ke depan.',
          timestamp,
          severity: 'warning',
          bodyPart: 'spine',
        });
      }
    }

    // Tumit terangkat: ujung kaki lebih rendah (lebih besar y) dari tumit saat kaki menapak.
    if (vis(heel) >= minVis && vis(toe) >= minVis) {
      const legLen = Math.hypot(p[Hp].x - p[A].x, p[Hp].y - p[A].y) || 1;
      const lift = (p[toe].y - p[heel].y) / legLen;
      angles.heelLift = Number((lift * 100).toFixed(1));
      if (lift > HEEL_LIFT_LIMIT) {
        observed.push({
          id: 'heel_lift',
          name: 'Tumit Terangkat',
          description: 'Jaga tumit tetap menapak lantai selama squat.',
          timestamp,
          severity: 'warning',
          bodyPart: 'feet',
        });
      }
    }

    const partialFault: FormFault = {
      id: 'shallow_squat',
      name: 'Jongkok Kurang Dalam (Half Squat)',
      description: 'Turunkan paha hingga sejajar lantai (90°-100°).',
      timestamp,
      severity: 'warning',
      bodyPart: 'knee',
    };

    const { event, faults: closed } = this.acc.update(kneeAngle, timestamp, observed, partialFault);
    const activeFault = observed[0] ?? null;

    let feedback: string | undefined;
    if (event) {
      feedback = event.kind === 'partial'
        ? 'Rep belum dihitung: turunkan pinggul lebih dalam'
        : closed.length ? `Rep ${this.acc.repCount}: ${closed[0].name}` : 'Rep squat sempurna!';
    } else if (activeFault) {
      feedback = activeFault.description;
    } else {
      feedback = this.acc.rsm.currentPhase === 'top' ? 'Turunkan pinggul lebih rendah' : 'Berdiri hingga lutut lurus kembali';
    }

    return {
      state: this.stateLabel(),
      repCount: this.acc.repCount,
      cleanRepCount: this.acc.cleanRepCount,
      feedback,
      angles,
      confidence: Math.max(leftVis, rightVis),
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
    this.sides.reset();
  }

  private stateLabel(): string {
    return this.acc.rsm.currentPhase === 'top' ? 'standing' : 'squatting';
  }

  private lostResult(feedback: string, confidence: number): TrackingResult {
    return {
      state: this.stateLabel(),
      repCount: this.acc.repCount,
      cleanRepCount: this.acc.cleanRepCount,
      feedback,
      angles: {},
      confidence,
      isTracking: false,
      hasFault: false,
      activeFault: null,
      formScore: this.acc.formScore(),
    };
  }
}
