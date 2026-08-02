-- REYON Business OS: complete Brand Management milestone.

alter table catalog.brands
  add column description text,
  add column website_url text,
  add column logo_path text,
  add column is_visible boolean not null default true,
  add column archived_at timestamptz,
  add constraint brands_description_present check (description is null or btrim(description) <> ''),
  add constraint brands_website_https check (website_url is null or website_url ~ '^https://'),
  add constraint brands_logo_path_present check (logo_path is null or btrim(logo_path) <> '');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-logos', 'brand-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "REYON admins upload brand logos" on storage.objects for insert to authenticated
with check (bucket_id = 'brand-logos' and public.is_reyon_admin());
create policy "REYON admins update brand logos" on storage.objects for update to authenticated
using (bucket_id = 'brand-logos' and public.is_reyon_admin())
with check (bucket_id = 'brand-logos' and public.is_reyon_admin());
create policy "REYON admins remove brand logos" on storage.objects for delete to authenticated
using (bucket_id = 'brand-logos' and public.is_reyon_admin());

create or replace function public.admin_brands()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when public.is_reyon_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'slug', slug, 'description', description,
    'websiteUrl', website_url, 'logoPath', logo_path, 'isVisible', is_visible,
    'archivedAt', archived_at
  ) order by archived_at nulls first, name), '[]'::jsonb) else null end
  from catalog.brands;
$$;

create or replace function public.admin_create_brand_v2(
  p_name text, p_slug text, p_description text default null,
  p_website_url text default null, p_is_visible boolean default true
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  insert into catalog.brands(name, slug, description, website_url, is_visible)
  values (btrim(p_name), lower(btrim(p_slug)), nullif(btrim(p_description), ''), nullif(btrim(p_website_url), ''), p_is_visible)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_update_brand(
  p_brand_id uuid, p_name text, p_slug text, p_description text,
  p_website_url text, p_logo_path text, p_is_visible boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  update catalog.brands set name=btrim(p_name), slug=lower(btrim(p_slug)),
    description=nullif(btrim(p_description), ''), website_url=nullif(btrim(p_website_url), ''),
    logo_path=coalesce(nullif(btrim(p_logo_path), ''), logo_path), is_visible=p_is_visible
  where id=p_brand_id and archived_at is null;
  if not found then raise exception 'Active brand not found.'; end if;
end;
$$;

create or replace function public.admin_set_brand_archived(p_brand_id uuid, p_archived boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  update catalog.brands set archived_at=case when p_archived then statement_timestamp() else null end,
    is_visible=case when p_archived then false else is_visible end where id=p_brand_id;
  if not found then raise exception 'Brand not found.'; end if;
end;
$$;

revoke all on function public.admin_brands() from public, anon;
revoke all on function public.admin_create_brand_v2(text,text,text,text,boolean) from public, anon;
revoke all on function public.admin_update_brand(uuid,text,text,text,text,text,boolean) from public, anon;
revoke all on function public.admin_set_brand_archived(uuid,boolean) from public, anon;
grant execute on function public.admin_brands() to authenticated;
grant execute on function public.admin_create_brand_v2(text,text,text,text,boolean) to authenticated;
grant execute on function public.admin_update_brand(uuid,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.admin_set_brand_archived(uuid,boolean) to authenticated;
