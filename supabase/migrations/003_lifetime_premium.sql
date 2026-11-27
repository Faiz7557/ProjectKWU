-- ==============================================================================
-- SMART-FIT v2 - Migrasi 003: Premium seumur hidup (sekali bayar)
-- ==============================================================================

-- 1. Paket 'lifetime'. Paket lama dibiarkan valid agar baris historis tetap sah.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('monthly', 'yearly', 'lifetime'));

-- Lifetime tidak punya tanggal kedaluwarsa.
ALTER TABLE public.subscriptions ALTER COLUMN expires_at DROP NOT NULL;

-- Jumlah yang ditagih dicatat saat order dibuat; aktivasi mencocokkan dengan ini.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount INTEGER;

-- 2. KEAMANAN: policy "Users can update own profile" sebelumnya mengizinkan user
--    mengubah subscription_tier miliknya sendiri menjadi 'premium' lewat anon key.
--    Batasi UPDATE hanya ke kolom non-sensitif. subscription_tier hanya diubah service role.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (display_name, avatar_url, updated_at) ON public.profiles TO authenticated;

-- 3. Profil untuk user yang sudah terdaftar sebelum trigger ada.
INSERT INTO public.profiles (id, display_name)
SELECT id, raw_user_meta_data->>'display_name' FROM auth.users
ON CONFLICT (id) DO NOTHING;
