"use client";

import { useState } from "react";

import { Card } from "@pixiedvc/design-system";

const ADMIN_CODES = [
  "guest_verified",
  "payment_verified",
  "booking_package_sent",
  "agreement_sent",
  "check_in",
  "check_out",
] as const;

const ADMIN_LABELS: Record<string, string> = {
  guest_verified: "Guest verified",
  payment_verified: "Payment verified (authorized)",
  booking_package_sent: "Booking package ready",
  agreement_sent: "Agreement preview",
  check_in: "Check-in",
  check_out: "Check-out",
};

type MilestoneRow = {
  code: string;
  status: string;
  occurred_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function AdminRentalMilestonesClient({
  rentalId,
  milestones,
}: {
  rentalId: string;
  milestones: MilestoneRow[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleComplete = async (code: string) => {
    setLoading(code);
    setMessage(null);

    const response = await fetch(`/api/admin/rentals/${rentalId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, status: "completed" }),
    });

    if (!response.ok) {
      setMessage("Unable to update milestone.");
      setLoading(null);
      return;
    }

    setMessage("Milestone updated.");
    setLoading(null);
    window.location.reload();
  };

  const milestoneLookup = new Map(milestones.map((milestone) => [milestone.code, milestone]));

  return (
    <Card surface="dark" className="space-y-4 border-[#3a3a3a] bg-[#2f2f2f]">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Milestones</p>
        <h2 className="text-xl font-semibold" style={{ color: '#64748b' }}>Concierge actions</h2>
        <p className="text-xs text-[#8e8ea0]">Uses service role to bypass RLS; owners cannot trigger these milestones.</p>
      </div>

      <div className="space-y-3 text-sm text-[#b4b4b4]">
        {ADMIN_CODES.map((code) => {
          const milestone = milestoneLookup.get(code);
          const isCompleted = milestone?.status === "completed";

          return (
            <div key={code} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#3a3a3a] bg-[#2a2a2a] px-4 py-3">
              <div>
                <p className="font-semibold text-[#ececec]">{ADMIN_LABELS[code] ?? code.replace(/_/g, " ")}</p>
                <p className="text-xs text-[#8e8ea0]">Completed: {formatDate(milestone?.occurred_at ?? null)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleComplete(code)}
                disabled={isCompleted || loading === code}
                className="rounded-full border border-[#3a3a3a] bg-[#212121] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ececec] disabled:opacity-50"
              >
                {isCompleted ? "Completed" : loading === code ? "Updating…" : "Mark complete"}
              </button>
            </div>
          );
        })}
      </div>

      {message ? <p className="text-xs text-[#10a37f]">{message}</p> : null}
    </Card>
  );
}
