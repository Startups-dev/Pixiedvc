import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import QuickFacts from "@/components/resort/QuickFacts";
import StickyCTA from "@/components/resort/StickyCTA";
import ResortGuideTeaser from "@/components/resort/ResortGuideTeaser";
import ResortCarouselClient from "@/components/ResortCarouselClient";
import ResortAvailabilityCta from "@/components/ResortAvailabilityCta";
import ResortSections from "@/components/ResortSections";
import ResortHero from "@/components/resort/ResortHero";
import ResortChip from "@/components/resort/ResortChip";
import ResortRoomLayouts from "@/components/resorts/ResortRoomLayouts";
import ResortHighlightsSection from "@/components/resorts/ResortHighlightsSection";
import ContextualGuides from "@/components/guides/ContextualGuides";
import { getAllResortSlugs, getResortBySlug, getResortPhotos, getResortSummaries } from "@/lib/resorts";
import { getHighlightsForResort, getResortSections } from "@/lib/resort-sections";
import { resolveCalculatorCode } from "@/lib/resort-calculator";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resortHighlights } from "@/content/resortHighlights";

import type { Resort } from "@/lib/resorts";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

type Props = {
  params: {
    slug: string;
  };
  searchParams?: {
    from?: string;
    selected?: string;
  };
};

type DiningShape = {
  tableService?: string[];
  quickService?: string[];
  lounges?: string[];
  characterDining?: string[];
  notes?: string;
};

type ResortSplitImages = {
  about?: string;
  goodToKnow?: string;
  dining?: string;
  gettingAround?: string;
  nearbyAmenities?: string;
};

const DINING_NOTICE =
  "Dining locations and availability may change. Confirm hours and reservations in the My Disney Experience or Disneyland app.";

const DINING_BY_SLUG: Record<string, DiningShape> = {
  "bay-lake-tower": {
    tableService: ["California Grill", "Steakhouse 71", "Chef Mickey's (Character Dining)"],
    quickService: ["Contempo Cafe"],
    lounges: ["California Grill Lounge", "Steakhouse 71 Lounge", "Outer Rim", "Cove Bar (poolside, BLT)"],
  },
  "animal-kingdom-lodge": {
    tableService: ["Jiko - The Cooking Place", "Boma - Flavors of Africa", "Sanaa"],
    quickService: ["The Mara"],
    lounges: ["Victoria Falls Lounge", "Sanaa Lounge", "Pool Bars (Uzima Springs / Samawati Springs)"],
  },
  kidani: {
    tableService: ["Jiko - The Cooking Place", "Boma - Flavors of Africa", "Sanaa"],
    quickService: ["The Mara"],
    lounges: ["Victoria Falls Lounge", "Sanaa Lounge", "Pool Bars (Uzima Springs / Samawati Springs)"],
  },
  "beach-club-villas": {
    tableService: ["Beaches & Cream Soda Shop", "Cape May Cafe (Character Breakfast)"],
    quickService: ["Beach Club Marketplace"],
    lounges: ["Martha's Vineyard Lounge", "Hurricane Hanna's (pool bar)"],
  },
  "boardwalk-villas": {
    tableService: ["Flying Fish", "Trattoria al Forno"],
    quickService: ["BoardWalk Deli"],
    lounges: ["AbracadaBar", "Belle Vue Lounge", "BoardWalk Joe's Marvelous Margaritas"],
  },
  "boulder-ridge-villas": {
    tableService: ["Whispering Canyon Cafe", "Story Book Dining at Artist Point (Character Dining)"],
    quickService: ["Roaring Fork"],
    lounges: ["Territory Lounge", "Geyser Point Bar & Grill (walk-up dining + bar)"],
  },
  "copper-creek-villas": {
    tableService: ["Whispering Canyon Cafe", "Story Book Dining at Artist Point (Character Dining)"],
    quickService: ["Roaring Fork"],
    lounges: ["Territory Lounge", "Geyser Point Bar & Grill (walk-up dining + bar)"],
  },
  "copper-creek-villas-and-cabins": {
    tableService: ["Whispering Canyon Cafe", "Story Book Dining at Artist Point (Character Dining)"],
    quickService: ["Roaring Fork"],
    lounges: ["Territory Lounge", "Geyser Point Bar & Grill (walk-up dining + bar)"],
  },
  "polynesian-villas-and-bungalows": {
    tableService: ["ʻOhana", "Kona Cafe"],
    quickService: ["Capt. Cook's"],
    lounges: ["Trader Sam's Grog Grotto", "Tambu Lounge", "Barefoot Pool Bar"],
  },
  "polynesian-villas": {
    tableService: ["ʻOhana", "Kona Cafe"],
    quickService: ["Capt. Cook's"],
    lounges: ["Trader Sam's Grog Grotto", "Tambu Lounge", "Barefoot Pool Bar"],
  },
  "grand-floridian-villas": {
    tableService: [
      "Victoria & Albert's",
      "Citricos",
      "Narcoossee's",
      "Grand Floridian Cafe",
      "1900 Park Fare (Character Dining)",
    ],
    quickService: ["Gasparilla Island Grill"],
    lounges: ["Enchanted Rose", "Citricos Lounge", "Courtyard Pool Bar"],
  },
  riviera: {
    tableService: ["Topolino's Terrace (Character Breakfast)"],
    quickService: ["Primo Piatto"],
    lounges: ["Bar Riva", "Le Petit Cafe (coffee + lounge style)"],
  },
  "riviera-resort": {
    tableService: ["Topolino’s Terrace – Flavors of the Riviera"],
    quickService: ["Primo Piatto"],
    lounges: ["Bar Riva"],
  },
  "saratoga-springs-resort": {
    tableService: ["The Turf Club Bar & Grill"],
    quickService: ["The Artist's Palette"],
    lounges: ["Turf Club Lounge", "On The Rocks (pool bar)"],
  },
  "old-key-west": {
    tableService: ["Olivia's Cafe"],
    quickService: ["Good's Food to Go"],
    lounges: ["Gurgling Suitcase", "Sandcastle Pool Bar"],
  },
  "fort-wilderness-cabins": {
    tableService: ["Trail's End Restaurant", "Hoop-Dee-Doo Musical Revue (Dinner Show)"],
    quickService: ["P&J's Southern Takeout"],
    lounges: ["Crockett's Tavern"],
  },
  aulani: {
    tableService: ["AMA'AMA", "Makahiki (Character Breakfast)"],
    quickService: ["Ulu Cafe", "Off the Hook (poolside)"],
    lounges: ["Olelo Room"],
  },
  "hilton-head-island": {
    tableService: ["None on-property"],
    quickService: ["Signals", "Tide Me Over"],
    lounges: ["Tide Me Over (Pool Bar)"],
  },
  "vero-beach-resort": {
    tableService: ["Wind & Waves Grill"],
    quickService: ["Wind & Waves Market"],
    lounges: ["Wind & Waves Bar"],
  },
  "vero-beach": {
    tableService: ["Wind & Waves Grill"],
    quickService: ["Wind & Waves Market"],
    lounges: ["Wind & Waves Bar"],
  },
  "grand-californian-villas": {
    tableService: ["Napa Rose", "Storytellers Cafe"],
    quickService: ["GCH Craftsman Grill"],
    lounges: ["GCH Craftsman Bar", "Hearthstone Lounge"],
  },
  "villas-at-disneyland-hotel": {
    tableService: ["Goofy's Kitchen", "Tangaroa Terrace Tropical Bar & Grill"],
    quickService: ["The Coffee House"],
    lounges: ["Trader Sam's Enchanted Tiki Bar", "Palm Breeze Bar"],
  },
  "disneyland-hotel-villas": {
    tableService: ["Goofy's Kitchen", "Tangaroa Terrace Tropical Bar & Grill"],
    quickService: ["The Coffee House"],
    lounges: ["Trader Sam's Enchanted Tiki Bar", "Palm Breeze Bar"],
  },
};

