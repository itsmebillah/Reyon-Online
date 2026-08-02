-- Brand visibility and archival state control customer catalog exposure.
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
  join catalog.categories c on c.id = pc.category_id
  join lateral (select * from catalog.variants x where x.product_id = p.id order by x.created_at, x.id limit 1) v on true
  join catalog.offers o on o.variant_id = v.id and o.channel_key = 'website'
  join lateral (select * from catalog.product_media x where x.product_id = p.id order by x.display_order, x.created_at, x.id limit 1) m on true
  where p.status = 'published';
$$;
