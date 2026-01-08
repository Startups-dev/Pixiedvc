import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

const PUBLIC_PATHS = [
  /^\/login/,
  /^\/register/,
  /^\/onboarding/,
  /^\/auth\/callback/,
  /^\/api\/public/,
  /^\/_next/,
  /^\/favicon\.ico$/,
  /^\/images\//,
  /^\/fonts\//,
];

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  if (PUBLIC_PATHS.some((re) => re.test(url.pathname))) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (url.pathname.startsWith('/admin')) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return res;
  }

  if (url.pathname.startsWith('/admin')) {
    if (!emailIsAllowedForAdmin(user.email)) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  if (url.pathname.startsWith('/affiliate')) {
    return res;
  }

  let onboardingComplete = user.user_metadata?.onboarding_completed === true;

  if (!onboardingComplete) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.onboarding_completed) {
      onboardingComplete = true;
      await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata ?? {}),
          onboarding_completed: true,
          role: profile.role ?? user.user_metadata?.role,
        },
      });
    }

    if ((!profile || !profile.onboarding_completed) && !url.pathname.startsWith('/onboarding')) {
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|fonts).*)'],
};
