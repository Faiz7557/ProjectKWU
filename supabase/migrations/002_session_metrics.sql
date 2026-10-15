-- ==============================================================================
-- SMART-FIT v2 - Migrasi 002: metrik sesi lengkap, idempotensi, latihan dinamis
-- ==============================================================================

-- 1. Daftar latihan dikelola di kode (EXERCISE_IDS), bukan CHECK hard-coded.
--    Validasi nilai dilakukan oleh API (zod). DB hanya memastikan bentuk id.
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_exercise_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_exercise_check
  CHECK (exercise ~ '^[a-z_]{2,32}$');

-- 2. Metrik yang sebelumnya hanya ada di localStorage.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS clean_reps INTEGER CHECK (clean_reps IS NULL OR clean_reps >= 0),
  ADD COLUMN IF NOT EXISTS form_score NUMERIC(5, 2) CHECK (form_score IS NULL OR (form_score >= 0 AND form_score <= 100)),
  ADD COLUMN IF NOT EXISTS symmetry_score NUMERIC(5, 2) CHECK (symmetry_score IS NULL OR (symmetry_score >= 0 AND symmetry_score <= 100)),
  ADD COLUMN IF NOT EXISTS calories NUMERIC(8, 2) CHECK (calories IS NULL OR calories >= 0),
  ADD COLUMN IF NOT EXISTS faults JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS client_session_id TEXT CHECK (client_session_id IS NULL OR char_length(client_session_id) BETWEEN 8 AND 64);

-- 3. Idempotensi: sesi yang sama dikirim ulang tidak membuat baris ganda.
--    UNIQUE dengan kolom NULL tetap mengizinkan banyak baris tanpa client_session_id.
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_user_client_session_key;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_user_client_session_key
  UNIQUE (user_id, client_session_id);

-- 4. Subscriptions: baris 'pending' dibuat server (service role) sebelum pembayaran.
--    RLS tidak berubah: user hanya bisa membaca langganan miliknya.
CREATE INDEX IF NOT EXISTS idx_subscriptions_order ON public.subscriptions(midtrans_order_id);
