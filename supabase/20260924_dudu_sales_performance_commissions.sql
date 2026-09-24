-- Dudu Catálogos concepts adapted to Biasuz: sellers, regions, goals, performance and expected commissions.
create table if not exists public.sales_regions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  state text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.salespeople (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  role text not null default 'representante',
  default_commission_rate numeric(7,4) not null default 0 check(default_commission_rate >= 0 and default_commission_rate <= 100),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.salesperson_regions (
  salesperson_id uuid not null references public.salespeople(id) on delete cascade,
  region_id uuid not null references public.sales_regions(id) on delete cascade,
  primary key(salesperson_id,region_id),
  created_at timestamptz not null default now()
);

alter table public.customers add column if not exists salesperson_id uuid references public.salespeople(id) on delete set null;
alter table public.customers add column if not exists sales_region_id uuid references public.sales_regions(id) on delete set null;
alter table public.orders add column if not exists salesperson_id uuid references public.salespeople(id) on delete set null;

create index if not exists customers_salesperson_idx on public.customers(salesperson_id);
create index if not exists customers_sales_region_idx on public.customers(sales_region_id);
create index if not exists orders_salesperson_idx on public.orders(salesperson_id);

create table if not exists public.sales_goals (
  id uuid primary key default gen_random_uuid(),
  salesperson_id uuid not null references public.salespeople(id) on delete cascade,
  representada_id uuid references public.representadas(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  target_value numeric(14,2) not null default 0 check(target_value >= 0),
  target_orders integer not null default 0 check(target_orders >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(period_end >= period_start)
);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  representada_id uuid not null references public.representadas(id) on delete cascade,
  salesperson_id uuid references public.salespeople(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  rate numeric(7,4) not null check(rate >= 0 and rate <= 100),
  valid_from date,
  valid_until date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  representada_id uuid not null references public.representadas(id) on delete cascade,
  rule_id uuid references public.commission_rules(id) on delete set null,
  base_amount numeric(14,2) not null default 0,
  rate numeric(7,4) not null default 0,
  expected_amount numeric(14,2) not null default 0,
  approved_amount numeric(14,2),
  paid_amount numeric(14,2),
  status text not null default 'prevista' check(status in ('prevista','aprovada','paga','cancelada')),
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.sales_performance_monthly with (security_invoker=true) as
select s.id salesperson_id,s.name salesperson_name,date_trunc('month',o.created_at)::date month_start,
 count(o.id)::int orders_count,
 coalesce(sum(o.total),0)::numeric(14,2) sales_total,
 coalesce(avg(nullif(o.total,0)),0)::numeric(14,2) average_ticket,
 coalesce(sum(cm.expected_amount),0)::numeric(14,2) expected_commission,
 coalesce(sum(coalesce(cm.approved_amount,0)),0)::numeric(14,2) approved_commission,
 coalesce(sum(coalesce(cm.paid_amount,0)),0)::numeric(14,2) paid_commission
from public.salespeople s
left join public.orders o on o.salesperson_id=s.id and o.status not in ('rascunho','cancelado','cancelada','rejeitado','rejeitada')
left join public.commissions cm on cm.order_id=o.id
group by s.id,s.name,date_trunc('month',o.created_at);

-- Critical RLS correction: only users who can see the order can see its items.
drop policy if exists portal_read_order_items on public.order_items;
create policy portal_read_order_items on public.order_items for select to authenticated
using (exists (
 select 1 from public.orders o
 join public.portal_profiles p on p.user_id=(select auth.uid()) and p.active=true
 where o.id=order_items.order_id and (
   p.role='admin'
   or (p.role='cliente' and p.customer_id=o.customer_id)
   or (p.role='representada' and p.representada_id=o.representada_id)
   or (p.role='representante' and (o.representative_user_id=p.user_id or exists(
     select 1 from public.salespeople s where s.id=o.salesperson_id and s.user_id=p.user_id
   )))
 )
));

-- Avoid bypassing catalog visibility/confidentiality through an older overlapping read policy.
drop policy if exists catalogs_read on public.catalogs;

-- See applied migration in Supabase for trigger functions, seeded NE regions, Junior portfolio assignment and RLS policies.
