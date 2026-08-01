-- REYON Business OS: policy-neutral fulfillment and delivery foundation.
-- This migration is additive and inserts no fulfillment records, lifecycle
-- vocabulary, addresses, carriers, methods, fees, promises, or routing rules.

create schema if not exists fulfillment;

revoke all on schema fulfillment from public, anon, authenticated;
grant usage on schema fulfillment to service_role;

create or replace function fulfillment.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function fulfillment.prevent_evidence_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Fulfillment lifecycle evidence is append-only; record correcting evidence instead.';
end;
$$;

revoke all on function fulfillment.set_updated_at() from public, anon, authenticated;
revoke all on function fulfillment.prevent_evidence_mutation() from public, anon, authenticated;

create table fulfillment.fulfillments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  location_id uuid references organization.locations(id) on delete restrict,
  fulfillment_type_key text,
  source_namespace text not null,
  source_reference text not null,
  idempotency_key text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint fulfillments_type_key_format check (fulfillment_type_key is null or fulfillment_type_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fulfillments_source_namespace_format check (source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fulfillments_source_reference_present check (btrim(source_reference) <> ''),
  constraint fulfillments_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint fulfillments_idempotency_key_unique unique (idempotency_key)
);

create table fulfillment.fulfillment_lines (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references fulfillment.fulfillments(id) on delete restrict,
  line_number integer not null,
  order_line_id uuid not null references sales.order_lines(id) on delete restrict,
  quantity numeric(20, 6) not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint fulfillment_lines_number_positive check (line_number > 0),
  constraint fulfillment_lines_quantity_positive check (quantity > 0),
  constraint fulfillment_lines_fulfillment_number_unique unique (fulfillment_id, line_number),
  constraint fulfillment_lines_order_line_unique unique (fulfillment_id, order_line_id)
);

create table fulfillment.fulfillment_transitions (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references fulfillment.fulfillments(id) on delete restrict,
  sequence_number integer not null,
  from_state_key text,
  to_state_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  reason_key text,
  rule_version text,
  idempotency_key text not null,
  constraint fulfillment_transitions_sequence_positive check (sequence_number > 0),
  constraint fulfillment_transitions_from_state_format check (from_state_key is null or from_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fulfillment_transitions_to_state_format check (to_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fulfillment_transitions_reason_key_format check (reason_key is null or reason_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint fulfillment_transitions_rule_version_present check (rule_version is null or btrim(rule_version) <> ''),
  constraint fulfillment_transitions_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint fulfillment_transitions_state_changes check (from_state_key is null or from_state_key <> to_state_key),
  constraint fulfillment_transitions_sequence_unique unique (fulfillment_id, sequence_number),
  constraint fulfillment_transitions_idempotency_unique unique (idempotency_key)
);

create table fulfillment.delivery_references (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references fulfillment.fulfillments(id) on delete restrict,
  reference_type_key text not null,
  provider_namespace text not null,
  external_reference text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint delivery_references_type_key_format check (reference_type_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint delivery_references_provider_namespace_format check (provider_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint delivery_references_external_reference_present check (btrim(external_reference) <> ''),
  constraint delivery_references_provider_reference_unique unique (provider_namespace, external_reference)
);

create index fulfillments_order_id_idx on fulfillment.fulfillments(order_id);
create index fulfillments_location_id_idx on fulfillment.fulfillments(location_id);
create index fulfillment_lines_order_line_id_idx on fulfillment.fulfillment_lines(order_line_id);
create index fulfillment_transitions_fulfillment_occurred_idx
  on fulfillment.fulfillment_transitions(fulfillment_id, occurred_at);
create index delivery_references_fulfillment_id_idx on fulfillment.delivery_references(fulfillment_id);

create trigger fulfillments_set_updated_at before update on fulfillment.fulfillments
for each row execute function fulfillment.set_updated_at();
create trigger fulfillment_lines_set_updated_at before update on fulfillment.fulfillment_lines
for each row execute function fulfillment.set_updated_at();
create trigger fulfillment_transitions_prevent_update before update or delete on fulfillment.fulfillment_transitions
for each row execute function fulfillment.prevent_evidence_mutation();
create trigger delivery_references_prevent_update before update or delete on fulfillment.delivery_references
for each row execute function fulfillment.prevent_evidence_mutation();

alter table fulfillment.fulfillments enable row level security;
alter table fulfillment.fulfillment_lines enable row level security;
alter table fulfillment.fulfillment_transitions enable row level security;
alter table fulfillment.delivery_references enable row level security;

revoke all on all tables in schema fulfillment from public, anon, authenticated;
grant all on all tables in schema fulfillment to service_role;

comment on schema fulfillment is
  'Private fulfillment system of record. Workflow and delivery policies require approved business rules.';
comment on table fulfillment.fulfillment_lines is
  'Partial quantity assignments only; over-fulfillment and allocation rules remain unimplemented.';
comment on table fulfillment.fulfillment_transitions is
  'Append-only lifecycle evidence with no predefined state vocabulary or transition rules.';
comment on table fulfillment.delivery_references is
  'Opaque external delivery references; no carrier, tracking, or customer-communication behavior is implied.';
