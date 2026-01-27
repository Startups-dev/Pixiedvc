"use client";

import { useRouter } from "next/navigation";

import { BookingFlow } from "@pixiedvc/booking-form";
import type { Prefill } from "@pixiedvc/booking-form";

export default function BookingFlowClient({ prefill }: { prefill: Prefill }) {
  const router = useRouter();

  return (
    <BookingFlow
      prefill={prefill}
      onComplete={(bookingId) => {
        router.push(`/guest?booking=${encodeURIComponent(bookingId)}`);
      }}
    />
  );
}
