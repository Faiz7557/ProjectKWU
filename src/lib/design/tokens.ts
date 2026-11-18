// Nilai warna untuk renderer non-DOM (canvas, share card, PDF).
// Harus sama dengan custom properties di src/app/globals.css — dijaga oleh tokens.test.ts.

export const light = {
  canvas: '#f4f1ee',
  surface: '#ebe6e1',
  surface2: '#e2dcd6',
  surface3: '#d8d0c9',
  separator: 'rgb(0 0 0 / 0.10)',
  borderStrong: 'rgb(0 0 0 / 0.20)',
  text: '#0b0a0a',
  text2: '#4a4542',
  text3: '#5c5651',
  accent: '#cf6224',
  onAccent: '#0b0a0a',
  accentText: '#9b3418',
  accentSoft: 'rgb(207 98 36 / 0.10)',
  success: '#2a5c4d',
  warning: '#7a5200',
  danger: '#a1221b',
  onSuccess: '#f4f1ee',
  onDanger: '#f4f1ee',
  dataKcal: '#9b3418',
  dataSym: '#7a4a6c',
  dataXp: '#5a3cd4',
  dataReps: '#4a2fb8',
  dataForm: '#2a5c4d',
  dataStreak: '#7a5200',
  focusRing: '#5a3cd4',
} as const;

export const dark = {
  canvas: '#0b0a0a',
  surface: '#161414',
  surface2: '#1f1c1c',
  surface3: '#2a2626',
  separator: 'rgb(255 255 255 / 0.08)',
  borderStrong: 'rgb(255 255 255 / 0.16)',
  text: '#f4f1ee',
  text2: '#b8b0aa',
  text3: '#a39b95',
  accent: '#cf6224',
  onAccent: '#0b0a0a',
  accentText: '#e8814a',
  accentSoft: 'rgb(207 98 36 / 0.14)',
  success: '#80a89b',
  warning: '#e3b867',
  danger: '#ff6b4a',
  onSuccess: '#0b0a0a',
  onDanger: '#0b0a0a',
  dataKcal: '#e8814a',
  dataSym: '#c9a3bf',
  dataXp: '#9d8cf0',
  dataReps: '#9d8cf0',
  dataForm: '#80a89b',
  dataStreak: '#e3b867',
  focusRing: '#e3b867',
} as const;

// Palet panel Sill (sama di kedua tema); urutan = --panel-1..8.
export const panels = [
  { bg: '#cf6224', on: '#0b0a0a' },
  { bg: '#6e1116', on: '#f4f1ee' },
  { bg: '#5a3cd4', on: '#f4f1ee' },
  { bg: '#bca59d', on: '#0b0a0a' },
  { bg: '#a97d9c', on: '#0b0a0a' },
  { bg: '#9b3418', on: '#f4f1ee' },
  { bg: '#80a89b', on: '#0b0a0a' },
  { bg: '#e3b867', on: '#0b0a0a' },
] as const;

// Panggung kamera: selalu gelap, tidak ikut tema (UI_UX_BRIEF §4.4).
export const stage = {
  bg: '#000000',
  bone: 'rgba(128, 168, 155, 0.95)',
  boneFault: '#ff6b4a',
  joint: 'rgba(255, 255, 255, 0.95)',
  focusJoint: '#e3b867',
  ghost: 'rgba(157, 140, 240, 0.45)',
  labelText: '#FFFFFF',
  labelBg: 'rgba(0, 0, 0, 0.55)',
  material: 'rgba(20, 20, 23, 0.62)',
} as const;

export const themeColor = { light: '#f4f1ee', dark: '#0b0a0a' } as const;
