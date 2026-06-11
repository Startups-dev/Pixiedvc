import { z } from "zod";

const guestTitleSchema = z.enum(["Mr.", "Mrs.", "Ms.", "Miss", "Master"]);
const middleInitialErrorMessage = "Enter at least one letter for the middle initial.";

function normalizeMiddleInitial(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

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

const middleInitialSchema = z.preprocess(
  normalizeMiddleInitial,
  z.union([z.literal(""), z.string().regex(/^[A-Z]$/, middleInitialErrorMessage)]),
);

export const tripDetailsSchema = z.object({
  resortId: z.string().min(1),
  resortName: z.string().min(1),
  villaType: z.string().min(1),
  viewType: z.string().optional(),
  pricingTier: z.string().optional(),
  building_preference: z.enum(["none", "jambo", "kidani"]).default("none"),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  points: z.number().nonnegative(),
  estCash: z.number().nonnegative(),
  accessibility: z.boolean().default(false),
  secondaryResortId: z.string().optional(),
  tertiaryResortId: z.string().optional(),
});

const adultGuestSchema = z.object({
  title: guestTitleSchema,
  firstName: z.string().min(1, "Required"),
  middleInitial: middleInitialSchema.optional(),
  lastName: z.string().min(1, "Required"),
  suffix: z.string().max(12).optional(),
});

const childGuestSchema = z.object({
  title: guestTitleSchema,
  firstName: z.string().min(1, "Required"),
  middleInitial: middleInitialSchema.optional(),
  lastName: z.string().min(1, "Required"),
  suffix: z.string().max(12).optional(),
  age: z.number().int().min(0).max(17),
});

export const guestInfoSchema = z.object({
  leadTitle: guestTitleSchema,
  leadFirstName: z.string().min(1, "Required"),
  leadMiddleInitial: middleInitialSchema.optional(),
  leadLastName: z.string().min(1, "Required"),
  leadSuffix: z.string().max(12).optional(),
  email: z.string().email(),
  phone: z.string().min(5).max(30),
  adults: z.number().min(1).optional(),
  youths: z.number().min(0).optional(),
  address: z.string().min(3),
  city: z.string().min(2),
  region: z.string().min(2),
  postalCode: z.string().min(2),
  country: z.string().min(2),
  adultGuests: z.array(adultGuestSchema).default([]),
  childGuests: z.array(childGuestSchema).default([]),
  leadGuest: z.string().optional(),
  additionalGuests: z.array(z.string().min(1)).optional(),
  referralSource: z.string().optional(),
  accessibilityNotes: z.string().optional(),
  comments: z.string().optional(),
});

export const agreementSchema = z.object({
  acceptTerms: z.boolean().refine((value) => value, "You must accept the terms."),
  authorizeDeposit: z
    .boolean()
    .refine((value) => value, "You must allow PixieDVC to place the refundable deposit."),
  signedName: z.string().min(1, "Please type your full name."),
  captchaToken: z.string().optional(),
  gateway: z.enum(["stripe", "paypal"]),
});

export const bookingFlowSchema = z.object({
  trip: tripDetailsSchema,
  guest: guestInfoSchema,
  agreement: agreementSchema,
  referralCode: z.string().optional(),
});

export type TripDetailsInput = z.infer<typeof tripDetailsSchema>;
export type GuestInfoInput = z.infer<typeof guestInfoSchema>;
export type AgreementInput = z.infer<typeof agreementSchema>;
