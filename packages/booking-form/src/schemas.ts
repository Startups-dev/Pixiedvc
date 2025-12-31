import { z } from "zod";

export const tripDetailsSchema = z.object({
  resortId: z.string().min(1),
  resortName: z.string().min(1),
  villaType: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  points: z.number().nonnegative(),
  estCash: z.number().nonnegative(),
  accessibility: z.boolean().default(false),
  altResortId: z.string().optional(),
});

export const guestInfoSchema = z.object({
  leadGuest: z.string().min(1, "Required"),
  email: z.string().email(),
  phone: z.string().min(5).max(30),
  adults: z.number().min(1),
  youths: z.number().min(0),
  address: z.string().min(3),
  city: z.string().min(2),
  region: z.string().min(2),
  postalCode: z.string().min(2),
  country: z.string().min(2),
  additionalGuests: z.array(z.string().min(1)).default([]),
  referralSource: z.string().optional(),
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
