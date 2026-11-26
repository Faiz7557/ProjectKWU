import type {
  NormalizedLandmark,
  ExerciseTracker,
  ExerciseConfig,
  TrackingResult,
  FormFault,
  FrameSize,
} from './types';
import { calculateAngle, toPixelSpace, bodyDeviation, angleFromHorizontal, DEFAULT_FRAME, SideSelector } from './base-tracker';

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;
const L_ANKLE = 27;
const R_ANKLE = 28;

// Deviasi pinggul bertanda dari garis bahu-kaki, dinormalisasi panjang tubuh.
// Positif = melorot (sag), negatif = terangkat (pike). Di dalam batas = postur lurus.
const HIP_DEVIATION_LIMIT = 0.07;
// Histeresis: fault baru dianggap selesai saat deviasi kembali di bawah ini. Tanpa ini pinggul
// yang bergetar di sekitar batas membuat status berkedip tiap frame (fault tercatat puluhan kali,
// waktu tahan tersendat, voice coach berganti kalimat terus).
const HIP_DEVIATION_CLEAR = 0.05;
// Jeda antar-frame lebih dari ini (lag, pause, tubuh hilang) tidak ikut dihitung sebagai waktu tahan.
const MAX_FRAME_DELTA_SEC = 0.5;
// Garis bahu-kaki lebih miring dari ini (derajat dari horizontal) = bukan posisi plank.
const BODY_MAX_INCLINE = 35;

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

  private holdDurationSec = 0;
  private cleanHoldDurationSec = 0;
  private trackedDurationSec = 0;
  private lastValidTimestamp: number | null = null;
  private lastFaultId: string | null = null;
  private faults: FormFault[] = [];
  private readonly sides = new SideSelector();

  processLandmarks(landmarks: NormalizedLandmark[], timestamp: number, frame: FrameSize = DEFAULT_FRAME): TrackingResult {
    const minVis = this.config.minVisibility;
    const vis = (i: number) => landmarks[i]?.visibility ?? 0;

    const isLeftValid = vis(L_SHOULDER) >= minVis && vis(L_HIP) >= minVis && vis(L_ANKLE) >= minVis;
    const isRightValid = vis(R_SHOULDER) >= minVis && vis(R_HIP) >= minVis && vis(R_ANKLE) >= minVis;
    const leftVis = (vis(L_SHOULDER) + vis(L_HIP) + vis(L_ANKLE)) / 3;
    const rightVis = (vis(R_SHOULDER) + vis(R_HIP) + vis(R_ANKLE)) / 3;

    if (!isLeftValid && !isRightValid) {
      this.lastValidTimestamp = null;
      this.lastFaultId = null;
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
        formScore: this.formScore(),
      };
    }

    const useLeft = isLeftValid && (this.sides.choose(leftVis, rightVis) === 'left' || !isRightValid);
    const p = toPixelSpace(landmarks, frame);
    const S = useLeft ? L_SHOULDER : R_SHOULDER;
    const H = useLeft ? L_HIP : R_HIP;
    const A = useLeft ? L_ANKLE : R_ANKLE;

    // Gating posisi: berdiri tegak juga membentuk garis bahu-pinggul-kaki lurus (deviasi ≈ 0),
    // jadi tanpa cek ini berdiri dihitung sebagai plank sempurna.
    if (angleFromHorizontal(p[S], p[A]) > BODY_MAX_INCLINE) {
      this.lastValidTimestamp = null;
      this.lastFaultId = null;
      return {
        state: 'pause',
        repCount: 0,
        cleanRepCount: 0,
        holdDuration: Number(this.holdDurationSec.toFixed(1)),
        feedback: 'Ambil posisi plank: tubuh lurus mendatar bertumpu lengan bawah',
        angles: {},
        confidence: Math.max(leftVis, rightVis),
        isTracking: true,
        hasFault: false,
        activeFault: null,
        formScore: this.formScore(),
      };
    }

    const dev = bodyDeviation(p[S], p[H], p[A]);
    const angles: Record<string, number> = {
      [useLeft ? 'leftSpine' : 'rightSpine']: calculateAngle(p[S], p[H], p[A]),
      bodyDeviation: Number((dev * 100).toFixed(1)),
    };

    // Waktu hanya dihitung antar-frame yang berurutan (jeda > 2 s tidak dihitung).
    const delta = this.lastValidTimestamp === null
      ? 0
      : Math.min(MAX_FRAME_DELTA_SEC, Math.max(0, (timestamp - this.lastValidTimestamp) / 1000));
    this.lastValidTimestamp = timestamp;
    this.trackedDurationSec += delta;

    let activeFault: FormFault | null = null;
    let feedback: string | undefined;

    const kind: 'sagging_hips' | 'pike_hips' | null =
      dev > HIP_DEVIATION_LIMIT ? 'sagging_hips'
        : dev < -HIP_DEVIATION_LIMIT ? 'pike_hips'
          : this.lastFaultId !== null && Math.abs(dev) >= HIP_DEVIATION_CLEAR ? (this.lastFaultId as 'sagging_hips' | 'pike_hips')
            : null;

    if (kind === null) {
      this.holdDurationSec += delta;
      this.cleanHoldDurationSec += delta;
      this.lastFaultId = null;
      feedback = 'Postur lurus sempurna! Tahan posisi...';
    } else {
      activeFault = kind === 'sagging_hips'
        ? {
            id: 'sagging_hips',
            name: 'Pinggul Turun / Melengkung',
            description: 'Kencangkan otot inti (core) agar pinggul tidak merosot ke bawah.',
            timestamp,
            severity: 'warning',
            bodyPart: 'spine',
          }
        : {
            id: 'pike_hips',
            name: 'Pinggul Terlalu Naik (Pike)',
            description: 'Turunkan pinggul agar sejajar lurus dengan garis tubuh.',
            timestamp,
            severity: 'warning',
            bodyPart: 'hips',
          };
      // Satu catatan per episode (bukan per frame atau per 3 detik).
      if (activeFault.id !== this.lastFaultId) {
        this.faults.push(activeFault);
        this.lastFaultId = activeFault.id;
      }
      feedback = activeFault.description;
    }

    return {
      state: activeFault ? 'pause' : 'holding',
      repCount: 0,
      cleanRepCount: 0,
      holdDuration: Number(this.holdDurationSec.toFixed(1)),
      feedback,
      angles,
      confidence: Math.max(leftVis, rightVis),
      isTracking: true,
      hasFault: activeFault !== null,
      activeFault,
      formScore: this.formScore(),
    };
  }

  getFaults(): FormFault[] {
    return this.faults;
  }

  /** Plank tidak punya repetisi. Waktu tahan bersih ada di holdDuration (sebelumnya detik bocor jadi "rep bersih"). */
  getCleanRepCount(): number {
    return 0;
  }

  reset(): void {
    this.holdDurationSec = 0;
    this.cleanHoldDurationSec = 0;
    this.trackedDurationSec = 0;
    this.lastValidTimestamp = null;
    this.lastFaultId = null;
    this.faults = [];
    this.sides.reset();
  }

  /** Clean hold / total hold tracked, 0-100. Null bila belum ada data. */
  private formScore(): number | null {
    return this.trackedDurationSec > 0
      ? Math.round((this.cleanHoldDurationSec / this.trackedDurationSec) * 100)
      : null;
  }
}
