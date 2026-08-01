-- REYON Business OS: policy-neutral automation control-plane foundation.
-- Inserts no executable logic, trigger, schedule, credential, retry policy,
-- side effect, enabled automation, execution, or business data.

create schema if not exists automation;

revoke all on schema automation from public, anon, authenticated;
grant usage on schema automation to service_role;

create or replace function automation.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function automation.prevent_evidence_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Automation evidence is append-only; create a new version or correcting event instead.';
end;
$$;

revoke all on function automation.set_updated_at() from public, anon, authenticated;
revoke all on function automation.prevent_evidence_mutation() from public, anon, authenticated;

create table automation.definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  automation_key text not null,
  display_name text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint definitions_key_format check (automation_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint definitions_display_name_present check (btrim(display_name) <> ''),
  constraint definitions_organization_key_unique unique (organization_id, automation_key),
  constraint definitions_id_organization_unique unique (id, organization_id)
);

create table automation.definition_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  automation_definition_id uuid not null,
  version_number integer not null,
  purpose_text text not null,
  owner_reference text not null,
  rule_contract_reference text not null,
  rule_contract_version text not null,
  trigger_contract_reference text not null,
  trigger_contract_version text not null,
  action_contract_reference text not null,
  action_contract_version text not null,
  effective_at timestamptz,
  supersedes_version_id uuid,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  constraint definition_versions_definition_organization_fk
    foreign key (automation_definition_id, organization_id)
    references automation.definitions(id, organization_id) on delete restrict,
  constraint definition_versions_number_positive check (version_number > 0),
  constraint definition_versions_purpose_present check (btrim(purpose_text) <> ''),
  constraint definition_versions_owner_present check (btrim(owner_reference) <> ''),
  constraint definition_versions_rule_reference_present check (btrim(rule_contract_reference) <> ''),
  constraint definition_versions_rule_version_present check (btrim(rule_contract_version) <> ''),
  constraint definition_versions_trigger_reference_present check (btrim(trigger_contract_reference) <> ''),
  constraint definition_versions_trigger_version_present check (btrim(trigger_contract_version) <> ''),
  constraint definition_versions_action_reference_present check (btrim(action_contract_reference) <> ''),
  constraint definition_versions_action_version_present check (btrim(action_contract_version) <> ''),
  constraint definition_versions_not_self_supersession check (supersedes_version_id is null or supersedes_version_id <> id),
  constraint definition_versions_definition_version_unique unique (automation_definition_id, version_number),
  constraint definition_versions_id_definition_unique unique (id, automation_definition_id),
  constraint definition_versions_supersedes_definition_fk
    foreign key (supersedes_version_id, automation_definition_id)
    references automation.definition_versions(id, automation_definition_id) on delete restrict
);

