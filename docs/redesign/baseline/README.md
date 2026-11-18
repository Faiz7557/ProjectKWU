# Baseline Screenshot SMART-FIT v2 (sebelum redesign)

Screenshot full-page dari dev server `http://localhost:3000` sebelum redesign.

## Metode

- Route: `/`, `/workout`, `/workout/pushup`, `/workout/routine/full-body-burn`, `/history`
- Ukuran: 375x812 (emulasi mobile dengan touch) dan 1440x900 (desktop)
- Tema: `localStorage['smartfit-theme']` diset ke `light` atau `dark` sebelum tiap navigasi. Atribut `data-theme` di `<html>` terkonfirmasi sesuai untuk tiap screenshot.
- Tombol kamera tidak diklik. Hanya tampilan awal route.

## Daftar file

| Slug | 375 light | 375 dark | 1440 light | 1440 dark |
|---|---|---|---|---|
| home | `home-375-light.png` | `home-375-dark.png` | `home-1440-light.png` | `home-1440-dark.png` |
| workout | `workout-375-light.png` | `workout-375-dark.png` | `workout-1440-light.png` | `workout-1440-dark.png` |
| exercise-pushup | `exercise-pushup-375-light.png` | `exercise-pushup-375-dark.png` | `exercise-pushup-1440-light.png` | `exercise-pushup-1440-dark.png` |
| routine-full-body-burn | `routine-full-body-burn-375-light.png` | `routine-full-body-burn-375-dark.png` | `routine-full-body-burn-1440-light.png` | `routine-full-body-burn-1440-dark.png` |
| history | `history-375-light.png` | `history-375-dark.png` | `history-1440-light.png` | `history-1440-dark.png` |

Semua file berada di folder ini.

## Catatan

- Semua 5 route dan 4 kombinasi ukuran/tema berhasil dimuat. Tidak ada route yang error.
- Console: tidak ada error. Hanya satu warning berulang di `/workout/pushup` dan `/workout/routine/full-body-burn` (semua ukuran dan tema): `W1118 ... gl_context.cc:1119] OpenGL error checking is disabled`. Berasal dari WebGL/kamera, bukan dari kode app. Route `/`, `/workout`, dan `/history` bersih.
- Tidak ada horizontal overflow terdeteksi: `scrollWidth` sama dengan lebar viewport di 375. Di 1440 nilainya 1425 pada beberapa halaman karena scrollbar vertikal, bukan overflow.
- Percobaan pertama memakai `resize_page`, dan lebar 1440 hanya tercapai 1283px. Semua screenshot diambil ulang memakai `emulate` (viewport exact), jadi file di folder ini adalah versi final.
- Pemeriksaan visual: `exercise-pushup-375-dark.png` dibaca dan layout terlihat utuh. Badge dev Next.js (lingkaran "N") terlihat di pojok kiri bawah. Itu artefak dev mode, bukan bagian desain.
