# Automation Control-Plane Architecture

## Purpose

This document defines a human-governed automation control plane for REYON Business OS. It separates versioned automation intent and execution evidence from business rules, domain commands, schedulers, workers, credentials, integrations, and side effects.

## Table of Contents

- [Scope](#scope)
- [Architecture](#architecture)
- [Logical data model](#logical-data-model)
- [Human control and approvals](#human-control-and-approvals)
- [Execution evidence and recovery](#execution-evidence-and-recovery)
- [Security and privacy](#security-and-privacy)
- [Domain boundaries](#domain-boundaries)
- [Pending business decisions](#pending-business-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope

Sprint 12 creates an empty private foundation for stable automation identities, immutable versions, review and control events, idempotent execution identities, execution events, and step-attempt evidence. It creates no definitions, conditions, schedules, payloads, credentials, workers, retries, notifications, commands, side effects, enabled workflows, or execution records.

## Architecture

An automation version references approved human-readable business-rule, trigger, and action contracts by stable version. It does not embed executable business logic or acquire direct ownership of another domain's tables. A future orchestrator may request a domain command only through that domain's authorized, idempotent contract; the domain remains responsible for validation and effects.

Definition identity, immutable version, human review, operational control, execution request, lifecycle evidence, and step attempts are separate records. This prevents a mutable enabled flag or overwritten workflow from obscuring which version ran, why it ran, who controlled it, and what happened.

## Logical Data Model

| Record             | Responsibility                                                                                   | Explicit boundary                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Definition         | Stable organization-owned identity and label                                                     | Contains no workflow or enabled state                                           |
| Definition version | Purpose, owner, approved rule/trigger/action contract versions, effective time, and supersession | Contains no executable condition, payload, schedule, retry, or secret           |
| Review event       | Ordered, attributable, append-only review evidence                                               | Defines no reviewer role, decision vocabulary, or activation effect             |
| Control event      | Ordered, attributable, append-only human control evidence                                        | Defines no pause, resume, cancellation, emergency authority, or runtime effect  |
| Execution          | Idempotent identity tied to an exact version and trigger reference                               | Does not execute work or store a trigger payload                                |
| Execution event    | Ordered append-only lifecycle evidence                                                           | Defines no state vocabulary, transition policy, timeout, or side effect         |
| Step attempt       | Append-only timing, opaque external reference, and optional outcome                              | Defines no graph, action, retry limit, backoff, compensation, or result payload |

Migration `20260802130000_automation_control_plane_foundation.sql` creates these records in a private `automation` schema and inserts no reference, demonstration, or production data.

## Human Control and Approvals

Automation must never become active merely because a definition exists. Future activation requires approved review vocabulary, eligible reviewers, segregation of duties, effective window, access scope, data classification, test evidence, monitoring, recovery, exception ownership, and control-event semantics.

Human operators must eventually be able to inspect the exact version, source trigger, planned domain actions, prior attempts, current evidence, and likely impact before approving, pausing, cancelling, retrying, or overriding. Emergency controls require named authority, reason, notification, expiry when appropriate, and retrospective review; none are implemented here.

## Execution Evidence and Recovery

An execution is immutable and idempotent. Events and attempts are appended rather than updating a current status. A future validated projection may derive state from ordered evidence. Retries must use explicit attempt numbers and idempotency at both orchestration and domain-command boundaries.

Failure, timeout, partial completion, duplicate delivery, stale input, concurrency conflict, downstream rejection, and uncertain external outcomes must remain visible and reconcilable. Compensation is not assumed to be reversal; every domain must define its approved correction contract.

## Security and Privacy

Every table has row-level security enabled. Anonymous and authenticated roles have no privileges or policies, and the schema is not exposed through the configured Data API. Only trusted server-side control-plane components may eventually receive narrowly approved access.

The foundation stores identifiers and provenance, not trigger payloads, domain data, credentials, tokens, prompts, or results. Future execution data must be minimized, classified, encrypted where required, retained deliberately, and excluded from client-visible errors and unsafe logs. Automation identities require named ownership and credential rotation outside this schema.

## Domain Boundaries

- Business-rule owners define authoritative intent; automation references immutable approved rule versions.
- Operational domains validate and own commands and side effects; automation does not write their tables directly.
- Reporting supplies approved metric versions and freshness evidence, not implicit trigger truth.
- Identity and authorization own actor and service permissions.
- Integrations own protocol translation, credentials, signature validation, transport retries, and external reconciliation.
- AI may later propose or assist actions only through separate evaluation and human-oversight controls.

## Pending Business Decisions

### TODO — Product Owner / Domain Owners

- Prioritize automation use cases and define outcome, owner, trigger, conditions, actions, exceptions, limits, approvals, and acceptance.
- Define human-review points, notification needs, operating hours, latency, retry, escalation, and correction behavior.
- Supply normal, boundary, invalid, duplicate, stale, partial-failure, and recovery examples.

### TODO — Architecture / Security / Operations

- Select orchestration, scheduling, messaging, worker, secrets, observability, and incident technologies after workload evidence exists.
- Define schemas, delivery guarantees, idempotency, ordering, concurrency, timeout, retry, dead-letter, compensation, and reconciliation standards.
- Approve service identities, least privilege, maker-checker controls, kill-switch semantics, retention, audit export, deployment, rollback, and recovery.

## Future Expansion

Add approved trigger adapters, decision evaluation, schedules, queues, workers, command adapters, human task queues, notifications, pause/cancel controls, retries, dead-letter handling, compensation, reconciliation, simulation, dry runs, dependency graphs, observability, dashboards, and incident runbooks. Every enabled automation must reference approved immutable contracts and remain interruptible and attributable.

## Related Documents

- [Project Vision](00_PROJECT_VISION.md)
- [Business Rules](02_BUSINESS_RULES.md)
- [User Roles](03_USER_ROLES.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Coding Standards](11_CODING_STANDARDS.md)
- [Roadmap](13_ROADMAP.md)
- [Reporting and Analytics Contract Architecture](23_REPORTING_ANALYTICS_CONTRACT_ARCHITECTURE.md)
