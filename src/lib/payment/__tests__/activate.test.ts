import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { applyPaymentResult } from '../activate';
import { mapOutcome } from '../plans';

/** Fake minimal rantai query Supabase: satu baris subscription + satu profil. */
function fakeAdmin(sub: { id: string; user_id: string; status: string; amount: number | null } | null) {
  const db = { sub: sub ? { ...sub } : null, tier: 'free' };
  const chain = (table: string) => {
    let patch: Record<string, unknown> | null = null;
    const filters: Array<(row: Record<string, unknown>) => boolean> = [];
    const run = () => {
      if (table === 'profiles') {
        if (patch) db.tier = patch.subscription_tier as string;
        return { data: null, error: null };
      }
      const row = db.sub as Record<string, unknown> | null;
      const hit = row && filters.every((f) => f(row));
      if (patch && hit) Object.assign(row, patch);
      return { data: hit ? (patch ? [row] : row) : patch ? [] : null, error: null };
    };
    const q = {
      select: () => q,
      update: (p: Record<string, unknown>) => ((patch = p), q),
      eq: (k: string, v: unknown) => (k === 'midtrans_order_id' ? q : (filters.push((r) => r[k] === v), q)),
      in: (k: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[k])), q),
      maybeSingle: async () => run(),
      then: (res: (v: unknown) => void) => res(run()),
    };
    return q;
  };
  return { admin: { from: chain } as unknown as SupabaseClient, db };
}

const paid = { order_id: 'SMARTFIT-1', transaction_status: 'settlement', gross_amount: '50000.00' };

describe('payment activation', () => {
  it('maps Midtrans statuses', () => {
    expect(mapOutcome('settlement')).toBe('paid');
    expect(mapOutcome('capture', 'accept')).toBe('paid');
    expect(mapOutcome('capture', 'challenge')).toBe('pending');
    expect(mapOutcome('expire')).toBe('failed');
    expect(mapOutcome('pending')).toBe('pending');
  });

  it('activates premium once for the exact amount', async () => {
    const { admin, db } = fakeAdmin({ id: 's1', user_id: 'u1', status: 'pending', amount: 50000 });
    expect(await applyPaymentResult(admin, paid)).toBe('activated');
    expect(db.tier).toBe('premium');
    expect(db.sub?.status).toBe('active');
    expect(await applyPaymentResult(admin, paid)).toBe('already_active');
  });

  it('rejects a wrong amount without activating', async () => {
    const { admin, db } = fakeAdmin({ id: 's1', user_id: 'u1', status: 'pending', amount: 50000 });
    expect(await applyPaymentResult(admin, { ...paid, gross_amount: '1000.00' })).toBe('amount_mismatch');
    expect(db.tier).toBe('free');
  });

  it('cancels on expire and ignores unknown orders', async () => {
    const { admin, db } = fakeAdmin({ id: 's1', user_id: 'u1', status: 'pending', amount: 50000 });
    expect(await applyPaymentResult(admin, { ...paid, transaction_status: 'expire' })).toBe('cancelled');
    expect(db.sub?.status).toBe('cancelled');
    expect(await applyPaymentResult(fakeAdmin(null).admin, paid)).toBe('unknown_order');
  });
});
