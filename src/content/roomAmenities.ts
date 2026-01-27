import type { RoomKey } from "@/lib/villaLayouts";

type RoomDef = {
  label: string;
  sleeps: number;
  bullets: string[];
  notes?: string;
};

export const ROOM_DEFS: Record<RoomKey, RoomDef> = {
  ST: {
    label: "Studio",
    sleeps: 4,
    bullets: [
      "Kitchenette with mini-fridge, microwave, and coffee maker",
      "Comfortable sleep surfaces for up to four guests",
      "Full bathroom with Disney-style amenities",
      "Balcony or patio for fresh-air downtime",
      "Smart TV with streaming-ready setup",
    ],
  },
  ST_S5: {
    label: "Studio (Sleeps 5)",
    sleeps: 5,
    bullets: [
      "Kitchenette with mini-fridge, microwave, and coffee maker",
      "Additional bedding designed for families of five",
      "Full bathroom with Disney-style amenities",
      "Balcony or patio for fresh-air downtime",
      "Smart TV with streaming-ready setup",
    ],
    notes: "This studio includes extra sleeping space for larger parties.",
  },
  ST_VALUE: {
    label: "Value Studio",
    sleeps: 4,
    bullets: [
      "Kitchenette with mini-fridge, microwave, and coffee maker",
      "Sleep surfaces for up to four guests",
      "Full bathroom with Disney-style amenities",
      "Comfortable, efficient layout for shorter stays",
      "Smart TV with streaming-ready setup",
    ],
  },
  "1BR": {
    label: "1 Bedroom Villa",
    sleeps: 5,
    bullets: [
      "Full kitchen with standard appliances",
      "Washer and dryer in the villa",
      "Separate living area for lounging",
      "Soaking tub or expanded bath amenities",
      "Balcony or patio for outdoor breaks",
    ],
  },
  "2BR": {
    label: "2 Bedroom Villa",
    sleeps: 9,
    bullets: [
      "Full kitchen plus living and dining space",
      "Washer and dryer in the villa",
      "Multiple bedrooms for privacy",
      "Two or more bathrooms for easy mornings",
      "Great for multigenerational travel",
    ],
  },
  THV: {
    label: "Treehouse Villa",
    sleeps: 9,
    bullets: [
      "Full kitchen with standard appliances",
      "Standalone layout with extra breathing room",
      "Multiple bedrooms for privacy",
      "Washer and dryer in the villa",
      "Outdoor space for relaxing between park days",
    ],
  },
  THV_1: {
    label: "Treehouse Villa (Option 1)",
    sleeps: 9,
    bullets: [
      "Full kitchen with standard appliances",
      "Standalone layout with extra breathing room",
      "Multiple bedrooms for privacy",
      "Washer and dryer in the villa",
      "Outdoor space for relaxing between park days",
    ],
  },
  THV_2: {
    label: "Treehouse Villa (Option 2)",
    sleeps: 9,
    bullets: [
      "Full kitchen with standard appliances",
      "Standalone layout with extra breathing room",
      "Multiple bedrooms for privacy",
      "Washer and dryer in the villa",
      "Outdoor space for relaxing between park days",
    ],
  },
  BUNG: {
    label: "Bungalow",
    sleeps: 5,
    bullets: [
      "Kitchen amenities for light meals and snacks",
      "Private outdoor deck or patio",
      "Spacious living area with resort views",
      "Multiple sleeping spaces for families",
      "Premium finishes for a special stay",
    ],
  },
  GV: {
    label: "Grand Villa",
    sleeps: 12,
    bullets: [
      "Large kitchen with full dining setup",
      "Multiple bedrooms across separate levels or wings",
      "Spacious living area for group time",
      "Washer and dryer in the villa",
      "Multiple bathrooms for easy mornings",
    ],
  },
  GV_1: {
    label: "Grand Villa (Option 1)",
    sleeps: 12,
    bullets: [
      "Large kitchen with full dining setup",
      "Multiple bedrooms across separate levels or wings",
      "Spacious living area for group time",
      "Washer and dryer in the villa",
      "Multiple bathrooms for easy mornings",
    ],
  },
  GV_2: {
    label: "Grand Villa (Option 2)",
    sleeps: 12,
    bullets: [
      "Large kitchen with full dining setup",
      "Multiple bedrooms across separate levels or wings",
      "Spacious living area for group time",
      "Washer and dryer in the villa",
      "Multiple bathrooms for easy mornings",
    ],
  },
};
