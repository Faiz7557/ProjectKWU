import { PLANS } from '@/lib/payment/plans';

const idr = new Intl.NumberFormat('id-ID');
export const rupiah = (n: number) => `Rp${idr.format(n)}`;

// Harga dari PLANS (src/lib/payment/plans.ts), satu-satunya sumber.
export const PRICING = {
  free: {
    name: 'Akun Gratis',
    blurb: 'Buka di browser dan langsung mulai latihan.',
    // ASK(tim): isi fitur paket, jangan dikarang
    features: [] as string[],
  },
  paid: {
    name: 'Akun Berbayar',
    blurb: 'Pilih bayar per bulan atau per tahun.',
    monthly: rupiah(PLANS.monthly.price),
    yearly: rupiah(PLANS.yearly.price),
    // ASK(tim): isi fitur paket, jangan dikarang
    features: [] as string[],
  },
};
