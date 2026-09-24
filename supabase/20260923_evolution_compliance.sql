-- Evolution/WhatsApp compliance and unified interaction history
alter table public.customers add column if not exists whatsapp_marketing_allowed boolean not null default false;
alter table public.customers add column if not exists marketing_consent_at timestamptz;
alter table public.customers add column if not exists whatsapp_opt_out_at timestamptz;
alter table public.leads add column if not exists opt_out_at timestamptz;

alter table public.interactions alter column lead_id drop not null;
alter table public.interactions add column if not exists customer_id uuid references public.customers(id) on delete cascade;
create index if not exists interactions_customer_created_idx on public.interactions(customer_id,created_at desc);

alter table public.interactions drop constraint if exists interactions_exactly_one_contact;
alter table public.interactions add constraint interactions_exactly_one_contact
check ((lead_id is not null and customer_id is null) or (lead_id is null and customer_id is not null));
