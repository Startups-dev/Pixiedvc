export type Story = {
  id: string;
  resortLabel: string;
  title: string;
  quote: string;
  imageUrl: string;
  imageAlt: string;
  proofLine: string;
};

export const STORIES: Story[] = [
  {
    id: "rivera-family",
    resortLabel: "Disney’s Riviera Resort",
    title: "The Thompson Family",
    quote:
      "We loved the relaxed pace and pool mornings. PixieDVC made every detail feel easy.",
    imageUrl:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/pixiedvc-social-proof/placeholders/families/rivera-family-at-riviera.png",
    imageAlt: "The Thompson family enjoying a Riviera resort stay.",
    proofLine: "Thompson M.",
  },
  {
    id: "elena-marco-bay-lake",
    resortLabel: "Bay Lake Tower",
    title: "Elena & Marco",
    quote:
      "We wanted monorail mornings and quiet evenings. PixieDVC dialed it in and handled every detail.",
    imageUrl:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/pixiedvc-social-proof/placeholders/couples/elena-and-marco-bay-lake.png",
    imageAlt: "Elena and Marco at Bay Lake Tower.",
    proofLine: "Elena R.",
  },
  {
    id: "nakamura-family",
    resortLabel: "Disney's BoardWalk Villas",
    title: "The Oliveira Family",
    quote:
      "It was our first Disney trip and it was amazing, the resorts were top quality.",
    imageUrl:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/pixiedvc-social-proof/placeholders/families/oliveira-family.png",
    imageAlt: "The Oliveira family enjoying a PixieDVC stay.",
    proofLine: "V. Oliveira",
  },
];
