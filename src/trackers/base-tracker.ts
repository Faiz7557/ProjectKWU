import type { NormalizedLandmark, Point2D } from './types';

/**
 * 1€ (One-Euro) Filter: Adaptive Low-Pass Filter untuk data sinyal real-time.
 * Mereduksi jitter saat gerakan statis/lambat dan meminimalkan lag saat gerakan cepat.
 * Referensi: Casiez et al., CHI 2012.
 */
export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  /**
   * @param minCutoff Frekuensi cutoff minimum (Hz). Nilai lebih kecil = lebih halus/kurang jitter.
   * @param beta Koefisien adaptasi kecepatan. Nilai lebih besar = responsif saat gerakan cepat.
   * @param dCutoff Cutoff frekuensi turunan.
   */
  constructor(
    private readonly minCutoff: number = 1.0,
    private readonly beta: number = 0.007,
    private readonly dCutoff: number = 1.0
  ) {}

  private smoothingFactor(dt: number, cutoff: number): number {
    const r = 2 * Math.PI * cutoff * dt;
    return r / (r + 1);
  }

  /**
   * Filter 1 titik skalar (koordinat x, y, atau z)
   * @param value Nilai mentah
   * @param timestamp Waktu dalam detik (misal performance.now() / 1000)
   */
  filter(value: number, timestamp: number): number {
    if (this.tPrev === null || timestamp === this.tPrev) {
      this.xPrev = value;
      this.tPrev = timestamp;
      return value;
    }

    const dt = Math.max(timestamp - this.tPrev, 1e-4);
    this.tPrev = timestamp;

    // Filter derivative sinyal
    const alphaD = this.smoothingFactor(dt, this.dCutoff);
    const dx = (value - this.xPrev!) / dt;
    this.dxPrev = alphaD * dx + (1 - alphaD) * this.dxPrev;

    // Cutoff dinamis berdasarkan kecepatan gerak
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dxPrev);
    const alpha = this.smoothingFactor(dt, cutoff);

    this.xPrev = alpha * value + (1 - alpha) * this.xPrev!;
    return this.xPrev;
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

/**
 * Pengelola filter independen untuk seluruh 33 landmark (x, y, z) MediaPipe BlazePose.
 * Total 33 × 3 = 99 filter instances terisolasi.
 */
export class LandmarkSmoother {
  private filters: OneEuroFilter[][] = [];

  constructor(
    numLandmarks: number = 33,
    minCutoff: number = 1.0,
    beta: number = 0.007
  ) {
    for (let i = 0; i < numLandmarks; i++) {
      this.filters.push([
        new OneEuroFilter(minCutoff, beta), // x
        new OneEuroFilter(minCutoff, beta), // y
        new OneEuroFilter(minCutoff, beta), // z
      ]);
    }
  }

  /**
   * Menerapkan smoothing pada seluruh landmark
   * @param landmarks Array 33 NormalizedLandmark mentah dari MediaPipe
   * @param timestamp Detik (performance.now() / 1000)
   */
  smooth(
    landmarks: NormalizedLandmark[],
    timestamp: number
  ): NormalizedLandmark[] {
    return landmarks.map((lm, i) => {
      if (i >= this.filters.length) return lm;
      return {
        x: this.filters[i][0].filter(lm.x, timestamp),
        y: this.filters[i][1].filter(lm.y, timestamp),
        z: this.filters[i][2].filter(lm.z, timestamp),
        visibility: lm.visibility,
      };
    });
  }

  reset(): void {
    for (const group of this.filters) {
      for (const filter of group) {
        filter.reset();
      }
    }
  }
}

/**
 * Menghitung sudut dalam derajat [0 - 180] dari 3 titik 2D.
 * Sudut dihitung di titik tengah B (vertex).
 *
 *     A
 *      \   angle
 *       B -------> C
 */
export function calculateAngle(a: Point2D, b: Point2D, c: Point2D): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };

  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);

  const cosAngle = dot / (magBA * magBC + 1e-6);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));

  return Math.acos(clampedCos) * (180 / Math.PI);
}

/**
 * Memvalidasi apakah landmark kunci yang dibutuhkan oleh gerakan terlihat jelas.
 */
export function checkLandmarkVisibility(
  landmarks: NormalizedLandmark[],
  requiredIndices: number[],
  threshold: number = 0.5
): { isVisible: boolean; avgVisibility: number } {
  if (!landmarks || landmarks.length === 0) {
    return { isVisible: false, avgVisibility: 0 };
  }

  let total = 0;
  let missing = 0;

  for (const idx of requiredIndices) {
    const lm = landmarks[idx];
    const vis = lm?.visibility ?? 0;
    total += vis;
    if (vis < threshold) {
      missing++;
    }
  }

  const avg = total / Math.max(requiredIndices.length, 1);
  return {
    isVisible: missing === 0,
    avgVisibility: avg,
  };
}

/**
 * Menghitung jarak Euclidean 2D antara dua titik.
 */
export function distance2D(a: Point2D, b: Point2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
