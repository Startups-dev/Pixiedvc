insert into public.resorts (slug, name, location, tagline)
values
  ('aulani', 'Aulani, Disney Vacation Club Villas', 'Ko Olina, Hawai‘i', 'Oceanfront villas with Polynesian storytelling and lazy rivers.'),
  ('animal-kingdom-kidani', 'Disney''s Animal Kingdom Villas – Kidani Village', 'Animal Kingdom Resort Area', 'Savanna-view villas steps from Sanaa and cultural activities.'),
  ('animal-kingdom-jambo', 'Disney''s Animal Kingdom Villas – Jambo House', 'Animal Kingdom Resort Area', 'Arusha savanna overlooks with grand atrium lobby vibes.'),
  ('beach-club-villas', 'Disney''s Beach Club Villas', 'EPCOT Resort Area', 'Stormalong Bay access with Crescent Lake breezes.'),
  ('boardwalk-villas', 'Disney''s BoardWalk Villas', 'EPCOT Resort Area', 'Jellyrolls nights and quick walks to EPCOT and Studios.'),
  ('hilton-head-island', 'Disney''s Hilton Head Island Resort', 'Hilton Head Island, South Carolina', 'Low-country marsh sunsets minutes from Coligny Beach.'),
  ('old-key-west', 'Disney''s Old Key West Resort', 'Lake Buena Vista, Florida', 'Original DVC charm with the biggest villas on property.'),
  ('saratoga-springs', 'Disney''s Saratoga Springs Resort & Spa', 'Lake Buena Vista, Florida', 'Treehouse villas and a stroll to Disney Springs dining.'),
  ('grand-californian-villas', 'The Villas at Disney''s Grand Californian Hotel & Spa', 'Disneyland Resort, California', 'Private Grand Californian entrance to Disney California Adventure.'),
  ('disneyland-hotel-villas', 'The Villas at Disneyland Hotel', 'Disneyland Resort, California', 'Mid-century modern tower with Monorail pool vibes.'),
  ('vero-beach', 'Disney''s Vero Beach Resort', 'Vero Beach, Florida', 'Atlantic surf, sea turtle nests, and oceanfront studios.');

on conflict (slug) do update
set
  name = excluded.name,
  location = excluded.location,
  tagline = excluded.tagline;
