/**
 * Sumber tunggal harga paket. Dipakai route create (harga dikirim ke Midtrans)
 * dan halaman harga. Aktivasi mencocokkan nominal dengan kolom subscriptions.amount.
 */
export const PREMIUM_LIFETIME = { plan: 'lifetime', price: 50000 } as const;

/** Gerakan khusus Premium. Gerakan lain gratis. */
export const PREMIUM_EXERCISES: readonly string[] = ['plank', 'jumping_jack'];
export const isPremiumExercise = (id: string) => PREMIUM_EXERCISES.includes(id);

export type PaymentOutcome = 'paid' | 'failed' | 'pending';

/** Status transaksi Midtrans -> hasil bisnis. 'capture' hanya lunas bila fraud_status accept. */
export function mapOutcome(transactionStatus: string, fraudStatus?: string): PaymentOutcome {
  if (transactionStatus === 'settlement') return 'paid';
  if (transactionStatus === 'capture') return fraudStatus === 'accept' ? 'paid' : 'pending';
  if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) return 'failed';
  return 'pending';
}
