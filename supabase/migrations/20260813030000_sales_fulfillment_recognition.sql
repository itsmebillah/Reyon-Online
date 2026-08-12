-- REYON Business OS: Sprint 17 shipment fulfillment and completed-sale boundary.

create table sales.completed_sales (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references sales.orders(id) on delete restrict,
  order_transition_id uuid not null unique references sales.order_transitions(id) on delete restrict,
  customer_id uuid references crm.customers(id) on delete restrict,
  currency_code text not null,
  product_sales_amount numeric(18, 2) not null,
  delivery_charge_amount numeric(18, 2) not null,
  grand_total_amount numeric(18, 2) not null,
  completed_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint completed_sales_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint completed_sales_amounts_valid check (
    product_sales_amount >= 0 and delivery_charge_amount >= 0
    and grand_total_amount = product_sales_amount + delivery_charge_amount
  )
);

create table payments.collection_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  previous_state_key text not null,
  new_state_key text not null,
  collection_source_key text not null,
  amount numeric(18, 2) not null,
  currency_code text not null,
  occurred_at timestamptz not null,
  actor_id uuid,
  constraint payment_collection_state_format check (
    previous_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and new_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint payment_collection_source_format check (collection_source_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint payment_collection_amount_valid check (amount >= 0),
  constraint payment_collection_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint payment_collection_order_source_unique unique (order_id, collection_source_key)
);

create index completed_sales_completed_at_idx on sales.completed_sales(completed_at);
create index payment_collection_order_idx on payments.collection_events(order_id, occurred_at);

create trigger completed_sales_prevent_mutation
before update or delete on sales.completed_sales
for each row execute function sales.prevent_transition_mutation();

create trigger payment_collection_prevent_mutation
before update or delete on payments.collection_events
for each row execute function payments.prevent_evidence_mutation();

alter table sales.completed_sales enable row level security;
alter table payments.collection_events enable row level security;
revoke all on sales.completed_sales, payments.collection_events from public, anon, authenticated;
grant all on sales.completed_sales, payments.collection_events to service_role;

create or replace function sales.apply_sales_lifecycle_effects()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_order sales.orders%rowtype;
  v_payment sales.order_payment_details%rowtype;
  v_movement_id uuid;
  v_line_number integer := 0;
  v_reservation record;
begin
  select * into v_order from sales.orders where id = new.order_id for update;
  select * into v_payment from sales.order_payment_details where order_id = new.order_id for update;

  if new.to_state_key = 'shipped' then
    if exists (
      select 1 from inventory.movements
      where idempotency_key = 'order-shipped:' || new.order_id::text
    ) then
      return new;
    end if;

    if not exists (
      select 1 from inventory.reservations
      where order_id = new.order_id and released_at is null and expires_at > statement_timestamp()
    ) then
      raise exception 'An active stock reservation is required to ship this order.';
    end if;

    insert into inventory.movements(
      movement_type_key, occurred_at, source_namespace, source_reference,
      idempotency_key, reason_key, actor_id, actor_label
    ) values (
      'sale', new.occurred_at, 'sales-order', v_order.external_reference,
      'order-shipped:' || new.order_id::text, 'order-fulfilled', new.actor_id, 'Order shipment'
    ) returning id into v_movement_id;

    for v_reservation in
      select r.id, r.stock_item_id, r.location_id, r.quantity, si.base_unit_code
      from inventory.reservations r
      join inventory.stock_items si on si.id = r.stock_item_id
      where r.order_id = new.order_id and r.released_at is null
        and r.expires_at > statement_timestamp()
      order by r.created_at, r.id
      for update of r
    loop
      v_line_number := v_line_number + 1;
      insert into inventory.movement_lines(
        movement_id, line_number, stock_item_id, location_id,
        quantity_delta, unit_code, condition_key
      ) values (
        v_movement_id, v_line_number, v_reservation.stock_item_id,
        v_reservation.location_id, -v_reservation.quantity,
        v_reservation.base_unit_code, 'sold'
      );
      update inventory.reservations set released_at = new.occurred_at where id = v_reservation.id;
      insert into inventory.reservation_events(
        reservation_id, event_type_key, occurred_at, actor_id, reason
      ) values (
        v_reservation.id, 'fulfilled', new.occurred_at, new.actor_id,
        'Converted to sold inventory movement ' || v_movement_id::text
      );
    end loop;
  elsif new.to_state_key = 'delivered' and v_payment.method_kind_snapshot = 'cod' then
    if v_payment.evidence_state_key <> 'collected' then
      insert into payments.collection_events(
        order_id, previous_state_key, new_state_key, collection_source_key,
        amount, currency_code, occurred_at, actor_id
      ) values (
        new.order_id, v_payment.evidence_state_key, 'collected', 'order-delivered',
        v_order.total_amount, v_order.currency_code, new.occurred_at, new.actor_id
      );
      update sales.order_payment_details set evidence_state_key = 'collected' where order_id = new.order_id;
    end if;
  elsif new.to_state_key = 'completed' then
    if (v_payment.method_kind_snapshot = 'cod' and v_payment.evidence_state_key <> 'collected')
      or (v_payment.method_kind_snapshot <> 'cod' and v_payment.evidence_state_key <> 'verified') then
      raise exception 'Collected or verified payment evidence is required to complete this sale.';
    end if;
    insert into sales.completed_sales(
      order_id, order_transition_id, customer_id, currency_code,
      product_sales_amount, delivery_charge_amount, grand_total_amount, completed_at
    ) values (
      v_order.id, new.id, v_order.customer_id, v_order.currency_code,
      v_order.subtotal_amount, v_order.delivery_amount, v_order.total_amount, new.occurred_at
    );
  end if;

  return new;
end;
$$;

create trigger order_transitions_apply_sales_effects
after insert on sales.order_transitions
for each row execute function sales.apply_sales_lifecycle_effects();

create or replace function public.admin_sales_register()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_reyon_admin() then coalesce(jsonb_agg(
    jsonb_build_object(
      'id', cs.id,
      'orderId', o.id,
      'orderNumber', o.external_reference,
      'completedAt', cs.completed_at,
      'productSales', cs.product_sales_amount,
      'deliveryCharge', cs.delivery_charge_amount,
      'grandTotal', cs.grand_total_amount,
      'currency', cs.currency_code,
      'paymentMethod', opd.method_name_snapshot,
      'paymentState', opd.evidence_state_key
    ) order by cs.completed_at desc
  ), '[]'::jsonb) else null end
  from sales.completed_sales cs
  join sales.orders o on o.id = cs.order_id
  join sales.order_payment_details opd on opd.order_id = o.id;
$$;

revoke all on function public.admin_sales_register() from public, anon;
grant execute on function public.admin_sales_register() to authenticated;

comment on table sales.completed_sales is
  'Append-only official sale evidence created only by an order transition to Completed.';
comment on table payments.collection_events is
  'Append-only payment collection facts; COD is initially collected at Delivered.';
