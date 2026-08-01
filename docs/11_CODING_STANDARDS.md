# Coding Standards

## Purpose

This document defines language-independent engineering expectations for future REYON Business OS code. Language and framework supplements must be added only after stack decisions are approved.

## Table of Contents

- [Engineering principles](#engineering-principles)
- [Design and boundaries](#design-and-boundaries)
- [Code quality](#code-quality)
- [Security and privacy](#security-and-privacy)
- [Data and integration](#data-and-integration)
- [Testing](#testing)
- [Observability and errors](#observability-and-errors)
- [Version control and review](#version-control-and-review)
- [Delivery and operations](#delivery-and-operations)
- [Definition of done](#definition-of-done)
- [Pending standards](#pending-standards)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Engineering Principles

Implementation must trace to an approved requirement or technical need, preserve domain language, make failure explicit, minimize hidden coupling, and favor maintainability over cleverness. TODO business policy must never be converted into assumed application behavior.

## Design and Boundaries

- Keep domain policy independent from presentation and infrastructure concerns.
- Enforce module ownership through documented public contracts.
- Avoid shared mutable state and cross-module storage access without architectural approval.
- Make time, currency, unit, identity, and authorization semantics explicit.
- Record consequential design choices as architecture decisions.

## Code Quality

Code should be readable, cohesive, consistently formatted, statically checked where supported, and free of unexplained duplication. Names must use approved domain terminology. Comments should explain intent and constraints, not restate syntax.

### TODO — Engineering

- Select language-specific formatters, linters, analyzers, naming rules, and complexity thresholds after stack approval.

## Security and Privacy

Validate at trust boundaries, authorize server-side, use safe output handling, protect secrets, minimize sensitive data, pin and scan dependencies as appropriate, and avoid logging credentials or protected content. Threat modeling is required for sensitive or high-impact capabilities.

## Data and Integration

Database and contract changes require compatibility and migration plans. APIs and events require explicit schemas, validation, authentication, authorization, idempotency where relevant, versioning, error semantics, and ownership. Monetary values must not use unsafe floating-point assumptions.

## Testing

Testing should cover domain rules, boundaries, permissions, invalid inputs, failure recovery, concurrency where relevant, and integrations. Test scope should balance unit, component, contract, integration, end-to-end, performance, security, accessibility, and recovery evidence according to risk.

### TODO — Engineering / Product Owner

- Define coverage expectations, required suites, representative environments, test-data policy, and acceptance ownership.

## Observability and Errors

Errors should be actionable without exposing sensitive internals. Logs, metrics, and traces need correlation, structured fields, ownership, retention, and alert intent. Business exceptions must remain distinguishable from technical failures.

## Version Control and Review

Changes should be focused, reviewable, and linked to context. Commit history must communicate intent. Reviews examine correctness, business-rule evidence, security, accessibility, data impacts, tests, operational effects, and documentation—not formatting alone.

## Delivery and Operations

Builds must be reproducible. Configuration is externalized and validated. Releases require automated checks, migration safety, rollback or forward-recovery plans, observable deployment, and environment separation.

## Definition of Done

A future change is done only when acceptance evidence exists; authorization, error, observability, data migration, accessibility, security, documentation, and operational impacts are addressed; and no unapproved business decision is hidden in code.

## Pending Standards

### TODO — Engineering

- Define branching, commit, review, CI, release, versioning, dependency, secrets, vulnerability, and incident standards.
- Add stack-specific supplements and exception/waiver governance.

## Future Expansion

Add language guides, API/event standards, testing strategy, secure-development standard, observability conventions, CI quality gates, release procedure, and decision-record template.

## Related Documents

- [Tech Stack](10_TECH_STACK.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Folder Structure](12_FOLDER_STRUCTURE.md)
- [Business Rules](02_BUSINESS_RULES.md)
