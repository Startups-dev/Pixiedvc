"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FormProvider, useForm } from "react-hook-form";

import { Card } from "@pixiedvc/design-system";

import { AgreementAndPayment } from "./steps/AgreementAndPayment";
import { GuestInfo } from "./steps/GuestInfo";
import { TripDetails } from "./steps/TripDetails";
import type { Prefill, OnComplete } from "./types";
import {
  AgreementInput,
  GuestInfoInput,
  TripDetailsInput,
  bookingFlowSchema,
} from "./schemas";

const depositAmount = 105;

type StepKey = "trip" | "guest" | "agreement";

const stepOrder: StepKey[] = ["trip", "guest", "agreement"];

type FormValues = {
  trip: TripDetailsInput;
  guest: GuestInfoInput;
  agreement: AgreementInput;
};

const motionVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

type BookingFlowProps = {
  prefill: Prefill;
  onComplete: OnComplete;
};

export function BookingFlow({ prefill, onComplete }: BookingFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
        altResortId: prefill.altResortId,
      },
      guest: {
        leadGuest: "",
        email: "",
        phone: "",
        adults: 2,
        youths: 0,
        address: "",
        city: "",
        region: "",
        postalCode: "",
        country: "United States",
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
    },
    mode: "onBlur",
  });

  const currentStep = stepOrder[stepIndex];

  const nextStep = () => setStepIndex((i) => Math.min(i + 1, stepOrder.length - 1));
  const prevStep = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleComplete = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const parsed = bookingFlowSchema.parse(values);
      const response = await fetch("/api/booking/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...parsed,
          depositAmount,
        }),
      });

      if (!response.ok) {
        throw new Error("Something went wrong creating your booking draft.");
      }

      const json = (await response.json()) as { bookingId: string };
      onComplete(json.bookingId);
    } catch (err) {
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
        <Card className="bg-white/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted">Booking Flow</p>
              <h2 className="font-display text-3xl text-ink">
                {stepIndex + 1} / {stepOrder.length} — {stepLabel}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
              <span className="inline-flex h-2 w-2 rounded-full bg-brand" aria-hidden />
              Deposit ${depositAmount}
            </div>
          </div>
          <div className="mt-4 h-1 rounded-full bg-white/50">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${((stepIndex + 1) / stepOrder.length) * 100}%` }}
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
              <TripDetails onNext={nextStep} />
            ) : currentStep === "guest" ? (
              <GuestInfo onBack={prevStep} onNext={nextStep} />
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
