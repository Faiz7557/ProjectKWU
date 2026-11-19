export type TourStep = {
  /** Nilai data-tour yang dibingkai. Kosong = kartu di tengah layar. */
  target?: string;
  title: string;
  body: string;
  /** Lanjut otomatis saat elemen yang dibingkai ditekan. */
  waitForClick?: boolean;
  padding?: number;
};

/** Memetakan pathname ke kunci panduan; null = tidak ada panduan (termasuk `/` dan `/dev/*`). */
export function tourKey(pathname: string | null): string | null {
  if (!pathname) return null;
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (p === '/workout') return '/workout';
  if (p === '/history') return '/history';
  const parts = p.split('/');
  if (parts[1] !== 'workout') return null;
  if (parts.length === 3 && parts[2] !== 'routine') return '/workout/[exercise]';
  if (parts.length === 4 && parts[2] === 'routine') return '/workout/routine/[routineId]';
  return null;
}

// Atribut data-tour dipasang di Gelombang 4. Tiap target diberi komentar elemen yang harus ditandai.
export const STEPS: Record<string, TourStep[]> = {
  '/workout': [
    {
      title: 'Selamat datang di SMART-FIT',
      body: 'Pilih gerakan, nyalakan kamera, dan hitung repetisi secara otomatis. Semua diproses di perangkatmu, video tidak dikirim ke server.',
    },
    {
      // src/app/workout/page.tsx: <SegmentedControl label="Jenis latihan"> (tab Gerakan / Program), bungkus dengan div data-tour
      target: 'wk-tabs',
      title: 'Gerakan atau Program',
      body: 'Gerakan melatih satu jenis latihan. Program adalah sirkuit beberapa gerakan dengan jeda istirahat otomatis, atau buat versi kamu sendiri.',
    },
    {
      // src/app/workout/page.tsx: <li> kartu gerakan pertama (tab Gerakan)
      target: 'wk-card',
      title: 'Pilih satu gerakan',
      body: 'Tekan kartu untuk membuka persiapan latihan. Tertera juga apakah kamera ditaruh di depan atau di samping tubuh.',
    },
    {
      // src/app/workout/page.tsx: <Badge> "Target N rep/detik" pada kartu gerakan pertama
      target: 'wk-target',
      title: 'Target yang menyesuaikan',
      body: 'Target naik atau turun mengikuti hasil latihan sebelumnya, jadi selalu pas dengan kemampuanmu.',
    },
    {
      // src/app/workout/page.tsx: <Link href="/history"> "Lihat riwayat dan progres"
      target: 'wk-history',
      title: 'Riwayat dan progres',
      body: 'Lihat streak, level, pencapaian, dan semua sesi yang pernah kamu selesaikan.',
    },
  ],
  '/workout/[exercise]': [
    {
      // src/components/camera/CameraGuide.tsx: <SegmentedControl label="Panduan"> (bungkus dengan div data-tour)
      target: 'ex-guide-tabs',
      title: 'Contoh gerakan dan posisi kamera',
      body: 'Tab Contoh gerakan memperlihatkan bentuk yang benar. Tab Posisi kamera menjelaskan jarak dan arah kamera, dan memastikan videomu tidak dikirim ke mana pun.',
    },
    {
      // src/components/camera/CameraGuide.tsx: <ReferencePoseVisualizer> (bungkus dengan div data-tour), tampil di tab Contoh gerakan
      target: 'ex-reference',
      title: 'Tiru animasi ini',
      body: 'Animasi kerangka menunjukkan gerakan dari awal sampai akhir. Perhatikan sudut sendi dan tempo sebelum mulai.',
    },
    {
      // src/components/camera/CameraGuide.tsx: <Button> "Nyalakan kamera"
      target: 'ex-start',
      title: 'Nyalakan kamera',
      body: 'Browser akan meminta izin kamera. Setelah itu ada pengecekan posisi dan hitung mundur sebelum latihan dimulai.',
    },
    {
      title: 'Kontrol tanpa menyentuh layar',
      body: 'Saat latihan berjalan, angkat satu tangan untuk jeda atau lanjut, dan silangkan kedua lengan di dada untuk menyelesaikan latihan.',
    },
  ],
  '/workout/routine/[routineId]': [
    {
      // src/app/workout/routine/[routineId]/page.tsx: div daftar "Urutan Sirkuit" (fase overview)
      target: 'rt-steps',
      title: 'Urutan sirkuit',
      body: 'Setiap baris adalah satu gerakan lengkap dengan target repetisi atau durasi, serta lama istirahat sesudahnya.',
    },
    {
      // src/app/workout/routine/[routineId]/page.tsx: <button onClick={handleStartRoutine}> "Mulai Sirkuit Sekarang"
      target: 'rt-start',
      title: 'Mulai sirkuit',
      body: 'Kamera dinyalakan dan program berjalan dari gerakan pertama. Pergantian gerakan dan istirahat berlangsung otomatis.',
    },
    {
      title: 'Kontrol dengan gestur',
      body: 'Selama latihan, angkat satu tangan untuk jeda atau lanjut, dan silangkan kedua lengan untuk menyelesaikan.',
    },
  ],
  '/history': [
    {
      // src/app/history/page.tsx: <Card> "Streak harian" (grid pertama, kartu kiri)
      target: 'hs-streak',
      title: 'Streak harian',
      body: 'Berapa hari berturut-turut kamu berlatih, beserta rekor terpanjangmu. Latihan sekali sehari cukup untuk menjaganya.',
    },
    {
      // src/app/history/page.tsx: <Card> "Level dan XP" (grid pertama, kartu kanan)
      target: 'hs-level',
      title: 'Level dan XP',
      body: 'Setiap sesi memberi XP. Kumpulkan XP untuk naik level, bilah progres menunjukkan seberapa dekat level berikutnya.',
    },
    {
      // src/app/history/page.tsx: <Card> "Pencapaian"
      target: 'hs-badges',
      title: 'Pencapaian',
      body: 'Lencana terbuka saat kamu mencapai tonggak tertentu. Yang masih terkunci memperlihatkan apa yang bisa dikejar berikutnya.',
    },
    {
      // src/app/history/page.tsx: <div> grid ringkasan (Total rep, durasi, kalori, ...)
      target: 'hs-stats',
      title: 'Ringkasan latihan',
      body: 'Total repetisi, durasi, dan kalori dari semua sesi. Di bawahnya ada daftar sesi yang bisa disaring per gerakan.',
    },
  ],
};

/** Daftar target per halaman, diturunkan dari STEPS (untuk pemeriksaan di Gelombang 4). */
export const TOUR_TARGETS: Record<string, string[]> = Object.fromEntries(
  Object.entries(STEPS).map(([k, s]) => [k, s.flatMap((x) => (x.target ? [x.target] : []))]),
);
