-- REYON Business OS: complete Category Management milestone.

alter table catalog.categories
  add column description text,
  add column is_visible boolean not null default true,
  add column archived_at timestamptz,
  add constraint categories_description_present check (description is null or btrim(description) <> '');

create or replace function public.admin_categories()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when public.is_reyon_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'slug', c.slug, 'description', c.description,
    'parentId', c.parent_id, 'parentName', p.name, 'displayOrder', c.display_order,
    'isVisible', c.is_visible, 'archivedAt', c.archived_at
  ) order by c.archived_at nulls first, c.display_order, c.name), '[]'::jsonb) else null end
  from catalog.categories c left join catalog.categories p on p.id = c.parent_id;
$$;

create or replace function public.admin_create_category_v2(
  p_name text, p_slug text, p_description text default null,
  p_parent_id uuid default null, p_display_order integer default 0,
  p_is_visible boolean default true
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  insert into catalog.categories(name, slug, description, parent_id, display_order, is_visible)
  values (btrim(p_name), lower(btrim(p_slug)), nullif(btrim(p_description), ''), p_parent_id, p_display_order, p_is_visible)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_update_category(
  p_category_id uuid, p_name text, p_slug text, p_description text,
  p_parent_id uuid, p_display_order integer, p_is_visible boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  if p_parent_id is not null and exists (
    with recursive descendants as (
      select id from catalog.categories where parent_id = p_category_id
      union all
      select c.id from catalog.categories c join descendants d on c.parent_id = d.id
    ) select 1 from descendants where id = p_parent_id
  ) then raise exception 'A category cannot be moved beneath its descendant.'; end if;
  update catalog.categories set name=btrim(p_name), slug=lower(btrim(p_slug)),
    description=nullif(btrim(p_description), ''), parent_id=p_parent_id,
    display_order=p_display_order, is_visible=p_is_visible
  where id=p_category_id and archived_at is null;
  if not found then raise exception 'Active category not found.'; end if;
end;
$$;

create or replace function public.admin_set_category_archived(p_category_id uuid, p_archived boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  update catalog.categories set archived_at=case when p_archived then statement_timestamp() else null end,
    is_visible=case when p_archived then false else is_visible end where id=p_category_id;
  if not found then raise exception 'Category not found.'; end if;
end;
$$;

create or replace function public.visible_categories()
returns table(id uuid, slug text, name text, display_order integer)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.slug, c.name, c.display_order from catalog.categories c
  where c.is_visible and c.archived_at is null order by c.display_order, c.name;
$$;

revoke all on function public.admin_categories() from public, anon;
revoke all on function public.admin_create_category_v2(text,text,text,uuid,integer,boolean) from public, anon;
revoke all on function public.admin_update_category(uuid,text,text,text,uuid,integer,boolean) from public, anon;
revoke all on function public.admin_set_category_archived(uuid,boolean) from public, anon;
grant execute on function public.admin_categories() to authenticated;
grant execute on function public.admin_create_category_v2(text,text,text,uuid,integer,boolean) to authenticated;
grant execute on function public.admin_update_category(uuid,text,text,text,uuid,integer,boolean) to authenticated;
grant execute on function public.admin_set_category_archived(uuid,boolean) to authenticated;
grant execute on function public.visible_categories() to anon, authenticated;

-- Hidden or archived categories cannot expose products on customer channels.
create or replace function public.published_catalog()
returns table(
  id uuid, slug text, name text, brand_id uuid, brand_slug text, brand_name text,
  category_id uuid, category_slug text, category_name text, category_display_order integer,
  variant_label text, sku text, price_amount numeric, compare_at_amount numeric,
  availability_label text, image_url text, image_alt text, published_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.slug, p.name, b.id, b.slug, b.name,
    c.id, c.slug, c.name, c.display_order, v.label, v.sku,
    o.price_amount, o.compare_at_amount, coalesce(o.availability_label, 'In stock'),
    m.storage_path, coalesce(m.alt_text, p.name),
    coalesce((select max(e.occurred_at) from catalog.product_status_events e where e.product_id = p.id and e.to_status = 'published'), p.updated_at)
  from catalog.products p
  join catalog.brands b on b.id = p.brand_id and b.is_visible and b.archived_at is null
  join catalog.product_categories pc on pc.product_id = p.id and pc.is_primary
  join catalog.categories c on c.id = pc.category_id and c.is_visible and c.archived_at is null
  join lateral (select * from catalog.variants x where x.product_id = p.id order by x.created_at, x.id limit 1) v on true
  join catalog.offers o on o.variant_id = v.id and o.channel_key = 'website'
  join lateral (select * from catalog.product_media x where x.product_id = p.id order by x.display_order, x.created_at, x.id limit 1) m on true
  where p.status = 'published';
$$;
