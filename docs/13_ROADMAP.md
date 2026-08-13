# Roadmap

## Purpose

This document provides a controlled, outcome-oriented planning structure for REYON Business OS. It does not commit dates, modules, or features without Product Owner approval and dependency evidence.

## Table of Contents

- [Roadmap principles](#roadmap-principles)
- [Planning horizons](#planning-horizons)
- [Entry and exit criteria](#entry-and-exit-criteria)
- [Foundation work](#foundation-work)
- [Capability planning](#capability-planning)
- [Proposed post-Sprint 14 execution roadmap](#proposed-post-sprint-14-execution-roadmap)
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

| Sprint | Outcome                                       | Status                  | Dependency                                                   |
| ------ | --------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| 0      | Environment and ownership foundation          | Released                | Existing infrastructure                                      |
| 0.5    | AI-ready SEO and content architecture         | Released (architecture) | Documentation foundation                                     |
| 1      | Premium customer experience foundation        | Released                | Sprint 0                                                     |
| 2      | Governed product catalog foundation           | Released (foundation)   | Sprint 1                                                     |
| 3      | Organization, location, and channel topology  | Released (foundation)   | Sprint 2                                                     |
| 4      | Inventory ledger foundation                   | Released (foundation)   | Sprint 3                                                     |
| 5      | Order lifecycle foundation                    | Released (foundation)   | Sprint 4                                                     |
| 6      | Fulfillment and delivery foundation           | Released (foundation)   | Sprint 5                                                     |
| 7      | Payment evidence foundation                   | Released (foundation)   | Sprint 5                                                     |
| 8      | Supplier and purchase foundation              | Released (foundation)   | Catalog, topology, and inventory                             |
| 9      | Accounting evidence foundation                | Released (foundation)   | Operational evidence and finance boundaries                  |
| 10     | Customer and CRM identity foundation          | Released (foundation)   | Organization, channels, and order boundaries                 |
| 11     | Reporting and analytics contract foundation   | Released (foundation)   | Governed operational source evidence                         |
| 12     | Automation control-plane foundation           | Released (foundation)   | Approved rules, metrics, and audit boundaries                |
| 13     | AI governance and content-artifact foundation | Released (foundation)   | Sprint 0.5 architecture, human review, and source boundaries |
| 14     | Product Catalog Administration                | Released                | Approved Product Owner catalog and inventory-entry rules     |
| 14A    | Delivery assurance foundation                 | Released                | Policy-neutral engineering quality and release evidence      |

Sprint 2 now includes a policy-neutral catalog contract, replaceable data adapter, customer discovery, product lookup, and an empty deny-by-default Supabase catalog schema. Persistent administration, runtime data access, and publication workflows remain gated by catalog-owner and access rules.

Sprint 3 establishes empty, deny-by-default organization, location, and channel identities before inventory is allowed to reference operational ownership. Actual topology records and workflows remain gated by Product Owner facts and role policy.

Sprint 4 establishes empty stock-item and lot identities plus an append-only signed movement ledger. Movement vocabularies, stock calculations, reservations, counting, valuation, and user workflows remain gated by approved inventory policy.

Sprint 5 establishes empty order identities, commercial line snapshots, and append-only transition evidence. State vocabularies, allowed transitions, customer data, payments, fulfillment, tax, returns, and executable workflows remain gated by approved policy.

Sprint 6 establishes empty fulfillment identities, partial order-line assignments, append-only transition evidence, and opaque delivery references. Fulfillment states, addresses, carriers, shipping methods, fees, promises, routing, inventory effects, and customer communication remain gated by approved policy.

Sprint 7 establishes empty append-only payment records, order allocations, lifecycle events, and opaque provider references. Payment methods, providers, states, capture, refunds, settlement, fees, fraud, reconciliation, sensitive instruments, and accounting treatment remain gated by approved policy.

Sprint 8 establishes empty organization-scoped supplier identities, purchase-order identities, commercial line snapshots, and append-only lifecycle evidence. Supplier contacts, terms, tax, payment details, approval rules, receiving, discrepancies, invoice matching, landed cost, settlement, and accounting treatment remain gated by approved policy.

Sprint 9 establishes empty organization-scoped account identities and append-only source-linked journal evidence. The chart of accounts, classifications, sign convention, balanced-posting transaction, event mappings, fiscal periods, recognition, valuation, tax, dimensions, close, reporting, approvals, and all financial records remain gated by qualified Finance approval.

Sprint 10 establishes empty pseudonymous customer identities, opaque external identity references, and append-only order-association and identity-event evidence. Personal profiles, contacts, credentials, authentication, consent, preferences, segmentation, loyalty, service workflows, marketing, analytics, merge/split behavior, and all customer records remain gated by approved business, privacy, and security rules.

Sprint 11 establishes empty stable metric identities, immutable semantic versions, versioned source-contract bindings, append-only review evidence, and append-only projection-run lineage. Metric definitions, formulas, dimensions, values, targets, thresholds, reports, dashboards, schedules, artifacts, exports, forecasts, and all business data remain gated by approved owners, semantics, privacy, security, and financial controls.

Sprint 12 establishes empty stable automation identities, immutable contract-reference versions, append-only review/control evidence, idempotent execution identities, and append-only execution/step-attempt history. Executable rules, triggers, conditions, schedules, payloads, credentials, workers, retries, side effects, enabled workflows, and all automation records remain gated by approved use cases, contracts, permissions, controls, and operational ownership.

Sprint 13 establishes empty source-snapshot references, scoped content artifacts, immutable schema-versioned payloads, source and derivation lineage, validation findings, human review decisions, and publication-attempt evidence. Content types, product facts, policies, prompts, providers, models, generated content, validators, reviewer permissions, renderers, channels, credentials, automatic approval, publication behavior, and all content records remain gated by approved business, SEO, legal, privacy, security, and operating rules.

All policy-neutral technical foundations currently derivable from approved documentation are now released. Sprint 14 requires Product Owner and domain-owner business rules, representative scenarios, role/permission decisions, and measurable acceptance criteria before an operational vertical slice can be selected or implemented without inventing business logic.

The first proposed operational vertical slice is Product Catalog Administration because governed product facts enable ecommerce, inventory, purchasing, content, reporting, and future channels. Its scope and decision requirements are consolidated in the [Sprint 14 Product Catalog Administration Decision Packet](25_PRODUCT_CATALOG_ADMIN_DISCOVERY.md). This is discovery readiness, not approval of the proposed behavior.

The Product Owner approved core Sprint 14 rules on 2026-08-02. The catalog administration persistence and domain-validation foundation is released. Real operating data, detailed permissions, enhanced duplicate/correction behavior, and media upload remain individually feature-blocked by the decisions listed in the Sprint 14 document; they do not block other roadmap work.

Sprint 14A establishes independent delivery assurance with automated GitHub quality gates, cross-platform isolated browser testing, and a documented live-verification contract. Feature-specific dependencies are isolated so unrelated technical foundations can continue.

Sprint 14B releases deny-by-default admin authentication: Supabase SSR sessions, server-verified claims, one explicitly provisioned initial administrator with active membership, disabled public signup, protected routing, and a responsive private workspace shell.

Sprint 14C releases Brand Management as the first complete catalog module. The administrator can create and edit brands, upload or replace a logo, maintain country, descriptive, and website details, activate or deactivate store visibility, mark featured brands, control display order, archive brands, and restore archived brands. Search, lifecycle/visibility/featured filters, deterministic sorting, timestamps, case-insensitive duplicate-name prevention, and SEO-friendly generated slugs support daily catalog operations. Products reference immutable Brand IDs while presentation fields remain editable.

Sprint 14D releases Category Management with create/edit workflows, optional parent categories, cycle-safe hierarchy changes, descriptive details, display ordering, store visibility, archive, and restore controls. Visible active categories synchronize immediately to the customer category experience. Product Management is next.

Sprint 14E releases guided Product creation with approved identity, brand, primary category, country of origin, first variant, hybrid SKU, optional barcode, four approved price types, primary image reference, Draft saving, and one-action publication through every approved lifecycle state. Published products synchronize immediately to customer pages. Product Media upload and Inventory Entry are next.

Sprint 14F replaces all hardcoded customer product lists with the reusable Dynamic Product Collection engine. Governed database configuration and optional ordered pins power New Arrivals, Most Loved, Featured Products, and On Sale now; sales, inventory, trending, and personalized strategies remain inactive until their authoritative signals are released.

Sprint 14G releases operational Product Publication controls. Administrators can search, filter, and sort products, then move one approved step at a time through Draft, Review, Approved, Published, Hidden, and Archived. Every transition remains attributable and append-only; only Published remains customer-visible.

Sprint 14H releases Product Media Management under the approved media policy. Administrators can upload, replace, order, designate, describe, and safely remove licensed JPG, PNG, and WebP product images. The reusable Media Library stores provider-neutral asset records backed initially by Supabase Storage, lets administrators attach one asset to multiple products without duplicating its physical file, and removes manual URL entry from Product creation. Server validation enforces the 5 MB limit, 800 × 800 minimum, required editable ALT text, 12-image gallery maximum, and primary-first ordering while preserving Product identity.

Sprint 14I releases Inventory Entry. Administrators record approved variant-level movements at Main Inventory, see ledger-derived on-hand, reserved, and available positions, and correct mistakes through auditable reversals. Negative stock is blocked transactionally, customer availability synchronizes automatically, and Low Stock and Out of Stock collections become inventory-driven.

## Proposed Post-Sprint 14 Execution Roadmap

The following sequence governs post-Sprint 14 execution. Sprint 15 is released. Sprint 16 is in Product Owner decision review; later milestones begin only after their listed Product Owner decisions are approved.

| Sprint | Proposed milestone                   | Depends on                                                                                         | Product Owner decisions required before implementation                                                                                                                                                                                                 |
| ------ | ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 15     | Cart, Checkout, and Customer Account | Published catalog, pricing, inventory availability, customer identity foundation                   | Released                                                                                                                                                                                                                                               |
| 16     | Order Management                     | Sprint 15 checkout contract; order and inventory foundations                                       | Approved for sequential implementation: [Sprint 16 Order Management Decision Packet](28_ORDER_MANAGEMENT_DECISION_PACKET.md)                                                                                                                           |
| 17     | Sales Processing                     | Order Management; inventory movements; payment evidence foundation                                 | Released; net return/refund adjustments remain a Sprint 19 dependency. See [Sales Processing](29_SALES_PROCESSING.md)                                                                                                                                  |
| 18     | Delivery Operations                  | Order Management; Sales Processing; fulfillment foundation                                         | Released; see [Sprint 18 Delivery Operations Decision Packet](30_DELIVERY_OPERATIONS_DECISION_PACKET.md)                                                                                                                                               |
| 19     | Returns and Refunds                  | Orders, sales, delivery, payment evidence, inventory corrections                                   | Released; see [Sprint 19 Returns and Refunds](31_RETURNS_REFUNDS_DECISION_PACKET.md)                                                                                                                                                                   |
| 20     | Supplier and Purchase Operations     | Catalog, Main Inventory, supplier/purchase foundation, approved receiving movements                | Approved for sequential delivery: supplier management; PO operations; receiving/inspection; purchase returns; supplier payments; closeout/performance. See [Sprint 20](32_SUPPLIER_PURCHASE_DECISION_PACKET.md)                                        |
| 21     | Accounts and Payments                | Sales, refunds, purchasing, accounting and payment foundations                                     | Awaiting only the Product Owner/Finance policy decisions in [Sprint 21 — Accounts and Payments](33_ACCOUNTS_PAYMENTS_DECISION_PACKET.md); no application implementation is authorized yet.                                                             |
| 22     | Reports and Analytics                | Governed operational data from Sprints 15–21; reporting contract foundation                        | Priority dashboards and reports; metric definitions and owners; dimensions; targets and thresholds; latency; correction/restatement rules; access, export, retention, statutory, management, and audit requirements                                    |
| 23     | CRM                                  | Customer Account, Orders, Sales, Returns, privacy-safe reporting                                   | Customer profile and contact fields; consent and communication preferences; duplicate/merge rules; segments; service cases; loyalty scope; retention and deletion; privileged support access; approved engagement and value measures                   |
| 24     | Automation                           | Stable operational workflows and approved metrics; automation control-plane foundation             | First automation use cases; triggers, conditions, actions, limits, approvals, schedules, notifications, retries, escalation, human review, correction, kill switch, and accountable owner for each workflow                                            |
| 25     | AI-Assisted Operations and Content   | Governed source data, human-review workflows, metrics, automation controls, AI artifact foundation | First AI use cases and success criteria; authoritative inputs; allowed outputs/channels; provider and model constraints; review roles; regeneration and rejection; quality, brand, SEO, privacy, retention, cost, monitoring, and publication controls |

### Sprint 17 Implementation Plan

Sprint 17 is approved for sequential implementation.

1. **Shipment and completion boundary:** convert active reservations into one idempotent sold/fulfilled inventory movement at Shipped and create official sale evidence only at Completed.
2. **Sales documents:** issue a database-numbered customer Invoice for each completed sale and a separate database-numbered Payment Receipt only when payment is verified or collected.
3. **Discount operations:** support authorized, attributable line/order discounts without changing catalog pricing or historical snapshots; customer-visible changes retain confirmation evidence.
4. **Sales register and reconciliation:** provide separate product revenue, delivery charge, Grand Total, payment, customer, and lifecycle facts for daily operational control without a mandatory POS session.
5. **Net-sales consumption:** keep the original sale immutable and consume append-only return/refund adjustments for net quantities, net revenue, and Best Seller ranking when the approved return workflow is released.

Sprint 17 is released through daily reconciliation. Item 5 remains an explicit Sprint 19 integration dependency and must not introduce return/refund policy inside Sales.

### Sprint 15 Implementation Plan

Sprint 15 is approved for sequential implementation.

1. **Cart:** deliver 30-day persistent guest carts, the 10-unit variant limit, current-availability revalidation, account-association contract, and configurable privacy-safe 24-hour aggregate cart count. Adding to cart performs no reservation.
2. **Checkout:** add the review journey and authoritative server revalidation of price and stock; cart values are never accepted as final facts.
3. **Customer Account:** create/reuse the customer identity during checkout, avoid verified phone/email duplicates, protect private data, and provide recovery/correction boundaries.
4. **OTP verification (deferred/optional):** retain the provider-ready phone/email verification boundary for future activation. OTP is not required for order placement in the current release and must not be simulated.
5. **Address:** collect the approved required structured address and optional Flat No without mixing private delivery data into public records.
6. **Delivery charge:** add administrator-managed zones/charges, seed the two approved zone identities without hardcoded prices, and show the calculated charge before confirmation.
7. **Manual payment:** present all approved methods, support configured mobile instructions and reference evidence, require administrator verification, represent deferred Card honestly, and keep COD eligibility configurable.
8. **Order creation:** create the order idempotently only after customer review and current price/stock validation.
9. **Stock reservation:** create an auditable 30-minute confirmation-time reservation, deterministic release paths, and an administrator-handled insufficient-stock exception without over-reservation.
10. **Verification and release:** validate security, accessibility, responsive commerce journeys, cart continuity, totals, stock concurrency, OTP abuse controls, admin configuration, audit evidence, and deployment.

The Product Owner finalized the Sprint 15 baseline on 2026-08-11. External OTP delivery credentials/provider setup may block the OTP integration milestone, but it does not block preceding Cart and Checkout work.

Sprint 15A releases persistent guest Cart: opaque 30-day cart identity, a database-enforced 10-unit variant limit, live price/availability projection, customer bag management, and no inventory reservation. The configurable 24-hour social-proof foundation remains hidden until a privacy threshold is configured.

Sprint 15B releases the Checkout review boundary. Customers review a server-projected cart using current catalog prices and inventory availability before any identity, address, payment, order, or reservation action occurs.

Sprint 15C establishes private minimal customer profile/contact storage and database-enforced uniqueness for verified phone/email identities. Public access remains denied until OTP verification can establish the customer session.

Sprint 15D releases secure structured Checkout Address entry with the approved required fields, optional Flat No, opaque-cart ownership, and no public customer-data access.

Sprint 15E releases administrator-configurable Delivery Zones and Charges. Inside Dhaka and Outside Dhaka identities are seeded without invented prices and remain unavailable at checkout until an administrator supplies a valid charge and enables them.

Sprint 15F releases honest Payment Method Selection: COD is initially selectable, mobile methods require configured instructions before selection, Card remains visible but unavailable without a real gateway, and no method can imply unverified success.

Sprint 15G releases transactional Order Creation without fabricating OTP completion. Checkout persists an active configured delivery zone and charge, retains payment selection/evidence, and exposes readiness from authoritative data. One idempotent transaction creates or associates an initially unverified customer profile, revalidates published cart items, current prices, availability, address, delivery configuration, and payment selection; snapshots the commercial order; appends lifecycle evidence; and creates auditable 30-minute variant reservations. Insufficient stock creates a non-reserving confirmation-exception order for administrative handling. A later genuinely delivered/completed transition produces separate auditable REYON customer verification.

Sprint 15 is complete and deployed. Sprint 16 rules were approved on 2026-08-12 and govern sequential implementation through the [Sprint 16 Order Management Product Owner Decision Packet](28_ORDER_MANAGEMENT_DECISION_PACKET.md).

### Sprint 16 Implementation Plan

1. **Order register foundation:** assign immutable globally sequential `RYN-YYYY-XXXXXX` references, persist the approved state vocabulary and extensible admin roles, and release secure Admin order search/filter visibility.
2. **Order detail and lifecycle commands:** expose immutable commercial snapshots and append-only transition history; enforce role, state, reason, payment, reservation, and delivery-handoff guards.
3. **Cancellation, review, and exception handling:** implement customer/admin cancellation boundaries, required reasons, private review notes, reservation-expiry exceptions, and configured review queues.
4. **Payment and delivery handoffs:** enforce manual-payment/COD progression rules and delivery evidence before shipment without faking provider outcomes.
5. **Notification outbox:** append provider-neutral customer/admin notification events transactionally; delivery failure never corrupts order transitions.
6. **Correction and return boundary:** provide additive corrections only and route post-delivery changes to future Return/Refund workflows.
7. **Verification and release:** run targeted lifecycle, permission, reservation, payment, handoff, audit, and responsive Admin verification before Sprint 16 completion.

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
- [Sprint 16 Order Management Product Owner Decision Packet](28_ORDER_MANAGEMENT_DECISION_PACKET.md)
- [Business Overview](01_BUSINESS_OVERVIEW.md)
- [Tech Stack](10_TECH_STACK.md)
- [Changelog](14_CHANGELOG.md)
- [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md)
