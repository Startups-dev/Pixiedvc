"use client";

import { useFormContext } from "react-hook-form";

import { Button, Card, FieldLabel, TextInput, HelperText } from "@pixiedvc/design-system";
import type { TripDetailsInput } from "../schemas";

type TripDetailsProps = {
  onNext: () => void;
};

type FormValues = {
  trip: TripDetailsInput;
};

export function TripDetails({ onNext }: TripDetailsProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormValues>();

  return (
    <div className="space-y-8">
      <Card className="bg-white/90">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Trip Overview</p>
            <h3 className="font-display text-3xl text-ink">Personalize your stay</h3>
            <p className="text-sm text-muted">
              These details were pulled from the trip builder. Update anything that changed before we
              begin matching.
            </p>
          </div>
          <div className="rounded-3xl bg-brand/10 px-6 py-4 text-sm text-brand shadow-inner">
            <p className="font-semibold">PixieDVC Concierge</p>
            <p className="text-brand/80">Deposits stay refundable until we confirm a match.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <FieldLabel htmlFor="trip.resortName">Resort</FieldLabel>
          <FieldLabel htmlFor="trip.villaType">Villa Type</FieldLabel>
          <TextInput id="trip.resortName" {...register("trip.resortName")} />
          <TextInput id="trip.villaType" {...register("trip.villaType")} />

          <FieldLabel htmlFor="trip.checkIn">Check-in</FieldLabel>
          <FieldLabel htmlFor="trip.checkOut">Check-out</FieldLabel>
          <TextInput id="trip.checkIn" type="date" {...register("trip.checkIn")} />
          <TextInput id="trip.checkOut" type="date" {...register("trip.checkOut")} />

          <FieldLabel htmlFor="trip.points">Points (Projected)</FieldLabel>
          <FieldLabel htmlFor="trip.estCash">Est. Cash Equivalent</FieldLabel>
          <TextInput
            id="trip.points"
            type="number"
            {...register("trip.points", { valueAsNumber: true })}
          />
          <TextInput
            id="trip.estCash"
            type="number"
            {...register("trip.estCash", { valueAsNumber: true })}
          />

          <div className="sm:col-span-2">
            <FieldLabel htmlFor="trip.altResortId">Alternate Resort Preference</FieldLabel>
            <TextInput id="trip.altResortId" placeholder="Optional" {...register("trip.altResortId")} />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 text-sm text-ink">
              <input type="checkbox" {...register("trip.accessibility")} className="h-4 w-4" />
              Require accessibility accommodations
            </label>
          </div>
        </div>

        {errors.trip ? (
          <HelperText>Double-check the highlighted fields above.</HelperText>
        ) : null}

        <div className="mt-8 flex justify-end">
          <Button onClick={onNext}>Continue</Button>
        </div>
      </Card>
    </div>
  );
}
