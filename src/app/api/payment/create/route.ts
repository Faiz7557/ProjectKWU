import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createSnapTransaction } from '@/lib/payment/midtrans';
import { PLANS, isPlanId } from '@/lib/payment/plans';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Wajib login: identitas pembeli diambil dari session, bukan dari body.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const plan = body?.plan;

    if (!isPlanId(plan)) {
      return NextResponse.json(
        { error: 'Pilihan paket tidak valid. Pilih "monthly" atau "yearly".' },
        { status: 400 }
      );
    }

    const { price, durationDays } = PLANS[plan];
    const orderId = `SMARTFIT-${randomUUID()}`;
    const admin = createAdminClient();

    // Catat transaksi sebagai 'pending' sebelum Snap, agar webhook punya baris untuk diaktifkan.
    const { error: insertError } = await admin.from('subscriptions').insert({
      user_id: user.id,
      plan,
      status: 'pending',
      midtrans_order_id: orderId,
      expires_at: new Date(Date.now() + durationDays * 86400_000).toISOString(),
    });

    if (insertError) {
      console.error('[Payment Create] Gagal mencatat langganan pending:', insertError);
      return NextResponse.json({ error: 'Gagal memulai pembayaran.' }, { status: 500 });
    }

    try {
      const snapResult = await createSnapTransaction({
        orderId,
        grossAmount: price,
        customerName: (user.user_metadata?.display_name as string | undefined) || 'Pengguna SMART-FIT',
        customerEmail: user.email,
      });

      return NextResponse.json({
        success: true,
        orderId,
        token: snapResult.token,
        redirectUrl: snapResult.redirect_url,
      });
    } catch (snapError: unknown) {
      console.error('[Payment Create] Snap gagal:', snapError);
      await admin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('midtrans_order_id', orderId)
        .eq('status', 'pending');
      return NextResponse.json({ error: 'Gagal memulai pembayaran.' }, { status: 502 });
    }
  } catch (err: unknown) {
    console.error('[Payment Create] Error tidak terduga:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
