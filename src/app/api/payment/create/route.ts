import { NextRequest, NextResponse } from 'next/server';
import { createSnapTransaction } from '@/lib/payment/midtrans';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, customerName, customerEmail } = body;

    const planPrices: Record<string, number> = {
      monthly: 29000,
      yearly: 249000,
    };

    const amount = planPrices[plan];
    if (!amount) {
      return NextResponse.json(
        { error: 'Pilihan paket tidak valid. Pilih "monthly" atau "yearly".' },
        { status: 400 }
      );
    }

    const orderId = `SMARTFIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const snapResult = await createSnapTransaction({
      orderId,
      grossAmount: amount,
      customerName: customerName || 'Pengguna SMART-FIT',
      customerEmail: customerEmail || 'user@smartfit.id',
    });

    return NextResponse.json({
      success: true,
      orderId,
      token: snapResult.token,
      redirectUrl: snapResult.redirect_url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
