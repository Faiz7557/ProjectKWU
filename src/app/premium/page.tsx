'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Crown, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { refreshEntitlement, useEntitlement } from '@/lib/auth/use-premium';
import { PRICING } from '@/components/landing/pricing-data';
import { TopBar } from '@/components/ui/Nav';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surfaces';
import { toast } from '@/components/ui/Toast';

type VerifyState = 'idle' | 'checking' | 'pending' | 'failed';

export default function PremiumPage() {
  const ent = useEntitlement();
  const [buying, setBuying] = useState(false);
  const [verify, setVerify] = useState<VerifyState>('idle');
  const [error, setError] = useState<string | null>(null);
  const checkedReturn = useRef(false);

  // Tarik status dari server (yang bertanya ke Midtrans). Ulangi beberapa kali: QRIS/VA bisa telat lunas.
  const checkPayment = useCallback(async (orderId: string | null) => {
    setVerify('checking');
    for (let i = 0; i < 6; i++) {
      try {
        const res = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const json = await res.json();
        if (json.result === 'activated' || json.result === 'already_active') {
          refreshEntitlement();
          setVerify('idle');
          toast({ title: 'Pembayaran berhasil. Premium aktif seumur hidup!' });
          return;
        }
        if (json.result === 'cancelled' || json.result === 'no_order' || !res.ok) {
          setVerify(json.result === 'cancelled' ? 'failed' : 'idle');
          return;
        }
      } catch {
        // Jaringan putus: coba lagi pada putaran berikut
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    setVerify('pending');
  }, []);

  // Kembali dari halaman pembayaran Midtrans: ?order_id=...
  useEffect(() => {
    if (checkedReturn.current || ent.tier !== 'free') return;
    const orderId = new URLSearchParams(window.location.search).get('order_id');
    if (!orderId) return;
    const t = setTimeout(() => {
      checkedReturn.current = true;
      void checkPayment(orderId);
    }, 0);
    return () => clearTimeout(t);
  }, [ent.tier, checkPayment]);

  async function buy() {
    setError(null);
    setBuying(true);
    try {
      const res = await fetch('/api/payment/create', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal memulai pembayaran.');
      window.location.href = json.redirectUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memulai pembayaran.');
      setBuying(false);
    }
  }

  async function logout() {
    await createClient().auth.signOut();
    refreshEntitlement();
  }

  const { free, paid } = PRICING;
  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <TopBar title="Premium" back={{ href: '/workout', label: 'Latihan' }} />
      <div className="mx-auto max-w-4xl space-y-6 px-4 pt-6 sm:px-6">
        {ent.tier === 'premium' ? (
          <Card tone={7} className="flex items-start gap-3">
            <Crown className="mt-1 size-6 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-display text-title-2">Kamu Premium seumur hidup</h2>
              <p className="mt-1 text-callout">Semua fitur terbuka untuk {ent.email}. Terima kasih sudah mendukung SMART-FIT.</p>
              <Button href="/workout" variant="secondary" className="mt-4">Mulai latihan</Button>
            </div>
          </Card>
        ) : (
          <header className="space-y-2 text-center">
            <h2 className="font-display text-title-1 text-text">Buka semua fitur, sekali bayar.</h2>
            <p className="text-callout text-text-2">{paid.blurb}</p>
          </header>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card tone={4} className="space-y-4">
            <h3 className="font-display text-title-2">{free.name}</h3>
            <p className="font-display text-title-1">Rp0</p>
            <ul className="space-y-2">
              {free.features.map((f) => (
                <li key={f} className="flex gap-2 text-callout"><Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{f}</li>
              ))}
            </ul>
          </Card>
          <Card tone={1} className="space-y-4">
            <h3 className="font-display text-title-2">{paid.name}</h3>
            <p className="font-display text-title-1">
              {paid.price} <span className="text-callout font-normal">sekali bayar, seumur hidup</span>
            </p>
            <ul className="space-y-2">
              {paid.features.map((f) => (
                <li key={f} className="flex gap-2 text-callout"><Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{f}</li>
              ))}
            </ul>

            {ent.tier === 'loading' && <div className="h-14 animate-pulse bg-surface-3" />}
            {ent.tier === 'guest' && (
              <Button href="/masuk?next=/premium" size="xl" variant="secondary" className="w-full">Masuk untuk membeli</Button>
            )}
            {ent.tier === 'free' && (
              <div className="space-y-2">
                <Button onClick={buy} size="xl" variant="secondary" loading={buying} disabled={verify === 'checking'} className="w-full">
                  Bayar {paid.price}
                </Button>
                <p className="text-caption">QRIS, GoPay, ShopeePay, transfer bank (VA), atau kartu. Diproses aman oleh Midtrans.</p>
                {verify === 'checking' && <p role="status" className="text-footnote">Memeriksa pembayaran…</p>}
                {verify === 'pending' && (
                  <p role="status" className="text-footnote">
                    Pembayaran belum kami terima. Bila sudah membayar, tunggu sebentar lalu{' '}
                    <button type="button" className="font-semibold underline" onClick={() => checkPayment(null)}>cek lagi</button>.
                  </p>
                )}
                {verify === 'failed' && <p role="alert" className="text-footnote">Pembayaran dibatalkan atau kedaluwarsa. Silakan coba lagi.</p>}
                {verify === 'idle' && (
                  <button type="button" className="text-footnote underline" onClick={() => checkPayment(null)}>Sudah bayar tapi belum aktif? Cek status</button>
                )}
                {error && <p role="alert" className="text-footnote">{error}</p>}
              </div>
            )}
          </Card>
        </div>

        {(ent.tier === 'free' || ent.tier === 'premium') && (
          <div className="flex items-center justify-center gap-3 text-footnote text-text-2">
            <span>Masuk sebagai {ent.email}</span>
            <Button variant="tertiary" onClick={logout} icon={<LogOut className="size-4" aria-hidden="true" />}>Keluar</Button>
          </div>
        )}
      </div>
    </div>
  );
}
