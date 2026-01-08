"use client";

import { useState } from "react";
import Link from "next/link";

import type { NotificationRow } from "@/lib/owner-data";

export default function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  const [loading, setLoading] = useState(false);

  const markAllRead = async () => {
    if (!notifications.length) return;
    setLoading(true);
    await fetch("/api/owner/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: notifications.map((note) => note.id) }),
    });
    setLoading(false);
    window.location.reload();
  };

  if (!notifications.length) {
    return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">You are all caught up.</p>;
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={markAllRead}
        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600"
        disabled={loading}
      >
        {loading ? "Updating…" : "Mark all read"}
      </button>
      <ul className="space-y-3">
        {notifications.map((note) => (
          <li key={note.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{note.title}</p>
                {note.body ? <p className="text-xs text-muted">{note.body}</p> : null}
              </div>
              <div className="text-right text-xs text-muted">
                {new Date(note.created_at).toLocaleDateString()}
              </div>
            </div>
            {note.link ? (
              <Link href={note.link} className="mt-2 inline-flex text-xs font-semibold text-brand hover:underline">
                View details
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