create table automation.review_events (
  id uuid primary key default gen_random_uuid(),
  definition_version_id uuid not null references automation.definition_versions(id) on delete restrict,
  sequence_number integer not null,
  decision_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  reason text,
  idempotency_key text not null,
  constraint review_events_sequence_positive check (sequence_number > 0),
  constraint review_events_decision_format check (decision_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint review_events_reason_present check (reason is null or btrim(reason) <> ''),
  constraint review_events_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint review_events_version_sequence_unique unique (definition_version_id, sequence_number),
  constraint review_events_idempotency_unique unique (idempotency_key)
);

create table automation.control_events (
  id uuid primary key default gen_random_uuid(),
  automation_definition_id uuid not null references automation.definitions(id) on delete restrict,
  sequence_number integer not null,
  control_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  reason text,
  idempotency_key text not null,
  constraint control_events_sequence_positive check (sequence_number > 0),
  constraint control_events_control_format check (control_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint control_events_reason_present check (reason is null or btrim(reason) <> ''),
  constraint control_events_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint control_events_definition_sequence_unique unique (automation_definition_id, sequence_number),
  constraint control_events_idempotency_unique unique (idempotency_key)
);

create table automation.executions (
  id uuid primary key default gen_random_uuid(),
  definition_version_id uuid not null references automation.definition_versions(id) on delete restrict,
  trigger_namespace text not null,
  trigger_reference text not null,
  requested_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  requested_by_actor_id uuid,
  correlation_reference text,
  idempotency_key text not null,
  constraint executions_trigger_namespace_format check (trigger_namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint executions_trigger_reference_present check (btrim(trigger_reference) <> ''),
  constraint executions_correlation_present check (correlation_reference is null or btrim(correlation_reference) <> ''),
  constraint executions_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint executions_idempotency_unique unique (idempotency_key)
);

create table automation.execution_events (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references automation.executions(id) on delete restrict,
  sequence_number integer not null,
  event_type_key text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  reason text,
  idempotency_key text not null,
  constraint execution_events_sequence_positive check (sequence_number > 0),
  constraint execution_events_type_format check (event_type_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint execution_events_reason_present check (reason is null or btrim(reason) <> ''),
  constraint execution_events_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint execution_events_execution_sequence_unique unique (execution_id, sequence_number),
  constraint execution_events_idempotency_unique unique (idempotency_key)
);

create table automation.step_attempts (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references automation.executions(id) on delete restrict,
  step_key text not null,
  attempt_number integer not null,
  outcome_key text,
  started_at timestamptz not null,
  completed_at timestamptz,
  recorded_at timestamptz not null default statement_timestamp(),
  external_reference text,
  idempotency_key text not null,
  constraint step_attempts_step_format check (step_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint step_attempts_attempt_positive check (attempt_number > 0),
  constraint step_attempts_outcome_format check (outcome_key is null or outcome_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint step_attempts_completion_valid check (completed_at is null or completed_at >= started_at),
  constraint step_attempts_external_reference_present check (external_reference is null or btrim(external_reference) <> ''),
  constraint step_attempts_idempotency_present check (btrim(idempotency_key) <> ''),
  constraint step_attempts_execution_step_attempt_unique unique (execution_id, step_key, attempt_number),
  constraint step_attempts_idempotency_unique unique (idempotency_key)
);

create index definitions_organization_idx on automation.definitions(organization_id);
create index definition_versions_definition_effective_idx on automation.definition_versions(automation_definition_id, effective_at);
create index review_events_version_occurred_idx on automation.review_events(definition_version_id, occurred_at);
create index control_events_definition_occurred_idx on automation.control_events(automation_definition_id, occurred_at);
create index executions_version_requested_idx on automation.executions(definition_version_id, requested_at);
create index execution_events_execution_occurred_idx on automation.execution_events(execution_id, occurred_at);
create index step_attempts_execution_idx on automation.step_attempts(execution_id);

create trigger definitions_set_updated_at before update on automation.definitions
for each row execute function automation.set_updated_at();
create trigger definition_versions_prevent_update before update or delete on automation.definition_versions
for each row execute function automation.prevent_evidence_mutation();
create trigger review_events_prevent_update before update or delete on automation.review_events
for each row execute function automation.prevent_evidence_mutation();
create trigger control_events_prevent_update before update or delete on automation.control_events
for each row execute function automation.prevent_evidence_mutation();
create trigger executions_prevent_update before update or delete on automation.executions
for each row execute function automation.prevent_evidence_mutation();
create trigger execution_events_prevent_update before update or delete on automation.execution_events
for each row execute function automation.prevent_evidence_mutation();
create trigger step_attempts_prevent_update before update or delete on automation.step_attempts
for each row execute function automation.prevent_evidence_mutation();

alter table automation.definitions enable row level security;
alter table automation.definition_versions enable row level security;
alter table automation.review_events enable row level security;
alter table automation.control_events enable row level security;
alter table automation.executions enable row level security;
alter table automation.execution_events enable row level security;
alter table automation.step_attempts enable row level security;

revoke all on all tables in schema automation from public, anon, authenticated;
grant all on all tables in schema automation to service_role;

comment on schema automation is
  'Private automation contract and execution evidence; no workflow is executable or enabled.';
comment on table automation.definition_versions is
  'Append-only references to approved rule, trigger, and action contracts; contains no executable payload.';
comment on table automation.control_events is
  'Append-only human control evidence; no control vocabulary or runtime effect is implemented.';
comment on table automation.executions is
  'Idempotent execution identity only; no scheduler, worker, credential, payload, or side effect exists.';
comment on table automation.step_attempts is
  'Append-only attempt evidence; retry limits and action behavior remain unapproved.';
