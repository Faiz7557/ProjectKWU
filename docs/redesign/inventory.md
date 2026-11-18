# Inventaris gaya SMART-FIT v2 (T0.2)

Dibuat: 2026-11-19. Mode: read-only (hanya dokumen ini yang ditulis).

## Ringkasan

**Cakupan:** `src/**/*.ts` dan `src/**/*.tsx`, tidak termasuk folder `__tests__` dan `src/lib/design/tokens.ts`. Bagian 1 juga tidak mencakup `src/app/globals.css` (di luar cakupan karena bukan ts/tsx). 78 file dianalisis.

**Metode:** `grep -E` / `grep -P`-style pada daftar file di atas. Angka = jumlah baris (kategori 1, 2, 4, 5) atau jumlah kemunculan kelas (kategori 3).

| Kategori | Total | File terdampak |
|---|---|---|
| 1a. Hex literal (`#xxx` / `#xxxxxx`), jumlah baris | 30 | 5 |
| 1b. `rgb(` / `rgba(` literal, jumlah baris | 22 | 3 |
| 1c. `hsl(` literal | 0 | 0 |
| 1 gabungan unik (hex atau rgb/rgba), jumlah baris | 51 | 5 |
| 1d. Literal RGB numerik jsPDF (`setXColor(n,n,n)` dan array warna), jumlah baris | 39 | 1 |
| 2. Kelas Tailwind warna mentah | 2 | 2 |
| 3. `rounded-*` | 95 | 26 |
| 3. `shadow-*` | 23 | 12 |
| 3. `font-(black/extrabold/bold/semibold/medium)` | 75 | 23 |
| 3. `font-mono` | 0 | 0 |
| 3. `uppercase` | 3 | 3 |
| 3. `tracking-*` | 10 | 7 |
| 3. `text-[...]` (ukuran arbitrer) | 0 | 0 |
| 3. `animate-*` | 15 | 12 |
| 4. Baris cocok pola tema (`data-theme`, `useThemePref`, dst.) | 25 | 5 |
| 5. Import `next/font` | 1 | 1 |
| 5. Pemakaian `Geist` / `--font-` | 4 baris | 1 |
| 5. `font-sans`, `Gabarito`, `Rethink` | 0 | 0 |

**5 file dengan temuan terbanyak.** Temuan = (1 gabungan unik + 1d) + 2 + jumlah kelas kategori 3 (rounded, shadow, font-weight, uppercase, tracking, animate; mono dan text-[] nol).

| Peringkat | File | Temuan | Rincian |
|---|---|---|---|
| 1 | `src/lib/reporting/pdf-generator.ts` | 39 | 1d: 39 baris |
| 2 | `src/components/camera/ReferencePoseVisualizer.tsx` | 27 | 1: 9 baris; 3: rounded 10, shadow 2, font-weight 5, tracking 1 |
| 3 (seri) | `src/lib/sharing/share-card.ts` | 23 | 1: 23 baris |
| 3 (seri) | `src/app/workout/routine/[routineId]/page.tsx` | 23 | 2: 1; 3: rounded 5, shadow 3, font-weight 10, tracking 3, animate 1 |
| 5 | `src/app/page.tsx` | 20 | 3: rounded 10, shadow 3, font-weight 4, uppercase 1, tracking 2 |

Catatan: `src/components/ui/Controls.tsx` (temuan 10) dan `src/lib/mediapipe/drawing-utils.ts` (16) berada di luar lima besar; `drawing-utils.ts` memiliki 16 baris kategori 1, `Controls.tsx` memiliki 1 baris kategori 2 dan 9 kelas kategori 3.

---

## 1. Literal warna di luar `tokens.ts` dan `globals.css`

### 1a/1b. Hex, rgb(), rgba() (canvas, metadata, dan script inline)

