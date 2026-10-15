import type {
  NormalizedLandmark,
  ExerciseTracker,
  ExerciseConfig,
  TrackingResult,
  FormFault,
  FrameSize,
} from './types';
import {
  toPixelSpace,
  angleFromHorizontal,
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

// Sinyal = -(sudut torso terhadap horizontal). Berbaring ≈ 0 (top, nilai -10);
// angkatan penuh ≈ 90 (bottom, nilai -60 atau lebih rendah). Dibalik agar konvensi RepStateMachine terpenuhi.
const TORSO_LYING = 10;   // derajat: di bawah ini = berbaring (top)
const TORSO_CRUNCH = 60;  // derajat: di atas ini = angkatan tercapai (bottom)
const THIGH_DRIFT_LIMIT = 25; // derajat: perubahan sudut paha dari baseline = kaki terangkat

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

  private readonly acc = new RepAccumulator(
    new RepStateMachine({ top: -TORSO_LYING, bottom: -TORSO_CRUNCH, startDescentDelta: 8 })
  );
  private readonly sides = new SideSelector();
  private thighBaseline: number | null = null;

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number, frame: FrameSize = DEFAULT_FRAME): TrackingResult {
    const minVis = this.config.minVisibility;
    const vis = (i: number) => landmarks[i]?.visibility ?? 0;

    const isLeftValid = vis(L_SHOULDER) >= minVis && vis(L_HIP) >= minVis && vis(L_KNEE) >= minVis;
    const isRightValid = vis(R_SHOULDER) >= minVis && vis(R_HIP) >= minVis && vis(R_KNEE) >= minVis;
    const leftVis = (vis(L_SHOULDER) + vis(L_HIP) + vis(L_KNEE)) / 3;
    const rightVis = (vis(R_SHOULDER) + vis(R_HIP) + vis(R_KNEE)) / 3;

    if (!isLeftValid && !isRightValid) {
      this.acc.markLost(timestamp);
      return this.lostResult('Pastikan bahu dan torso terlihat dari samping', Math.max(leftVis, rightVis));
    }
    this.acc.markVisible();

    const useLeft = isLeftValid && (this.sides.choose(leftVis, rightVis) === 'left' || !isRightValid);
    const p = toPixelSpace(landmarks, frame);
    const S = useLeft ? L_SHOULDER : R_SHOULDER;
    const Hp = useLeft ? L_HIP : R_HIP;
    const K = useLeft ? L_KNEE : R_KNEE;

    const torsoDeg = angleFromHorizontal(p[Hp], p[S]);
    const thighDeg = angleFromHorizontal(p[Hp], p[K]);
    const angles: Record<string, number> = {
      [useLeft ? 'leftTorso' : 'rightTorso']: torsoDeg,
      thigh: thighDeg,
    };

    // Baseline paha diambil saat berbaring; kaki terangkat = paha berubah banyak dari baseline.
    if (this.acc.rsm.currentPhase === 'top') this.thighBaseline = thighDeg;
    const observed: FormFault[] = [];
    if (this.thighBaseline !== null && Math.abs(thighDeg - this.thighBaseline) > THIGH_DRIFT_LIMIT) {
      observed.push({
        id: 'legs_lifted',
        name: 'Kaki Terangkat',
        description: 'Jaga lutut tetap di posisi awal dan tahan kaki di lantai.',
        timestamp,
        severity: 'warning',
        bodyPart: 'knee',
      });
    }

    const partialFault: FormFault = {
      id: 'incomplete_crunch',
      name: 'Angkatan Kurang Tinggi',
      description: 'Angkat torso lebih tinggi mendekati paha Anda.',
      timestamp,
      severity: 'warning',
      bodyPart: 'spine',
    };

    const { event, faults: closed } = this.acc.update(-torsoDeg, timestamp, observed, partialFault);
    const activeFault = observed[0] ?? null;

    let feedback: string | undefined;
    if (event) {
      feedback = event.kind === 'partial'
        ? 'Rep belum dihitung: angkat torso lebih tinggi'
        : closed.length ? `Rep ${this.acc.repCount}: ${closed[0].name}` : 'Rep sit-up bersih!';
    } else if (activeFault) {
      feedback = activeFault.description;
    } else {
      feedback = this.acc.rsm.currentPhase === 'top' ? 'Angkat torso ke arah lutut' : 'Rebahkan punggung kembali ke lantai';
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
    this.thighBaseline = null;
  }

  private stateLabel(): string {
    return this.acc.rsm.currentPhase === 'top' ? 'lying' : 'crunched';
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
