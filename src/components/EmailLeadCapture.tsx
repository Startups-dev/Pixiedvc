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
        <div className={cn("space-y-2", align === "center" ? "text-center" : "text-left")}>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{eyebrow}</p> : null}
          <h3 className={cn("font-semibold text-[#0F2148]", compact ? "text-lg" : "text-2xl sm:text-[28px]")}>{headline}</h3>
          {body ? <p className="text-sm leading-relaxed text-slate-500 sm:text-base">{body}</p> : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className={cn(
            compact ? "mt-4 flex flex-col gap-3 sm:flex-row sm:items-start lg:mt-0 lg:min-w-[420px]" : "mx-auto mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row",
          )}
        >
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
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
          <Button
            type="submit"
            disabled={saving || success}
            className={cn("h-14 rounded-2xl px-6 text-sm", compact ? "sm:px-7" : "sm:min-w-[150px]")}
          >
            {success ? "You’re in" : saving ? "Saving..." : buttonLabel}
          </Button>
        </form>

        {success || error || helperText ? (
          <p className={cn("mt-3 text-sm", success ? "text-emerald-700" : error ? "text-rose-600" : "text-slate-500", align === "center" ? "text-center" : "text-left")}>
            {success ? "You’re in. We’ll send you the best deals." : error || helperText}
          </p>
        ) : null}
      </div>
    </section>
  );
}
