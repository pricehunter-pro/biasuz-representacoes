-- Automatically links an authenticated identity to an existing commercial customer by verified e-mail.
create or replace function public.link_portal_profile_from_auth()
returns trigger language plpgsql security definer
set search_path=public,auth
as $$
declare c record;
begin
  if exists(select 1 from public.portal_profiles p where p.user_id=new.id) then return new; end if;
  select id,coalesce(trade_name,legal_name) display_name into c
  from public.customers
  where email is not null and lower(email)=lower(new.email)
  order by lifecycle_stage='cliente' desc, created_at asc
  limit 1;
  if c.id is not null then
    insert into public.portal_profiles(user_id,role,customer_id,display_name,active)
    values(new.id,'cliente',c.id,c.display_name,true)
    on conflict(user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists trg_link_portal_profile_from_auth on auth.users;
create trigger trg_link_portal_profile_from_auth after insert on auth.users
for each row execute function public.link_portal_profile_from_auth();
