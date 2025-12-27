export type UserRole =
  | "guest"
  | "owner_pending"
  | "owner_verified"
  | "partner"
  | "admin";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  country: string | null;
  currency: string | null;
  created_at: string;
}

export interface GuestBooking {
  id: string;
  guest_id: string;
  resort_id: string;
  villa_type: string;
  check_in: string;
  check_out: string;
  adults: number;
  youths: number;
  accessibility: boolean;
  alt_resort_id: string | null;
  comments: string | null;
  referral_source: string | null;
  lead_guest: string;
  status:
    | "pending"
    | "deposit_paid"
    | "matched"
    | "contract_sent"
    | "signed"
    | "paid"
    | "confirmed"
    | "completed"
    | "cancelled";
  deposit_amount: number | null;
  deposit_currency: string | null;
  payment_gateway: "stripe" | "paypal" | null;
  signed_name: string | null;
  signed_ip: string | null;
  signed_at: string | null;
  agreement_version: string | null;
}
