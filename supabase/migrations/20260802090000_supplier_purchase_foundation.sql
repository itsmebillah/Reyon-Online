-- REYON Business OS: policy-neutral supplier and purchase-order foundation.
-- This migration is additive and inserts no supplier, purchase, approval,
-- receiving, tax, landed-cost, payment, or accounting rules or records.

create schema if not exists purchasing;

revoke all on schema purchasing from public, anon, authenticated;
grant usage on schema purchasing to service_role;

create or replace function purchasing.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function purchasing.prevent_transition_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Purchase lifecycle evidence is append-only; record a correcting transition instead.';
end;
$$;

revoke all on function purchasing.set_updated_at() from public, anon, authenticated;
revoke all on function purchasing.prevent_transition_mutation() from public, anon, authenticated;

-- Composite candidate keys allow downstream ownership-safe foreign keys.
alter table organization.locations
  add constraint locations_id_organization_unique unique (id, organization_id);

create table purchasing.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  code text not null,
  display_name text not null,
  legal_name text,
  source_namespace text,
  source_reference text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint suppliers_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint suppliers_display_name_present check (btrim(display_name) <> ''),
  constraint suppliers_legal_name_present check (legal_name is null or btrim(legal_name) <> ''),
  constraint suppliers_source_namespace_format check (source_namespace is null or source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint suppliers_source_reference_present check (source_reference is null or btrim(source_reference) <> ''),
  constraint suppliers_source_pair check ((source_namespace is null) = (source_reference is null)),
  constraint suppliers_organization_code_unique unique (organization_id, code),
  constraint suppliers_source_reference_unique unique (source_namespace, source_reference),
  constraint suppliers_id_organization_unique unique (id, organization_id)
);

create table purchasing.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  supplier_id uuid not null,
  destination_location_id uuid,
  external_reference text,
  currency_code text not null,
  source_namespace text not null,
  source_reference text not null,
  idempotency_key text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint purchase_orders_supplier_organization_fk
    foreign key (supplier_id, organization_id)
    references purchasing.suppliers(id, organization_id) on delete restrict,
  constraint purchase_orders_destination_organization_fk
    foreign key (destination_location_id, organization_id)
    references organization.locations(id, organization_id) on delete restrict,
  constraint purchase_orders_external_reference_present check (external_reference is null or btrim(external_reference) <> ''),
  constraint purchase_orders_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint purchase_orders_source_namespace_format check (source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint purchase_orders_source_reference_present check (btrim(source_reference) <> ''),
  constraint purchase_orders_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint purchase_orders_source_reference_unique unique (source_namespace, source_reference),
  constraint purchase_orders_idempotency_key_unique unique (idempotency_key)
);

create table purchasing.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchasing.purchase_orders(id) on delete restrict,
  line_number integer not null,
  catalog_variant_id uuid references catalog.variants(id) on delete restrict,
  sku_snapshot text not null,
  product_name_snapshot text not null,
  variant_label_snapshot text not null,
  quantity numeric(20, 6) not null,
  unit_cost_amount numeric(18, 2) not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint purchase_order_lines_number_positive check (line_number > 0),
  constraint purchase_order_lines_sku_present check (btrim(sku_snapshot) <> ''),
  constraint purchase_order_lines_product_name_present check (btrim(product_name_snapshot) <> ''),
  constraint purchase_order_lines_variant_label_present check (btrim(variant_label_snapshot) <> ''),
  constraint purchase_order_lines_quantity_positive check (quantity > 0),
  constraint purchase_order_lines_unit_cost_nonnegative check (unit_cost_amount >= 0),
  constraint purchase_order_lines_order_number_unique unique (purchase_order_id, line_number)
);

create table purchasing.purchase_transitions (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchasing.purchase_orders(id) on delete restrict,
  sequence_number integer not null,
  from_state_key text,
  to_state_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  reason text,
  rule_version text,
  idempotency_key text not null,
  constraint purchase_transitions_sequence_positive check (sequence_number > 0),
  constraint purchase_transitions_from_state_format check (from_state_key is null or from_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint purchase_transitions_to_state_format check (to_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint purchase_transitions_state_changes check (from_state_key is null or from_state_key <> to_state_key),
  constraint purchase_transitions_reason_present check (reason is null or btrim(reason) <> ''),
  constraint purchase_transitions_rule_version_present check (rule_version is null or btrim(rule_version) <> ''),
  constraint purchase_transitions_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint purchase_transitions_order_sequence_unique unique (purchase_order_id, sequence_number),
  constraint purchase_transitions_idempotency_key_unique unique (idempotency_key)
);

create index suppliers_organization_id_idx on purchasing.suppliers(organization_id);
create index purchase_orders_organization_occurred_idx on purchasing.purchase_orders(organization_id, occurred_at);
create index purchase_orders_supplier_id_idx on purchasing.purchase_orders(supplier_id);
create index purchase_orders_destination_location_id_idx on purchasing.purchase_orders(destination_location_id);
create index purchase_order_lines_catalog_variant_id_idx on purchasing.purchase_order_lines(catalog_variant_id);
create index purchase_transitions_order_occurred_idx on purchasing.purchase_transitions(purchase_order_id, occurred_at);

create trigger suppliers_set_updated_at before update on purchasing.suppliers
for each row execute function purchasing.set_updated_at();
create trigger purchase_orders_set_updated_at before update on purchasing.purchase_orders
for each row execute function purchasing.set_updated_at();
create trigger purchase_order_lines_set_updated_at before update on purchasing.purchase_order_lines
for each row execute function purchasing.set_updated_at();
create trigger purchase_transitions_prevent_update before update or delete on purchasing.purchase_transitions
for each row execute function purchasing.prevent_transition_mutation();

alter table purchasing.suppliers enable row level security;
alter table purchasing.purchase_orders enable row level security;
alter table purchasing.purchase_order_lines enable row level security;
alter table purchasing.purchase_transitions enable row level security;

revoke all on all tables in schema purchasing from public, anon, authenticated;
grant all on all tables in schema purchasing to service_role;

comment on schema purchasing is
  'Private supplier and purchase-order system of record. Commercial and workflow policy requires approved rules.';
comment on table purchasing.suppliers is
  'Minimal supplier identity only; contacts, terms, tax, payment, compliance, and status are deliberately excluded.';
comment on table purchasing.purchase_orders is
  'Purchase commitment identity; approval, receiving, tax, landed cost, payment, and accounting behavior are unimplemented.';
comment on table purchasing.purchase_order_lines is
  'Exact quantity and unit-cost snapshots; inventory receipt and financial treatment remain externally governed.';
comment on table purchasing.purchase_transitions is
  'Append-only lifecycle evidence; no state vocabulary, transition policy, or approval authority is defined.';
