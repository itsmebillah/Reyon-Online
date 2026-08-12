-- REYON Business OS: role-controlled, append-only Sales discount operations.

alter table sales.orders drop constraint orders_amounts_valid;
alter table sales.orders
  add column gross_product_amount numeric(18, 2),
  add column discount_amount numeric(18, 2) not null default 0;
update sales.orders set gross_product_amount = subtotal_amount where gross_product_amount is null;
alter table sales.orders alter column gross_product_amount set not null;
alter table sales.orders add constraint orders_amounts_valid check (
  gross_product_amount >= 0 and discount_amount >= 0
  and discount_amount <= gross_product_amount
  and subtotal_amount = gross_product_amount - discount_amount
  and delivery_amount >= 0 and total_amount = subtotal_amount + delivery_amount
);

create or replace function sales.set_order_gross_amount()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.gross_product_amount is null then new.gross_product_amount := new.subtotal_amount; end if;
  return new;
end;
$$;
create trigger orders_set_gross_amount
before insert on sales.orders for each row execute function sales.set_order_gross_amount();

create table sales.discount_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  order_line_id uuid references sales.order_lines(id) on delete restrict,
  scope_key text not null check (scope_key in ('line', 'order')),
  discount_type_key text not null check (discount_type_key in ('percentage', 'fixed')),
  discount_value numeric(18, 4) not null,
  original_amount numeric(18, 2) not null,
  discount_amount numeric(18, 2) not null,
  resulting_amount numeric(18, 2) not null,
  reason text not null,
  actor_id uuid not null,
  actor_role_key text not null check (actor_role_key in ('super-admin', 'admin', 'staff')),
  occurred_at timestamptz not null default statement_timestamp(),
  constraint discount_scope_line_consistent check (
    (scope_key = 'line' and order_line_id is not null)
    or (scope_key = 'order' and order_line_id is null)
  ),
  constraint discount_values_valid check (
    discount_value > 0 and original_amount >= 0 and discount_amount > 0
    and resulting_amount = original_amount - discount_amount and resulting_amount >= 0
  ),
  constraint discount_percentage_valid check (
    discount_type_key <> 'percentage' or discount_value <= 100
  ),
  constraint discount_reason_present check (btrim(reason) <> '')
);

create index discount_events_order_idx on sales.discount_events(order_id, occurred_at);
create index discount_events_line_idx on sales.discount_events(order_line_id, occurred_at)
where order_line_id is not null;
create trigger discount_events_prevent_mutation before update or delete on sales.discount_events
for each row execute function sales.prevent_transition_mutation();
alter table sales.discount_events enable row level security;
revoke all on sales.discount_events from public, anon, authenticated;
grant all on sales.discount_events to service_role;

