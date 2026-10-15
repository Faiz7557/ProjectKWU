/**
 * Sumber tunggal harga & durasi paket. Dipakai route create (harga dikirim ke Midtrans)
 * dan webhook (cek nominal yang dibayar & hitung masa berlaku).
 */
export const PLANS = {
  monthly: { price: 29000, durationDays: 30 },
  yearly: { price: 249000, durationDays: 365 },
} as const;

export type PlanId = keyof typeof PLANS;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLANS, value);
}
