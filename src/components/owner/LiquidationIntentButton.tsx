"use client";

import { useState } from "react";

import { Button } from "@pixiedvc/design-system";

type LiquidationIntentButtonProps = {
  ownerMembershipId: number;
  reason?: string;
  label?: string;
};

export default function LiquidationIntentButton({
  ownerMembershipId,
  reason,
  label = "Liquidate",
}: LiquidationIntentButtonProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleClick = async () => {
    if (status === "saving" || status === "saved") return;
    setStatus("saving");
    try {
      const response = await fetch("/api/owner/liquidation-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_membership_id: ownerMembershipId, reason }),
      });
      if (!response.ok) throw new Error("request_failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleClick}
        disabled={status === "saving" || status === "saved"}
      >
        {label}
      </Button>
      {status === "saved" ? (
        <span className="text-xs text-emerald-600">We’ll contact you soon.</span>
      ) : null}
      {status === "error" ? (
        <span className="text-xs text-rose-600">Something went wrong. Try again.</span>
      ) : null}
    </div>
  );
}
