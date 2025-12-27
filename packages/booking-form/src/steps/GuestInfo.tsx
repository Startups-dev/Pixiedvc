"use client";

import { Fragment } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import {
  Button,
  Card,
  FieldLabel,
  HelperText,
  TextArea,
  TextInput,
} from "@pixiedvc/design-system";
import type { GuestInfoInput } from "../schemas";

type GuestInfoProps = {
  onNext: () => void;
  onBack: () => void;
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

export function GuestInfo({ onNext, onBack }: GuestInfoProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "guest.additionalGuests",
  });

  return (
    <Card className="bg-white/90">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Guest Details</p>
        <h3 className="font-display text-3xl text-ink">Tell us who is traveling</h3>
        <p className="text-sm text-muted">
          Pixie concierges use this information to personalize room assignments and celebrations.
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="guest.leadGuest">Lead Guest</FieldLabel>
          <TextInput id="guest.leadGuest" {...register("guest.leadGuest")} />
        </div>
        <div>
          <FieldLabel htmlFor="guest.email">Email</FieldLabel>
          <TextInput id="guest.email" type="email" {...register("guest.email")} />
        </div>
        <div>
          <FieldLabel htmlFor="guest.phone">Phone</FieldLabel>
          <TextInput id="guest.phone" {...register("guest.phone")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="guest.adults">Adults</FieldLabel>
            <TextInput
              id="guest.adults"
              type="number"
              min={1}
              {...register("guest.adults", { valueAsNumber: true })}
            />
          </div>
          <div>
            <FieldLabel htmlFor="guest.youths">Youths</FieldLabel>
            <TextInput
              id="guest.youths"
              type="number"
              min={0}
              {...register("guest.youths", { valueAsNumber: true })}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="guest.address">Address</FieldLabel>
          <TextInput id="guest.address" placeholder="Start typing to search..." {...register("guest.address")} />
          <HelperText>Google Places integration forthcoming.</HelperText>
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
        <div>
          <FieldLabel htmlFor="guest.country">Country</FieldLabel>
          <TextInput id="guest.country" {...register("guest.country")} />
        </div>

        <div className="sm:col-span-2 space-y-4">
          <FieldLabel>Additional Guests</FieldLabel>
          {fields.map((field, index) => (
            <Fragment key={field.id}>
              <div className="flex items-center gap-3">
                <TextInput {...register(`guest.additionalGuests.${index}` as const)} />
                <Button variant="ghost" className="px-3 py-2" onClick={() => remove(index)}>
                  Remove
                </Button>
              </div>
            </Fragment>
          ))}
          <Button variant="ghost" className="px-4 py-2" onClick={() => append("")}>
            Add another guest
          </Button>
        </div>

        <div className="sm:col-span-2">
          <FieldLabel htmlFor="guest.referralSource">How did you hear about PixieDVC?</FieldLabel>
          <select
            id="guest.referralSource"
            {...register("guest.referralSource")}
            className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink shadow-[0_12px_30px_rgba(15,23,42,0.08)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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

      {errors.guest ? <HelperText>We need complete guest contact info.</HelperText> : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
        <Button onClick={onNext}>Review Agreement</Button>
      </div>
    </Card>
  );
}
