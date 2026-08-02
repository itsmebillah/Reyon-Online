-- REYON Business OS: reusable database-driven product collections.

create table catalog.product_collections (
  id uuid primary key default gen_random_uuid(),
  collection_key text not null,
  name text not null,
  strategy_key text not null,
  is_enabled boolean not null default false,
  item_limit integer not null default 4,
  display_order integer not null default 0,
  ranking_period_days integer,
  low_stock_threshold integer,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint product_collections_key_format check (collection_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint product_collections_key_unique unique (collection_key),
  constraint product_collections_name_present check (btrim(name) <> ''),
  constraint product_collections_strategy_approved check (strategy_key in (
    'newest-published', 'completed-sales', 'engagement', 'manual',
    'promotional-price', 'low-stock', 'out-of-stock', 'trending', 'personalized'
  )),
  constraint product_collections_item_limit_valid check (item_limit between 1 and 24),
  constraint product_collections_period_valid check (ranking_period_days is null or ranking_period_days between 1 and 3650),
  constraint product_collections_threshold_valid check (low_stock_threshold is null or low_stock_threshold >= 0)
);

create table catalog.product_collection_pins (
  collection_id uuid not null references catalog.product_collections(id) on delete cascade,
  product_id uuid not null references catalog.products(id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  primary key (collection_id, product_id),
  constraint product_collection_pins_order_valid check (display_order >= 0)
);

create index product_collection_pins_order_idx
  on catalog.product_collection_pins(collection_id, display_order, created_at);

create trigger product_collections_set_updated_at before update on catalog.product_collections
for each row execute function catalog.set_updated_at();

alter table catalog.product_collections enable row level security;
alter table catalog.product_collection_pins enable row level security;
revoke all on catalog.product_collections, catalog.product_collection_pins from public, anon, authenticated;
grant all on catalog.product_collections, catalog.product_collection_pins to service_role;

insert into catalog.product_collections
  (collection_key, name, strategy_key, is_enabled, item_limit, display_order, ranking_period_days, low_stock_threshold)
values
  ('new-arrivals', 'New Arrivals', 'newest-published', true, 4, 10, null, null),
  ('bestsellers', 'Bestsellers', 'completed-sales', false, 4, 20, 30, null),
  ('most-loved', 'Most Loved', 'engagement', true, 4, 30, 90, null),
  ('featured-products', 'Featured Products', 'manual', true, 4, 40, null, null),
  ('on-sale', 'On Sale', 'promotional-price', true, 4, 50, null, null),
  ('low-stock', 'Low Stock', 'low-stock', false, 4, 60, null, 5),
  ('out-of-stock', 'Out of Stock', 'out-of-stock', false, 4, 70, null, null),
  ('trending', 'Trending', 'trending', false, 4, 80, 30, null),
  ('recommended-products', 'Recommended Products', 'personalized', false, 4, 90, null, null);

create or replace function public.dynamic_collection(p_collection_key text)
returns table(
  id uuid, slug text, name text, brand_id uuid, brand_slug text, brand_name text,
  category_id uuid, category_slug text, category_name text, category_display_order integer,
  variant_label text, sku text, price_amount numeric, compare_at_amount numeric,
  availability_label text, image_url text, image_alt text, published_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  with configuration as (
    select * from catalog.product_collections
    where collection_key = lower(btrim(p_collection_key)) and is_enabled
  ), eligible as (
    select pc.*, pins.display_order as pin_order,
      exists (
        select 1 from catalog.variants v
        join catalog.variant_prices vp on vp.variant_id = v.id and vp.price_type = 'discount'
        where v.product_id = pc.id
      ) as has_promotion
    from public.published_catalog() pc
    left join configuration cfg on true
    left join catalog.product_collection_pins pins
      on pins.collection_id = cfg.id and pins.product_id = pc.id
    where cfg.id is not null and (
      pins.product_id is not null
      or cfg.strategy_key = 'newest-published'
      or (cfg.strategy_key = 'promotional-price' and exists (
        select 1 from catalog.variants v
        join catalog.variant_prices vp on vp.variant_id = v.id and vp.price_type = 'discount'
        where v.product_id = pc.id
      ))
    )
  )
  select e.id, e.slug, e.name, e.brand_id, e.brand_slug, e.brand_name,
    e.category_id, e.category_slug, e.category_name, e.category_display_order,
    e.variant_label, e.sku, e.price_amount, e.compare_at_amount,
    e.availability_label, e.image_url, e.image_alt, e.published_at
  from eligible e cross join configuration cfg
  order by (e.pin_order is null), e.pin_order, e.published_at desc, e.id
  limit (select item_limit from configuration);
$$;

create or replace function public.admin_product_collections()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when public.is_reyon_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'key', c.collection_key, 'name', c.name, 'strategy', c.strategy_key,
    'isEnabled', c.is_enabled, 'itemLimit', c.item_limit, 'displayOrder', c.display_order,
    'rankingPeriodDays', c.ranking_period_days, 'lowStockThreshold', c.low_stock_threshold,
    'createdAt', c.created_at, 'updatedAt', c.updated_at,
    'pins', coalesce((select jsonb_agg(jsonb_build_object(
      'productId', p.product_id, 'productName', pr.name, 'displayOrder', p.display_order
    ) order by p.display_order, p.created_at) from catalog.product_collection_pins p
      join catalog.products pr on pr.id = p.product_id where p.collection_id = c.id), '[]'::jsonb)
  ) order by c.display_order, c.name), '[]'::jsonb) else null end
  from catalog.product_collections c;
