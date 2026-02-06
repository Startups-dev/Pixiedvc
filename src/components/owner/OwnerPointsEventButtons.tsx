"use client";

import { useState } from "react";

import { Button } from "@pixiedvc/design-system";

type OwnerPointsEventButtonsProps = {
  ownerMembershipId: string;
  defaultAmount?: number;
};

export default function OwnerPointsEventButtons({
  ownerMembershipId,
  defaultAmount = 0,
}: OwnerPointsEventButtonsProps) {
  const [amount, setAmount] = useState(() => Math.max(defaultAmount, 0));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleEvent = async (eventType: string) => {
    if (status === "saving") return;
    setStatus("saving");
    try {
      const response = await fetch(`/api/owner/memberships/${ownerMembershipId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          points_amount: amount,
        }),
      });
      if (!response.ok) throw new Error("request_failed");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="text-xs text-slate-500">
        Points affected
        <input
          type="number"
          min={0}
          step={1}
          value={Number.isFinite(amount) ? amount : 0}
          onChange={(event) => setAmount(Math.max(Number(event.target.value) || 0, 0))}
          className="ml-2 w-24 rounded-xl border border-slate-200 px-2 py-1 text-xs text-ink"
        />
      </label>
      <Button type="button" size="sm" variant="ghost" onClick={() => handleEvent("banked_points")}>
        I banked points
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => handleEvent("borrowed_points")}>
        I borrowed points
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => handleEvent("booked_outside")}>
        I booked outside PixieDVC
      </Button>
      {status === "saved" ? <span className="text-xs text-emerald-600">Saved.</span> : null}
      {status === "error" ? <span className="text-xs text-rose-600">Try again.</span> : null}
    </div>
  );
}
