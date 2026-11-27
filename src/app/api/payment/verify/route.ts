import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus, isMidtransConfigured } from '@/lib/payment/midtrans';
import { applyPaymentResult } from '@/lib/payment/activate';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Cadangan webhook: setelah user kembali dari halaman Midtrans, tarik status order miliknya
 * langsung dari API Midtrans lalu aktifkan. Membuat pembayaran tetap jalan saat webhook
 * belum bisa menjangkau server (mis. localhost) atau terlambat.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isMidtransConfigured()) {
      return NextResponse.json({ error: 'Pembayaran belum dikonfigurasi di server.' }, { status: 503 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const orderId = typeof body?.orderId === 'string' ? body.orderId : null;
    const admin = createAdminClient();

    // Hanya order milik user ini. Tanpa orderId: order pending terbaru.
    let query = admin
      .from('subscriptions')
      .select('midtrans_order_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    query = orderId ? query.eq('midtrans_order_id', orderId) : query.eq('status', 'pending');
    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows?.length) return NextResponse.json({ result: 'no_order' });

    const status = await getTransactionStatus(rows[0].midtrans_order_id);
    if (!status) return NextResponse.json({ result: 'pending' });

    const result = await applyPaymentResult(admin, status);
    return NextResponse.json({ result });
  } catch (err: unknown) {
    console.error('[Payment Verify] Error:', err);
    return NextResponse.json({ error: 'Gagal memeriksa pembayaran.' }, { status: 500 });
  }
}
