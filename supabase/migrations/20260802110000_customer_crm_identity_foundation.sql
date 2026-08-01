-- REYON Business OS: privacy-minimizing customer and CRM identity foundation.
-- This migration is additive and inserts no PII, credentials, consent, preference,
-- segmentation, loyalty, marketing, service, authentication, or customer records.

create schema if not exists crm;

revoke all on schema crm from public, anon, authenticated;
grant usage on schema crm to service_role;

create or replace function crm.prevent_identity_evidence_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Customer identity evidence is append-only; record attributable correcting evidence instead.';
end;
$$;

revoke all on function crm.prevent_identity_evidence_mutation() from public, anon, authenticated;

alter table sales.orders
  add constraint orders_id_organization_unique unique (id, organization_id);

create table crm.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  constraint customers_id_organization_unique unique (id, organization_id)
);

create table crm.external_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  customer_id uuid not null,
  source_namespace text not null,
  source_reference text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  idempotency_key text not null,
  constraint external_identities_customer_organization_fk
    foreign key (customer_id, organization_id)
    references crm.customers(id, organization_id) on delete restrict,
  constraint external_identities_source_namespace_format check (source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint external_identities_source_reference_present check (btrim(source_reference) <> ''),
  constraint external_identities_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint external_identities_source_reference_unique unique (source_namespace, source_reference),
  constraint external_identities_idempotency_key_unique unique (idempotency_key)
);

create table crm.order_associations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  customer_id uuid not null,
  order_id uuid not null,
  association_kind_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  idempotency_key text not null,
  constraint order_associations_customer_organization_fk
    foreign key (customer_id, organization_id)
    references crm.customers(id, organization_id) on delete restrict,
  constraint order_associations_order_organization_fk
    foreign key (order_id, organization_id)
    references sales.orders(id, organization_id) on delete restrict,
  constraint order_associations_kind_key_format check (association_kind_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint order_associations_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint order_associations_idempotency_key_unique unique (idempotency_key)
);

create table crm.customer_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  customer_id uuid not null,
  sequence_number integer not null,
  event_type_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  reason text,
  rule_version text,
  idempotency_key text not null,
  constraint customer_events_customer_organization_fk
    foreign key (customer_id, organization_id)
    references crm.customers(id, organization_id) on delete restrict,
  constraint customer_events_sequence_positive check (sequence_number > 0),
  constraint customer_events_type_key_format check (event_type_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint customer_events_reason_present check (reason is null or btrim(reason) <> ''),
  constraint customer_events_rule_version_present check (rule_version is null or btrim(rule_version) <> ''),
  constraint customer_events_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint customer_events_customer_sequence_unique unique (customer_id, sequence_number),
  constraint customer_events_idempotency_key_unique unique (idempotency_key)
);

create index customers_organization_id_idx on crm.customers(organization_id);
create index external_identities_customer_id_idx on crm.external_identities(customer_id);
create index order_associations_customer_occurred_idx on crm.order_associations(customer_id, occurred_at);
create index order_associations_order_id_idx on crm.order_associations(order_id);
create index customer_events_customer_occurred_idx on crm.customer_events(customer_id, occurred_at);

create trigger customers_prevent_update before update or delete on crm.customers
for each row execute function crm.prevent_identity_evidence_mutation();
create trigger external_identities_prevent_update before update or delete on crm.external_identities
for each row execute function crm.prevent_identity_evidence_mutation();
create trigger order_associations_prevent_update before update or delete on crm.order_associations
for each row execute function crm.prevent_identity_evidence_mutation();
create trigger customer_events_prevent_update before update or delete on crm.customer_events
for each row execute function crm.prevent_identity_evidence_mutation();

alter table crm.customers enable row level security;
alter table crm.external_identities enable row level security;
alter table crm.order_associations enable row level security;
alter table crm.customer_events enable row level security;

revoke all on all tables in schema crm from public, anon, authenticated;
grant all on all tables in schema crm to service_role;

comment on schema crm is
  'Private, privacy-minimizing customer identity evidence. PII and customer behavior require approved privacy and business rules.';
comment on table crm.customers is
  'Pseudonymous organization-owned customer identity containing no profile or contact attributes.';
comment on table crm.external_identities is
  'Opaque replaceable-system identity references only; credentials, tokens, and provider payloads are prohibited.';
comment on table crm.order_associations is
  'Append-only customer-to-order association evidence; association vocabulary and cardinality remain unapproved.';
comment on table crm.customer_events is
  'Append-only customer identity events; no lifecycle, merge, erasure, consent, or segmentation behavior is defined.';
