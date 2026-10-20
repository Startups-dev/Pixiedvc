"use client";

import { FormEvent, useState } from "react";

export default function AffiliateContactForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setNotice("");
    try {
      const response = await fetch("/api/affiliate/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "SUPPORT_SUBMIT_FAILED");
      setState("sent");
      setNotice(payload.message ?? "Your message is with Hanna’s team. We’ll reply by email.");
      setSubject("");
      setMessage("");
    } catch {
      setState("error");
      setNotice("We couldn’t save your message. Please try again or email hello@hannadvc.com.");
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-sm font-semibold text-[#10224A]">
        Subject
        <input
          required minLength={3} maxLength={120} value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#E7E7E4] bg-white px-4 py-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#C7A64E]"
        />
      </label>
      <label className="block text-sm font-semibold text-[#10224A]">
        How can we help?
        <textarea
          required minLength={10} maxLength={5000} rows={5} value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-2 w-full resize-y rounded-xl border border-[#E7E7E4] bg-white px-4 py-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#C7A64E]"
        />
      </label>
      <button type="submit" disabled={state === "sending"} className="rounded-xl bg-[#10224A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Send to Hanna"}
      </button>
      {notice ? <p role="status" className={`text-sm ${state === "error" ? "text-rose-700" : "text-[#58657A]"}`}>{notice}</p> : null}
    </form>
  );
}
