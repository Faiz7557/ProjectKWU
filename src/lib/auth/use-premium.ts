'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type Tier = 'loading' | 'guest' | 'free' | 'premium';

export interface Entitlement {
  tier: Tier;
  email: string | null;
  isPremium: boolean;
}

const LOADING: Entitlement = { tier: 'loading', email: null, isPremium: false };
const GUEST: Entitlement = { tier: 'guest', email: null, isPremium: false };

/**
 * Status akun dibaca dari profiles.subscription_tier (hanya bisa diubah service role,
 * lihat migrasi 003). Satu kueri dibagi semua komponen; refreshEntitlement() memuat ulang.
 *
 * ponytail: gating fitur yang berjalan di browser (program, PDF, analisis) bersifat UI saja;
 * user teknis bisa membukanya lewat devtools. Data cloud (riwayat penuh) dijaga di server.
 */
let cache: Promise<Entitlement> | null = null;
const listeners = new Set<() => void>();

async function load(): Promise<Entitlement> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return GUEST;
  const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle();
  const isPremium = data?.subscription_tier === 'premium';
  return { tier: isPremium ? 'premium' : 'free', email: user.email ?? null, isPremium };
}

export function refreshEntitlement() {
  cache = null;
  listeners.forEach((l) => l());
}

export function useEntitlement(): Entitlement {
  const [state, setState] = useState<Entitlement>(LOADING);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const l = () => setVersion((v) => v + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    cache ??= load().catch(() => GUEST);
    cache.then((e) => alive && setState(e));
    return () => {
      alive = false;
    };
  }, [version]);

  return state;
}
