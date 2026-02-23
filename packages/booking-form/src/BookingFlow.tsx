"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FormProvider, useForm } from "react-hook-form";
import { ZodError } from "zod";

import { Card } from "@pixiedvc/design-system";

import { AgreementAndPayment } from "./steps/AgreementAndPayment";
import { GuestInfo } from "./steps/GuestInfo";
import { TripDetails } from "./steps/TripDetails";
import { getMaxOccupancyForSelection } from "@/lib/occupancy";
import { useReferral } from "@/hooks/useReferral";
import type { Prefill, OnComplete } from "./types";
import {
  AgreementInput,
  GuestInfoInput,
  TripDetailsInput,
  bookingFlowSchema,
} from "./schemas";

const depositAmount = 99;

type StepKey = "trip" | "guest" | "agreement";

type FormValues = {
  trip: TripDetailsInput;
  guest: GuestInfoInput;
  agreement: AgreementInput;
  referralCode?: string;
};

const motionVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

type BookingFlowProps = {
  prefill: Prefill;
  resorts: Array<{ id: string; name: string; slug?: string | null }>;
  onComplete: OnComplete;
  startAtGuestInfo?: boolean;
  flowLabel?: string;
  hideDepositBadge?: boolean;
  stepDisplayOffset?: number;
  totalStepsOverride?: number;
  disableAddressAutocomplete?: boolean;
  onGuestInfoNext?: () => void;
  onGuestInfoSubmit?: (guest: GuestInfoInput) => Promise<void>;
};

