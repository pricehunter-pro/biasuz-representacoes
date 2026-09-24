-- Prevent duplicate PDF/catalog ingestion by SHA-256.
alter table public.catalogs add column if not exists file_sha256 text;
create unique index if not exists catalogs_file_sha256_unique
  on public.catalogs(file_sha256) where file_sha256 is not null;
