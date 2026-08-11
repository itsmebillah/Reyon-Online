-- REYON Business OS: approved variant-level Inventory Entry operations.

insert into organization.organizations (code, display_name)
values ('reyon-online', 'Reyon Online')
on conflict (code) do update set display_name = excluded.display_name;

insert into organization.locations (organization_id, code, display_name, kind_key, time_zone)
select id, 'main-inventory', 'Main Inventory', 'inventory', 'Asia/Dhaka'
from organization.organizations where code = 'reyon-online'
on conflict (organization_id, code) do update set
  display_name = excluded.display_name,
  kind_key = excluded.kind_key,
  time_zone = excluded.time_zone;

alter table inventory.movements
  add column reason_note text,
  add column actor_label text,
  add constraint movements_reason_note_present check (reason_note is null or btrim(reason_note) <> ''),
  add constraint movements_actor_label_present check (actor_label is null or btrim(actor_label) <> '');

create unique index movements_one_reversal_idx
  on inventory.movements(reverses_movement_id)
  where reverses_movement_id is not null;

create table inventory.reservations (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references inventory.stock_items(id) on delete restrict,
  location_id uuid not null references organization.locations(id) on delete restrict,
  quantity numeric(20, 6) not null,
  source_namespace text not null,
  source_reference text not null,
  created_at timestamptz not null default statement_timestamp(),
  released_at timestamptz,
  constraint reservations_quantity_positive check (quantity > 0),
  constraint reservations_source_namespace_format check (source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint reservations_source_reference_present check (btrim(source_reference) <> ''),
  constraint reservations_release_valid check (released_at is null or released_at >= created_at),
  constraint reservations_source_unique unique (source_namespace, source_reference, stock_item_id, location_id)
);

create index reservations_active_stock_location_idx
  on inventory.reservations(stock_item_id, location_id)
  where released_at is null;

alter table inventory.reservations enable row level security;
revoke all on inventory.reservations from public, anon, authenticated;
grant all on inventory.reservations to service_role;

create or replace view inventory.stock_position as
select
  si.id as stock_item_id,
  si.catalog_variant_id,
  l.id as location_id,
  l.display_name as location_name,
  coalesce(sum(ml.quantity_delta), 0)::numeric(20, 6) as on_hand,
  coalesce((
    select sum(r.quantity) from inventory.reservations r
    where r.stock_item_id = si.id and r.location_id = l.id and r.released_at is null
  ), 0)::numeric(20, 6) as reserved,
  (coalesce(sum(ml.quantity_delta), 0) - coalesce((
    select sum(r.quantity) from inventory.reservations r
    where r.stock_item_id = si.id and r.location_id = l.id and r.released_at is null
  ), 0))::numeric(20, 6) as available
from inventory.stock_items si
cross join organization.locations l
join organization.organizations org on org.id = l.organization_id and org.code = 'reyon-online'
left join inventory.movement_lines ml on ml.stock_item_id = si.id and ml.location_id = l.id
group by si.id, si.catalog_variant_id, l.id, l.display_name;

revoke all on inventory.stock_position from public, anon, authenticated;
grant select on inventory.stock_position to service_role;

create or replace function public.admin_inventory_dashboard()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when public.is_reyon_admin() then jsonb_build_object(
    'locations', coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'name', l.display_name, 'code', l.code
    ) order by l.display_name) from organization.locations l
      join organization.organizations o on o.id = l.organization_id
      where o.code = 'reyon-online'), '[]'::jsonb),
    'variants', coalesce((select jsonb_agg(jsonb_build_object(
      'id', v.id, 'productId', p.id, 'productName', p.name, 'productSlug', p.slug,
      'variantLabel', v.label, 'sku', v.sku, 'status', p.status,
      'onHand', coalesce(sp.on_hand, 0), 'reserved', coalesce(sp.reserved, 0),
      'available', coalesce(sp.available, 0), 'stockItemId', si.id
    ) order by p.name, v.label) from catalog.variants v
      join catalog.products p on p.id = v.product_id
      left join inventory.stock_items si on si.catalog_variant_id = v.id
      left join inventory.stock_position sp on sp.stock_item_id = si.id
        and sp.location_id = (select l.id from organization.locations l
          join organization.organizations o on o.id=l.organization_id
          where o.code='reyon-online' and l.code='main-inventory' limit 1)), '[]'::jsonb),
    'movements', coalesce((select jsonb_agg(entry order by occurred_at desc) from (
      select jsonb_build_object(
        'id', m.id, 'movementType', m.movement_type_key, 'occurredAt', m.occurred_at,
        'recordedAt', m.recorded_at, 'sourceReference', m.source_reference,
        'reason', m.reason_note, 'actor', m.actor_label, 'reversesMovementId', m.reverses_movement_id,
        'quantity', ml.quantity_delta, 'productName', p.name, 'variantLabel', v.label,
        'sku', v.sku, 'locationName', l.display_name,
        'isReversed', exists(select 1 from inventory.movements r where r.reverses_movement_id=m.id)
      ) as entry, m.occurred_at
      from inventory.movements m
      join inventory.movement_lines ml on ml.movement_id=m.id
      join inventory.stock_items si on si.id=ml.stock_item_id
      join catalog.variants v on v.id=si.catalog_variant_id
      join catalog.products p on p.id=v.product_id
      join organization.locations l on l.id=ml.location_id
      order by m.occurred_at desc limit 50
    ) history), '[]'::jsonb)
  ) else null end;