const DINING_SLUG_ALIASES: Record<string, string> = {
  "animal-kingdom-villas": "animal-kingdom-lodge",
  "animal-kingdom-kidani": "kidani",
  "beach-club-villa": "beach-club-villas",
  boardwalk: "boardwalk-villas",
  "saratoga-springs": "saratoga-springs-resort",
  "old-key-west-resort": "old-key-west",
  "the-cabins-at-disneys-fort-wilderness-resort": "fort-wilderness-cabins",
  "disneys-riviera-resort": "riviera",
  "the-villas-at-disneys-grand-californian-hotel-spa": "grand-californian-villas",
  "the-villas-at-disneyland-hotel": "villas-at-disneyland-hotel",
  "disneys-polynesian-villas-and-bungalows": "polynesian-villas-and-bungalows",
  "the-villas-at-disneys-grand-floridian-resort-spa": "grand-floridian-villas",
  "disneys-hilton-head-island-resort": "hilton-head-island",
  "disneys-vero-beach-resort": "vero-beach-resort",
};

const SPLIT_SECTION_IMAGES_BY_SLUG: Record<string, ResortSplitImages> = {
  "bay-lake-tower": {
    about:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Bay%20Lake/BayLakeAbout.png",
    goodToKnow:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Bay%20Lake/BayLakeKnow.png",
    dining:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Bay%20Lake/BayLakeDining.png",
    gettingAround:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Bay%20Lake/BayLakeAround.png",
    nearbyAmenities:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Bay%20Lake/BayLakeNearby.png",
  },
  "boardwalk-villas": {
    about:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Boardwalk/BoardwalkAbout.png",
    goodToKnow:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Boardwalk/BoardwalkKnow.png",
    dining:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Boardwalk/BoardwalkDining.png",
    gettingAround:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Boardwalk/Boardwalk%20Around.png",
    nearbyAmenities:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Boardwalk/BoardwalkNearby.png",
  },
  aulani: {
    about:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Aulani/AulaniAbout.png",
    goodToKnow:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Aulani/AulaniKnow.png",
    dining:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Aulani/AulaniDining.png",
    gettingAround:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Aulani/AulaniAround.png",
    nearbyAmenities:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Aulani/AulaniNearby.png",
  },
};

const NEARBY_AMENITIES_FALLBACK_BY_SLUG: Record<string, string[]> = {
  aulani: [
    "Ko Olina Golf Club",
    "Honolulu",
    "Oahu",
    "Snorkeling at Hanauma Bay",
  ],
};

const NEARBY_AMENITIES_OVERRIDE_BY_SLUG: Record<string, string[]> = {
  aulani: [
    "Ko Olina Lagoons with calm, swimmable beaches just steps from the resort",
    "Ko Olina Golf Club, championship 18-hole course nearby",
    "Ko Olina Marina offering ocean excursions, snorkeling, and sunset cruises",
    "Local dining and shops within the Ko Olina resort community",
    "Short drive to Kapolei shopping centers and restaurants",
    "Approximately 30 minutes to Waikiki and Honolulu attractions",
    "Access to island experiences including the North Shore, Pearl Harbor, and scenic coastal drives",
  ],
  "bay-lake-tower": [
    "Walking path directly to Magic Kingdom",
    "Monorail access to Magic Kingdom and EPCOT",
    "Bay Cove Pool with waterslide and interactive water features",
    "Quiet pool exclusive to Bay Lake Tower guests",
    "Fitness center access and community hall activities",
    "Marina access with boat rentals and water recreation on Bay Lake",
    "Electrical Water Pageant viewing along the waterfront",
    "Fireworks viewing from select areas, with a strong Magic Kingdom sightline",
    "Access to dining, shopping, and services at Disney’s Contemporary Resort",
  ],
  "boulder-ridge-villas": [
    "Boat transportation to Magic Kingdom",
    "Access to the Copper Creek Springs Pool with waterslide and hot tubs",
    "Quiet pool located near Boulder Ridge Villas",
    "Geyser Point waterfront lounge area with outdoor seating",
    "Marina access with boat rentals and fishing excursions on Bay Lake",
    "Scenic nature trails and lakeside walking paths",
    "Fire pit area and outdoor movie nights",
    "Fitness center access at Wilderness Lodge",
    "Lobby lounge areas with fireplaces and Pacific Northwest ambiance",
    "Access to dining and retail at Disney’s Wilderness Lodge",
  ],
  "copper-creek-villas": [
    "Boat transportation to Magic Kingdom",
    "Copper Creek Springs Pool with waterslide and hot tubs",
    "Boulder Ridge Cove quiet pool nearby",
    "Geyser Point Bar & Grill with waterfront seating",
    "Marina access with boat rentals and guided fishing excursions on Bay Lake",
    "Lakeside walking trails and wooded pathways",
    "Outdoor fire pit and evening activities",
    "Fitness center access within Wilderness Lodge",
    "Grand lobby with fireplace seating and Pacific Northwest architecture",
    "Access to all dining and retail amenities at Disney’s Wilderness Lodge",
  ],
  "animal-kingdom-villas": [
    "On-site savannas with live wildlife viewing areas",
    "Uzima Springs Pool with waterslide at Jambo House",
    "Samawati Springs Pool with waterslide at Kidani Village",
    "Guided cultural activities and African art experiences",
    "Animal observation guides and educational programs",
    "Fitness center access at both Jambo House and Kidani Village",
    "Community hall activities and recreation programs",
    "Night vision animal viewing areas on select savannas",
    "Access to signature and casual dining within Animal Kingdom Lodge",
    "Bus transportation to all Walt Disney World theme parks and Disney Springs",
  ],
  "animal-kingdom-kidani": [
    "On-site savannas with live wildlife viewing areas",
    "Uzima Springs Pool with waterslide at Jambo House",
    "Samawati Springs Pool with waterslide at Kidani Village",
    "Guided cultural activities and African art experiences",
    "Animal observation guides and educational programs",
    "Fitness center access at both Jambo House and Kidani Village",
    "Community hall activities and recreation programs",
    "Night vision animal viewing areas on select savannas",
    "Access to signature and casual dining within Animal Kingdom Lodge",
    "Bus transportation to all Walt Disney World theme parks and Disney Springs",
  ],
  "beach-club-villas": [
    "Walking access to EPCOT",
    "Boat transportation to Disney's Hollywood Studios",
    "Stormalong Bay pool complex with lazy river and sand-bottom pool",
    "Quiet pool areas exclusive to Beach Club guests",
    "Beachfront seating along Crescent Lake",
    "Access to dining and lounges at Disney’s Beach Club Resort and Yacht Club",
    "Ship Shape Health Club fitness center access",
    "Lakeside walking path connecting to BoardWalk and EPCOT",
    "Evening entertainment and street performers at nearby BoardWalk",
    "Bus transportation to Magic Kingdom, Animal Kingdom, and Disney Springs",
  ],
  "boardwalk-villas": [
    "Walking access to EPCOT",
    "Boat transportation to Disney's Hollywood Studios",
    "Luna Park Pool with Keister Coaster waterslide",
    "Quiet pool areas exclusive to villa guests",
    "Direct access to the Crescent Lake promenade",
    "Evening entertainment, live performers, and nightlife along Disney’s BoardWalk",
    "Access to dining and lounges at Disney’s BoardWalk Inn",
    "Fitness center access at the BoardWalk Resort",
    "Lakeside walking paths connecting to Beach Club and EPCOT",
    "Bus transportation to Magic Kingdom, Animal Kingdom, and Disney Springs",
  ],
  "fort-wilderness-cabins": [
    "Boat transportation to Magic Kingdom",
    "Meadow Swimmin’ Pool with waterslide and water play area",
    "Wilderness Swimmin’ Pool for a quieter setting",
    "Horseback riding and pony rides at Tri-Circle-D Ranch",
    "Hoop-Dee-Doo Musical Revue dinner show",
    "Archery, bike rentals, and canoeing",
    "Campfire sing-alongs and outdoor movie nights",
    "Scenic woodland trails and nature paths",
    "On-site marina with boat rentals",
    "Bus transportation throughout Walt Disney World Resort",
  ],
  "hilton-head-island": [
    "Private Beach House access with direct Atlantic shoreline and relaxed coastal vibes",
    "Scenic island-wide bike trails perfect for riding to dinner, the marina, or sunset views",
    "Championship golf at Harbour Town Golf Links",
    "Waterfront evenings in Harbour Town near Harbour Town Lighthouse",
    "Fresh seafood dining along Skull Creek and Shelter Cove",
    "Kayaking, paddleboarding, dolphin cruises, and boating excursions",
    "Nearby grocery markets for effortless villa kitchen mornings",
  ],
  "old-key-west": [
    "Boat transportation to Disney Springs for waterfront dining, shopping, and evening entertainment",
    "Championship golf at Disney's Lake Buena Vista Golf Course",
    "Quick access to EPCOT and Disney's Hollywood Studios",
    "Scenic walking paths along canals and fairways",
    "Nearby grocery and delivery services ideal for villa kitchen stays",
    "Resort ferry dock for relaxed, car-free evenings",
    "Access to Walt Disney World spa, recreation, and premium dining experiences",
  ],
  "riviera-resort": [
    "Disney Skyliner gondola access to EPCOT and Disney's Hollywood Studios",
    "Riviera Pool with waterslide and European-inspired design",
    "Beau Soleil leisure pool for quieter relaxation",
    "S’il Vous Play interactive water play area",
    "Fitness center with modern equipment",
    "Lawn games and outdoor recreation spaces",
    "Walking path to Disney's Caribbean Beach Resort",
    "Topolino Terrace rooftop views of EPCOT and Hollywood Studios fireworks",
    "Convenient access to Disney transportation throughout Walt Disney World",
  ],
  "saratoga-springs": [
    "Walking and boat access to Disney Springs for waterfront dining, shopping, and evening entertainment",
    "Championship golf at Disney's Lake Buena Vista Golf Course",
    "Full-service relaxation at Senses, A Disney Spa at Disney's Saratoga Springs Resort",
    "Scenic lakefront paths ideal for morning walks or evening strolls",
    "Easy bus access to all four Walt Disney World theme parks",
    "Quick proximity to EPCOT-area dining and entertainment",
  ],
  "vero-beach": [
    "Direct Atlantic Ocean beachfront access",
    "Oceanfront main pool with waterslide and hot tubs",
    "Quiet pool area for relaxed afternoons",
    "Beach rentals including umbrellas and chairs (seasonal)",
    "Campfire activities and family recreation programs",
    "Fitness center and basketball courts",
    "Miniature golf course",
    "Tennis courts",
    "Nature and turtle conservation programs (seasonal)",
  ],
  "grand-floridian-villas": [
    "Monorail access to Magic Kingdom and EPCOT",
    "Walking path directly to Magic Kingdom",
    "Boat transportation across Seven Seas Lagoon",
    "Easy access to dining at Disney's Polynesian Village Resort and Disney's Contemporary Resort",
    "Shopping and entertainment at Disney Springs via short bus ride",
    "Golf at Disney's Magnolia Golf Course and Disney's Palm Golf Course",
    "Spa and wellness services at The Grand Floridian Spa",
    "Waterfront views and evening fireworks along Seven Seas Lagoon",
  ],
  "polynesian-villas": [
    "Monorail access to Magic Kingdom and EPCOT",
    "Walking path connection to Magic Kingdom",
    "Seven Seas Lagoon waterfront location with beach areas",
    "Lava Pool with volcano feature and waterslide",
    "Oasis Pool for a quieter, relaxed setting",
    "Marina access with boat rentals and water activities",
    "Electrical Water Pageant evening views",
    "Fireworks viewing along the lagoon beach",
    "Lush tropical landscaping and open air Great Ceremonial House lobby",
  ],
  "polynesian-villas-and-bungalows": [
    "Monorail access to Magic Kingdom and EPCOT",
    "Walking path connection to Magic Kingdom",
    "Seven Seas Lagoon waterfront location with beach areas",
    "Lava Pool with volcano feature and waterslide",
    "Oasis Pool for a quieter, relaxed setting",
    "Marina access with boat rentals and water activities",
    "Electrical Water Pageant evening views",
    "Fireworks viewing along the lagoon beach",
    "Lush tropical landscaping and open air Great Ceremonial House lobby",
  ],
  "grand-californian-villas": [
    "Private entrance directly into Disney California Adventure Park",
    "Short walking access to Disneyland Park and the Downtown Disney District",
    "Craftsman-style Great Hall lobby with fireplace and live piano music",
    "Multiple pools including a Redwood-themed pool with waterslide",
    "Poolside cabanas available seasonally",
    "Fitness center and spa services at Tenaya Stone Spa",
    "Studios include kitchenettes, 1 to 3 bedroom villas include full kitchens",
    "Concierge services and club-level accommodations",
    "On-site signature dining and lounge experiences",
    "Proximity to Disneyland Resort entertainment, shopping, and dining",
  ],
  "disneyland-hotel-villas": [
    "Walking distance to Disneyland Park and Disney California Adventure Park",
    "Iconic mid-century modern design with classic Disney heritage touches",
    "Three themed pool areas including waterslides and monorail-inspired features",
    "Monorail waterslides at the main pool complex",
    "Fitness center and recreational activities",
    "Concierge services and club-level accommodations",
    "Direct access to Downtown Disney shopping and dining",
  ],
};

