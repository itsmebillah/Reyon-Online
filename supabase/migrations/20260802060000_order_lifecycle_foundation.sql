-- REYON Business OS: policy-neutral order lifecycle foundation.
-- This migration is additive and inserts no orders, lifecycle vocabulary,
-- transition permissions, payment, fulfillment, return, tax, or customer data.

create schema if not exists sales;

revoke all on schema sales from public, anon, authenticated;
grant usage on schema sales to service_role;

create or replace function sales.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function sales.prevent_transition_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Order transitions are append-only; record a correcting transition instead.';
end;
$$;

revoke all on function sales.set_updated_at() from public, anon, authenticated;
revoke all on function sales.prevent_transition_mutation() from public, anon, authenticated;

create table sales.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  channel_id uuid not null references organization.channels(id) on delete restrict,
  external_reference text,
  currency_code text not null,
  source_namespace text not null,
  source_reference text not null,
  idempotency_key text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint orders_external_reference_present check (external_reference is null or btrim(external_reference) <> ''),
  constraint orders_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint orders_source_namespace_format check (source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint orders_source_reference_present check (btrim(source_reference) <> ''),
  constraint orders_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint orders_channel_external_reference_unique unique (channel_id, external_reference),
  constraint orders_idempotency_key_unique unique (idempotency_key)
);

create table sales.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  line_number integer not null,
  catalog_variant_id uuid references catalog.variants(id) on delete restrict,
  sku_snapshot text,
  product_name_snapshot text not null,
  variant_label_snapshot text,
  quantity numeric(20, 6) not null,
  unit_price_amount numeric(18, 2) not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint order_lines_number_positive check (line_number > 0),
  constraint order_lines_sku_snapshot_present check (sku_snapshot is null or btrim(sku_snapshot) <> ''),
  constraint order_lines_product_name_present check (btrim(product_name_snapshot) <> ''),
  constraint order_lines_variant_label_present check (variant_label_snapshot is null or btrim(variant_label_snapshot) <> ''),
  constraint order_lines_quantity_positive check (quantity > 0),
  constraint order_lines_unit_price_nonnegative check (unit_price_amount >= 0),
  constraint order_lines_order_number_unique unique (order_id, line_number)
);

create table sales.order_transitions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  sequence_number integer not null,
  from_state_key text,
  to_state_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  reason_key text,
  rule_version text,
  idempotency_key text not null,
  constraint order_transitions_sequence_positive check (sequence_number > 0),
  constraint order_transitions_from_state_format check (from_state_key is null or from_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint order_transitions_to_state_format check (to_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint order_transitions_reason_key_format check (reason_key is null or reason_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint order_transitions_rule_version_present check (rule_version is null or btrim(rule_version) <> ''),
  constraint order_transitions_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint order_transitions_state_changes check (from_state_key is null or from_state_key <> to_state_key),
  constraint order_transitions_order_sequence_unique unique (order_id, sequence_number),
  constraint order_transitions_idempotency_key_unique unique (idempotency_key)
);

create index orders_organization_id_idx on sales.orders(organization_id);
create index orders_channel_id_idx on sales.orders(channel_id);
create index orders_occurred_at_idx on sales.orders(occurred_at);
create index orders_source_idx on sales.orders(source_namespace, source_reference);
create index order_lines_catalog_variant_id_idx on sales.order_lines(catalog_variant_id);
create index order_transitions_order_occurred_idx on sales.order_transitions(order_id, occurred_at);

create trigger orders_set_updated_at before update on sales.orders
for each row execute function sales.set_updated_at();
create trigger order_lines_set_updated_at before update on sales.order_lines
for each row execute function sales.set_updated_at();
create trigger order_transitions_prevent_update before update or delete on sales.order_transitions
for each row execute function sales.prevent_transition_mutation();

alter table sales.orders enable row level security;
alter table sales.order_lines enable row level security;
alter table sales.order_transitions enable row level security;

revoke all on all tables in schema sales from public, anon, authenticated;
grant all on all tables in schema sales to service_role;

comment on schema sales is
  'Private order system of record. Lifecycle vocabulary and access policies require approved business rules.';
comment on table sales.order_lines is
  'Commercial line snapshots only; tax, discounts, payment, fulfillment, returns, and accounting are separate responsibilities.';
comment on table sales.order_transitions is
  'Append-only lifecycle evidence. Allowed states and transitions are intentionally not defined by this migration.';
comment on column sales.order_transitions.actor_id is
  'Opaque actor identifier pending approved identity and authorization architecture.';
