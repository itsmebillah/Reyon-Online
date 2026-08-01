-- REYON Business OS: policy-neutral organization, location, and channel foundation.
-- This migration is additive, creates no access policies, and inserts no
-- assumptions about legal entities, warehouses, stores, offices, or channels.

create schema if not exists organization;

revoke all on schema organization from public, anon, authenticated;
grant usage on schema organization to service_role;

create or replace function organization.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function organization.set_updated_at() from public, anon, authenticated;

create table organization.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  display_name text not null,
  legal_name text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint organizations_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_display_name_present check (btrim(display_name) <> ''),
  constraint organizations_legal_name_present check (legal_name is null or btrim(legal_name) <> ''),
  constraint organizations_code_unique unique (code)
);

create table organization.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  code text not null,
  display_name text not null,
  kind_key text,
  time_zone text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint locations_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint locations_display_name_present check (btrim(display_name) <> ''),
  constraint locations_kind_key_format check (kind_key is null or kind_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint locations_time_zone_present check (time_zone is null or btrim(time_zone) <> ''),
  constraint locations_organization_code_unique unique (organization_id, code)
);

create table organization.channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  code text not null,
  display_name text not null,
  kind_key text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint channels_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint channels_display_name_present check (btrim(display_name) <> ''),
  constraint channels_kind_key_format check (kind_key is null or kind_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint channels_organization_code_unique unique (organization_id, code)
);

create table organization.location_channels (
  location_id uuid not null references organization.locations(id) on delete restrict,
  channel_id uuid not null references organization.channels(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (location_id, channel_id)
);

create index locations_organization_id_idx
  on organization.locations(organization_id);
create index channels_organization_id_idx
  on organization.channels(organization_id);
create index location_channels_channel_id_idx
  on organization.location_channels(channel_id);

create trigger organizations_set_updated_at before update on organization.organizations
for each row execute function organization.set_updated_at();
create trigger locations_set_updated_at before update on organization.locations
for each row execute function organization.set_updated_at();
create trigger channels_set_updated_at before update on organization.channels
for each row execute function organization.set_updated_at();

alter table organization.organizations enable row level security;
alter table organization.locations enable row level security;
alter table organization.channels enable row level security;
alter table organization.location_channels enable row level security;

revoke all on all tables in schema organization from public, anon, authenticated;
grant all on all tables in schema organization to service_role;

comment on schema organization is
  'Private operating-topology system of record. Records and access policies require approved business ownership.';
comment on column organization.locations.kind_key is
  'Optional classification key; allowed values require Product Owner approval.';
comment on column organization.channels.kind_key is
  'Optional classification key; allowed values require Product Owner approval.';
comment on table organization.location_channels is
  'Structural association only; it defines no fulfillment, allocation, stock-sharing, or accounting rules.';
