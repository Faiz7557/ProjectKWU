// Nilai warna untuk renderer non-DOM (canvas, share card, PDF).
// Harus sama dengan custom properties di src/app/globals.css — dijaga oleh tokens.test.ts.

export const dark = {
  canvas: '#09090b',
  surface: '#141417',
  surface2: '#1c1c21',
  surface3: '#26262c',
  separator: 'rgb(255 255 255 / 0.08)',
  borderStrong: 'rgb(255 255 255 / 0.16)',
  text: '#f5f5f7',
  text2: '#a1a1aa',
  text3: '#93939c',
  accent: '#0a6cff',
  onAccent: '#ffffff',
  accentText: '#4da3ff',
  accentSoft: 'rgb(10 108 255 / 0.16)',
  success: '#30d158',
  warning: '#ffb340',
  danger: '#ff6961',
  onSuccess: '#000000',
  onDanger: '#000000',
  dataKcal: '#ff9f0a',
  dataSym: '#5ac8fa',
  dataXp: '#a78bfa',
  focusRing: '#4da3ff',
} as const;

export const light = {
  canvas: '#f5f5f7',
  surface: '#ffffff',
  surface2: '#ffffff',
  surface3: '#e8e8ed',
  separator: 'rgb(0 0 0 / 0.08)',
  borderStrong: 'rgb(0 0 0 / 0.16)',
  text: '#1d1d1f',
  text2: '#4b4b52',
  text3: '#636368',
  accent: '#0066d6',
  onAccent: '#ffffff',
  accentText: '#0060c7',
  accentSoft: 'rgb(0 102 214 / 0.10)',
  success: '#1a7431',
  warning: '#a15200',
  danger: '#c4171d',
  onSuccess: '#ffffff',
  onDanger: '#ffffff',
  dataKcal: '#a44300',
  dataSym: '#00708a',
  dataXp: '#6d3fd1',
  focusRing: '#0060c7',
} as const;

// Panggung kamera: selalu gelap, tidak ikut tema (UI_UX_BRIEF §4.4).
export const stage = {
  bg: '#000000',
  bone: 'rgba(48, 209, 88, 0.9)',
  boneFault: 'rgba(255, 105, 97, 0.95)',
  joint: 'rgba(255, 255, 255, 0.95)',
  focusJoint: '#4DA3FF',
  ghost: 'rgba(167, 139, 250, 0.45)',
  labelText: '#FFFFFF',
  labelBg: 'rgba(0, 0, 0, 0.55)',
  material: 'rgba(20, 20, 23, 0.62)',
} as const;

export const themeColor = { dark: '#09090B', light: '#F5F5F7' } as const;
