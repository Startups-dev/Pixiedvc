"use client";

import { useState } from "react";
import Link from "next/link";

import type { OwnerNotificationListItem } from "@/lib/owner/secondary-subpages";

export default function NotificationList({ notifications }: { notifications: OwnerNotificationListItem[] }) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getMembershipId = (link: string | null) => {
    if (!link) return null;
    try {
      const url = new URL(link, window.location.origin);
      return url.searchParams.get("membershipId");
    } catch {
      return null;
    }
  };

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
    return (
      <div className="rounded-[18px] border border-[#E7E7E4] bg-white px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-[#10224A]">No notifications right now.</h2>
        <p className="mt-2 text-sm leading-6 text-[#667085]">Approvals, confirmations, payouts, and owner reminders will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#667085]">
          {notifications.filter((note) => !note.read).length} unread notification
          {notifications.filter((note) => !note.read).length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={markAllRead}
          className="inline-flex min-h-10 items-center rounded-full border border-[#E7E7E4] bg-white px-4 text-sm font-semibold text-[#10224A]"
          disabled={loading}
        >
          {loading ? "Updating..." : "Mark all read"}
        </button>
      </div>
      <ul className="space-y-3">
        {notifications.map((note) => (
          <li key={note.id} className="rounded-[18px] border border-[#E7E7E4] bg-white px-5 py-4 text-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#ECECE8] bg-white px-2.5 py-1 text-xs font-semibold text-[#667085]">
                    {note.read ? "Read" : "Unread"}
                  </span>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">{note.createdAtLabel}</p>
                </div>
                <p className="mt-3 font-semibold text-[#10224A]">{note.title}</p>
                {note.body ? <p className="mt-1 text-sm leading-6 text-[#667085]">{note.body}</p> : null}
              </div>
            </div>
            {note.canManageFallbackPrompt ? (
              <div className="mt-4 space-y-3 rounded-[14px] border border-[#ECECE8] bg-white p-4">
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center rounded-full border border-[#E7E7E4] bg-white px-4 text-sm font-semibold text-[#10224A]"
                  disabled={actionLoading === note.id}
                  onClick={async () => {
                    const membershipId = getMembershipId(note.href);
                    if (!membershipId) return;
                    setActionLoading(note.id);
                    await fetch(`/api/owner/memberships/${membershipId}/allow-standard`, { method: "POST" });
                    window.location.reload();
                  }}
                >
                  Allow standard matching
                </button>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#667085]">
                  <span>Remind me in</span>
                  {[7, 15, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      className="rounded-full border border-[#E7E7E4] px-3 py-1.5 text-xs font-semibold text-[#667085]"
                      disabled={actionLoading === note.id}
                      onClick={async () => {
                        const membershipId = getMembershipId(note.href);
                        if (!membershipId) return;
                        setActionLoading(note.id);
                        await fetch(`/api/owner/memberships/${membershipId}/fallback-remind`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ days }),
                        });
                        window.location.reload();
                      }}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>
            ) : note.href ? (
              <Link href={note.href} className="mt-3 inline-flex text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
                View details
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
