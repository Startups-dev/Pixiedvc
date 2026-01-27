// src/lib/supabase-server.ts
import "server-only";

import { createSupabaseServerClient } from "./supabase/server";

export { createSupabaseServerClient };

/**
 * Back-compat wrapper: many files expect supabaseServer().
 * Keep it during the transition so we don't touch a bunch of call sites.
 */
export async function supabaseServer() {
  return createSupabaseServerClient();
}
