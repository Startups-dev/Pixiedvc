"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { Button, Card } from "@pixiedvc/design-system";
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
  const rawRedirect = searchParams.get("redirect") ?? "/affiliate/dashboard";
  const allowedRedirects = new Set(["/affiliate", "/affiliate/dashboard", "/affiliate/guides", "/affiliate/resources"]);
  const redirectTo = allowedRedirects.has(rawRedirect) ? rawRedirect : "/affiliate/dashboard";
  const roleError = searchParams.get("error") === "role";
  const sessionError = searchParams.get("error") === "session";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

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
        const callbackUrl = new URL("/auth/callback", window.location.origin);
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
      if (data.user) {
        router.replace(redirectTo);
        return;
      }
    };

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [redirectTo, router, searchParams, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
            : undefined,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your inbox for a secure sign-in link.");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-16">
      <Card surface="dark" className={`w-full space-y-6 ${affiliateCard}`}>
        <div className="space-y-2">
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Affiliate Portal</p>
          <h1 className="font-display text-3xl text-slate-500">Access your dashboard</h1>
          <p className={`text-sm ${affiliateTextMuted}`}>
            Enter the email tied to your affiliate profile. We will send you a secure, passwordless link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-500">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@yourbrand.com"
              className={affiliateInput}
            />
          </label>

          <Button type="submit" disabled={status === "loading"} fullWidth className={affiliatePrimaryButton}>
            {status === "loading" ? "Sending…" : "Send magic link"}
          </Button>
        </form>

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
            Sign-in session could not be established. Please request a new magic link.
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
