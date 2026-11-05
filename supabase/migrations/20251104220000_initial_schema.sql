-- Extensions
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- Card sources (providers)
create table public.card_sources (
  id text primary key,
  name text not null,
  base_url text,
  supports_search boolean not null default true,
  supports_set_import boolean not null default true,
  created_at timestamptz not null default now()
);

-- Sets (optional grouping from sources)
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.card_sources (id) on delete restrict,
  external_id text,
  name text not null,
  series text,
  language text not null default 'en',
  release_date date,
  image_path text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create index sets_source_idx on public.sets (source_id);
create index sets_language_idx on public.sets (language);

-- Cards (catalog + manual entries)
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.card_sources (id) on delete restrict,
  external_id text,
  set_id uuid references public.sets (id) on delete set null,
  name text not null,
  language text not null default 'en',
  image_path text,
  image_url text,
  attrs jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
  ) stored,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create index cards_set_idx on public.cards (set_id);
create index cards_name_trgm_idx on public.cards using gin (name gin_trgm_ops);
create index cards_search_idx on public.cards using gin (search_vector);
create index cards_language_idx on public.cards (language);

-- Collections (user-defined lists)
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  cover_image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index collections_user_idx on public.collections (user_id);

-- Entries in a collection (display order)
create table public.collection_entries (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, card_id)
);

create index collection_entries_collection_idx on public.collection_entries (collection_id);
create index collection_entries_card_idx on public.collection_entries (card_id);
create index collection_entries_position_idx on public.collection_entries (collection_id, position);

-- Owned flag per user per card (global across collections)
create table public.owned_copies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index owned_copies_user_idx on public.owned_copies (user_id);
create index owned_copies_card_idx on public.owned_copies (card_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

create trigger owned_copies_updated_at
  before update on public.owned_copies
  for each row execute function public.set_updated_at();
