"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";

import { Button, Card, FieldLabel, HelperText, TextInput } from "@pixiedvc/design-system";
import type { GuestInfoInput, TripDetailsInput } from "../schemas";
import { getMaxOccupancyForSelection } from "@/lib/occupancy";
import { resolveResortImage } from "@/lib/resort-image";

type TripDetailsProps = {
  onNext: () => void;
  resorts: Array<{ id: string; name: string; slug?: string | null }>;
};

type FormValues = {
  trip: TripDetailsInput;
  guest: GuestInfoInput;
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

export function TripDetails({ onNext, resorts }: TripDetailsProps) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<FormValues>();

  const villaType = useWatch({ control, name: "trip.villaType" });
  const viewType = useWatch({ control, name: "trip.viewType" });
  const pricingTier = useWatch({ control, name: "trip.pricingTier" });
  const resortId = useWatch({ control, name: "trip.resortId" });
  const resortName = useWatch({ control, name: "trip.resortName" });
  const checkIn = useWatch({ control, name: "trip.checkIn" });
  const checkOut = useWatch({ control, name: "trip.checkOut" });
  const points = useWatch({ control, name: "trip.points" });
  const buildingPreference = useWatch({ control, name: "trip.building_preference" });
  const adultGuests = useWatch({ control, name: "guest.adultGuests" });
  const childGuests = useWatch({ control, name: "guest.childGuests" });

  const maxOccupancy = getMaxOccupancyForSelection({ roomLabel: villaType, resortCode: resortId });
  const resortIdToken = (resortId ?? "").trim().toLowerCase();
  const selectedResort =
    resorts.find((resort) => resort.id === resortId || (resort.slug ?? "").toLowerCase() === resortIdToken) ?? null;
  const isAnimalKingdomVillas =
    selectedResort?.slug === "animal-kingdom-villas" ||
    resortIdToken === "animal-kingdom-villas" ||
    resortIdToken === "akv";
  const { field: estCashField } = useController({
    name: "trip.estCash",
    control,
  });

  const formattedEstCash = Number.isFinite(estCashField.value)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(estCashField.value)
    : "";
  const nights = calculateNights(checkIn, checkOut);
  const averageNightly = nights > 0 && Number.isFinite(estCashField.value) ? estCashField.value / nights : 0;
  const formattedAverageNightly = Number.isFinite(averageNightly)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(averageNightly)
    : "";
  const guestCount = 1 + (adultGuests?.length ?? 0) + (childGuests?.length ?? 0);
  const stayDateLabel = formatDateRange(checkIn, checkOut);
  const summaryImage = resolveResortImage({
    resortCode: resortId,
    resortSlug: selectedResort?.slug,
    imageIndex: 1,
  }).url;
  const viewSummary = viewType?.trim() ? viewType.trim() : "Villa view";
  const pricingSummary = pricingTier?.trim() ? `${pricingTier.trim()} pricing` : "PixieDVC estimate";

  useEffect(() => {
    if (isAnimalKingdomVillas || buildingPreference === "none") return;
    setValue("trip.building_preference", "none", { shouldDirty: true });
  }, [buildingPreference, isAnimalKingdomVillas, setValue]);

  useEffect(() => {
    if (selectedResort?.name && selectedResort.name !== resortName) {
      setValue("trip.resortName", selectedResort.name, { shouldDirty: true });
    }
  }, [resortName, selectedResort, setValue]);

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            <div className="relative min-h-[280px] overflow-hidden bg-slate-200">
              <img
                src={summaryImage}
                alt={resortName || "Disney villa resort"}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[rgba(10,20,40,0.18)] via-[rgba(10,20,40,0.06)] to-transparent" />
            </div>

            <div className="flex flex-col justify-between p-8 sm:p-10">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Your trip summary</p>
                  <h3 className="font-display text-3xl leading-tight text-ink sm:text-[2.25rem]">
                    {resortName || "Disney Deluxe Villa Stay"}
                  </h3>
                  <p className="text-base text-slate-600">
                    {villaType} · {viewSummary}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                    <span>{stayDateLabel}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                    <span>{nights} nights</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                    <span>{guestCount} guests</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Average per night</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {formattedAverageNightly} <span className="text-sm font-medium text-slate-500">USD</span>
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estimated total</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      {formattedEstCash} <span className="text-sm font-medium text-slate-500">USD</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                <span className="font-medium text-ink">{points} DVC points</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
                <span>{pricingSummary}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Modify trip details</p>
              <h3 className="font-display text-3xl text-ink">Update your preferences</h3>
              <p className="max-w-2xl text-sm text-slate-500">
                Everything above reflects your current stay request. If anything changed, update it here before we begin matching.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900">PixieDVC Concierge</p>
              <p className="text-slate-500">We review availability before anything is finalized.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel htmlFor="trip.resortId">Primary resort</FieldLabel>
              <FieldLabel htmlFor="trip.villaType">Room type</FieldLabel>
              <div>
                <select
                  id="trip.resortId"
                  {...register("trip.resortId")}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {resorts.map((resort) => (
                    <option key={resort.id} value={resort.id}>
                      {resort.name}
                    </option>
                  ))}
                </select>
                <input type="hidden" {...register("trip.resortName")} />
              </div>
              <div>
                <TextInput id="trip.villaType" {...register("trip.villaType")} />
                <div className="mt-2 text-sm text-[#0F2148]/80">
                  Maximum occupancy:{" "}
                  <span className="font-semibold text-[#0F2148]">{maxOccupancy} guests</span> (including infants)
                  <span className="ml-2 text-xs text-[#0F2148]/60">
                    <Link href="/help/occupancy" className="font-semibold text-[#0F2148] hover:underline">
                      How occupancy works
                    </Link>
                  </span>
                </div>
              </div>

              <FieldLabel htmlFor="trip.checkIn">Check-in</FieldLabel>
              <FieldLabel htmlFor="trip.checkOut">Check-out</FieldLabel>
              <TextInput id="trip.checkIn" type="date" {...register("trip.checkIn")} />
              <TextInput id="trip.checkOut" type="date" {...register("trip.checkOut")} />

              <FieldLabel htmlFor="trip.points">Total DVC points</FieldLabel>
              <FieldLabel htmlFor="trip.estCash">Estimated total (USD)</FieldLabel>
              <TextInput
                id="trip.points"
                type="number"
                disabled
                {...register("trip.points", { valueAsNumber: true })}
              />
              <TextInput
                id="trip.estCash"
                type="text"
                inputMode="decimal"
                disabled
                placeholder="$2,737.00"
                value={formattedEstCash}
                onChange={(event) => {
                  const numeric = Number(event.target.value.replace(/[^0-9.]/g, ""));
                  estCashField.onChange(Number.isFinite(numeric) ? numeric : 0);
                }}
              />

              {isAnimalKingdomVillas ? (
                <div className="sm:col-span-2">
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-700">Villa location preference</p>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" value="none" {...register("trip.building_preference")} />
                      No preference
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" value="jambo" {...register("trip.building_preference")} />
                      Jambo House
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" value="kidani" {...register("trip.building_preference")} />
                      Kidani Village
                    </label>
                  </div>
                </div>
              ) : null}

            </div>
          </div>

          {errors.trip ? <HelperText>Double-check the highlighted fields above.</HelperText> : null}

          <div className="mt-8 flex justify-end">
            <Button onClick={onNext}>
              Continue
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
