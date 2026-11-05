-- Upsert into sets requires UPDATE when the row already exists.
create policy "sets update" on public.sets
  for update to authenticated using (true);
