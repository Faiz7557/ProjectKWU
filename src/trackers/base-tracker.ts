import type { FrameSize, NormalizedLandmark, Point2D } from './types';

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

/** Default kamera getUserMedia (640x480). Dipakai bila pemanggil tidak memberi ukuran frame. */
export const DEFAULT_FRAME: FrameSize = { width: 640, height: 480 };

/**
 * Mengubah landmark ter-normalisasi (0..1) menjadi ruang piksel.
 * Tanpa ini, 1 satuan x dan 1 satuan y berbeda panjangnya (640 vs 480 px) dan sudut terdistorsi.
 */
export function toPixelSpace(
  landmarks: NormalizedLandmark[],
  frame: FrameSize = DEFAULT_FRAME
): NormalizedLandmark[] {
  return landmarks.map((lm) => ({
    x: lm.x * frame.width,
    y: lm.y * frame.height,
    z: lm.z * frame.width,
    visibility: lm.visibility,
  }));
}

/**
 * Deviasi bertanda titik tengah (pinggul) dari garis bahu-kaki, dinormalisasi panjang tubuh.
 * Positif = pinggul lebih rendah di layar (melorot / sag), negatif = lebih tinggi (pike).
 * Input harus sudah di ruang piksel.
 */
export function bodyDeviation(shoulder: Point2D, hip: Point2D, ankle: Point2D): number {
  const dx = ankle.x - shoulder.x;
  const dy = ankle.y - shoulder.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return 0;
  const t = ((hip.x - shoulder.x) * dx + (hip.y - shoulder.y) * dy) / lenSq;
  const lineY = shoulder.y + dy * t;
  const bodyLen = Math.sqrt(lenSq);
  return (hip.y - lineY) / bodyLen;
}

/** Sudut (derajat, 0-90) segmen a->b terhadap garis horizontal. 0 = mendatar, 90 = tegak. */
export function angleFromHorizontal(a: Point2D, b: Point2D): number {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/** Sudut (derajat, 0-180) antara dua vektor. */
export function angleBetweenVectors(v1: Point2D, v2: Point2D): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.sqrt(v1.x ** 2 + v1.y ** 2) * Math.sqrt(v2.x ** 2 + v2.y ** 2) + 1e-6;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return Math.acos(cos) * (180 / Math.PI);
}

/**
 * Pemilih sisi tubuh untuk tampak samping dengan histeresis: sisi baru hanya dipilih
 * jika visibility-nya unggul lebih dari `margin` dibanding sisi aktif.
 */
export class SideSelector {
  private active: 'left' | 'right' = 'left';

  constructor(private readonly margin: number = 0.15) {}

  choose(leftVis: number, rightVis: number): 'left' | 'right' {
    if (this.active === 'left' && rightVis - leftVis > this.margin) this.active = 'right';
    else if (this.active === 'right' && leftVis - rightVis > this.margin) this.active = 'left';
    return this.active;
  }

  reset(): void {
    this.active = 'left';
  }
}
