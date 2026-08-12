-- REYON Business OS: globally unique customer invoices and separate payment receipts.

create sequence sales.invoice_number_sequence;
create sequence payments.receipt_number_sequence;

create table sales.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint not null default nextval('sales.invoice_number_sequence') unique,
  completed_sale_id uuid not null unique references sales.completed_sales(id) on delete restrict,
  order_id uuid not null unique references sales.orders(id) on delete restrict,
  currency_code text not null,
  product_sales_amount numeric(18, 2) not null,
  delivery_charge_amount numeric(18, 2) not null,
  grand_total_amount numeric(18, 2) not null,
  issued_at timestamptz not null default statement_timestamp(),
  constraint invoices_amounts_valid check (
    product_sales_amount >= 0 and delivery_charge_amount >= 0
    and grand_total_amount = product_sales_amount + delivery_charge_amount
  ),
  constraint invoices_currency_format check (currency_code ~ '^[A-Z]{3}$')
);

create table sales.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references sales.invoices(id) on delete restrict,
  line_number integer not null,
  sku text,
  description text not null,
  quantity numeric(20, 6) not null,
  unit_price_amount numeric(18, 2) not null,
  line_total_amount numeric(18, 2) not null,
  constraint invoice_lines_number_positive check (line_number > 0),
  constraint invoice_lines_description_present check (btrim(description) <> ''),
  constraint invoice_lines_quantity_positive check (quantity > 0),
  constraint invoice_lines_amounts_valid check (
    unit_price_amount >= 0 and line_total_amount = quantity * unit_price_amount
  ),
  constraint invoice_lines_number_unique unique (invoice_id, line_number)
);

create table payments.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number bigint not null default nextval('payments.receipt_number_sequence') unique,
  order_id uuid not null references sales.orders(id) on delete restrict,
  source_event_type text not null,
  source_event_id uuid not null,
  payment_method_snapshot text not null,
  amount numeric(18, 2) not null,
  currency_code text not null,
  issued_at timestamptz not null default statement_timestamp(),
  constraint receipts_source_event_type_format check (source_event_type ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint receipts_payment_method_present check (btrim(payment_method_snapshot) <> ''),
  constraint receipts_amount_valid check (amount >= 0),
  constraint receipts_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint receipts_source_event_unique unique (source_event_type, source_event_id)
);

create index invoice_lines_invoice_idx on sales.invoice_lines(invoice_id, line_number);
create index receipts_order_idx on payments.receipts(order_id, issued_at);

create trigger invoices_prevent_mutation before update or delete on sales.invoices
for each row execute function sales.prevent_transition_mutation();
create trigger invoice_lines_prevent_mutation before update or delete on sales.invoice_lines
for each row execute function sales.prevent_transition_mutation();
create trigger receipts_prevent_mutation before update or delete on payments.receipts
for each row execute function payments.prevent_evidence_mutation();

alter table sales.invoices enable row level security;
alter table sales.invoice_lines enable row level security;
alter table payments.receipts enable row level security;
revoke all on sales.invoices, sales.invoice_lines, payments.receipts from public, anon, authenticated;
grant all on sales.invoices, sales.invoice_lines, payments.receipts to service_role;
grant usage, select on sequence sales.invoice_number_sequence, payments.receipt_number_sequence to service_role;

create or replace function sales.issue_invoice()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_invoice_id uuid;
begin
  insert into sales.invoices(
    completed_sale_id, order_id, currency_code, product_sales_amount,
    delivery_charge_amount, grand_total_amount, issued_at
  ) values (
    new.id, new.order_id, new.currency_code, new.product_sales_amount,
    new.delivery_charge_amount, new.grand_total_amount, new.completed_at
  ) returning id into v_invoice_id;

  insert into sales.invoice_lines(
    invoice_id, line_number, sku, description, quantity,
    unit_price_amount, line_total_amount
  )
  select v_invoice_id, ol.line_number, ol.sku_snapshot,
    ol.product_name_snapshot || case when ol.variant_label_snapshot is null then '' else ' — ' || ol.variant_label_snapshot end,
    ol.quantity, ol.unit_price_amount, ol.quantity * ol.unit_price_amount
  from sales.order_lines ol where ol.order_id = new.order_id order by ol.line_number;
  return new;
end;
$$;

create trigger completed_sales_issue_invoice
after insert on sales.completed_sales
for each row execute function sales.issue_invoice();

insert into sales.invoices(
  completed_sale_id, order_id, currency_code, product_sales_amount,
  delivery_charge_amount, grand_total_amount, issued_at
)
select id, order_id, currency_code, product_sales_amount,
  delivery_charge_amount, grand_total_amount, completed_at
from sales.completed_sales
on conflict (completed_sale_id) do nothing;

insert into sales.invoice_lines(
  invoice_id, line_number, sku, description, quantity,
  unit_price_amount, line_total_amount
)
select i.id, ol.line_number, ol.sku_snapshot,
  ol.product_name_snapshot || case when ol.variant_label_snapshot is null then '' else ' — ' || ol.variant_label_snapshot end,
  ol.quantity, ol.unit_price_amount, ol.quantity * ol.unit_price_amount
