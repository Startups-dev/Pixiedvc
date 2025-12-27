import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';

export const createClient = () => createClientComponentClient();

export const createServer = (cookieStore: RequestCookies) =>
  createServerComponentClient({
    cookies: () => cookieStore,
  });
