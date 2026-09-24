alter table public.campaigns
  add column if not exists representada_id uuid references public.representadas(id) on delete set null,
  add column if not exists description text,
  add column if not exists channel text not null default 'whatsapp',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists total_audience_count integer not null default 0,
  add column if not exists eligible_audience_count integer not null default 0,
  add column if not exists sent_count integer not null default 0,
  add column if not exists replied_count integer not null default 0,
  add column if not exists order_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists campaigns_representada_idx on public.campaigns(representada_id);
create index if not exists campaigns_status_scheduled_idx on public.campaigns(status,scheduled_at);
