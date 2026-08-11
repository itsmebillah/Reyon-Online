# Order Lifecycle

## Purpose

This document provides the structure for defining orders consistently across channels, fulfillment, payment, inventory, customer service, and accounting. No lifecycle state or transition is approved until supplied by the Product Owner and relevant domain owners.

## Table of Contents

- [Scope and principles](#scope-and-principles)
- [Order aggregate](#order-aggregate)
- [Implemented persistence foundation](#implemented-persistence-foundation)
- [Approved Sprint 15 checkout boundary](#approved-sprint-15-checkout-boundary)
- [Lifecycle definition](#lifecycle-definition)
- [State dimensions](#state-dimensions)
- [Transition controls](#transition-controls)
- [Changes, cancellation, and returns](#changes-cancellation-and-returns)
- [Cross-domain effects](#cross-domain-effects)
- [Exceptions and recovery](#exceptions-and-recovery)
- [Pending decisions](#pending-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope and Principles

An order records a commercial commitment and its subsequent operational history. Order status must not collapse independent payment, fulfillment, inventory, return, and financial facts into one ambiguous field. Historical facts should remain traceable when corrections occur.

## Order Aggregate

Candidate information areas include parties, channel, location, lines, quantities, prices, adjustments, tax, delivery or collection instructions, payment references, fulfillment references, and audit metadata. Their definitions and ownership remain pending.

### TODO — Product Owner

- Define what constitutes an order in every intended channel.
- Define order identity, ownership, editable fields, and required evidence.
- Confirm quotation, reservation, subscription, preorder, exchange, and other order-like concepts in scope.

## Implemented Persistence Foundation

Migration `20260802060000_order_lifecycle_foundation.sql` creates an empty private `sales` schema with three rule-neutral records:

| Record           | Responsibility                                                                          | Explicit boundary                                                           |
| ---------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Order            | Stable organization/channel ownership, currency, source, time, and idempotency identity | Contains no customer PII, payment, fulfillment, tax, or current-state field |
| Order line       | Quantity and unit-price snapshot with optional catalog-variant reference                | Defines no discount, tax, bundle, return, or accounting treatment           |
| Order transition | Ordered, attributable, append-only lifecycle evidence                                   | Defines no state vocabulary, allowed path, permission, or side effect       |

Order source and transition idempotency keys prevent duplicate commands from silently creating duplicate business records. Transition evidence cannot be updated or deleted; corrections require new attributable evidence. A current state must eventually be derived through an approved transition contract rather than maintained as an ambiguous writable status.

Every table has row-level security enabled. Anonymous and authenticated roles have no privileges or policies, the schema is not exposed through the configured Data API, and no order data has been inserted.

Sprint 10 adds append-only customer-order association evidence in the separate private `crm` schema. Orders continue to contain no customer PII and do not infer customer ownership or role. Association vocabulary, cardinality, guest behavior, and customer-facing effects remain pending approved customer and privacy rules.

## Approved Sprint 15 Checkout Boundary

Guest checkout is allowed and creates a customer account from checkout details. Phone OTP is primary; email OTP is a fallback when supplied and phone verification is unavailable. Verified phone/email matches reuse the existing identity. A guest cart can be associated with that verified identity.

Before confirmation the customer reviews the revalidated cart, structured address, calculated delivery charge, and payment method. Confirmation idempotently creates the order and begins a 30-minute stock reservation based only on current price and availability. Insufficient stock cannot be over-reserved and produces an auditable administrator-handled exception.

The released confirmation boundary does not perform or simulate OTP verification. It requires the active cart to reference a customer with an existing verified contact before it can create an order. Order lines, delivery address, configured zone/charge, and selected payment evidence are stored as immutable-at-creation snapshots. A Confirmed transition and reservation-created events preserve audit evidence; expired reservations cease reducing availability and can be materialized as explicit expiry events by the reservation maintenance function.

Sprint 15 must not define the broader Order Management lifecycle reserved for Sprint 16.

## Lifecycle Definition

The approved lifecycle must be represented as a transition catalog rather than inferred from a suggested sequence.

| Required field        | Meaning                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| State / transition ID | Stable business identifier                                                       |
| Entry criteria        | Facts required before entry                                                      |
| Permitted actor       | Role and scope allowed to act                                                    |
| Action                | Business event causing transition                                                |
| Side effects          | Inventory, payment, fulfillment, accounting, notification, and reporting impacts |
| Exit criteria         | Evidence of completion                                                           |
| Reversal / recovery   | Approved correction path                                                         |
| Audit evidence        | Actor, time, reason, references, and rule version                                |

### TODO — Product Owner and Domain Owners

- Provide approved states, transitions, terminal outcomes, and time limits.
- Define channel-specific variations and cross-channel behavior.

## State Dimensions

Separate state models should be considered for commercial acceptance, payment, fulfillment, cancellation, return/refund, and accounting recognition. Their synchronization rules require approval.

## Transition Controls

Transitions must validate current state, actor authority, required inputs, and applicable rule version. Retried requests must not duplicate business effects. Concurrent actions require deterministic conflict handling.

## Changes, Cancellation, and Returns

No amendment, cancellation, return, exchange, refund, or store-credit policy is defined here.

### TODO — Product Owner

- Define eligible actions, windows, reasons, approvals, fees, evidence, and customer communication.
- Define treatment of partial quantities, promotions, payments, tax, stock, and financial postings.

## Cross-Domain Effects

Every lifecycle transition must explicitly state whether it reserves or moves inventory, initiates or reverses payment, creates fulfillment work, changes customer commitments, produces accounting events, or triggers notifications and automation.

## Exceptions and Recovery

Expected exception classes include unavailable dependencies, inconsistent external responses, duplicate commands, partial completion, and manual override. Recovery policy and authority are pending; failures must remain visible and reconcilable.

## Pending Decisions

### TODO — Product Owner

- Confirm channels, currencies, price/tax timing, payment and fulfillment models.
- Define order ownership, service-level commitments, fraud review, and correction policy.
- Supply representative scenarios and acceptance examples.

## Future Expansion

Add approved state diagrams, transition tables, event definitions, sequence diagrams, exception playbooks, and acceptance scenarios for each channel.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)
- [Operating Topology Architecture](19_OPERATING_TOPOLOGY_ARCHITECTURE.md)
- [Fulfillment and Delivery Architecture](20_FULFILLMENT_DELIVERY_ARCHITECTURE.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
- [Customer and CRM Identity Architecture](22_CUSTOMER_CRM_IDENTITY_ARCHITECTURE.md)
