-- card-images allowed INSERT only; upsert/replace needs UPDATE (and DELETE for cleanup).
create policy "card images auth update" on storage.objects
  for update to authenticated
  using (bucket_id = 'card-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "card images auth delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'card-images' and auth.uid()::text = (storage.foldername(name))[1]);
