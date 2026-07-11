import { Resorts as CalculatorResorts } from "pixiedvc-calculator";

import { canonicalizeResortSlug } from "@/lib/resorts/canonical";
import { WDW_DVC_RESORT_SLUGS } from "@/lib/pixie/constants";
import { buildRoomTypesFromCalculator } from "@/lib/pixie/resorts/room-types";
import type {
  PixieLocationCategory,
  PixiePark,
  PixieResortCatalogItem,
  PixieResortCategory,
  PixieResortId,
  PixieTransportationMode,
} from "@/lib/pixie/resorts/types";

export const PIXIE_RESORT_CATALOG_VERSION = "2026-07-10.phase2";

type ResortSeed = {
  id: PixieResortId;
  slug: string;
  aliases?: string[];
  calculatorCode: string;
  displayName: string;
  shortName: string;
  locationCategory: PixieLocationCategory;
  transportationModes: PixieTransportationMode[];
  nearbyParks: PixiePark[];
};

const SEEDS: ResortSeed[] = [
  {
    id: "akv",
    slug: "animal-kingdom-villas",
    aliases: [
      "animal-kingdom-jambo",
      "animal-kingdom-kidani",
      "disney-s-animal-kingdom-villas-jambo-house",
      "disney-s-animal-kingdom-villas-kidani-village",
    ],
    calculatorCode: "AKV",
    displayName: "Animal Kingdom Villas",
    shortName: "Animal Kingdom Villas",
    locationCategory: "animal_kingdom",
    transportationModes: ["bus"],
    nearbyParks: ["animal_kingdom"],
  },
  {
    id: "blt",
    slug: "bay-lake-tower",
    calculatorCode: "BLT",
    displayName: "Bay Lake Tower at Disney's Contemporary Resort",
    shortName: "Bay Lake Tower",
    locationCategory: "magic_kingdom",
    transportationModes: ["walk", "monorail"],
    nearbyParks: ["magic_kingdom"],
  },
  {
    id: "bcv",
    slug: "beach-club-villas",
    calculatorCode: "BCV",
    displayName: "Beach Club Villas",
    shortName: "Beach Club Villas",
    locationCategory: "epcot",
    transportationModes: ["walk", "boat"],
    nearbyParks: ["epcot", "hollywood_studios"],
  },
  {
    id: "bwv",
    slug: "boardwalk-villas",
    aliases: ["boardwalk"],
    calculatorCode: "BWV",
    displayName: "BoardWalk Villas",
    shortName: "BoardWalk Villas",
    locationCategory: "epcot",
    transportationModes: ["walk", "boat"],
    nearbyParks: ["epcot", "hollywood_studios"],
  },
  {
    id: "brv",
    slug: "boulder-ridge-villas",
    calculatorCode: "BRV",
    displayName: "Boulder Ridge Villas at Disney's Wilderness Lodge",
    shortName: "Boulder Ridge Villas",
    locationCategory: "magic_kingdom",
    transportationModes: ["boat", "bus"],
    nearbyParks: ["magic_kingdom"],
  },
  {
    id: "ccv",
    slug: "copper-creek-villas",
    calculatorCode: "CCV",
    displayName: "Copper Creek Villas & Cabins at Disney's Wilderness Lodge",
    shortName: "Copper Creek Villas",
    locationCategory: "magic_kingdom",
    transportationModes: ["boat", "bus"],
    nearbyParks: ["magic_kingdom"],
  },
  {
    id: "okw",
    slug: "old-key-west",
    calculatorCode: "OKW",
    displayName: "Disney's Old Key West Resort",
    shortName: "Old Key West",
    locationCategory: "disney_springs",
    transportationModes: ["boat", "bus"],
    nearbyParks: [],
  },
  {
    id: "pvb",
    slug: "polynesian-villas",
    calculatorCode: "PVB",
    displayName: "Disney's Polynesian Villas & Bungalows",
    shortName: "Polynesian Villas",
    locationCategory: "magic_kingdom",
    transportationModes: ["monorail", "boat"],
    nearbyParks: ["magic_kingdom"],
  },
  {
    id: "rva",
    slug: "riviera-resort",
    aliases: ["riviera"],
    calculatorCode: "RVA",
    displayName: "Disney's Riviera Resort",
    shortName: "Riviera Resort",
    locationCategory: "epcot",
    transportationModes: ["skyliner", "bus"],
    nearbyParks: ["epcot", "hollywood_studios"],
  },
  {
    id: "ssr",
    slug: "saratoga-springs",
    aliases: ["saratoga-springs-resort"],
    calculatorCode: "SSR",
    displayName: "Disney's Saratoga Springs Resort & Spa",
    shortName: "Saratoga Springs",
    locationCategory: "disney_springs",
    transportationModes: ["walk", "boat", "bus"],
    nearbyParks: [],
  },
  {
    id: "vgf",
    slug: "grand-floridian-villas",
    calculatorCode: "VGF",
    displayName: "The Villas at Disney's Grand Floridian Resort & Spa",
    shortName: "Grand Floridian Villas",
    locationCategory: "magic_kingdom",
    transportationModes: ["walk", "monorail", "boat"],
    nearbyParks: ["magic_kingdom"],
  },
];

function mapCategory(category: string): PixieResortCategory {
  if (category === "PREMIER_ACCESS" || category === "PREMIUM") return "premier_access";
  if (category === "PRIORITY_ACCESS") return "priority_access";
  if (category === "SELECT_ACCESS" || category === "REGULAR") return "select_access";
  return "value_access";
}

export const PIXIE_NON_WDW_CALCULATOR_CODES = ["AUL", "VDH", "VGC", "HHI", "VB"] as const;
export const PIXIE_UNSUPPORTED_WDW_RESORTS = [
  {
    slug: "fort-wilderness-cabins",
    calculatorCode: "CFW",
    reason: "The repository has a 2027 CFW chart and slug fallback, but calculator resort metadata lacks CFW category, room types, and occupancy.",
  },
] as const;

export function getPixieWdwResortCatalog(): PixieResortCatalogItem[] {
  return SEEDS.map((seed, index) => {
    const meta = CalculatorResorts.find((item) => item.code === seed.calculatorCode);
    if (!meta) {
      throw new Error(`Missing calculator metadata for Pixie resort ${seed.calculatorCode}.`);
    }
    const canonicalSlug = canonicalizeResortSlug(seed.slug);
    return {
      id: seed.id,
      slug: canonicalSlug,
      aliases: [...new Set([canonicalSlug, ...(seed.aliases ?? [])])],
      calculatorCode: seed.calculatorCode,
      bookingValue: canonicalSlug,
      displayName: seed.displayName,
      shortName: seed.shortName,
      locationCategory: seed.locationCategory,
      transportationModes: seed.transportationModes,
      nearbyParks: seed.nearbyParks,
      resortCategory: mapCategory(meta.category),
      roomTypes: buildRoomTypesFromCalculator(seed.id, seed.calculatorCode),
      image: {
        resortSlug: canonicalSlug,
        resortCode: seed.calculatorCode,
      },
      active: true,
      supported: WDW_DVC_RESORT_SLUGS.includes(canonicalSlug as (typeof WDW_DVC_RESORT_SLUGS)[number]),
      catalogOrder: index,
    };
  });
}

export const PIXIE_WDW_RESORT_CATALOG = getPixieWdwResortCatalog();