$$;

create or replace function public.admin_record_inventory_movement(
  p_variant_id uuid, p_location_id uuid, p_movement_type text,
  p_quantity numeric, p_reason text default null, p_reference text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  item inventory.stock_items%rowtype;
  movement_id uuid := gen_random_uuid();
  signed_quantity numeric(20, 6);
  current_on_hand numeric(20, 6);
  actor uuid := auth.uid();
  actor_name text := coalesce(auth.jwt()->>'email', auth.uid()::text);
  allowed_type text := lower(btrim(p_movement_type));
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero.'; end if;
  if allowed_type not in ('opening-stock','purchase-receive','sale','return-in','return-out','adjustment-in','adjustment-out','damage-loss') then
    raise exception 'Movement type is not approved.';
  end if;
  if not exists (select 1 from organization.locations where id=p_location_id) then raise exception 'Inventory location not found.'; end if;

  insert into inventory.stock_items(catalog_variant_id, code, display_name, base_unit_code)
  select v.id, v.sku, p.name || ' — ' || v.label, 'UNIT'
  from catalog.variants v join catalog.products p on p.id=v.product_id where v.id=p_variant_id
  on conflict (catalog_variant_id) do update set display_name=excluded.display_name
  returning * into item;
  if item.id is null then raise exception 'Product variant not found.'; end if;

  perform 1 from inventory.stock_items where id=item.id for update;
  signed_quantity := case when allowed_type in ('opening-stock','purchase-receive','return-in','adjustment-in')
    then p_quantity else -p_quantity end;
  select coalesce(sum(quantity_delta), 0) into current_on_hand
  from inventory.movement_lines where stock_item_id=item.id and location_id=p_location_id;
  if current_on_hand + signed_quantity < 0 then raise exception 'This movement would create negative stock.'; end if;

  insert into inventory.movements(
    id, movement_type_key, occurred_at, source_namespace, source_reference,
    idempotency_key, reason_key, reason_note, actor_id, actor_label
  ) values (
    movement_id, allowed_type, statement_timestamp(), 'admin-inventory',
    coalesce(nullif(btrim(p_reference), ''), movement_id::text), movement_id::text,
    case when nullif(btrim(p_reason), '') is null then null else 'administrator-entry' end,
    nullif(btrim(p_reason), ''), actor, actor_name
  );
  insert into inventory.movement_lines(movement_id, line_number, stock_item_id, location_id, quantity_delta, unit_code)
  values (movement_id, 1, item.id, p_location_id, signed_quantity, item.base_unit_code);
  return movement_id;
end;
$$;

create or replace function public.admin_reverse_inventory_movement(p_movement_id uuid, p_reason text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  original inventory.movements%rowtype;
  original_line inventory.movement_lines%rowtype;
  reversal_id uuid := gen_random_uuid();
  current_on_hand numeric(20, 6);
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'A correction reason is required.'; end if;
  select * into original from inventory.movements where id=p_movement_id;
  if original.id is null then raise exception 'Movement not found.'; end if;
  if original.reverses_movement_id is not null then raise exception 'A correction movement cannot be reversed again.'; end if;
  if exists(select 1 from inventory.movements where reverses_movement_id=p_movement_id) then raise exception 'This movement is already corrected.'; end if;
  select * into original_line from inventory.movement_lines where movement_id=p_movement_id order by line_number limit 1;
  perform 1 from inventory.stock_items where id=original_line.stock_item_id for update;
  select coalesce(sum(quantity_delta), 0) into current_on_hand from inventory.movement_lines
    where stock_item_id=original_line.stock_item_id and location_id=original_line.location_id;
  if current_on_hand - original_line.quantity_delta < 0 then
    raise exception 'This correction would create negative stock.';
  end if;
  insert into inventory.movements(
    id, movement_type_key, occurred_at, source_namespace, source_reference,
    idempotency_key, reason_key, reason_note, actor_id, actor_label, reverses_movement_id
  ) values (
    reversal_id, original.movement_type_key, statement_timestamp(), 'admin-inventory-correction',
    original.id::text, reversal_id::text, 'administrator-correction', btrim(p_reason),
    auth.uid(), coalesce(auth.jwt()->>'email', auth.uid()::text), original.id
  );
  insert into inventory.movement_lines(movement_id, line_number, stock_item_id, location_id, lot_id, quantity_delta, unit_code, condition_key)
  values (reversal_id, 1, original_line.stock_item_id, original_line.location_id, original_line.lot_id,
    -original_line.quantity_delta, original_line.unit_code, original_line.condition_key);
  return reversal_id;
end;
$$;

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
    o.price_amount, o.compare_at_amount,
    case when coalesce(stock.available, 0) <= 0 then 'Out of stock'
      when coalesce(stock.available, 0) <= coalesce((select low_stock_threshold from catalog.product_collections where collection_key='low-stock'), 5)
        then 'Low stock' else 'In stock' end,
    m.storage_path, coalesce(m.alt_text, p.name),
    coalesce((select max(e.occurred_at) from catalog.product_status_events e where e.product_id=p.id and e.to_status='published'), p.updated_at)
  from catalog.products p
  join catalog.brands b on b.id=p.brand_id and b.is_visible and b.archived_at is null
  join catalog.product_categories pc on pc.product_id=p.id and pc.is_primary
  join catalog.categories c on c.id=pc.category_id and c.is_visible and c.archived_at is null
  join lateral (select * from catalog.variants x where x.product_id=p.id order by x.created_at, x.id limit 1) v on true
  join catalog.offers o on o.variant_id=v.id and o.channel_key='website'
  join lateral (select * from catalog.product_media x where x.product_id=p.id order by x.display_order, x.created_at, x.id limit 1) m on true
  left join inventory.stock_items si on si.catalog_variant_id=v.id
  left join lateral (select sum(sp.available) as available from inventory.stock_position sp where sp.stock_item_id=si.id) stock on true
  where p.status='published';
$$;

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
    select * from catalog.product_collections where collection_key=lower(btrim(p_collection_key)) and is_enabled
  ), eligible as (
    select pc.*, pins.display_order as pin_order
    from public.published_catalog() pc
    cross join configuration cfg
    left join catalog.product_collection_pins pins on pins.collection_id=cfg.id and pins.product_id=pc.id
    where pins.product_id is not null
      or cfg.strategy_key='newest-published'
      or (cfg.strategy_key='promotional-price' and exists (
        select 1 from catalog.variants v join catalog.variant_prices vp on vp.variant_id=v.id and vp.price_type='discount' where v.product_id=pc.id
      ))
      or (cfg.strategy_key='low-stock' and pc.availability_label='Low stock')
      or (cfg.strategy_key='out-of-stock' and pc.availability_label='Out of stock')
  )
  select e.id, e.slug, e.name, e.brand_id, e.brand_slug, e.brand_name,
    e.category_id, e.category_slug, e.category_name, e.category_display_order,
    e.variant_label, e.sku, e.price_amount, e.compare_at_amount,
    e.availability_label, e.image_url, e.image_alt, e.published_at
  from eligible e cross join configuration cfg
  order by (e.pin_order is null), e.pin_order, e.published_at desc, e.id
  limit (select item_limit from configuration);
$$;

update catalog.product_collections set is_enabled=true where collection_key in ('low-stock','out-of-stock');

revoke all on function public.admin_inventory_dashboard() from public, anon;
revoke all on function public.admin_record_inventory_movement(uuid,uuid,text,numeric,text,text) from public, anon;
revoke all on function public.admin_reverse_inventory_movement(uuid,text) from public, anon;
grant execute on function public.admin_inventory_dashboard() to authenticated;
grant execute on function public.admin_record_inventory_movement(uuid,uuid,text,numeric,text,text) to authenticated;
grant execute on function public.admin_reverse_inventory_movement(uuid,text) to authenticated;

comment on table inventory.reservations is
  'Future order reservations. Active rows reduce available stock without changing the on-hand movement ledger.';
comment on view inventory.stock_position is
  'Derived position: on-hand from append-only movement lines; available equals on-hand minus active reservations.';
