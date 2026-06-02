"use client";

import { FormEvent, useId, useState } from "react";

import { Button, TextInput, cn } from "@pixiedvc/design-system";

type EmailLeadSource = "hero_bar" | "post_intent" | "resort_section" | "bottom_cta";

type EmailLeadCaptureProps = {
  source: EmailLeadSource;
  headline: string;
  body?: string;
  helperText?: string;
  buttonLabel: string;
  placeholder?: string;
  className?: string;
  innerClassName?: string;
  eyebrow?: string;
  align?: "left" | "center";
  compact?: boolean;
  variant?: "default" | "homepage_hero";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailLeadCapture({
  source,
  headline,
  body,
  helperText,
  buttonLabel,
  placeholder = "Enter your email",
  className,
  innerClassName,
  eyebrow,
  align = "left",
  compact = false,
  variant = "default",
}: EmailLeadCaptureProps) {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || success) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/email-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, source }),
      });

      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to save your email right now.");
      }

      setSuccess(true);
      setEmail("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your email right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={className}>
      <div className={innerClassName}>
        <div className={cn("space-y-3", align === "center" ? "text-center" : "text-left")}>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{eyebrow}</p> : null}
          <h3
            className={cn(
              "font-semibold text-[#0F2148]",
              variant === "homepage_hero"
                ? "text-[2.2rem] leading-[1.05] tracking-[-0.04em] sm:text-[3.35rem]"
                : compact
                  ? "text-lg"
                  : "text-2xl sm:text-[28px]",
            )}
          >
            {headline}
          </h3>
          {body ? (
            <p
              className={cn(
                "leading-relaxed text-slate-500",
                variant === "homepage_hero" ? "mx-auto max-w-3xl text-lg leading-9 text-[#66779b]" : "text-sm sm:text-base",
              )}
            >
              {body}
            </p>
          ) : null}
        </div>

        {variant === "homepage_hero" && success ? (
          <div className="mx-auto mt-8 max-w-3xl rounded-[28px] border border-[#dce9d8] bg-[linear-gradient(180deg,#ffffff_0%,#f7fff8_100%)] px-6 py-7 text-center shadow-[0_24px_70px_rgba(15,33,72,0.08)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ebfff1] text-[#16a34a]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m7.5 12.5 3 3 6-7" />
              </svg>
            </div>
            <h4 className="mt-4 text-2xl font-semibold text-[#12311f]">You&rsquo;re in</h4>
            <p className="mt-3 text-base leading-7 text-[#567160]">We&rsquo;ll send you the best deals. Unsubscribe anytime.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={cn(
              variant === "homepage_hero"
                ? "mx-auto mt-8 flex w-full max-w-5xl flex-col gap-3 rounded-[30px] border border-[#dfe7fb] bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,33,72,0.12)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 sm:p-5"
                : compact
                ? "mt-4 flex flex-col gap-3 sm:flex-row sm:items-center lg:mt-0 lg:min-w-[420px] lg:self-center"
                : "mx-auto mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row",
            )}
          >
            <label htmlFor={emailId} className="sr-only">
              Email address
            </label>
            {variant === "homepage_hero" ? (
              <div className="flex h-14 items-center gap-4 rounded-[22px] border border-[#eef3ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] sm:flex-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2f6ff] text-[#7486ab]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h12A2.25 2.25 0 0 1 20.25 7.5v9A2.25 2.25 0 0 1 18 18.75H6a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                    <path d="m4.5 7.5 6.505 5.204a1.6 1.6 0 0 0 1.99 0L19.5 7.5" />
                  </svg>
                </span>
                <input
                  id={emailId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={placeholder}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  disabled={saving}
                  className="h-full w-full border-0 bg-transparent text-lg text-[#5f7196] outline-none placeholder:text-[#7f91b4]"
                />
              </div>
            ) : (
              <TextInput
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={placeholder}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError("");
                }}
                disabled={saving || success}
                className="mt-0 h-14 rounded-2xl border-white/60 bg-white/90 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:text-slate-400 focus:border-[#5b77ff] focus:ring-[#d7e0ff] sm:flex-1"
              />
            )}
            <Button
              type="submit"
              disabled={saving || success}
              className={cn(
                variant === "homepage_hero"
                  ? "h-14 rounded-[8px] bg-[linear-gradient(180deg,#3151f2_0%,#2342e6_100%)] px-8 text-base font-semibold shadow-[0_16px_36px_rgba(49,81,242,0.28)] hover:bg-[linear-gradient(180deg,#3859ff_0%,#2948eb_100%)] sm:min-w-[220px]"
                  : "h-14 rounded-2xl px-6 text-sm",
                variant === "homepage_hero" ? "" : compact ? "sm:px-7" : "sm:min-w-[150px]",
              )}
            >
              {saving ? "Saving..." : buttonLabel}
            </Button>
          </form>
        )}

        {variant === "homepage_hero" ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            {error ? (
              <p className={cn("text-sm", success ? "text-emerald-700" : "text-rose-600")}>
                {error}
              </p>
            ) : null}
            {!success ? (
              <div className="flex items-center gap-3 text-base text-[#66779b]">
                <span className="flex h-8 w-8 items-center justify-center text-[#18a34a]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="M12 3.75 5.25 6v5.805c0 4.675 2.67 8.94 6.75 10.445 4.08-1.505 6.75-5.77 6.75-10.445V6L12 3.75Z" />
                    <path d="m9.25 12.25 1.95 1.95 3.55-4.2" />
                  </svg>
                </span>
                <p>{helperText || "No spam. Unsubscribe anytime."}</p>
              </div>
            ) : null}
          </div>
        ) : success || error || helperText ? (
          <p className={cn("mt-3 text-sm", success ? "text-emerald-700" : error ? "text-rose-600" : "text-slate-500", align === "center" ? "text-center" : "text-left")}>
            {success ? "You’re in. We’ll send you the best deals." : error || helperText}
          </p>
        ) : null}
      </div>
    </section>
  );
}