| File:baris | Nilai | Konteks |
|---|---|---|
| `src/app/layout.tsx:12` | `#09090B` | `viewport.themeColor` (metadata Next.js) |
| `src/app/layout.tsx:26` | `#F5F5F7`, `#09090B` | String script inline `themeInit` (dijalankan sebelum paint), set `meta[name="theme-color"]` |
| `src/lib/theme/use-theme.ts:14` | `#F5F5F7`, `#09090B` | `setAttribute('content', ...)` pada `meta[name="theme-color"]` |
| `src/components/camera/ReferencePoseVisualizer.tsx:45` | `#4da3ff` | Canvas: fallback `--accent-text` (`getPropertyValue(...) \|\| '#4da3ff'`) dan default |
| `src/components/camera/ReferencePoseVisualizer.tsx:59` | `rgba(30, 41, 59, 0.4)` | Canvas `strokeStyle` |
| `src/components/camera/ReferencePoseVisualizer.tsx:77` | `rgba(56, 189, 248, 0.9)` | Canvas `strokeStyle` (komentar "Neon cyan") |
| `src/components/camera/ReferencePoseVisualizer.tsx:81` | `rgba(56, 189, 248, 0.5)` | Canvas `shadowColor` |
| `src/components/camera/ReferencePoseVisualizer.tsx:108` | `rgba(255, 255, 255, 0.95)` | Canvas `fillStyle` |
| `src/components/camera/ReferencePoseVisualizer.tsx:129` | `rgba(250, 204, 21, 0.8)` | Canvas `strokeStyle` (komentar "Neon yellow") |
| `src/components/camera/ReferencePoseVisualizer.tsx:143` | `rgba(15, 23, 42, 0.85)` | Canvas `fillStyle` |
| `src/components/camera/ReferencePoseVisualizer.tsx:144` | `rgba(250, 204, 21, 0.7)` | Canvas `strokeStyle` |
| `src/components/camera/ReferencePoseVisualizer.tsx:155` | `#fef08a` | Canvas `fillStyle` |
| `src/lib/mediapipe/drawing-utils.ts:28` | `rgba(255, 23, 68, 0.95)`, `rgba(0, 230, 118, 0.85)` | Default parameter `boneColor` (cabang fault / normal) |
| `src/lib/mediapipe/drawing-utils.ts:29` | `rgba(255, 255, 255, 0.95)`, `#ff5252` | Default parameter `jointColor` |
| `src/lib/mediapipe/drawing-utils.ts:30` | `#ff1744`, `#00e5ff` | Default parameter `accentColor` |
| `src/lib/mediapipe/drawing-utils.ts:48` | `rgba(255, 23, 68, 0.6)` | Canvas `shadowColor` |
| `src/lib/mediapipe/drawing-utils.ts:68` | `#ff1744` | Canvas `strokeStyle` (cabang fault) |
| `src/lib/mediapipe/drawing-utils.ts:93` | `rgba(0, 0, 0, 0.8)` | Canvas `shadowColor` |
| `src/lib/mediapipe/drawing-utils.ts:176` | `rgba(192, 132, 252, 0.45)` | Canvas `strokeStyle` (ghost pose, komentar "Neon purple/violet") |
| `src/lib/mediapipe/drawing-utils.ts:179` | `rgba(168, 85, 247, 0.4)` | Canvas `shadowColor` |
| `src/lib/mediapipe/drawing-utils.ts:210` | `rgba(216, 180, 254, 0.7)` | Canvas `fillStyle` |
| `src/lib/mediapipe/drawing-utils.ts:235` | `rgba(15, 23, 42, 0.75)` | Canvas `fillStyle` |
| `src/lib/mediapipe/drawing-utils.ts:237` | `rgba(59, 130, 246, 0.4)` | Canvas `strokeStyle` |
| `src/lib/mediapipe/drawing-utils.ts:246` | `#38bdf8` | Canvas `strokeStyle` |
| `src/lib/mediapipe/drawing-utils.ts:248` | `#38bdf8` | Canvas `shadowColor` |
| `src/lib/mediapipe/drawing-utils.ts:254` | `#ffffff` | Canvas `fillStyle` |
| `src/lib/mediapipe/drawing-utils.ts:261` | `#38bdf8` | Canvas `fillStyle` |
| `src/lib/mediapipe/drawing-utils.ts:262` | `rgba(0, 0, 0, 0.9)` | Canvas `shadowColor` |
| `src/lib/sharing/share-card.ts:25` | `#020617` | Canvas gradient stop 0 (latar kartu bagikan) |
| `src/lib/sharing/share-card.ts:26` | `#0b1120` | Canvas gradient stop 0.5 |
| `src/lib/sharing/share-card.ts:27` | `#1e1b4b` | Canvas gradient stop 1 |
| `src/lib/sharing/share-card.ts:33` | `rgba(59, 130, 246, 0.15)` | Canvas gradient glow stop 0 |
| `src/lib/sharing/share-card.ts:34` | `rgba(59, 130, 246, 0)` | Canvas gradient glow stop 1 |
| `src/lib/sharing/share-card.ts:39` | `#334155` | Canvas `strokeStyle` |
| `src/lib/sharing/share-card.ts:44` | `#60a5fa` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:49` | `#94a3b8` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:54` | `#f8fafc` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:59` | `#2563eb` | Canvas `strokeStyle` |
| `src/lib/sharing/share-card.ts:71` | `#38bdf8` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:75` | `#94a3b8` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:84` | `rgba(15, 23, 42, 0.7)` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:86` | `#1e293b` | Canvas `strokeStyle` |
| `src/lib/sharing/share-card.ts:90` | `#10b981` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:93` | `#94a3b8` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:98` | `rgba(15, 23, 42, 0.7)` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:102` | `#fb923c` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:105` | `#94a3b8` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:114` | `rgba(15, 23, 42, 0.7)` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:118` | `#a855f7` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:121` | `#94a3b8` | Canvas `fillStyle` |
| `src/lib/sharing/share-card.ts:126` | `#64748b` | Canvas `fillStyle` |

