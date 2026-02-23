"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import {
  Button,
  Card,
  FieldLabel,
  HelperText,
  TextArea,
  TextInput,
} from "@pixiedvc/design-system";
import type { GuestInfoInput } from "../schemas";
import { getMaxOccupancyForSelection, suggestNextVillaType } from "@/lib/occupancy";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";

type GuestInfoProps = {
  onNext: () => void | Promise<void>;
  onBack: () => void;
  disableAddressAutocomplete?: boolean;
};

type FormValues = {
  guest: GuestInfoInput;
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

export function GuestInfo({ onNext, onBack, disableAddressAutocomplete = false }: GuestInfoProps) {
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
  const [addressUnlocked, setAddressUnlocked] = useState(false);
  const villaType = useWatch({ control, name: "trip.villaType" });
  const resortId = useWatch({ control, name: "trip.resortId" });
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

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="space-y-2 border-b border-slate-200 pb-6">
          <h3 className="font-display text-3xl text-ink">Tell us who is traveling</h3>
          <p className="text-sm text-slate-600">Add guest details for your reservation.</p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="guest.leadTitle">Lead Guest Title</FieldLabel>
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
              <FieldLabel htmlFor="guest.leadFirstName">Lead Guest First Name</FieldLabel>
              <TextInput id="guest.leadFirstName" {...register("guest.leadFirstName")} />
            </div>
            <div>
              <FieldLabel htmlFor="guest.leadMiddleInitial">Middle Initial</FieldLabel>
              <TextInput id="guest.leadMiddleInitial" placeholder="M.I." {...register("guest.leadMiddleInitial")} />
            </div>
            <div>
              <FieldLabel htmlFor="guest.leadLastName">Lead Guest Last Name</FieldLabel>
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
                    placeholder="Start typing to search..."
                    autoComplete="off"
                    name="booking_lookup_address"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    data-form-type="other"
                    readOnly={!addressUnlocked}
                    onFocus={() => setAddressUnlocked(true)}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={async (event) => {
                      field.onBlur();
                      const currentAddress = event.currentTarget.value ?? "";
                      const currentCity = getValues("guest.city") ?? "";
                      const currentRegion = getValues("guest.region") ?? "";
                      const currentPostal = getValues("guest.postalCode") ?? "";
                      if (!currentAddress.includes(",")) return;
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
                <HelperText>Start typing to search.</HelperText>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="guest.city">City</FieldLabel>
              <TextInput id="guest.city" {...register("guest.city")} />
            </div>
            <div>
              <FieldLabel htmlFor="guest.region">State / Province</FieldLabel>
              <TextInput id="guest.region" {...register("guest.region")} />
            </div>
            <div>
              <FieldLabel htmlFor="guest.postalCode">Postal Code</FieldLabel>
              <TextInput id="guest.postalCode" {...register("guest.postalCode")} />
            </div>

            <div className="sm:col-span-2 space-y-4">
              <FieldLabel>Additional Guests</FieldLabel>
              {adultFieldArray.fields.map((field, index) => (
                <Fragment key={field.id}>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold text-slate-600">Adult guest {index + 1}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-600">
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
                      <label className="text-xs font-semibold text-slate-600">
                        First name
                        <TextInput {...register(`guest.adultGuests.${index}.firstName` as const)} />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Middle initial
                        <TextInput {...register(`guest.adultGuests.${index}.middleInitial` as const)} />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Last name
                        <TextInput {...register(`guest.adultGuests.${index}.lastName` as const)} />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Suffix
                        <TextInput {...register(`guest.adultGuests.${index}.suffix` as const)} />
                      </label>
                      <div className="flex items-center sm:col-span-2">
                        <Button variant="ghost" className="px-3 py-2" onClick={() => adultFieldArray.remove(index)}>
                          Remove adult
                        </Button>
                      </div>
                    </div>
                  </div>
                </Fragment>
              ))}

              {childFieldArray.fields.map((field, index) => (
                <Fragment key={field.id}>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold text-slate-600">Child guest {index + 1}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-600">
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
                      <label className="text-xs font-semibold text-slate-600">
                        First name
                        <TextInput {...register(`guest.childGuests.${index}.firstName` as const)} />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Middle initial
                        <TextInput {...register(`guest.childGuests.${index}.middleInitial` as const)} />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Last name
                        <TextInput {...register(`guest.childGuests.${index}.lastName` as const)} />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Suffix
                        <TextInput {...register(`guest.childGuests.${index}.suffix` as const)} />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Age
                        <TextInput
                          type="number"
                          min={0}
                          max={17}
                          {...register(`guest.childGuests.${index}.age` as const, { valueAsNumber: true })}
                        />
                      </label>
                      <div className="flex items-center sm:col-span-2">
                        <Button variant="ghost" className="px-3 py-2" onClick={() => childFieldArray.remove(index)}>
                          Remove child
                        </Button>
                      </div>
                    </div>
                  </div>
                </Fragment>
              ))}
              <div className="flex flex-wrap gap-3">
                <Button
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
                  + Add adult guest
                </Button>
                <Button
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
                  + Add child guest
                </Button>
              </div>
              <HelperText>
                This villa allows up to {maxOccupancy} guests (including infants). Additional guest slots:{" "}
                {Math.max(0, additionalGuestLimit - (adultGuests.length + childGuests.length))} remaining.
              </HelperText>
            </div>

            <div className="sm:col-span-2">
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
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="guest.comments">Celebrations or requests</FieldLabel>
              <TextArea id="guest.comments" rows={4} {...register("guest.comments")} />
            </div>
          </div>
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
          <Button onClick={onBack} variant="ghost">
            Back
          </Button>
          <Button onClick={handleNext} disabled={submittingNext}>
            {submittingNext ? "Saving..." : "Review Agreement"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
