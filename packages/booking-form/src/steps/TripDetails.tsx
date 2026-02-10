"use client";

import Link from "next/link";
import { useFormContext, useController, useWatch } from "react-hook-form";

import { Button, Card, FieldLabel, TextInput, HelperText } from "@pixiedvc/design-system";
import type { TripDetailsInput } from "../schemas";
import { getMaxOccupancyForSelection } from "@/lib/occupancy";

type TripDetailsProps = {
  onNext: () => void;
  resorts: Array<{ id: string; name: string; slug?: string | null }>;
};

type FormValues = {
  trip: TripDetailsInput;
};

export function TripDetails({ onNext, resorts }: TripDetailsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FormValues>();
  const villaType = useWatch({ control, name: "trip.villaType" });
  const resortId = useWatch({ control, name: "trip.resortId" });
  const resortName = useWatch({ control, name: "trip.resortName" });
  const secondaryResortId = useWatch({ control, name: "trip.secondaryResortId" });
  const tertiaryResortId = useWatch({ control, name: "trip.tertiaryResortId" });
  const maxOccupancy = getMaxOccupancyForSelection({ roomLabel: villaType, resortCode: resortId });
  const selectedResort = resorts.find((resort) => resort.id === resortId) ?? null;
  const resortNameFallback = resortName?.toLowerCase() ?? "";
  const isIsolatedDestination = Boolean(
    (selectedResort?.slug && ["aulani", "vero-beach", "hilton-head-island"].includes(selectedResort.slug)) ||
      ["aulani", "vero beach", "hilton head"].some((token) => resortNameFallback.includes(token)),
  );
  const hasDuplicateResorts = Boolean(
    (resortId && (resortId === secondaryResortId || resortId === tertiaryResortId)) ||
      (secondaryResortId && tertiaryResortId && secondaryResortId === tertiaryResortId),
  );
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

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-4xl">
        <Card className="border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Trip Overview</p>
              <h3 className="font-display text-3xl text-ink">Personalize your stay</h3>
              <p className="text-sm text-slate-600">
                These details were pulled from the trip builder. Update anything that changed before we
                begin matching.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900">PixieDVC Concierge</p>
              <p className="text-slate-600">Deposits stay refundable until we confirm a match.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel htmlFor="trip.resortName">Resort</FieldLabel>
              <FieldLabel htmlFor="trip.villaType">Villa Type</FieldLabel>
              <TextInput id="trip.resortName" {...register("trip.resortName")} />
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

              <FieldLabel htmlFor="trip.points">Points Needed</FieldLabel>
              <FieldLabel htmlFor="trip.estCash">Cost of Stay (USD)</FieldLabel>
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

              <div className="sm:col-span-2">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">
                    Second choice resort (optional)
                    <select
                      id="trip.secondaryResortId"
                      {...register("trip.secondaryResortId")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
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
                    Third choice resort (optional)
                    <select
                      id="trip.tertiaryResortId"
                      {...register("trip.tertiaryResortId")}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="">No third choice</option>
                      {resorts.map((resort) => (
                        <option key={resort.id} value={resort.id}>
                          {resort.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="text-xs text-slate-500">
                    {isIsolatedDestination
                      ? "If availability is limited, we may suggest flexible dates to secure this resort."
                      : "We’ll check your selected resorts; if none are available we may suggest a high-availability option."}
                  </p>

                  {hasDuplicateResorts ? (
                    <p className="text-xs font-semibold text-rose-600">
                      Choose different resorts for each option.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input type="checkbox" {...register("trip.accessibility")} className="h-4 w-4" />
                  Require accessibility accommodations
                </label>
              </div>
            </div>
          </div>

          {errors.trip ? (
            <HelperText>Double-check the highlighted fields above.</HelperText>
          ) : null}

          <div className="mt-8 flex justify-end">
            <Button onClick={onNext} disabled={hasDuplicateResorts}>
              Continue
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
