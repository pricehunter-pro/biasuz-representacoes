-- Biasuz Representações CRM
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  company text not null check (char_length(company) between 2 and 180),
  phone text not null check (char_length(phone) between 8 and 30),
  email text,
  state text not null check (state in ('BA','SE','AL','PE','PB','RN','CE','PI','MA')),
  city text,
  segment text not null check (segment in ('Pet','Bazar','Jardinagem','Farma','Tech','Matco')),
  brand text,
  message text,
  consent boolean not null default false check (consent = true),
  source text not null default 'landing',
  stage text not null default 'novo' check (stage in ('novo','contatado','qualificado','proposta','pedido','ganho','perdido')),
  owner_name text default 'Junior',
  next_action_at timestamptz,
  last_contact_at timestamptz,
  notes text
);

create unique index if not exists leads_phone_company_unique on public.leads (regexp_replace(phone,'\D','','g'), lower(company));
create index if not exists leads_state_segment_idx on public.leads(state,segment);
create index if not exists leads_stage_idx on public.leads(stage);
create index if not exists leads_next_action_idx on public.leads(next_action_at);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','phone','email','visit','system')),
  direction text not null default 'outbound' check (direction in ('inbound','outbound','internal')),
  summary text not null,
  external_id text,
  created_by uuid references auth.users(id)
);
create index if not exists interactions_lead_created_idx on public.interactions(lead_id,created_at desc);\ncreate index if not exists interactions_created_by_idx on public.interactions(created_by);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  segment text,
  state text,
  brand text,
  status text not null default 'draft' check (status in ('draft','scheduled','running','paused','completed','cancelled')),
  message_template text not null,
  scheduled_at timestamptz,
  created_by uuid references auth.users(id)
);

create index if not exists campaigns_created_by_idx on public.campaigns(created_by);\n\nalter table public.leads enable row level security;
alter table public.interactions enable row level security;
alter table public.campaigns enable row level security;

drop policy if exists "public_can_create_leads" on public.leads;
create policy "public_can_create_leads" on public.leads
for insert to anon
with check (
  consent = true
  and stage = 'novo'
  and owner_name = 'Junior'
  and source = 'landing'
);

drop policy if exists "admins_manage_leads" on public.leads;
create policy "admins_manage_leads" on public.leads
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admins_manage_interactions" on public.interactions;
create policy "admins_manage_interactions" on public.interactions
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admins_manage_campaigns" on public.campaigns;
create policy "admins_manage_campaigns" on public.campaigns
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant insert on table public.leads to anon, authenticated;
grant select, update, delete on table public.leads to authenticated;
grant select, insert, update, delete on table public.interactions to authenticated;
grant select, insert, update, delete on table public.campaigns to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at before update on public.leads
for each row execute function public.set_updated_at();
