# Business Rules

## Purpose

This document is the controlled structure for recording approved business rules. It deliberately defines governance and coverage without supplying unverified commercial, operational, or financial policy.

## Table of Contents

- [Rule governance](#rule-governance)
- [Rule record format](#rule-record-format)
- [Rule domains](#rule-domains)
- [Approved catalog rules](#approved-catalog-rules)
- [Approved Sprint 15 commerce rules](#approved-sprint-15-commerce-rules)
- [Approved Sprint 18 delivery rules](#approved-sprint-18-delivery-rules)
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

## Approved Sprint 15 Commerce Rules

The Product Owner approved the following rules for Sprint 15 on 2026-08-11:

| Rule area             | Approved behavior                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout identity     | Guest checkout is allowed. Successful order creation creates or associates an initially unverified customer profile from checkout details. OTP verification is optional and deferred until a provider is configured; it is not required for order placement in the current release. Verified phone/email matches reuse the existing customer identity.  |
| Cart continuity       | Guest carts persist for 30 days after last activity and associate with the verified account. A line may contain at most 10 units of one variant. Price and availability are revalidated before checkout and confirmation.                                                                                                                               |
| Inventory             | Cart addition creates no reservation. Confirmation reserves only available stock for 30 minutes. Cancellation, expiry, or leaving confirmed state without fulfillment releases it. Reservation history is auditable; insufficient stock produces an administrator-handled exception.                                                                    |
| Social proof          | Aggregate active carts from the preceding 24 hours. Expose no identity, hide counts that are not useful/privacy-safe, and keep the calculation configurable.                                                                                                                                                                                            |
| Address               | Require Full name, Phone, House No, Road, Village/City, Thana/Upazila, District, and Division. Flat No is optional where not applicable.                                                                                                                                                                                                                |
| Delivery              | Initial zones are Inside Dhaka and Outside Dhaka. Admin configures zones and charges; prices are never hardcoded. Show the calculated charge before confirmation and support future zones without redesign.                                                                                                                                             |
| Payment               | Display bKash, Nagad, Rocket, Card, and COD. Mobile payments use admin instructions plus customer reference evidence and administrator verification. Card gateway processing is deferred and cannot report false success. COD is initially supported with future-configurable eligibility.                                                              |
| Customer protection   | Minimize collection to account, order, delivery, and support needs. Protect private data, provide required privacy notice/consent, recovery and correction, and configurable future-compliant retention/deletion.                                                                                                                                       |
| Confirmation          | The customer reviews cart, address, delivery charge, and payment method. Confirmation revalidates price and stock, creates the order, and starts the approved reservation flow. Stale cart facts are never authoritative.                                                                                                                               |
| Customer verification | Account/profile existence, OTP/contact verification, and REYON customer verification are separate states. Only a genuinely delivered/completed order verifies the associated REYON customer. The source, order reference, and timestamp are append-only evidence; cancelled, failed, returned, rejected, or undelivered orders never verify a customer. |

### TODO — Product Owner and Domain Owners

- Supply approved rules for each domain using the rule record format.
- Identify jurisdictional, channel, location, product, and customer-segment variations.
- State which rules require configurable parameters versus controlled code changes.

## Approved Sprint 18 Delivery Rules

The Product Owner approved provider-neutral single-courier, single-shipment delivery on 2026-08-13. The governed lifecycle, three-attempt maximum, pickup/handoff evidence, delivery proof, address-change boundary, exceptions, COD reconciliation, permissions, customer visibility, and notification rules are maintained in [Sprint 18 Delivery Operations](30_DELIVERY_OPERATIONS_DECISION_PACKET.md). Courier integrations and credentials are not approved or inferred.

## Approved Sprint 20 Supplier and Purchase Rules

The Product Owner approved governed supplier lifecycle, multi-supplier variant sourcing, preferred suppliers, database-numbered purchase orders, approval authority, BDT commercial terms, amendment/reapproval, partial and discrepancy receiving, inspection, accepted-only inventory entry, purchase returns, credit and evidence-backed supplier payments, immutable closure, performance tracking, manual replenishment, and emergency flags on 2026-08-13. The authoritative rule set is maintained in [Sprint 20 — Supplier and Purchase Operations](32_SUPPLIER_PURCHASE_DECISION_PACKET.md).

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
