'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { refreshEntitlement } from '@/lib/auth/use-premium';
import { TopBar } from '@/components/ui/Nav';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surfaces';
import { SegmentedControl } from '@/components/ui/Controls';

type Mode = 'login' | 'signup';
const FIELD = 'w-full border border-border-strong bg-canvas px-3 py-2.5 text-callout text-text placeholder:text-text-3';

function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next') ?? '/premium';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/premium';
}

export default function MasukPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const next = nextPath();
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim() || undefined },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (err) throw err;
        if (!data.session) {
          setInfo(`Kami mengirim tautan konfirmasi ke ${email}. Buka tautan itu untuk mengaktifkan akun.`);
          return;
        }
      }
      refreshEntitlement();
      router.push(next);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.includes('Invalid login') ? 'Email atau kata sandi salah.'
        : msg.includes('already registered') ? 'Email ini sudah terdaftar. Silakan masuk.'
        : msg.includes('Email not confirmed') ? 'Email belum dikonfirmasi. Cek kotak masuk kamu.'
        : 'Gagal memproses. Coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <TopBar title="Akun" back={{ href: '/', label: 'Beranda' }} />
      <div className="mx-auto max-w-md space-y-5 px-4 pt-8">
        <SegmentedControl<Mode>
          label="Masuk atau daftar"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'login', label: 'Masuk' },
            { value: 'signup', label: 'Daftar' },
          ]}
        />
        <Card>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-subhead font-medium text-text-2">Nama</label>
                <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-subhead font-medium text-text-2">Email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-subhead font-medium text-text-2">Kata sandi</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={FIELD}
              />
              {mode === 'signup' && <p className="text-caption text-text-3">Minimal 8 karakter.</p>}
            </div>
            {error && <p role="alert" className="text-footnote text-danger">{error}</p>}
            {info && <p role="status" className="text-footnote text-success">{info}</p>}
            <Button type="submit" size="lg" loading={loading} className="w-full">
              {mode === 'login' ? 'Masuk' : 'Buat akun'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
