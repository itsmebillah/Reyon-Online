# Reporting and Analytics Contract Architecture

## Purpose

This document defines how REYON Business OS can introduce trustworthy reporting and analytics without turning operational tables, guessed calculations, or dashboard labels into ungoverned business truth. It establishes versioned metric contracts, source lineage, review evidence, and projection provenance while approving no actual metric or report.

## Table of Contents

- [Scope](#scope)
- [Architecture](#architecture)
- [Logical data model](#logical-data-model)
- [Metric contract requirements](#metric-contract-requirements)
- [Lineage and corrections](#lineage-and-corrections)
- [Security and privacy](#security-and-privacy)
- [Domain boundaries](#domain-boundaries)
- [Pending business decisions](#pending-business-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope

Sprint 11 creates an empty private foundation for stable metric identities, append-only semantic versions, source-contract bindings, review events, and projection-run lineage. It creates no metric definitions, formulas, values, targets, thresholds, dimensions, dashboards, reports, exports, alerts, forecasts, experiments, or data copies.

## Architecture

Operational domains remain authoritative for their facts. Reporting consumes explicit, versioned source contracts rather than treating internal tables as permanent public APIs. Historical results must remain attributable to the exact definition, source contract, grain, time basis, correction treatment, and owner used at calculation time.

Reporting and analytics share governed definitions but serve different purposes. Controlled operational or statutory reporting requires approved reproducibility and access. Exploratory analytics may test hypotheses but must not silently publish experimental logic as authoritative. Materialized projections are disposable derivations; their lineage connects them to source truth.

## Logical Data Model

| Record            | Responsibility                                                                                         | Explicit boundary                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Metric definition | Stable organization-owned identity and label                                                           | No metric is seeded, approved, or calculated                                                                   |
| Metric version    | Immutable definition, grain, time basis, correction treatment, owner, effective time, and supersession | Defines no formula language, target, threshold, or reporting obligation                                        |
| Metric source     | Versioned opaque source-contract binding                                                               | Does not expose operational tables or copy source data                                                         |
| Review event      | Ordered, attributable, append-only decision evidence                                                   | Defines no decision vocabulary, reviewer role, approval policy, or publication effect                          |
| Projection run    | Append-only as-of time, watermark, execution timing, outcome, and optional artifact provenance         | Stores no metric value and implements no calculator, scheduler, artifact store, dashboard, or publication flow |

Migration `20260802120000_reporting_contract_foundation.sql` creates these records in a private `reporting` schema and inserts no reference, demonstration, or production data.

## Metric Contract Requirements

Before a metric can be approved, its version must state business meaning, grain, population, inclusion and exclusion rules, time basis and time zone, source contracts and versions, owner, currency or unit handling where applicable, correction and late-arrival behavior, null and duplicate treatment, privacy classification, access scope, validation examples, and intended decision use.

A dashboard label is not a definition. Consumers may share a metric only when these semantics match. A changed formula or interpretation requires a new immutable version and explicit effective and supersession evidence rather than silently rewriting history.

## Lineage and Corrections

Projection evidence must identify the exact metric version, source watermark, as-of time, execution window, outcome, row count when applicable, and checksum-backed artifact reference when an approved artifact store exists. Source corrections do not mutate prior projections; approved policy determines whether a new projection supersedes, restates, or coexists with history.

Projection-run records are append-only. The optional artifact reference is opaque and paired with a checksum; this foundation provides no artifact storage or access. Failed and partial runs must remain visible once outcome vocabulary and operational ownership are approved.

## Security and Privacy

Every table has row-level security enabled. Anonymous and authenticated roles have no privileges or policies, and the schema is not exposed through the configured Data API. Only trusted server-side adapters may eventually receive narrowly approved access.

The foundation contains contract metadata and provenance, not copied operational or personal data. Future projections must enforce purpose limitation, least privilege, aggregation and suppression rules, classification, retention, export controls, environment separation, and audit. Pseudonymization does not by itself make customer data anonymous.

## Domain Boundaries

- Each operational domain remains the source of truth for its facts and exposes governed versioned contracts.
- Reporting owns approved metric semantics, review evidence, lineage, and controlled projections, not operational records.
- Accounting owns financial evidence and qualified financial policy; reporting cannot define accounting treatment.
- CRM owns customer identity evidence; customer analytics requires separate purpose and privacy approval.
- Automation and AI may consume only approved metric versions and must preserve version and lineage.
- Observability metrics describe technical operation and must not be conflated with business metrics.

## Approved Sprint 17 Sales Measures

Completed orders are the population for completed sales; Delivered, Cancelled, Rejected, Failed, and abandoned orders are excluded. Product sales revenue and delivery charges are reported separately, while customer Grand Total includes both. Best Seller and net-sales measures use completed quantities and product revenue net of append-only returned quantities/revenue. Daily sales control is reporting/reconciliation oriented and does not require POS opening/closing.

## Pending Business Decisions

### TODO — Product Owner / Domain Owners

- Prioritize the decisions that require operational, commercial, customer, inventory, supplier, financial, and executive metrics or reports.
- Provide definitions, examples, owners, acceptable latency, correction expectations, targets, thresholds, and consumers.
- Identify statutory, management, audit, partner, and export obligations with effective dates and retention requirements.

### TODO — Architecture / Security / Privacy / Finance

- Approve source contracts, calculation engine, orchestration, semantic layer, artifact storage, access model, classification, and retention.
- Define validation, reconciliation, late-arrival, backfill, restatement, reproducibility, performance, and incident controls.
- Approve privacy-safe customer projections and qualified financial-reporting boundaries before those data classes are used.

## Future Expansion

Add approved dimensions, calculation specifications, semantic models, projection storage, schedules, quality checks, reconciliation, restatement workflows, report catalogs, dashboards, exports, subscriptions, alerts, forecasting, experimentation, self-service exploration, and privacy-safe analytical marts. Automation and AI integrations must reference immutable approved metric versions and surface freshness and lineage.

## Related Documents

- [Project Vision](00_PROJECT_VISION.md)
- [Business Overview](01_BUSINESS_OVERVIEW.md)
- [Business Rules](02_BUSINESS_RULES.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
- [Customer and CRM Identity Architecture](22_CUSTOMER_CRM_IDENTITY_ARCHITECTURE.md)
