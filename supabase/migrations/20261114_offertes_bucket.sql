-- Privé opslag voor je eigen offertes (PDF), per gebruiker een eigen map.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('offertes', 'offertes', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

create policy "offertes: eigen map lezen" on storage.objects for select to authenticated
  using (bucket_id = 'offertes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "offertes: eigen map uploaden" on storage.objects for insert to authenticated
  with check (bucket_id = 'offertes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "offertes: eigen map verwijderen" on storage.objects for delete to authenticated
  using (bucket_id = 'offertes' and (storage.foldername(name))[1] = (select auth.uid())::text);
