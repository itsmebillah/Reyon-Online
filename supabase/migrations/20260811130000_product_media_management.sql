-- REYON Business OS: approved Product Media Management.

alter table catalog.product_media
  add column object_path text,
  add column mime_type text,
  add column width_pixels integer,
  add column height_pixels integer,
  add column licensing_confirmed_at timestamptz,
  add column uploaded_by text,
  add constraint product_media_object_path_present check (object_path is null or btrim(object_path) <> ''),
  add constraint product_media_mime_approved check (mime_type is null or mime_type in ('image/jpeg','image/png','image/webp')),
  add constraint product_media_dimensions_valid check (
    (width_pixels is null and height_pixels is null) or
    (width_pixels >= 800 and height_pixels >= 800)
  ),
  add constraint product_media_license_actor_present check (uploaded_by is null or btrim(uploaded_by) <> '');

update catalog.product_media m set alt_text=p.name
from catalog.products p where p.id=m.product_id and m.alt_text is null;
alter table catalog.product_media alter column alt_text set not null;
create unique index product_media_object_path_unique
  on catalog.product_media(object_path) where object_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy "REYON admins read product media" on storage.objects for select to authenticated
using (bucket_id='product-media' and public.is_reyon_admin());
create policy "REYON admins upload product media" on storage.objects for insert to authenticated
with check (bucket_id='product-media' and public.is_reyon_admin());
create policy "REYON admins update product media" on storage.objects for update to authenticated
using (bucket_id='product-media' and public.is_reyon_admin())
with check (bucket_id='product-media' and public.is_reyon_admin());
create policy "REYON admins remove product media" on storage.objects for delete to authenticated
using (bucket_id='product-media' and public.is_reyon_admin());

create or replace function catalog.normalize_product_media(p_product_id uuid)
returns void language sql set search_path=''
as $$
  with ordered as (
    select id, row_number() over (order by is_primary desc, display_order, created_at, id)-1 as position
    from catalog.product_media where product_id=p_product_id
  )
  update catalog.product_media m set display_order=o.position
  from ordered o where m.id=o.id;
$$;
revoke all on function catalog.normalize_product_media(uuid) from public, anon, authenticated;

create or replace function public.admin_product_media()
returns jsonb language sql stable security definer set search_path=''
as $$
  select case when public.is_reyon_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'slug', p.slug, 'status', p.status, 'brand', b.name,
    'media', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'url', m.storage_path, 'objectPath', m.object_path,
      'altText', m.alt_text, 'displayOrder', m.display_order, 'isPrimary', m.is_primary,
      'mimeType', m.mime_type, 'width', m.width_pixels, 'height', m.height_pixels,
      'licensingConfirmedAt', m.licensing_confirmed_at, 'createdAt', m.created_at,
      'updatedAt', m.updated_at
    ) order by m.display_order, m.created_at, m.id) from catalog.product_media m where m.product_id=p.id), '[]'::jsonb)
  ) order by p.updated_at desc, p.name), '[]'::jsonb) else null end
  from catalog.products p join catalog.brands b on b.id=p.brand_id;
$$;

create or replace function public.admin_add_product_media(
  p_product_id uuid, p_url text, p_object_path text, p_alt_text text,
  p_mime_type text, p_width integer, p_height integer
) returns uuid language plpgsql security definer set search_path=''
as $$
declare new_id uuid; media_count integer; actor text:=coalesce(auth.jwt()->>'email',auth.uid()::text);
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  perform 1 from catalog.products where id=p_product_id for update;
  if not found then raise exception 'Product not found.'; end if;
  select count(*) into media_count from catalog.product_media where product_id=p_product_id;
  if media_count>=12 then raise exception 'A product can have no more than 12 images.'; end if;
  insert into catalog.product_media(product_id,storage_path,object_path,alt_text,display_order,is_primary,
    mime_type,width_pixels,height_pixels,licensing_confirmed_at,uploaded_by)
  values(p_product_id,btrim(p_url),btrim(p_object_path),btrim(p_alt_text),media_count,media_count=0,
    p_mime_type,p_width,p_height,statement_timestamp(),actor) returning id into new_id;
  perform catalog.normalize_product_media(p_product_id);
  return new_id;