`hsl(`: tidak ditemukan.

### 1d. Literal RGB numerik jsPDF (`src/lib/reporting/pdf-generator.ts`)

Bentuk ini (tiga angka desimal) tidak memakai `#`, `rgb(` atau `rgba(`, sehingga tidak tertangkap pola 1a/1b. Tercatat terpisah.

| Baris | Nilai RGB | Pemanggilan | Komentar di sumber |
|---|---|---|---|
| 43 | 15, 23, 42 | `setFillColor` | slate-950 (banner header) |
| 47 | 37, 99, 235 | `setFillColor` | blue-600 (garis aksen) |
| 51 | 255, 255, 255 | `setTextColor` | - |
| 58 | 148, 163, 184 | `setTextColor` | slate-400 |
| 63 | 203, 213, 225 | `setTextColor` | - |
| 66 | 56, 189, 248 | `setTextColor` | sky-400 |
| 71 | 15, 23, 42 | `setTextColor` | - |
| 79 | 100, 116, 139 | `setTextColor` | - |
| 116 | 248, 250, 252 | `setFillColor` | slate-50 |
| 117 | 226, 232, 240 | `setDrawColor` | slate-200 |
| 126 | 15, 23, 42 | `setTextColor` | - |
| 131 | 100, 116, 139 | `setTextColor` | - |
| 139 | 15, 23, 42 | `setTextColor` | - |
| 188 | 248, 250, 252 | `setFillColor` | - |
| 189 | 226, 232, 240 | `setDrawColor` | - |
| 194 | 100, 116, 139 | `setTextColor` | - |
| 204 | 71, 85, 105 | `setTextColor` | - |
| 212 | 15, 23, 42 | `setTextColor` | - |
| 221 | 241, 245, 249 | `setFillColor` | - |
| 225 | 71, 85, 105 | `setTextColor` | - |
| 232 | ternary: 255 atau 248, 250, 252 | `setFillColor` | selang-seling baris tabel |
| 237 | 15, 23, 42 | `setTextColor` | - |
| 242 | ternary: 220, 38, 38 atau 16, 185, 129 | `setTextColor` | status jumlah temuan |
| 245 | 71, 85, 105 | `setTextColor` | - |
| 254 | 238, 242, 255 | `setFillColor` | indigo-50 |
| 255 | 199, 210, 254 | `setDrawColor` | indigo-200 |
| 260 | 67, 56, 202 | `setTextColor` | indigo-700 |
| 265 | 30, 41, 59 | `setTextColor` | - |
| 276 | 226, 232, 240 | `setDrawColor` | - |
| 281 | 148, 163, 184 | `setTextColor` | - |
| 288 | 37, 99, 235 | `setTextColor` | - |
| 95 | 37, 99, 235 | array `color` metrik | blue |
| 100 | 16, 185, 129 | array `color` metrik | emerald |
| 105 | 99, 102, 241 | array `color` metrik | indigo |
| 110 | 249, 115, 22 | array `color` metrik | orange |
| 149 | 148, 163, 184 | `notMeasured` | - |
| 163 | ternary: 16, 185, 129 atau 234, 179, 8 | array `color` | - |
| 176 | ternary: 16, 185, 129 atau 239, 68, 68 | array `color` | - |
| 182 | 59, 130, 246 | array `color` | - |

