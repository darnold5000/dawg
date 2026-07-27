-- Migration 006: Training vertical storage (tenant-prefixed coach photos).
--
-- Hosted Signal Works Pro: SQL Editor often returns
--   ERROR 42501: must be owner of table buckets
-- for the INSERT below. Use Dashboard bucket + 006b instead (see 006b header).
-- Self-hosted / roles with storage ownership may run this file as-is.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-coach-photos',
  'training-coach-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies (duplicate in 006b for hosted Pro when bucket INSERT fails).
drop policy if exists training_public_read_coach_photos on storage.objects;
create policy training_public_read_coach_photos
  on storage.objects for select
  using (bucket_id = 'training-coach-photos');

drop policy if exists training_admin_manage_coach_photos on storage.objects;
create policy training_admin_manage_coach_photos
  on storage.objects for all
  using (
    bucket_id = 'training-coach-photos'
    and (storage.foldername(name))[1] is not null
    and public.training_is_admin((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'training-coach-photos'
    and (storage.foldername(name))[1] is not null
    and public.training_is_admin((storage.foldername(name))[1]::uuid)
  );
