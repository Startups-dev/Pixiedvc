export type ResortSectionId =
  | "overview"
  | "highlights"
  | "room_types"
  | "points"
  | "transportation"
  | "dining"
  | "recreation"
  | "amenities"
  | "map"
  | "policies";

export type ResortHighlightIcon =
  | "castle"
  | "train"
  | "waves"
  | "cable"
  | "sparkles"
  | "palmtree"
  | "anchor"
  | "flame"
  | "coffee"
  | "palette";

type BaseSection = {
  id: ResortSectionId;
  title: string;
};

export type ResortOverviewSection = BaseSection & {
  type: "overview";
  body: string;
};

export type ResortHighlightsSection = BaseSection & {
  type: "highlights";
  items: Array<{ icon: ResortHighlightIcon; label: string; note: string }>;
};

export type ResortTransportationSection = BaseSection & {
  type: "transportation";
  items: Array<{ title: string; note: string }>;
};

export type ResortDiningSection = BaseSection & {
  type: "dining";
  items: Array<{ title: string; note?: string }>;
};

export type ResortAmenitiesSection = BaseSection & {
  type: "amenities";
  items: string[];
};

export type ResortPoliciesSection = BaseSection & {
  type: "policies";
  items: Array<{ label: string; value: string }>;
};

export type ResortPlaceholderSection = BaseSection & {
  type: "points" | "room_types" | "map" | "recreation";
  description: string;
};

export type ResortInfoSection =
  | ResortOverviewSection
  | ResortHighlightsSection
  | ResortTransportationSection
  | ResortDiningSection
  | ResortAmenitiesSection
  | ResortPoliciesSection
  | ResortPlaceholderSection;

const DEFAULT_HIGHLIGHTS = ["Signature location", "Concierge favorite", "Family friendly"];
const ABOUT_THIS_RESORT_COPY: Record<string, string> = {
  "animal-kingdom-villas":
    "Disney's Animal Kingdom Villas blends Disney service with immersive savanna views, ideal for guests seeking wildlife atmosphere, unique theming, and a resort-first pace.",
  "animal-kingdom-kidani":
    "Kidani Village blends Disney service with spacious villa layouts and savanna surroundings, ideal for families who want extra room, quieter evenings, and a relaxed rhythm.",
  aulani:
    "Aulani blends Disney service with a beachfront Hawaiian resort experience, ideal for guests seeking relaxation, space, and a slower pace.",
  "bay-lake-tower":
    "Bay Lake Tower blends Disney service with skyline views and easy Magic Kingdom access, ideal for guests who prioritize convenience and park proximity.",
  "beach-club-villas":
    "Beach Club Villas blends Disney service with walkable EPCOT access and resort-style pool amenities, ideal for guests balancing park days with downtime.",
  "boardwalk-villas":
    "BoardWalk Villas blends Disney service with waterfront energy and walkable EPCOT-area access, ideal for guests who enjoy lively evenings and central location.",
  "boulder-ridge-villas":
    "Boulder Ridge Villas blends Disney service with a lodge-style retreat atmosphere, ideal for guests seeking calm surroundings and convenient Magic Kingdom boat access.",
  "copper-creek-villas":
    "Copper Creek blends Disney service with modern villa comfort in a wilderness setting, ideal for guests wanting premium finishes and easy Magic Kingdom access.",
  "disneyland-hotel-villas":
    "The Villas at Disneyland Hotel blends Disney service with modern design and unbeatable walkability, ideal for guests focused on fast, flexible Disneyland days.",
  "fort-wilderness-cabins":
    "The Cabins at Fort Wilderness blends Disney service with private cabin-style accommodations, ideal for guests seeking extra space, nature, and a calmer stay experience.",
  "grand-californian-villas":
    "Grand Californian Villas blends Disney service with craftsman-style luxury and direct park convenience, ideal for guests prioritizing proximity and elevated resort comfort.",
  "grand-floridian-villas":
    "Grand Floridian Villas blends Disney service with flagship-level elegance, ideal for guests seeking refined accommodations and effortless Magic Kingdom access.",
  "hilton-head-island":
    "Disney's Hilton Head Island Resort blends Disney service with coastal Lowcountry charm, ideal for guests seeking beach time, nature, and a non-park vacation pace.",
  "old-key-west":
    "Old Key West blends Disney service with spacious layouts and laid-back Florida charm, ideal for guests who value comfort, flexibility, and longer stays.",
  "polynesian-villas":
    "Polynesian Villas blends Disney service with island-inspired atmosphere and top-tier transportation access, ideal for guests seeking iconic style and easy Magic Kingdom days.",
  "riviera-resort":
    "Riviera Resort blends Disney service with modern European-inspired design, ideal for guests seeking upscale villas, Skyliner convenience, and a polished resort feel.",
  "saratoga-springs":
    "Saratoga Springs blends Disney service with expansive grounds and Disney Springs access, ideal for guests who want space, flexibility, and relaxed resort living.",
  "vero-beach":
    "Disney's Vero Beach Resort blends Disney service with oceanfront relaxation, ideal for guests seeking a quiet coastal getaway away from theme park crowds.",
};