end;
$$;

create or replace function public.admin_update_product_media(
  p_media_id uuid, p_alt_text text, p_display_order integer, p_is_primary boolean
) returns void language plpgsql security definer set search_path=''
as $$
declare target_product uuid;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  select product_id into target_product from catalog.product_media where id=p_media_id;
  if target_product is null then raise exception 'Product image not found.'; end if;
  if p_is_primary then
    update catalog.product_media set is_primary=false where product_id=target_product and is_primary;
  end if;
  update catalog.product_media set alt_text=btrim(p_alt_text), display_order=greatest(p_display_order,0),
    is_primary=case when p_is_primary then true else is_primary end where id=p_media_id;
  perform catalog.normalize_product_media(target_product);
end;
$$;

create or replace function public.admin_replace_product_media(
  p_media_id uuid, p_url text, p_object_path text, p_alt_text text,
  p_mime_type text, p_width integer, p_height integer
) returns text language plpgsql security definer set search_path=''
as $$
declare old_path text;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  select object_path into old_path from catalog.product_media where id=p_media_id for update;
  if not found then raise exception 'Product image not found.'; end if;
  update catalog.product_media set storage_path=btrim(p_url), object_path=btrim(p_object_path),
    alt_text=btrim(p_alt_text), mime_type=p_mime_type, width_pixels=p_width, height_pixels=p_height,
    licensing_confirmed_at=statement_timestamp(), uploaded_by=coalesce(auth.jwt()->>'email',auth.uid()::text)
  where id=p_media_id;
  return old_path;
end;
$$;

create or replace function public.admin_remove_product_media(p_media_id uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare target_product uuid; old_path text; media_count integer;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  select product_id,object_path into target_product,old_path from catalog.product_media where id=p_media_id for update;
  if target_product is null then raise exception 'Product image not found.'; end if;
  perform 1 from catalog.products where id=target_product for update;
  select count(*) into media_count from catalog.product_media where product_id=target_product;
  if media_count<=1 then raise exception 'Every product must retain at least one image.'; end if;
  delete from catalog.product_media where id=p_media_id;
  update catalog.product_media set is_primary=false where product_id=target_product and is_primary;
  update catalog.product_media set is_primary=true where id=(
    select id from catalog.product_media where product_id=target_product order by display_order,created_at,id limit 1
  );
  perform catalog.normalize_product_media(target_product);
  return old_path;
end;
$$;

create or replace function public.admin_media_object_is_referenced(p_object_path text)
returns boolean language sql stable security definer set search_path=''
as $$ select public.is_reyon_admin() and exists(select 1 from catalog.product_media where object_path=p_object_path); $$;

revoke all on function public.admin_product_media() from public,anon;
revoke all on function public.admin_add_product_media(uuid,text,text,text,text,integer,integer) from public,anon;
revoke all on function public.admin_update_product_media(uuid,text,integer,boolean) from public,anon;
revoke all on function public.admin_replace_product_media(uuid,text,text,text,text,integer,integer) from public,anon;
revoke all on function public.admin_remove_product_media(uuid) from public,anon;
revoke all on function public.admin_media_object_is_referenced(text) from public,anon;
grant execute on function public.admin_product_media() to authenticated;
grant execute on function public.admin_add_product_media(uuid,text,text,text,text,integer,integer) to authenticated;
grant execute on function public.admin_update_product_media(uuid,text,integer,boolean) to authenticated;
grant execute on function public.admin_replace_product_media(uuid,text,text,text,text,integer,integer) to authenticated;
grant execute on function public.admin_remove_product_media(uuid) to authenticated;
grant execute on function public.admin_media_object_is_referenced(text) to authenticated;