export function BookingFlow({
  prefill,
  resorts,
  onComplete,
  startAtGuestInfo = false,
  flowLabel = "Booking Flow",
  hideDepositBadge = false,
  stepDisplayOffset = 0,
  totalStepsOverride,
  disableAddressAutocomplete = false,
  onGuestInfoNext,
  onGuestInfoSubmit,
}: BookingFlowProps) {
  const stepOrder = startAtGuestInfo
    ? (["guest", "agreement"] as StepKey[])
    : (["trip", "guest", "agreement"] as StepKey[]);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { ref } = useReferral();

  const form = useForm<FormValues>({
    defaultValues: {
      trip: {
        resortId: prefill.resortId,
        resortName: prefill.resortName,
        villaType: prefill.villaType,
        checkIn: prefill.checkIn,
        checkOut: prefill.checkOut,
        points: prefill.points,
        estCash: prefill.estCash,
        accessibility: false,
        secondaryResortId: prefill.secondaryResortId,
        tertiaryResortId: prefill.tertiaryResortId,
      },
      guest: {
        leadTitle: "Mr.",
        leadFirstName: "",
        leadMiddleInitial: "",
        leadLastName: "",
        leadSuffix: "",
        email: "",
        phone: "",
        adults: 1,
        youths: 0,
        address: "",
        city: "",
        region: "",
        postalCode: "",
        country: "United States",
        adultGuests: [],
        childGuests: [],
        leadGuest: "",
        additionalGuests: [],
        referralSource: "",
        comments: "",
      },
      agreement: {
        acceptTerms: false,
        authorizeDeposit: false,
        signedName: "",
        captchaToken: "",
        gateway: "stripe",
      },
      referralCode: undefined,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (ref) {
      form.setValue("referralCode", ref, { shouldDirty: false });
    }
  }, [form, ref]);

  const currentStep = stepOrder[stepIndex] ?? stepOrder[0];
  const displayedStep = stepIndex + 1 + stepDisplayOffset;
  const displayedTotalSteps = totalStepsOverride ?? stepOrder.length;
  const progressPercent = Math.min(100, Math.max(0, (displayedStep / displayedTotalSteps) * 100));

  const nextStep = () => setStepIndex((i) => Math.min(i + 1, stepOrder.length - 1));
  const prevStep = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleComplete = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const maxOccupancy = getMaxOccupancyForSelection({
        roomLabel: values.trip.villaType,
        resortCode: values.trip.resortId,
      });
      const totalGuests =
        1 + (values.guest.adultGuests?.length ?? 0) + (values.guest.childGuests?.length ?? 0);
      if (totalGuests > maxOccupancy) {
        setStepIndex(stepOrder.indexOf("guest"));
        setError("Please choose a guest count that fits the villa’s maximum occupancy.");
        return;
      }
      const parsed = bookingFlowSchema.parse(values);
      if (process.env.NODE_ENV !== "production") {
        console.info("[book] agreement signedName present", {
          present: Boolean(parsed?.agreement?.signedName?.trim()),
        });
      }
      const middleInitial = parsed.guest.leadMiddleInitial?.trim() ?? "";
      const middleToken = middleInitial ? (middleInitial.endsWith(".") ? middleInitial : `${middleInitial}.`) : "";
      const leadGuestName = [
        parsed.guest.leadTitle,
        parsed.guest.leadFirstName,
        middleToken,
        parsed.guest.leadLastName,
        parsed.guest.leadSuffix,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const adultNames = (parsed.guest.adultGuests ?? []).map((guest) =>
        [
          guest.title,
          guest.firstName,
          guest.middleInitial
            ? guest.middleInitial.endsWith(".")
              ? guest.middleInitial
              : `${guest.middleInitial}.`
            : null,
          guest.lastName,
          guest.suffix,
        ]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      );
      const childNames = (parsed.guest.childGuests ?? []).map((guest) =>
        [
          guest.title,
          guest.firstName,
          guest.middleInitial
            ? guest.middleInitial.endsWith(".")
              ? guest.middleInitial
              : `${guest.middleInitial}.`
            : null,
          guest.lastName,
          guest.suffix,
        ]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      );
      const adults = 1 + (parsed.guest.adultGuests?.length ?? 0);
      const youths = parsed.guest.childGuests?.length ?? 0;
      const response = await fetch("/api/booking/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...parsed,
          guest: {
            ...parsed.guest,
            leadGuest: leadGuestName,
            additionalGuests: [...adultNames, ...childNames].filter(Boolean),
            adults,
            youths,
          },
          depositAmount,
          referral_code: ref ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error("Something went wrong creating your booking draft.");
      }

      const json = (await response.json()) as { bookingId: string };

      if (process.env.NODE_ENV !== "production") {
        console.info("[book] booking created id", { booking_request_id: json.bookingId });
      }

      if (parsed.agreement.gateway === "stripe") {
        const depositResponse = await fetch("/api/booking/deposit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: json.bookingId,
            amount: depositAmount,
            currency: "USD",
            customerEmail: parsed.guest.email,
            customerName: leadGuestName,
            gateway: "stripe",
          }),
        });

        const depositJson = (await depositResponse.json()) as { url?: string; error?: string };
        if (!depositResponse.ok || !depositJson.url) {
          throw new Error(depositJson.error ?? "Unable to start Stripe checkout.");
        }

        window.location.href = depositJson.url;
        return;
      }

      onComplete(json.bookingId);
    } catch (err) {
      if (err instanceof ZodError) {
        setError("Please fix the highlighted fields and try again.");
        return;
      }
      console.error(err);
      setError(
        err instanceof Error ? err.message : "We could not save your booking. Please try again.",
      );
    }
  });

  const stepLabel = useMemo(() => {
    switch (currentStep) {
      case "trip":
        return "Trip details";
      case "guest":
        return "Guest information";
      case "agreement":
        return "Agreement & payment";
      default:
        return "";
    }
  }, [currentStep]);

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <Card className="border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{flowLabel}</p>
              <h2 className="font-display text-3xl text-ink">
                {displayedStep} / {displayedTotalSteps} — {stepLabel}
              </h2>
            </div>
            {hideDepositBadge ? null : (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-600 shadow-sm">
                <span className="inline-flex h-2 w-2 rounded-full bg-brand" aria-hidden />
                Deposit ${depositAmount}
              </div>
            )}
          </div>
          <div className="mt-4 h-1 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>

        {error ? (
          <Card className="border border-[#dc2626] bg-[#fee2e2] text-[#7f1d1d]">
            <p className="font-semibold">{error}</p>
            <p className="text-sm">Please fix the highlighted fields and try again.</p>
          </Card>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={motionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {currentStep === "trip" ? (
              <TripDetails onNext={nextStep} resorts={resorts} />
            ) : currentStep === "guest" ? (
              <GuestInfo
                onBack={prevStep}
                onNext={async () => {
                  if (onGuestInfoSubmit) {
                    await onGuestInfoSubmit(form.getValues("guest"));
                    return;
                  }
                  if (onGuestInfoNext) {
                    onGuestInfoNext();
                    return;
                  }
                  nextStep();
                }}
                disableAddressAutocomplete={disableAddressAutocomplete}
              />
            ) : (
              <AgreementAndPayment onBack={prevStep} onSubmit={handleComplete} estimatedDeposit={depositAmount} />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.24em] text-muted">
          Secure • Refundable • Concierge Guided
        </div>
      </div>
    </FormProvider>
  );
}
