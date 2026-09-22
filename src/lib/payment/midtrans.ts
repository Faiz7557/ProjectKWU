export interface CreateSnapTransactionParams {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail: string;
}

export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}

/**
 * Midtrans Snap API Client (Server-Side)
 * Mendukung pembayaran QRIS, GoPay, OVO, ShopeePay, serta Virtual Account Bank.
 */
export async function createSnapTransaction(
  params: CreateSnapTransactionParams
): Promise<SnapTransactionResponse> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  if (!serverKey) {
    // Mock response untuk environment development jika server key belum diisi
    return {
      token: `mock-snap-token-${Date.now()}`,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-${Date.now()}`,
    };
  }

  const baseUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
    },
    enabled_payments: [
      'gopay',
      'shopeepay',
      'qris',
      'bca_va',
      'bni_va',
      'bri_va',
      'permata_va',
      'credit_card',
    ],
  };

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Midtrans API error (${response.status}): ${errorText}`);
  }

  return response.json();
}
