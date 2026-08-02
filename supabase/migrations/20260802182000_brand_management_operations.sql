-- REYON Business OS: operational Brand Management controls.

alter table catalog.brands
  add column country_code text,
  add column display_order integer not null default 0,
  add column is_featured boolean not null default false,
  add constraint brands_country_code_format check (country_code is null or country_code ~ '^[A-Z]{2}$');

create unique index brands_name_case_insensitive_unique
  on catalog.brands (lower(btrim(name)));

create or replace function public.admin_brands()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when public.is_reyon_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'slug', slug, 'description', description,
    'websiteUrl', website_url, 'logoPath', logo_path, 'countryCode', country_code,
    'displayOrder', display_order, 'isFeatured', is_featured, 'isVisible', is_visible,
    'archivedAt', archived_at, 'createdAt', created_at, 'updatedAt', updated_at
  ) order by archived_at nulls first, display_order, name), '[]'::jsonb) else null end
  from catalog.brands;
$$;

create or replace function public.admin_create_brand_v3(
  p_name text, p_slug text, p_description text default null,
  p_website_url text default null, p_country_code text default null,
  p_display_order integer default 0, p_is_featured boolean default false,
  p_is_visible boolean default true
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  insert into catalog.brands(name, slug, description, website_url, country_code,
    display_order, is_featured, is_visible)
  values (btrim(p_name), lower(btrim(p_slug)), nullif(btrim(p_description), ''),
    nullif(btrim(p_website_url), ''), nullif(upper(btrim(p_country_code)), ''),
    greatest(p_display_order, 0), p_is_featured, p_is_visible)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_update_brand_v2(
  p_brand_id uuid, p_name text, p_slug text, p_description text,
  p_website_url text, p_logo_path text, p_country_code text,
  p_display_order integer, p_is_featured boolean, p_is_visible boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  update catalog.brands set name=btrim(p_name), slug=lower(btrim(p_slug)),
    description=nullif(btrim(p_description), ''), website_url=nullif(btrim(p_website_url), ''),
    logo_path=coalesce(nullif(btrim(p_logo_path), ''), logo_path),
    country_code=nullif(upper(btrim(p_country_code)), ''),
    display_order=greatest(p_display_order, 0), is_featured=p_is_featured, is_visible=p_is_visible
  where id=p_brand_id and archived_at is null;
  if not found then raise exception 'Active brand not found.'; end if;
end;
$$;

revoke all on function public.admin_create_brand_v3(text,text,text,text,text,integer,boolean,boolean) from public, anon;
revoke all on function public.admin_update_brand_v2(uuid,text,text,text,text,text,text,integer,boolean,boolean) from public, anon;
grant execute on function public.admin_create_brand_v3(text,text,text,text,text,integer,boolean,boolean) to authenticated;
grant execute on function public.admin_update_brand_v2(uuid,text,text,text,text,text,text,integer,boolean,boolean) to authenticated;