const WDW_AREA_BY_SLUG: Record<string, string> = {
  "bay-lake-tower": "monorail-mk",
  "grand-floridian-villas": "monorail-mk",
  "polynesian-villas": "monorail-mk",
  "polynesian-villas-and-bungalows": "monorail-mk",
  "boulder-ridge-villas": "wilderness-lodge",
  "copper-creek-villas": "wilderness-lodge",
  "boardwalk-villas": "epcot-crescent",
  "beach-club-villas": "epcot-crescent",
  "riviera-resort": "skyliner",
  "saratoga-springs": "springs",
  "old-key-west": "springs",
  "animal-kingdom-villas": "animal-kingdom",
  "fort-wilderness-cabins": "fort-wilderness",
};

const WDW_AREA_SUBTEXT: Record<string, string> = {
  "monorail-mk": "Monorail access and classic Magic Kingdom convenience.",
  "wilderness-lodge": "Rustic luxury with quick access to Magic Kingdom.",
  "epcot-crescent": "Walkable EPCOT-area stays with BoardWalk vibes.",
  skyliner: "Skyliner-connected access to EPCOT and Hollywood Studios.",
  springs: "Relaxed stays near Disney Springs dining and shopping.",
  "animal-kingdom": "Savanna views and a quieter, immersive resort feel.",
  "fort-wilderness": "Cabin-style stays with a camp-and-park balance.",
};

