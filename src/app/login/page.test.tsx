import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import LoginPage from './page';

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
    Object.values(authMock).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        fn.mockClear();
      }
    });
  });

  test('renders login view by default', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in to pixiedvc/i })).toBeInTheDocument();
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
});
