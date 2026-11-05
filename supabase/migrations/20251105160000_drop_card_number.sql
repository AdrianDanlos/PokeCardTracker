drop index if exists public.cards_number_trgm_idx;
drop index if exists public.cards_search_idx;

alter table public.cards drop column if exists search_vector;

alter table public.cards
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
  ) stored;

create index cards_search_idx on public.cards using gin (search_vector);

alter table public.cards drop column if exists number;
