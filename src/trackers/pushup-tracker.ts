import type {
  NormalizedLandmark,
  ExerciseTracker,
  ExerciseConfig,
  TrackingResult,
  FormFault,
  FrameSize,
} from './types';
import { calculateAngle, toPixelSpace, bodyDeviation, DEFAULT_FRAME, SideSelector } from './base-tracker';
import { RepStateMachine, RepAccumulator } from './rep-state-machine';

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

const ANGLE_DOWN = 95;  // Sudut siku posisi bawah (default; bisa dikalibrasi)
const ANGLE_UP = 160;   // Sudut siku posisi atas lurus
const HIP_DEVIATION_LIMIT = 0.07; // Deviasi pinggul bertanda, dinormalisasi panjang tubuh

export interface PushupOptions {
  /** Ambang bawah hasil kalibrasi personal. */
  bottom?: number;
}

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

  private readonly acc: RepAccumulator;
  private readonly sides = new SideSelector();

  constructor(options: PushupOptions = {}) {
    this.acc = new RepAccumulator(
      new RepStateMachine({ top: ANGLE_UP, bottom: options.bottom ?? ANGLE_DOWN })
    );
  }

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number, frame: FrameSize = DEFAULT_FRAME): TrackingResult {
    const minVis = this.config.minVisibility;
    const vis = (i: number) => landmarks[i]?.visibility ?? 0;

    const isLeftValid = vis(L_SHOULDER) >= minVis && vis(L_ELBOW) >= minVis && vis(L_WRIST) >= minVis;
    const isRightValid = vis(R_SHOULDER) >= minVis && vis(R_ELBOW) >= minVis && vis(R_WRIST) >= minVis;
    const leftVis = (vis(L_SHOULDER) + vis(L_ELBOW) + vis(L_WRIST)) / 3;
    const rightVis = (vis(R_SHOULDER) + vis(R_ELBOW) + vis(R_WRIST)) / 3;

    if (!isLeftValid && !isRightValid) {
      this.acc.markLost(timestamp);
      return this.lostResult('Posisikan tubuh agar bahu dan lengan terlihat jelas', Math.max(leftVis, rightVis));
    }
    this.acc.markVisible();

    // Sisi tampak samping: pilih sisi yang lebih terlihat (bukan rata-rata sisi tertutup).
    const useLeft = isLeftValid && (this.sides.choose(leftVis, rightVis) === 'left' || !isRightValid);
    const p = toPixelSpace(landmarks, frame);
    const S = useLeft ? L_SHOULDER : R_SHOULDER;
    const E = useLeft ? L_ELBOW : R_ELBOW;
    const W = useLeft ? L_WRIST : R_WRIST;
    const H = useLeft ? L_HIP : R_HIP;
    const A = useLeft ? L_ANKLE : R_ANKLE;

    const elbowAngle = calculateAngle(p[S], p[E], p[W]);
    const angles: Record<string, number> = { [useLeft ? 'leftElbow' : 'rightElbow']: elbowAngle };

    // Garis tubuh bertanda: pinggul melorot (sag) atau terangkat (pike).
    const observed: FormFault[] = [];
    if (vis(H) >= minVis && vis(A) >= minVis) {
      const dev = bodyDeviation(p[S], p[H], p[A]);
      angles.bodyDeviation = Number((dev * 100).toFixed(1));
      if (dev > HIP_DEVIATION_LIMIT) {
        observed.push({
          id: 'sagging_hips',
          name: 'Pinggul Turun / Melengkung',
          description: 'Jaga otot perut kencang agar pinggul sejajar dengan bahu dan kaki.',
          timestamp,
          severity: 'warning',
          bodyPart: 'spine',
        });
      } else if (dev < -HIP_DEVIATION_LIMIT) {
        observed.push({
          id: 'pike_hips',
          name: 'Pinggul Terlalu Naik (Pike)',
          description: 'Turunkan pinggul agar sejajar lurus dengan garis tubuh.',
          timestamp,
          severity: 'warning',
          bodyPart: 'hips',
        });
      }
    }

    const partialFault: FormFault = {
      id: 'incomplete_depth',
      name: 'Kedalaman Kurang (Half Rep)',
      description: 'Turunkan dada lebih dekat ke lantai hingga siku menekuk 90°.',
      timestamp,
      severity: 'warning',
      bodyPart: 'elbow',
    };

    const { event, faults: closed } = this.acc.update(elbowAngle, timestamp, observed, partialFault);
    const activeFault = observed[0] ?? null;

    let feedback: string | undefined;
    if (event) {
      if (event.kind === 'partial') {
        feedback = 'Rep belum dihitung: turunkan dada lebih rendah';
      } else {
        feedback = closed.length ? `Rep ${this.acc.repCount}: ${closed[0].name}` : 'Rep sempurna tercatat!';
      }
    } else if (activeFault) {
      feedback = activeFault.description;
    } else {
      feedback = this.acc.rsm.currentPhase === 'top' ? 'Turunkan dada lebih rendah' : 'Dorong kembali ke atas';
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
    return this.acc.rsm.currentPhase === 'top' ? 'up' : 'down';
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
