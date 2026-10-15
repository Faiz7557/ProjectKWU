import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sessionPayloadSchema } from '@/lib/sessions/session-schema';

function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!supabaseUrl && !supabaseUrl.includes('placeholder');
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = sessionPayloadSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Data sesi tidak valid.',
          details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }

    const body = parsed.data;

    if (!isSupabaseConfigured()) {
      // Mode pengembangan lokal: Supabase belum dikonfigurasi.
      return NextResponse.json({
        success: true,
        message: 'Sesi latihan tercatat (Local development mode / Supabase belum dihubungkan).',
        session: body,
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Silakan login untuk menyimpan sesi.' }, { status: 401 });
    }

    // upsert + ignoreDuplicates: pengiriman ulang sesi yang sama (clientSessionId) tidak membuat baris ganda.
    const { data, error } = await supabase
      .from('sessions')
      .upsert(
        {
          user_id: user.id,
          client_session_id: body.clientSessionId ?? null,
          exercise: body.exercise,
          reps: body.reps ?? null,
          clean_reps: body.cleanReps ?? null,
          hold_duration_sec: body.holdDurationSec ?? null,
          session_duration_sec: body.sessionDurationSec,
          form_score: body.formScore ?? null,
          symmetry_score: body.symmetryScore ?? null,
          calories: body.calories ?? null,
          faults: body.faults ?? [],
          started_at: body.startedAt ?? new Date().toISOString(),
          metadata: body.metadata ?? {},
        },
        { onConflict: 'user_id,client_session_id', ignoreDuplicates: true }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Sessions POST] Gagal menyimpan sesi:', error);
      return NextResponse.json({ error: 'Gagal menyimpan sesi latihan.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    }

    return NextResponse.json({ success: true, session: data }, { status: 201 });
  } catch (err: unknown) {
    console.error('[Sessions POST] Error tidak terduga:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        sessions: [],
        message: 'Supabase URL belum dikonfigurasi di .env.local.',
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const exercise = url.searchParams.get('exercise');

    let query = supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(50);

    if (exercise) {
      query = query.eq('exercise', exercise);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Sessions GET] Gagal membaca sesi:', error);
      return NextResponse.json({ error: 'Gagal membaca riwayat latihan.' }, { status: 500 });
    }

    return NextResponse.json({ sessions: data });
  } catch (err: unknown) {
    console.error('[Sessions GET] Error tidak terduga:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
