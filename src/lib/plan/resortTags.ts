export type ResortTag =
  | "Magic Kingdom"
  | "Epcot Area"
  | "Studios Focus"
  | "Skyliner"
  | "Value Deluxe"
  | "Luxury"
  | "Quiet"
  | "Beach"
  | "Out-of-Florida"
  | "Big Rooms"
  | "Food & Dining"
  | "Great for Families"
  | "Unique Theme";

export type ResortTagMeta = {
  headline: string;
  blurb: string;
  tags: ResortTag[];
  priority: number;
};

export const RESORT_TAGS: Record<string, ResortTagMeta> = {
  "animal-kingdom-jambo": {
    headline: "Best for safari vibes",
    blurb: "Immersive theming and amazing atmosphere - feels like a true getaway.",
    tags: ["Unique Theme", "Great for Families", "Quiet"],
    priority: 70,
  },
  "animal-kingdom-kidani": {
    headline: "Best for space + calm",
    blurb: "Villa-style comfort with a peaceful, resort-day kind of energy.",
    tags: ["Quiet", "Great for Families", "Big Rooms", "Unique Theme"],
    priority: 68,
  },
  aulani: {
    headline: "Best for a Hawaii escape",
    blurb: "A full resort vacation in itself - perfect for relaxing and recharging.",
    tags: ["Out-of-Florida", "Beach", "Luxury", "Great for Families"],
    priority: 80,
  },
  "bay-lake-tower": {
    headline: "Best for Magic Kingdom access",
    blurb: "One of the closest deluxe stays to Magic Kingdom - super convenient.",
    tags: ["Magic Kingdom", "Luxury", "Studios Focus", "Great for Families"],
    priority: 95,
  },
  "beach-club-villas": {
    headline: "Best for Epcot + pool days",
    blurb: "Epcot-area convenience with a classic beachy vibe and great resort feel.",
    tags: ["Epcot Area", "Beach", "Luxury", "Great for Families"],
    priority: 92,
  },
  "boardwalk-villas": {
    headline: "Best for Epcot nights",
    blurb: "Walkable to Epcot with lively BoardWalk energy and great dining nearby.",
    tags: ["Epcot Area", "Food & Dining", "Luxury", "Unique Theme"],
    priority: 90,
  },
  "boulder-ridge-villas": {
    headline: "Best for cozy lodge energy",
    blurb: "A warm, rustic escape close to Magic Kingdom - great for relaxing.",
    tags: ["Magic Kingdom", "Quiet", "Great for Families", "Unique Theme"],
    priority: 78,
  },
  "copper-creek-villas": {
    headline: "Best for modern wilderness luxury",
    blurb: "Stylish, updated villa comfort with a 'nature retreat' vibe.",
    tags: ["Magic Kingdom", "Luxury", "Great for Families", "Unique Theme"],
    priority: 88,
  },
  "disneyland-hotel-villas": {
    headline: "Best for Disneyland magic",
    blurb: "A premium Disneyland-area stay for guests planning a California trip.",
    tags: ["Out-of-Florida", "Luxury", "Great for Families"],
    priority: 82,
  },
  "grand-californian-villas": {
    headline: "Best for California luxury",
    blurb: "High-end Disneyland-area comfort with a classic, premium resort feel.",
    tags: ["Out-of-Florida", "Luxury", "Food & Dining"],
    priority: 86,
  },
  "grand-floridian-villas": {
    headline: "Best for classic Disney luxury",
    blurb: "Top-tier elegance near Magic Kingdom with a timeless resort vibe.",
    tags: ["Magic Kingdom", "Luxury", "Food & Dining"],
    priority: 96,
  },
  "hilton-head-island": {
    headline: "Best for a quiet coastal trip",
    blurb: "A calm, low-key getaway - great when you want less 'theme park' and more rest.",
    tags: ["Out-of-Florida", "Quiet", "Beach", "Great for Families"],
    priority: 60,
  },
  "old-key-west": {
    headline: "Best for value + bigger rooms",
    blurb: "A laid-back vibe with spacious accommodations - great bang for a deluxe stay.",
    tags: ["Value Deluxe", "Big Rooms", "Quiet", "Great for Families"],
    priority: 85,
  },
  "polynesian-villas": {
    headline: "Best for iconic Disney vibes",
    blurb: "A legendary resort feel near Magic Kingdom - fun, beautiful, and memorable.",
    tags: ["Magic Kingdom", "Luxury", "Unique Theme", "Food & Dining"],
    priority: 94,
  },
  "riviera-resort": {
    headline: "Best for Skyliner + modern style",
    blurb: "Sleek, modern, and super convenient for Epcot/Hollywood Studios via Skyliner.",
    tags: ["Skyliner", "Luxury", "Food & Dining", "Studios Focus"],
    priority: 93,
  },
  "saratoga-springs": {
    headline: "Best for value deluxe flexibility",
    blurb: "Often a great option when you want deluxe space without the top-tier price.",
    tags: ["Value Deluxe", "Big Rooms", "Quiet", "Great for Families"],
    priority: 84,
  },
  "vero-beach": {
    headline: "Best for a Florida beach break",
    blurb: "A relaxing beach trip feel - perfect for slowing down and enjoying resort time.",
    tags: ["Beach", "Quiet", "Out-of-Florida", "Great for Families"],
    priority: 62,
  },
};

export const RESORT_FILTERS: Array<{
  key: string;
  label: string;
  match: (tags: ResortTag[]) => boolean;
}> = [
  { key: "all", label: "All", match: () => true },
  { key: "mk", label: "Magic Kingdom", match: (t) => t.includes("Magic Kingdom") },
  { key: "epcot", label: "Epcot area", match: (t) => t.includes("Epcot Area") },
  { key: "value", label: "Value", match: (t) => t.includes("Value Deluxe") },
  { key: "luxury", label: "Luxury", match: (t) => t.includes("Luxury") },
  { key: "skyliner", label: "Skyliner", match: (t) => t.includes("Skyliner") },
  { key: "beach", label: "Beach", match: (t) => t.includes("Beach") },
  { key: "quiet", label: "Quiet", match: (t) => t.includes("Quiet") },
  { key: "out", label: "Out of Florida", match: (t) => t.includes("Out-of-Florida") },
];