function defaultSections(slug: string, name: string): ResortInfoSection[] {
  const displayName = name.replace(/\b\w/g, (char) => char.toUpperCase());
  const aboutCopy =
    ABOUT_THIS_RESORT_COPY[slug] ??
    `${displayName} blends Disney service with a resort-specific stay experience, ideal for guests seeking comfort, space, and a smoother booking path.`;
  return [
    {
      id: "overview",
      type: "overview",
      title: "About This Resort",
      body: aboutCopy,
    },
    {
      id: "amenities",
      type: "amenities",
      title: "Amenities",
      items: [
        "Concierge planning for arrivals and special requests",
        "Mobile-friendly itinerary updates",
        "Support for multi-room and multi-resort stays",
      ],
    },
    {
      id: "policies",
      type: "policies",
      title: "Policies",
      items: [
        { label: "Deposit", value: "Required once we confirm availability." },
        { label: "Cancellation", value: "Flexible until final reservation is issued." },
        { label: "Guest names", value: "Final guest list required before booking." },
        { label: "Payment", value: "Invoice sent after match confirmation." },
      ],
    },
  ];
}

function buildFallbackHighlights(location?: string | null) {
  if (!location) {
    return DEFAULT_HIGHLIGHTS;
  }

  const trimmed = location.replace(/resort area/i, "").trim();
  const locationLabel = trimmed ? `${trimmed} highlight` : "Signature location";

  return [locationLabel, "Concierge favorite", "Family friendly"];
}

export function getResortSections(slug: string): ResortInfoSection[] {
  if (slug === "bay-lake-tower") {
    return [
      {
        id: "overview",
        type: "overview",
        title: "About This Resort",
        body:
          "Bay Lake Tower blends Disney service with skyline views and easy Magic Kingdom access, ideal for guests who want convenience, comfort, and a streamlined stay.",
      },
      {
        id: "highlights",
        type: "highlights",
        title: "Highlights",
        items: [
          { icon: "castle", label: "Magic Kingdom area", note: "Walk or take the monorail in minutes." },
          { icon: "train", label: "Monorail access", note: "Connected to the Contemporary Resort hub." },
          { icon: "waves", label: "Lakeside pool", note: "Relaxed Bay Lake views with sunset vibes." },
        ],
      },
      {
        id: "transportation",
        type: "transportation",
        title: "Transportation",
        items: [
          { title: "Monorail", note: "Direct service to Magic Kingdom and EPCOT." },
          { title: "Boat", note: "Water launches to Wilderness Lodge and Fort Wilderness." },
          { title: "Bus", note: "Dedicated buses for other parks and Disney Springs." },
        ],
      },
      {
        id: "dining",
        type: "dining",
        title: "Dining",
        items: [
          { title: "California Grill", note: "Signature dining with fireworks views." },
          { title: "Steakhouse 71", note: "Modern steakhouse classics." },
          { title: "Contempo Café", note: "Grab-and-go with monorail views." },
          { title: "The Wave Lounge", note: "Cocktails and bites in the Contemporary." },
        ],
      },
      {
        id: "amenities",
        type: "amenities",
        title: "Amenities",
        items: [
          "Bay Cove Pool with poolside service",
          "Fitness center and spa access",
          "Lakefront walking paths",
          "Community hall and crafts",
          "Laundry on every floor",
          "In-room kitchenettes",
          "Bell services and luggage assistance",
        ],
      },
      {
        id: "policies",
        type: "policies",
        title: "Policies",
        items: [
          { label: "Deposit", value: "Collected once availability is confirmed." },
          { label: "Cancellation", value: "Flexible up to confirmation; fees may apply after booking." },
          { label: "Guest names", value: "Required before reservation confirmation." },
          { label: "Payment", value: "Invoice sent after match acceptance." },
          { label: "Insurance", value: "Optional travel protection available." },
        ],
      },
      {
        id: "room_types",
        type: "room_types",
        title: "Room types",
        description: "Room-type availability details are coming soon.",
      },
      {
        id: "points",
        type: "points",
        title: "Points charts",
        description: "Points charts are coming soon.",
      },
      {
        id: "map",
        type: "map",
        title: "Resort map",
        description: "Interactive map details are coming soon.",
      },
    ];
  }

  return defaultSections(slug, slug.replace(/-/g, " "));
}

export function getHighlightsForResort(options: {
  slug: string;
  location?: string | null;
  chips?: string[] | null;
  sections?: ResortInfoSection[];
}): string[] {
  const { slug, location, chips, sections } = options;
  const resolvedSections = sections ?? getResortSections(slug);
  const highlightSection = resolvedSections.find(
    (section): section is ResortHighlightsSection => section.type === "highlights",
  );

  const fromSection = highlightSection ? highlightSection.items.map((item) => item.label) : [];
  const fromChips = Array.isArray(chips) ? chips.filter(Boolean) : [];
  const fallback = buildFallbackHighlights(location);

  const combined = [...fromSection, ...fromChips, ...fallback].filter(
    (label, index, all) => all.findIndex((item) => item.toLowerCase() === label.toLowerCase()) === index,
  );

  return combined.slice(0, 3);
}
