// Gerakan ikon 3D (hasil kurasi find-animation-opportunities, lihat REDESIGN_PLAN "Ikon 3D").
// Fungsi murni: progress 0..1 -> pose. Semua gerakan (kecuali 'tick' yang kumulatif) mulai dan berakhir di pose diam.

export type IconMotion =
  | 'lift' // push-up: dumbel naik turun satu rep
  | 'dip' // squat: turun lalu naik
  | 'crunch' // sit-up: condong ke depan
  | 'hop' // jumping jack: lompat kecil
  | 'spin' // plank: timer berputar sekali
  | 'waves' // demo suara: busur gelombang berdenyut
  | 'shake' // demo getar: HP bergoyang dua hentakan
  | 'tick' // metronom: jarum loncat satu ketukan
  | 'flash'; // pengganti semua gerakan saat reduced motion

export const MOTION_MS: Record<IconMotion, number> = {
  lift: 640,
  dip: 640,
  crunch: 640,
  hop: 640,
  spin: 640,
  waves: 1080,
  shake: 440,
  tick: 120,
  flash: 200,
};

export interface IconPose {
  y: number;
  rx: number;
  ry: number;
  rz: number;
  sy: number;
  /** 0..1: campuran warna aksen (flash). */
  glow: number;
  /** Skala per bagian SVG (indeks elemen). */
  partScale: Record<number, number>;
  /** Rotasi Z tambahan per bagian SVG, radian. */
  partRz: Record<number, number>;
}

export const REST: IconPose = { y: 0, rx: 0, ry: 0, rz: 0, sy: 1, glow: 0, partScale: {}, partRz: {} };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const sineInOut = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
// --ease-out-soft cubic-bezier(0.23, 1, 0.32, 1) didekati quint out (cukup untuk 120-180 ms).
const outSoft = (p: number) => 1 - (1 - p) ** 5;
const bump = (p: number) => Math.sin(Math.PI * clamp01(p)); // 0 -> 1 -> 0

/** Bagian yang dianimasikan, dalam urutan elemen ikon lucide. */
export const MOTION_PARTS = {
  waves: [1, 2], // Volume2: speaker, gelombang kecil, gelombang besar
  tickHand: 1, // Timer: tombol atas, jarum, lingkaran
} as const;

/**
 * Pose pada progress p (0..1). `step` dipakai metronom: jumlah ketukan sebelumnya,
 * agar jarum melanjutkan dari posisi terakhir.
 */
export function iconPose(m: IconMotion, p: number, step = 0): IconPose {
  const t = clamp01(p);
  const pose: IconPose = { ...REST, partScale: {}, partRz: {} };
  switch (m) {
    case 'lift': {
      const v = bump(sineInOut(t));
      pose.y = 0.14 * v;
      pose.rz = -0.15 * v;
      break;
    }
    case 'dip': {
      const v = bump(sineInOut(t));
      pose.y = -0.12 * v;
      pose.sy = 1 - 0.08 * v;
      break;
    }
    case 'crunch':
      pose.rx = -0.5 * bump(sineInOut(t));
      break;
    case 'hop': {
      const v = bump(sineInOut(t));
      pose.y = 0.2 * v;
      pose.sy = 1 + 0.06 * v;
      break;
    }
    case 'spin':
      pose.ry = 2 * Math.PI * sineInOut(t);
      break;
    case 'waves': {
      // 3 siklus x 360 ms; gelombang kecil 0-180 ms, besar 90-270 ms dalam tiap siklus.
      const ms = t * MOTION_MS.waves;
      const local = ms % 360;
      const [small, big] = MOTION_PARTS.waves;
      pose.partScale[small] = 1 + 0.12 * bump(local / 180);
      pose.partScale[big] = 1 + 0.12 * bump((local - 90) / 180);
      break;
    }
    case 'shake': {
      // 2 hentakan (4 osilasi x 40 ms = 160 ms), jeda 120 ms: total 440 ms.
      const ms = t * MOTION_MS.shake;
      const inBurst = ms < 160 || (ms >= 280 && ms < 440);
      const local = ms < 160 ? ms : ms - 280;
      pose.rz = inBurst ? ((6 * Math.PI) / 180) * Math.sin((local / 40) * 2 * Math.PI) : 0;
      break;
    }
    case 'tick':
      pose.partRz[MOTION_PARTS.tickHand] = -(Math.PI / 2) * (step + outSoft(t));
      pose.sy = 1 - 0.04 * bump(t);
      break;
    case 'flash':
      pose.glow = bump(t);
      break;
  }
  return pose;
}
