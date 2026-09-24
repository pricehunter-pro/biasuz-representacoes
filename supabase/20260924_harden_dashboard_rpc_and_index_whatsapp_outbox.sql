-- 2026-09-24: harden dashboard RPC exposure and index assisted WhatsApp queue
revoke execute on function public.admin_dashboard_insights() from anon;
revoke execute on function public.representada_dashboard_metrics(uuid) from anon;

create index if not exists whatsapp_outbox_customer_idx on public.whatsapp_outbox(customer_id);
create index if not exists whatsapp_outbox_campaign_idx on public.whatsapp_outbox(campaign_id);
create index if not exists whatsapp_outbox_salesperson_idx on public.whatsapp_outbox(salesperson_id);
create index if not exists whatsapp_outbox_created_by_idx on public.whatsapp_outbox(created_by);
create index if not exists whatsapp_outbox_status_created_idx on public.whatsapp_outbox(status,created_at desc);
