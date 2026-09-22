import type { NormalizedLandmark } from '@/trackers/types';

export type GestureType = 'none' | 'raise_hand' | 'cross_arms' | 'thumbs_up';
export type GestureAction = 'none' | 'toggle_pause' | 'finish_workout' | 'confirm';

export interface GestureDetectionResult {
  activeGesture: GestureType;
  progress: number; // 0.0 sampai 1.0
  triggeredAction: GestureAction;
  targetPoint?: { x: number; y: number }; // Koordinat relatif (0-1) untuk menggambar indikator lingkaran
  label?: string;
}

// Landmark indices MediaPipe BlazePose
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_INDEX = 19;
const RIGHT_INDEX = 20;
const LEFT_THUMB = 21;
const RIGHT_THUMB = 22;

function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export class HandsFreeGestureDetector {
  private activeGesture: GestureType = 'none';
  private gestureStartTime: number = 0;
  private lastTriggeredTime: number = 0;
  private readonly COOLDOWN_MS = 2500; // Jeda 2.5 detik agar tidak memicu berulang

  private readonly RAISE_HAND_HOLD_MS = 1400; // Tahan 1.4 detik
  private readonly CROSS_ARMS_HOLD_MS = 1800; // Tahan 1.8 detik
  private readonly THUMBS_UP_HOLD_MS = 1400;  // Tahan 1.4 detik

  public processLandmarks(landmarks: NormalizedLandmark[], now: number): GestureDetectionResult {
    if (!landmarks || landmarks.length < 33) {
      this.reset();
      return { activeGesture: 'none', progress: 0, triggeredAction: 'none' };
    }

    // Cek cooldown jika sebelumnya sudah pernah memicu aksi
    if (this.lastTriggeredTime > 0 && now - this.lastTriggeredTime < this.COOLDOWN_MS) {
      return { activeGesture: 'none', progress: 0, triggeredAction: 'none' };
    }

    const nose = landmarks[NOSE];
    const lShoulder = landmarks[LEFT_SHOULDER];
    const rShoulder = landmarks[RIGHT_SHOULDER];
    const lWrist = landmarks[LEFT_WRIST];
    const rWrist = landmarks[RIGHT_WRIST];
    const lThumb = landmarks[LEFT_THUMB];
    const rThumb = landmarks[RIGHT_THUMB];
    const lIndex = landmarks[LEFT_INDEX];
    const rIndex = landmarks[RIGHT_INDEX];

    let detected: GestureType = 'none';
    let targetPoint: { x: number; y: number } | undefined;
    let label = '';

    // 1. Deteksi Silang Tangan (CROSS ARMS) -> FINISH
    // Pergelangan kiri dekat bahu kanan DAN pergelangan kanan dekat bahu kiri
    const dShoulders = distance(lShoulder, rShoulder);
    const dLeftWristToRightShoulder = distance(lWrist, rShoulder);
    const dRightWristToLeftShoulder = distance(rWrist, lShoulder);

    if (
      dShoulders > 0.1 &&
      (lWrist.visibility ?? 1) > 0.5 &&
      (rWrist.visibility ?? 1) > 0.5 &&
      dLeftWristToRightShoulder < 0.22 &&
      dRightWristToLeftShoulder < 0.22 &&
      lWrist.x > rWrist.x
    ) {
      detected = 'cross_arms';
      targetPoint = {
        x: (lWrist.x + rWrist.x) / 2,
        y: (lWrist.y + rWrist.y) / 2,
      };
      label = 'Selesaikan Sesi (Tangan Menyilang)';
    }

    // 2. Deteksi Angkat Tangan (RAISE HAND) -> TOGGLE PAUSE/RESUME
    // Salah satu tangan terangkat di atas kepala atau jauh di atas bahu
    if (detected === 'none') {
      const isLeftHandRaised =
        (lWrist.visibility ?? 1) > 0.5 &&
        (lWrist.y < nose.y || lWrist.y < lShoulder.y - 0.2);

      const isRightHandRaised =
        (rWrist.visibility ?? 1) > 0.5 &&
        (rWrist.y < nose.y || rWrist.y < rShoulder.y - 0.2);

      if (isLeftHandRaised) {
        detected = 'raise_hand';
        targetPoint = { x: lWrist.x, y: lWrist.y };
        label = 'Jeda / Lanjut Latihan';
      } else if (isRightHandRaised) {
        detected = 'raise_hand';
        targetPoint = { x: rWrist.x, y: rWrist.y };
        label = 'Jeda / Lanjut Latihan';
      }
    }

    // 3. Deteksi Jempol ke Atas (THUMBS UP) -> CONFIRM
    if (detected === 'none') {
      const isLeftThumbUp =
        (lThumb.visibility ?? 1) > 0.5 &&
        lThumb.y < lWrist.y &&
        lThumb.y < lIndex.y - 0.04;

      const isRightThumbUp =
        (rThumb.visibility ?? 1) > 0.5 &&
        rThumb.y < rWrist.y &&
        rThumb.y < rIndex.y - 0.04;

      if (isLeftThumbUp) {
        detected = 'thumbs_up';
        targetPoint = { x: lThumb.x, y: lThumb.y };
        label = 'Konfirmasi / Lewati';
      } else if (isRightThumbUp) {
        detected = 'thumbs_up';
        targetPoint = { x: rThumb.x, y: rThumb.y };
        label = 'Konfirmasi / Lewati';
      }
    }

    // Evaluasi Durasi Penahanan
    if (detected !== 'none') {
      if (this.activeGesture !== detected) {
        this.activeGesture = detected;
        this.gestureStartTime = now;
      }

      const elapsed = now - this.gestureStartTime;
      const targetDuration =
        detected === 'cross_arms'
          ? this.CROSS_ARMS_HOLD_MS
          : detected === 'raise_hand'
          ? this.RAISE_HAND_HOLD_MS
          : this.THUMBS_UP_HOLD_MS;

      const progress = Math.min(1.0, elapsed / targetDuration);

      if (progress >= 1.0) {
        this.lastTriggeredTime = now;
        this.reset();

        let triggeredAction: GestureAction = 'none';
        if (detected === 'raise_hand') triggeredAction = 'toggle_pause';
        else if (detected === 'cross_arms') triggeredAction = 'finish_workout';
        else if (detected === 'thumbs_up') triggeredAction = 'confirm';

        return {
          activeGesture: detected,
          progress: 1.0,
          triggeredAction,
          targetPoint,
          label,
        };
      }

      return {
        activeGesture: detected,
        progress,
        triggeredAction: 'none',
        targetPoint,
        label,
      };
    } else {
      this.reset();
      return { activeGesture: 'none', progress: 0, triggeredAction: 'none' };
    }
  }

  public reset(): void {
    this.activeGesture = 'none';
    this.gestureStartTime = 0;
  }
}