Pemanggilan dengan nilai variabel (tidak literal): `pdf-generator.ts:121` (`setFillColor(m.color[0..2])`), `:199` (`setTextColor(s.color[0..2])`).

Komentar nama warna Tailwind tanpa nilai yang dipakai (baris): `pdf-generator.ts:43, 47, 58, 66, 116, 117, 254, 255, 260` (9 baris).

Font PDF (bukan warna): `pdf-generator.ts` memanggil `setFont('helvetica', ...)` pada 18 baris (52, 56, 72, 77, 124, 129, 137, 192, 197, 202, 210, 223, 235, 240, 258, 263, 279, 287).

---

## 2. Kelas Tailwind warna mentah (tanpa token)

Pola: `(bg|text|border|ring|from|to|via|fill|stroke|...)-(slate|gray|...|white|black)`. Hasil: 2 baris.

| File:baris | Kelas | Konteks |
|---|---|---|
| `src/app/workout/routine/[routineId]/page.tsx:506` | `fill-white` | `<Play className="w-4 h-4 fill-white" />` |
| `src/components/ui/Controls.tsx:73` | `bg-white` | String kelas thumb (`block size-[27px] rounded-full bg-white shadow-1 ...`) |

Tidak ditemukan: `bg-[#...]`, `text-[rgb...]`, dan kelas arbitrer warna lain pada cakupan.

---

## 3. Hitungan per file (kategori Tailwind)

Varian yang ditemukan:
- `rounded-*`: full 34, md 25, sm 15, lg 11, xl 4, xs 3, polos `rounded` 2, `rounded-t-xl` 1.
- `shadow-*`: `shadow-1` 8, `shadow-lg` 4, `shadow-xl` 3, `shadow-3` 3, `shadow-2xl` 2, `shadow-sm` 1, `shadow-md` 1, `shadow-2` 1.
- `font-*` berat: semibold 41, bold 20, medium 14 (total 75). `font-normal` 2 (tidak termasuk kolom, di luar daftar).
- `cn.ts:9` memuat string `'font-size'` sebagai kunci konfigurasi tailwind-merge, bukan kelas. Tidak dihitung.

