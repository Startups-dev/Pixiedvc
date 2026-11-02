import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import LoginPage from './page';
import { getPostLoginDestination } from './actions';

vi.mock('./actions', () => ({ getPostLoginDestination: vi.fn().mockResolvedValue('/admin') }));

type SearchParams = URLSearchParams;

let currentParams: SearchParams = new URLSearchParams();
const routerMock = {
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
};

const authMock = {
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
  updateUser: vi.fn().mockResolvedValue({ error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
  exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: { user: { email: 'user@example.com' } } }, error: null }),
  setSession: vi.fn().mockResolvedValue({ data: { session: { user: { email: 'user@example.com' } } }, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  useSearchParams: () => ({
    get: (key: string) => currentParams.get(key),
  }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabaseBrowser: () => ({
    auth: authMock,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    currentParams = new URLSearchParams();
    routerMock.replace.mockClear();
    routerMock.push.mockClear();
    routerMock.refresh.mockClear();
    vi.mocked(getPostLoginDestination).mockReset().mockResolvedValue('/admin');
    Object.values(authMock).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        fn.mockClear();
      }
    });
  });

  test('renders login view by default', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in to hannadvc/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('requires email before requesting password reset', async () => {
    render(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));

    expect(authMock.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(await screen.findByText(/enter your email first/i)).toBeInTheDocument();
  });

  test('submits sign up with redirect to password update step', async () => {
    currentParams = new URLSearchParams([['mode', 'signup']]);
    render(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), 'new@pixiedvc.com');
    await userEvent.type(screen.getByPlaceholderText(/your password/i), 'StrongPass9!');

    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(authMock.signUp).toHaveBeenCalledWith({
        email: 'new@pixiedvc.com',
        password: 'StrongPass9!',
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(/\/auth\/callback$/),
        }),
      });
    });
  });

  test('shows inline error when login fails', async () => {
    authMock.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });
    render(<LoginPage />);

    await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/your password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
      expect(screen.getByText("If you don't have an account yet, click Sign Up.")).toBeInTheDocument();
    });
  });

  test.each([null, '/admin/owners', '//example.com', '/owner/dashboard'])('uses only the server-resolved destination for return %s', async (requested) => {
    if (requested) currentParams.set('next', requested);
    render(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), 'admin@example.com');
    await userEvent.type(screen.getByPlaceholderText(/your password/i), 'StrongPass9!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/admin'));
    expect(getPostLoginDestination).toHaveBeenCalledWith(requested);
  });

  test('keeps navigation errors visible instead of using an unchecked return URL', async () => {
    currentParams.set('redirect', '//example.com');
    vi.mocked(getPostLoginDestination).mockRejectedValueOnce(new Error('Read failed'));
    render(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), 'admin@example.com');
    await userEvent.type(screen.getByPlaceholderText(/your password/i), 'StrongPass9!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Signed in, but unable to load your dashboard. Please try again.')).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  test('uses a safe callback URL for Google OAuth', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pixiedvc-web-staging-776171407864.us-central1.run.app';
    render(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(authMock.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://pixiedvc-web-staging-776171407864.us-central1.run.app/auth/callback',
        },
      });
    });
  });

  test('preserves internal OAuth returns for server authorization and drops external returns', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://hannadvc.test';
    currentParams.set('next', '/admin/owners?filter=active');
    const first = render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(authMock.signInWithOAuth).toHaveBeenLastCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://hannadvc.test/auth/callback?next=%2Fadmin%2Fowners%3Ffilter%3Dactive' },
    });
    first.unmount();
    currentParams.set('next', '//example.com');
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(authMock.signInWithOAuth).toHaveBeenLastCalledWith({
      provider: 'google', options: { redirectTo: 'https://hannadvc.test/auth/callback' },
    });
  });
});
