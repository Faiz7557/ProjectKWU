import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase dengan service role (melewati RLS). HANYA untuk kode server
 * (route handler webhook & pembuatan transaksi). Jangan pernah diimpor di komponen client.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL belum dikonfigurasi.');
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
