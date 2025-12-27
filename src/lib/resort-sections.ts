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

function defaultSections(name: string): ResortInfoSection[] {
  return [
    {
      id: "overview",
      type: "overview",
      title: "Overview",
      body: `${name} blends PixieDVC concierge service with resort-specific planning. We will help align dates, room categories, and points for a smooth stay.`,
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
        title: "Overview",
        body:
          "Bay Lake Tower offers skyline views and effortless access to Magic Kingdom. PixieDVC pairs you with owners who can secure park-facing studios, lake views, and premium weekend availability.",
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

  return defaultSections(slug.replace(/-/g, " "));
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
