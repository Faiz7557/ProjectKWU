import type { NormalizedLandmark, BilateralSymmetry, FrameSize } from '@/trackers/types';
import { calculateAngle, toPixelSpace, DEFAULT_FRAME } from '@/trackers/base-tracker';

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_HIP = 23;
const R_HIP = 24;
const MIN_VIS = 0.5;

/**
 * Simetri bilateral kiri vs kanan. Hanya valid untuk latihan yang direkam dari DEPAN.
 *
 * Push-up, squat, sit-up, dan plank direkam dari SAMPING: sisi tubuh yang jauh tertutup dan
 * posisinya hanya tebakan model, sehingga "selisih kiri-kanan" pada tampak samping adalah noise,
 * bukan ketidakseimbangan otot. Untuk latihan tersebut fungsi ini mengembalikan null (tampil "—").
 */
export function analyzeBilateralSymmetry(
  landmarks: NormalizedLandmark[],
  exerciseId?: string,
  frame: FrameSize = DEFAULT_FRAME
): BilateralSymmetry | null {
  if (exerciseId !== 'jumping_jack' || !landmarks || landmarks.length < 33) return null;

  const vis = (i: number) => landmarks[i].visibility ?? 0;
  if ([L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_HIP, R_HIP].some((i) => vis(i) < MIN_VIS)) return null;

  // Ruang piksel agar sudut tidak terdistorsi aspect ratio kamera.
  const p = toPixelSpace(landmarks, frame);
  const leftArm = calculateAngle(p[L_ELBOW], p[L_SHOULDER], p[L_HIP]);
  const rightArm = calculateAngle(p[R_ELBOW], p[R_SHOULDER], p[R_HIP]);

  // Lengan di samping badan (< 30°) belum bergerak: selisih kecil di sini tidak informatif.
  if (Math.max(leftArm, rightArm) < 30) return null;

  const diffDegrees = Math.round(Math.abs(leftArm - rightArm) * 10) / 10;
  const isImbalanced = diffDegrees > 15;
  const balanceScore = Math.max(0, Math.min(100, Math.round(100 - diffDegrees * 1.8)));

  return {
    leftAngle: Math.round(leftArm),
    rightAngle: Math.round(rightArm),
    diffDegrees,
    balanceScore,
    isImbalanced,
    // Sisi yang terangkat lebih rendah = sisi yang tertinggal.
    imbalancedSide: isImbalanced ? (leftArm < rightArm ? 'left' : 'right') : 'balanced',
    jointName: 'Lengan',
    feedbackMessage: isImbalanced
      ? `Lengan ${leftArm < rightArm ? 'kiri' : 'kanan'} terangkat lebih rendah`
      : 'Ayunan lengan seimbang',
  };
}

/** Akumulator skor simetri sesi. Null bila tidak ada sampel (bukan angka baseline karangan). */
export class AsymmetryAccumulator {
  private scores: number[] = [];
  private imbalancedCount = 0;

  addSample(symmetry: BilateralSymmetry | null | undefined): void {
    if (!symmetry) return;
    this.scores.push(symmetry.balanceScore);
    if (symmetry.isImbalanced) this.imbalancedCount++;
  }

  getAverageScore(): number | null {
    if (this.scores.length === 0) return null;
    return Math.round(this.scores.reduce((a, b) => a + b, 0) / this.scores.length);
  }

  getImbalancedCount(): number {
    return this.imbalancedCount;
  }

  reset(): void {
    this.scores = [];
    this.imbalancedCount = 0;
  }
}
