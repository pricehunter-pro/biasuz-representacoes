-- 2026-09-24: promotions, dashboards, assisted WhatsApp and landing banners
alter table public.representadas
  add column if not exists banner_image_url text,
  add column if not exists banner_caption text;

create table if not exists public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  created_by uuid not null default auth.uid(),
  recipient text not null,
  message text not null,
  status text not null default 'draft' check (status in ('draft','approved','sending','sent','error','cancelled')),
  consent_snapshot boolean not null default false,
  provider_message_id text,
  provider_response jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_outbox enable row level security;

drop policy if exists whatsapp_outbox_admin_all on public.whatsapp_outbox;
create policy whatsapp_outbox_admin_all on public.whatsapp_outbox
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists whatsapp_outbox_rep_own on public.whatsapp_outbox;
create policy whatsapp_outbox_rep_own on public.whatsapp_outbox
for all to authenticated
using (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.portal_profiles p
    where p.user_id=(select auth.uid()) and p.active=true and p.role='representante'
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.portal_profiles p
    where p.user_id=(select auth.uid()) and p.active=true and p.role='representante'
  )
);

drop policy if exists representada_manage_own_promotions on public.promotions;
create policy representada_manage_own_promotions on public.promotions
for all to authenticated
using (
  exists (
    select 1 from public.portal_profiles p
    where p.user_id=(select auth.uid()) and p.active=true and p.role='representada'
      and p.representada_id=promotions.representada_id
  )
)
with check (
  exists (
    select 1 from public.portal_profiles p
    where p.user_id=(select auth.uid()) and p.active=true and p.role='representada'
      and p.representada_id=promotions.representada_id
  )
);

create or replace function public.admin_dashboard_insights()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare result jsonb;
begin
  if coalesce(((auth.jwt() -> 'app_metadata') ->> 'role'),'') <> 'admin' then raise exception 'not authorized'; end if;
  select jsonb_build_object(
    'orders_month_count',(select count(*) from orders where created_at >= date_trunc('month',now())),
    'orders_month_total',(select coalesce(sum(total),0) from orders where created_at >= date_trunc('month',now()) and status not in ('cancelado','cancelada')),
    'positive_customers_month',(select count(distinct customer_id) from orders where created_at >= date_trunc('month',now()) and status not in ('rascunho','cancelado','cancelada')),
    'top_states',coalesce((select jsonb_agg(to_jsonb(x)) from (select coalesce(state,'N/I') label,count(*) value from customers group by coalesce(state,'N/I') order by value desc limit 9)x),'[]'::jsonb),
    'top_cities',coalesce((select jsonb_agg(to_jsonb(x)) from (select coalesce(city,'N/I') label,count(*) value from customers group by coalesce(city,'N/I') order by value desc limit 10)x),'[]'::jsonb),
    'top_brands',coalesce((select jsonb_agg(to_jsonb(x)) from (select name label,products_count value,slug from representadas where active=true order by products_count desc,name limit 10)x),'[]'::jsonb),
    'customer_stages',coalesce((select jsonb_agg(to_jsonb(x)) from (select lifecycle_stage label,count(*) value from customers group by lifecycle_stage order by value desc)x),'[]'::jsonb)
  ) into result;
  return result;
end $$;

revoke all on function public.admin_dashboard_insights() from public;
grant execute on function public.admin_dashboard_insights() to authenticated;

create or replace function public.representada_dashboard_metrics(p_representada_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare allowed boolean; result jsonb;
begin
  allowed := coalesce(((auth.jwt() -> 'app_metadata') ->> 'role'),'')='admin'
    or exists(select 1 from portal_profiles p where p.user_id=(select auth.uid()) and p.active=true and p.role='representada' and p.representada_id=p_representada_id);
  if not allowed then raise exception 'not authorized'; end if;
  select jsonb_build_object(
    'orders_month_count',count(*) filter(where o.created_at >= date_trunc('month',now())),
    'sales_month_total',coalesce(sum(o.total) filter(where o.created_at >= date_trunc('month',now()) and o.status not in ('cancelado','cancelada')),0),
    'positive_customers_month',count(distinct o.customer_id) filter(where o.created_at >= date_trunc('month',now()) and o.status not in ('rascunho','cancelado','cancelada')),
    'average_ticket_month',coalesce(avg(o.total) filter(where o.created_at >= date_trunc('month',now()) and o.status not in ('rascunho','cancelado','cancelada')),0),
    'status_breakdown',coalesce((select jsonb_agg(to_jsonb(s)) from (select status label,count(*) value from orders where representada_id=p_representada_id group by status order by value desc)s),'[]'::jsonb),
    'recent_orders',coalesce((select jsonb_agg(to_jsonb(r)) from (select o.id,o.order_number,o.status,o.total,o.created_at,coalesce(c.trade_name,c.legal_name) customer from orders o join customers c on c.id=o.customer_id where o.representada_id=p_representada_id order by o.created_at desc limit 12)r),'[]'::jsonb)
  ) into result from orders o where o.representada_id=p_representada_id;
  return result;
end $$;

revoke all on function public.representada_dashboard_metrics(uuid) from public;
grant execute on function public.representada_dashboard_metrics(uuid) to authenticated;
