import Link from 'next/link';

import { requireAdminUser } from '@/lib/admin';

export const dynamic = 'force-dynamic';

type ImageItem = {
  title: string;
  url: string;
};

type ImageSection = {
  title: string;
  description: string;
  items: ImageItem[];
};

const STORAGE_BASE = 'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public';

const SECTIONS: ImageSection[] = [
  {
    title: 'Guides / Platform',
    description: 'Guide illustrations, icons, social proof, owners, affiliates, and enhancement assets.',
    items: [
      { title: 'Jambo Value Studio', url: `${STORAGE_BASE}/guides/JamboValueSTudio.png` },
      { title: 'DVC Points Calculator', url: `${STORAGE_BASE}/guides/how-to-use-dvc-points-calculator.png` },
      { title: 'How DVC Rentals Work', url: `${STORAGE_BASE}/guides/howdvcrentalswork.png` },
      { title: 'Guest Icon', url: `${STORAGE_BASE}/icons/Guest%20Icon.png` },
      { title: 'Owner Icon', url: `${STORAGE_BASE}/icons/OwnerIcon.png` },
      { title: 'Riviera Family', url: `${STORAGE_BASE}/pixiedvc-social-proof/placeholders/families/rivera-family-at-riviera.png` },
      { title: 'Elena and Marco', url: `${STORAGE_BASE}/pixiedvc-social-proof/placeholders/couples/elena-and-marco-bay-lake.png` },
      { title: 'Oliveira Family', url: `${STORAGE_BASE}/pixiedvc-social-proof/placeholders/families/oliveira-family.png` },
      { title: 'Social Proof Screenshot', url: `${STORAGE_BASE}/pixiedvc-social-proof/platform-images/Screenshot%202026-01-01%20at%2012.34.06%20AM.png` },
      { title: 'Pixie Matching', url: `${STORAGE_BASE}/main%20page%20ready-stay/PixieMatching.png` },
      { title: 'Ready Stay', url: `${STORAGE_BASE}/main%20page%20ready-stay/ready-stay.png` },
      { title: 'Owners Image 1', url: `${STORAGE_BASE}/Owners-images/c6860da3-95d5-4e4c-ac16-7af0bab3a097-1.png` },
      { title: 'Owner Dashboard Earnings', url: `${STORAGE_BASE}/Owners-images/earnings%20owner%20daashboard.png` },
      { title: 'Affiliate Dashboard', url: `${STORAGE_BASE}/Affiliate%20%20pages%20images/PixieDvc%20Affiliate%20Dashboard.png` },
      { title: 'Vacation Grocery Delivery', url: `${STORAGE_BASE}/Enhance%20your%20stay/Vacation%20Grocery%20Delivery.png` },
      { title: 'Vacation Grocery Delivery Logo', url: `${STORAGE_BASE}/Enhance%20your%20stay/VacationGroceryDeliverylogo.png` },
      { title: 'Concierge', url: `${STORAGE_BASE}/Enhance%20your%20stay/concierge.png` },
      { title: 'Dining Plan', url: `${STORAGE_BASE}/Enhance%20your%20stay/dining-plan.png` },
      { title: 'Grocery Delivery', url: `${STORAGE_BASE}/Enhance%20your%20stay/grocery%20delivery.png` },
      { title: 'Resort Guide', url: `${STORAGE_BASE}/Enhance%20your%20stay/resort-guide.png` },
      { title: 'Disney Tickets', url: `${STORAGE_BASE}/Enhance%20your%20stay/Disney%20tickets.png` },
    ],
  },
  {
    title: 'Resort / Showcase',
    description: 'Explicit resort hero and showcase images currently referenced by the platform.',
    items: [
      { title: 'Bay Lake Tower', url: `${STORAGE_BASE}/resorts/bay-lake-tower/BTC1.png` },
      { title: 'Aulani', url: `${STORAGE_BASE}/resorts/Aulani/Aul1.png` },
      { title: 'Grand Floridian Villas', url: `${STORAGE_BASE}/resorts/grand-floridian-villas/GFV1.png` },
      { title: 'Vero Beach', url: `${STORAGE_BASE}/resorts/vero-beach/VBR1.png` },
      { title: 'Riviera RR4', url: `${STORAGE_BASE}/resorts/Riviera/RR4.png` },
      { title: 'Boardwalk', url: `${STORAGE_BASE}/resorts/Boardwalk/BDW1.png` },
      { title: 'Copper Creek Villas and Cabins', url: `${STORAGE_BASE}/resorts/Copper-creek-villas-and-cabins/CCV1.png` },
      { title: 'Hilton Head', url: `${STORAGE_BASE}/resorts/Hilton-head/HH1.png` },
      { title: 'Kidani', url: `${STORAGE_BASE}/resorts/Kidani/AKV1.png` },
      { title: 'Polynesian Villas and Bungalows', url: `${STORAGE_BASE}/resorts/Polynesian-villas-and-bungalows/PVB1.png` },
      { title: 'Riviera RR1', url: `${STORAGE_BASE}/resorts/Riviera/RR1.png` },
      { title: 'Animal Kingdom Lodge', url: `${STORAGE_BASE}/resorts/animal-kingdom-lodge/AKL1.png` },
      { title: 'Beach Club Villa', url: `${STORAGE_BASE}/resorts/beach-club-villa/BCV1.png` },
      { title: 'Boulder Ridge Villas', url: `${STORAGE_BASE}/resorts/boulder-ridge-villas/BRV1.png` },
      { title: 'Grand Californian', url: `${STORAGE_BASE}/resorts/grand-californian/VGC1.png` },
      { title: 'Old Key West', url: `${STORAGE_BASE}/resorts/old-key-west/OKW1.png` },
      { title: 'Saratoga Springs Resort', url: `${STORAGE_BASE}/resorts/saratoga-springs-resort/SSR1.png` },
      { title: 'Villas at Disneyland Hotel', url: `${STORAGE_BASE}/resorts/villas-at-disneyland-hotel/VDH1.png` },
    ],
  },
  {
    title: 'Resort Section / Info',
    description: 'The five-section resort imagery used below the carousel on supported resort pages.',
    items: [
      { title: 'Bay Lake About', url: `${STORAGE_BASE}/Resort%20Info/Bay%20Lake/BayLakeAbout.png` },
      { title: 'Bay Lake Good to Know', url: `${STORAGE_BASE}/Resort%20Info/Bay%20Lake/BayLakeKnow.png` },
      { title: 'Bay Lake Dining', url: `${STORAGE_BASE}/Resort%20Info/Bay%20Lake/BayLakeDining.png` },
      { title: 'Bay Lake Getting Around', url: `${STORAGE_BASE}/Resort%20Info/Bay%20Lake/BayLakeAround.png` },
      { title: 'Bay Lake Nearby', url: `${STORAGE_BASE}/Resort%20Info/Bay%20Lake/BayLakeNearby.png` },
      { title: 'Boardwalk About', url: `${STORAGE_BASE}/Resort%20Info/Boardwalk/BoardwalkAbout.png` },
      { title: 'Boardwalk Good to Know', url: `${STORAGE_BASE}/Resort%20Info/Boardwalk/BoardwalkKnow.png` },
      { title: 'Boardwalk Dining', url: `${STORAGE_BASE}/Resort%20Info/Boardwalk/BoardwalkDining.png` },
      { title: 'Boardwalk Getting Around', url: `${STORAGE_BASE}/Resort%20Info/Boardwalk/Boardwalk%20Around.png` },
      { title: 'Boardwalk Nearby', url: `${STORAGE_BASE}/Resort%20Info/Boardwalk/BoardwalkNearby.png` },
      { title: 'Aulani About', url: `${STORAGE_BASE}/Resort%20Info/Aulani/AulaniAbout.png` },
      { title: 'Aulani Good to Know', url: `${STORAGE_BASE}/Resort%20Info/Aulani/AulaniKnow.png` },
      { title: 'Aulani Dining', url: `${STORAGE_BASE}/Resort%20Info/Aulani/AulaniDining.png` },
      { title: 'Aulani Getting Around', url: `${STORAGE_BASE}/Resort%20Info/Aulani/AulaniAround.png` },
      { title: 'Aulani Nearby', url: `${STORAGE_BASE}/Resort%20Info/Aulani/AulaniNearby.png` },
      { title: 'Animal Kingdom About', url: `${STORAGE_BASE}/Resort%20Info/Animal%20Kingdom/about.png` },
      { title: 'Animal Kingdom Good to Know', url: `${STORAGE_BASE}/Resort%20Info/Animal%20Kingdom/animal%20kingdom%20good%20to%20know.png` },
      { title: 'Animal Kingdom Dining', url: `${STORAGE_BASE}/Resort%20Info/Animal%20Kingdom/dining.png` },
      { title: 'Animal Kingdom Getting Around', url: `${STORAGE_BASE}/Resort%20Info/Animal%20Kingdom/getting%20around.png` },
      { title: 'Animal Kingdom Nearby', url: `${STORAGE_BASE}/Resort%20Info/Animal%20Kingdom/nearby.png` },
      { title: 'Riviera About', url: `${STORAGE_BASE}/Resort%20Info/Riviera/riviera%20about%20this%20resort.png` },
      { title: 'Riviera Good to Know', url: `${STORAGE_BASE}/Resort%20Info/Riviera/good%20to%20know.png` },
      { title: 'Riviera Dining', url: `${STORAGE_BASE}/Resort%20Info/Riviera/dining.png` },
      { title: 'Riviera Getting Around', url: `${STORAGE_BASE}/Resort%20Info/Riviera/getting%20around.png` },
      { title: 'Riviera Nearby Amenities', url: `${STORAGE_BASE}/Resort%20Info/Riviera/amenities%20nearby%20.png` },
      { title: 'Polynesian About', url: `${STORAGE_BASE}/Resort%20Info/Polynesian/about.png` },
      { title: 'Polynesian Good to Know', url: `${STORAGE_BASE}/Resort%20Info/Polynesian/good%20to%20know.png` },
      { title: 'Polynesian Dining', url: `${STORAGE_BASE}/Resort%20Info/Polynesian/dining.png` },
      { title: 'Polynesian Getting Around', url: `${STORAGE_BASE}/Resort%20Info/Polynesian/getting%20around.png` },
      { title: 'Polynesian Nearby', url: `${STORAGE_BASE}/Resort%20Info/Polynesian/nearby.png` },
      { title: 'Grand Floridian About', url: `${STORAGE_BASE}/Resort%20Info/grand%20floridian/about.png` },
      { title: 'Grand Floridian Good to Know', url: `${STORAGE_BASE}/Resort%20Info/grand%20floridian/good%20to%20know.png` },
      { title: 'Grand Floridian Dining', url: `${STORAGE_BASE}/Resort%20Info/grand%20floridian/dining.png` },
      { title: 'Grand Floridian Getting Around', url: `${STORAGE_BASE}/Resort%20Info/grand%20floridian/getting%20around.png` },
      { title: 'Grand Floridian Nearby', url: `${STORAGE_BASE}/Resort%20Info/grand%20floridian/nearby.png` },
      { title: 'Saratoga About', url: `${STORAGE_BASE}/Resort%20Info/Saratoga/about.png` },
      { title: 'Saratoga Good to Know', url: `${STORAGE_BASE}/Resort%20Info/Saratoga/good%20to%20know.png` },
      { title: 'Saratoga Dining', url: `${STORAGE_BASE}/Resort%20Info/Saratoga/dining.png` },
      { title: 'Saratoga Getting Around', url: `${STORAGE_BASE}/Resort%20Info/Saratoga/getting%20around.png` },
      { title: 'Saratoga Nearby', url: `${STORAGE_BASE}/Resort%20Info/Saratoga/nearby.png` },
      { title: 'Old Key West About', url: `${STORAGE_BASE}/Resort%20Info/old%20key/about.png` },
      { title: 'Old Key West Good to Know', url: `${STORAGE_BASE}/Resort%20Info/old%20key/good%20to%20know.png` },
      { title: 'Old Key West Dining', url: `${STORAGE_BASE}/Resort%20Info/old%20key/old%20key%20dinning%20.png` },
      { title: 'Old Key West Getting Around', url: `${STORAGE_BASE}/Resort%20Info/old%20key/getting%20around.png` },
      { title: 'Old Key West Nearby Activities', url: `${STORAGE_BASE}/Resort%20Info/old%20key/old%20key%20nearby%20actviites%20.png` },
    ],
  },
  {
    title: 'Guide Image Set',
    description: 'Additional explicit guide page imagery referenced by Bay Lake guide content.',
    items: [
      { title: 'Bay Lake Dusk Shot', url: `${STORAGE_BASE}/Guides/Bay%20Lake/BayLake_dusk_shot` },
      { title: 'Magic Kingdom Proximity', url: `${STORAGE_BASE}/Guides/Bay%20Lake/magicKingdonproximity.png` },
      { title: 'Transit Diagram', url: `${STORAGE_BASE}/Guides/Bay%20Lake/transitdiagram.png` },
      { title: 'Contemporary Dining', url: `${STORAGE_BASE}/Guides/Bay%20Lake/ContemporaryDining.png` },
      { title: 'Walkway', url: `${STORAGE_BASE}/Guides/Bay%20Lake/walkway.png` },
      { title: 'Room View', url: `${STORAGE_BASE}/Guides/Bay%20Lake/roomview.png` },
    ],
  },
];

