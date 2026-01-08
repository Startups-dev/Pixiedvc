import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseAdminClient() {
  if (client) {
    return client;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRoleKey) {
    console.warn('[supabase-admin] Service role key not found. Falling back to authenticated session client.');
    return null;
  }

  client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
  return client;
}