| File | rounded | shadow | font-weight | font-mono | uppercase | tracking | text-[] | animate |
|---|---|---|---|---|---|---|---|---|
| `src/app/history/page.tsx` | 4 | 0 | 6 | 0 | 0 | 0 | 0 | 0 |
| `src/app/page.tsx` | 10 | 3 | 4 | 0 | 1 | 2 | 0 | 0 |
| `src/app/workout/[exercise]/page.tsx` | 1 | 0 | 3 | 0 | 0 | 1 | 0 | 0 |
| `src/app/workout/page.tsx` | 4 | 1 | 2 | 0 | 0 | 0 | 0 | 3 |
| `src/app/workout/routine/[routineId]/page.tsx` | 5 | 3 | 10 | 0 | 0 | 3 | 0 | 1 |
| `src/components/camera/CameraFeed.tsx` | 6 | 5 | 4 | 0 | 0 | 0 | 0 | 1 |
| `src/components/camera/CameraGuide.tsx` | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| `src/components/camera/EnvironmentCheck.tsx` | 3 | 0 | 2 | 0 | 1 | 1 | 0 | 1 |
| `src/components/camera/ReferencePoseVisualizer.tsx` | 10 | 2 | 5 | 0 | 0 | 1 | 0 | 0 |
| `src/components/ui/Button.tsx` | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| `src/components/ui/Controls.tsx` | 5 | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| `src/components/ui/Dialog.tsx` | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| `src/components/ui/ErrorState.tsx` | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `src/components/ui/ExerciseIcon.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `src/components/ui/Nav.tsx` | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| `src/components/ui/PrivacyBadge.tsx` | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| `src/components/ui/Surfaces.tsx` | 4 | 1 | 3 | 0 | 0 | 0 | 0 | 0 |
| `src/components/ui/Toast.tsx` | 3 | 1 | 1 | 0 | 0 | 0 | 0 | 1 |
| `src/components/workout/CircuitProgress.tsx` | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| `src/components/workout/CountdownOverlay.tsx` | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 2 |
| `src/components/workout/CustomRoutineBuilder.tsx` | 8 | 0 | 6 | 0 | 0 | 0 | 0 | 0 |
| `src/components/workout/RestTimer.tsx` | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 1 |
| `src/components/workout/SessionSummary.tsx` | 5 | 0 | 7 | 0 | 1 | 1 | 0 | 1 |
| `src/components/workout/ShareButton.tsx` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| `src/components/workout/SymmetryIndicator.tsx` | 4 | 2 | 6 | 0 | 0 | 1 | 0 | 0 |
| `src/components/workout/WorkoutHUD.tsx` | 2 | 1 | 2 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **95** | **23** | **75** | **0** | **3** | **10** | **0** | **15** |
| **File terdampak** | 26 | 12 | 23 | 0 | 3 | 7 | 0 | 12 |

Catatan: `font-mono` dan `text-[...]` tidak ditemukan. Kata "monospace" muncul dua kali di `drawing-utils.ts:91` dan `:253` sebagai string font canvas, bukan kelas Tailwind.

---

## 4. Penggunaan tema

Baris yang cocok pola (`data-theme`, `useThemePref`, `ThemeToggle`, `ThemeSwitcher`, `getThemePref`, `smartfit-theme`, `themeColor`, `theme-color`), plus baris terkait tanpa nama pola (ditandai).

| File:baris | Konteks |
|---|---|
| `src/app/layout.tsx:12` | `viewport.themeColor: '#09090B'` |
| `src/app/layout.tsx:23` | String inline `themeInit`, baca `localStorage.getItem('smartfit-theme')` |
| `src/app/layout.tsx:24` | Inline: `matchMedia('(prefers-color-scheme: light)')` untuk pilihan `system` |
| `src/app/layout.tsx:25` | (terkait) Inline: `d.dataset.theme=t; d.style.colorScheme=t` |
| `src/app/layout.tsx:26` | Inline: set `meta[name="theme-color"]` ke `#F5F5F7` / `#09090B` |
| `src/app/layout.tsx:35` | `<html data-theme="dark" suppressHydrationWarning>` |
| `src/app/page.tsx:5` | `import { ThemeToggle } from '@/components/ui/Nav'` |
| `src/app/page.tsx:43` | `<ThemeToggle />` dipakai di halaman |
| `src/app/page.tsx:71` | `data-theme="dark"` pada blok pratinjau dekoratif (`aria-hidden`) |
| `src/components/camera/ReferencePoseVisualizer.tsx:7` | `import { useThemePref }` |
| `src/components/camera/ReferencePoseVisualizer.tsx:26` | `const theme = useThemePref();` (dependensi effect di baris 159) |
| `src/components/ui/Nav.tsx:7` | `import { resolveTheme, setThemePref, useThemePref, type ThemePref }` |
| `src/components/ui/Nav.tsx:80` | Komentar header `ThemeSwitcher` |
| `src/components/ui/Nav.tsx:87` | `export function ThemeSwitcher()` (tidak dipakai di cakupan ts/tsx) |
| `src/components/ui/Nav.tsx:88` | `useThemePref()` di ThemeSwitcher |
| `src/components/ui/Nav.tsx:94` | `onValueChange={setThemePref}` |
| `src/components/ui/Nav.tsx:100` | `export function ThemeToggle()` |
| `src/components/ui/Nav.tsx:101` | `useThemePref()` di ThemeToggle |
| `src/components/ui/Nav.tsx:102` | (terkait) `resolveTheme(pref)` |
| `src/components/ui/Nav.tsx:107` | `onClick={() => setThemePref(next)}` |
| `src/lib/theme/use-theme.ts:5` | `const KEY = 'smartfit-theme'` |
| `src/lib/theme/use-theme.ts:6` | `matchMedia('(prefers-color-scheme: light)')` |
| `src/lib/theme/use-theme.ts:7` | (terkait) `export const resolveTheme` |
| `src/lib/theme/use-theme.ts:10` | (terkait) `apply()` memanggil `resolveTheme` |
| `src/lib/theme/use-theme.ts:12` | (terkait) `d.dataset.theme = t` |
| `src/lib/theme/use-theme.ts:14` | `meta[name="theme-color"]` set ke `#F5F5F7` / `#09090B` |
| `src/lib/theme/use-theme.ts:17` | (terkait) `prefers-reduced-motion` untuk melewati transisi |
| `src/lib/theme/use-theme.ts:18` | (terkait) `document.startViewTransition(swap)` |
| `src/lib/theme/use-theme.ts:23` | `export function setThemePref` |
| `src/lib/theme/use-theme.ts:28` | `export const getThemePref` (default `'dark'`) |
| `src/lib/theme/use-theme.ts:33` | `getThemePref()` di `subscribe` |
| `src/lib/theme/use-theme.ts:45` | `export const useThemePref` (`useSyncExternalStore`) |

