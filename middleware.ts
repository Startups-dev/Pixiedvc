import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function isOwnerPath(pathname: string) {
  return pathname === '/owner' || pathname.startsWith('/owner/');
}

export async function middleware(req: NextRequest) {
  if (!isOwnerPath(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return res;
  }

  const nextUrl = req.nextUrl.clone();
  nextUrl.pathname = '/login';
  nextUrl.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`);
  nextUrl.searchParams.set('intent', 'owner');
  return NextResponse.redirect(nextUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
