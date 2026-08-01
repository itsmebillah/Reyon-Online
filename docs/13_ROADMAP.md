# Roadmap

## Purpose

This document provides a controlled, outcome-oriented planning structure for REYON Business OS. It does not commit dates, modules, or features without Product Owner approval and dependency evidence.

## Table of Contents

- [Roadmap principles](#roadmap-principles)
- [Planning horizons](#planning-horizons)
- [Entry and exit criteria](#entry-and-exit-criteria)
- [Foundation work](#foundation-work)
- [Capability planning](#capability-planning)
- [Dependencies and sequencing](#dependencies-and-sequencing)
- [Risks and readiness](#risks-and-readiness)
- [Measures and review](#measures-and-review)
- [Pending prioritization](#pending-prioritization)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Roadmap Principles

- Plan for measurable business outcomes, not module completion alone.
- Validate policy, ownership, controls, and data before automating a workflow.
- Expose dependencies, migration, training, and operating change.
- Deliver end-to-end slices that can be verified and supported.
- Treat reporting, security, accessibility, observability, and recovery as delivery scope.
- Re-plan when evidence changes; retain decision history.

## Planning Horizons

| Horizon   | Planning intent                                                           | Commitment level                        |
| --------- | ------------------------------------------------------------------------- | --------------------------------------- |
| Vision    | Preserve long-term capability direction                                   | Not a delivery commitment               |
| Discovery | Resolve outcomes, policy, users, process, data, and constraints           | Time-boxed learning only after approval |
| Candidate | Shape options, dependencies, risk, and acceptance evidence                | Prioritization pending                  |
| Committed | Deliver an approved outcome with owner, capacity, and acceptance criteria | Explicit Product Owner commitment       |
| Released  | Operate, measure, support, and improve                                    | Evidence-based review                   |

The Product Owner approved sequential roadmap execution on 2026-08-02. Technical foundations may proceed in dependency order; business behavior still requires explicit approved rules.

## Committed Delivery Sequence

| Sprint | Outcome                                      | Status                  | Dependency                                   |
| ------ | -------------------------------------------- | ----------------------- | -------------------------------------------- |
| 0      | Environment and ownership foundation         | Released                | Existing infrastructure                      |
| 0.5    | AI-ready SEO and content architecture        | Released (architecture) | Documentation foundation                     |
| 1      | Premium customer experience foundation       | Released                | Sprint 0                                     |
| 2      | Governed product catalog foundation          | Released (foundation)   | Sprint 1                                     |
| 3      | Organization, location, and channel topology | Released (foundation)   | Sprint 2                                     |
| 4      | Inventory ledger foundation                  | Released (foundation)   | Sprint 3                                     |
| 5      | Order lifecycle foundation                   | Released (foundation)   | Sprint 4                                     |
| 6      | Fulfillment and delivery foundation          | Released (foundation)   | Sprint 5                                     |
| 7      | Payment evidence foundation                  | Released (foundation)   | Sprint 5                                     |
| 8      | Supplier and purchase foundation             | Released (foundation)   | Catalog, topology, and inventory             |
| 9      | Accounting evidence foundation               | Released (foundation)   | Operational evidence and finance boundaries  |
| 10     | Customer and CRM identity foundation         | Released (foundation)   | Organization, channels, and order boundaries |
| 11     | Reporting and analytics contract foundation  | Next                    | Governed operational source evidence         |
| 12+    | Automation and AI foundations                | Sequenced candidates    | Approved rules, metrics, and controls        |

Sprint 2 now includes a policy-neutral catalog contract, replaceable data adapter, customer discovery, product lookup, and an empty deny-by-default Supabase catalog schema. Persistent administration, runtime data access, and publication workflows remain gated by catalog-owner and access rules.

Sprint 3 establishes empty, deny-by-default organization, location, and channel identities before inventory is allowed to reference operational ownership. Actual topology records and workflows remain gated by Product Owner facts and role policy.

Sprint 4 establishes empty stock-item and lot identities plus an append-only signed movement ledger. Movement vocabularies, stock calculations, reservations, counting, valuation, and user workflows remain gated by approved inventory policy.

Sprint 5 establishes empty order identities, commercial line snapshots, and append-only transition evidence. State vocabularies, allowed transitions, customer data, payments, fulfillment, tax, returns, and executable workflows remain gated by approved policy.

Sprint 6 establishes empty fulfillment identities, partial order-line assignments, append-only transition evidence, and opaque delivery references. Fulfillment states, addresses, carriers, shipping methods, fees, promises, routing, inventory effects, and customer communication remain gated by approved policy.

Sprint 7 establishes empty append-only payment records, order allocations, lifecycle events, and opaque provider references. Payment methods, providers, states, capture, refunds, settlement, fees, fraud, reconciliation, sensitive instruments, and accounting treatment remain gated by approved policy.

Sprint 8 establishes empty organization-scoped supplier identities, purchase-order identities, commercial line snapshots, and append-only lifecycle evidence. Supplier contacts, terms, tax, payment details, approval rules, receiving, discrepancies, invoice matching, landed cost, settlement, and accounting treatment remain gated by approved policy.

Sprint 9 establishes empty organization-scoped account identities and append-only source-linked journal evidence. The chart of accounts, classifications, sign convention, balanced-posting transaction, event mappings, fiscal periods, recognition, valuation, tax, dimensions, close, reporting, approvals, and all financial records remain gated by qualified Finance approval.

Sprint 10 establishes empty pseudonymous customer identities, opaque external identity references, and append-only order-association and identity-event evidence. Personal profiles, contacts, credentials, authentication, consent, preferences, segmentation, loyalty, service workflows, marketing, analytics, merge/split behavior, and all customer records remain gated by approved business, privacy, and security rules.

## Entry and Exit Criteria

A candidate should identify outcome, owner, users, business rules, process, data, controls, dependencies, risks, non-functional needs, migration, operational owner, and measurable acceptance. Exit requires verified acceptance, documentation, training/support readiness, monitoring, and post-release ownership.

## Foundation Work

Potential foundation outcomes include product charter, stakeholder map, business glossary, rule register, role and permission model, current/target process maps, system/data inventory, architecture decisions, security/privacy assessment, design foundation, engineering workflow, and operating model.

The AI-ready product content foundation is a candidate outcome consisting of product/content ownership boundaries, content-type catalog, human-review lifecycle, SEO quality rules, URL/canonical policy, localization strategy, and channel contract design. This is architecture readiness only and does not authorize AI integration or content publication.

These are candidates; scope and priority require approval.

## Capability Planning

Ecommerce, Admin, POS, CRM, Inventory, Purchase, Accounts, Reports, Analytics, Automation, and AI must each be decomposed into outcomes only after discovery. A module name must not be used as a sufficient roadmap item.

### Initiative Record

Each approved initiative should capture: identifier, outcome, accountable owner, users, in/out scope, dependencies, rules, acceptance measures, risks, target horizon, status, and decision links.

## Dependencies and Sequencing

Likely dependency categories include identity and authorization, organization/location/channel model, catalog, customer identity, inventory ownership, order lifecycle, financial policy, integration contracts, data quality, and operational readiness. Actual dependency relationships require architecture and domain validation.

## Risks and Readiness

Readiness reviews should cover unclear policy, unavailable owners, poor source data, uncontrolled manual workarounds, migration risk, external vendors, security/privacy, financial controls, staff adoption, support capacity, and recovery preparedness.

## Measures and Review

The roadmap should have an agreed review cadence. Each outcome needs baseline, target, measurement source, observation window, and responsible owner. Delivery output without business or control evidence is insufficient.

## Pending Prioritization

### TODO — Product Owner

- Approve business outcomes and priority order.
- Identify first users, locations, channels, and workflows.
- Confirm budget, timeline constraints, team, decision owners, and risk tolerance.
- Choose discovery initiatives and define acceptance evidence.
- Decide migration/coexistence expectations for current tools and data.

## Future Expansion

Add approved initiative records, dependency visualization, milestones, release policy, migration waves, training/change plan, benefit tracking, and links to detailed module specifications. Dates should appear only after commitment.

## Related Documents

- [Project Vision](00_PROJECT_VISION.md)
- [Business Overview](01_BUSINESS_OVERVIEW.md)
- [Tech Stack](10_TECH_STACK.md)
- [Changelog](14_CHANGELOG.md)
- [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md)
