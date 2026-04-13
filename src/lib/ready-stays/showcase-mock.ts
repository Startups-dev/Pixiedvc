export type ReadyStayShowcaseItem = {
  id: string;
  resortSlug: string;
  resortName: string;
  title: string;
  startDate: string;
  endDate: string;
  nights: number;
  sleeps: number;
  totalPriceUsd: number;
  originalTotalPriceUsd?: number;
  imageUrl: string;
  badge: string;
  ctaLabel: string;
  href: string;
  featured: boolean;
  priority: number;
  priceReducedAt?: string;
};

export { READY_STAYS_SHOWCASE_FLAGS } from "@/lib/ready-stays/showcase-config";

const READY_STAYS_SHOWCASE_MOCK: ReadyStayShowcaseItem[] = [
  {
    id: "showcase-riviera-1",
    resortSlug: "riviera-resort",
    resortName: "Disney's Riviera Resort",
    title: "Riviera Resort - 5 Nights",
    startDate: "2026-04-12",
    endDate: "2026-04-17",
    nights: 5,
    sleeps: 4,
    totalPriceUsd: 2980,
    imageUrl:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Riviera/riviera%20about%20this%20resort.png",
    badge: "Ready to Book",
    ctaLabel: "View Stay",
    href: "/ready-stays/showcase-riviera-1",
    featured: true,
    priority: 100,
  },
  {
    id: "showcase-bay-lake-1",
    resortSlug: "bay-lake-tower",
    resortName: "Bay Lake Tower",
    title: "Bay Lake Tower - 4 Nights",
    startDate: "2026-05-08",
    endDate: "2026-05-12",
    nights: 4,
    sleeps: 5,
    totalPriceUsd: 2440,
    imageUrl:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Bay%20Lake/BayLakeAbout.png",
    badge: "Ready to Book",
    ctaLabel: "Book Instantly",
    href: "/ready-stays/showcase-bay-lake-1",
    featured: true,
    priority: 95,
  },
  {
    id: "showcase-grand-floridian-1",
    resortSlug: "grand-floridian-villas",
    resortName: "Grand Floridian Villas",
    title: "Grand Floridian - 3 Nights",
    startDate: "2026-06-02",
    endDate: "2026-06-05",
    nights: 3,
    sleeps: 4,
    totalPriceUsd: 2190,
    imageUrl:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/grand%20floridian/about.png",
    badge: "Ready to Book",
    ctaLabel: "View Stay",
    href: "/ready-stays/showcase-grand-floridian-1",
    featured: true,
    priority: 90,
  },
  {
    id: "showcase-polynesian-1",
    resortSlug: "polynesian-villas",
    resortName: "Polynesian Villas",
    title: "Polynesian Villas - 6 Nights",
    startDate: "2026-07-10",
    endDate: "2026-07-16",
    nights: 6,
    sleeps: 5,
    totalPriceUsd: 3320,
    imageUrl:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Polynesian/about.png",
    badge: "Ready to Book",
    ctaLabel: "View Stay",
    href: "/ready-stays/showcase-polynesian-1",
    featured: false,
    priority: 80,
  },
  {
    id: "showcase-akv-1",
    resortSlug: "animal-kingdom-villas",
    resortName: "Disney's Animal Kingdom Villas",
    title: "Animal Kingdom Villas - 4 Nights",
    startDate: "2026-08-18",
    endDate: "2026-08-22",
    nights: 4,
    sleeps: 4,
    totalPriceUsd: 2380,
    imageUrl:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Animal%20Kingdom/about.png",
    badge: "Ready to Book",
    ctaLabel: "Book Instantly",
    href: "/ready-stays/showcase-akv-1",
    featured: false,
    priority: 76,
  },
  {
    id: "showcase-saratoga-1",
    resortSlug: "saratoga-springs",
    resortName: "Saratoga Springs",
    title: "Saratoga Springs - 5 Nights",
    startDate: "2026-09-14",
    endDate: "2026-09-19",
    nights: 5,
    sleeps: 4,
    totalPriceUsd: 2120,
    imageUrl:
      "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Resort%20Info/Saratoga/about.png",
    badge: "Ready to Book",
    ctaLabel: "View Stay",
    href: "/ready-stays/showcase-saratoga-1",
    featured: false,
    priority: 70,
  },
];

function sortByPriority(items: ReadyStayShowcaseItem[]) {
  return [...items].sort((a, b) => b.priority - a.priority);
}

export function getReadyStaysShowcaseForHome(limit = 3) {
  return sortByPriority(READY_STAYS_SHOWCASE_MOCK).slice(0, limit);
}

export function getReadyStaysShowcaseForResort(resortSlug: string, limit = 3) {
  return sortByPriority(
    READY_STAYS_SHOWCASE_MOCK.filter((item) => item.resortSlug === resortSlug),
  ).slice(0, limit);
}

export function getReadyStaysShowcaseForSearch(limit = 3) {
  return sortByPriority(READY_STAYS_SHOWCASE_MOCK).slice(0, limit);
}
