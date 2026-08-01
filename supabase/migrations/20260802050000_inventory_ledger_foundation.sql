-- REYON Business OS: policy-neutral inventory ledger foundation.
-- This migration is additive and inserts no stock, movement types, balances,
-- availability formulas, reservation rules, valuation, or adjustment policy.

create schema if not exists inventory;

revoke all on schema inventory from public, anon, authenticated;
grant usage on schema inventory to service_role;

create or replace function inventory.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function inventory.prevent_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Inventory ledger records are append-only; record a correcting movement instead.';
end;
$$;

revoke all on function inventory.set_updated_at() from public, anon, authenticated;
revoke all on function inventory.prevent_ledger_mutation() from public, anon, authenticated;

create table inventory.stock_items (
  id uuid primary key default gen_random_uuid(),
  catalog_variant_id uuid references catalog.variants(id) on delete restrict,
  code text not null,
  display_name text not null,
  base_unit_code text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint stock_items_code_format check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'),
  constraint stock_items_display_name_present check (btrim(display_name) <> ''),
  constraint stock_items_base_unit_format check (base_unit_code ~ '^[A-Z0-9][A-Z0-9_-]*$'),
  constraint stock_items_code_unique unique (code),
  constraint stock_items_catalog_variant_unique unique (catalog_variant_id)
);

create table inventory.lots (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references inventory.stock_items(id) on delete restrict,
  lot_code text not null,
  manufactured_on date,
  expires_on date,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint lots_code_present check (btrim(lot_code) <> ''),
  constraint lots_dates_valid check (expires_on is null or manufactured_on is null or expires_on >= manufactured_on),
  constraint lots_item_code_unique unique (stock_item_id, lot_code),
  constraint lots_id_item_unique unique (id, stock_item_id)
);

create table inventory.movements (
  id uuid primary key default gen_random_uuid(),
  movement_type_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  source_namespace text not null,
  source_reference text not null,
  idempotency_key text not null,
  reason_key text,
  actor_id uuid,
  reverses_movement_id uuid references inventory.movements(id) on delete restrict,
  constraint movements_type_key_format check (movement_type_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint movements_source_namespace_format check (source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint movements_source_reference_present check (btrim(source_reference) <> ''),
  constraint movements_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint movements_reason_key_format check (reason_key is null or reason_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint movements_not_self_reversal check (reverses_movement_id is null or reverses_movement_id <> id),
  constraint movements_idempotency_key_unique unique (idempotency_key)
);

create table inventory.movement_lines (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references inventory.movements(id) on delete restrict,
  line_number integer not null,
  stock_item_id uuid not null references inventory.stock_items(id) on delete restrict,
  location_id uuid not null references organization.locations(id) on delete restrict,
  lot_id uuid,
  quantity_delta numeric(20, 6) not null,
  unit_code text not null,
  condition_key text,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint movement_lines_number_positive check (line_number > 0),
  constraint movement_lines_quantity_nonzero check (quantity_delta <> 0),
  constraint movement_lines_unit_format check (unit_code ~ '^[A-Z0-9][A-Z0-9_-]*$'),
  constraint movement_lines_condition_key_format check (condition_key is null or condition_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint movement_lines_movement_number_unique unique (movement_id, line_number),
  constraint movement_lines_lot_item_fk foreign key (lot_id, stock_item_id)
    references inventory.lots(id, stock_item_id) on delete restrict
);

create index lots_stock_item_id_idx on inventory.lots(stock_item_id);
create index movements_occurred_at_idx on inventory.movements(occurred_at);
create index movements_source_idx on inventory.movements(source_namespace, source_reference);
create index movements_reverses_movement_id_idx on inventory.movements(reverses_movement_id);
create index movement_lines_stock_location_idx on inventory.movement_lines(stock_item_id, location_id);
create index movement_lines_location_id_idx on inventory.movement_lines(location_id);
create index movement_lines_lot_id_idx on inventory.movement_lines(lot_id);

create trigger stock_items_set_updated_at before update on inventory.stock_items
for each row execute function inventory.set_updated_at();
create trigger lots_set_updated_at before update on inventory.lots
for each row execute function inventory.set_updated_at();
create trigger movements_prevent_update before update or delete on inventory.movements
for each row execute function inventory.prevent_ledger_mutation();
create trigger movement_lines_prevent_update before update or delete on inventory.movement_lines
for each row execute function inventory.prevent_ledger_mutation();

alter table inventory.stock_items enable row level security;
alter table inventory.lots enable row level security;
alter table inventory.movements enable row level security;
alter table inventory.movement_lines enable row level security;

revoke all on all tables in schema inventory from public, anon, authenticated;
grant all on all tables in schema inventory to service_role;

comment on schema inventory is
  'Private inventory system of record. Movement semantics and access policies require approved business rules.';
comment on table inventory.movements is
  'Append-only movement headers. Corrections must be represented by new attributable movements.';
comment on table inventory.movement_lines is
  'Append-only signed quantity deltas by stock item and location; no availability or valuation formula is implied.';
comment on column inventory.movements.movement_type_key is
  'Allowed movement types require Product Owner and Inventory Owner approval.';
comment on column inventory.movement_lines.condition_key is
  'Optional stock-condition key; allowed values and effects remain unapproved.';
