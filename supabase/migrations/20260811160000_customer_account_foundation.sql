-- REYON Business OS: Sprint 15 privacy-controlled customer account foundation.

create table crm.customer_profiles (
  customer_id uuid primary key references crm.customers(id) on delete restrict,
  full_name text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint customer_profiles_name_present check (btrim(full_name) <> '')
);

create table crm.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references crm.customers(id) on delete restrict,
  contact_kind text not null check (contact_kind in ('phone','email')),
  contact_value text not null,
  normalized_value text not null,
  verified_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint customer_contacts_value_present check (btrim(contact_value) <> ''),
  constraint customer_contacts_normalized_present check (btrim(normalized_value) <> ''),
  constraint customer_contacts_customer_kind_unique unique(customer_id,contact_kind)
);

create unique index customer_contacts_verified_identity_unique
  on crm.customer_contacts(contact_kind,normalized_value) where verified_at is not null;
create index customer_contacts_customer_idx on crm.customer_contacts(customer_id);

alter table crm.customer_profiles enable row level security;
alter table crm.customer_contacts enable row level security;
revoke all on crm.customer_profiles,crm.customer_contacts from public,anon,authenticated;
grant all on crm.customer_profiles,crm.customer_contacts to service_role;

comment on table crm.customer_profiles is 'Private minimal customer profile for account, order, delivery, and support use.';
comment on table crm.customer_contacts is 'Private phone/email contacts; verified uniqueness prevents duplicate customer identities.';
