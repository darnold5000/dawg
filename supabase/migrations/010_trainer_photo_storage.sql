-- Public bucket for trainer headshots (admin upload, public read on site).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trainer-photos',
  'trainer-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "dawg_public_read_trainer_photos" on storage.objects;
create policy "dawg_public_read_trainer_photos"
  on storage.objects for select
  using (bucket_id = 'trainer-photos');

drop policy if exists "dawg_admin_manage_trainer_photos" on storage.objects;
create policy "dawg_admin_manage_trainer_photos"
  on storage.objects for all
  using (bucket_id = 'trainer-photos' and public.dawg_is_admin())
  with check (bucket_id = 'trainer-photos' and public.dawg_is_admin());
