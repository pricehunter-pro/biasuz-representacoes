-- Customer stores, pricing, checkout and representative notifications
alter table public.customers add column if not exists representative_user_id uuid references auth.users(id) on delete set null;
alter table public.products add column if not exists group_name text;
alter table public.products add column if not exists package_info text;
alter table public.products add column if not exists unit_label text;
alter table public.products add column if not exists sort_order integer not null default 0;

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  representada_id uuid not null references public.representadas(id) on delete cascade,
  price numeric(14,2) not null check(price>=0),
  promo_price numeric(14,2),
  min_quantity numeric(12,3) not null default 1 check(min_quantity>0),
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,representada_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references auth.users(id) on delete cascade,
  recipient_role text,
  order_id uuid references public.orders(id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Runtime database also contains RLS and triggers that:
-- 1. allow customers to create only their own draft orders;
-- 2. force product prices from product_prices server-side;
-- 3. forbid products from another representada in an order;
-- 4. validate the representada minimum order on submit;
-- 5. recalculate order totals server-side;
-- 6. notify the assigned representative/admin when the customer submits.
