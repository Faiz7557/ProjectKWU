import { NextRequest, NextResponse } from 'next/server';
import { verifyMidtransSignature, MidtransNotification } from '@/lib/payment/midtrans-signature';
import { applyPaymentResult } from '@/lib/payment/activate';
import { createAdminClient } from '@/lib/supabase/admin';

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

  try {
    const result = await applyPaymentResult(createAdminClient(), notification);
    if (result === 'unknown_order') return NextResponse.json({ error: 'Order tidak dikenal.' }, { status: 404 });
    if (result === 'amount_mismatch') return NextResponse.json({ error: 'Nominal tidak sesuai.' }, { status: 400 });
    return NextResponse.json({ status: 'OK', result });
  } catch (err: unknown) {
    console.error('[Midtrans Webhook] Gagal memproses notifikasi:', err);
    return NextResponse.json({ error: 'Gagal memproses notifikasi.' }, { status: 500 });
  }
}
