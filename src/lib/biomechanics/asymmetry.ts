import type { NormalizedLandmark, BilateralSymmetry } from '@/trackers/types';
import { calculateAngle } from '@/trackers/base-tracker';

/**
 * Menganalisis simetri bilateral (kiri vs kanan) secara real-time dari 33 landmark BlazePose.
 * Mendeteksi ketidakseimbangan tumpuan beban (muscle imbalance) yang berpotensi memicu cedera sendi.
 */
export function analyzeBilateralSymmetry(
  landmarks: NormalizedLandmark[],
  exerciseId?: string
): BilateralSymmetry | null {
  if (!landmarks || landmarks.length < 33) return null;

  // Landmark indices
  const L_SHOULDER = 11;
  const R_SHOULDER = 12;
  const L_ELBOW = 13;
  const R_ELBOW = 14;
  const L_WRIST = 15;
  const R_WRIST = 16;
  const L_HIP = 23;
  const R_HIP = 24;
  const L_KNEE = 25;
  const R_KNEE = 26;
  const L_ANKLE = 27;
  const R_ANKLE = 28;

  const minVis = 0.35;

  if (exerciseId === 'squat') {
    // Analisis Fleksi Lutut Kiri vs Kanan pada Squat
    const lVis = (landmarks[L_HIP].visibility ?? 1) * (landmarks[L_KNEE].visibility ?? 1) * (landmarks[L_ANKLE].visibility ?? 1);
    const rVis = (landmarks[R_HIP].visibility ?? 1) * (landmarks[R_KNEE].visibility ?? 1) * (landmarks[R_ANKLE].visibility ?? 1);

    if (lVis < minVis || rVis < minVis) return null;

    const leftKneeAngle = calculateAngle(landmarks[L_HIP], landmarks[L_KNEE], landmarks[L_ANKLE]);
    const rightKneeAngle = calculateAngle(landmarks[R_HIP], landmarks[R_KNEE], landmarks[R_ANKLE]);

    const diffDegrees = Math.round(Math.abs(leftKneeAngle - rightKneeAngle) * 10) / 10;
    const isImbalanced = diffDegrees > 12; // Ambang batas 12 derajat toleransi
    const balanceScore = Math.max(50, Math.min(100, Math.round(100 - diffDegrees * 2.2)));

    let imbalancedSide: 'left' | 'right' | 'balanced' = 'balanced';
    let feedbackMessage = 'Beban kedua kaki seimbang';

    if (isImbalanced) {
      if (leftKneeAngle < rightKneeAngle) {
        imbalancedSide = 'left';
        feedbackMessage = 'Lutut kiri turun lebih dalam dari kanan';
      } else {
        imbalancedSide = 'right';
        feedbackMessage = 'Lutut kanan turun lebih dalam dari kiri';
      }
    }

    return {
      leftAngle: Math.round(leftKneeAngle),
      rightAngle: Math.round(rightKneeAngle),
      diffDegrees,
      balanceScore,
      isImbalanced,
      imbalancedSide,
      jointName: 'Lutut',
      feedbackMessage,
    };
  }

  if (exerciseId === 'pushup' || exerciseId === 'plank') {
    // Analisis Fleksi Siku Kiri vs Kanan pada Push-up / Plank
    const lVis = (landmarks[L_SHOULDER].visibility ?? 1) * (landmarks[L_ELBOW].visibility ?? 1) * (landmarks[L_WRIST].visibility ?? 1);
    const rVis = (landmarks[R_SHOULDER].visibility ?? 1) * (landmarks[R_ELBOW].visibility ?? 1) * (landmarks[R_WRIST].visibility ?? 1);

    if (lVis < minVis || rVis < minVis) return null;

    const leftElbowAngle = calculateAngle(landmarks[L_SHOULDER], landmarks[L_ELBOW], landmarks[L_WRIST]);
    const rightElbowAngle = calculateAngle(landmarks[R_SHOULDER], landmarks[R_ELBOW], landmarks[R_WRIST]);

    const diffDegrees = Math.round(Math.abs(leftElbowAngle - rightElbowAngle) * 10) / 10;
    const isImbalanced = diffDegrees > 14;
    const balanceScore = Math.max(50, Math.min(100, Math.round(100 - diffDegrees * 2.0)));

    let imbalancedSide: 'left' | 'right' | 'balanced' = 'balanced';
    let feedbackMessage = 'Tekanan lengan seimbang';

    if (isImbalanced) {
      if (leftElbowAngle < rightElbowAngle) {
        imbalancedSide = 'left';
        feedbackMessage = 'Siku kiri menekuk lebih dalam';
      } else {
        imbalancedSide = 'right';
        feedbackMessage = 'Siku kanan menekuk lebih dalam';
      }
    }

    return {
      leftAngle: Math.round(leftElbowAngle),
      rightAngle: Math.round(rightElbowAngle),
      diffDegrees,
      balanceScore,
      isImbalanced,
      imbalancedSide,
      jointName: 'Siku',
      feedbackMessage,
    };
  }

  if (exerciseId === 'jumping_jack') {
    // Analisis Elevasi Bahu/Lengan Kiri vs Kanan pada Jumping Jack
    const lVis = (landmarks[L_ELBOW].visibility ?? 1) * (landmarks[L_SHOULDER].visibility ?? 1) * (landmarks[L_HIP].visibility ?? 1);
    const rVis = (landmarks[R_ELBOW].visibility ?? 1) * (landmarks[R_SHOULDER].visibility ?? 1) * (landmarks[R_HIP].visibility ?? 1);

    if (lVis < minVis || rVis < minVis) return null;

    const leftArmAngle = calculateAngle(landmarks[L_ELBOW], landmarks[L_SHOULDER], landmarks[L_HIP]);
    const rightArmAngle = calculateAngle(landmarks[R_ELBOW], landmarks[R_SHOULDER], landmarks[R_HIP]);

    const diffDegrees = Math.round(Math.abs(leftArmAngle - rightArmAngle) * 10) / 10;
    const isImbalanced = diffDegrees > 15;
    const balanceScore = Math.max(50, Math.min(100, Math.round(100 - diffDegrees * 1.8)));

    return {
      leftAngle: Math.round(leftArmAngle),
      rightAngle: Math.round(rightArmAngle),
      diffDegrees,
      balanceScore,
      isImbalanced,
      imbalancedSide: isImbalanced ? (leftArmAngle < rightArmAngle ? 'left' : 'right') : 'balanced',
      jointName: 'Lengan',
      feedbackMessage: isImbalanced ? 'Rentang ayunan lengan tidak seimbang' : 'Ayunan lengan seimbang',
    };
  }

  // Fallback: Analisis bahu/torso umum
  const shoulderDiff = Math.abs(landmarks[L_SHOULDER].y - landmarks[R_SHOULDER].y);
  const diffDeg = Math.round(shoulderDiff * 100);
  const isImbalanced = diffDeg > 8;
  const balanceScore = Math.max(60, Math.min(100, Math.round(100 - diffDeg * 3)));

  return {
    leftAngle: Math.round(landmarks[L_SHOULDER].y * 100),
    rightAngle: Math.round(landmarks[R_SHOULDER].y * 100),
    diffDegrees: diffDeg,
    balanceScore,
    isImbalanced,
    imbalancedSide: isImbalanced ? (landmarks[L_SHOULDER].y > landmarks[R_SHOULDER].y ? 'left' : 'right') : 'balanced',
    jointName: 'Bahu',
    feedbackMessage: isImbalanced ? 'Posisi bahu miring' : 'Kesejajaran bahu baik',
  };
}

/**
 * Akumulator metrik simetri untuk menghitung skor rata-rata sesi latihan
 */
export class AsymmetryAccumulator {
  private scores: number[] = [];
  private imbalancedCount = 0;

  addSample(symmetry: BilateralSymmetry | null | undefined): void {
    if (!symmetry) return;
    this.scores.push(symmetry.balanceScore);
    if (symmetry.isImbalanced) {
      this.imbalancedCount++;
    }
  }

  getAverageScore(): number {
    if (this.scores.length === 0) return 96; // baseline default
    const sum = this.scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.scores.length);
  }

  getImbalancedCount(): number {
    return this.imbalancedCount;
  }

  reset(): void {
    this.scores = [];
    this.imbalancedCount = 0;
  }
}
