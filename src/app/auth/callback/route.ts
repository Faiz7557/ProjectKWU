import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Tautan konfirmasi email Supabase (PKCE) mendarat di sini: tukar code jadi session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/premium';
  // Hanya path internal, cegah open redirect.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/premium';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/masuk?error=konfirmasi`);
}
