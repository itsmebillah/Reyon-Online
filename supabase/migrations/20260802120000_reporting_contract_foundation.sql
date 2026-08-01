-- REYON Business OS: policy-neutral reporting contract foundation.
-- Inserts no metric, calculation, target, report, projection, or business data.

create schema if not exists reporting;

revoke all on schema reporting from public, anon, authenticated;
grant usage on schema reporting to service_role;

create or replace function reporting.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function reporting.prevent_evidence_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Reporting evidence is append-only; create a new version or correcting event instead.';
end;
$$;

revoke all on function reporting.set_updated_at() from public, anon, authenticated;
revoke all on function reporting.prevent_evidence_mutation() from public, anon, authenticated;

create table reporting.metric_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  metric_key text not null,
  display_name text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint metric_definitions_key_format check (metric_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint metric_definitions_display_name_present check (btrim(display_name) <> ''),
  constraint metric_definitions_organization_key_unique unique (organization_id, metric_key),
  constraint metric_definitions_id_organization_unique unique (id, organization_id)
);

create table reporting.metric_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  metric_definition_id uuid not null,
  version_number integer not null,
  definition_text text not null,
  grain_text text not null,
  time_basis_text text not null,
  correction_treatment_text text not null,
  owner_reference text not null,
  effective_at timestamptz,
  supersedes_version_id uuid,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  constraint metric_versions_definition_organization_fk
    foreign key (metric_definition_id, organization_id)
    references reporting.metric_definitions(id, organization_id) on delete restrict,
  constraint metric_versions_number_positive check (version_number > 0),
  constraint metric_versions_definition_present check (btrim(definition_text) <> ''),
  constraint metric_versions_grain_present check (btrim(grain_text) <> ''),
  constraint metric_versions_time_basis_present check (btrim(time_basis_text) <> ''),
  constraint metric_versions_correction_present check (btrim(correction_treatment_text) <> ''),
  constraint metric_versions_owner_present check (btrim(owner_reference) <> ''),
  constraint metric_versions_not_self_supersession check (supersedes_version_id is null or supersedes_version_id <> id),
  constraint metric_versions_definition_version_unique unique (metric_definition_id, version_number),
  constraint metric_versions_id_definition_unique unique (id, metric_definition_id),
  constraint metric_versions_supersedes_definition_fk
    foreign key (supersedes_version_id, metric_definition_id)
    references reporting.metric_versions(id, metric_definition_id) on delete restrict
);

create table reporting.metric_sources (
  id uuid primary key default gen_random_uuid(),
  metric_version_id uuid not null references reporting.metric_versions(id) on delete restrict,
  source_namespace text not null,
  source_contract_reference text not null,
  source_contract_version text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint metric_sources_namespace_format check (source_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint metric_sources_reference_present check (btrim(source_contract_reference) <> ''),
  constraint metric_sources_version_present check (btrim(source_contract_version) <> ''),
  constraint metric_sources_version_source_unique unique (metric_version_id, source_namespace, source_contract_reference)
);

create table reporting.metric_review_events (
  id uuid primary key default gen_random_uuid(),
  metric_version_id uuid not null references reporting.metric_versions(id) on delete restrict,
  sequence_number integer not null,
  decision_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  reason text,
  idempotency_key text not null,
  constraint metric_review_events_sequence_positive check (sequence_number > 0),
  constraint metric_review_events_decision_format check (decision_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint metric_review_events_reason_present check (reason is null or btrim(reason) <> ''),
  constraint metric_review_events_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint metric_review_events_version_sequence_unique unique (metric_version_id, sequence_number),
  constraint metric_review_events_idempotency_unique unique (idempotency_key)
);

create table reporting.projection_runs (
  id uuid primary key default gen_random_uuid(),
  metric_version_id uuid not null references reporting.metric_versions(id) on delete restrict,
  as_of_at timestamptz not null,
  source_watermark text not null,
  outcome_key text,
  artifact_reference text,
  artifact_checksum text,
  row_count bigint,
  started_at timestamptz not null,
  completed_at timestamptz,
  recorded_at timestamptz not null default statement_timestamp(),
  idempotency_key text not null,
  constraint projection_runs_watermark_present check (btrim(source_watermark) <> ''),
  constraint projection_runs_outcome_format check (outcome_key is null or outcome_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint projection_runs_artifact_reference_present check (artifact_reference is null or btrim(artifact_reference) <> ''),
  constraint projection_runs_artifact_checksum_present check (artifact_checksum is null or btrim(artifact_checksum) <> ''),
  constraint projection_runs_artifact_pair check ((artifact_reference is null) = (artifact_checksum is null)),
  constraint projection_runs_row_count_nonnegative check (row_count is null or row_count >= 0),
  constraint projection_runs_completion_valid check (completed_at is null or completed_at >= started_at),
  constraint projection_runs_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint projection_runs_idempotency_unique unique (idempotency_key)
);

create index metric_definitions_organization_idx on reporting.metric_definitions(organization_id);
create index metric_versions_definition_effective_idx on reporting.metric_versions(metric_definition_id, effective_at);
create index metric_sources_version_idx on reporting.metric_sources(metric_version_id);
create index metric_review_events_version_occurred_idx on reporting.metric_review_events(metric_version_id, occurred_at);
create index projection_runs_version_as_of_idx on reporting.projection_runs(metric_version_id, as_of_at);

create trigger metric_definitions_set_updated_at before update on reporting.metric_definitions
for each row execute function reporting.set_updated_at();
create trigger metric_versions_prevent_update before update or delete on reporting.metric_versions
for each row execute function reporting.prevent_evidence_mutation();
create trigger metric_sources_prevent_update before update or delete on reporting.metric_sources
for each row execute function reporting.prevent_evidence_mutation();
create trigger metric_review_events_prevent_update before update or delete on reporting.metric_review_events
for each row execute function reporting.prevent_evidence_mutation();
create trigger projection_runs_prevent_update before update or delete on reporting.projection_runs
for each row execute function reporting.prevent_evidence_mutation();

alter table reporting.metric_definitions enable row level security;
alter table reporting.metric_versions enable row level security;
alter table reporting.metric_sources enable row level security;
alter table reporting.metric_review_events enable row level security;
alter table reporting.projection_runs enable row level security;

revoke all on all tables in schema reporting from public, anon, authenticated;
grant all on all tables in schema reporting to service_role;

comment on schema reporting is
  'Private metric-contract and lineage evidence; no metric or report is approved by this schema.';
comment on table reporting.metric_definitions is
  'Stable metric identities only; no metric keys or names are seeded.';
comment on table reporting.metric_versions is
  'Append-only semantic versions preserving grain, time basis, correction treatment, owner, and supersession.';
comment on table reporting.metric_sources is
  'Append-only source-contract references; operational tables are not public reporting APIs.';
comment on table reporting.metric_review_events is
  'Append-only review evidence; decisions and approval authority remain unimplemented.';
comment on table reporting.projection_runs is
  'Append-only lineage evidence; no calculator, metric values, artifact store, dashboard, or publisher exists.';
