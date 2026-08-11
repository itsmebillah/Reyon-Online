-- REYON Business OS: Sprint 15 persistent guest Cart.

create schema if not exists commerce;
revoke all on schema commerce from public, anon, authenticated;
grant usage on schema commerce to service_role;

create table commerce.carts (
  id uuid primary key default gen_random_uuid(),
  access_token uuid not null default gen_random_uuid() unique,
  customer_id uuid references crm.customers(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  last_activity_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null default statement_timestamp() + interval '30 days',
  constraint carts_expiry_valid check (expires_at >= last_activity_at)
);

create table commerce.cart_items (
  cart_id uuid not null references commerce.carts(id) on delete cascade,
  variant_id uuid not null references catalog.variants(id) on delete restrict,
  quantity integer not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (cart_id, variant_id),
  constraint cart_items_quantity_approved check (quantity between 1 and 10)
);

create table commerce.cart_settings (
  singleton boolean primary key default true check (singleton),
  retention_days integer not null default 30 check (retention_days > 0),
  active_window_hours integer not null default 24 check (active_window_hours > 0),
  social_proof_minimum integer check (social_proof_minimum is null or social_proof_minimum > 1),
  updated_at timestamptz not null default statement_timestamp()
);
insert into commerce.cart_settings(singleton) values (true);

create index carts_expiry_idx on commerce.carts(expires_at);
create index carts_activity_idx on commerce.carts(last_activity_at);
create index cart_items_variant_idx on commerce.cart_items(variant_id);

alter table commerce.carts enable row level security;
alter table commerce.cart_items enable row level security;
alter table commerce.cart_settings enable row level security;
revoke all on all tables in schema commerce from public, anon, authenticated;
grant all on all tables in schema commerce to service_role;

create or replace function commerce.touch_cart(p_cart_id uuid)
returns void language sql set search_path = '' as $$
  update commerce.carts set last_activity_at=statement_timestamp(),
    expires_at=statement_timestamp() + make_interval(days => (select retention_days from commerce.cart_settings where singleton))
  where id=p_cart_id;
$$;

create or replace function public.cart_add_item(p_access_token uuid, p_product_id uuid, p_quantity integer default 1)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_cart_id uuid; chosen_variant uuid; current_quantity integer; available numeric;
begin
  if p_quantity is null or p_quantity < 1 then raise exception 'Quantity must be positive.'; end if;
  select v.id into chosen_variant from catalog.products p
    join catalog.brands b on b.id=p.brand_id and b.is_visible and b.archived_at is null
    join catalog.product_categories pc on pc.product_id=p.id and pc.is_primary
    join catalog.categories c on c.id=pc.category_id and c.is_visible and c.archived_at is null
    join lateral (select id from catalog.variants where product_id=p.id order by created_at,id limit 1) v on true
    where p.id=p_product_id and p.status='published';
  if chosen_variant is null then raise exception 'Product is not available.'; end if;
  select coalesce(sum(sp.available),0) into available from inventory.stock_items si
    join inventory.stock_position sp on sp.stock_item_id=si.id where si.catalog_variant_id=chosen_variant;
  if available <= 0 then raise exception 'Product is out of stock.'; end if;
  insert into commerce.carts(access_token) values (p_access_token)
    on conflict(access_token) do update set access_token=excluded.access_token returning id into v_cart_id;
  select quantity into current_quantity from commerce.cart_items where cart_id=v_cart_id and variant_id=chosen_variant;
  current_quantity := coalesce(current_quantity,0) + p_quantity;
  if current_quantity > 10 then raise exception 'Maximum quantity is 10.'; end if;
  insert into commerce.cart_items(cart_id,variant_id,quantity) values(v_cart_id,chosen_variant,current_quantity)
    on conflict(cart_id,variant_id) do update set quantity=excluded.quantity,updated_at=statement_timestamp();
  perform commerce.touch_cart(v_cart_id);
  return current_quantity;
end; $$;

create or replace function public.cart_set_quantity(p_access_token uuid, p_variant_id uuid, p_quantity integer)
returns void language plpgsql security definer set search_path = '' as $$
declare owned_cart uuid;
begin
  select id into owned_cart from commerce.carts where access_token=p_access_token and expires_at>statement_timestamp();
  if owned_cart is null then raise exception 'Cart not found.'; end if;
  if p_quantity=0 then delete from commerce.cart_items where cart_id=owned_cart and variant_id=p_variant_id;
  elsif p_quantity between 1 and 10 then update commerce.cart_items set quantity=p_quantity,updated_at=statement_timestamp() where cart_id=owned_cart and variant_id=p_variant_id;
  else raise exception 'Quantity must be between 0 and 10.'; end if;
  perform commerce.touch_cart(owned_cart);
end; $$;

create or replace function public.cart_summary(p_access_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'itemCount',coalesce(sum(ci.quantity),0),
    'items',coalesce(jsonb_agg(jsonb_build_object(
      'variantId',v.id,'productId',p.id,'slug',p.slug,'name',p.name,'brandName',b.name,
      'variantLabel',v.label,'sku',v.sku,'quantity',ci.quantity,'unitPrice',o.price_amount,
      'lineTotal',o.price_amount*ci.quantity,'imageUrl',m.storage_path,'imageAlt',coalesce(m.alt_text,p.name),
      'available',coalesce(stock.available,0),'isAvailable',coalesce(stock.available,0)>=ci.quantity
    ) order by ci.created_at) filter(where ci.variant_id is not null),'[]'::jsonb),
    'subtotal',coalesce(sum(o.price_amount*ci.quantity),0),
    'expiresAt',max(c.expires_at)
  ) from commerce.carts c left join commerce.cart_items ci on ci.cart_id=c.id
    left join catalog.variants v on v.id=ci.variant_id left join catalog.products p on p.id=v.product_id
    left join catalog.brands b on b.id=p.brand_id left join catalog.offers o on o.variant_id=v.id and o.channel_key='website'
    left join lateral(select storage_path,alt_text from catalog.product_media where product_id=p.id order by display_order,created_at,id limit 1)m on true
    left join inventory.stock_items si on si.catalog_variant_id=v.id
    left join lateral(select sum(available) available from inventory.stock_position where stock_item_id=si.id)stock on true
  where c.access_token=p_access_token and c.expires_at>statement_timestamp();
$$;

revoke all on function public.cart_add_item(uuid,uuid,integer) from public;
revoke all on function public.cart_set_quantity(uuid,uuid,integer) from public;
revoke all on function public.cart_summary(uuid) from public;
grant execute on function public.cart_add_item(uuid,uuid,integer) to anon,authenticated;
grant execute on function public.cart_set_quantity(uuid,uuid,integer) to anon,authenticated;
grant execute on function public.cart_summary(uuid) to anon,authenticated;

comment on table commerce.carts is 'Opaque-token guest carts retained for 30 days after last activity; cart existence never reserves stock.';
comment on column commerce.cart_settings.social_proof_minimum is 'Configurable privacy/usefulness threshold. Null keeps the indicator hidden until configured.';
