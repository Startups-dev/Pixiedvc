"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { Card } from "@pixiedvc/design-system";
import { getClientAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase";
import {
  affiliateCard,
  affiliateInput,
  affiliateLink,
  affiliatePrimaryButton,
  affiliateTextMuted,
} from "@/lib/affiliate-theme";

export default function AffiliateLoginClient() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") === "update" ? "update" : searchParams.get("mode") === "reset" ? "reset" : "login";
  const rawRedirect = searchParams.get("redirect") ?? "/affiliate/dashboard";
  const allowedRedirects = new Set(["/affiliate", "/affiliate/dashboard", "/affiliate/guides", "/affiliate/resources"]);
  const redirectTo = allowedRedirects.has(rawRedirect) ? rawRedirect : "/affiliate/dashboard";
  const roleError = searchParams.get("error") === "role";
  const sessionError = searchParams.get("error") === "session";
  const confirmed = searchParams.get("confirmed") === "1" || searchParams.get("verified") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const redirectAfterAuth = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.assign(redirectTo);
      return;
    }
    router.replace(redirectTo);
  }, [redirectTo, router]);

  useEffect(() => {
    let isMounted = true;
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    const bootstrap = async () => {
      if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          setStatus("loading");
          setMessage("Finalizing sign-in…");
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            if (!isMounted) return;
            setStatus("error");
            setMessage(error.message);
            return;
          }

          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
      }

      if ((code || (tokenHash && type)) && isMounted) {
        const callbackBaseUrl = getClientAppUrl("/auth/callback");
        if (!callbackBaseUrl) {
          setStatus("error");
          setMessage("Unable to resolve the callback URL for affiliate sign-in.");
          return;
        }
        const callbackUrl = new URL(callbackBaseUrl);
        if (code) {
          callbackUrl.searchParams.set("code", code);
        }
        if (tokenHash && type) {
          callbackUrl.searchParams.set("token_hash", tokenHash);
          callbackUrl.searchParams.set("type", type);
        }
        callbackUrl.searchParams.set("next", redirectTo);
        router.replace(callbackUrl.toString());
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (data.user && mode !== "update" && !confirmed) {
        redirectAfterAuth();
        return;
      }
    };

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [confirmed, mode, redirectAfterAuth, redirectTo, router, searchParams, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    if (mode === "reset") {
      await fetch("/api/affiliate/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `/affiliate/login?mode=update&redirect=${encodeURIComponent(redirectTo)}`,
        }),
      }).catch(() => null);

      setStatus("sent");
      setMessage("If this email is approved, password reset instructions have been sent.");
      return;
    }

    if (mode === "update") {
      if (!password || password !== confirmPassword) {
        setStatus("error");
        setMessage("Passwords must match to continue.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setStatus("error");
        setMessage("Unable to update password. Please request a new reset link.");
        return;
      }

      setStatus("sent");
      setMessage("Password updated. Redirecting…");
      redirectAfterAuth();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setMessage("Invalid email or password.");
      return;
    }

    window.location.assign("/affiliate/dashboard");
  }

  const copy = {
    login: {
      title: "Access your dashboard",
      body: "Enter the email and password tied to your approved affiliate profile.",
      button: status === "loading" ? "Signing in…" : "Sign in",
    },
    reset: {
      title: "Reset your affiliate password",
      body: "Enter the email tied to your approved affiliate profile. If it is approved, we will send password reset instructions.",
      button: status === "loading" ? "Sending…" : "Send reset instructions",
    },
    update: {
      title: "Set your affiliate password",
      body: "Choose a new password for your affiliate portal account.",
      button: status === "loading" ? "Saving…" : "Set password",
    },
  }[mode];

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-16">
      <Card surface="dark" className={`w-full space-y-6 ${affiliateCard}`}>
        <div className="space-y-2">
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Affiliate Portal</p>
          <h1 className={`font-display text-3xl ${affiliateTextMuted}`}>{copy.title}</h1>
          <p className={`text-sm ${affiliateTextMuted}`}>
            {copy.body}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== "update" ? (
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-500">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@yourbrand.com"
                autoComplete="email"
                className={affiliateInput}
              />
            </label>
          ) : null}

          {mode !== "reset" ? (
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-500">
              Password
              <span className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete={mode === "update" ? "new-password" : "current-password"}
                  className={`${affiliateInput} pr-28`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>
          ) : null}

          {mode === "update" ? (
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-500">
              Confirm password
              <span className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className={`${affiliateInput} pr-28`}
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>
          ) : null}

          <button
            type="submit"
            disabled={status === "loading"}
            className={`inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${affiliatePrimaryButton}`}
          >
            {copy.button}
          </button>
        </form>

        {mode === "login" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link href="/affiliate/login?mode=reset" className={`font-semibold ${affiliateLink}`}>
              Forgot password?
            </Link>
            <Link href="/affiliate/login?mode=reset" className={`font-semibold ${affiliateLink}`}>
              Set password
            </Link>
          </div>
        ) : (
          <p className={`text-sm ${affiliateTextMuted}`}>
            Remember your password?{" "}
            <Link href="/affiliate/login" className={`font-semibold ${affiliateLink}`}>
              Sign in
            </Link>
            .
          </p>
        )}

        {message ? (
          <p className={`text-sm ${status === "error" ? "text-red-400" : "text-emerald-400"}`}>
            {message}
          </p>
        ) : null}
        {roleError && !message ? (
          <p className="text-sm text-red-400">
            This account is not approved for the affiliate portal.
          </p>
        ) : null}
        {sessionError && !message ? (
          <p className="text-sm text-red-400">
            Sign-in session could not be established. Please sign in again.
          </p>
        ) : null}
        {confirmed && !message ? (
          <p className="text-sm text-emerald-400">
            Email confirmed. You can now sign in to your partner account.
          </p>
        ) : null}

        <p className={`text-sm ${affiliateTextMuted}`}>
          New to PixieDVC affiliates?{" "}
          <Link href="/affiliate/apply" className={`font-semibold ${affiliateLink}`}>
            Apply here
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
