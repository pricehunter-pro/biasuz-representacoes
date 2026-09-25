-- 2026-09-24: rely on RLS for campaign queue RPCs
alter function public.campaign_audience_preview(text,text,text,text,text) security invoker;
alter function public.queue_campaign_whatsapp(uuid) security invoker;
revoke execute on function public.campaign_audience_preview(text,text,text,text,text) from public, anon;
revoke execute on function public.queue_campaign_whatsapp(uuid) from public, anon;
grant execute on function public.campaign_audience_preview(text,text,text,text,text) to authenticated;
grant execute on function public.queue_campaign_whatsapp(uuid) to authenticated;
