-- Public clean brand/logo assets with admin-only writes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('brand-assets','brand-assets',true,5242880,array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists brand_assets_public_read on storage.objects;
create policy brand_assets_public_read on storage.objects for select
using (bucket_id='brand-assets');

drop policy if exists brand_assets_admin_insert on storage.objects;
create policy brand_assets_admin_insert on storage.objects for insert to authenticated
with check (bucket_id='brand-assets' and ((select auth.jwt())->'app_metadata'->>'role')='admin');

drop policy if exists brand_assets_admin_update on storage.objects;
create policy brand_assets_admin_update on storage.objects for update to authenticated
using (bucket_id='brand-assets' and ((select auth.jwt())->'app_metadata'->>'role')='admin')
with check (bucket_id='brand-assets' and ((select auth.jwt())->'app_metadata'->>'role')='admin');

drop policy if exists brand_assets_admin_delete on storage.objects;
create policy brand_assets_admin_delete on storage.objects for delete to authenticated
using (bucket_id='brand-assets' and ((select auth.jwt())->'app_metadata'->>'role')='admin');
