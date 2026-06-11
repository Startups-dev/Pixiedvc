"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import {
  Button,
  Card,
  FieldLabel,
  HelperText,
  TextArea,
  TextInput,
} from "@pixiedvc/design-system";
import type { GuestInfoInput, TripDetailsInput } from "../schemas";
import { getMaxOccupancyForSelection, suggestNextVillaType } from "@/lib/occupancy";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";

type GuestInfoProps = {
  onNext: () => void | Promise<void>;
  onBack: () => void;
  disableAddressAutocomplete?: boolean;
  signInHref?: string;
  onSignInClick?: (guest: GuestInfoInput) => void;
  resorts: Array<{ id: string; name: string; slug?: string | null }>;
};

type FormValues = {
  trip: TripDetailsInput;
  guest: GuestInfoInput;
};

type GuestSectionKey = "lead" | "party" | "accessibility" | "backup" | "special";

const guestSectionOrder: GuestSectionKey[] = ["lead", "party", "accessibility", "backup", "special"];

const guestSectionContent: Record<
  GuestSectionKey,
  { eyebrow: string; title: string; description: string; cta: string }
> = {
  lead: {
    eyebrow: "Guest information",
    title: "Who should we contact about this reservation?",
    description: "Share the primary guest details so we know who should receive updates and booking options.",
    cta: "Continue to travel party",
  },
  party: {
    eyebrow: "Travel party",
    title: "Who else is joining this stay?",
    description: "Add the rest of your party so we can keep the reservation details aligned with your villa size.",
    cta: "Continue",
  },
  accessibility: {
    eyebrow: "Accessibility accommodations",
    title: "Do you need any accessibility accommodations?",
    description: "Let us know if anyone in your party requires mobility, hearing, visual, or other accessibility support.",
    cta: "Continue",
  },
  backup: {
    eyebrow: "Backup resort options",
    title: "Would you like us to check any alternate resorts?",
    description: "Optional backup choices give our team more flexibility if your first resort is unavailable.",
    cta: "Continue",
  },
  special: {
    eyebrow: "Special requests",
    title: "Anything special we should know about this stay?",
    description: "Share celebrations, room requests, adjoining villas, or anything else our concierge team should note.",
    cta: "Continue to review",
  },
};

const sectionMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const referralOptions = [
  "PixieDVC Member",
  "Facebook Group",
  "Instagram",
  "Podcast",
  "Search Engine",
  "Travel Agent",
  "Other",
];

const middleInitialHelperText =
  "Enter one letter, or type the middle name and we'll use the first initial.";

function normalizeMiddleInitialInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const firstLetter = trimmed.match(/[A-Za-z]/)?.[0];
  if (!firstLetter) {
    return trimmed;
  }

  return firstLetter.toUpperCase();
}

