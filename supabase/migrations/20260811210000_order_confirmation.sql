-- REYON Business OS: Sprint 15 order-confirmation and stock-reservation boundary.

insert into organization.channels(organization_id,code,display_name,kind_key)
select id,'website','REYON Website','ecommerce' from organization.organizations where code='reyon-online'
on conflict(organization_id,code) do update set display_name=excluded.display_name,kind_key=excluded.kind_key;

insert into organization.location_channels(location_id,channel_id)
select l.id,c.id from organization.locations l
join organization.organizations o on o.id=l.organization_id and o.code='reyon-online'
join organization.channels c on c.organization_id=o.id and c.code='website'
where l.code='main-inventory' on conflict do nothing;

create table commerce.checkout_delivery_selections(
  cart_id uuid primary key references commerce.carts(id) on delete cascade,
  zone_id uuid not null references fulfillment.delivery_zones(id) on delete restrict,
  selected_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

alter table sales.orders add column customer_id uuid references crm.customers(id) on delete restrict,
  add column current_state_key text,
  add column subtotal_amount numeric(18,2),
  add column delivery_amount numeric(18,2),
  add column total_amount numeric(18,2),
  add constraint orders_current_state_format check(current_state_key is null or current_state_key~'^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add constraint orders_amounts_valid check(subtotal_amount is null or (subtotal_amount>=0 and delivery_amount>=0 and total_amount=subtotal_amount+delivery_amount));

create table sales.order_addresses(
  order_id uuid primary key references sales.orders(id) on delete restrict,
  full_name text not null,phone text not null,flat_no text,house_no text not null,road text not null,
  village_city text not null,thana_upazila text not null,district text not null,division text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint order_address_required check(btrim(full_name)<>'' and btrim(phone)<>'' and btrim(house_no)<>'' and btrim(road)<>'' and btrim(village_city)<>'' and btrim(thana_upazila)<>'' and btrim(district)<>'' and btrim(division)<>'')
);
create table sales.order_delivery_details(
  order_id uuid primary key references sales.orders(id) on delete restrict,
  zone_id uuid not null references fulfillment.delivery_zones(id) on delete restrict,
  zone_key_snapshot text not null,zone_name_snapshot text not null,charge_amount numeric(18,2) not null,currency_code text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint order_delivery_charge_valid check(charge_amount>=0)
);
create table sales.order_payment_details(
  order_id uuid primary key references sales.orders(id) on delete restrict,
  method_id uuid not null references payments.checkout_methods(id) on delete restrict,
  method_key_snapshot text not null,method_name_snapshot text not null,method_kind_snapshot text not null,
  transaction_reference text,evidence_state_key text not null,created_at timestamptz not null default statement_timestamp(),
  constraint order_payment_evidence_state_format check(evidence_state_key~'^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create table commerce.cart_orders(
  cart_id uuid primary key references commerce.carts(id) on delete restrict,
  order_id uuid not null unique references sales.orders(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp()
);

alter table inventory.reservations add column expires_at timestamptz not null default(statement_timestamp()+interval '30 minutes'),
  add column order_id uuid references sales.orders(id) on delete restrict,
  add column order_line_id uuid references sales.order_lines(id) on delete restrict,
  add constraint reservations_expiry_valid check(expires_at>created_at);
create table inventory.reservation_events(
  id uuid primary key default gen_random_uuid(),reservation_id uuid not null references inventory.reservations(id) on delete restrict,
  event_type_key text not null,occurred_at timestamptz not null default statement_timestamp(),actor_id uuid,reason text,
  constraint reservation_event_type_format check(event_type_key~'^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint reservation_event_reason_present check(reason is null or btrim(reason)<>'')
);
create index reservation_events_reservation_idx on inventory.reservation_events(reservation_id,occurred_at);
create trigger reservation_events_prevent_mutation before update or delete on inventory.reservation_events
for each row execute function inventory.prevent_ledger_mutation();

create or replace function inventory.release_expired_reservations() returns integer
language plpgsql security definer set search_path='' as $$declare released_count integer;begin
  with released as(update inventory.reservations set released_at=statement_timestamp()
    where released_at is null and expires_at<=statement_timestamp() returning id)
  insert into inventory.reservation_events(reservation_id,event_type_key,reason)
    select id,'expired','The approved 30-minute reservation window elapsed' from released;
  get diagnostics released_count=row_count;return released_count;
end$$;
revoke all on function inventory.release_expired_reservations() from public,anon,authenticated;

create or replace view inventory.stock_position as
select si.id stock_item_id,si.catalog_variant_id,l.id location_id,l.display_name location_name,
  coalesce(sum(ml.quantity_delta),0)::numeric(20,6) on_hand,
  coalesce((select sum(r.quantity) from inventory.reservations r where r.stock_item_id=si.id and r.location_id=l.id and r.released_at is null and r.expires_at>statement_timestamp()),0)::numeric(20,6) reserved,
  (coalesce(sum(ml.quantity_delta),0)-coalesce((select sum(r.quantity) from inventory.reservations r where r.stock_item_id=si.id and r.location_id=l.id and r.released_at is null and r.expires_at>statement_timestamp()),0))::numeric(20,6) available
from inventory.stock_items si cross join organization.locations l
join organization.organizations org on org.id=l.organization_id and org.code='reyon-online'
left join inventory.movement_lines ml on ml.stock_item_id=si.id and ml.location_id=l.id
group by si.id,si.catalog_variant_id,l.id,l.display_name;

alter table commerce.checkout_delivery_selections enable row level security;
alter table sales.order_addresses enable row level security;
alter table sales.order_delivery_details enable row level security;
alter table sales.order_payment_details enable row level security;
alter table commerce.cart_orders enable row level security;
alter table inventory.reservation_events enable row level security;
revoke all on commerce.checkout_delivery_selections,sales.order_addresses,sales.order_delivery_details,sales.order_payment_details,commerce.cart_orders,inventory.reservation_events from public,anon,authenticated;
grant all on commerce.checkout_delivery_selections,sales.order_addresses,sales.order_delivery_details,sales.order_payment_details,commerce.cart_orders,inventory.reservation_events to service_role;

create or replace function public.checkout_select_delivery_zone(p_access_token uuid,p_zone_id uuid) returns void
language plpgsql security definer set search_path='' as $$declare owned_cart uuid;begin
  select id into owned_cart from commerce.carts where access_token=p_access_token and expires_at>statement_timestamp();
  if owned_cart is null then raise exception 'Active cart not found.';end if;
  if not exists(select 1 from fulfillment.delivery_zones where id=p_zone_id and is_enabled and charge_amount is not null) then raise exception 'Delivery zone is not currently available.';end if;
  insert into commerce.checkout_delivery_selections(cart_id,zone_id) values(owned_cart,p_zone_id)
  on conflict(cart_id)do update set zone_id=excluded.zone_id,updated_at=statement_timestamp();
  perform commerce.touch_cart(owned_cart);
end$$;

create or replace function public.checkout_order_state(p_access_token uuid) returns jsonb
language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'addressSaved',a.cart_id is not null,'deliverySelected',dz.id is not null,'deliveryZoneId',dz.id,'deliveryZoneName',dz.name,
  'deliveryCharge',dz.charge_amount,'currency',coalesce(dz.currency_code,'BDT'),'paymentSelected',pm.id is not null,
  'paymentMethodId',pm.id,'paymentMethodName',pm.name,'identityVerified',coalesce(identity_check.verified,false),'existingOrderId',co.order_id,
  'ready',a.cart_id is not null and dz.id is not null and pm.id is not null and coalesce(identity_check.verified,false) and co.order_id is null
) from commerce.carts c
left join commerce.checkout_addresses a on a.cart_id=c.id
left join commerce.checkout_delivery_selections ds on ds.cart_id=c.id
left join fulfillment.delivery_zones dz on dz.id=ds.zone_id and dz.is_enabled and dz.charge_amount is not null
left join commerce.checkout_payment_selections ps on ps.cart_id=c.id
left join payments.checkout_methods pm on pm.id=ps.method_id and pm.is_visible and pm.is_selectable
left join commerce.cart_orders co on co.cart_id=c.id
left join lateral(select exists(select 1 from crm.customer_contacts cc where cc.customer_id=c.customer_id and cc.verified_at is not null) verified)identity_check on true
where c.access_token=p_access_token and c.expires_at>statement_timestamp();$$;

create or replace function public.checkout_confirm_order(p_access_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cart commerce.carts%rowtype;v_org_id uuid;v_channel_id uuid;v_location_id uuid;address commerce.checkout_addresses%rowtype;
  zone fulfillment.delivery_zones%rowtype;method payments.checkout_methods%rowtype;selection commerce.checkout_payment_selections%rowtype;
  v_order_id uuid;existing_order uuid;subtotal numeric(18,2):=0;insufficient boolean:=false;line_no integer:=0;
  item record;line_id uuid;reservation_id uuid;
begin
  select * into cart from commerce.carts where access_token=p_access_token and expires_at>statement_timestamp() for update;
  if cart.id is null then raise exception 'Active cart not found.';end if;
  select co.order_id into existing_order from commerce.cart_orders co where co.cart_id=cart.id;
  if existing_order is not null then return jsonb_build_object('orderId',existing_order,'idempotent',true);end if;
  if cart.customer_id is null or not exists(select 1 from crm.customer_contacts where customer_id=cart.customer_id and verified_at is not null) then raise exception 'Verified customer identity is required.';end if;
  select * into address from commerce.checkout_addresses where cart_id=cart.id;if address.cart_id is null then raise exception 'Delivery address is required.';end if;
  select z.* into zone from commerce.checkout_delivery_selections s join fulfillment.delivery_zones z on z.id=s.zone_id where s.cart_id=cart.id and z.is_enabled and z.charge_amount is not null;
  if zone.id is null then raise exception 'An active delivery zone with a configured charge is required.';end if;
  select s.* into selection from commerce.checkout_payment_selections s where s.cart_id=cart.id;
  select m.* into method from payments.checkout_methods m where m.id=selection.method_id and m.is_visible and m.is_selectable;
  if method.id is null then raise exception 'A selectable payment method is required.';end if;
  if method.method_kind='mobile' and nullif(btrim(selection.transaction_reference),'') is null then raise exception 'Payment reference is required.';end if;
  if not exists(select 1 from commerce.cart_items where cart_id=cart.id) then raise exception 'Cart is empty.';end if;
  select o.id,c.id,l.id into v_org_id,v_channel_id,v_location_id from organization.organizations o
    join organization.channels c on c.organization_id=o.id and c.code='website'
    join organization.locations l on l.organization_id=o.id and l.code='main-inventory' where o.code='reyon-online';
  for item in select ci.*,v.sku,v.label,p.name,o.price_amount,si.id stock_item_id,
      coalesce(sp.available,0) available
    from commerce.cart_items ci join catalog.variants v on v.id=ci.variant_id
    join catalog.products p on p.id=v.product_id and p.status='published'
    join catalog.offers o on o.variant_id=v.id and o.channel_key='website'
    left join inventory.stock_items si on si.catalog_variant_id=v.id
    left join inventory.stock_position sp on sp.stock_item_id=si.id and sp.location_id=v_location_id
    where ci.cart_id=cart.id order by si.id
  loop
    if item.stock_item_id is null then insufficient:=true;else
      perform 1 from inventory.stock_items where id=item.stock_item_id for update;
      select coalesce(sp.available,0) into item.available from inventory.stock_position sp where sp.stock_item_id=item.stock_item_id and sp.location_id=v_location_id;
    end if;
    if item.available<item.quantity then insufficient:=true;end if;
    subtotal:=subtotal+(item.price_amount*item.quantity);
  end loop;
  if (select count(*) from commerce.cart_items where cart_id=cart.id)<>(select count(*) from commerce.cart_items ci join catalog.variants v on v.id=ci.variant_id join catalog.products p on p.id=v.product_id and p.status='published' join catalog.offers o on o.variant_id=v.id and o.channel_key='website' where ci.cart_id=cart.id) then raise exception 'Cart contents changed. Review the cart before confirming.';end if;
  v_order_id:=gen_random_uuid();
  insert into sales.orders(id,organization_id,channel_id,currency_code,source_namespace,source_reference,idempotency_key,occurred_at,customer_id,current_state_key,subtotal_amount,delivery_amount,total_amount)
  values(v_order_id,v_org_id,v_channel_id,'BDT','checkout-cart',cart.id::text,'checkout:'||cart.id::text,statement_timestamp(),cart.customer_id,case when insufficient then 'confirmation-exception' else 'confirmed' end,subtotal,zone.charge_amount,subtotal+zone.charge_amount);
  for item in select ci.*,v.sku,v.label,p.name,o.price_amount,si.id stock_item_id from commerce.cart_items ci join catalog.variants v on v.id=ci.variant_id join catalog.products p on p.id=v.product_id join catalog.offers o on o.variant_id=v.id and o.channel_key='website' left join inventory.stock_items si on si.catalog_variant_id=v.id where ci.cart_id=cart.id order by ci.created_at
  loop line_no:=line_no+1;line_id:=gen_random_uuid();
    insert into sales.order_lines(id,order_id,line_number,catalog_variant_id,sku_snapshot,product_name_snapshot,variant_label_snapshot,quantity,unit_price_amount)
    values(line_id,v_order_id,line_no,item.variant_id,item.sku,item.name,item.label,item.quantity,item.price_amount);
    if not insufficient then reservation_id:=gen_random_uuid();
      insert into inventory.reservations(id,stock_item_id,location_id,quantity,source_namespace,source_reference,expires_at,order_id,order_line_id)
      values(reservation_id,item.stock_item_id,v_location_id,item.quantity,'checkout-order',v_order_id::text||':'||line_id::text,statement_timestamp()+interval '30 minutes',v_order_id,line_id);
      insert into inventory.reservation_events(reservation_id,event_type_key,reason)values(reservation_id,'created','Order confirmed');
    end if;
  end loop;
  insert into sales.order_addresses select v_order_id,full_name,phone,flat_no,house_no,road,village_city,thana_upazila,district,division,statement_timestamp() from commerce.checkout_addresses where cart_id=cart.id;
  insert into sales.order_delivery_details values(v_order_id,zone.id,zone.zone_key,zone.name,zone.charge_amount,zone.currency_code,statement_timestamp());
  insert into sales.order_payment_details values(v_order_id,method.id,method.method_key,method.name,method.method_kind,selection.transaction_reference,case when method.method_kind='cod' then 'pay-on-delivery' else 'pending-verification' end,statement_timestamp());
  insert into sales.order_transitions(order_id,sequence_number,from_state_key,to_state_key,occurred_at,reason_key,rule_version,idempotency_key)
  values(v_order_id,1,null,case when insufficient then 'confirmation-exception' else 'confirmed' end,statement_timestamp(),case when insufficient then 'insufficient-stock' else 'customer-confirmation' end,'sprint-15-v1','order-confirm:'||v_order_id::text);
  insert into crm.order_associations(organization_id,customer_id,order_id,association_kind_key,occurred_at,idempotency_key)
  values(v_org_id,cart.customer_id,v_order_id,'customer',statement_timestamp(),'order-customer:'||v_order_id::text);
  insert into commerce.cart_orders values(cart.id,v_order_id,statement_timestamp());
  return jsonb_build_object('orderId',v_order_id,'state',case when insufficient then 'confirmation-exception' else 'confirmed' end,'reservedUntil',case when insufficient then null else statement_timestamp()+interval '30 minutes' end,'idempotent',false);
end$$;

revoke all on function public.checkout_select_delivery_zone(uuid,uuid) from public;
revoke all on function public.checkout_order_state(uuid) from public;
revoke all on function public.checkout_confirm_order(uuid) from public;
grant execute on function public.checkout_select_delivery_zone(uuid,uuid) to anon,authenticated;
grant execute on function public.checkout_order_state(uuid) to anon,authenticated;
grant execute on function public.checkout_confirm_order(uuid) to anon,authenticated;

comment on function public.checkout_confirm_order(uuid) is 'Transactional verified-identity gate: revalidates checkout facts, snapshots the order, and creates auditable 30-minute stock reservations. It never performs OTP verification.';
