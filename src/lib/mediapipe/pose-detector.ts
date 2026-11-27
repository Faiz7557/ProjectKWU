import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

let detectorPromise: Promise<PoseLandmarker> | null = null;
let detectorInstance: PoseLandmarker | null = null;
let activeModel: string | null = null;

export const WEBGL_UNAVAILABLE_MESSAGE =
  'WebGL tidak tersedia di browser ini, jadi deteksi pose tidak bisa berjalan. ' +
  'Aktifkan "Use graphics acceleration when available" di pengaturan browser, lalu muat ulang halaman.';

export const LITE_MODEL = '/models/pose_landmarker_lite.task';
export const FULL_MODEL = '/models/pose_landmarker_full.task';

/**
 * Model "full" lebih akurat untuk siku/pergelangan tampak samping, tapi ~2x lebih berat.
 * Dipakai hanya bila file-nya disediakan di /public/models DAN perangkat cukup kuat; selain itu lite.
 * Heuristik awal (core + RAM); bila FPS nyata tetap rendah, usePoseDetection memanggil downgradeToLite().
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
      let detector: PoseLandmarker;
      try {
        detector = await createDetector('GPU', model);
        activeModel = model;
      } catch (gpuErr) {
        console.warn('GPU delegate gagal, fallback ke CPU + model lite:', gpuErr);
        // Tanpa GPU, model full terlalu berat untuk real-time.
        detector = await createDetector('CPU', LITE_MODEL);
        activeModel = LITE_MODEL;
      }
      warmUp(detector);
      detectorInstance = detector;
      return detector;
    })().catch((err) => {
      // Jangan cache promise yang gagal: percobaan berikutnya harus bisa memuat ulang.
      detectorPromise = null;
      throw err;
    });
  }

  return detectorPromise;
}

/**
 * Satu inferensi kosong segera setelah model dimuat. Inferensi pertama mengompilasi shader GPU
 * (±0.3-1 dtk); tanpa ini kompilasi terjadi tepat saat latihan dimulai dan layar membeku.
 * Dijalankan saat halaman masih di fase panduan, jadi biayanya tidak terasa.
 */
function warmUp(detector: PoseLandmarker): void {
  try {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 256, 256);
    }
    detector.detectForVideo(c, performance.now());
  } catch (e) {
    console.warn('Warm-up model gagal (diabaikan):', e);
  }
}

/** Model yang sedang dipakai (null bila belum termuat). */
export function getActiveModel(): string | null {
  return detectorInstance ? activeModel : null;
}

/**
 * Ganti ke model lite saat runtime (FPS terlalu rendah dengan model full).
 * Selama penggantian detector bernilai null, jadi loop per-frame melewati frame dengan aman.
 */
export async function downgradeToLite(): Promise<void> {
  if (!detectorInstance || activeModel === LITE_MODEL) return;
  const old = detectorInstance;
  detectorInstance = null;
  try {
    old.close();
  } catch {
    // diabaikan
  }
  detectorPromise = null;
  try {
    const lite = await createDetector('GPU', LITE_MODEL);
    activeModel = LITE_MODEL;
    warmUp(lite);
    detectorInstance = lite;
    detectorPromise = Promise.resolve(lite);
  } catch (e) {
    console.warn('Gagal beralih ke model lite, memuat ulang:', e);
    await getPoseDetector().catch(() => {});
  }
}

/**
 * Muat runtime WASM + model di latar saat browser idle (dipanggil dari halaman pemilihan gerakan).
 * Detector adalah singleton modul, jadi halaman latihan langsung memakai instance yang sudah
 * termuat dan di-warm-up, tanpa menunggu ±20 MB unduhan + kompilasi saat tombol mulai ditekan.
 */
export function preloadPoseDetector(): () => void {
  if (typeof window === 'undefined' || detectorInstance || detectorPromise) return () => {};
  const run = () => void getPoseDetector().catch(() => {});
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(run, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(run, 1500);
  return () => clearTimeout(id);
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