const GOOD_TO_KNOW_OVERRIDE_BY_SLUG: Record<string, string[]> = {
  aulani: [
    "Located on Oʻahu’s western shore in Ko Olina, approximately 30 minutes from Honolulu International Airport",
    "Not part of Walt Disney World, this is a standalone Hawaii destination resort",
    "Rental car recommended for exploring Oʻahu, including the North Shore and Waikiki",
    "On-site dining is available, reservations are encouraged during peak seasons",
    "Ocean conditions vary seasonally, the protected lagoon offers calmer swimming",
    "Cultural activities and Hawaiian storytelling are integrated throughout the resort",
    "Aulani is best experienced as a full island vacation, blending Disney service with authentic Hawaiian rhythm.",
  ],
  "bay-lake-tower": [
    "Walking distance to Magic Kingdom",
    "Monorail access to EPCOT and select resort dining",
    "Modern, contemporary styling with a sleek design aesthetic",
    "Studios include kitchenettes, 1 to 3 bedroom villas include full kitchens",
    "Select rooms and viewing areas offer fireworks views",
    "High demand during peak seasons due to direct Magic Kingdom access",
    "Bay Lake Tower is ideal for guests who value location, efficiency, and villa-level comfort just steps from the parks.",
  ],
  "boulder-ridge-villas": [
    "Located within Disney’s Wilderness Lodge, boat access available to Magic Kingdom",
    "Rustic Pacific Northwest inspired design, quiet and retreat-like atmosphere",
    "Shares pools, dining, and amenities with the main Wilderness Lodge resort",
    "Studios include kitchenettes, 1 to 2 bedroom villas include full kitchens",
    "Especially popular during cooler months for its cozy lodge ambiance",
    "Boat transportation may pause during inclement weather",
    "Boulder Ridge offers a peaceful, nature inspired setting while maintaining convenient access to Magic Kingdom.",
  ],
  "copper-creek-villas": [
    "Located within Disney’s Wilderness Lodge, boat access available to Magic Kingdom",
    "Grand Pacific Northwest inspired design with dramatic lobby spaces and fireplaces",
    "Studios include kitchenettes, 1 to 3 bedroom villas and waterfront cabins include full kitchens",
    "Waterfront cabins offer private hot tubs and secluded lake views",
    "Shares dining, pools, and amenities with the main Wilderness Lodge resort",
    "Especially popular during fall and winter seasons for its cozy atmosphere",
    "Copper Creek blends elevated lodge elegance with villa-level privacy and space.",
  ],
  "animal-kingdom-villas": [
    "Located near Disney's Animal Kingdom Theme Park, transportation to other parks provided by bus",
    "Savanna view villas allow guests to observe giraffes, zebras, and other wildlife from balconies",
    "Kidani Village villas include full kitchens and additional bathrooms in larger layouts",
    "Dining is strongly African inspired, with signature table service available on property",
    "Resort atmosphere is immersive and peaceful, removed from typical theme park energy",
    "Car not required, but distances between parks are longer than monorail or Skyliner resorts",
    "Animal Kingdom Villas offer one of the most immersive and unique stays anywhere at Walt Disney World.",
  ],
  "animal-kingdom-kidani": [
    "Located near Disney's Animal Kingdom Theme Park, transportation to other parks provided by bus",
    "Savanna view villas allow guests to observe giraffes, zebras, and other wildlife from balconies",
    "Kidani Village villas include full kitchens and additional bathrooms in larger layouts",
    "Dining is strongly African inspired, with signature table service available on property",
    "Resort atmosphere is immersive and peaceful, removed from typical theme park energy",
    "Car not required, but distances between parks are longer than monorail or Skyliner resorts",
    "Animal Kingdom Villas offer one of the most immersive and unique stays anywhere at Walt Disney World.",
  ],
  "beach-club-villas": [
    "Walking distance to EPCOT and short walk or boat ride to Disney's Hollywood Studios",
    "Access to Stormalong Bay, one of the most expansive pool complexes at Walt Disney World",
    "Studios include kitchenettes, 1 to 2 bedroom villas include full kitchens",
    "Prime location within the EPCOT resort area, vibrant evening atmosphere",
    "High demand during festivals and peak travel seasons",
    "BoardWalk entertainment district just steps away",
    "Beach Club Villas combine unbeatable EPCOT access with a relaxed coastal resort atmosphere.",
  ],
  "boardwalk-villas": [
    "Walking distance to EPCOT and boat or walking access to Disney's Hollywood Studios",
    "Located along Disney’s BoardWalk entertainment district, lively evening energy",
    "Studios include kitchenettes, 1 to 3 bedroom villas include full kitchens",
    "Quick access to EPCOT festivals and dining experiences",
    "Nighttime atmosphere may be more active than quieter resorts",
    "Popular for guests who enjoy walkable dining and nightlife",
    "BoardWalk Villas are ideal for guests who want EPCOT access paired with vibrant evening entertainment.",
  ],
  "fort-wilderness-cabins": [
    "Located within Disney’s Fort Wilderness Resort, boat access available to Magic Kingdom",
    "Standalone cabin accommodations offer more privacy than traditional hotel rooms",
    "Cabins include full kitchens and outdoor patio space",
    "Internal resort transportation may require buses or golf cart rentals",
    "Surrounded by wooded landscapes and campground atmosphere",
    "Popular for longer stays and guests seeking a quieter setting",
    "Fort Wilderness Cabins offer space, privacy, and a nature-focused alternative to traditional Disney resorts.",
  ],
  "hilton-head-island": [
    "Located on a coastal island in South Carolina, separate from Walt Disney World",
    "Beach House access requires a short shuttle ride from the main resort",
    "Dining options are limited on property, most guests explore local seafood restaurants",
    "Biking is one of the primary ways to get around the island",
    "Car recommended for full flexibility",
    "Atmosphere is relaxed and residential rather than theme park oriented",
    "Hilton Head delivers Disney quality within a laid back coastal lifestyle setting.",
  ],
  "old-key-west": [
    "Located in the Disney Springs resort area, boat access available to Disney Springs",
    "Spread out layout with a relaxed, residential atmosphere",
    "Studios include kitchenettes, 1 to 3 bedroom villas include full kitchens",
    "Some buildings are a longer walk from main amenities",
    "Bus transportation provided to all four theme parks",
    "Known for some of the largest standard villa square footage at Walt Disney World",
    "Old Key West offers spacious accommodations and a laid back setting ideal for longer villa stays.",
  ],
  "riviera-resort": [
    "Direct access to the Disney Skyliner, connecting to EPCOT and Disney's Hollywood Studios",
    "Boutique style resort with a more intimate footprint",
    "Studios include kitchenettes, 1 to 3 bedroom villas include full kitchens",
    "Rooftop dining at Topolino’s Terrace is popular and reservations are recommended",
    "Modern European design with understated Disney touches",
    "Central location within the Skyliner resort area",
    "Riviera combines refined European styling with effortless park access and villa comfort.",
  ],
  "saratoga-springs": [
    "Walking and boat access available to Disney Springs",
    "Resort style layout with multiple quiet pools and lake views",
    "Studios include kitchenettes, 1 to 3 bedroom villas include full kitchens",
    "On site spa services available at Senses Spa",
    "Bus transportation provided to all theme parks",
    "Peaceful setting slightly removed from park area congestion",
    "Saratoga Springs blends villa space with country club elegance near Disney Springs nightlife.",
  ],
  "vero-beach": [
    "Located on Florida’s Atlantic coast, approximately 2 hours from Walt Disney World",
    "Not designed as a theme park stay, this is a beach focused destination",
    "Studios include kitchenettes, 1 to 2 bedroom villas include full kitchens",
    "Seasonal sea turtle nesting programs offered during certain months",
    "Rental car recommended for exploring the surrounding area",
    "Dining options are limited compared to larger Disney World resorts",
    "Vero Beach offers a coastal retreat experience with villa comfort and oceanfront serenity.",
  ],
  "grand-floridian-villas": [
    "Monorail access available to Magic Kingdom and EPCOT",
    "Walking path available to Magic Kingdom",
    "Victorian inspired architecture with classic Disney elegance",
    "Studios include kitchenettes, 1 to 3 bedroom villas include full kitchens",
    "Home to some of Walt Disney World’s most refined dining experiences",
    "High demand during holidays and peak travel seasons",
    "Grand Floridian delivers classic luxury, premier location, and villa level comfort in an iconic setting.",
  ],
  "polynesian-villas": [
    "Monorail access available to Magic Kingdom and EPCOT",
    "Walking path now connects to Magic Kingdom",
    "Island inspired design with tropical landscaping and lagoon views",
    "Studios include kitchenettes, overwater bungalows include full kitchens and private decks",
    "Fireworks viewing areas available along the beach",
    "Popular dining venues often require advance reservations",
    "Polynesian Villas combine tropical ambiance, prime location, and spacious villa layouts near Magic Kingdom.",
  ],
  "polynesian-villas-and-bungalows": [
    "Monorail access available to Magic Kingdom and EPCOT",
    "Walking path now connects to Magic Kingdom",
    "Island inspired design with tropical landscaping and lagoon views",
    "Studios include kitchenettes, overwater bungalows include full kitchens and private decks",
    "Fireworks viewing areas available along the beach",
    "Popular dining venues often require advance reservations",
    "Polynesian Villas combine tropical ambiance, prime location, and spacious villa layouts near Magic Kingdom.",
  ],
  "grand-californian-villas": [
    "Located at the entrance of Disney California Adventure Park, private park access available for resort guests",
    "Convenient walking access to Disneyland Park and the Downtown Disney District",
    "Studios include kitchenettes, 1 to 3 bedroom villas include full kitchens",
    "On site dining ranges from signature California cuisine to casual craftsman inspired fare",
    "Design inspired by classic Arts and Crafts architecture, atmosphere is warm, refined, and distinctly Californian",
    "High demand year round due to its location and limited villa inventory",
    "This resort is ideal for guests who prioritize direct park access with an elevated, lodge inspired setting.",
  ],
  "disneyland-hotel-villas": [
    "Located within the Disneyland Resort area, short walking distance to both theme parks",
    "Convenient access to Disneyland Park and Disney California Adventure Park",
    "Studios include kitchenettes, 1 to 3 bedroom villas include full kitchens",
    "On site dining includes nostalgic themed venues and casual poolside options",
    "Design blends mid century modern style with classic Disney storytelling",
    "High demand during holidays and peak California travel seasons",
    "This resort is ideal for guests who enjoy vibrant energy, nostalgic design, and close proximity to both Disneyland parks.",
  ],
};

