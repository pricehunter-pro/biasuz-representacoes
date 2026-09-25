-- 2026-09-24: allow representadas to read only customers that have orders with them, then run dashboard via RLS
drop policy if exists representada_read_customers_with_orders on public.customers;
create policy representada_read_customers_with_orders on public.customers
for select to authenticated
using (
  exists (
    select 1
    from public.portal_profiles p
    where p.user_id=(select auth.uid())
      and p.active=true
      and p.role='representada'
      and exists (
        select 1 from public.orders o
        where o.customer_id=customers.id
          and o.representada_id=p.representada_id
      )
  )
);

alter function public.representada_dashboard_metrics(uuid) security invoker;
revoke execute on function public.representada_dashboard_metrics(uuid) from public, anon;
grant execute on function public.representada_dashboard_metrics(uuid) to authenticated;
