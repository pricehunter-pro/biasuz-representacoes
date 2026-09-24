-- Biasuz CRM: private catalog library, PDF ingestion, OCR review, price tables and secure sharing
-- Production migration applied in Supabase on 2026-09-24.

create table if not exists public.catalogs (
  id uuid primary key default gen_random_uuid(),
  representada_id uuid not null references public.representadas(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  catalog_type text not null default 'general',
  year integer,
  valid_from date,
  valid_until date,
  source_type text not null default 'upload',
  file_name text,
  mime_type text,
  size_bytes bigint,
  storage_bucket text,
  storage_path text,
  drive_file_id text,
  drive_url text,
  page_count integer,
  status text not null default 'uploaded',
  published boolean not null default false,
  extraction_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(representada_id,slug)
);

create table if not exists public.catalog_pages (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  page_number integer not null,
  extracted_text text,
  ocr_text text,
  ocr_used boolean not null default false,
  preview_storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(catalog_id,page_number)
);

create table if not exists public.catalog_import_jobs (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  status text not null default 'queued',
  parser_version text,
  pages_total integer not null default 0,
  pages_processed integer not null default 0,
  candidates_count integer not null default 0,
  matched_count integer not null default 0,
  created_count integer not null default 0,
  review_count integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_product_candidates (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  representada_id uuid not null references public.representadas(id) on delete cascade,
  page_number integer,
  detected_name text,
  sku text,
  external_code text,
  ean text,
  category text,
  subcategory text,
  description text,
  detected_price numeric(14,2),
  detected_compare_price numeric(14,2),
  package_info text,
  unit_label text,
  weight text,
  dimensions text,
  source_page_image_path text,
  confidence numeric(5,4) not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  matched_product_id uuid references public.products(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_products (
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  page_number integer,
  sort_order integer not null default 0,
  source_candidate_id uuid references public.catalog_product_candidates(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(catalog_id,product_id)
);

create table if not exists public.price_tables (
  id uuid primary key default gen_random_uuid(),
  representada_id uuid not null references public.representadas(id) on delete cascade,
  catalog_id uuid references public.catalogs(id) on delete set null,
  name text not null,
  scope_type text not null default 'default',
  state text,
  region_name text,
  customer_id uuid references public.customers(id) on delete cascade,
  valid_from date,
  valid_until date,
  status text not null default 'draft',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.price_table_items (
  id uuid primary key default gen_random_uuid(),
  price_table_id uuid not null references public.price_tables(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(14,2) not null,
  promo_price numeric(14,2),
  min_quantity numeric(12,3) not null default 1,
  source_page integer,
  source_text text,
  confidence numeric(5,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(price_table_id,product_id)
);

create table if not exists public.catalog_share_links (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  token_hash text not null unique,
  recipient_customer_id uuid references public.customers(id) on delete set null,
  recipient_email text,
  recipient_phone text,
  channel text not null default 'link',
  expires_at timestamptz,
  revoked_at timestamptz,
  download_count integer not null default 0,
  last_download_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists catalog_candidates_catalog_idx on public.catalog_product_candidates(catalog_id,status,page_number);
create index if not exists catalog_candidates_sku_idx on public.catalog_product_candidates(representada_id,sku);
create index if not exists catalog_products_product_idx on public.catalog_products(product_id);
create index if not exists price_tables_brand_idx on public.price_tables(representada_id,status);
create index if not exists catalog_share_catalog_idx on public.catalog_share_links(catalog_id,created_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalogs','catalogs',false,104857600,array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=104857600,allowed_mime_types=excluded.allowed_mime_types;

-- Production RLS: admin can manage catalog ingestion; authenticated users read published catalogs;
-- representatives/admins can create expiring shares; storage remains private.
alter table public.catalogs enable row level security;
alter table public.catalog_pages enable row level security;
alter table public.catalog_import_jobs enable row level security;
alter table public.catalog_product_candidates enable row level security;
alter table public.catalog_products enable row level security;
alter table public.price_tables enable row level security;
alter table public.price_table_items enable row level security;
alter table public.catalog_share_links enable row level security;