function resolveDiningForSlug(slug: string): DiningShape | null {
  const direct = DINING_BY_SLUG[slug];
  if (direct) return direct;
  const alias = DINING_SLUG_ALIASES[slug];
  if (alias && DINING_BY_SLUG[alias]) return DINING_BY_SLUG[alias];
  return null;
}

function withDiningNotice(dining: DiningShape | null): DiningShape | null {
  if (!dining) return null;
  const note = dining.notes?.trim() ?? "";
  return {
    ...dining,
    notes: note.toLowerCase().includes("dining locations and availability may change")
      ? note
      : note
        ? `${note} ${DINING_NOTICE}`
        : DINING_NOTICE,
  };
}

function standardizeDiningGroups(dining: DiningShape | null): DiningShape | null {
  if (!dining) return null;
  const table = Array.isArray(dining.tableService) ? [...dining.tableService] : [];
  const character = Array.isArray(dining.characterDining) ? dining.characterDining : [];
  const mergedTable = [...table];
  for (const item of character) {
    if (!mergedTable.includes(item)) {
      mergedTable.push(item);
    }
  }
  return {
    ...dining,
    tableService: mergedTable,
    characterDining: [],
  };
}

function normalizeDiningName(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resort = await getResortBySlug(slug);

  if (!resort) {
    return {};
  }

  return {
    title: `${resort.name} – PixieDVC`,
    description: resort.tagline,
    openGraph: {
      title: `${resort.name} – PixieDVC`,
      description: resort.tagline,
      images: resort.heroImage ? [{ url: resort.heroImage }] : undefined,
    },
  };
}

// export async function generateStaticParams() {
//   if (process.env.NODE_ENV === "development") {
//     return [];
//   }
//   const slugs = await getAllResortSlugs();
//   return slugs.map((slug) => ({ slug }));
// }