from sales.invoices i
join sales.order_lines ol on ol.order_id = i.order_id
on conflict (invoice_id, line_number) do nothing;

create or replace function payments.issue_verified_receipt()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_order sales.orders%rowtype; v_method text;
begin
  if tg_table_name = 'manual_verification_events' and new.new_state_key <> 'verified' then
    return new;
  end if;
  select * into v_order from sales.orders where id = new.order_id;
  select method_name_snapshot into v_method from sales.order_payment_details where order_id = new.order_id;
  insert into payments.receipts(
    order_id, source_event_type, source_event_id, payment_method_snapshot,
    amount, currency_code, issued_at
  ) values (
    new.order_id,
    case when tg_table_name = 'collection_events' then 'payment-collected' else 'payment-verified' end,
    new.id, v_method, v_order.total_amount, v_order.currency_code, new.occurred_at
  );
  return new;
end;
$$;

create trigger manual_payment_issue_receipt
after insert on payments.manual_verification_events
for each row execute function payments.issue_verified_receipt();
create trigger cod_collection_issue_receipt
after insert on payments.collection_events
for each row execute function payments.issue_verified_receipt();

insert into payments.receipts(
  order_id, source_event_type, source_event_id, payment_method_snapshot,
  amount, currency_code, issued_at
)
select e.order_id, 'payment-verified', e.id, p.method_name_snapshot,
  o.total_amount, o.currency_code, e.occurred_at
from payments.manual_verification_events e
join sales.orders o on o.id = e.order_id
join sales.order_payment_details p on p.order_id = e.order_id
where e.new_state_key = 'verified'
on conflict (source_event_type, source_event_id) do nothing;

insert into payments.receipts(
  order_id, source_event_type, source_event_id, payment_method_snapshot,
  amount, currency_code, issued_at
)
select e.order_id, 'payment-collected', e.id, p.method_name_snapshot,
  e.amount, e.currency_code, e.occurred_at
from payments.collection_events e
join sales.order_payment_details p on p.order_id = e.order_id
on conflict (source_event_type, source_event_id) do nothing;

create or replace function public.admin_sales_register()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_reyon_admin() then coalesce(jsonb_agg(
    jsonb_build_object(
      'id', cs.id, 'orderId', o.id, 'orderNumber', o.external_reference,
      'invoiceNumber', i.invoice_number, 'receiptNumber', pr.receipt_number,
      'completedAt', cs.completed_at, 'productSales', cs.product_sales_amount,
      'deliveryCharge', cs.delivery_charge_amount, 'grandTotal', cs.grand_total_amount,
      'currency', cs.currency_code, 'paymentMethod', opd.method_name_snapshot,
      'paymentState', opd.evidence_state_key
    ) order by cs.completed_at desc
  ), '[]'::jsonb) else null end
  from sales.completed_sales cs
  join sales.orders o on o.id = cs.order_id
  join sales.order_payment_details opd on opd.order_id = o.id
  left join sales.invoices i on i.completed_sale_id = cs.id
  left join lateral (
    select receipt_number from payments.receipts where order_id = o.id order by issued_at desc limit 1
  ) pr on true;
$$;

create or replace function public.customer_sales_documents(p_order_reference text, p_phone text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'orderNumber', o.external_reference,
    'invoiceNumber', i.invoice_number,
    'issuedAt', i.issued_at,
    'currency', i.currency_code,
    'productSales', i.product_sales_amount,
    'deliveryCharge', i.delivery_charge_amount,
    'grandTotal', i.grand_total_amount,
    'lines', (select coalesce(jsonb_agg(jsonb_build_object(
      'lineNumber', il.line_number, 'sku', il.sku, 'description', il.description,
      'quantity', il.quantity, 'unitPrice', il.unit_price_amount, 'lineTotal', il.line_total_amount
    ) order by il.line_number), '[]'::jsonb) from sales.invoice_lines il where il.invoice_id = i.id),
    'receipts', (select coalesce(jsonb_agg(jsonb_build_object(
      'receiptNumber', r.receipt_number, 'method', r.payment_method_snapshot,
      'amount', r.amount, 'issuedAt', r.issued_at
    ) order by r.issued_at), '[]'::jsonb) from payments.receipts r where r.order_id = o.id)
  )
  from sales.orders o
  join sales.order_addresses a on a.order_id = o.id
  join sales.invoices i on i.order_id = o.id
  where o.external_reference = upper(btrim(p_order_reference))
    and regexp_replace(a.phone, '[^0-9]+', '', 'g') = regexp_replace(p_phone, '[^0-9]+', '', 'g');
$$;

revoke all on function public.customer_sales_documents(text, text) from public;
grant execute on function public.customer_sales_documents(text, text) to anon, authenticated;

comment on table sales.invoices is 'Immutable customer invoice headers issued for official completed sales.';
comment on table payments.receipts is 'Immutable payment receipts, separate from customer invoices.';
