import { PREMIUM_LIFETIME } from '@/lib/payment/plans';

const idr = new Intl.NumberFormat('id-ID');
export const rupiah = (n: number) => `Rp${idr.format(n)}`;

// Harga dari PREMIUM_LIFETIME (src/lib/payment/plans.ts), satu-satunya sumber.
// Daftar fitur harus sama dengan gating di kode (useEntitlement + PremiumLock).
export const PRICING = {
  free: {
    name: 'Akun Gratis',
    blurb: 'Buka di browser dan langsung mulai latihan.',
    features: [
      '5 gerakan: push-up, squat, sit-up, jumping jack, plank',
      'Hitung rep otomatis dan koreksi form real-time',
      'Pelatih suara, metronom, dan perintah suara',
      'Riwayat latihan 7 hari terakhir',
    ],
  },
  paid: {
    name: 'Akun Premium',
    blurb: 'Sekali bayar, aktif seumur hidup. Tanpa langganan bulanan.',
    price: rupiah(PREMIUM_LIFETIME.price),
    features: [
      'Semua fitur Akun Gratis',
      'Program sirkuit siap pakai dan pembuat program sendiri',
      'Analisis lanjutan: tempo, simetri kiri-kanan, target adaptif',
      'Ekspor laporan sesi ke PDF',
      'Riwayat latihan lengkap tanpa batas waktu',
    ],
  },
};
