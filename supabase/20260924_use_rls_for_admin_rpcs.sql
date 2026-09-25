-- 2026-09-24: run admin RPCs as invoker so existing RLS stays authoritative
alter function public.admin_dashboard_insights() security invoker;
alter function public.apply_price_sheet_import(uuid) security invoker;

revoke execute on function public.apply_price_sheet_import(uuid) from public, anon;
grant execute on function public.apply_price_sheet_import(uuid) to authenticated;
