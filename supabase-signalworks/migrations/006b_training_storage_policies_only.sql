-- Migration 006b: Training coach photo storage policies (SQL Editor safe).
-- Create the bucket in Dashboard first (006 cannot INSERT into storage.buckets on hosted Pro):
--   Storage → New bucket → id/name: training-coach-photos
--   Public bucket: ON
--   File size limit: 5 MB (5242880)
--   Allowed MIME: image/jpeg, image/png, image/webp, image/gif
--
-- Paths: {tenant_id}/coaches/{coach_id}/...

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