$$;

create or replace function public.homepage_product_collections()
returns table(
  collection_key text, collection_name text, collection_display_order integer,
  id uuid, slug text, name text, brand_id uuid, brand_slug text, brand_name text,
  category_id uuid, category_slug text, category_name text, category_display_order integer,
  variant_label text, sku text, price_amount numeric, compare_at_amount numeric,
  availability_label text, image_url text, image_alt text, published_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select c.collection_key, c.name, c.display_order,
    p.id, p.slug, p.name, p.brand_id, p.brand_slug, p.brand_name,
    p.category_id, p.category_slug, p.category_name, p.category_display_order,
    p.variant_label, p.sku, p.price_amount, p.compare_at_amount,
    p.availability_label, p.image_url, p.image_alt, p.published_at
  from catalog.product_collections c
  cross join lateral public.dynamic_collection(c.collection_key) p
  where c.is_enabled
  order by c.display_order, c.collection_key, p.published_at desc, p.id;
$$;

create or replace function public.admin_update_product_collection(
  p_collection_id uuid, p_name text, p_is_enabled boolean, p_item_limit integer,
  p_display_order integer, p_ranking_period_days integer, p_low_stock_threshold integer
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  update catalog.product_collections set name=btrim(p_name), is_enabled=p_is_enabled,
    item_limit=p_item_limit, display_order=greatest(p_display_order, 0),
    ranking_period_days=p_ranking_period_days, low_stock_threshold=p_low_stock_threshold
  where id=p_collection_id;
  if not found then raise exception 'Collection not found.'; end if;
end;
$$;

create or replace function public.admin_set_collection_pin(
  p_collection_id uuid, p_product_id uuid, p_is_pinned boolean, p_display_order integer default 0
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  if p_is_pinned then
    insert into catalog.product_collection_pins(collection_id, product_id, display_order)
    values (p_collection_id, p_product_id, greatest(p_display_order, 0))
    on conflict (collection_id, product_id) do update set display_order=excluded.display_order;
  else
    delete from catalog.product_collection_pins where collection_id=p_collection_id and product_id=p_product_id;
  end if;
end;
$$;

revoke all on function public.dynamic_collection(text) from public;
revoke all on function public.homepage_product_collections() from public;
revoke all on function public.admin_product_collections() from public, anon;
revoke all on function public.admin_update_product_collection(uuid,text,boolean,integer,integer,integer,integer) from public, anon;
revoke all on function public.admin_set_collection_pin(uuid,uuid,boolean,integer) from public, anon;
grant execute on function public.dynamic_collection(text) to anon, authenticated;
grant execute on function public.homepage_product_collections() to anon, authenticated;
grant execute on function public.admin_product_collections() to authenticated;
grant execute on function public.admin_update_product_collection(uuid,text,boolean,integer,integer,integer,integer) to authenticated;
grant execute on function public.admin_set_collection_pin(uuid,uuid,boolean,integer) to authenticated;
