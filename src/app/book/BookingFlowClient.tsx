"use client";

import { useRouter } from "next/navigation";

import { BookingFlow } from "@pixiedvc/booking-form";
import type { Prefill } from "@pixiedvc/booking-form";
import type { GuestInfoInput } from "@pixiedvc/booking-form";

export default function BookingFlowClient({
  prefill,
  resorts,
  startAtGuestInfo = false,
  flowLabel,
  hideDepositBadge,
  stepDisplayOffset,
  totalStepsOverride,
  onGuestInfoNextPath,
  onGuestInfoSubmit,
}: {
  prefill: Prefill;
  resorts: Array<{ id: string; name: string; slug?: string | null }>;
  startAtGuestInfo?: boolean;
  flowLabel?: string;
  hideDepositBadge?: boolean;
  stepDisplayOffset?: number;
  totalStepsOverride?: number;
  onGuestInfoNextPath?: string;
  onGuestInfoSubmit?: (guest: GuestInfoInput) => Promise<void>;
}) {
  const router = useRouter();

  return (
    <BookingFlow
      prefill={prefill}
      resorts={resorts}
      startAtGuestInfo={startAtGuestInfo}
      flowLabel={flowLabel}
      hideDepositBadge={hideDepositBadge}
      stepDisplayOffset={stepDisplayOffset}
      totalStepsOverride={totalStepsOverride}
      onGuestInfoSubmit={onGuestInfoSubmit}
      onGuestInfoNext={
        onGuestInfoNextPath
          ? () => {
              router.push(onGuestInfoNextPath);
            }
          : undefined
      }
      onComplete={(bookingId) => {
        router.push(`/guest?booking=${encodeURIComponent(bookingId)}`);
      }}
    />
  );
}
