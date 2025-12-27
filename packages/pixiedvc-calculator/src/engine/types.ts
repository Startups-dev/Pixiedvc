// src/engine/types.ts
export type RoomCode = "STUDIO" | "ONEBR" | "TWOBR" | "GRANDVILLA" | "DUOSTUDIO" | "DELUXESTUDIO" | "GARDENDUOSTUDIO" | "GARDENDELUXESTUDIO" | "CABIN" | "RESORTSTUDIO" | "TWOBRBUNGALOW" | "PENTHOUSE" | "TREEHOUSE" | "TOWERSTUDIO" | "INNROOM" | "COTTAGE";
export type ViewCode = "V" | "S" | "SV" | "C" | "I" | "P" | "O" | "L" | "T" | "R" | "TP" | "PM"; // Value, Standard, Savanna, Concierge, Island, Poolside/Preferred, Ocean, Lake, Theme Park, Resort, Theme Park View, Premium
export type WeekRate = { sunThu: number; friSat: number };

export type TravelPeriod = {
  id: number;                     // 1..7 (or however many)
  name: string;                   // "Travel Period 1"
  ranges: Array<{ start: string; end: string }>; // yyyy-mm-dd inclusive
  points: {
    STUDIO?: Partial<Record<ViewCode, WeekRate>>;
    ONEBR?: Partial<Record<ViewCode, WeekRate>>;
    TWOBR?: Partial<Record<ViewCode, WeekRate>>;
    GRANDVILLA?: Partial<Record<ViewCode, WeekRate>>;
    DUOSTUDIO?: Partial<Record<ViewCode, WeekRate>>;
    DELUXESTUDIO?: Partial<Record<ViewCode, WeekRate>>;
    GARDENDUOSTUDIO?: Partial<Record<ViewCode, WeekRate>>;
    GARDENDELUXESTUDIO?: Partial<Record<ViewCode, WeekRate>>;
    CABIN?: Partial<Record<ViewCode, WeekRate>>;
    RESORTSTUDIO?: Partial<Record<ViewCode, WeekRate>>;
    TWOBRBUNGALOW?: Partial<Record<ViewCode, WeekRate>>;
    PENTHOUSE?: Partial<Record<ViewCode, WeekRate>>;
    TREEHOUSE?: Partial<Record<ViewCode, WeekRate>>;
    TOWERSTUDIO?: Partial<Record<ViewCode, WeekRate>>;
    INNROOM?: Partial<Record<ViewCode, WeekRate>>;
    COTTAGE?: Partial<Record<ViewCode, WeekRate>>;
  };
};

export type ResortYearChart = {
  resortCode: string;             // "AKV"
  year: number;                   // 2025 or 2026
  periods: TravelPeriod[];
};

export type PricingTier = "PREMIUM" | "REGULAR" | "ADVANTAGE";

export type ResortMeta = {
  code: string;                   // "AKV"
  name: string;                   // "Animal Kingdom Villas"
  category: PricingTier;
  roomTypes: RoomCode[];
  viewsByRoom: Partial<Record<RoomCode, ViewCode[]>>;
  viewNames: Partial<Record<ViewCode, string>>; // Display names for each view code
  occupancy?: Partial<Record<RoomCode, number>>; // Max occupancy for each room type
};

export type QuoteInput = {
  resortCode: string;
  room: RoomCode;
  view: ViewCode;
  checkIn: string;                // yyyy-mm-dd
  nights: number;                 // 1..30
  year?: number;                  // default from check-in
  bookingDate?: string;           // yyyy-mm-dd (defaults to today for booking window calculation)
};

export type QuoteResult = {
  totalPoints: number;
  nightly: Array<{ date: string; points: number; periodId: number | null }>;
  // pricing breakdown (PPP from resort category; fee% is platform config)
  pppUSD: number;
  feePct: number;
  baseUSD: number;
  feeUSD: number;
  totalUSD: number;
  pricingTier: string; // Display name like "Wish Tier" or "Dream Tier"
};
