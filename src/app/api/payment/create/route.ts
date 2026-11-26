import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSnapTransaction, isMidtransConfigured } from '@/lib/payment/midtrans';
import { PREMIUM_LIFETIME } from '@/lib/payment/plans';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    if (!isMidtransConfigured()) {
      return NextResponse.json({ error: 'Pembayaran belum dikonfigurasi di server.' }, { status: 503 });
    }

    // Wajib login: identitas pembeli diambil dari session, bukan dari body.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle();
    if (profile?.subscription_tier === 'premium') {
      return NextResponse.json({ error: 'Akun kamu sudah Premium.' }, { status: 409 });
    }

    const { plan, price } = PREMIUM_LIFETIME;
    const orderId = `SMARTFIT-${randomUUID()}`;

    // Catat transaksi 'pending' sebelum Snap, agar aktivasi punya baris dan nominal acuan.
    const { error: insertError } = await admin.from('subscriptions').insert({
      user_id: user.id,
      plan,
      amount: price,
      status: 'pending',
      midtrans_order_id: orderId,
      expires_at: null,
    });
    if (insertError) {
      console.error('[Payment Create] Gagal mencatat transaksi pending:', insertError);
      return NextResponse.json({ error: 'Gagal memulai pembayaran.' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    try {
      const snap = await createSnapTransaction({
        orderId,
        grossAmount: price,
        customerName: (user.user_metadata?.display_name as string | undefined) || 'Pengguna SMART-FIT',
        customerEmail: user.email,
        finishUrl: `${siteUrl}/premium?order_id=${encodeURIComponent(orderId)}`,
      });
      return NextResponse.json({ success: true, orderId, redirectUrl: snap.redirect_url });
    } catch (snapError: unknown) {
      console.error('[Payment Create] Snap gagal:', snapError);
      await admin.from('subscriptions').update({ status: 'cancelled' }).eq('midtrans_order_id', orderId).eq('status', 'pending');
      return NextResponse.json({ error: 'Gagal memulai pembayaran.' }, { status: 502 });
    }
  } catch (err: unknown) {
    console.error('[Payment Create] Error tidak terduga:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
