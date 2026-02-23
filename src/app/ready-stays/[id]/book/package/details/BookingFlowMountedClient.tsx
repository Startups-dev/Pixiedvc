"use client";

import { useEffect, useState } from "react";

import BookingFlowClient from "@/app/book/BookingFlowClient";
import type { GuestInfoInput } from "@pixiedvc/booking-form";

type MountedProps = {
  prefill: {
    resortId: string;
    resortName: string;
    villaType: string;
    checkIn: string;
    checkOut: string;
    points: number;
    estCash: number;
  };
  resorts: Array<{ id: string; name: string; slug: string | null }>;
  readyStayId: string;
  bookingId: string;
};

export default function BookingFlowMountedClient({
  prefill,
  resorts,
  readyStayId,
  bookingId,
}: MountedProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <BookingFlowClient
      prefill={prefill}
      resorts={resorts}
      startAtGuestInfo
      flowLabel="Ready Stays booking"
      hideDepositBadge
      stepDisplayOffset={1}
      totalStepsOverride={3}
      onGuestInfoSubmit={async (guest: GuestInfoInput) => {
        const response = await fetch("/api/ready-stays/guest-info", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            readyStayId,
            bookingId,
            guest,
          }),
        });

        const json = (await response.json().catch(() => null)) as
          | { agreementPath?: string; error?: string }
          | null;

        if (!response.ok || !json?.agreementPath) {
          throw new Error(json?.error ?? "Unable to save guest details.");
        }

        window.location.href = json.agreementPath;
      }}
    />
  );
}
