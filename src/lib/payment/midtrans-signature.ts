import crypto from 'crypto';

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
}

/**
 * Verifikasi signature notifikasi Midtrans: sha512(order_id + status_code + gross_amount + serverKey).
 * Fail-closed: tanpa server key, selalu false. Perbandingan constant-time.
 */
export function verifyMidtransSignature(
  notification: MidtransNotification,
  serverKey: string | undefined
): boolean {
  if (!serverKey) return false;
  if (typeof notification.signature_key !== 'string') return false;

  const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
  const expected = crypto.createHash('sha512').update(raw).digest('hex');

  const a = Buffer.from(notification.signature_key, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
