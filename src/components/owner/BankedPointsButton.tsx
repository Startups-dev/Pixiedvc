"use client";

import { useState } from "react";

import { Button } from "@pixiedvc/design-system";

type BankedPointsButtonProps = {
  ownerMembershipId: number;
  reason?: string;
  defaultAmount?: number;
};

export default function BankedPointsButton({
  ownerMembershipId,
  reason,
  defaultAmount = 0,
}: BankedPointsButtonProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [amount, setAmount] = useState(() => Math.max(defaultAmount, 0));

  const handleClick = async () => {
    if (status === "saving" || status === "saved") return;
    setStatus("saving");
    try {
      const response = await fetch(`/api/owner/memberships/${ownerMembershipId}/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, banked_points_amount: amount }),
      });
      if (!response.ok) throw new Error("request_failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <label className="text-xs text-muted">
        Amount banked
        <input
          type="number"
          min={0}
          step={1}
          value={Number.isFinite(amount) ? amount : 0}
          onChange={(event) => setAmount(Math.max(Number(event.target.value) || 0, 0))}
          className="mt-1 w-28 rounded-xl border border-slate-200 px-2 py-1 text-xs text-ink"
        />
      </label>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={status === "saving" || status === "saved"}
      >
        I banked these points
      </Button>
      {status === "saved" ? (
        <span className="text-xs text-emerald-600">Marked as banked.</span>
      ) : null}
      {status === "error" ? (
        <span className="text-xs text-rose-600">Something went wrong. Try again.</span>
      ) : null}
    </div>
  );
}
