import { NextRequest, NextResponse } from 'next/server';
import { verifyMidtransSignature, MidtransNotification } from '@/lib/payment/midtrans-signature';
import { PLANS, isPlanId } from '@/lib/payment/plans';
import { createAdminClient } from '@/lib/supabase/admin';

type PaymentOutcome = 'paid' | 'failed' | 'pending';

function mapOutcome(transactionStatus: string, fraudStatus?: string): PaymentOutcome {
  if (transactionStatus === 'settlement') return 'paid';
  if (transactionStatus === 'capture') return fraudStatus === 'accept' ? 'paid' : 'pending';
  if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) return 'failed';
  return 'pending';
}

export async function POST(request: NextRequest) {
  // Fail-closed: tanpa server key, notifikasi tidak pernah diterima.
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    console.error('[Midtrans Webhook] MIDTRANS_SERVER_KEY belum diset; notifikasi ditolak.');
    return NextResponse.json({ error: 'Konfigurasi pembayaran belum lengkap.' }, { status: 500 });
  }

  let notification: MidtransNotification;
  try {
    notification = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 });
  }

  if (!verifyMidtransSignature(notification, serverKey)) {
    return NextResponse.json({ error: 'Invalid notification signature' }, { status: 403 });
  }

  const outcome = mapOutcome(notification.transaction_status, notification.fraud_status);
  if (outcome === 'pending') {
    return NextResponse.json({ status: 'OK', processed: false });
  }

  try {
    const admin = createAdminClient();

    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('id, user_id, plan, status')
      .eq('midtrans_order_id', notification.order_id)
      .maybeSingle();

    if (subError) throw subError;
    if (!sub || !isPlanId(sub.plan)) {
      return NextResponse.json({ error: 'Order tidak dikenal.' }, { status: 404 });
    }

    // Nominal harus sesuai paket: notifikasi bertanda tangan pun tetap diperiksa.
    if (Number(notification.gross_amount) !== PLANS[sub.plan].price) {
      console.error(`[Midtrans Webhook] Nominal tidak cocok untuk order ${notification.order_id}`);
      return NextResponse.json({ error: 'Nominal tidak sesuai paket.' }, { status: 400 });
    }

    if (outcome === 'failed') {
      await admin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', sub.id)
        .eq('status', 'pending');
      return NextResponse.json({ status: 'OK', processed: true });
    }

    // Idempotent: hanya transisi dari 'pending' yang mengaktifkan langganan.
    if (sub.status === 'active') {
      return NextResponse.json({ status: 'OK', processed: false, reason: 'already_active' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PLANS[sub.plan].durationDays * 86400_000);

    const { data: activated, error: activateError } = await admin
      .from('subscriptions')
      .update({ status: 'active', started_at: now.toISOString(), expires_at: expiresAt.toISOString() })
      .eq('id', sub.id)
      .eq('status', 'pending')
      .select('id');

    if (activateError) throw activateError;

    if (activated && activated.length > 0) {
      const { error: tierError } = await admin
        .from('profiles')
        .update({ subscription_tier: 'premium', updated_at: now.toISOString() })
        .eq('id', sub.user_id);
      if (tierError) throw tierError;
    }

    return NextResponse.json({ status: 'OK', processed: true });
  } catch (err: unknown) {
    console.error('[Midtrans Webhook] Gagal memproses notifikasi:', err);
    return NextResponse.json({ error: 'Gagal memproses notifikasi.' }, { status: 500 });
  }
}
