-- حاوية تخزين لشعارات وبانرات المتاجر (قراءة عامة؛ الكتابة عبر API بمفتاح الخدمة فقط).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-assets',
  'vendor-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vendor_assets_public_read" on storage.objects;
create policy "vendor_assets_public_read"
on storage.objects for select
to public
using (bucket_id = 'vendor-assets');
