-- ==============================================================================
-- SMART-FIT v2 - Supabase PostgreSQL Schema
-- ==============================================================================

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger: Otomatis buat profil publik saat user signup di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Workout Sessions Table (Zero video, hanya ringkasan metrik sesi)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Tipe gerakan: 'pushup' | 'squat' | 'situp' | 'jumping_jack' | 'plank'
  exercise TEXT NOT NULL CHECK (
    exercise IN ('pushup', 'squat', 'situp', 'jumping_jack', 'plank')
  ),

  -- Rep count (untuk pushup, squat, situp, jumping jack)
  reps INTEGER CHECK (reps IS NULL OR reps >= 0),

  -- Durasi hold dalam detik (untuk plank)
  hold_duration_sec NUMERIC(10, 2) CHECK (hold_duration_sec IS NULL OR hold_duration_sec >= 0),

  -- Total durasi sesi latihan
  session_duration_sec NUMERIC(10, 2) NOT NULL CHECK (session_duration_sec >= 0),

  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ DEFAULT now(),

  -- Metadata opsional (device, average angle, dll)
  metadata JSONB DEFAULT '{}'
);

-- 3. Subscriptions Table (Midtrans integration)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  midtrans_order_id TEXT UNIQUE,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policy Sessions
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy Subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- 5. Indexes untuk efisiensi kueri
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON public.sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_exercise ON public.sessions(exercise, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, status);
