"use client";

import { useRouter } from "next/navigation";

import { BookingFlow } from "@pixiedvc/booking-form";
import type { Prefill } from "@pixiedvc/booking-form";

export default function BookingFlowClient({
  prefill,
  resorts,
}: {
  prefill: Prefill;
  resorts: Array<{ id: string; name: string; slug?: string | null }>;
}) {
  const router = useRouter();

  return (
    <BookingFlow
      prefill={prefill}
      resorts={resorts}
      onComplete={(bookingId) => {
        router.push(`/guest?booking=${encodeURIComponent(bookingId)}`);
      }}
    />
  );
}
