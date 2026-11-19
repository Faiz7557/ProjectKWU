import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

let detectorPromise: Promise<PoseLandmarker> | null = null;
let detectorInstance: PoseLandmarker | null = null;

async function createDetector(delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  // WASM runtime self-hosted dari paket yang di-pin (lihat scripts/sync-mediapipe-wasm.mjs).
  const vision = await FilesetResolver.forVisionTasks('/wasm');
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/models/pose_landmarker_lite.task',
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1, // Otomatis mengunci subjek paling dominan
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

/**
 * Inisialisasi PoseLandmarker MediaPipe WebAssembly di browser (client-side).
 * Coba delegate GPU (WebGL) dulu; MediaPipe TIDAK fallback sendiri, jadi bila gagal
 * (WebGL diblokir, driver/GPU tidak didukung) kita ulangi dengan CPU.
 */
export async function getPoseDetector(): Promise<PoseLandmarker> {
  if (detectorInstance) {
    return detectorInstance;
  }

  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        detectorInstance = await createDetector('GPU');
      } catch (gpuErr) {
        console.warn('GPU delegate gagal, fallback ke CPU:', gpuErr);
        detectorInstance = await createDetector('CPU');
      }
      return detectorInstance;
    })().catch((err) => {
      // Jangan cache promise yang gagal: percobaan berikutnya harus bisa memuat ulang.
      detectorPromise = null;
      throw err;
    });
  }

  return detectorPromise;
}

/**
 * Tutup dan bersihkan resource WebGL/WASM saat komponen dilepas.
 */
export function releasePoseDetector(): void {
  if (detectorInstance) {
    try {
      detectorInstance.close();
    } catch (e) {
      console.warn('Error closing pose detector instance:', e);
    }
    detectorInstance = null;
    detectorPromise = null;
  }
}
