-- REYON Business OS: AI-ready content governance foundation.
-- Inserts no content type, prompt, provider, generated content, validation rule,
-- reviewer decision, publication target, artifact, or business data.

create schema if not exists content;

revoke all on schema content from public, anon, authenticated;
grant usage on schema content to service_role;

create or replace function content.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function content.prevent_evidence_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Content evidence is append-only; create a successor version or correcting event instead.';
end;
$$;

revoke all on function content.set_updated_at() from public, anon, authenticated;
revoke all on function content.prevent_evidence_mutation() from public, anon, authenticated;

create table content.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  subject_namespace text not null,
  subject_reference text not null,
  source_version text not null,
  snapshot_reference text not null,
  snapshot_checksum text not null,
  captured_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  idempotency_key text not null,
  constraint source_snapshots_subject_namespace_format check (subject_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint source_snapshots_subject_reference_present check (btrim(subject_reference) <> ''),
  constraint source_snapshots_source_version_present check (btrim(source_version) <> ''),
  constraint source_snapshots_reference_present check (btrim(snapshot_reference) <> ''),
  constraint source_snapshots_checksum_present check (btrim(snapshot_checksum) <> ''),
  constraint source_snapshots_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint source_snapshots_idempotency_unique unique (idempotency_key)
);

create table content.artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  subject_namespace text not null,
  subject_reference text not null,
  content_type_key text not null,
  locale_code text not null,
  market_key text,
  channel_key text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint artifacts_subject_namespace_format check (subject_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint artifacts_subject_reference_present check (btrim(subject_reference) <> ''),
  constraint artifacts_content_type_format check (content_type_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint artifacts_locale_present check (btrim(locale_code) <> ''),
  constraint artifacts_market_format check (market_key is null or market_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint artifacts_channel_format check (channel_key is null or channel_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint artifacts_scope_unique unique nulls not distinct
    (organization_id, subject_namespace, subject_reference, content_type_key, locale_code, market_key, channel_key)
);

create table content.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references content.artifacts(id) on delete restrict,
  revision_number integer not null,
  content_schema_reference text not null,
  content_schema_version text not null,
  content_payload jsonb not null,
  content_checksum text not null,
  derivation_kind_key text not null,
  generation_configuration_reference text,
  generation_configuration_version text,
  supersedes_version_id uuid,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  constraint artifact_versions_revision_positive check (revision_number > 0),
  constraint artifact_versions_schema_reference_present check (btrim(content_schema_reference) <> ''),
  constraint artifact_versions_schema_version_present check (btrim(content_schema_version) <> ''),
  constraint artifact_versions_payload_not_null check (jsonb_typeof(content_payload) is not null),
  constraint artifact_versions_checksum_present check (btrim(content_checksum) <> ''),
  constraint artifact_versions_derivation_format check (derivation_kind_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint artifact_versions_generation_reference_present check (generation_configuration_reference is null or btrim(generation_configuration_reference) <> ''),
  constraint artifact_versions_generation_version_present check (generation_configuration_version is null or btrim(generation_configuration_version) <> ''),
  constraint artifact_versions_generation_pair check ((generation_configuration_reference is null) = (generation_configuration_version is null)),
  constraint artifact_versions_not_self_supersession check (supersedes_version_id is null or supersedes_version_id <> id),
  constraint artifact_versions_artifact_revision_unique unique (artifact_id, revision_number),
  constraint artifact_versions_id_artifact_unique unique (id, artifact_id),
  constraint artifact_versions_supersedes_artifact_fk
    foreign key (supersedes_version_id, artifact_id)
    references content.artifact_versions(id, artifact_id) on delete restrict
);

create table content.version_sources (
  artifact_version_id uuid not null references content.artifact_versions(id) on delete restrict,
  source_snapshot_id uuid not null references content.source_snapshots(id) on delete restrict,
  source_role_key text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint version_sources_role_format check (source_role_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  primary key (artifact_version_id, source_snapshot_id, source_role_key)
);

create table content.version_lineage (
  child_version_id uuid not null references content.artifact_versions(id) on delete restrict,
  parent_version_id uuid not null references content.artifact_versions(id) on delete restrict,
  derivation_key text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint version_lineage_derivation_format check (derivation_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint version_lineage_not_self check (child_version_id <> parent_version_id),
  primary key (child_version_id, parent_version_id, derivation_key)
);

create table content.validation_findings (
  id uuid primary key default gen_random_uuid(),
  artifact_version_id uuid not null references content.artifact_versions(id) on delete restrict,
  validator_reference text not null,
  validator_version text not null,
  finding_code text not null,
  severity_key text not null,
  finding_reference text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  idempotency_key text not null,
  constraint validation_findings_validator_reference_present check (btrim(validator_reference) <> ''),
  constraint validation_findings_validator_version_present check (btrim(validator_version) <> ''),
  constraint validation_findings_code_format check (finding_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint validation_findings_severity_format check (severity_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint validation_findings_reference_present check (finding_reference is null or btrim(finding_reference) <> ''),
  constraint validation_findings_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint validation_findings_idempotency_unique unique (idempotency_key)
);

create table content.review_events (
  id uuid primary key default gen_random_uuid(),
  artifact_version_id uuid not null references content.artifact_versions(id) on delete restrict,
  sequence_number integer not null,
  decision_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid not null,
  reason text,
  validation_evidence_reference text,
  idempotency_key text not null,
  constraint review_events_sequence_positive check (sequence_number > 0),
  constraint review_events_decision_format check (decision_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint review_events_reason_present check (reason is null or btrim(reason) <> ''),
  constraint review_events_validation_reference_present check (validation_evidence_reference is null or btrim(validation_evidence_reference) <> ''),
  constraint review_events_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint review_events_version_sequence_unique unique (artifact_version_id, sequence_number),
  constraint review_events_idempotency_unique unique (idempotency_key)
);

create table content.publication_attempts (
  id uuid primary key default gen_random_uuid(),
  artifact_version_id uuid not null references content.artifact_versions(id) on delete restrict,
  target_namespace text not null,
  target_reference text not null,
  renderer_reference text not null,
  renderer_version text not null,
  outcome_key text,
  external_reference text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid not null,
  idempotency_key text not null,
  constraint publication_attempts_target_namespace_format check (target_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint publication_attempts_target_reference_present check (btrim(target_reference) <> ''),
  constraint publication_attempts_renderer_reference_present check (btrim(renderer_reference) <> ''),
  constraint publication_attempts_renderer_version_present check (btrim(renderer_version) <> ''),
  constraint publication_attempts_outcome_format check (outcome_key is null or outcome_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint publication_attempts_external_reference_present check (external_reference is null or btrim(external_reference) <> ''),
  constraint publication_attempts_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint publication_attempts_idempotency_unique unique (idempotency_key)
);

create index source_snapshots_subject_idx on content.source_snapshots(organization_id, subject_namespace, subject_reference);
create index artifacts_subject_idx on content.artifacts(organization_id, subject_namespace, subject_reference);
create index artifact_versions_artifact_idx on content.artifact_versions(artifact_id, revision_number);
create index version_sources_snapshot_idx on content.version_sources(source_snapshot_id);
create index version_lineage_parent_idx on content.version_lineage(parent_version_id);
create index validation_findings_version_idx on content.validation_findings(artifact_version_id, occurred_at);
create index review_events_version_idx on content.review_events(artifact_version_id, occurred_at);
create index publication_attempts_version_idx on content.publication_attempts(artifact_version_id, occurred_at);

create trigger artifacts_set_updated_at before update on content.artifacts
for each row execute function content.set_updated_at();
create trigger source_snapshots_prevent_update before update or delete on content.source_snapshots
for each row execute function content.prevent_evidence_mutation();
create trigger artifact_versions_prevent_update before update or delete on content.artifact_versions
for each row execute function content.prevent_evidence_mutation();
create trigger version_sources_prevent_update before update or delete on content.version_sources
for each row execute function content.prevent_evidence_mutation();
create trigger version_lineage_prevent_update before update or delete on content.version_lineage
for each row execute function content.prevent_evidence_mutation();
create trigger validation_findings_prevent_update before update or delete on content.validation_findings
for each row execute function content.prevent_evidence_mutation();
create trigger review_events_prevent_update before update or delete on content.review_events
for each row execute function content.prevent_evidence_mutation();
create trigger publication_attempts_prevent_update before update or delete on content.publication_attempts
for each row execute function content.prevent_evidence_mutation();

alter table content.source_snapshots enable row level security;
alter table content.artifacts enable row level security;
alter table content.artifact_versions enable row level security;
alter table content.version_sources enable row level security;
alter table content.version_lineage enable row level security;
alter table content.validation_findings enable row level security;
alter table content.review_events enable row level security;
alter table content.publication_attempts enable row level security;

revoke all on all tables in schema content from public, anon, authenticated;
grant all on all tables in schema content to service_role;

comment on schema content is
  'Private content artifact, lineage, validation, review, and publication evidence; no AI or publisher is implemented.';
comment on table content.artifact_versions is
  'Immutable typed payload versions; schemas, derivation kinds, and generation configurations require approval.';
comment on table content.review_events is
  'Mandatory human decision evidence boundary; decision vocabulary and approval authority remain unimplemented.';
comment on table content.publication_attempts is
  'Evidence only; a future atomic contract must prove exact-version human approval before any publisher may write.';
