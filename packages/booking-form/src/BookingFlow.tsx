"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FormProvider, useForm } from "react-hook-form";
import { ZodError } from "zod";

import { Card } from "@pixiedvc/design-system";

import { AgreementAndPayment } from "./steps/AgreementAndPayment";
import { GuestInfo } from "./steps/GuestInfo";
import { TripDetails } from "./steps/TripDetails";
import { getMaxOccupancyForSelection } from "@/lib/occupancy";
import { useReferral } from "@/hooks/useReferral";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Prefill, OnComplete } from "./types";
import {
  AgreementInput,
  GuestInfoInput,
  TripDetailsInput,
  agreementSchema,
  bookingFlowSchema,
  guestInfoSchema,
  tripDetailsSchema,
} from "./schemas";

const depositAmount = 99;
const GUEST_BOOKING_DRAFT_KEY = "pixiedvc:guestBookingDraft:v2";
const READY_STAYS_FLOW_LABEL = "Ready Stays booking";
const GUEST_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type StepKey = "trip" | "guest" | "agreement";

type FormValues = {
  trip: TripDetailsInput;
  guest: GuestInfoInput;
  agreement: AgreementInput;
  referralCode?: string;
};

type GuestBookingDraft = {
  v: 2;
  savedAt: number;
  stepIndex?: number;
  stepId?: StepKey;
  pathname?: string;
  quoteToken?: string;
  data: {
    trip?: TripDetailsInput;
    guest?: GuestInfoInput;
    agreement?: AgreementInput;
    referralCode?: string;
  };
};

