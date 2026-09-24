-- Catalog file deduplication/versioning and new represented brands introduced by real PDF catalogs.
alter table public.catalogs
  add column if not exists file_sha256 text,
  add column if not exists version_status text not null default 'current'
    check(version_status in ('current','historical','draft')),
  add column if not exists compliance_notes text;
create unique index if not exists catalogs_file_sha256_unique
  on public.catalogs(file_sha256) where file_sha256 is not null;
update storage.buckets set file_size_limit=209715200 where id='catalogs';

insert into public.representadas(name,slug,official_url,segments,description,active,catalog_status)
values
 ('ALVA Personal Care','alva-personal-care','https://alvapersonalcare.com.br/',array['Farma'],'Cuidados pessoais, desodorantes naturais, oral care, kids e body & hair.',true,'pending'),
 ('SerPet Nutrition','serpet-nutrition','https://serpetnutrition.com.br/',array['Pet'],'Alimentos para cães e gatos das linhas Jack Pet, Jack Cat e demais marcas SerPet.',true,'pending'),
 ('Natuzinho','natuzinho','https://www.brasgroup.com.br/natuzinho',array['Farma'],'Linha de alimentação infantil da Brasgroup.',true,'pending')
on conflict(slug) do update set official_url=excluded.official_url,segments=excluded.segments,description=excluded.description,active=true;
