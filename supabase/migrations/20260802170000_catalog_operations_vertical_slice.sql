-- REYON Business OS: operational catalog administration vertical slice.
-- Authenticated administrators write through narrow security-definer functions.
-- Customer reads expose Published products only and omit private purchase facts.

create or replace function public.admin_create_brand(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare new_id uuid;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  insert into catalog.brands(name, slug) values (btrim(p_name), lower(btrim(p_slug))) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_create_category(p_name text, p_slug text, p_parent_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare new_id uuid;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  insert into catalog.categories(name, slug, parent_id)
  values (btrim(p_name), lower(btrim(p_slug)), p_parent_id) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_catalog_options()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_reyon_admin() then jsonb_build_object(
    'brands', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug) order by name) from catalog.brands), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'parentId', parent_id) order by display_order, name) from catalog.categories), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'slug', p.slug, 'status', p.status, 'brand', b.name) order by p.created_at desc) from catalog.products p join catalog.brands b on b.id = p.brand_id), '[]'::jsonb)
  ) else null end;
$$;

create or replace function public.admin_create_product(
  p_name text,
  p_slug text,
  p_brand_id uuid,
  p_category_id uuid,
  p_variant_type text,
  p_variant_label text,
  p_sku text,
  p_barcode text,
  p_purchase_price numeric,
  p_selling_price numeric,
  p_compare_at_price numeric,
  p_discount_price numeric,
  p_image_url text,
  p_image_alt text,
  p_country_code text,
  p_product_code text,
  p_publish boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_product_id uuid;
  new_variant_id uuid;
  actor text := coalesce(auth.jwt() ->> 'email', auth.uid()::text);
  web_price numeric;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  if p_selling_price is null then raise exception 'Selling Price is required.'; end if;
  if p_image_url is null or btrim(p_image_url) !~ '^https://' then raise exception 'A secure HTTPS image URL is required.'; end if;

  insert into catalog.products(brand_id, slug, name, country_of_origin_code, product_code)
  values (p_brand_id, lower(btrim(p_slug)), btrim(p_name), nullif(upper(btrim(p_country_code)), ''), nullif(btrim(p_product_code), ''))
  returning id into new_product_id;

  insert into catalog.product_categories(product_id, category_id, is_primary)
  values (new_product_id, p_category_id, true);

  insert into catalog.product_media(product_id, storage_path, alt_text, display_order, is_primary)
  values (new_product_id, btrim(p_image_url), coalesce(nullif(btrim(p_image_alt), ''), btrim(p_name)), 0, true);

  insert into catalog.variants(product_id, variant_type, label, sku, barcode)
  values (new_product_id, p_variant_type, btrim(p_variant_label), nullif(btrim(p_sku), ''), nullif(btrim(p_barcode), ''))
  returning id into new_variant_id;

  if p_purchase_price is not null then insert into catalog.variant_prices(variant_id, price_type, currency_code, amount) values (new_variant_id, 'purchase', 'BDT', p_purchase_price); end if;
  insert into catalog.variant_prices(variant_id, price_type, currency_code, amount) values (new_variant_id, 'selling', 'BDT', p_selling_price);
  if p_compare_at_price is not null then insert into catalog.variant_prices(variant_id, price_type, currency_code, amount) values (new_variant_id, 'compare-at', 'BDT', p_compare_at_price); end if;
  if p_discount_price is not null then insert into catalog.variant_prices(variant_id, price_type, currency_code, amount) values (new_variant_id, 'discount', 'BDT', p_discount_price); end if;

  web_price := coalesce(p_discount_price, p_selling_price);
  insert into catalog.offers(variant_id, channel_key, currency_code, price_amount, compare_at_amount, availability_label)
  values (new_variant_id, 'website', 'BDT', web_price, coalesce(p_compare_at_price, case when p_discount_price is not null then p_selling_price end), 'In stock');

  if p_publish then
    perform catalog.transition_product_status(new_product_id, 'draft', 'review', actor, 'Submitted by administrator');
    perform catalog.transition_product_status(new_product_id, 'review', 'approved', actor, 'Approved by administrator');
    perform catalog.transition_product_status(new_product_id, 'approved', 'published', actor, 'Published by administrator');
  end if;
  return new_product_id;
end;
$$;

create or replace function public.published_catalog()
returns table(
  id uuid, slug text, name text, brand_id uuid, brand_slug text, brand_name text,
  category_id uuid, category_slug text, category_name text, category_display_order integer,
  variant_label text, sku text, price_amount numeric, compare_at_amount numeric,
  availability_label text, image_url text, image_alt text, published_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.slug, p.name, b.id, b.slug, b.name,
    c.id, c.slug, c.name, c.display_order, v.label, v.sku,
    o.price_amount, o.compare_at_amount, coalesce(o.availability_label, 'In stock'),
    m.storage_path, coalesce(m.alt_text, p.name),
    coalesce((select max(e.occurred_at) from catalog.product_status_events e where e.product_id = p.id and e.to_status = 'published'), p.updated_at)
  from catalog.products p
  join catalog.brands b on b.id = p.brand_id
  join catalog.product_categories pc on pc.product_id = p.id and pc.is_primary
  join catalog.categories c on c.id = pc.category_id
  join lateral (select * from catalog.variants x where x.product_id = p.id order by x.created_at, x.id limit 1) v on true
  join catalog.offers o on o.variant_id = v.id and o.channel_key = 'website'
  join lateral (select * from catalog.product_media x where x.product_id = p.id order by x.display_order, x.created_at, x.id limit 1) m on true
  where p.status = 'published';
$$;

revoke all on function public.admin_create_brand(text, text) from public, anon;
revoke all on function public.admin_create_category(text, text, uuid) from public, anon;
revoke all on function public.admin_catalog_options() from public, anon;
revoke all on function public.admin_create_product(text,text,uuid,uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,text,text,text,boolean) from public, anon;
grant execute on function public.admin_create_brand(text, text) to authenticated;
grant execute on function public.admin_create_category(text, text, uuid) to authenticated;
grant execute on function public.admin_catalog_options() to authenticated;
grant execute on function public.admin_create_product(text,text,uuid,uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,text,text,text,boolean) to authenticated;
grant execute on function public.published_catalog() to anon, authenticated;
