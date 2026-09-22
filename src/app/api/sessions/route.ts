import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validasi payload ketat
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Body request tidak valid (harus berupa JSON object).' }, { status: 400 });
    }

    const { exercise, sessionDurationSec, reps, holdDurationSec, formScore, startedAt } = body;

    if (!exercise || typeof exercise !== 'string' || exercise.trim().length === 0) {
      return NextResponse.json({ error: 'Field "exercise" wajib diisi berupa string non-kosong.' }, { status: 400 });
    }

    if (typeof sessionDurationSec !== 'number' || isNaN(sessionDurationSec) || sessionDurationSec < 0 || sessionDurationSec > 86400) {
      return NextResponse.json(
        { error: 'Field "sessionDurationSec" wajib berupa angka positif wajar (0 - 86400 detik).' },
        { status: 400 }
      );
    }

    if (reps !== undefined && reps !== null && (typeof reps !== 'number' || reps < 0 || !Number.isInteger(reps))) {
      return NextResponse.json({ error: 'Field "reps" harus berupa integer non-negatif atau null.' }, { status: 400 });
    }

    if (holdDurationSec !== undefined && holdDurationSec !== null && (typeof holdDurationSec !== 'number' || holdDurationSec < 0)) {
      return NextResponse.json({ error: 'Field "holdDurationSec" harus berupa angka non-negatif atau null.' }, { status: 400 });
    }

    if (formScore !== undefined && formScore !== null && (typeof formScore !== 'number' || formScore < 0 || formScore > 100)) {
      return NextResponse.json({ error: 'Field "formScore" harus bernilai antara 0 hingga 100.' }, { status: 400 });
    }

    if (startedAt && isNaN(Date.parse(startedAt))) {
      return NextResponse.json({ error: 'Field "startedAt" harus berupa format timestamp ISO 8601 yang valid.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      // Graceful fallback saat Supabase belum terkonfigurasi di env local
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

    const userId = user?.id || '00000000-0000-0000-0000-000000000000';

    const { data, error } = await supabase.from('sessions').insert({
      user_id: userId,
      exercise: body.exercise,
      reps: body.reps ?? null,
      hold_duration_sec: body.holdDurationSec ?? null,
      session_duration_sec: body.sessionDurationSec,
      started_at: body.startedAt || new Date().toISOString(),
      metadata: body.metadata || {},
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, session: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
