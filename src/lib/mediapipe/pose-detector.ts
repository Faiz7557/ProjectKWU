import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

let detectorPromise: Promise<PoseLandmarker> | null = null;
let detectorInstance: PoseLandmarker | null = null;

/**
 * Inisialisasi PoseLandmarker MediaPipe WebAssembly di browser (client-side).
 * Menggunakan delegate GPU (WebGL) jika didukung perangkat, atau fallback otomatis ke CPU.
 */
export async function getPoseDetector(): Promise<PoseLandmarker> {
  if (detectorInstance) {
    return detectorInstance;
  }

  if (!detectorPromise) {
    detectorPromise = (async () => {
      // Inisialisasi WASM runtime dari CDN resmi MediaPipe
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Buat instance landmarker dengan model lite lokal
      detectorInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/pose_landmarker_lite.task',
          delegate: 'GPU', // WebGL GPU acceleration
        },
        runningMode: 'VIDEO',
        numPoses: 1, // Otomatis mengunci subjek paling dominan
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      return detectorInstance;
    })();
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
