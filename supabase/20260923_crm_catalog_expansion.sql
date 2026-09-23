-- Biasuz CRM expansion: customers, represented brands, products and catalog sources
-- Applied to project hszbmroogcciopipjijk on 2026-09-23.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'lista_petshop_bahia_julho_2026',
  source_id text,
  cnpj text not null unique,
  branch_type text,
  legal_name text not null,
  trade_name text,
  registration_status text,
  registration_status_date date,
  start_date date,
  cnae_code text,
  cnae_description text,
  street_type text,
  street text,
  number text,
  complement text,
  district text,
  zip_code text,
  state text,
  city_code text,
  city text,
  phone1 text,
  phone1_is_mobile boolean,
  phone2 text,
  phone2_is_mobile boolean,
  email text,
  responsible_qualification text,
  share_capital numeric,
  company_size text,
  simples_option text,
  mei_option text,
  partners text,
  secondary_cnaes text,
  segment text not null default 'Pet',
  lifecycle_stage text not null default 'prospect'
    check (lifecycle_stage in ('prospect','cliente','inativo','descartado')),
  commercial_owner text not null default 'Junior',
  last_contact_at timestamptz,
  next_action_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.representadas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  official_url text not null,
  instagram_url text,
  segments text[] not null default '{}',
  description text,
  active boolean not null default true,
  catalog_status text not null default 'pending',
  products_count integer not null default 0,
  last_catalog_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  representada_id uuid not null references public.representadas(id) on delete cascade,
  external_key text,
  name text not null,
  category text,
  subcategory text,
  description text,
  sku text,
  ean text,
  product_url text,
  image_url text,
  attributes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  source_url text,
  source_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_sources (
  id uuid primary key default gen_random_uuid(),
  representada_id uuid not null references public.representadas(id) on delete cascade,
  source_url text not null,
  source_type text not null default 'official_site',
  crawl_status text not null default 'pending',
  last_crawled_at timestamptz,
  notes text,
  unique(representada_id, source_url)
);

-- RLS must remain enabled; only the public catalog is readable anonymously.
alter table public.customers enable row level security;
alter table public.representadas enable row level security;
alter table public.products enable row level security;
alter table public.catalog_sources enable row level security;
