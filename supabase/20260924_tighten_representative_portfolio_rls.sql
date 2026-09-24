-- Representatives can only read their assigned customer portfolio and orders.
drop policy if exists portal_read_linked_customer on public.customers;
create policy portal_read_linked_customer on public.customers for select to authenticated
using (
  exists (
    select 1 from public.portal_profiles p
    where p.user_id=(select auth.uid()) and p.active=true and (
      p.role='admin'
      or (p.role='cliente' and p.customer_id=customers.id)
      or (p.role='representante' and exists(
        select 1 from public.salespeople s
        where s.id=customers.salesperson_id and s.user_id=p.user_id and s.active=true
      ))
    )
  )
);

drop policy if exists portal_read_orders on public.orders;
create policy portal_read_orders on public.orders for select to authenticated
using (
  exists (
    select 1 from public.portal_profiles p
    where p.user_id=(select auth.uid()) and p.active=true and (
      p.role='admin'
      or (p.role='cliente' and p.customer_id=orders.customer_id)
      or (p.role='representada' and p.representada_id=orders.representada_id)
      or (p.role='representante' and (
        orders.representative_user_id=p.user_id
        or exists(
          select 1 from public.salespeople s
          where s.id=orders.salesperson_id and s.user_id=p.user_id and s.active=true
        )
      ))
    )
  )
);
