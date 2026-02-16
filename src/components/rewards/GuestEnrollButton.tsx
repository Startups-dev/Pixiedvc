"use client";

import { useState, useTransition } from "react";

export default function GuestEnrollButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleEnroll() {
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/guest/rewards/enroll", { method: "POST" });
        const json = await response.json();
        if (!response.ok) {
          setMessage(json?.error ?? "Enrollment failed.");
          return;
        }
        setMessage("Enrolled. Your perks are active.");
      } catch {
        setMessage("Enrollment failed.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleEnroll}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-[#0B1B3A] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2553] disabled:opacity-70"
      >
        Enroll now
      </button>
      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
