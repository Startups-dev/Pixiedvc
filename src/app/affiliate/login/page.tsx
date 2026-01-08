"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, Card } from "@pixiedvc/design-system";
import { createClient } from "@/lib/supabase";

export default function AffiliateLoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get("redirect") ?? "/affiliate/dashboard";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      if (data.user) {
        router.replace(redirectTo);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [redirectTo, router, supabase]);

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
      <Card className="w-full space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Affiliate Portal</p>
          <h1 className="font-display text-3xl text-ink">Access your dashboard</h1>
          <p className="text-sm text-muted">
            Enter the email tied to your affiliate profile. We will send you a secure, passwordless link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@yourbrand.com"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
            />
          </label>

          <Button type="submit" disabled={status === "loading"} fullWidth>
            {status === "loading" ? "Sending…" : "Send magic link"}
          </Button>
        </form>

        {message ? (
          <p className={`text-sm ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>
            {message}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
