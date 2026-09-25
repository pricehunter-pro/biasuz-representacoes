-- 2026-09-24: richer campaign filters and consent-gated assisted WhatsApp queue
alter table public.campaigns
  add column if not exists audience_filter jsonb not null default '{}'::jsonb,
  add column if not exists queued_count integer not null default 0;

create unique index if not exists whatsapp_outbox_campaign_customer_unique
on public.whatsapp_outbox(campaign_id,customer_id)
where campaign_id is not null and customer_id is not null;

create or replace function public.campaign_audience_preview(
  p_segment text default null,
  p_state text default null,
  p_city text default null,
  p_cnae text default null,
  p_channel text default 'whatsapp'
)
returns jsonb
language plpgsql
security definer
stable
set search_path=public
as $$
declare total_count integer:=0; eligible_count integer:=0;
begin
  if coalesce(((auth.jwt() -> 'app_metadata') ->> 'role'),'') <> 'admin' then raise exception 'not authorized'; end if;
  select count(*) into total_count from customers c
  where c.lifecycle_stage <> 'descartado'
    and (p_segment is null or p_segment='' or c.segment=p_segment)
    and (p_state is null or p_state='' or c.state=p_state)
    and (p_city is null or p_city='' or c.city ilike '%'||p_city||'%')
    and (p_cnae is null or p_cnae='' or c.cnae_code ilike '%'||p_cnae||'%' or c.cnae_description ilike '%'||p_cnae||'%' or coalesce(c.secondary_cnaes,'') ilike '%'||p_cnae||'%');

  select count(*) into eligible_count from customers c
  where c.lifecycle_stage <> 'descartado'
    and (p_segment is null or p_segment='' or c.segment=p_segment)
    and (p_state is null or p_state='' or c.state=p_state)
    and (p_city is null or p_city='' or c.city ilike '%'||p_city||'%')
    and (p_cnae is null or p_cnae='' or c.cnae_code ilike '%'||p_cnae||'%' or c.cnae_description ilike '%'||p_cnae||'%' or coalesce(c.secondary_cnaes,'') ilike '%'||p_cnae||'%')
    and (case when p_channel in ('whatsapp','multicanal')
      then c.whatsapp_marketing_allowed=true and c.whatsapp_opt_out_at is null and coalesce(nullif(c.phone1,''),nullif(c.phone2,'')) is not null
      else nullif(c.email,'') is not null end);

  return jsonb_build_object('total',total_count,'eligible',eligible_count);
end $$;

revoke all on function public.campaign_audience_preview(text,text,text,text,text) from public;
grant execute on function public.campaign_audience_preview(text,text,text,text,text) to authenticated;

create or replace function public.queue_campaign_whatsapp(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare camp campaigns%rowtype; inserted_count integer:=0; current_count integer:=0; v_city text; v_cnae text;
begin
  if coalesce(((auth.jwt() -> 'app_metadata') ->> 'role'),'') <> 'admin' then raise exception 'not authorized'; end if;
  select * into camp from campaigns where id=p_campaign_id;
  if camp.id is null then raise exception 'campaign not found'; end if;
  if camp.channel not in ('whatsapp','multicanal') then raise exception 'campaign channel does not include whatsapp'; end if;
  v_city:=nullif(camp.audience_filter->>'city',''); v_cnae:=nullif(camp.audience_filter->>'cnae','');

  insert into whatsapp_outbox(customer_id,campaign_id,created_by,recipient,message,status,consent_snapshot)
  select c.id,camp.id,auth.uid(),coalesce(nullif(c.phone1,''),nullif(c.phone2,'')),
    replace(replace(replace(replace(camp.message_template,'{{empresa}}',coalesce(c.trade_name,c.legal_name,'cliente')),'{{cidade}}',coalesce(c.city,'')),'{{estado}}',coalesce(c.state,'')),'{{representada}}',coalesce(camp.brand,'Biasuz Representações')),
    'draft',true
  from customers c
  where c.lifecycle_stage <> 'descartado'
    and (camp.segment is null or camp.segment='' or c.segment=camp.segment)
    and (camp.state is null or camp.state='' or c.state=camp.state)
    and (v_city is null or c.city ilike '%'||v_city||'%')
    and (v_cnae is null or c.cnae_code ilike '%'||v_cnae||'%' or c.cnae_description ilike '%'||v_cnae||'%' or coalesce(c.secondary_cnaes,'') ilike '%'||v_cnae||'%')
    and c.whatsapp_marketing_allowed=true and c.whatsapp_opt_out_at is null
    and coalesce(nullif(c.phone1,''),nullif(c.phone2,'')) is not null
  on conflict do nothing;
  get diagnostics inserted_count = row_count;

  select count(*) into current_count from whatsapp_outbox where campaign_id=camp.id and status <> 'cancelled';
  update campaigns set queued_count=current_count,status=case when current_count>0 and status='draft' then 'paused' else status end,updated_at=now() where id=camp.id;
  return jsonb_build_object('inserted',inserted_count,'queued',current_count);
end $$;

revoke all on function public.queue_campaign_whatsapp(uuid) from public;
grant execute on function public.queue_campaign_whatsapp(uuid) to authenticated;
