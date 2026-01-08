"use client";

import { useState } from "react";

import { Button } from "@pixiedvc/design-system";

type DevSeedRentalProps = {
  className?: string;
  buttonLabel?: string;
};

export default function DevSeedRental({ className, buttonLabel = "Seed demo rental" }: DevSeedRentalProps) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSeed = async () => {
    setState("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/dev/seed-owner-rental", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setState("error");
        setMessage(payload?.error ?? "Failed to seed rental.");
        return;
      }
      if (payload?.rentalId) {
        window.location.href = `/owner/rentals/${payload.rentalId}`;
        return;
      }
      setState("error");
      setMessage("Seed endpoint did not return a rental id.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Failed to seed rental.");
    }
  };

  return (
    <div className={className}>
      <Button onClick={handleSeed} disabled={state === "loading"}>
        {state === "loading" ? "Seeding..." : buttonLabel}
      </Button>
      {message ? <p className="mt-2 text-xs text-rose-600">{message}</p> : null}
    </div>
  );
}
