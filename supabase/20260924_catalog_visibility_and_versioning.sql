-- Catalog versioning, confidentiality and compliance visibility
alter table public.catalogs
  add column if not exists version_status text not null default 'current',
  add column if not exists visibility text not null default 'portal',
  add column if not exists compliance_notes text;

do $$ begin
  alter table public.catalogs add constraint catalogs_version_status_check
    check(version_status in ('current','historical','superseded','draft'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.catalogs add constraint catalogs_visibility_check
    check(visibility in ('internal','portal','shareable'));
exception when duplicate_object then null; end $$;

-- Historical versions
update public.catalogs set version_status='historical',published=false
where slug in ('jambo-pet-catalogo-2025','familia-de-estimacao-catalogo-anterior','german-hart-2026','toh-colecao-2025-2026');

-- Confidential material
update public.catalogs set visibility='internal',published=false,
 compliance_notes='Material marcado como confidencial na própria fonte; não compartilhar externamente.'
where slug='natuzinho-antecipacao-2026';

-- Veterinary/regulatory review before external use
update public.catalogs set visibility='internal',published=false,
 compliance_notes='Catálogo veterinário sujeito a revisão regulatória/comercial antes de disponibilização para pedido ou compartilhamento.'
where slug in ('farex-catalogo-pets-2026','farex-catalogo-equinos-2026','farex-catalogo-2025');

update public.catalogs set visibility='shareable' where published=true and visibility='portal';

drop policy if exists catalogs_published_read on public.catalogs;
create policy catalogs_published_read on public.catalogs for select to authenticated
using (published=true and visibility in ('portal','shareable'));
