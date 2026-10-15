import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyMidtransSignature } from '../midtrans-signature';

const SERVER_KEY = 'SB-Mid-server-test-key';

function sign(orderId: string, statusCode: string, gross: string, key = SERVER_KEY): string {
  return crypto.createHash('sha512').update(`${orderId}${statusCode}${gross}${key}`).digest('hex');
}

const base = { order_id: 'SMARTFIT-TEST-1', status_code: '200', gross_amount: '29000.00', transaction_status: 'settlement' };

describe('verifyMidtransSignature', () => {
  it('accepts a correctly signed notification', () => {
    const n = { ...base, signature_key: sign(base.order_id, base.status_code, base.gross_amount) };
    expect(verifyMidtransSignature(n, SERVER_KEY)).toBe(true);
  });

  it('rejects a tampered amount', () => {
    const n = { ...base, gross_amount: '1.00', signature_key: sign(base.order_id, base.status_code, base.gross_amount) };
    expect(verifyMidtransSignature(n, SERVER_KEY)).toBe(false);
  });

  it('fails closed when the server key is missing (fail-open bug S1)', () => {
    const n = { ...base, signature_key: sign(base.order_id, base.status_code, base.gross_amount, '') };
    expect(verifyMidtransSignature(n, undefined)).toBe(false);
    expect(verifyMidtransSignature(n, '')).toBe(false);
  });

  it('rejects a signature of a different length without throwing', () => {
    const n = { ...base, signature_key: 'short' };
    expect(verifyMidtransSignature(n, SERVER_KEY)).toBe(false);
  });
});
