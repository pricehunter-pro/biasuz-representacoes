-- Biasuz catalog ingestion foundation (2026-09-24)
-- Tracks official-source data separately from B2B commercial pricing.

alter table public.products
  add column if not exists source_platform text,
  add column if not exists source_price numeric(14,2),
  add column if not exists source_compare_at_price numeric(14,2),
  add column if not exists source_currency text,
  add column if not exists source_availability text,
  add column if not exists source_last_seen_at timestamptz,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb;

alter table public.catalog_sources
  add column if not exists enabled boolean not null default true,
  add column if not exists platform_hint text,
  add column if not exists priority integer not null default 100,
  add column if not exists config jsonb not null default '{}'::jsonb;

create table if not exists public.catalog_sync_runs (
  id uuid primary key default gen_random_uuid(),
  representada_id uuid references public.representadas(id) on delete cascade,
  source_id uuid references public.catalog_sources(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  platform text,
  discovered_count integer not null default 0,
  upserted_count integer not null default 0,
  variant_count integer not null default 0,
  image_count integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  position integer not null default 0,
  source_url text,
  created_at timestamptz not null default now(),
  unique(product_id,image_url)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  external_key text,
  sku text,
  ean text,
  name text,
  option_values jsonb not null default '{}'::jsonb,
  source_price numeric(14,2),
  source_compare_at_price numeric(14,2),
  source_currency text,
  available boolean,
  image_url text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_source_key_unique on public.products(representada_id,external_key);
create unique index if not exists product_variants_natural_key on public.product_variants(product_id,external_key,sku);
