-- Restrict trigger-only SECURITY DEFINER functions from direct API/RPC calls.
revoke all on function public.apply_admin_allowlist() from public, anon, authenticated;
revoke all on function public.link_portal_profile_from_auth() from public, anon, authenticated;
grant execute on function public.apply_admin_allowlist() to postgres, service_role;
grant execute on function public.link_portal_profile_from_auth() to postgres, service_role;