type BookingCreateErrorPayload = {
  error?: string;
  step?: StepKey;
  fieldErrors?: Record<string, string>;
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
  initialGuest?: Partial<GuestInfoInput>;
  signInHref?: string;
  onSignInClick?: (guest: GuestInfoInput) => void;
  quoteToken?: string;
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
  initialGuest,
  signInHref,
  onSignInClick,
  quoteToken,
}: BookingFlowProps) {
  const stepOrder = startAtGuestInfo
    ? (["guest", "agreement"] as StepKey[])
    : (["trip", "guest", "agreement"] as StepKey[]);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const didRestoreDraftRef = useRef(false);
  const { ref } = useReferral();
  const isReadyStaysFlow = flowLabel === READY_STAYS_FLOW_LABEL;

  const form = useForm<FormValues>({
    defaultValues: {
      trip: {
        resortId: prefill.resortId,
        resortName: prefill.resortName,
        villaType: prefill.villaType,
        building_preference: "none",
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
        ...initialGuest,
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

  useEffect(() => {
    if (didRestoreDraftRef.current) return;
    didRestoreDraftRef.current = true;

    if (typeof window === "undefined" || isReadyStaysFlow) return;

    try {
      const raw = window.localStorage.getItem(GUEST_BOOKING_DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<GuestBookingDraft> & {
        trip?: TripDetailsInput;
        guest?: GuestInfoInput;
        agreement?: AgreementInput;
        referralCode?: string;
      };
      const draftSavedAt =
        typeof parsed.savedAt === "number"
          ? parsed.savedAt
          : typeof parsed.savedAt === "string"
            ? Date.parse(parsed.savedAt)
            : NaN;
      if (!Number.isFinite(draftSavedAt) || Date.now() - draftSavedAt > GUEST_DRAFT_TTL_MS) {
        window.localStorage.removeItem(GUEST_BOOKING_DRAFT_KEY);
        return;
      }

      if (typeof parsed.pathname === "string") {
        const draftUrl = new URL(parsed.pathname, window.location.origin);
        const currentUrl = new URL(window.location.pathname + window.location.search, window.location.origin);
        if (draftUrl.pathname !== currentUrl.pathname) {
          return;
        }
      }

      const currentQuoteToken = new URLSearchParams(window.location.search).get("quote") ?? undefined;
      if (parsed.quoteToken && currentQuoteToken && parsed.quoteToken !== currentQuoteToken) {
        return;
      }

      const draftData = parsed?.v === 2 ? parsed.data ?? {} : parsed;

      const current = form.getValues();
      form.reset(
        {
          ...current,
          ...(draftData?.trip ? { trip: draftData.trip } : {}),
          ...(draftData?.guest ? { guest: draftData.guest } : {}),
          ...(draftData?.agreement ? { agreement: draftData.agreement } : {}),
          ...(draftData?.referralCode ? { referralCode: draftData.referralCode } : {}),
        },
        {
          keepDefaultValues: true,
          keepDirty: false,
          keepTouched: false,
        },
      );

      const draftStepFromIndex =
        typeof parsed?.stepIndex === "number" && Number.isFinite(parsed.stepIndex)
          ? Math.max(0, Math.min(parsed.stepIndex, stepOrder.length - 1))
          : null;
      const draftStepFromId =
        typeof parsed?.stepId === "string" ? stepOrder.indexOf(parsed.stepId as StepKey) : -1;

      if (draftStepFromIndex !== null) {
        setStepIndex(draftStepFromIndex);
      } else if (draftStepFromId >= 0) {
        setStepIndex(draftStepFromId);
      }
    } catch {
      // Ignore malformed drafts.
    }
  }, [form, isReadyStaysFlow, stepOrder]);

  const clearGuestDraft = () => {
    if (typeof window === "undefined" || isReadyStaysFlow) return;
    window.localStorage.removeItem(GUEST_BOOKING_DRAFT_KEY);
  };

  const persistGuestDraft = (step: { stepIndex?: number; stepId?: StepKey } = {}) => {
    if (typeof window === "undefined" || isReadyStaysFlow) return;
    const values = form.getValues();
    const currentQuoteToken = new URLSearchParams(window.location.search).get("quote") ?? quoteToken;
    const draft: GuestBookingDraft = {
      v: 2,
      savedAt: Date.now(),
      stepIndex: step.stepIndex,
      stepId: step.stepId,
      pathname: `${window.location.pathname}${window.location.search}`,
      quoteToken: currentQuoteToken ?? undefined,
      data: {
        trip: values.trip,
        guest: values.guest,
        agreement: values.agreement,
        referralCode: values.referralCode,
      },
    };
    window.localStorage.setItem(GUEST_BOOKING_DRAFT_KEY, JSON.stringify(draft));
  };

  const currentStep = stepOrder[stepIndex] ?? stepOrder[0];
  const displayedStep = stepIndex + 1 + stepDisplayOffset;
  const displayedTotalSteps = totalStepsOverride ?? stepOrder.length;
  const progressPercent = Math.min(100, Math.max(0, (displayedStep / displayedTotalSteps) * 100));

  const nextStep = () => setStepIndex((i) => Math.min(i + 1, stepOrder.length - 1));
  const prevStep = () => setStepIndex((i) => Math.max(i - 1, 0));

  const getStepLabel = (step: StepKey) => {
    switch (step) {
      case "trip":
        return "Trip details";
      case "guest":
        return "Guest information";
      case "agreement":
        return "Agreement & payment";
      default:
        return "this step";
    }
  };

  const focusAndScrollToInvalid = () => {
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body) {
        active.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const firstInvalid = document.querySelector<HTMLElement>(
        "[aria-invalid='true'], input:invalid, textarea:invalid, select:invalid",
      );
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid.focus();
      }
    });
  };

  const applyFieldErrors = (
    fieldErrors: Record<string, string>,
    fallbackStep: StepKey = currentStep,
  ) => {
    let targetStep: StepKey | null = null;
    let first = true;
    Object.entries(fieldErrors).forEach(([path, message]) => {
      const firstSegment = path.split(".")[0] as StepKey;
      if (!targetStep && (firstSegment === "trip" || firstSegment === "guest" || firstSegment === "agreement")) {
        targetStep = firstSegment;
      }
      form.setError(path as never, { type: "manual", message }, { shouldFocus: first });
      first = false;
    });
    const resolvedStep = targetStep ?? fallbackStep;
    const stepIndexToSet = stepOrder.indexOf(resolvedStep);
    if (stepIndexToSet >= 0) {
      setStepIndex(stepIndexToSet);
    }
    setError(`Please complete required fields in ${getStepLabel(resolvedStep)}.`);
    focusAndScrollToInvalid();
  };

  const validateStep = async (step: StepKey) => {
    const value = form.getValues(step) as unknown;
    const schema =
      step === "trip"
        ? tripDetailsSchema
        : step === "guest"
          ? guestInfoSchema
          : agreementSchema;
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const pathParts = [step, ...issue.path.map((part) => String(part))];
        const fieldPath = pathParts.join(".");
        fieldErrors[fieldPath] = issue.message || "This field is required.";
      });
      applyFieldErrors(fieldErrors, step);
      return false;
    }
    return true;
  };

  const handleComplete = form.handleSubmit(async (values) => {
    setError(null);
    try {
      if (!(await validateStep("agreement"))) {
        return;
      }
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

      if (!isReadyStaysFlow) {
        const supabase = supabaseBrowser();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          persistGuestDraft({ stepIndex, stepId: currentStep });
          setError("Please sign in to pay the deposit.");
          const nextPath = `${window.location.pathname}${window.location.search}`;
          const loginParams = new URLSearchParams({
            next: nextPath,
            intent: "guest-booking",
          });
          const email = form.getValues("guest.email")?.trim();
          if (email) {
            loginParams.set("email", email);
          }
          window.location.href = `/login?${loginParams.toString()}`;
          return;
        }
      }

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
        const payload = (await response.json().catch(() => null)) as BookingCreateErrorPayload | null;
        if (payload?.fieldErrors && Object.keys(payload.fieldErrors).length > 0) {
          applyFieldErrors(payload.fieldErrors, payload.step ?? "guest");
          return;
        }
        if (payload?.step) {
          const stepIndexToSet = stepOrder.indexOf(payload.step);
          if (stepIndexToSet >= 0) setStepIndex(stepIndexToSet);
          setError(payload.error ?? `Please complete required fields in ${getStepLabel(payload.step)}.`);
          focusAndScrollToInvalid();
          return;
        }
        throw new Error(payload?.error ?? "Something went wrong creating your booking draft.");
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
          if (depositResponse.status === 401 && depositJson.error === "AUTH_REQUIRED" && !isReadyStaysFlow) {
            persistGuestDraft({ stepIndex, stepId: currentStep });
            const nextPath = `${window.location.pathname}${window.location.search}`;
            const loginParams = new URLSearchParams({
              next: nextPath,
              intent: "guest-booking",
            });
            const email = form.getValues("guest.email")?.trim();
            if (email) {
              loginParams.set("email", email);
            }
            window.location.href = `/login?${loginParams.toString()}`;
            return;
          }
          throw new Error(depositJson.error ?? "Unable to start Stripe checkout.");
        }

        clearGuestDraft();
        window.location.href = depositJson.url;
        return;
      }

      clearGuestDraft();
      onComplete(json.bookingId);
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          const path = issue.path.map((part) => String(part)).join(".");
          if (path) {
            fieldErrors[path] = issue.message || "This field is required.";
          }
        });
        if (Object.keys(fieldErrors).length > 0) {
          applyFieldErrors(fieldErrors, "guest");
          return;
        }
        setError("Please complete the required fields before submitting.");
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
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-500 shadow-sm">
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
              <TripDetails
                onNext={async () => {
                  setError(null);
                  form.clearErrors("trip");
                  const ok = await validateStep("trip");
                  if (!ok) return;
                  nextStep();
                }}
                resorts={resorts}
              />
            ) : currentStep === "guest" ? (
              <GuestInfo
                onBack={prevStep}
                onNext={async () => {
                  setError(null);
                  form.clearErrors("guest");
                  const ok = await validateStep("guest");
                  if (!ok) return;
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
                signInHref={signInHref}
                onSignInClick={onSignInClick}
              />
            ) : (
              <AgreementAndPayment
                onBack={prevStep}
                onSubmit={handleComplete}
                estimatedDeposit={depositAmount}
                showCaptchaField={isReadyStaysFlow}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.24em] text-muted">
            Secure • Refundable • Concierge Guided
          </div>
          {!isReadyStaysFlow ? (
            <p className="text-center text-xs text-slate-500">Sign in required to pay and receive confirmation.</p>
          ) : null}
        </div>
      </div>
    </FormProvider>
  );
}