export default async function ResortPage({ params }: Props) {
  const { slug } = await params;
  const resort = await getResortBySlug(slug);

  if (!resort) {
    notFound();
  }

  const photos = (await getResortPhotos(slug)) ?? [];
  const resortData = resort;
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for resort dining fetch");
  }
  const { data: baseResortRow } = await admin
    .from("resorts")
    .select("slug, name, essentials")
    .eq("slug", slug)
    .maybeSingle();
  const dining = withDiningNotice(
    standardizeDiningGroups(
      ((baseResortRow as any)?.essentials?.dining as DiningShape | null) ?? resolveDiningForSlug(slug),
    ),
  );

  const hasDining =
    !!dining &&
    (Boolean(dining.notes?.trim()) ||
      (Array.isArray(dining.tableService) && dining.tableService.length > 0) ||
      (Array.isArray(dining.quickService) && dining.quickService.length > 0) ||
      (Array.isArray(dining.characterDining) && dining.characterDining.length > 0) ||
      (Array.isArray(dining.lounges) && dining.lounges.length > 0) ||
      (Array.isArray(dining.grabAndGo) && dining.grabAndGo.length > 0));
  const diningDescriptions: Record<string, string> = {
    "California Grill":
      "Signature rooftop dining with elevated cuisine and panoramic views near Magic Kingdom.",
    "Steakhouse 71":
      "Contemporary steakhouse with classic American favorites served for breakfast, lunch, and dinner.",
    "Contempo Cafe":
      "Fast-casual marketplace offering sandwiches, bowls, pastries, and convenient grab-and-go options.",
    "California Grill Lounge":
      "Sophisticated lounge with cocktails, wine, and small plates in a rooftop setting.",
    "Steakhouse 71 Lounge":
      "Relaxed lounge space featuring craft cocktails and steakhouse-inspired bites.",
    "Outer Rim":
      "Casual lounge in Disney’s Contemporary Resort with cocktails and light fare.",
    "Cove Bar (poolside, BLT)":
      "Poolside bar at Bay Lake Tower serving refreshing drinks in a laid-back atmosphere.",
    "Chef Mickey's (Character Dining)":
      "Popular character dining buffet with classic Disney favorites in a lively family setting.",
    "Jiko - The Cooking Place":
      "Signature fine dining inspired by African, Indian, and Mediterranean flavors with an acclaimed wine list.",
    "Boma - Flavors of Africa":
      "Extensive buffet featuring African-inspired dishes and international favorites.",
    Sanaa:
      "Table-service dining with savanna views, known for African-inspired specialties and Indian-style bread service.",
    "The Mara":
      "Quick-service spot with breakfast, sandwiches, and convenient hot and cold options.",
    "Victoria Falls Lounge":
      "Intimate lounge with cocktails and small plates inspired by African flavors.",
    "Sanaa Lounge":
      "Relaxed bar and lounge adjacent to Sanaa with curated cocktails and wine.",
    "Pool Bars (Uzima Springs / Samawati Springs)":
      "Poolside beverage service with tropical cocktails, beer, and light refreshments.",
    "Beaches & Cream Soda Shop":
      "Classic diner-style table-service with burgers, sandwiches, and iconic ice-cream creations.",
    "Beach Club Marketplace":
      "Convenient quick-service location for breakfast, snacks, and grab-and-go meals.",
    "Martha's Vineyard Lounge":
      "Cozy lounge with wines, cocktails, and light evening offerings.",
    "Hurricane Hanna's (pool bar)":
      "Casual poolside bar and grill with tropical drinks and quick bites.",
    "Cape May Cafe (Character Breakfast)":
      "Character breakfast buffet with Disney favorites and a cheerful seaside theme.",
    "Flying Fish":
      "Refined seafood-forward signature dining with contemporary presentations.",
    "Trattoria al Forno":
      "Italian-inspired table-service restaurant offering house-made pastas and hearty classics.",
    "BoardWalk Deli":
      "Quick-service deli with sandwiches, salads, and bakery favorites.",
    AbracadaBar:
      "Themed cocktail lounge with inventive drinks and BoardWalk-era ambiance.",
    "Belle Vue Lounge":
      "Quiet lounge setting serving cocktails, coffee, and light snacks.",
    "BoardWalk Joe's Marvelous Margaritas":
      "Walk-up cocktail stand featuring frozen drinks and margarita specialties.",
    "Whispering Canyon Cafe":
      "Lively table-service dining known for hearty skillets and playful service.",
    "Roaring Fork":
      "Quick-service marketplace offering breakfast staples, sandwiches, and hot entrees.",
    "Territory Lounge":
      "Rustic lodge-style lounge with craft cocktails, whiskey, and shareable plates.",
    "Geyser Point Bar & Grill (walk-up dining + bar)":
      "Popular waterfront dining and bar offering burgers, bites, and scenic views.",
    "Story Book Dining at Artist Point (Character Dining)":
      "Immersive character dinner experience with prix-fixe courses in an enchanted woodland setting.",
    "Victoria & Albert's":
      "Award-winning signature dining experience with multi-course tasting menus and elevated service.",
    Citricos:
      "Upscale Mediterranean-inspired dining with refined seasonal menus.",
    "Narcoossee's":
      "Waterfront signature restaurant specializing in seafood and steak.",
    "Grand Floridian Cafe":
      "Classic table-service restaurant with all-day American and coastal-inspired fare.",
    "1900 Park Fare (Character Dining)":
      "Character dining buffet with rotating themed experiences and family-friendly menu options.",
    "Gasparilla Island Grill":
      "Quick-service eatery with breakfast, sandwiches, and late-night grab-and-go options.",
    "Enchanted Rose":
      "Elegant lounge offering handcrafted cocktails, champagne, and refined small plates.",
    "Citricos Lounge":
      "Stylish pre- and post-dinner lounge serving cocktails and select appetizers.",
    "Courtyard Pool Bar":
      "Poolside bar with tropical drinks and casual snacks.",
    "Topolino's Terrace (Character Breakfast)":
      "Character breakfast at Topolino’s Terrace with Riviera-inspired cuisine and rooftop views.",
    "Le Petit Cafe (coffee + lounge style)":
      "Cafe and lounge serving specialty coffee by day and cocktails by evening.",
    "The Turf Club Bar & Grill":
      "Table-service grill with steaks, seafood, and relaxed country-club ambiance.",
    "The Artist's Palette":
      "Quick-service marketplace with breakfast, flatbreads, and convenient pantry items.",
    "Turf Club Lounge":
      "Lounge companion to Turf Club with cocktails and small plates.",
    "On The Rocks (pool bar)":
      "Poolside bar serving frozen drinks, beer, and light bites.",
    "Olivia's Cafe":
      "Neighborhood-style table-service restaurant known for comfort food and island-inspired flavors.",
    "Good's Food to Go":
      "Quick-service stand with breakfast sandwiches, burgers, and casual favorites.",
    "Gurgling Suitcase":
      "Small tropical-themed lounge with signature cocktails and bar snacks.",
    "Sandcastle Pool Bar":
      "Poolside bar with tropical beverages and quick refreshments.",
    "Trail's End Restaurant":
      "Hearty comfort-food dining with Southern-inspired classics.",
    "Hoop-Dee-Doo Musical Revue (Dinner Show)":
      "Beloved dinner show pairing all-you-care-to-enjoy fare with live musical entertainment.",
    "P&J's Southern Takeout":
      "Quick-service takeout location offering pizza, fried chicken, and family-friendly options.",
    "Crockett's Tavern":
      "Rustic tavern with casual drinks, snacks, and laid-back lodge atmosphere.",
    "AMA‘AMA": "Oceanfront Hawaiian-inspired fine dining.",
    "AMA'AMA": "Oceanfront Hawaiian-inspired fine dining.",
    "Makahiki (Character Breakfast)": "Family buffet with character breakfast.",
    "Ulu Café": "Casual counter service and coffee.",
    "Ulu Cafe": "Casual counter service and coffee.",
    "Off the Hook (Poolside)": "Poolside bites and tropical drinks.",
    "Off the Hook": "Poolside bites and tropical drinks.",
    "ʻŌlelo Room": "Cocktails and small plates in a lounge setting.",
    "Olelo Room": "Cocktails and small plates in a lounge setting.",
    "None on-property":
      "Disney’s Hilton Head Island Resort does not have a traditional table-service restaurant. Guests typically dine at nearby waterfront restaurants within biking or short driving distance.",
    Signals:
      "Seasonal quick-service offering breakfast items, sandwiches, snacks, and beverages in a casual Lowcountry setting.",
    "Tide Me Over":
      "Poolside quick-service serving burgers, wraps, salads, and frozen tropical drinks, ideal for relaxed afternoons by the pool.",
    "Tide Me Over (Pool Bar)":
      "Casual poolside bar offering beer, wine, and frozen cocktails in a laid-back coastal atmosphere.",
    "Topolino’s Terrace – Flavors of the Riviera":
      "Rooftop signature dining inspired by French and Italian coastal cuisine, offering elegant dinners and a character breakfast experience.",
    "Primo Piatto":
      "Casual Mediterranean-inspired counter service with breakfast, flatbreads, fresh salads, and specialty coffees.",
    "Bar Riva":
      "Poolside bar and grill offering light bites, wine, cocktails, and a relaxed Riviera ambiance.",
    "Wind & Waves Grill":
      "Ocean-inspired table-service dining featuring fresh seafood, coastal cuisine, and elegant indoor seating with relaxed beach ambiance.",
    "Wind & Waves Market":
      "Casual counter service offering breakfast items, sandwiches, snacks, and coffee in a convenient grab-and-go setting.",
    "Wind & Waves Bar":
      "Poolside bar serving tropical cocktails, wine, and light bites in a relaxed beachfront atmosphere.",
    "ʻOhana":
      "Family-style island dining featuring Polynesian-inspired cuisine and a lively dinner experience, breakfast service offered on select mornings.",
    "Kona Cafe":
      "Casual table-service restaurant known for island flavors, sushi offerings, and popular breakfast specialties.",
    "Capt. Cook's":
      "Convenient counter-service location offering breakfast plates, flatbreads, rice bowls, and grab-and-go options.",
    "Trader Sam's Grog Grotto":
      "Immersive tiki lounge experience with creative cocktails and interactive elements.",
    "Tambu Lounge":
      "Relaxed lounge adjacent to ʻOhana, offering tropical drinks and small plates.",
    "Barefoot Pool Bar":
      "Poolside bar serving cocktails and light bites with lagoon views.",
    "Napa Rose":
      "Signature California cuisine featuring seasonal ingredients and an award-winning wine program in an elegant, Craftsman-inspired setting.",
    "Storytellers Cafe":
      "Relaxed table-service dining offering buffet-style breakfast and dinner with character experiences available during select meals.",
    "GCH Craftsman Grill":
      "Poolside counter service featuring burgers, salads, flatbreads, and casual California fare.",
    "GCH Craftsman Bar":
      "Open-air lounge serving craft cocktails, local beers, and small plates overlooking the pool area.",
    "Hearthstone Lounge":
      "Cozy indoor lounge offering wine, cocktails, and light bites in a warm, Arts and Crafts atmosphere.",
    "Goofy's Kitchen":
      "Character dining experience featuring a lively buffet with breakfast and dinner offerings in a fun, family-focused setting.",
    "Goofy's Kitchen (Character Dining)":
      "Character dining experience featuring a lively buffet with breakfast and dinner offerings in a fun, family-focused setting.",
    "Goofy’s Kitchen":
      "Character dining experience featuring a lively buffet with breakfast and dinner offerings in a fun, family-focused setting.",
    "Goofy’s Kitchen (Character Dining)":
      "Character dining experience featuring a lively buffet with breakfast and dinner offerings in a fun, family-focused setting.",
    "Tangaroa Terrace Tropical Bar & Grill":
      "Island-inspired dining offering casual table service in a relaxed, open-air atmosphere.",
    "Tangaroa Terrace Tropical Bar and Grill":
      "Island-inspired dining offering casual table service in a relaxed, open-air atmosphere.",
    "Tangaroa Terrace":
      "Island-inspired dining offering casual table service in a relaxed, open-air atmosphere.",
    "The Coffee House":
      "Grab-and-go coffee, pastries, and light breakfast items ideal for early park mornings.",
    "Trader Sam's Enchanted Tiki Bar":
      "Interactive tiki-themed cocktail lounge with creative drinks and immersive storytelling elements.",
    "Palm Breeze Bar":
      "Poolside bar offering tropical cocktails and light refreshments.",
  };
  const diningDescriptionsByNormalized = Object.fromEntries(
    Object.entries(diningDescriptions).map(([key, value]) => [normalizeDiningName(key), value]),
  );
  const getDiningDescription = (name: string) =>
    diningDescriptions[name] ?? diningDescriptionsByNormalized[normalizeDiningName(name)] ?? null;

  const sectionsBase = getResortSections(slug).map((section) =>
    section.type === "dining"
      ? {
          ...section,
          items: dining ?? section.items,
        }
      : section,
  );
  const hasDiningSection = sectionsBase.some((s) => s.type === "dining");
  const sections = hasDiningSection
    ? sectionsBase
    : [
      ...sectionsBase,
      {
        id: "dining",
        type: "dining",
        title: "Dining",
        items: dining ?? [],
      } as any,
      ];
  const sectionsStandalone = sections.filter(
    (section) =>
      section.type !== "dining" &&
      section.type !== "transportation" &&
      section.type !== "amenities",
  );
  const overviewSection = sectionsStandalone.find((section) => section.type === "overview");
  const sectionsMain = sectionsStandalone.filter(
    (section) => section.type !== "overview" && section.type !== "policies" && section.type !== "map",
  );
  const defaultGoodToKnowItems = [
    "Best suited for longer, relaxed stays",
    "Focused on resort experience over park access",
    "Availability may vary by season",
  ];
  const goodToKnowItems = (GOOD_TO_KNOW_OVERRIDE_BY_SLUG[slug] ?? defaultGoodToKnowItems).map(
    (item) => item.replace(/\s[–—]\s/g, ", "),
  );
  const transportation = resortData.essentials?.transportation ?? "";
  const gettingAroundItems = transportation
    .split(/\n|•|;|\.(?=\s+[A-Z])/)
    .map((item) => item.trim())
    .filter(Boolean);
  const nearbyAmenities =
    NEARBY_AMENITIES_OVERRIDE_BY_SLUG[slug] ??
    (Array.isArray(resortData.essentials?.amenities) && resortData.essentials.amenities.length > 0
      ? resortData.essentials.amenities
      : (NEARBY_AMENITIES_FALLBACK_BY_SLUG[slug] ?? []));
  const hasGettingAround = gettingAroundItems.length > 0;
  const hasNearbyAmenities = nearbyAmenities.length > 0;
  const splitImages = SPLIT_SECTION_IMAGES_BY_SLUG[slug] ?? {};
  const resortSummaries = await getResortSummaries();
  const resortCode = resolveCalculatorCode({ slug: resortData.slug });
  const highlightChips = getHighlightsForResort({
    slug,
    location: resortData.location,
    chips: resortData.chips,
    sections: sectionsStandalone,
  });
  const highlight = resortHighlights[slug];

  return (
    <main className="bg-white pb-24 text-[#0F2148] md:pb-28">
      <section className="mx-auto max-w-6xl px-6 pb-4 pt-6 font-sans">
        <div className="space-y-2">
          <Link
            href="/plan/resorts"
            className="text-sm font-medium text-[#0F2148]/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2148]/30"
          >
            ← Back to resort selection
          </Link>
          <div className="text-xs text-[#0F2148]/60">
            <Link href="/plan" className="hover:underline">
              Plan your stay
            </Link>
            <span className="px-2">→</span>
            <Link href="/plan/resorts" className="hover:underline">
              Resorts
            </Link>
            <span className="px-2">→</span>
            <span className="text-[#0F2148]/80">{resortData.name}</span>
          </div>
        </div>
      </section>
      {photos.length > 0 ? (
        <ResortCarouselClient photos={photos} />
      ) : (
        <ResortHero
          name={resortData.name}
          tagline={resortData.tagline}
          heroImage={photos[0]?.src ?? resortData.heroImage}
          chips={highlightChips}
        />
      )}
      {photos.length > 0 ? (
        <ResortIntro
          name={resortData.name}
          tagline={resortData.tagline}
          chips={highlightChips}
        />
      ) : null}

      {highlight ? (
        <section className="mx-auto max-w-6xl px-6">
          <ResortHighlightsSection highlight={highlight} resortName={resortData.name} />
        </section>
      ) : null}

      <ResortRoomLayouts resortCode={resortCode} />

      <QuickFacts id="availability" facts={resortData.facts} />
      <ResortAvailabilityCta slug={resortData.slug} name={resortData.name} />

      <SplitSection
        title="About This Resort"
        imageSide="right"
        imageUrl={splitImages.about}
        className="mx-auto max-w-6xl px-6"
      >
        <p className="mt-8 text-base leading-relaxed text-foreground/90">
          {overviewSection?.body ?? resortData.tagline}
        </p>
      </SplitSection>

      <SplitSection
        title="Good to Know"
        imageSide="left"
        imageUrl={splitImages.goodToKnow}
        className="mx-auto max-w-6xl px-6"
      >
        <ul className="mt-8 space-y-3 text-base leading-relaxed text-foreground/90">
          {goodToKnowItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0F2148]/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </SplitSection>

      <ResortSections slug={slug} sections={sectionsMain} />

      <SplitSection
        title={`Dining at ${resort?.name}`}
        subtitle="From signature fine dining to poolside bites, here's where you can eat."
        imageSide="right"
        imageUrl={splitImages.dining}
        className="mx-auto max-w-6xl px-6"
      >
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.isArray(dining?.tableService) && dining.tableService.length > 0 ? (
              <div className="p-6">
                <h3 className="text-sm font-semibold tracking-tight text-[#0F2148]">
                  Table-Service Restaurants
                </h3>
                <div className="mt-2 h-px w-10 bg-[#0F2148]/10" />
                <ul className="mt-4 space-y-6">
                  {dining.tableService.map((name: string) => {
                    const desc = getDiningDescription(name);
                    return (
                      <li key={`table-${name}`}>
                        <p className="text-lg font-semibold tracking-tight">{name}</p>
                        {desc ? <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {Array.isArray(dining?.quickService) && dining.quickService.length > 0 ? (
              <div className="p-6">
                <h3 className="text-sm font-semibold tracking-tight text-[#0F2148]">
                  Quick-Service Restaurants
                </h3>
                <div className="mt-2 h-px w-10 bg-[#0F2148]/10" />
                <ul className="mt-4 space-y-6">
                  {dining.quickService.map((name: string) => {
                    const desc = getDiningDescription(name);
                    return (
                      <li key={`quick-${name}`}>
                        <p className="text-lg font-semibold tracking-tight">{name}</p>
                        {desc ? <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {Array.isArray(dining?.characterDining) && dining.characterDining.length > 0 ? (
              <div className="p-6">
                <h3 className="text-sm font-semibold tracking-tight text-[#0F2148]">
                  Character Dining
                </h3>
                <div className="mt-2 h-px w-10 bg-[#0F2148]/10" />
                <ul className="mt-4 space-y-6">
                  {dining.characterDining.map((name: string) => {
                    const desc = getDiningDescription(name);
                    return (
                      <li key={`character-${name}`}>
                        <p className="text-lg font-semibold tracking-tight">{name}</p>
                        {desc ? <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {Array.isArray(dining?.lounges) && dining.lounges.length > 0 ? (
              <div className="p-6">
                <h3 className="text-sm font-semibold tracking-tight text-[#0F2148]">
                  Lounges &amp; Bars
                </h3>
                <div className="mt-2 h-px w-10 bg-[#0F2148]/10" />
                <ul className="mt-4 space-y-6">
                  {dining.lounges.map((name: string) => {
                    const desc = getDiningDescription(name);
                    return (
                      <li key={`lounge-${name}`}>
                        <p className="text-lg font-semibold tracking-tight">{name}</p>
                        {desc ? <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {Array.isArray(dining?.grabAndGo) && dining.grabAndGo.length > 0 ? (
              <div className="p-6">
                <h3 className="text-sm font-semibold tracking-tight text-[#0F2148]">
                  Grab-and-Go / Marketplaces
                </h3>
                <div className="mt-2 h-px w-10 bg-[#0F2148]/10" />
                <ul className="mt-4 space-y-6">
                  {dining.grabAndGo.map((name: string) => {
                    const desc = getDiningDescription(name);
                    return (
                      <li key={`grab-${name}`}>
                        <p className="text-lg font-semibold tracking-tight">{name}</p>
                        {desc ? <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {typeof dining?.notes === "string" && dining.notes.trim().length > 0 ? (
              <div className="mt-8 text-sm italic text-[#0F2148]/70 md:col-span-2 lg:col-span-3">
                <h3 className="text-sm font-semibold tracking-tight text-[#0F2148] not-italic">
                  Important Notes
                </h3>
                <div className="mt-2 h-px w-10 bg-[#0F2148]/10" />
                <p className="mt-4 text-sm italic leading-relaxed text-[#0F2148]/70">
                  {dining.notes}
                </p>
              </div>
            ) : null}
            {!hasDining ? (
              <div className="rounded-2xl bg-muted/30 p-6 md:col-span-2 lg:col-span-3">
                <p className="text-sm leading-relaxed text-[#0F2148]/70">
                  Dining details coming soon.
                </p>
              </div>
            ) : null}
        </div>
      </SplitSection>

      <SplitSection
        title="Getting Around"
        imageSide="left"
        imageUrl={splitImages.gettingAround}
        className="mx-auto max-w-6xl px-6"
      >
        {hasGettingAround ? (
          <ul className="mt-8 space-y-4 text-base leading-relaxed text-foreground/90">
            {gettingAroundItems.map((item) => {
              const [label, ...rest] = item.split(":");
              const descriptionRaw = rest.join(":").trim();
              const normalizedDescription = descriptionRaw
                .split(".")
                .map((part) => part.trim())
                .filter(Boolean)
                .filter((part, index, parts) => {
                  if (index === 0) return true;
                  return part.toLowerCase() !== parts[index - 1]?.toLowerCase();
                })
                .join(". ");
              const hasLabel = rest.length > 0;
              const fallbackLabel = item.toLowerCase().includes("rental car")
                ? "Rental Cars"
                : "Details";
              const labelText = hasLabel ? label.trim() : fallbackLabel;
              const valueText = hasLabel ? normalizedDescription || descriptionRaw : item;
              return (
                <li key={item} className="space-y-1">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {labelText}
                  </div>
                  <div className="text-base leading-relaxed text-foreground/90">
                    {valueText.replace(/\.?$/, ".")}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-8 text-base leading-relaxed text-foreground/90">
            Getting around details coming soon.
          </p>
        )}
      </SplitSection>

      <SplitSection
        title="Nearby Amenities"
        imageSide="right"
        imageUrl={splitImages.nearbyAmenities}
        className="mx-auto max-w-6xl px-6"
      >
        {hasNearbyAmenities ? (
          <ul className="mt-8 space-y-3 text-base leading-relaxed text-foreground/90">
            {nearbyAmenities.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0F2148]/50" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-base leading-relaxed text-foreground/90">
            Nearby amenities details coming soon.
          </p>
        )}
      </SplitSection>

      {resortData.slug === "bay-lake-tower" ? <ResortGuideTeaser resortSlug={resortData.slug} /> : null}

      <SimilarStaysSection slug={slug} resortSummaries={resortSummaries} />
      <section className="mx-auto max-w-6xl px-6">
        <ContextualGuides
          title="Guides"
          description="Quick reads to help you plan your DVC Vacation."
          tags={[slug, "resorts"]}
          limit={3}
        />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8 font-sans">
        <Link
          href="/plan/resorts"
          className="inline-flex items-center text-sm font-medium text-[#0F2148]/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2148]/30"
        >
          Still deciding? ← Back to resort selection
        </Link>
      </section>

      <StickyCTA resortName={resortData.name} resortSlug={resortData.slug} />
    </main>
  );
}

function SplitSection({
  title,
  subtitle,
  children,
  imageSide,
  imageUrl,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  imageSide: "left" | "right";
  imageUrl?: string;
  className?: string;
}) {
  const imageOrder = imageSide === "right" ? "md:order-2" : "md:order-1";
  const textOrder = imageSide === "right" ? "md:order-1" : "md:order-2";

  return (
    <section className={`mt-20 md:mt-24 ${className ?? ""}`}>
      <div className="grid items-start gap-10 md:grid-cols-2 lg:gap-14">
        <div
          className={`${imageOrder} relative h-64 overflow-hidden rounded-2xl border border-foreground/10 bg-gradient-to-br from-muted/40 to-muted/20 md:h-72 lg:h-80`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={`${title} image`} className="block h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs tracking-wide text-muted-foreground">
              Resort image coming soon
            </div>
          )}
        </div>
        <div className={textOrder}>
          <div className="max-w-[38rem]">
            <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              {title}
            </h2>
            <div className="mt-3 h-px w-16 bg-foreground/10" />
            {subtitle ? (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                {subtitle}
              </p>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResortIntro({ name, tagline, chips }: { name: string; tagline: string; chips: string[] }) {
  return (
    <section className="bg-[#0F2148] pb-4 text-white">
      <div className="mx-auto max-w-6xl px-6 pb-10">
        <h1 className="mb-2 text-4xl font-serif md:text-5xl">{name}</h1>
        <p className="mb-5 max-w-2xl text-base text-white/85 md:text-lg">{tagline}</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <ResortChip key={chip} label={chip} variant="light" />
          ))}
        </div>
        <div className="mt-3 text-xs text-white/70">
          ★★★★☆ 4.8 <span className="ml-2 text-white/60">Guest favorite</span>
        </div>
      </div>
    </section>
  );
}


function MapSection({ resort }: { resort: Resort }) {
  const mapData = resort.map;
  const mapImage = mapData?.image ?? null;

  return (
    <section
      id="map"
      className="mx-auto max-w-6xl px-6 py-14"
    >
      <div className="grid gap-6 rounded-3xl border border-[#0F2148]/10 bg-white/80 p-8 shadow-[0_20px_60px_rgba(12,15,44,0.15)] md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[#0F2148]/60">Resort Map</p>
          <h2 className="text-2xl font-serif">{mapData?.headline ?? `${resort.name} at-a-glance`}</h2>
          <p className="text-sm text-[#0F2148]/75">
            {mapData?.description ??
              `See how ${resort.name} connects to transportation, walking paths, and neighboring resorts. An interactive map will ship once our Supabase content pipeline is live.`}
          </p>
        </div>
        <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#0F2148]/25 bg-white/60 p-8 text-sm text-[#0F2148]/50">
          {mapImage ? (
            <div
              aria-label={`${resort.name} resort map`}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${mapImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : null}
          {!mapImage ? <span>Interactive map coming soon</span> : null}
        </div>
      </div>
    </section>
  );
}

function SimilarStaysSection({
  slug,
  resortSummaries,
}: {
  slug: string;
  resortSummaries: Array<{ slug: string; name: string; cardImage: string | null; heroImage?: string | null; location: string | null; tags: string[]; pointsRange: string | null }>;
}) {
  const area = WDW_AREA_BY_SLUG[slug];
  if (!area) {
    return null;
  }
  const alternatives = resortSummaries
    .filter((resort) => resort.slug !== slug && WDW_AREA_BY_SLUG[resort.slug] === area)
    .slice(0, 3);

  return (
    <section id="similar-stays" className="mx-auto mt-16 max-w-6xl px-6 pb-20">
      <div className="space-y-6 rounded-3xl border border-[#0F2148]/10 bg-white/80 p-8 shadow-[0_20px_60px_rgba(12,15,44,0.15)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-serif text-[#0F2148]">Similar Stays You May Love</h2>
            <p className="mt-2 text-sm text-[#0F2148]/70">
              {WDW_AREA_SUBTEXT[area]}
            </p>
          </div>
          <Link
            href="/resorts"
            className="inline-flex items-center gap-2 rounded-full border border-[#0F2148]/20 px-5 py-2 text-sm font-semibold text-[#0F2148] transition hover:border-[#0F2148]/40"
          >
            View all resorts →
          </Link>
        </div>
        <ul className="grid gap-4 text-sm text-[#0F2148]/80 md:grid-cols-2 lg:grid-cols-3">
          {alternatives.map((resort) => {
            const imageSrc = resort.cardImage ?? resort.heroImage ?? null;

            return (
              <li
                key={resort.slug}
                className="rounded-2xl border border-[#0F2148]/10 bg-white/80 p-4 shadow-[0_10px_24px_rgba(12,15,44,0.08)]"
              >
                <Link
                  href={`/resorts/${resort.slug}#availability`}
                  className="flex flex-col gap-2 text-left transition hover:text-[#2b3a70]"
                >
                  <div className="overflow-hidden rounded-xl border border-[#0F2148]/10 bg-slate-100">
                    {imageSrc ? (
                      <img src={imageSrc} alt={resort.name} className="h-40 w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-40 w-full place-items-center text-xs text-[#0F2148]/50">
                        Resort image coming soon
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-[#0F2148]">{resort.name}</span>
                  <span className="line-clamp-1 text-xs text-[#0F2148]/70">
                    {resort.location ?? "Disney Vacation Club resort"}
                  </span>
                  <span className="text-sm font-semibold text-[#0F2148]">View resort</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
