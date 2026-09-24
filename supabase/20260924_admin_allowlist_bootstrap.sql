-- Admin allowlist + role bootstrap
create table if not exists public.admin_allowlist(
  email text primary key,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- Insert production admin email manually in the environment; do not commit credentials.

create or replace function public.apply_admin_allowlist()
returns trigger language plpgsql security definer
set search_path=public,auth
as $$
begin
  if exists(select 1 from public.admin_allowlist a where lower(a.email)=lower(new.email) and a.active) then
    update auth.users
      set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('role','admin'),
          raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('display_name','Administrador Geral Biasuz','must_change_password',true)
    where id=new.id;
    insert into public.portal_profiles(user_id,role,display_name,active)
    values(new.id,'admin','Administrador Geral Biasuz',true)
    on conflict(user_id) do update set role='admin',display_name='Administrador Geral Biasuz',active=true;
  end if;
  return new;
end $$;

drop trigger if exists trg_apply_admin_allowlist on auth.users;
create trigger trg_apply_admin_allowlist after insert on auth.users
for each row execute function public.apply_admin_allowlist();

alter table public.admin_allowlist enable row level security;
revoke all on public.admin_allowlist from anon,authenticated;
