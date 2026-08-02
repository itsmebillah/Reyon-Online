# Business Rules

## Purpose

This document is the controlled structure for recording approved business rules. It deliberately defines governance and coverage without supplying unverified commercial, operational, or financial policy.

## Table of Contents

- [Rule governance](#rule-governance)
- [Rule record format](#rule-record-format)
- [Rule domains](#rule-domains)
- [Approved catalog rules](#approved-catalog-rules)
- [Conflict and precedence](#conflict-and-precedence)
- [Exceptions](#exceptions)
- [Testing and traceability](#testing-and-traceability)
- [Pending decisions](#pending-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Rule Governance

A rule becomes authoritative only when it has a unique identifier, clear statement, accountable owner, approval evidence, effective date, scope, and status. Draft TODOs and examples are not executable policy.

Rules should describe business intent independently of user-interface or storage choices. Material changes require impact analysis across orders, inventory, purchasing, accounting, customer experience, reporting, and integrations.

## Rule Record Format

| Field                    | Required meaning                                              |
| ------------------------ | ------------------------------------------------------------- |
| Rule ID                  | Stable domain-prefixed identifier                             |
| Title                    | Concise business meaning                                      |
| Statement                | Unambiguous approved behavior                                 |
| Rationale                | Business or control need                                      |
| Scope                    | Channels, locations, entities, products, or users affected    |
| Inputs and outcome       | Required facts and resulting decision/action                  |
| Exceptions               | Approved deviations and authority                             |
| Owner / approver         | Accountable roles                                             |
| Effective / review dates | Validity and review window                                    |
| Status / version         | Draft, approved, superseded, or retired                       |
| Traceability             | Processes, requirements, tests, reports, and records affected |

## Rule Domains

The rule register must eventually cover product and catalog, pricing and promotions, customer and consent, sales and orders, payments, fulfillment, returns and refunds, inventory, purchasing and suppliers, taxation and accounting, access and approval, reporting, automation, and AI governance.

## Approved Catalog Rules

The Product Owner approved the Sprint 14 catalog rules on 2026-08-02. The stable rule statements and acceptance implications are maintained in [Product Catalog Administration — Sprint 14 Decisions](25_PRODUCT_CATALOG_ADMIN_DISCOVERY.md). They govern immutable internal product identity, optional Product Code, hybrid unique SKU, optional barcode, variant types, image minimum and order, product lifecycle and customer visibility, third-party brand ownership, primary category, authenticity/origin facts, variant-level stock identity, four price types, and the absence of separate tax calculation.

These rules are approved version 1 for Product Catalog Administration. Authentication, action permissions, generated SKU presentation, currency, exception transitions, duplicate resolution, media-file controls, and initial product records remain feature-specific pending decisions and are not implied by this approval.

### TODO — Product Owner and Domain Owners

- Supply approved rules for each domain using the rule record format.
- Identify jurisdictional, channel, location, product, and customer-segment variations.
- State which rules require configurable parameters versus controlled code changes.

## Conflict and Precedence

No precedence hierarchy is assumed. A future policy must define how legal requirements, contractual commitments, financial controls, organization policy, promotions, and local exceptions interact.

### TODO — Product Owner

- Approve rule precedence and conflict-resolution authority.
- Define behavior when required rule inputs are missing or contradictory.

## Exceptions

Exceptions must be explicit, authorized, time-bounded when appropriate, and auditable. Emergency override capability must not be designed until eligible roles, evidence, notification, and retrospective review are approved.

## Testing and Traceability

Every implemented rule should map to acceptance examples covering normal, boundary, invalid, and exception cases. Reports and accounting impacts must use the same approved interpretation.

## Pending Decisions

### TODO — Product Owner

- Nominate the rule-register custodian and approval forum.
- Define review frequency, versioning, and communication expectations.
- Decide whether historical transactions retain original rule versions after policy changes.
- Provide the initial prioritized set of rules needed for the first roadmap outcome.

## Future Expansion

When rules are approved, add a versioned rule catalog or link to a dedicated controlled source. Consider decision tables and machine-readable policy only after human-readable policy is stable.

Sprint 12 provides an empty automation control plane that can reference future immutable rule contracts but cannot execute them. Draft TODOs, examples, unreviewed versions, or absent approval evidence must never become activation authority.

## Approved Dynamic Collection Rule

Every customer-facing product collection is generated from governed database records and reusable business strategies. Homepage products must never be hardcoded. Automatic rules and optional administrator pins update customer channels without source-code changes. The authoritative strategy, administration, eligibility, and future-signal rules are defined in [Dynamic Product Collections](27_DYNAMIC_PRODUCT_COLLECTIONS.md).

## Related Documents

- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Purchase System](06_PURCHASE_SYSTEM.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Automation Control-Plane Architecture](24_AUTOMATION_CONTROL_PLANE_ARCHITECTURE.md)
- [Dynamic Product Collections](27_DYNAMIC_PRODUCT_COLLECTIONS.md)
