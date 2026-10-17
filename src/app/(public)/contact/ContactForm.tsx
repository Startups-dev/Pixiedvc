"use client";

import { useState } from "react";
import { Button, FieldLabel, TextArea, TextInput } from "@pixiedvc/design-system";

const control =
  "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 shadow-sm " +
  "placeholder:text-slate-400 transition-colors hover:border-slate-400 hover:ring-slate-300 " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-0";

export default function ContactForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"sent" | "error" | null>(null);
  const [acknowledgment, setAcknowledgment] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          audience: String(formData.get("audience") ?? "other"),
          message: String(formData.get("message") ?? ""),
          sourcePage: window.location.pathname,
          website: String(formData.get("website") ?? ""),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setResult("error");
        return;
      }
      setAcknowledgment(payload.acknowledgment ?? null);
      setResult("sent");
      if (payload.duplicate) return;
      (document.getElementById("public-contact-form") as HTMLFormElement | null)?.reset();
    } catch {
      setResult("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      id="public-contact-form"
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
    >
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <TextInput id="name" name="name" className={control} placeholder="Your name" autoComplete="name" required maxLength={120} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <TextInput id="email" name="email" type="email" className={control} placeholder="you@example.com" autoComplete="email" required maxLength={254} />
        </div>
        <div>
          <FieldLabel htmlFor="audience">I am a</FieldLabel>
          <select id="audience" name="audience" className={`${control} appearance-none`} defaultValue="guest">
            <option value="guest">Guest</option>
            <option value="owner">Owner</option>
            <option value="affiliate">Affiliate / partner</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="message">How can we help?</FieldLabel>
        <TextArea id="message" name="message" rows={5} className={control} placeholder="Tell us what you need help with." required minLength={10} maxLength={5000} />
      </div>
      {result === "sent" ? (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Your message is in HannaDVC’s staff Inbox.
          {acknowledgment === "sent" ? " The acknowledgment was accepted by our email provider." : acknowledgment === "failed" ? " We could not send the email acknowledgment, but your message was saved." : " The acknowledgment email status is still being confirmed."}
        </p>
      ) : null}
      {result === "error" ? <p role="alert" className="text-sm text-rose-700">We couldn’t submit your message. Please try again or email hello@hannadvc.com.</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send Message"}</Button>
    </form>
  );
}
