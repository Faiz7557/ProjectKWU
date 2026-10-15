// Kamus label state tracker -> bahasa Indonesia sehari-hari (UI_UX_BRIEF §2.5 #30 dan §4.4).
// State mentah (down, squatting, dst.) tidak pernah ditampilkan langsung ke pengguna.
export const STATE_LABEL: Record<string, string> = {
  idle: 'Siap',
  pause: 'Jeda',
  top: 'Atas',
  bottom: 'Bawah',
  up: 'Naik',
  down: 'Turun',
  standing: 'Berdiri',
  squatting: 'Jongkok',
  plank: 'Plank',
  lying: 'Berbaring',
  crunched: 'Angkat',
  open: 'Terbuka',
  closed: 'Tertutup',
  holding: 'Tahan',
};

// State yang berarti "sedang di posisi gerakan" (dipakai untuk warna badge).
export const ACTIVE_STATES = new Set(['down', 'squatting', 'crunched', 'open', 'holding', 'bottom', 'plank']);

export function stateLabel(state: string): string {
  return STATE_LABEL[state] ?? 'Siap';
}