const DYNAMIC_PATTERNS = [
  `${STORAGE_BASE}/resorts/<folder>/<prefix><n>.png`,
  `${STORAGE_BASE}/<bucket>/<path>`,
  `${STORAGE_BASE}/<bucket>/<path>`,
];

function ImageCard({ item }: { item: ImageItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] shadow-sm">
      <div className="aspect-[4/3] bg-[#212121]">
        <img src={item.url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-sm font-semibold text-[#ececec]">{item.title}</h3>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="block break-all text-xs text-[#8e8ea0] transition hover:text-[#10a37f]"
        >
          {item.url}
        </a>
      </div>
    </article>
  );
}

export default async function AdminImageGalleryPage() {
  await requireAdminUser('/admin/image-gallery');

  const totalImages = SECTIONS.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <div className="min-h-screen bg-[#212121] text-[#ececec]">
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
          <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
            Image Gallery
          </h1>
          <p className="max-w-3xl text-[#b4b4b4]">
            Internal gallery for the explicit image URLs currently referenced across guides, resorts, owner pages, and
            support surfaces.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#8e8ea0]">
            <span>{totalImages} explicit images</span>
            <Link href="/admin" className="font-semibold text-[#10a37f] hover:text-[#0d8c6d]">
              Back to Control Center →
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] p-6">
          <h2 className="text-lg font-semibold text-[#ececec]">Dynamic URL patterns in use</h2>
          <p className="mt-2 text-sm text-[#b4b4b4]">
            These are generated patterns, not individual images, so they are listed here for reference instead of being
            rendered as tiles.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#8e8ea0]">
            {DYNAMIC_PATTERNS.map((pattern) => (
              <li key={pattern} className="break-all rounded-xl border border-[#3a3a3a] bg-[#212121] px-4 py-3">
                {pattern}
              </li>
            ))}
          </ul>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.title} className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[#ececec]">{section.title}</h2>
              <p className="max-w-3xl text-sm text-[#b4b4b4]">{section.description}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => (
                <ImageCard key={item.url} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
