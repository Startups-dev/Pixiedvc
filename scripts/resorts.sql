-- Create resorts table (if not already created)
create table if not exists public.resorts (
  slug text primary key,
  name text not null,
  location text,
  tagline text,
  hero_image text,
  card_image text,
  chips jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  points_range text,
  facts jsonb not null default '[]'::jsonb,
  layout jsonb,
  photos jsonb not null default '[]'::jsonb,
  essentials jsonb,
  map jsonb,
  nearby jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure updated_at auto-updates when rows change
create trigger resorts_updated_at
  before update on public.resorts
  for each row
  execute function public.set_current_timestamp_updated_at();

-- Seed resorts (update/append as needed). Feel free to tweak captions, notes, etc.
insert into public.resorts (
  slug,
  name,
  location,
  tagline,
  hero_image,
  card_image,
  chips,
  tags,
  points_range,
  facts,
  layout,
  photos,
  essentials,
  map,
  nearby
)
values
-- Bay Lake Tower -------------------------------------------------------------
(
  'bay-lake-tower',
  'Bay Lake Tower',
  'Lake Buena Vista, Florida',
  'Fireworks views & Monorail access near Cinderella''s Castle.',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/hero.webp',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/card.webp',
  '["Magic Kingdom Area","Monorail Access","Lakeside Pool"]',
  '["Monorail","Fireworks","Deluxe Studio"]',
  '18–32 pts/night',
  '[{"title":"Sleeps","value":"5 Guests"},{"title":"Room Size","value":"356 sq.ft"},{"title":"Views","value":"Lake • Pool • Park"}]',
  '{"title":"Deluxe Studio","bullets":["1 Queen Bed + 1 Pull-Down Queen Wall Bed","Full Bath + Kitchenette","Private balcony (select rooms)","Sleeps up to 5 Guests"],"notes":"5th-floor rooms may feature a sleeper sofa instead of a pull-down bed. Layouts can vary slightly by floor.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/layout.webp"}',
  '[{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/pool.webp","caption":"Bay Lake Tower Pool"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/lobby.webp","caption":"Lobby & Lounge"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/view.webp","caption":"Fireworks Balcony View"}]',
  '{"transportation":"Walk or take the monorail to Magic Kingdom in ~10 minutes.","amenities":["Feature Pool with waterslide","Fitness center","Marina & lakeside paths"],"dining":["California Grill","Steakhouse 71","Contempo Café"],"notices":["Exterior work may be visible during daytime hours (select dates)."]}',
  '{"headline":"Steps from Magic Kingdom","description":"Connected to Disney''s Contemporary Resort with monorail access and a private Bay Lake shoreline.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/map.webp"}',
  '[{"name":"Polynesian Villas & Bungalows","slug":"polynesian-villas","tagline":"Tropical escapes on the monorail."},{"name":"Grand Floridian Villas","slug":"grand-floridian-villas","tagline":"Victorian elegance with Seven Seas Lagoon views."}]'
),
-- Grand Floridian Villas -----------------------------------------------------
(
  'grand-floridian-villas',
  'Grand Floridian Villas',
  'Seven Seas Lagoon',
  'Victorian charm with monorail convenience and spa indulgence.',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian/hero.webp',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian/card.webp',
  '["Live Pianist","Monorail","Victoria & Albert’s"]',
  '["Victorian","Spa","Monorail"]',
  '22–40 pts/night',
  '[{"title":"Sleeps","value":"5 Guests"},{"title":"Room Size","value":"374 sq.ft"},{"title":"Views","value":"Lagoon • Courtyard"}]',
  '{"title":"Deluxe Studio","bullets":["1 Queen Bed + 1 Pull-Down Queen","Split bathroom with soaking tub","Kitchenette with marble finishes","Private patio or balcony"],"notes":"Studios sleep up to 5 and include a single pull-down bed perfect for younger guests.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian/layout.webp"}',
  '[{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian/lobby.webp","caption":"Grand lobby with live music"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian/pool.webp","caption":"Beach Pool overlooking Seven Seas Lagoon"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian/villa.webp","caption":"Villa living area"}]',
  '{"transportation":"Monorail, water launch, or walking path to Magic Kingdom.","amenities":["Senses Spa","Beach Pool","Mary Poppins-themed splash play"],"dining":["Victoria & Albert’s","Citricos","1900 Park Fare"]}',
  '{"headline":"Seven Seas Lagoon Promenade","description":"Nestled along the lagoon with monorail and water launch access plus a walking path to Magic Kingdom.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian/map.webp"}',
  '[{"name":"Bay Lake Tower","slug":"bay-lake-tower","tagline":"Skyline views with monorail at your doorstep."},{"name":"Polynesian Villas","slug":"polynesian-villas","tagline":"Overwater bungalows and tropical nights."}]'
),
-- Polynesian Villas ---------------------------------------------------------
(
  'polynesian-villas',
  'Polynesian Villas & Bungalows',
  'Seven Seas Lagoon',
  'Island enchantment with overwater bungalows and Dole Whip delights.',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/polynesian/hero.webp',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/polynesian/card.webp',
  '["Island Nights","Monorail","Overwater Bungalows"]',
  '["Tropical","Overwater","Monorail"]',
  '24–50 pts/night',
  '[{"title":"Sleeps","value":"5 Guests"},{"title":"Room Size","value":"465 sq.ft"},{"title":"Views","value":"Lagoon • Theme Park"}]',
  '{"title":"Deluxe Studio","bullets":["1 Queen Bed + 1 Pull-Down Queen + 1 Pull-Down Twin","Split bathroom with rainfall shower","Kitchenette with tiki flair","Private patio or balcony"],"notes":"Studios sleep 5 with space to spread out; bungalows sleep 8 with private plunge pools.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/polynesian/layout.webp"}',
  '[{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/polynesian/bungalow.webp","caption":"Sunset over the overwater bungalows"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/polynesian/pool.webp","caption":"Lava Pool with volcano slide"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/polynesian/villa.webp","caption":"Studio interior with tropical accents"}]',
  '{"transportation":"Monorail to Magic Kingdom and EPCOT plus water launch service.","amenities":["Lava Pool","Oasis Pool","Kiki Tiki’s splash play"],"dining":["‘Ohana","Trader Sam’s","Pineapple Lanai"]}',
  '{"headline":"Lagoon-side paradise","description":"Positioned along Seven Seas Lagoon with views of Cinderella Castle and direct monorail access.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/polynesian/map.webp"}',
  '[{"name":"Bay Lake Tower","slug":"bay-lake-tower","tagline":"Fireworks from your balcony."},{"name":"Grand Floridian Villas","slug":"grand-floridian-villas","tagline":"Victorian elegance moments away."}]'
),
-- Disney's Riviera Resort ---------------------------------------------------
(
  'riviera-resort',
  'Disney’s Riviera Resort',
  'Epcot & Hollywood Studios',
  'European sophistication with Skyliner sunsets and cappuccino mornings.',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/riviera/hero.webp',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/riviera/card.webp',
  '["European Art","Skyliner","Topolino’s Terrace"]',
  '["Skyliner","European","Topolino’s"]',
  '20–38 pts/night',
  '[{"title":"Sleeps","value":"5 Guests"},{"title":"Room Size","value":"423 sq.ft"},{"title":"Views","value":"Skyliner • Courtyard"}]',
  '{"title":"Preferred View Studio","bullets":["Queen bed + pull-down queen + pull-down single","Marble bathroom with rainfall shower","Kitchenette with European finishes","Juliet balcony or full terrace"],"notes":"Tower Studios sleep two with sweeping Riviera views — perfect for couples.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/riviera/layout.webp"}',
  '[{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/riviera/pool.webp","caption":"Riviera main pool with Skyliner backdrop"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/riviera/lobby.webp","caption":"Lobby mosaics inspired by European masters"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/riviera/terrace.webp","caption":"Topolino’s Terrace at dawn"}]',
  '{"transportation":"Disney Skyliner to EPCOT and Hollywood Studios; bus service to other parks.","amenities":["S’il Vous Play splash area","Beau Soleil leisure pool","Voyageurs’ Lounge"],"dining":["Topolino’s Terrace","Primo Piatto","Le Petit Café"]}',
  '{"headline":"Skyliner Junction","description":"Adjacent to the Skyliner hub with connections to EPCOT, Hollywood Studios, and surrounding resorts.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/riviera/map.webp"}',
  '[{"name":"Beach Club Villas","slug":"beach-club-villas","tagline":"Walk to EPCOT’s International Gateway."},{"name":"BoardWalk Villas","slug":"boardwalk-villas","tagline":"Nightlife along Crescent Lake."}]'
),
-- Boulder Ridge Villas ------------------------------------------------------
(
  'boulder-ridge-villas',
  'Boulder Ridge Villas',
  'Disney’s Wilderness Lodge',
  'Pacific Northwest craftsmanship with rustic villas and nature trails.',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/boulder-ridge/hero.webp',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/boulder-ridge/card.webp',
  '["Rustic Retreat","Water Launch","Campfires"]',
  '["Woodland","Boat to Magic Kingdom","Rustic"]',
  '16–28 pts/night',
  '[{"title":"Sleeps","value":"4 Guests"},{"title":"Room Size","value":"356 sq.ft"},{"title":"Views","value":"Woods • Courtyard"}]',
  '{"title":"Deluxe Studio","bullets":["Queen bed + queen-size sleeper sofa","Kitchenette with log-cabin accents","Private balcony or patio","Access to Copper Creek’s Geyser Point"],"notes":"The villas connect to Wilderness Lodge amenities via covered walkways.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/boulder-ridge/layout.webp"}',
  '[{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/boulder-ridge/lobby.webp","caption":"Railroad-inspired lobby"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/boulder-ridge/pool.webp","caption":"Hidden Springs Pool"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/boulder-ridge/villa.webp","caption":"Studio interior with rustic touches"}]',
  '{"transportation":"Water launch to Magic Kingdom and boat service to the monorail loop; bus transportation to other parks.","amenities":["Hidden Springs Pool","Bike rentals","Storytelling by the fire"],"dining":["Geyser Point Bar & Grill","Whispering Canyon Cafe","Roaring Fork"]}',
  '{"headline":"Wilderness escape","description":"Nestled alongside Bay Lake with walking paths to Copper Creek and nature trails.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/boulder-ridge/map.webp"}',
  '[{"name":"Copper Creek Villas & Cabins","slug":"copper-creek-villas","tagline":"Modern rustic villas with private cabins."},{"name":"Bay Lake Tower","slug":"bay-lake-tower","tagline":"Skyline views across Bay Lake."}]'
),
-- Copper Creek Villas & Cabins ---------------------------------------------
(
  'copper-creek-villas',
  'Copper Creek Villas & Cabins',
  'Disney’s Wilderness Lodge',
  'Modern rustic villas and waterfront cabins with private hot tubs.',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/copper-creek/hero.webp',
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/copper-creek/card.webp',
  '["Waterfront Cabins","Geyser Point","Stone Hearth"]',
  '["Cabins","Hot Springs","Modern Rustic"]',
  '20–36 pts/night',
  '[{"title":"Sleeps","value":"4 Guests"},{"title":"Room Size","value":"338 sq.ft"},{"title":"Views","value":"Pine Forest • Waterway"}]',
  '{"title":"Studio Villa","bullets":["Queen bed + queen-size sleeper sofa","Compact kitchen with stone backsplash","Walk-in rain shower","Balcony overlooking the pines"],"notes":"Cascade Cabins sleep 8 with screened-in porches and private hot tubs overlooking Bay Lake.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/copper-creek/layout.webp"}',
  '[{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/copper-creek/cabin.webp","caption":"Cascade Cabin with private spa"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/copper-creek/pool.webp","caption":"Copper Creek Springs Pool"},{"src":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/copper-creek/lobby.webp","caption":"Lobby fireplace and stone accents"}]',
  '{"transportation":"Water launch to Magic Kingdom, bus service to parks, and walking trails through Wilderness Lodge.","amenities":["Copper Creek Springs Pool","Sturdy Branches fitness","Fishing excursions"],"dining":["Story Book Dining at Artist Point","Geyser Point Bar & Grill","Roaring Fork"]}',
  '{"headline":"Lakeside serenity","description":"Cabins line the Bay Lake shoreline with easy access to Geyser Point and Wilderness Lodge amenities.","image":"https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/copper-creek/map.webp"}',
  '[{"name":"Boulder Ridge Villas","slug":"boulder-ridge-villas","tagline":"Railroad charm and rustic ambiance."},{"name":"Bay Lake Tower","slug":"bay-lake-tower","tagline":"Monorail skyline in minutes via water taxi."}]'
);

-- NOTE: If these rows already exist, switch the insert above to
-- "insert ... on conflict (slug) do update set ..." or clear the rows first.

-- Seed supporting tables for Bay Lake Tower
delete from resort_photos where resort_slug = 'bay-lake-tower';
insert into resort_photos (resort_slug, url, alt, sort_order, is_hero)
values
  ('bay-lake-tower', 'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/hero.webp', 'Bay Lake Tower exterior at dusk', 0, true),
  ('bay-lake-tower', 'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/pool.webp', 'Bay Lake Tower pool', 1, false),
  ('bay-lake-tower', 'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/lobby.webp', 'Bay Lake Tower lobby', 2, false),
  ('bay-lake-tower', 'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/view.webp', 'Bay Lake Tower fireworks balcony view', 3, false);

delete from resort_room_layouts where resort_slug = 'bay-lake-tower';
insert into resort_room_layouts (resort_slug, name, sleeps, square_feet, bed_config, image_url, sort_order)
values
  ('bay-lake-tower', 'Deluxe Studio', 5, 356, 'Queen bed · Pull-down queen · Pull-down single', 'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake/layout.webp', 0);

delete from resort_facts where resort_slug = 'bay-lake-tower';
insert into resort_facts (resort_slug, label, value, sort_order)
values
  ('bay-lake-tower', 'Sleeps', '5 Guests', 0),
  ('bay-lake-tower', 'Room Size', '356 sq.ft', 1),
  ('bay-lake-tower', 'Views', 'Lake • Pool • Park', 2);

delete from resort_essentials where resort_slug = 'bay-lake-tower';
insert into resort_essentials (resort_slug, icon, title, body, sort_order)
values
  ('bay-lake-tower', 'transport', 'Transportation', 'Walk or take the monorail to Magic Kingdom in about 10 minutes.', 0),
  ('bay-lake-tower', 'amenities', 'Amenities', E'Feature pool with waterslide\nFitness center\nMarina & lakeside paths', 1),
  ('bay-lake-tower', 'dining', 'Dining', E'California Grill\nSteakhouse 71\nContempo Café', 2),
  ('bay-lake-tower', 'alert', 'Notices', 'Exterior work may be visible during select daytime hours.', 3);

delete from resort_neighbors where resort_slug = 'bay-lake-tower';
insert into resort_neighbors (resort_slug, neighbor_slug, distance, notes)
values
  ('bay-lake-tower', 'polynesian-villas', 'Monorail — 1 stop', 'Tropical escape with overwater bungalows.'),
  ('bay-lake-tower', 'grand-floridian-villas', 'Monorail — 2 stops', 'Victorian elegance with spa indulgence.');
