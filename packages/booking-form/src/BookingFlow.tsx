"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import { FormProvider, useForm } from "react-hook-form";
import { ZodError } from "zod";

import { Card } from "@pixiedvc/design-system";

import { AgreementAndPayment } from "./steps/AgreementAndPayment";
import { GuestInfo } from "./steps/GuestInfo";
import { TripDetails } from "./steps/TripDetails";
import { getMaxOccupancyForSelection } from "@/lib/occupancy";
import { resolveResortImage } from "@/lib/resort-image";
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

function formatDateRange(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return "";
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel}–${endLabel}`;
}

function calculateNights(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  if (Number.isNaN(diff) || diff <= 0) return 0;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

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
  stepDisplayOffset = startAtGuestInfo ? 1 : 0,
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
        viewType: prefill.viewType,
        pricingTier: prefill.pricingTier,
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
        accessibilityNotes: "",
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
  const displayedTotalSteps = totalStepsOverride ?? 3;

  const nextStep = () => setStepIndex((i) => Math.min(i + 1, stepOrder.length - 1));
  const prevStep = () => setStepIndex((i) => Math.max(i - 1, 0));

  const getStepLabel = (step: StepKey) => {
    switch (step) {
      case "trip":
        return "Review your stay";
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
      const combinedComments = [
        parsed.trip.accessibility && parsed.guest.accessibilityNotes?.trim()
          ? `Accessibility accommodations: ${parsed.guest.accessibilityNotes.trim()}`
          : null,
        parsed.guest.comments?.trim() ? parsed.guest.comments.trim() : null,
      ]
        .filter(Boolean)
        .join("\n\n");
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
            comments: combinedComments,
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
        return "Stay details";
      case "guest":
        return "Guest information";
      case "agreement":
        return "Review & deposit";
      default:
        return "";
    }
  }, [currentStep]);

  const progressSteps: Array<{ key: StepKey; label: string }> = [
    { key: "trip", label: "Stay Details" },
    { key: "guest", label: "Guest Information" },
    { key: "agreement", label: "Review & Deposit" },
  ];

  const currentProgressIndex =
    currentStep === "trip" ? 0 : currentStep === "guest" ? 1 : 2;
  const progressPercent = Math.min(100, Math.max(0, (displayedStep / displayedTotalSteps) * 100));
  const tripValues = form.watch("trip");
  const guestValues = form.watch("guest");
  const selectedResort =
    resorts.find((resort) => resort.id === tripValues.resortId || resort.slug === tripValues.resortId) ?? null;
  const reservationImage = resolveResortImage({
    resortCode: tripValues.resortId,
    resortSlug: selectedResort?.slug,
    imageIndex: 1,
  }).url;
  const reservationNights = calculateNights(tripValues.checkIn, tripValues.checkOut);
  const reservationDateLabel = formatDateRange(tripValues.checkIn, tripValues.checkOut);
  const reservationGuestCount =
    1 + (guestValues?.adultGuests?.length ?? 0) + (guestValues?.childGuests?.length ?? 0);
  const reservationAverageNightly =
    reservationNights > 0 && Number.isFinite(tripValues.estCash)
      ? tripValues.estCash / reservationNights
      : 0;
  const formattedReservationTotal = Number.isFinite(tripValues.estCash)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(tripValues.estCash)
    : "$0.00";
  const formattedReservationAverage = Number.isFinite(reservationAverageNightly)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(reservationAverageNightly)
    : "$0";

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{flowLabel}</p>
              <h2 className="font-display text-3xl text-ink">{stepLabel}</h2>
            </div>
            {hideDepositBadge ? null : (
              <div className="rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-xs font-medium tracking-[0.18em] text-slate-500 shadow-sm">
                Refundable deposit ${depositAmount}
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-slate-200/80 bg-white/92 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <div className="grid gap-4 sm:grid-cols-3 sm:items-center">
              {progressSteps.map((step, index) => {
                const isComplete = index < currentProgressIndex;
                const isCurrent = index === currentProgressIndex;

                return (
                  <div key={step.key} className="relative min-w-0">
                    {index < progressSteps.length - 1 ? (
                      <span
                        aria-hidden
                        className={`absolute left-9 right-[-1rem] top-4 hidden h-px sm:block ${
                          index < currentProgressIndex ? "bg-[#5568d5]/40" : "bg-slate-200"
                        }`}
                      />
                    ) : null}
                    <div className="relative flex items-center gap-3">
                      <span
                        className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm ${
                          isCurrent
                            ? "border-[#5568d5]/30 bg-[#eef2ff] text-[#4457c7]"
                            : isComplete
                              ? "border-[#5568d5]/20 bg-white text-[#4457c7]"
                              : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {isComplete ? <CheckIcon className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className={`text-sm font-medium ${isCurrent ? "text-ink" : isComplete ? "text-slate-700" : "text-slate-400"}`}>
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 h-[2px] rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[linear-gradient(to_right,#5568d5,#4457c7)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {error ? (
          <Card className="border border-[#dc2626] bg-[#fee2e2] text-[#7f1d1d]">
            <p className="font-semibold">{error}</p>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.8fr)] lg:items-start">
          <aside className="space-y-4">
            <details className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)] lg:hidden" open>
              <summary className="cursor-pointer list-none px-5 py-4 marker:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Your stay</div>
                    <div className="mt-1 text-base font-semibold text-ink">{tripValues.resortName || "Disney villa stay"}</div>
                  </div>
                  <div className="text-sm text-slate-500">{formattedReservationTotal} USD</div>
                </div>
              </summary>
              <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                <div className="overflow-hidden rounded-2xl bg-slate-100">
                  <img src={reservationImage} alt={tripValues.resortName || "Disney villa stay"} className="h-40 w-full object-cover" />
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p className="font-medium text-ink">{tripValues.villaType} · {tripValues.viewType || "Villa view"}</p>
                  <p>{reservationDateLabel} · {reservationNights} nights</p>
                  <p>{reservationGuestCount} guests</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium text-ink">{formattedReservationAverage} / night</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                    <span>{tripValues.points} DVC points</span>
                  </div>
                  {tripValues.pricingTier ? (
                    <div className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-medium text-[#4457c7]">
                      {tripValues.pricingTier}
                    </div>
                  ) : null}
                </div>
              </div>
            </details>

            <div className="hidden lg:block lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_54px_rgba(15,23,42,0.08)]">
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img src={reservationImage} alt={tripValues.resortName || "Disney villa stay"} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,22,45,0.38)] via-transparent to-transparent" />
                </div>
                <div className="space-y-5 px-6 py-6">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Reservation context</div>
                    <h3 className="text-[1.6rem] font-semibold leading-tight text-ink">
                      {tripValues.resortName || "Disney Deluxe Villa Stay"}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {tripValues.villaType} · {tripValues.viewType || "Villa view"}
                    </p>
                    <div className="text-sm text-slate-500">
                      {reservationDateLabel} · {reservationNights} nights
                    </div>
                    <div className="text-sm text-slate-500">{reservationGuestCount} guests</div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Estimated total</div>
                      <div className="mt-2 text-2xl font-semibold text-ink">
                        {formattedReservationTotal} <span className="text-sm font-medium text-slate-500">USD</span>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-2xl bg-slate-50 px-4 py-4">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Nightly average</div>
                        <div className="mt-2 text-lg font-semibold text-ink">
                          {formattedReservationAverage} <span className="text-xs font-medium text-slate-500">USD</span>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-4">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">DVC points</div>
                        <div className="mt-2 text-lg font-semibold text-ink">{tripValues.points}</div>
                      </div>
                    </div>
                  </div>

                  {tripValues.pricingTier ? (
                    <div className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1.5 text-xs font-medium text-[#4457c7]">
                      {tripValues.pricingTier}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={motionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeOut" }}
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
                    resorts={resorts}
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
          </div>
        </div>

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