Tidak ditemukan pemakaian `ThemeSwitcher` di luar `Nav.tsx`. Berkas uji `src/lib/theme/__tests__/use-theme.test.ts` tidak dicakup. `globals.css` (sumber `[data-theme]` selector) tidak dicakup.

---

## 5. Font: `next/font` dan variabel font

| File:baris | Isi |
|---|---|
| `src/app/layout.tsx:2` | `import { Geist } from 'next/font/google';` |
| `src/app/layout.tsx:6` | `const geistSans = Geist({` |
| `src/app/layout.tsx:7` | `variable: '--font-geist-sans',` |
| `src/app/layout.tsx:35` | `className={\`${geistSans.variable} h-full\`}` pada `<html>` |

Hasil lain dalam cakupan:
- `font-sans`: 0 baris.
- `Gabarito`, `Rethink`: 0 baris.
- `--font-` selain `layout.tsx:7`: 0 baris.
- `fontFamily` / `variable:` lain: 0 baris.
- `next/font` lain: 0 baris (import hanya di `layout.tsx:2`).

Pemakaian `--font-geist-sans` di `globals.css` tidak dicari (di luar cakupan).

---

## Catatan metode

- Angka kategori 1 dihitung per baris. Satu baris dengan dua nilai dihitung satu kali di kolom baris, dua kali di kolom nilai (hanya dicatat sebagai dua nilai).
- Angka kategori 3 dihitung per kemunculan kelas. Kelas diawali spasi, tanda kutip, backtick, `{`, `:`, atau `(`. Kelas yang diawali karakter lain (mis. `drop-shadow-*`, `text-shadow`, identifier `shadowColor`) tidak dihitung. Tidak ada `drop-shadow-*` pada cakupan.
- Kategori 2 hanya mengikuti pola yang diberikan. Komentar pdf dan nama tier `'silver'` (`gamification/achievements.ts`, `gamification/types.ts`) bukan kelas warna dan tidak dicatat.
- Repositori bukan git. Tidak ada perubahan selain `docs/redesign/inventory.md`. Folder `docs/redesign/baseline` sudah ada sebelumnya dan tidak disentuh.
