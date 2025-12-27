import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL env var");
  process.exit(1);
}

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY env var");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const baseResorts = [
  {
    slug: "bay-lake-tower",
    name: "Bay Lake Tower",
    location: "Magic Kingdom Skyline",
    tagline: "Fireworks views & Monorail access near Cinderella’s Castle.",
    hero_image: "https://YOUR-SUPABASE-STORAGE/resorts/bay-lake/hero.webp",
    card_image: "https://YOUR-SUPABASE-STORAGE/resorts/bay-lake/card.webp",
    chips: ["Magic Kingdom Area", "Monorail Access", "Lakeside Pool"],
    tags: ["Monorail", "Fireworks", "Deluxe Studio"],
    points_range: "18–32 pts/night",
    facts: [
      { title: "Sleeps", value: "5 Guests" },
      { title: "Room Size", value: "356 sq.ft" },
      { title: "Views", value: "Lake • Pool • Park" },
    ],
    layout: {
      title: "Deluxe Studio",
      bullets: [
        "1 Queen Bed + 1 Pull-Down Queen Wall Bed",
        "Full Bath + Kitchenette",
        "Private balcony (select rooms)",
        "Sleeps up to 5 Guests",
      ],
      notes: "5th-floor rooms may feature a sleeper sofa instead of a pull-down bed. Layouts can vary slightly by floor.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/bay-lake/layout.webp",
    },
    photos: [
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/bay-lake/pool.webp",
        caption: "Bay Lake Tower Pool",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/bay-lake/lobby.webp",
        caption: "Lobby & Lounge",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/bay-lake/view.webp",
        caption: "Fireworks Balcony View",
      },
    ],
    essentials: {
      transportation: "Walk or take the monorail to Magic Kingdom in ~10 minutes.",
      amenities: [
        "Feature Pool with waterslide",
        "Fitness center",
        "Marina & lakeside paths",
      ],
      dining: ["California Grill", "Steakhouse 71", "Contempo Café"],
      notices: ["Exterior work may be visible during daytime hours (select dates)."],
    },
    map: {
      headline: "Steps from Magic Kingdom",
      description: "Connected to Disney's Contemporary Resort with monorail access and a private Bay Lake shoreline.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/bay-lake/map.webp",
    },
    nearby: [
      { name: "Polynesian Villas & Bungalows", slug: "polynesian-villas", tagline: "Tropical escapes on the monorail." },
      { name: "Grand Floridian Villas", slug: "grand-floridian-villas", tagline: "Victorian elegance with Seven Seas Lagoon views." },
    ],
  },
  {
    slug: "grand-floridian-villas",
    name: "Grand Floridian Villas",
    location: "Seven Seas Lagoon",
    tagline: "Victorian charm with monorail convenience and spa indulgence.",
    hero_image: "https://YOUR-SUPABASE-STORAGE/resorts/grand-floridian/hero.webp",
    card_image: "https://YOUR-SUPABASE-STORAGE/resorts/grand-floridian/card.webp",
    chips: ["Live Pianist", "Monorail", "Victoria & Albert’s"],
    tags: ["Victorian", "Spa", "Monorail"],
    points_range: "22–40 pts/night",
    facts: [
      { title: "Sleeps", value: "5 Guests" },
      { title: "Room Size", value: "374 sq.ft" },
      { title: "Views", value: "Lagoon • Courtyard" },
    ],
    layout: {
      title: "Deluxe Studio",
      bullets: [
        "1 Queen Bed + 1 Pull-Down Queen",
        "Split bathroom with soaking tub",
        "Kitchenette with marble finishes",
        "Private patio or balcony",
      ],
      notes: "Studios sleep up to 5 and include a single pull-down bed perfect for younger guests.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/grand-floridian/layout.webp",
    },
    photos: [
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/grand-floridian/lobby.webp",
        caption: "Grand lobby with live music",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/grand-floridian/pool.webp",
        caption: "Beach Pool overlooking Seven Seas Lagoon",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/grand-floridian/villa.webp",
        caption: "Villa living area",
      },
    ],
    essentials: {
      transportation: "Monorail, water launch, or walking path to Magic Kingdom.",
      amenities: ["Senses Spa", "Beach Pool", "Mary Poppins-themed splash play"],
      dining: ["Victoria & Albert’s", "Citricos", "1900 Park Fare"],
    },
    map: {
      headline: "Seven Seas Lagoon Promenade",
      description: "Nestled along the lagoon with monorail and water launch access plus a walking path to Magic Kingdom.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/grand-floridian/map.webp",
    },
    nearby: [
      { name: "Bay Lake Tower", slug: "bay-lake-tower", tagline: "Skyline views with monorail at your doorstep." },
      { name: "Polynesian Villas", slug: "polynesian-villas", tagline: "Overwater bungalows and tropical nights." },
    ],
  },
  {
    slug: "polynesian-villas",
    name: "Polynesian Villas & Bungalows",
    location: "Seven Seas Lagoon",
    tagline: "Island enchantment with overwater bungalows and Dole Whip delights.",
    hero_image: "https://YOUR-SUPABASE-STORAGE/resorts/polynesian/hero.webp",
    card_image: "https://YOUR-SUPABASE-STORAGE/resorts/polynesian/card.webp",
    chips: ["Island Nights", "Monorail", "Overwater Bungalows"],
    tags: ["Tropical", "Overwater", "Monorail"],
    points_range: "24–50 pts/night",
    facts: [
      { title: "Sleeps", value: "5 Guests" },
      { title: "Room Size", value: "465 sq.ft" },
      { title: "Views", value: "Lagoon • Theme Park" },
    ],
    layout: {
      title: "Deluxe Studio",
      bullets: [
        "1 Queen Bed + 1 Pull-Down Queen + 1 Pull-Down Twin",
        "Split bathroom with rainfall shower",
        "Kitchenette with tiki flair",
        "Private patio or balcony",
      ],
      notes: "Studios sleep 5 with space to spread out; bungalows sleep 8 with private plunge pools.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/polynesian/layout.webp",
    },
    photos: [
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/polynesian/bungalow.webp",
        caption: "Sunset over the overwater bungalows",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/polynesian/pool.webp",
        caption: "Lava Pool with volcano slide",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/polynesian/villa.webp",
        caption: "Studio interior with tropical accents",
      },
    ],
    essentials: {
      transportation: "Monorail to Magic Kingdom and EPCOT plus water launch service.",
      amenities: ["Lava Pool", "Oasis Pool", "Kiki Tiki’s splash play"],
      dining: ["‘Ohana", "Trader Sam’s", "Pineapple Lanai"],
    },
    map: {
      headline: "Lagoon-side paradise",
      description: "Positioned along Seven Seas Lagoon with views of Cinderella Castle and direct monorail access.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/polynesian/map.webp",
    },
    nearby: [
      { name: "Bay Lake Tower", slug: "bay-lake-tower", tagline: "Fireworks from your balcony." },
      { name: "Grand Floridian Villas", slug: "grand-floridian-villas", tagline: "Victorian elegance moments away." },
    ],
  },
  {
    slug: "riviera-resort",
    name: "Disney’s Riviera Resort",
    location: "Epcot & Hollywood Studios",
    tagline: "European sophistication with Skyliner sunsets and cappuccino mornings.",
    hero_image: "https://YOUR-SUPABASE-STORAGE/resorts/riviera/hero.webp",
    card_image: "https://YOUR-SUPABASE-STORAGE/resorts/riviera/card.webp",
    chips: ["European Art", "Skyliner", "Topolino’s Terrace"],
    tags: ["Skyliner", "European", "Topolino’s"],
    points_range: "20–38 pts/night",
    facts: [
      { title: "Sleeps", value: "5 Guests" },
      { title: "Room Size", value: "423 sq.ft" },
      { title: "Views", value: "Skyliner • Courtyard" },
    ],
    layout: {
      title: "Preferred View Studio",
      bullets: [
        "Queen bed + pull-down queen + pull-down single",
        "Marble bathroom with rainfall shower",
        "Kitchenette with European finishes",
        "Juliet balcony or full terrace",
      ],
      notes: "Tower Studios sleep two with sweeping Riviera views — perfect for couples.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/riviera/layout.webp",
    },
    photos: [
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/riviera/pool.webp",
        caption: "Riviera main pool with Skyliner backdrop",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/riviera/lobby.webp",
        caption: "Lobby mosaics inspired by European masters",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/riviera/terrace.webp",
        caption: "Topolino’s Terrace at dawn",
      },
    ],
    essentials: {
      transportation: "Disney Skyliner to EPCOT and Hollywood Studios; bus service to other parks.",
      amenities: ["S’il Vous Play splash area", "Beau Soleil leisure pool", "Voyageurs’ Lounge"],
      dining: ["Topolino’s Terrace", "Primo Piatto", "Le Petit Café"],
    },
    map: {
      headline: "Skyliner Junction",
      description: "Adjacent to the Skyliner hub with connections to EPCOT, Hollywood Studios, and surrounding resorts.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/riviera/map.webp",
    },
    nearby: [
      { name: "Beach Club Villas", slug: "beach-club-villas", tagline: "Walk to EPCOT’s International Gateway." },
      { name: "BoardWalk Villas", slug: "boardwalk-villas", tagline: "Nightlife along Crescent Lake." },
    ],
  },
  {
    slug: "boulder-ridge-villas",
    name: "Boulder Ridge Villas",
    location: "Disney’s Wilderness Lodge",
    tagline: "Pacific Northwest craftsmanship with rustic villas and nature trails.",
    hero_image: "https://YOUR-SUPABASE-STORAGE/resorts/boulder-ridge/hero.webp",
    card_image: "https://YOUR-SUPABASE-STORAGE/resorts/boulder-ridge/card.webp",
    chips: ["Rustic Retreat", "Water Launch", "Campfires"],
    tags: ["Woodland", "Boat to Magic Kingdom", "Rustic"],
    points_range: "16–28 pts/night",
    facts: [
      { title: "Sleeps", value: "4 Guests" },
      { title: "Room Size", value: "356 sq.ft" },
      { title: "Views", value: "Woods • Courtyard" },
    ],
    layout: {
      title: "Deluxe Studio",
      bullets: [
        "Queen bed + queen-size sleeper sofa",
        "Kitchenette with log-cabin accents",
        "Private balcony or patio",
        "Access to Copper Creek’s Geyser Point" ,
      ],
      notes: "The villas connect to Wilderness Lodge’s amenities via covered walkways.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/boulder-ridge/layout.webp",
    },
    photos: [
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/boulder-ridge/lobby.webp",
        caption: "Railroad-inspired lobby",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/boulder-ridge/pool.webp",
        caption: "Hidden Springs Pool",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/boulder-ridge/villa.webp",
        caption: "Studio interior with rustic touches",
      },
    ],
    essentials: {
      transportation: "Water launch to Magic Kingdom and boat service to the monorail loop; bus transportation to other parks.",
      amenities: ["Hidden Springs Pool", "Bike rentals", "Storytelling by the fire"],
      dining: ["Geyser Point Bar & Grill", "Whispering Canyon Cafe", "Roaring Fork"],
    },
    map: {
      headline: "Wilderness escape",
      description: "Nestled alongside Bay Lake with walking paths to Copper Creek and nature trails.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/boulder-ridge/map.webp",
    },
    nearby: [
      { name: "Copper Creek Villas & Cabins", slug: "copper-creek-villas", tagline: "Modern rustic villas with private cabins." },
      { name: "Bay Lake Tower", slug: "bay-lake-tower", tagline: "Skyline views across Bay Lake." },
    ],
  },
  {
    slug: "copper-creek-villas",
    name: "Copper Creek Villas & Cabins",
    location: "Disney’s Wilderness Lodge",
    tagline: "Modern rustic villas and waterfront cabins with private hot tubs.",
    hero_image: "https://YOUR-SUPABASE-STORAGE/resorts/copper-creek/hero.webp",
    card_image: "https://YOUR-SUPABASE-STORAGE/resorts/copper-creek/card.webp",
    chips: ["Waterfront Cabins", "Geyser Point", "Stone Hearth"],
    tags: ["Cabins", "Hot Springs", "Modern Rustic"],
    points_range: "20–36 pts/night",
    facts: [
      { title: "Sleeps", value: "4 Guests" },
      { title: "Room Size", value: "338 sq.ft" },
      { title: "Views", value: "Pine Forest • Waterway" },
    ],
    layout: {
      title: "Studio Villa",
      bullets: [
        "Queen bed + queen-size sleeper sofa",
        "Compact kitchen with stone backsplash",
        "Walk-in rain shower",
        "Balcony overlooking the pines",
      ],
      notes: "Cascade Cabins sleep 8 with screened-in porches and private hot tubs overlooking Bay Lake.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/copper-creek/layout.webp",
    },
    photos: [
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/copper-creek/cabin.webp",
        caption: "Cascade Cabin with private spa",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/copper-creek/pool.webp",
        caption: "Copper Creek Springs Pool",
      },
      {
        src: "https://YOUR-SUPABASE-STORAGE/resorts/copper-creek/lobby.webp",
        caption: "Lobby fireplace and stone accents",
      },
    ],
    essentials: {
      transportation: "Water launch to Magic Kingdom, bus service to parks, and walking trails through Wilderness Lodge.",
      amenities: ["Copper Creek Springs Pool", "Sturdy Branches fitness", "Fishing excursions"],
      dining: ["Story Book Dining at Artist Point", "Geyser Point Bar & Grill", "Roaring Fork"],
    },
    map: {
      headline: "Lakeside serenity",
      description: "Cabins line the Bay Lake shoreline with easy access to Geyser Point and Wilderness Lodge amenities.",
      image: "https://YOUR-SUPABASE-STORAGE/resorts/copper-creek/map.webp",
    },
    nearby: [
      { name: "Boulder Ridge Villas", slug: "boulder-ridge-villas", tagline: "Railroad charm and rustic ambiance." },
      { name: "Bay Lake Tower", slug: "bay-lake-tower", tagline: "Monorail skyline in minutes via water taxi." },
    ],
  },
];

const CALC_CODE_BY_SLUG = {
  'animal-kingdom-villas': 'AKV',
  'aulani': 'AUL',
  'bay-lake-tower': 'BLT',
  'beach-club-villas': 'BCV',
  'boardwalk-villas': 'BWV',
  'boulder-ridge-villas': 'BRV',
  'hilton-head-island': 'HHI',
  'old-key-west': 'OKW',
  'polynesian-villas': 'PVB',
  'riviera-resort': 'RVA',
  'saratoga-springs': 'SSR',
  'vero-beach': 'VB',
  'copper-creek-villas': 'CCV',
  'disneyland-hotel-villas': 'VDH',
  'grand-californian-villas': 'VGC',
  'grand-floridian-villas': 'VGF',
};

const resorts = baseResorts.map((resort) => ({
  ...resort,
  calculator_code: CALC_CODE_BY_SLUG[resort.slug] ?? null,
}));

async function seed() {
  console.log(`Upserting ${resorts.length} resorts...`);
  const { data, error } = await supabase.from("resorts").upsert(resorts, { onConflict: "slug" }).select("slug");
  if (error) {
    console.error("Failed to upsert resorts", error);
    process.exit(1);
  }
  console.log(`Upsert complete. ${data?.length ?? 0} rows affected.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
