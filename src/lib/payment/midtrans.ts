export interface CreateSnapTransactionParams {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail: string;
  finishUrl: string;
}

export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}

export interface MidtransStatus {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  gross_amount: string;
}

function config() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi.');
  const prod = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  return {
    auth: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
    snapUrl: prod ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    apiUrl: prod ? 'https://api.midtrans.com/v2' : 'https://api.sandbox.midtrans.com/v2',
  };
}

export function isMidtransConfigured(): boolean {
  return !!process.env.MIDTRANS_SERVER_KEY;
}

/**
 * Midtrans Snap (server-side, mode redirect). Mendukung QRIS, e-wallet, VA bank, kartu.
 * Tanpa server key: melempar error (fail-closed, tidak ada token tiruan).
 */
export async function createSnapTransaction(params: CreateSnapTransactionParams): Promise<SnapTransactionResponse> {
  const { auth, snapUrl } = config();
  const response = await fetch(snapUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth },
    body: JSON.stringify({
      transaction_details: { order_id: params.orderId, gross_amount: params.grossAmount },
      item_details: [{ id: 'premium-lifetime', name: 'SMART-FIT Premium Seumur Hidup', price: params.grossAmount, quantity: 1 }],
      customer_details: { first_name: params.customerName, email: params.customerEmail },
      enabled_payments: ['qris', 'gopay', 'shopeepay', 'bca_va', 'bni_va', 'bri_va', 'permata_va', 'other_va', 'credit_card'],
      callbacks: { finish: params.finishUrl },
    }),
  });

  if (!response.ok) {
    throw new Error(`Midtrans API error (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

/** Status transaksi langsung dari Midtrans (sumber tepercaya, diautentikasi server key). */
export async function getTransactionStatus(orderId: string): Promise<MidtransStatus | null> {
  const { auth, apiUrl } = config();
  const response = await fetch(`${apiUrl}/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: auth },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const json = await response.json();
  // 404 dikembalikan Midtrans di body (status_code), bukan HTTP: transaksi belum dibuat/dibayar.
  if (json.status_code === '404' || !json.transaction_status) return null;
  return json;
}
