import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
if (!hasSupabaseEnv) {
  console.warn(
    "[@pixiedvc/data] Supabase env vars are missing; using fallback client for build-time evaluation.",
  );
}
const resolvedSupabaseUrl = supabaseUrl || "http://127.0.0.1:54321";
const resolvedSupabaseAnonKey = supabaseAnonKey || "build-time-fallback-anon-key";

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});