function splitCombinedAddress(value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const line1 = parts[0] ?? "";
  const city = parts[1] ?? "";
  const regionPostal = parts[2] ?? "";
  const regionTokens = regionPostal.split(/\s+/).filter(Boolean);
  const region = regionTokens[0] ?? "";
  const postalFromRegion = regionTokens.slice(1).join(" ");
  const country = parts[parts.length - 1] ?? "";

  const canadaPostal = value.match(/\b([A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d)\b/)?.[1]?.toUpperCase();
  const usPostal = value.match(/\b(\d{5}(?:-\d{4})?)\b/)?.[1];
  const postalCode = canadaPostal ?? usPostal ?? postalFromRegion ?? "";

  return {
    line1,
    city,
    region,
    postalCode,
    country,
  };
}

function looksLikeStructuredAutocompleteAddress(value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return false;
  const hasPostal = /\b(\d{5}(?:-\d{4})?|[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d)\b/.test(value);
  return hasPostal || parts.length >= 4;
}

async function resolvePostalFromGeocoder(address: string) {
  if (typeof window === "undefined") return "";
  const google = (window as Window & { google?: typeof window.google }).google;
  if (!google?.maps?.Geocoder) return "";

  const geocoder = new google.maps.Geocoder();
  try {
    const result = await geocoder.geocode({ address });
    const first = result.results?.[0];
    if (!first?.address_components) return "";
    const postal = first.address_components.find((c) => c.types?.includes("postal_code"));
    return postal?.long_name ?? "";
  } catch {
    return "";
  }
}

export function GuestInfo({
  onNext,
  onBack,
  disableAddressAutocomplete = false,
  signInHref,
  onSignInClick,
  resorts,
}: GuestInfoProps) {
  const {
    register,
    control,
    formState: { errors },
    getValues,
    setValue,
  } = useFormContext<FormValues>();
  const [occupancyError, setOccupancyError] = useState<string | null>(null);
  const occupancyWarningRef = useRef<HTMLDivElement | null>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const villaType = useWatch({ control, name: "trip.villaType" });
  const resortId = useWatch({ control, name: "trip.resortId" });
  const accessibility = useWatch({ control, name: "trip.accessibility" });
  const secondaryResortId = useWatch({ control, name: "trip.secondaryResortId" });
  const tertiaryResortId = useWatch({ control, name: "trip.tertiaryResortId" });
  const adultGuests = useWatch({ control, name: "guest.adultGuests" }) ?? [];
  const childGuests = useWatch({ control, name: "guest.childGuests" }) ?? [];
  const country = useWatch({ control, name: "guest.country" }) ?? "United States";
  const totalGuests = 1 + adultGuests.length + childGuests.length;
  const maxOccupancy = getMaxOccupancyForSelection({ roomLabel: villaType, resortCode: resortId });

  const adultFieldArray = useFieldArray({
    control,
    name: "guest.adultGuests",
  });
  const childFieldArray = useFieldArray({
    control,
    name: "guest.childGuests",
  });
  const additionalGuestLimit = Math.max(0, maxOccupancy - 1);
  const isOverCapacity = totalGuests > maxOccupancy;
  const occupancySuggestion = suggestNextVillaType(villaType ?? "");
  const hasDuplicateResorts = Boolean(
    (resortId && (resortId === secondaryResortId || resortId === tertiaryResortId)) ||
      (secondaryResortId && tertiaryResortId && secondaryResortId === tertiaryResortId),
  );

  const countryCodeMap: Record<string, string> = {
    "United States": "us",
    Canada: "ca",
    "United Kingdom": "gb",
    Mexico: "mx",
    Brazil: "br",
    Australia: "au",
  };

  usePlacesAutocomplete({
    inputRef: addressRef,
    debugLabel: "booking-form",
    countryCode: countryCodeMap[country],
    onSelect: (address) => {
      if (disableAddressAutocomplete) return;
      if (address.line1) setValue("guest.address", address.line1, { shouldDirty: true });
      if (address.city) setValue("guest.city", address.city, { shouldDirty: true });
      if (address.state) setValue("guest.region", address.state, { shouldDirty: true });
      if (address.postalCode) setValue("guest.postalCode", address.postalCode, { shouldDirty: true });
      if (address.country) setValue("guest.country", address.country, { shouldDirty: true });
    },
  });

  useEffect(() => {
    const extraCount = adultGuests.length + childGuests.length;
    if (extraCount > additionalGuestLimit) {
      const overflow = extraCount - additionalGuestLimit;
      if (childGuests.length >= overflow) {
        setValue("guest.childGuests", childGuests.slice(0, childGuests.length - overflow));
      } else {
        const remaining = overflow - childGuests.length;
        setValue("guest.childGuests", []);
        setValue("guest.adultGuests", adultGuests.slice(0, Math.max(0, adultGuests.length - remaining)));
      }
      setOccupancyError("We adjusted your guest list to match the villa’s maximum occupancy.");
    }
  }, [adultGuests, childGuests, additionalGuestLimit, setValue]);

  useEffect(() => {
    if (!occupancyError && !isOverCapacity) {
      return;
    }
    occupancyWarningRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isOverCapacity, occupancyError]);

  const [submittingNext, setSubmittingNext] = useState(false);
  const [showBackupResorts, setShowBackupResorts] = useState(Boolean(secondaryResortId || tertiaryResortId));
  const [sectionIndex, setSectionIndex] = useState(0);

  useEffect(() => {
    if (secondaryResortId || tertiaryResortId) {
      setShowBackupResorts(true);
    }
  }, [secondaryResortId, tertiaryResortId]);

  useEffect(() => {
    const guestErrorKeys = Object.keys(errors.guest ?? {});
    if (guestErrorKeys.length === 0) return;

    if (
      guestErrorKeys.some((key) =>
        ["leadTitle", "leadFirstName", "leadMiddleInitial", "leadLastName", "leadSuffix", "email", "phone", "address", "city", "region", "postalCode", "country"].includes(key),
      )
    ) {
      setSectionIndex(0);
      return;
    }

    if (guestErrorKeys.some((key) => key === "adultGuests" || key === "childGuests")) {
      setSectionIndex(1);
      return;
    }

    if (guestErrorKeys.includes("accessibilityNotes")) {
      setSectionIndex(2);
      return;
    }

    if (guestErrorKeys.some((key) => key === "comments" || key === "referralSource")) {
      setSectionIndex(4);
    }
  }, [errors.guest]);

  const handleNext = async () => {
    const current = getValues();
    const currentTotal =
      1 +
      (current.guest.adultGuests?.length ?? 0) +
      (current.guest.childGuests?.length ?? 0);
    if (currentTotal > maxOccupancy) {
      setOccupancyError("Please choose a guest count that fits this villa’s maximum occupancy.");
      occupancyWarningRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setOccupancyError(null);
    try {
      setSubmittingNext(true);
      await onNext();
    } finally {
      setSubmittingNext(false);
    }
  };

  const sectionTitleClass = "text-[1.35rem] font-semibold text-ink";
  const sectionSubtextClass = "text-sm leading-6 text-slate-500";
  const currentSection = guestSectionOrder[sectionIndex];
  const currentSectionContent = guestSectionContent[currentSection];
  const isFinalSection = sectionIndex === guestSectionOrder.length - 1;

  const handleSectionContinue = async () => {
    if (currentSection === "backup" && hasDuplicateResorts) {
      return;
    }

    if (isFinalSection) {
      await handleNext();
      return;
    }

    setSectionIndex((current) => Math.min(current + 1, guestSectionOrder.length - 1));
  };

  const handleSectionBack = () => {
    if (sectionIndex === 0) {
      onBack();
      return;
    }
    setSectionIndex((current) => Math.max(current - 1, 0));
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="space-y-2 border-b border-slate-200 pb-6">
          <h3 className="font-display text-3xl text-ink">Guest information</h3>
          <p className="text-sm text-slate-500">Review the trip, then share the guest details we need to secure your reservation.</p>
        </div>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.section
              key={currentSection}
              variants={sectionMotion}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="rounded-[2rem] border border-slate-200 bg-white px-6 py-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:px-8"
            >
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-[#4457c7]">{currentSectionContent.eyebrow}</p>
                <h4 className={sectionTitleClass}>{currentSectionContent.title}</h4>
                <p className={sectionSubtextClass}>{currentSectionContent.description}</p>
              </div>

              <div className="mt-8">
                {currentSection === "lead" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="guest.leadTitle">Title</FieldLabel>
                      <select
                        id="guest.leadTitle"
                        {...register("guest.leadTitle")}
                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Miss">Miss</option>
                        <option value="Master">Master</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.leadFirstName">First name</FieldLabel>
                      <TextInput id="guest.leadFirstName" {...register("guest.leadFirstName")} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.leadMiddleInitial">Middle initial</FieldLabel>
                      <TextInput
                        id="guest.leadMiddleInitial"
                        placeholder="M.I."
                        {...register("guest.leadMiddleInitial", {
                          setValueAs: normalizeMiddleInitialInput,
                          onBlur: (event) => {
                            setValue(
                              "guest.leadMiddleInitial",
                              normalizeMiddleInitialInput(event.target.value),
                              { shouldDirty: true, shouldValidate: true },
                            );
                          },
                        })}
                      />
                      {errors.guest?.leadMiddleInitial ? (
                        <HelperText>{errors.guest.leadMiddleInitial.message}</HelperText>
                      ) : (
                        <HelperText>{middleInitialHelperText}</HelperText>
                      )}
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.leadLastName">Last name</FieldLabel>
                      <TextInput id="guest.leadLastName" {...register("guest.leadLastName")} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.leadSuffix">Suffix</FieldLabel>
                      <TextInput id="guest.leadSuffix" placeholder="Jr., Sr., III" {...register("guest.leadSuffix")} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.email">Email</FieldLabel>
                      <TextInput id="guest.email" type="email" {...register("guest.email")} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.phone">Phone</FieldLabel>
                      <TextInput id="guest.phone" {...register("guest.phone")} />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor="guest.country">Country</FieldLabel>
                      <select
                        id="guest.country"
                        {...register("guest.country")}
                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Mexico">Mexico</option>
                        <option value="Brazil">Brazil</option>
                        <option value="Australia">Australia</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor="guest.address">Address</FieldLabel>
                      <Controller
                        name="guest.address"
                        control={control}
                        render={({ field }) => (
                          <TextInput
                            id="guest.address"
                            placeholder="Street address"
                            autoComplete="street-address"
                            autoCorrect="off"
                            autoCapitalize="words"
                            spellCheck={false}
                            data-lpignore="true"
                            data-form-type="other"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={async (event) => {
                              field.onBlur();
                              const currentAddress = event.currentTarget.value ?? "";
                              const currentCity = getValues("guest.city") ?? "";
                              const currentRegion = getValues("guest.region") ?? "";
                              const currentPostal = getValues("guest.postalCode") ?? "";
                              if (!looksLikeStructuredAutocompleteAddress(currentAddress)) return;
                              if (currentCity && currentRegion && currentPostal) return;

                              const split = splitCombinedAddress(currentAddress);
                              if (!split) return;

                              setValue("guest.address", split.line1, { shouldDirty: true });
                              if (!currentCity && split.city) setValue("guest.city", split.city, { shouldDirty: true });
                              if (!currentRegion && split.region) setValue("guest.region", split.region, { shouldDirty: true });
                              let resolvedPostal = currentPostal;
                              if (!resolvedPostal && split.postalCode) {
                                resolvedPostal = split.postalCode;
                              }
                              if (!resolvedPostal) {
                                const lookupAddress = [split.line1, split.city, split.region, split.country]
                                  .filter(Boolean)
                                  .join(", ");
                                resolvedPostal = await resolvePostalFromGeocoder(lookupAddress);
                              }
                              if (!currentPostal && resolvedPostal) {
                                setValue("guest.postalCode", resolvedPostal, { shouldDirty: true });
                              }
                              const currentCountry = getValues("guest.country") ?? "";
                              if (!currentCountry && split.country) {
                                setValue("guest.country", split.country, { shouldDirty: true });
                              }
                            }}
                            ref={(node) => {
                              field.ref(node);
                              addressRef.current = node;
                            }}
                          />
                        )}
                      />
                      {errors.guest?.address ? (
                        <HelperText>{errors.guest.address.message}</HelperText>
                      ) : (
                        <HelperText>Type your full address manually or choose an autocomplete suggestion.</HelperText>
                      )}
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.city">City</FieldLabel>
                      <TextInput id="guest.city" autoComplete="address-level2" {...register("guest.city")} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.region">State / Province</FieldLabel>
                      <TextInput id="guest.region" autoComplete="address-level1" {...register("guest.region")} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.postalCode">Postal code</FieldLabel>
                      <TextInput id="guest.postalCode" autoComplete="postal-code" {...register("guest.postalCode")} />
                    </div>
                  </div>
                ) : null}

                {currentSection === "party" ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="rounded-full bg-[#eef2ff] px-3 py-1.5 font-medium text-[#4457c7]">
                        {totalGuests} total guests
                      </span>
                      <span>This villa allows up to {maxOccupancy} guests (including infants).</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-4 py-2"
                        onClick={() => {
                          if (totalGuests <= maxOccupancy - 1) {
                            adultFieldArray.append({ title: "Mr.", firstName: "", lastName: "" });
                          } else {
                            setOccupancyError("This villa is at maximum occupancy.");
                          }
                        }}
                        disabled={totalGuests >= maxOccupancy}
                      >
                        + Add adult
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-4 py-2"
                        onClick={() => {
                          if (totalGuests <= maxOccupancy - 1) {
                            childFieldArray.append({ title: "Master", firstName: "", lastName: "", age: 0 });
                          } else {
                            setOccupancyError("This villa is at maximum occupancy.");
                          }
                        }}
                        disabled={totalGuests >= maxOccupancy}
                      >
                        + Add child
                      </Button>
                    </div>
                    <HelperText>
                      Additional guest slots remaining: {Math.max(0, additionalGuestLimit - (adultGuests.length + childGuests.length))}.
                    </HelperText>

                    <div className="space-y-4">
                      {adultFieldArray.fields.map((field, index) => (
                        <Fragment key={field.id}>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/55 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Adult {index + 1}</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <label className="text-xs font-semibold text-slate-500">
                                Title
                                <select
                                  {...register(`guest.adultGuests.${index}.title` as const)}
                                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
                                >
                                  <option value="Mr.">Mr.</option>
                                  <option value="Mrs.">Mrs.</option>
                                  <option value="Ms.">Ms.</option>
                                  <option value="Miss">Miss</option>
                                  <option value="Master">Master</option>
                                </select>
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                First name
                                <TextInput {...register(`guest.adultGuests.${index}.firstName` as const)} />
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                Middle initial
                                <TextInput
                                  {...register(`guest.adultGuests.${index}.middleInitial` as const, {
                                    setValueAs: normalizeMiddleInitialInput,
                                    onBlur: (event) => {
                                      setValue(
                                        `guest.adultGuests.${index}.middleInitial`,
                                        normalizeMiddleInitialInput(event.target.value),
                                        { shouldDirty: true, shouldValidate: true },
                                      );
                                    },
                                  })}
                                />
                                {errors.guest?.adultGuests?.[index]?.middleInitial ? (
                                  <HelperText>{errors.guest.adultGuests[index]?.middleInitial?.message}</HelperText>
                                ) : null}
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                Last name
                                <TextInput {...register(`guest.adultGuests.${index}.lastName` as const)} />
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                Suffix
                                <TextInput {...register(`guest.adultGuests.${index}.suffix` as const)} />
                              </label>
                              <div className="flex items-center sm:col-span-2">
                                <Button type="button" variant="ghost" className="px-3 py-2" onClick={() => adultFieldArray.remove(index)}>
                                  Remove adult
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      ))}

                      {childFieldArray.fields.map((field, index) => (
                        <Fragment key={field.id}>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/55 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Child {index + 1}</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <label className="text-xs font-semibold text-slate-500">
                                Title
                                <select
                                  {...register(`guest.childGuests.${index}.title` as const)}
                                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
                                >
                                  <option value="Master">Master</option>
                                  <option value="Ms.">Ms.</option>
                                  <option value="Miss">Miss</option>
                                  <option value="Mr.">Mr.</option>
                                  <option value="Mrs.">Mrs.</option>
                                </select>
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                First name
                                <TextInput {...register(`guest.childGuests.${index}.firstName` as const)} />
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                Middle initial
                                <TextInput
                                  {...register(`guest.childGuests.${index}.middleInitial` as const, {
                                    setValueAs: normalizeMiddleInitialInput,
                                    onBlur: (event) => {
                                      setValue(
                                        `guest.childGuests.${index}.middleInitial`,
                                        normalizeMiddleInitialInput(event.target.value),
                                        { shouldDirty: true, shouldValidate: true },
                                      );
                                    },
                                  })}
                                />
                                {errors.guest?.childGuests?.[index]?.middleInitial ? (
                                  <HelperText>{errors.guest.childGuests[index]?.middleInitial?.message}</HelperText>
                                ) : null}
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                Last name
                                <TextInput {...register(`guest.childGuests.${index}.lastName` as const)} />
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                Suffix
                                <TextInput {...register(`guest.childGuests.${index}.suffix` as const)} />
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                Age
                                <TextInput
                                  type="number"
                                  min={0}
                                  max={17}
                                  {...register(`guest.childGuests.${index}.age` as const, { valueAsNumber: true })}
                                />
                              </label>
                              <div className="flex items-center sm:col-span-2">
                                <Button type="button" variant="ghost" className="px-3 py-2" onClick={() => childFieldArray.remove(index)}>
                                  Remove child
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ) : null}

                {currentSection === "accessibility" ? (
                  <div className="space-y-5">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input type="checkbox" {...register("trip.accessibility")} className="h-4 w-4" />
                      We need accessibility accommodations for this reservation
                    </label>
                    {accessibility ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/55 p-4">
                        <FieldLabel htmlFor="guest.accessibilityNotes">Accommodation details (optional)</FieldLabel>
                        <TextArea
                          id="guest.accessibilityNotes"
                          rows={3}
                          placeholder="Share any mobility, hearing, visual, or room-access needs our team should note."
                          {...register("guest.accessibilityNotes")}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {currentSection === "backup" ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/55 p-4">
                      <button
                        type="button"
                        onClick={() => setShowBackupResorts((current) => !current)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <div>
                          <div className="text-sm font-medium text-ink">Optional concierge flexibility</div>
                          <div className="mt-1 text-sm text-slate-500">
                            {showBackupResorts ? "Hide alternate resort options" : "Add alternate resort options"}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-[#4457c7]">{showBackupResorts ? "Hide" : "Add"}</span>
                      </button>
                      {showBackupResorts ? (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <label className="text-sm font-medium text-slate-700">
                            Second choice resort
                            <select
                              id="trip.secondaryResortId"
                              {...register("trip.secondaryResortId")}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                            >
                              <option value="">No second choice</option>
                              {resorts.map((resort) => (
                                <option key={resort.id} value={resort.id}>
                                  {resort.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm font-medium text-slate-700">
                            Third choice resort
                            <select
                              id="trip.tertiaryResortId"
                              {...register("trip.tertiaryResortId")}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                            >
                              <option value="">No third choice</option>
                              {resorts.map((resort) => (
                                <option key={resort.id} value={resort.id}>
                                  {resort.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : null}
                      {hasDuplicateResorts ? (
                        <p className="mt-3 text-xs font-semibold text-rose-600">Choose different resorts for each option.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {currentSection === "special" ? (
                  <div className="grid gap-4">
                    <div>
                      <FieldLabel htmlFor="guest.referralSource">How did you hear about PixieDVC?</FieldLabel>
                      <select
                        id="guest.referralSource"
                        {...register("guest.referralSource")}
                        className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">Select an option</option>
                        {referralOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel htmlFor="guest.comments">Details (optional)</FieldLabel>
                      <TextArea
                        id="guest.comments"
                        rows={4}
                        placeholder="Share celebrations, room preferences, adjoining villa requests, or anything else helpful for our team."
                        {...register("guest.comments")}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.section>
          </AnimatePresence>
        </div>

        {isOverCapacity || occupancyError ? (
          <div
            ref={occupancyWarningRef}
            className="mt-6 rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4 text-sm text-amber-900"
          >
            {occupancyError ||
              `Your selected villa allows up to ${maxOccupancy} guests (including infants). Your party size is ${totalGuests}.`}
            <div className="mt-2 text-amber-900">
              We recommend a {occupancySuggestion} for a comfortable fit.
            </div>
          </div>
        ) : null}

        {errors.guest ? <HelperText>We need complete guest contact info.</HelperText> : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button type="button" onClick={handleSectionBack} variant="ghost">
            ← Back
          </Button>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {signInHref && isFinalSection ? (
              <a
                href={signInHref}
                onClick={() => {
                  onSignInClick?.(getValues("guest"));
                }}
                className="text-sm font-medium text-slate-600 underline hover:text-slate-800"
              >
                Already have an account? Sign in
              </a>
            ) : null}
            <Button type="button" onClick={handleSectionContinue} disabled={submittingNext || (currentSection === "backup" && hasDuplicateResorts)}>
              {submittingNext ? "Saving..." : currentSectionContent.cta}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
