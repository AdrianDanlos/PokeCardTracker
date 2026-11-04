-- Card sources
insert into public.card_sources (id, name, base_url, supports_search, supports_set_import)
values
  ('pokemontcg', 'Pokemon TCG API', 'https://api.pokemontcg.io/v2', true, true),
  ('tcgdex', 'TCGdex', 'https://api.tcgdex.net/v2', true, true),
  ('manual', 'Manual entry', null, false, false)
on conflict (id) do nothing;

-- Demo sets
insert into public.sets (id, source_id, external_id, name, series, language, release_date)
values
  ('11111111-1111-1111-1111-111111111101', 'manual', 'gym-heroes', 'Gym Heroes', 'Gym', 'en', '2000-08-14'),
  ('11111111-1111-1111-1111-111111111102', 'manual', 'gym-challenge', 'Gym Challenge', 'Gym', 'en', '2000-10-16'),
  ('11111111-1111-1111-1111-111111111103', 'manual', 'promos', 'Wizards Promos', 'Promo', 'en', null),
  ('11111111-1111-1111-1111-111111111104', 'manual', 'neo-genesis-jp', 'Neo Genesis', 'Neo', 'ja', '2000-02-04'),
  ('11111111-1111-1111-1111-111111111105', 'manual', 'vending', 'Vending Series', 'Vintage JP', 'ja', null)
on conflict do nothing;

-- Demo cards (Gym Era + sample grid from mockup)
insert into public.cards (id, source_id, external_id, set_id, number, name, rarity, language, edition, variant, category, image_url)
values
  ('22222222-2222-2222-2222-222222222201', 'manual', 'gh-002', '11111111-1111-1111-1111-111111111101', '2', 'Blaine''s Charizard', 'Holo', 'en', 'Unlimited', null, 'official', null),
  ('22222222-2222-2222-2222-222222222202', 'manual', 'gh-016', '11111111-1111-1111-1111-111111111101', '16', 'Sabrina''s Alakazam', 'Holo', 'en', 'Unlimited', null, 'official', null),
  ('22222222-2222-2222-2222-222222222203', 'manual', 'gc-011', '11111111-1111-1111-1111-111111111102', '11', 'Lt. Surge''s Raichu', 'Holo', 'en', 'Unlimited', null, 'official', null),
  ('22222222-2222-2222-2222-222222222204', 'manual', 'gh-069', '11111111-1111-1111-1111-111111111101', '69', 'Brock''s Onix', 'Non-holo', 'en', null, null, 'official', null),
  ('22222222-2222-2222-2222-222222222205', 'manual', 'gc-014', '11111111-1111-1111-1111-111111111102', '14', 'Rocket''s Mewtwo', 'Holo', 'en', 'Unlimited', null, 'official', null),
  ('22222222-2222-2222-2222-222222222206', 'manual', 'promo-pika', '11111111-1111-1111-1111-111111111103', '24', 'Pikachu (stamp)', 'Promo', 'en', null, 'Wizards stamp', 'promo', null),
  ('22222222-2222-2222-2222-222222222207', 'manual', 'gh-064', '11111111-1111-1111-1111-111111111101', '64', 'Misty''s Starmie', 'Non-holo', 'en', null, null, 'official', null),
  ('22222222-2222-2222-2222-222222222208', 'manual', 'gh-048', '11111111-1111-1111-1111-111111111101', '48', 'Giovanni''s Nidoking', 'Non-holo', 'en', null, null, 'official', null),
  ('22222222-2222-2222-2222-222222222209', 'manual', 'gh-004', '11111111-1111-1111-1111-111111111101', '4', 'Erika''s Venusaur', 'Holo', 'en', 'Unlimited', null, 'official', null),
  ('22222222-2222-2222-2222-222222222210', 'manual', 'gh-024', '11111111-1111-1111-1111-111111111101', '24', 'Koga''s Ninja Trick', 'Non-holo', 'en', null, null, 'official', null)
on conflict do nothing;

-- Note: collections, entries, and owned_copies are seeded after auth user exists.
-- Run: npm run db:seed-demo (see README) to attach demo data to the logged-in user.
