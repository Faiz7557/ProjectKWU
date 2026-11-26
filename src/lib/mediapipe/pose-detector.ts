import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

let detectorPromise: Promise<PoseLandmarker> | null = null;
let detectorInstance: PoseLandmarker | null = null;

export const WEBGL_UNAVAILABLE_MESSAGE =
  'WebGL tidak tersedia di browser ini, jadi deteksi pose tidak bisa berjalan. ' +
  'Aktifkan "Use graphics acceleration when available" di pengaturan browser, lalu muat ulang halaman.';

export const LITE_MODEL = '/models/pose_landmarker_lite.task';
export const FULL_MODEL = '/models/pose_landmarker_full.task';

/**
 * Model "full" lebih akurat untuk siku/pergelangan tampak samping, tapi ~2x lebih berat.
 * Dipakai hanya bila file-nya disediakan di /public/models DAN perangkat cukup kuat; selain itu lite.
 * ponytail: heuristik statis (jumlah core + RAM); turunkan ke lite saat runtime bila FPS < 20 jika perlu.
 */
export function prefersFullModel(cores: number | undefined, memoryGb: number | undefined): boolean {
  return (cores ?? 0) >= 6 && (memoryGb ?? 8) >= 4;
}

async function pickModel(): Promise<string> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (!prefersFullModel(nav.hardwareConcurrency, nav.deviceMemory)) return LITE_MODEL;
  try {
    return (await fetch(FULL_MODEL, { method: 'HEAD' })).ok ? FULL_MODEL : LITE_MODEL;
  } catch {
    return LITE_MODEL;
  }
}

async function createDetector(delegate: 'GPU' | 'CPU', modelAssetPath: string): Promise<PoseLandmarker> {
  // WASM runtime self-hosted dari paket yang di-pin (lihat scripts/sync-mediapipe-wasm.mjs).
  const vision = await FilesetResolver.forVisionTasks('/wasm');
  return PoseLandmarker.createFromOptions(vision, {
    // Canvas DOM biasa, bukan OffscreenCanvas default MediaPipe: beberapa browser memblokir
    // WebGL di OffscreenCanvas, dan begini cek hasWebGL() memakai jenis canvas yang sama.
    // Ini juga alasan inferensi tidak dipindah ke Web Worker (worker hanya punya OffscreenCanvas).
    canvas: document.createElement('canvas'),
    baseOptions: {
      modelAssetPath,
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1, // Otomatis mengunci subjek paling dominan
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

// tasks-vision mengunggah setiap frame input lewat tekstur WebGL, BAHKAN pada delegate CPU.
// Tanpa WebGL, model termuat tapi tiap frame gagal ("reading 'activeTexture'") -> 0 FPS diam-diam.
function hasWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    return !!(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

// TFLite mencetak log INFO ke stderr -> console.error; bukan error, jangan tampil sebagai "Issue".
// ponytail: filter global satu pola; hapus bila MediaPipe berhenti mencetak INFO ke stderr.
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('INFO: Created TensorFlow Lite')) return;
    originalError(...args);
  };
}

/**
 * Inisialisasi PoseLandmarker MediaPipe WebAssembly di browser (client-side).
 * Coba delegate GPU dulu; MediaPipe TIDAK fallback sendiri, jadi bila gagal kita ulangi dengan CPU.
 */
export async function getPoseDetector(): Promise<PoseLandmarker> {
  if (detectorInstance) {
    return detectorInstance;
  }

  if (!detectorPromise) {
    detectorPromise = (async () => {
      if (!hasWebGL()) {
        throw new Error(WEBGL_UNAVAILABLE_MESSAGE);
      }
      const model = await pickModel();
      try {
        detectorInstance = await createDetector('GPU', model);
      } catch (gpuErr) {
        console.warn('GPU delegate gagal, fallback ke CPU + model lite:', gpuErr);
        // Tanpa GPU, model full terlalu berat untuk real-time.
        detectorInstance = await createDetector('CPU', LITE_MODEL);
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

/** Detector yang sudah termuat, atau null. Untuk loop per-frame: jangan memicu (ulang) pemuatan tiap frame. */
export function getLoadedPoseDetector(): PoseLandmarker | null {
  return detectorInstance;
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
