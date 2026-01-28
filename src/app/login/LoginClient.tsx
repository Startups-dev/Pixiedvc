'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { supabaseBrowser } from '@/lib/supabase-browser';

const googleIcon = (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
    <path fill="#4285F4" d="M19.6 10.23c0-.68-.06-1.36-.18-2.02H10v3.82h5.38a4.59 4.59 0 0 1-1.99 3.01v2.5h3.22c1.89-1.75 2.99-4.34 2.99-7.31Z" />
    <path fill="#34A853" d="M10 20c2.7 0 4.97-.9 6.63-2.46l-3.22-2.5c-.9.6-2.05.94-3.41.94-2.62 0-4.84-1.75-5.63-4.09H1.05v2.58A10 10 0 0 0 10 20Z" />
    <path fill="#FBBC04" d="M4.37 11.89a5.99 5.99 0 0 1 0-3.78V5.53H1.05a10 10 0 0 0 0 8.94l3.32-2.58Z" />
    <path fill="#EA4335" d="M10 3.96c1.47 0 2.79.5 3.83 1.48l2.87-2.87C14.96.9 12.7 0 10 0 6.14 0 2.77 2.23 1.05 5.53l3.32 2.58C5.16 5.7 7.38 3.96 10 3.96Z" />
  </svg>
);

const facebookIcon = (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
    <path
      fill="#1877F2"
      d="M20 10.06C20 4.5 15.52 0 10 0S0 4.5 0 10.06c0 5.01 3.66 9.17 8.44 9.94v-7.03H5.9V10.1h2.54V7.87c0-2.52 1.49-3.92 3.77-3.92 1.09 0 2.24.19 2.24.19v2.48h-1.26c-1.24 0-1.63.78-1.63 1.57v1.9h2.77l-.44 2.87h-2.33v7.03C16.34 19.23 20 15.07 20 10.06Z"
    />
  </svg>
);

const oauthProviders = [
  { id: 'google', label: 'Continue with Google', icon: googleIcon },
  { id: 'facebook', label: 'Continue with Facebook', icon: facebookIcon },
];

type Mode = 'login' | 'signup' | 'update';

export default function LoginClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordRedirect = useMemo(() => {
    if (typeof window === 'undefined') return '/login?mode=update';
    return new URL('/login?mode=update', window.location.origin).toString();
  }, []);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginErrorState, setLoginErrorState] = useState<{ primary: string; secondary?: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const adminNotice = searchParams.get('admin') === '1';

  useEffect(() => {
    const paramMode = searchParams.get('mode');

    if (paramMode === 'signup') {
      setMode('signup');
      return;
    }

    if (paramMode === 'update') {
      setMode('update');

      const prepareForUpdate = async () => {
        setLoading(true);
        try {
          const code = searchParams.get('code');
          let session = null;
          let exchangeError = null;

          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            session = data?.session ?? null;
            exchangeError = error;
          } else if (typeof window !== 'undefined' && window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              session = data?.session ?? null;
              exchangeError = error;
            }
          }

          if (exchangeError) {
            setErrorMessage(exchangeError.message);
            return;
          }

          if (!session?.user) {
            setErrorMessage('Auth session missing. Please restart the reset flow.');
            return;
          }

          setEmail(session.user.email ?? '');
          setMessage('Enter and confirm a new password to finish resetting your account.');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unexpected error while preparing password reset.';
          setErrorMessage(message);
        } finally {
          setLoading(false);
        }
      };

      prepareForUpdate();
      return;
    }

    setMode('login');
  }, [searchParams, supabase]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setLoginErrorState(null);
    setLoading(true);

    if (mode === 'update') {
      if (!password || password !== confirmPassword) {
        setLoading(false);
        setErrorMessage('Passwords must match to continue.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setMessage('Password updated. Redirecting…');
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      }
      return;
    }

    const action =
      mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: passwordRedirect,
            },
          });

    const { error } = await action;
    setLoading(false);

    if (error) {
      const isRateLimited =
        error.status === 429 ||
        error.status === 0 ||
        /rate limit/i.test(error.message ?? '') ||
        /try again/i.test(error.message ?? '');
      if (mode === 'login') {
        setLoginErrorState({
          primary: isRateLimited ? 'Login failed. Please try again in a moment.' : 'Invalid email or password.',
          secondary: isRateLimited ? undefined : "If you don't have an account yet, click Sign Up.",
        });
      } else {
        setErrorMessage(error.message);
      }
    } else {
      if (mode === 'login') {
        setLoginErrorState(null);
      }
      const redirectPath = searchParams.get('redirect') ?? '/owner/dashboard';
      await router.replace(redirectPath);
      router.refresh();
    }
  }

  async function handleReset() {
    if (!email) {
      setErrorMessage('Enter your email first.');
      return;
    }
    setMessage(null);
    setErrorMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: passwordRedirect,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setMessage('Check your inbox for the password reset link.');
    }
    setLoading(false);
  }

  async function handleOauth(provider: string) {
    setMessage(null);
    setErrorMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent('/owner/dashboard')}`
            : undefined,
      },
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Account</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {mode === 'update'
                ? 'Set a new password'
                : mode === 'signup'
                  ? 'Create your PixieDVC account'
                  : 'Sign in to PixieDVC'}
            </h1>
            <p className="text-sm text-slate-500">
              {mode === 'update'
                ? 'Choose a new password to finish your reset.'
                : mode === 'signup'
                  ? 'Create an account to manage bookings and owner services.'
                  : 'Access your dashboard and manage reservations.'}
            </p>
          </div>

          {adminNotice ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Please sign in with your admin account to continue.
            </div>
          ) : null}

          <form onSubmit={handleAuth} className="mt-8 space-y-5">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              />
            </label>

            {mode !== 'update' ? (
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Password
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-16 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>
            ) : null}

            {mode === 'update' ? (
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                New password
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                />
              </label>
            ) : null}

            {mode === 'update' ? (
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Confirm new password
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                />
              </label>
            ) : null}

            {loginErrorState ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <p className="font-semibold">{loginErrorState.primary}</p>
                {loginErrorState.secondary ? (
                  <p className="mt-1 text-xs text-rose-600">{loginErrorState.secondary}</p>
                ) : null}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/70"
            >
              {loading
                ? 'Working…'
                : mode === 'update'
                  ? 'Update password'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Sign in'}
            </button>
          </form>

          {mode !== 'update' ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <button type="button" onClick={handleReset} className="hover:text-slate-600">
                Forgot password
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="hover:text-slate-600"
              >
                {mode === 'login' ? 'Create account' : 'Back to login'}
              </button>
            </div>
          ) : null}

          {mode !== 'update' ? (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Or continue with</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {oauthProviders.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleOauth(provider.id)}
                    className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    {provider.icon}
                    {provider.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
