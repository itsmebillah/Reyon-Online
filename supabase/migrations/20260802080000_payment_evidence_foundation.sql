-- REYON Business OS: provider-neutral payment evidence foundation.
-- This migration is additive and inserts no payment methods, provider settings,
-- states, capture/refund rules, fees, settlements, fraud policy, or accounting.

create schema if not exists payments;

revoke all on schema payments from public, anon, authenticated;
grant usage on schema payments to service_role;

create or replace function payments.prevent_evidence_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Payment evidence is append-only; record correcting evidence instead.';
end;
$$;

revoke all on function payments.prevent_evidence_mutation() from public, anon, authenticated;

create table payments.payment_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  payment_kind_key text not null,
  currency_code text not null,
  amount numeric(18, 2) not null,
  source_namespace text not null,
  source_reference text not null,
  idempotency_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  constraint payment_records_kind_key_format check (payment_kind_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint payment_records_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint payment_records_amount_positive check (amount > 0),
  constraint payment_records_source_namespace_format check (source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint payment_records_source_reference_present check (btrim(source_reference) <> ''),
  constraint payment_records_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint payment_records_idempotency_key_unique unique (idempotency_key)
);

create table payments.order_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments.payment_records(id) on delete restrict,
  order_id uuid not null references sales.orders(id) on delete restrict,
  amount numeric(18, 2) not null,
  allocation_kind_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  idempotency_key text not null,
  constraint order_allocations_amount_positive check (amount > 0),
  constraint order_allocations_kind_key_format check (allocation_kind_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint order_allocations_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint order_allocations_idempotency_key_unique unique (idempotency_key)
);

create table payments.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments.payment_records(id) on delete restrict,
  sequence_number integer not null,
  event_type_key text not null,
  from_state_key text,
  to_state_key text,
  provider_namespace text,
  provider_event_reference text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  rule_version text,
  idempotency_key text not null,
  constraint payment_events_sequence_positive check (sequence_number > 0),
  constraint payment_events_type_key_format check (event_type_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint payment_events_from_state_format check (from_state_key is null or from_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint payment_events_to_state_format check (to_state_key is null or to_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint payment_events_provider_namespace_format check (provider_namespace is null or provider_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint payment_events_provider_reference_present check (provider_event_reference is null or btrim(provider_event_reference) <> ''),
  constraint payment_events_provider_pair check ((provider_namespace is null) = (provider_event_reference is null)),
  constraint payment_events_rule_version_present check (rule_version is null or btrim(rule_version) <> ''),
  constraint payment_events_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint payment_events_state_changes check (from_state_key is null or to_state_key is null or from_state_key <> to_state_key),
  constraint payment_events_payment_sequence_unique unique (payment_id, sequence_number),
  constraint payment_events_provider_reference_unique unique (provider_namespace, provider_event_reference),
  constraint payment_events_idempotency_key_unique unique (idempotency_key)
);

create table payments.provider_references (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments.payment_records(id) on delete restrict,
  reference_type_key text not null,
  provider_namespace text not null,
  external_reference text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint provider_references_type_key_format check (reference_type_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint provider_references_provider_namespace_format check (provider_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint provider_references_external_reference_present check (btrim(external_reference) <> ''),
  constraint provider_references_provider_reference_unique unique (provider_namespace, external_reference)
);

create index payment_records_organization_occurred_idx
  on payments.payment_records(organization_id, occurred_at);
create index payment_records_source_idx
  on payments.payment_records(source_namespace, source_reference);
create index order_allocations_payment_id_idx on payments.order_allocations(payment_id);
create index order_allocations_order_id_idx on payments.order_allocations(order_id);
create index payment_events_payment_occurred_idx
  on payments.payment_events(payment_id, occurred_at);
create index provider_references_payment_id_idx on payments.provider_references(payment_id);

create trigger payment_records_prevent_update before update or delete on payments.payment_records
for each row execute function payments.prevent_evidence_mutation();
create trigger order_allocations_prevent_update before update or delete on payments.order_allocations
for each row execute function payments.prevent_evidence_mutation();
create trigger payment_events_prevent_update before update or delete on payments.payment_events
for each row execute function payments.prevent_evidence_mutation();
create trigger provider_references_prevent_update before update or delete on payments.provider_references
for each row execute function payments.prevent_evidence_mutation();

alter table payments.payment_records enable row level security;
alter table payments.order_allocations enable row level security;
alter table payments.payment_events enable row level security;
alter table payments.provider_references enable row level security;

revoke all on all tables in schema payments from public, anon, authenticated;
grant all on all tables in schema payments to service_role;

comment on schema payments is
  'Private payment evidence system of record. Provider behavior and financial treatment require approved rules.';
comment on table payments.payment_records is
  'Append-only monetary evidence; payment kind vocabulary and business effect remain unimplemented.';
comment on table payments.order_allocations is
  'Append-only order allocation evidence; allocation limits, currency matching, and correction rules remain unimplemented.';
comment on table payments.payment_events is
  'Append-only provider-neutral events; no state vocabulary or transition policy is defined.';
comment on table payments.provider_references is
  'Opaque provider identifiers only; payment instruments, credentials, and raw provider payloads must not be stored here.';