create or replace function public.admin_apply_order_discount(
  p_order_id uuid,
  p_scope text,
  p_order_line_id uuid,
  p_discount_type text,
  p_discount_value numeric,
  p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_order sales.orders%rowtype;
  v_role text;
  v_applicable numeric(18, 2);
  v_discount numeric(18, 2);
  v_role_limit numeric(18, 2);
  v_existing_line_discount numeric(18, 2) := 0;
begin
  v_role := public.reyon_admin_role();
  if v_role is null then raise exception 'Administrator access required.'; end if;
  if p_scope not in ('line', 'order') then raise exception 'Select a valid discount scope.'; end if;
  if p_discount_type not in ('percentage', 'fixed') then raise exception 'Select a valid discount type.'; end if;
  if p_discount_value is null or p_discount_value <= 0 then raise exception 'Discount value must be greater than zero.'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'Discount reason is required.'; end if;

  select * into v_order from sales.orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'Order not found.'; end if;
  if v_order.current_state_key in ('shipped', 'delivered', 'completed', 'cancelled', 'rejected', 'failed', 'returned')
    or exists (select 1 from sales.completed_sales where order_id = p_order_id) then
    raise exception 'Discounts cannot change shipped or finalized order history.';
  end if;
  if exists (
    select 1 from sales.order_payment_details
    where order_id = p_order_id and evidence_state_key in ('verified', 'collected')
  ) then
    raise exception 'Verified or collected payment must be corrected before repricing.';
  end if;

  if p_scope = 'line' then
    if p_order_line_id is null then raise exception 'Select an order line.'; end if;
    select ol.quantity * ol.unit_price_amount,
      coalesce((select sum(de.discount_amount) from sales.discount_events de where de.order_line_id = ol.id), 0)
    into v_applicable, v_existing_line_discount
    from sales.order_lines ol where ol.id = p_order_line_id and ol.order_id = p_order_id;
    if v_applicable is null then raise exception 'Order line not found.'; end if;
    v_applicable := v_applicable - v_existing_line_discount;
  else
    if p_order_line_id is not null then raise exception 'Order discounts cannot target a line.'; end if;
    v_applicable := v_order.subtotal_amount;
  end if;

  if p_discount_type = 'percentage' then
    v_discount := round(v_applicable * p_discount_value / 100, 2);
  else
    v_discount := round(p_discount_value, 2);
  end if;
  if v_discount <= 0 or v_discount > v_applicable then raise exception 'Discount cannot exceed the applicable subtotal.'; end if;

  if v_role = 'admin' then v_role_limit := round(v_order.gross_product_amount * 0.20, 2);
  elsif v_role = 'staff' then v_role_limit := round(v_order.gross_product_amount * 0.05, 2);
  else v_role_limit := v_order.gross_product_amount;
  end if;
  if v_order.discount_amount + v_discount > v_role_limit then
    raise exception 'Discount exceeds the authority limit for the current role.';
  end if;

  insert into sales.discount_events(
    order_id, order_line_id, scope_key, discount_type_key, discount_value,
    original_amount, discount_amount, resulting_amount, reason, actor_id, actor_role_key
  ) values (
    p_order_id, case when p_scope = 'line' then p_order_line_id else null end,
    p_scope, p_discount_type, p_discount_value, v_applicable, v_discount,
    v_applicable - v_discount, btrim(p_reason), auth.uid(), v_role
  );
  update sales.orders set
    discount_amount = discount_amount + v_discount,
    subtotal_amount = subtotal_amount - v_discount,
    total_amount = total_amount - v_discount
  where id = p_order_id;
end;
$$;

revoke all on function public.admin_apply_order_discount(uuid, text, uuid, text, numeric, text) from public, anon;
grant execute on function public.admin_apply_order_discount(uuid, text, uuid, text, numeric, text) to authenticated;

create or replace function public.admin_order_discounts(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_reyon_admin() then jsonb_build_object(
    'grossProductAmount', o.gross_product_amount,
    'discountAmount', o.discount_amount,
    'netProductAmount', o.subtotal_amount,
    'events', coalesce((select jsonb_agg(jsonb_build_object(
      'id', d.id, 'scope', d.scope_key, 'orderLineId', d.order_line_id,
      'type', d.discount_type_key, 'value', d.discount_value,
      'originalAmount', d.original_amount, 'discountAmount', d.discount_amount,
      'resultingAmount', d.resulting_amount, 'reason', d.reason,
      'actorRole', d.actor_role_key, 'occurredAt', d.occurred_at
    ) order by d.occurred_at, d.id) from sales.discount_events d where d.order_id = o.id), '[]'::jsonb)
  ) else null end from sales.orders o where o.id = p_order_id;
$$;

revoke all on function public.admin_order_discounts(uuid) from public, anon;
grant execute on function public.admin_order_discounts(uuid) to authenticated;

comment on table sales.discount_events is
  'Append-only line/order discount evidence. Catalog and original order-line price snapshots remain unchanged.';

alter table sales.invoices
  add column gross_product_amount numeric(18, 2),
  add column discount_amount numeric(18, 2) not null default 0;
update sales.invoices set gross_product_amount = product_sales_amount where gross_product_amount is null;
alter table sales.invoices alter column gross_product_amount set not null;
alter table sales.invoices add constraint invoices_discount_amounts_valid check (
  gross_product_amount >= 0 and discount_amount >= 0
  and product_sales_amount = gross_product_amount - discount_amount
);

create or replace function sales.issue_invoice()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_invoice_id uuid; v_order sales.orders%rowtype;
begin
  select * into v_order from sales.orders where id = new.order_id;
  insert into sales.invoices(
    completed_sale_id, order_id, currency_code, gross_product_amount,
    discount_amount, product_sales_amount, delivery_charge_amount,
    grand_total_amount, issued_at
  ) values (
    new.id, new.order_id, new.currency_code, v_order.gross_product_amount,
    v_order.discount_amount, new.product_sales_amount,
    new.delivery_charge_amount, new.grand_total_amount, new.completed_at
  ) returning id into v_invoice_id;
  insert into sales.invoice_lines(
    invoice_id, line_number, sku, description, quantity,
    unit_price_amount, line_total_amount
  ) select v_invoice_id, ol.line_number, ol.sku_snapshot,
    ol.product_name_snapshot || case when ol.variant_label_snapshot is null then '' else ' — ' || ol.variant_label_snapshot end,
    ol.quantity, ol.unit_price_amount, ol.quantity * ol.unit_price_amount
  from sales.order_lines ol where ol.order_id = new.order_id order by ol.line_number;
  return new;
end;
$$;

create or replace function public.customer_sales_documents(p_order_reference text, p_phone text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'orderNumber', o.external_reference, 'invoiceNumber', i.invoice_number,
    'issuedAt', i.issued_at, 'currency', i.currency_code,
    'grossProductAmount', i.gross_product_amount, 'discountAmount', i.discount_amount,
    'productSales', i.product_sales_amount, 'deliveryCharge', i.delivery_charge_amount,
    'grandTotal', i.grand_total_amount,
    'lines', (select coalesce(jsonb_agg(jsonb_build_object(
      'lineNumber', il.line_number, 'sku', il.sku, 'description', il.description,
      'quantity', il.quantity, 'unitPrice', il.unit_price_amount, 'lineTotal', il.line_total_amount
    ) order by il.line_number), '[]'::jsonb) from sales.invoice_lines il where il.invoice_id = i.id),
    'receipts', (select coalesce(jsonb_agg(jsonb_build_object(
      'receiptNumber', r.receipt_number, 'method', r.payment_method_snapshot,
      'amount', r.amount, 'issuedAt', r.issued_at
    ) order by r.issued_at), '[]'::jsonb) from payments.receipts r where r.order_id = o.id)
  ) from sales.orders o join sales.order_addresses a on a.order_id = o.id
  join sales.invoices i on i.order_id = o.id
  where o.external_reference = upper(btrim(p_order_reference))
    and regexp_replace(a.phone, '[^0-9]+', '', 'g') = regexp_replace(p_phone, '[^0-9]+', '', 'g');
$$;
