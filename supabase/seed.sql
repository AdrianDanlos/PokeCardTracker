insert into public.card_sources (id, name, base_url, supports_search, supports_set_import)
values
  ('pokemontcg', 'Pokemon TCG API', 'https://api.pokemontcg.io/v2', true, true),
  ('tcgdex', 'TCGdex', 'https://api.tcgdex.net/v2', true, true),
  ('manual', 'Manual entry', null, false, false)
on conflict (id) do nothing;
