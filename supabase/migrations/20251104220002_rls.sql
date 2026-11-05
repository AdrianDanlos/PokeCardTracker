alter table public.card_sources enable row level security;
alter table public.sets enable row level security;
alter table public.cards enable row level security;
alter table public.collections enable row level security;
alter table public.collection_entries enable row level security;
alter table public.owned_copies enable row level security;

-- Catalog tables: readable by authenticated users; writes for authenticated (imports)
create policy "card_sources read" on public.card_sources
  for select to authenticated using (true);

create policy "sets read" on public.sets
  for select to authenticated using (true);

create policy "sets insert" on public.sets
  for insert to authenticated with check (true);

create policy "cards read" on public.cards
  for select to authenticated using (true);

create policy "cards insert" on public.cards
  for insert to authenticated with check (true);

create policy "cards update" on public.cards
  for update to authenticated using (true);

-- Collections
create policy "collections select own" on public.collections
  for select to authenticated using (auth.uid() = user_id);

create policy "collections insert own" on public.collections
  for insert to authenticated with check (auth.uid() = user_id);

create policy "collections update own" on public.collections
  for update to authenticated using (auth.uid() = user_id);

create policy "collections delete own" on public.collections
  for delete to authenticated using (auth.uid() = user_id);

-- Collection entries via collection ownership
create policy "entries select" on public.collection_entries
  for select to authenticated using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create policy "entries insert" on public.collection_entries
  for insert to authenticated with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create policy "entries update" on public.collection_entries
  for update to authenticated using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create policy "entries delete" on public.collection_entries
  for delete to authenticated using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

-- Owned copies
create policy "owned select own" on public.owned_copies
  for select to authenticated using (auth.uid() = user_id);

create policy "owned insert own" on public.owned_copies
  for insert to authenticated with check (auth.uid() = user_id);

create policy "owned update own" on public.owned_copies
  for update to authenticated using (auth.uid() = user_id);

create policy "owned delete own" on public.owned_copies
  for delete to authenticated using (auth.uid() = user_id);

-- Storage buckets (covers + card images)
insert into storage.buckets (id, name, public)
values
  ('collection-covers', 'collection-covers', true),
  ('card-images', 'card-images', true)
on conflict (id) do nothing;

create policy "covers public read" on storage.objects
  for select using (bucket_id = 'collection-covers');

create policy "covers auth upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'collection-covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "covers auth update" on storage.objects
  for update to authenticated
  using (bucket_id = 'collection-covers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "card images public read" on storage.objects
  for select using (bucket_id = 'card-images');

create policy "card images auth upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'card-images' and auth.uid()::text = (storage.foldername(name))[1]);

grant select on public.collection_progress_summary to authenticated;
grant select on public.collection_progress to authenticated;
grant execute on function public.collection_progress_breakdown(uuid) to authenticated;
