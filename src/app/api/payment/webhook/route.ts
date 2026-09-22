import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const notification = await request.json();
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (serverKey) {
      // Validasi tanda tangan keamanan SHA512 Midtrans
      const rawString = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
      const expectedSignature = crypto.createHash('sha512').update(rawString).digest('hex');

      if (notification.signature_key !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid notification signature' }, { status: 403 });
      }
    }

    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    let isSuccess = false;

    if (transactionStatus === 'capture') {
      isSuccess = fraudStatus === 'accept';
    } else if (transactionStatus === 'settlement') {
      isSuccess = true;
    }

    // Di sini update status langganan di database (jika ada Supabase terhubung)
    console.log(`[Midtrans Webhook] Order: ${notification.order_id}, Status: ${transactionStatus}, Paid: ${isSuccess}`);

    return NextResponse.json({ status: 'OK', processed: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
