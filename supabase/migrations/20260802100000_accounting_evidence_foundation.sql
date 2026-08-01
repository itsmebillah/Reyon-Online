-- REYON Business OS: policy-neutral accounting evidence foundation.
-- This migration is additive and inserts no chart, posting mappings, journal,
-- recognition, valuation, tax, fiscal-period, close, or approval rules or records.

create schema if not exists accounting;

revoke all on schema accounting from public, anon, authenticated;
grant usage on schema accounting to service_role;

create or replace function accounting.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function accounting.prevent_evidence_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Accounting evidence is append-only; record an attributable correcting entry instead.';
end;
$$;

revoke all on function accounting.set_updated_at() from public, anon, authenticated;
revoke all on function accounting.prevent_evidence_mutation() from public, anon, authenticated;

create table accounting.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  parent_account_id uuid,
  code text not null,
  display_name text not null,
  source_namespace text,
  source_reference text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint ledger_accounts_code_present check (btrim(code) <> ''),
  constraint ledger_accounts_display_name_present check (btrim(display_name) <> ''),
  constraint ledger_accounts_source_namespace_format check (source_namespace is null or source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint ledger_accounts_source_reference_present check (source_reference is null or btrim(source_reference) <> ''),
  constraint ledger_accounts_source_pair check ((source_namespace is null) = (source_reference is null)),
  constraint ledger_accounts_not_self_parent check (parent_account_id is null or parent_account_id <> id),
  constraint ledger_accounts_organization_code_unique unique (organization_id, code),
  constraint ledger_accounts_source_reference_unique unique (source_namespace, source_reference),
  constraint ledger_accounts_id_organization_unique unique (id, organization_id),
  constraint ledger_accounts_parent_organization_fk
    foreign key (parent_account_id, organization_id)
    references accounting.ledger_accounts(id, organization_id) on delete restrict
);

create table accounting.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  currency_code text not null,
  source_namespace text not null,
  source_reference text not null,
  idempotency_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  description text,
  reverses_entry_id uuid,
  constraint journal_entries_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint journal_entries_source_namespace_format check (source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint journal_entries_source_reference_present check (btrim(source_reference) <> ''),
  constraint journal_entries_idempotency_key_present check (btrim(idempotency_key) <> ''),
  constraint journal_entries_description_present check (description is null or btrim(description) <> ''),
  constraint journal_entries_not_self_reversal check (reverses_entry_id is null or reverses_entry_id <> id),
  constraint journal_entries_source_reference_unique unique (source_namespace, source_reference),
  constraint journal_entries_idempotency_key_unique unique (idempotency_key),
  constraint journal_entries_id_organization_unique unique (id, organization_id),
  constraint journal_entries_reversal_organization_fk
    foreign key (reverses_entry_id, organization_id)
    references accounting.journal_entries(id, organization_id) on delete restrict
);

create table accounting.journal_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  journal_entry_id uuid not null,
  line_number integer not null,
  ledger_account_id uuid not null,
  signed_amount numeric(18, 2) not null,
  memo text,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint journal_lines_entry_organization_fk
    foreign key (journal_entry_id, organization_id)
    references accounting.journal_entries(id, organization_id) on delete restrict,
  constraint journal_lines_account_organization_fk
    foreign key (ledger_account_id, organization_id)
    references accounting.ledger_accounts(id, organization_id) on delete restrict,
  constraint journal_lines_number_positive check (line_number > 0),
  constraint journal_lines_amount_nonzero check (signed_amount <> 0),
  constraint journal_lines_memo_present check (memo is null or btrim(memo) <> ''),
  constraint journal_lines_entry_number_unique unique (journal_entry_id, line_number)
);

create index ledger_accounts_organization_id_idx on accounting.ledger_accounts(organization_id);
create index ledger_accounts_parent_account_id_idx on accounting.ledger_accounts(parent_account_id);
create index journal_entries_organization_occurred_idx on accounting.journal_entries(organization_id, occurred_at);
create index journal_entries_source_idx on accounting.journal_entries(source_namespace, source_reference);
create index journal_entries_reverses_entry_id_idx on accounting.journal_entries(reverses_entry_id);
create index journal_lines_account_id_idx on accounting.journal_lines(ledger_account_id);

create trigger ledger_accounts_set_updated_at before update on accounting.ledger_accounts
for each row execute function accounting.set_updated_at();
create trigger journal_entries_prevent_update before update or delete on accounting.journal_entries
for each row execute function accounting.prevent_evidence_mutation();
create trigger journal_lines_prevent_update before update or delete on accounting.journal_lines
for each row execute function accounting.prevent_evidence_mutation();

alter table accounting.ledger_accounts enable row level security;
alter table accounting.journal_entries enable row level security;
alter table accounting.journal_lines enable row level security;

revoke all on all tables in schema accounting from public, anon, authenticated;
grant all on all tables in schema accounting to service_role;

comment on schema accounting is
  'Private accounting evidence foundation. Finance-approved policy is required before any posting workflow exists.';
comment on table accounting.ledger_accounts is
  'Empty account-identity structure; account codes, hierarchy, classifications, effective dates, and governance remain unapproved.';
comment on table accounting.journal_entries is
  'Append-only source-linked evidence headers; no operational event currently creates an accounting entry.';
comment on table accounting.journal_lines is
  'Append-only signed monetary lines. Balance validation and posting are reserved for a future controlled Finance-approved transaction boundary.';
comment on column accounting.journal_lines.signed_amount is
  'The sign convention, debit/credit presentation, rounding, and reporting treatment require Finance approval.';
