import type { SupabaseClient } from '@supabase/supabase-js';
import { mapOutcome } from './plans';

export interface PaymentResult {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  gross_amount: string;
}

export type ApplyResult = 'activated' | 'already_active' | 'cancelled' | 'pending' | 'unknown_order' | 'amount_mismatch';

/**
 * Terapkan hasil pembayaran ke DB. Dipakai webhook (notifikasi bertanda tangan) dan
 * route verify (status ditarik dari API Midtrans). Idempotent: aman dipanggil berulang.
 * Input HARUS dari sumber tepercaya (signature valid atau API Midtrans), bukan dari klien.
 */
export async function applyPaymentResult(admin: SupabaseClient, result: PaymentResult): Promise<ApplyResult> {
  const outcome = mapOutcome(result.transaction_status, result.fraud_status);
  if (outcome === 'pending') return 'pending';

  const { data: sub, error } = await admin
    .from('subscriptions')
    .select('id, user_id, status, amount')
    .eq('midtrans_order_id', result.order_id)
    .maybeSingle();
  if (error) throw error;
  if (!sub) return 'unknown_order';

  // Nominal harus sama dengan yang ditagih saat order dibuat.
  if (sub.amount === null || Number(result.gross_amount) !== sub.amount) {
    console.error(`[Payment] Nominal tidak cocok untuk order ${result.order_id}`);
    return 'amount_mismatch';
  }

  if (outcome === 'failed') {
    await admin.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id).eq('status', 'pending');
    return 'cancelled';
  }

  if (sub.status === 'active') return 'already_active';

  const now = new Date().toISOString();
  // Transisi hanya dari 'pending' (atau 'cancelled' bila lunas setelah sempat ditandai batal).
  const { data: activated, error: activateError } = await admin
    .from('subscriptions')
    .update({ status: 'active', started_at: now, expires_at: null })
    .eq('id', sub.id)
    .in('status', ['pending', 'cancelled'])
    .select('id');
  if (activateError) throw activateError;
  if (!activated?.length) return 'already_active';

  const { error: tierError } = await admin
    .from('profiles')
    .update({ subscription_tier: 'premium', updated_at: now })
    .eq('id', sub.user_id);
  if (tierError) throw tierError;
  return 'activated';
}
