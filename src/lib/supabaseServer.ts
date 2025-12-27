import { supabaseServer } from './supabase-server';

export function createClient() {
  return supabaseServer();
}
