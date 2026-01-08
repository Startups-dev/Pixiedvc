import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

declare global {
  // eslint-disable-next-line no-var
  var __AUTH_DEBUG_LOGGED__: boolean | undefined;
}

export function middleware(req: NextRequest) {
  if (!globalThis.__AUTH_DEBUG_LOGGED__) {
    globalThis.__AUTH_DEBUG_LOGGED__ = true;
    console.log('[AUTH_DEBUG][SERVER] URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log(
      '[AUTH_DEBUG][SERVER] ANON8',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8),
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
