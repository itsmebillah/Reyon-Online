-- REYON Business OS: atomic cart snapshot consumption and exact-quantity orders.

alter table commerce.carts
  add column consumed_at timestamptz,
  add column consumed_order_id uuid references sales.orders(id) on delete restrict,
  add constraint carts_consumption_consistent check (
    (consumed_at is null and consumed_order_id is null)
    or (consumed_at is not null and consumed_order_id is not null)
  );

create table commerce.cart_consumptions (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null unique references commerce.carts(id) on delete restrict,
  order_id uuid not null unique references sales.orders(id) on delete restrict,
  original_access_token uuid not null,
  consumed_access_token uuid not null unique,
  consumed_at timestamptz not null default statement_timestamp()
);
create index cart_consumptions_original_token_idx
  on commerce.cart_consumptions(original_access_token, consumed_at desc);
alter table commerce.cart_consumptions enable row level security;
revoke all on commerce.cart_consumptions from public, anon, authenticated;
grant all on commerce.cart_consumptions to service_role;

create or replace function public.checkout_confirm_order(p_access_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cart commerce.carts%rowtype;
  v_org_id uuid;
  v_channel_id uuid;
  v_location_id uuid;
  address commerce.checkout_addresses%rowtype;
  zone fulfillment.delivery_zones%rowtype;
  method payments.checkout_methods%rowtype;
  selection commerce.checkout_payment_selections%rowtype;
  v_order_id uuid;
  existing_order uuid;
  existing_success_token uuid;
  consumed_token uuid := gen_random_uuid();
  subtotal numeric(18,2) := 0;
  line_no integer := 0;
  item record;
  line_id uuid;
  reservation_id uuid;
begin
  select * into cart from commerce.carts
  where access_token = p_access_token and expires_at > statement_timestamp()
    and consumed_at is null
  for update;
  if cart.id is null then raise exception 'Active cart not found.'; end if;

  if not exists(select 1 from commerce.cart_items where cart_id = cart.id) then
    select cc.order_id, cc.consumed_access_token
    into existing_order, existing_success_token
    from commerce.cart_consumptions cc
    where cc.original_access_token = p_access_token
    order by cc.consumed_at desc limit 1;
    if existing_order is not null then
      return jsonb_build_object(
        'orderId', existing_order,
        'successAccessToken', existing_success_token,
        'idempotent', true
      );
    end if;
    raise exception 'Cart is empty.';
  end if;

  select * into address from commerce.checkout_addresses where cart_id = cart.id;
  if address.cart_id is null then raise exception 'Delivery address is required.'; end if;
  select z.* into zone
  from commerce.checkout_delivery_selections s
  join fulfillment.delivery_zones z on z.id = s.zone_id
  where s.cart_id = cart.id and z.is_enabled and z.charge_amount is not null;
  if zone.id is null then
    raise exception 'An active delivery zone with a configured charge is required.';
  end if;
  select s.* into selection from commerce.checkout_payment_selections s where s.cart_id = cart.id;
  select m.* into method from payments.checkout_methods m
  where m.id = selection.method_id and m.is_visible and m.is_selectable;
  if method.id is null then raise exception 'A selectable payment method is required.'; end if;
  if method.method_kind = 'mobile' and nullif(btrim(selection.transaction_reference), '') is null then
    raise exception 'Payment reference is required.';
  end if;

  select o.id, c.id, l.id into v_org_id, v_channel_id, v_location_id
  from organization.organizations o
  join organization.channels c on c.organization_id = o.id and c.code = 'website'
  join organization.locations l on l.organization_id = o.id and l.code = 'main-inventory'
  where o.code = 'reyon-online';

  for item in
    select ci.*, v.sku, v.label, p.name, offer.price_amount,
      si.id stock_item_id, coalesce(sp.available, 0) available
    from commerce.cart_items ci
    join catalog.variants v on v.id = ci.variant_id
    join catalog.products p on p.id = v.product_id and p.status = 'published'
    join catalog.offers offer on offer.variant_id = v.id and offer.channel_key = 'website'
    left join inventory.stock_items si on si.catalog_variant_id = v.id
    left join inventory.stock_position sp
      on sp.stock_item_id = si.id and sp.location_id = v_location_id
    where ci.cart_id = cart.id
    order by si.id nulls first
  loop
    if item.stock_item_id is null then
      raise exception 'Insufficient stock for %. Requested %; available 0.', item.name, item.quantity;
    end if;
    perform 1 from inventory.stock_items where id = item.stock_item_id for update;
    select coalesce(sp.available, 0) into item.available
    from inventory.stock_position sp
    where sp.stock_item_id = item.stock_item_id and sp.location_id = v_location_id;
    if coalesce(item.available, 0) < item.quantity then
      raise exception 'Insufficient stock for %. Requested %; available %.',
        item.name, item.quantity, greatest(floor(coalesce(item.available, 0)), 0);
    end if;
    subtotal := subtotal + (item.price_amount * item.quantity);
  end loop;

  if (select count(*) from commerce.cart_items where cart_id = cart.id) <>
    (select count(*) from commerce.cart_items ci
      join catalog.variants v on v.id = ci.variant_id
      join catalog.products p on p.id = v.product_id and p.status = 'published'
      join catalog.offers offer on offer.variant_id = v.id and offer.channel_key = 'website'
      where ci.cart_id = cart.id) then
    raise exception 'Cart contents changed. Review the cart before confirming.';
  end if;

  cart.customer_id := crm.resolve_checkout_customer(
    cart.id, v_org_id, address.full_name, address.phone
  );
  v_order_id := gen_random_uuid();
  insert into sales.orders(
    id, organization_id, channel_id, currency_code, source_namespace,
    source_reference, idempotency_key, occurred_at, customer_id,
    current_state_key, subtotal_amount, delivery_amount, total_amount
  ) values (
    v_order_id, v_org_id, v_channel_id, 'BDT', 'checkout-cart', cart.id::text,
    'checkout:' || cart.id::text, statement_timestamp(), cart.customer_id,
    'confirmed', subtotal, zone.charge_amount, subtotal + zone.charge_amount
  );

  for item in
    select ci.*, v.sku, v.label, p.name, offer.price_amount, si.id stock_item_id
    from commerce.cart_items ci
    join catalog.variants v on v.id = ci.variant_id
    join catalog.products p on p.id = v.product_id
    join catalog.offers offer on offer.variant_id = v.id and offer.channel_key = 'website'
    join inventory.stock_items si on si.catalog_variant_id = v.id
    where ci.cart_id = cart.id order by ci.created_at, ci.id
  loop
    line_no := line_no + 1;
    line_id := gen_random_uuid();
    insert into sales.order_lines(
      id, order_id, line_number, catalog_variant_id, sku_snapshot,
      product_name_snapshot, variant_label_snapshot, quantity, unit_price_amount
    ) values (
      line_id, v_order_id, line_no, item.variant_id, item.sku,
      item.name, item.label, item.quantity, item.price_amount
    );
    reservation_id := gen_random_uuid();
    insert into inventory.reservations(
      id, stock_item_id, location_id, quantity, source_namespace,
      source_reference, expires_at, order_id, order_line_id
    ) values (
      reservation_id, item.stock_item_id, v_location_id, item.quantity,
      'checkout-order', v_order_id::text || ':' || line_id::text,
      statement_timestamp() + interval '30 minutes', v_order_id, line_id
    );
    insert into inventory.reservation_events(reservation_id, event_type_key, reason)
    values(reservation_id, 'created', 'Order confirmed');
  end loop;

  insert into sales.order_addresses
  select v_order_id, full_name, phone, flat_no, house_no, road, village_city,
    thana_upazila, district, division, statement_timestamp()
  from commerce.checkout_addresses where cart_id = cart.id;
  insert into sales.order_delivery_details values(
    v_order_id, zone.id, zone.zone_key, zone.name, zone.charge_amount,
    zone.currency_code, statement_timestamp()
  );
  insert into sales.order_payment_details values(
    v_order_id, method.id, method.method_key, method.name, method.method_kind,
    selection.transaction_reference,
    case when method.method_kind = 'cod' then 'pay-on-delivery' else 'pending-verification' end,
    statement_timestamp()
  );
  insert into sales.order_transitions(
    order_id, sequence_number, from_state_key, to_state_key, occurred_at,
    reason_key, rule_version, idempotency_key
  ) values (
    v_order_id, 1, null, 'confirmed', statement_timestamp(),
    'customer-confirmation', 'sprint-15-cart-consumption-v1',
    'order-confirm:' || v_order_id::text
  );
  insert into crm.order_associations(
    organization_id, customer_id, order_id, association_kind_key,
    occurred_at, idempotency_key
  ) values (
    v_org_id, cart.customer_id, v_order_id, 'customer', statement_timestamp(),
    'order-customer:' || v_order_id::text
  );
  insert into commerce.cart_orders values(cart.id, v_order_id, statement_timestamp());

  update commerce.carts
  set access_token = consumed_token, consumed_at = statement_timestamp(),
      consumed_order_id = v_order_id
  where id = cart.id;
  insert into commerce.cart_consumptions(
    cart_id, order_id, original_access_token, consumed_access_token
  ) values(cart.id, v_order_id, p_access_token, consumed_token);
  insert into commerce.carts(access_token, customer_id)
  values(p_access_token, cart.customer_id);

  return jsonb_build_object(
    'orderId', v_order_id,
    'state', 'confirmed',
    'reservedUntil', statement_timestamp() + interval '30 minutes',
    'successAccessToken', consumed_token,
    'idempotent', false
  );
end;
$$;

revoke all on function public.checkout_confirm_order(uuid) from public;
grant execute on function public.checkout_confirm_order(uuid) to anon, authenticated;
comment on function public.checkout_confirm_order(uuid) is
  'Atomically creates an exact-quantity order, reserves the same quantity, archives the submitted cart snapshot, and establishes a fresh active cart. Insufficient stock creates no order.';

notify pgrst, 'reload schema';
