-- Privé-bucket voor foto's (woordenlijsten, paragrafen, cijferlijsten).
-- Paden: <user_id>/tmp/...         wordt na verwerking verwijderd (standaard)
--        <user_id>/lists/<id>/...  bewaard bij een lijst (als de gebruiker dat kiest)
-- De eerste mapnaam moet je eigen user-id zijn; anders weigert RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('source-images', 'source-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "source-images: eigen bestanden lezen" on storage.objects
  for select to authenticated
  using (bucket_id = 'source-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "source-images: eigen bestanden uploaden" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'source-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "source-images: eigen bestanden wijzigen" on storage.objects
  for update to authenticated
  using (bucket_id = 'source-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'source-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "source-images: eigen bestanden verwijderen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'source-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
