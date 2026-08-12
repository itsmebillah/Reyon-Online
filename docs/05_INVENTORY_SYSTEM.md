# Inventory System

## Purpose

This document defines REYON's inventory boundaries, approved Inventory Entry rules, controls, and future expansion path.

## Table of Contents

- [Objectives and scope](#objectives-and-scope)
- [Inventory concepts](#inventory-concepts)
- [Implemented inventory foundation](#implemented-inventory-foundation)
- [Approved Inventory Entry rules](#approved-inventory-entry-rules)
- [Stock dimensions](#stock-dimensions)
- [Movement ledger](#movement-ledger)
- [Availability and reservation](#availability-and-reservation)
- [Counting and reconciliation](#counting-and-reconciliation)
- [Traceability and controls](#traceability-and-controls)
- [Integration boundaries](#integration-boundaries)
- [Pending decisions](#pending-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Objectives and Scope

The inventory domain should provide explainable stock positions, controlled movements, availability inputs, and reconciliation evidence across approved products and locations. Product Owner decision CAT-VARIANT-001 establishes that sellable stock is tracked per product variant, not at parent-product level. Scope must still be confirmed for physical stock, samples, testers, bundles, packaging, damaged goods, consignment, and non-stock items.

## Inventory Concepts

Candidate concepts include stock item, product variant, location, sublocation, lot/batch, serial identifier, expiry, stock condition, ownership, movement, reservation, count, and adjustment. These are candidates only.

### TODO — Domain Owner

- Approve inventory terminology, identifiers, units of measure, and location hierarchy.
- Define which product attributes require traceability.

## Implemented Inventory Foundation

Migrations `20260802050000_inventory_ledger_foundation.sql` and `20260811140000_inventory_entry.sql` establish the private inventory ledger and approved operating layer:

| Record        | Responsibility                                                                                    | Explicit boundary                                                       |
| ------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Stock item    | Inventory identity linked to one sellable catalog variant when stocked                            | Does not define whether every catalog variant is currently stocked      |
| Lot           | Optional lot/batch identity and date facts                                                        | Does not require lot tracking or define expiry policy                   |
| Movement      | Attributable event header, source, actor reference, occurrence time, and optional correction link | Uses the approved Inventory Entry movement vocabulary                   |
| Movement line | Signed quantity delta by stock item and location                                                  | Authoritative input for derived on-hand stock                           |
| Reservation   | Future order allocation against an item and location                                              | Persistence-ready; current Inventory Entry does not create reservations |

Movement headers and lines are append-only at the database boundary. Corrections require new attributable movements rather than overwriting history. Idempotency keys prevent the same integration command from silently creating duplicate movement headers. Exact numeric quantities and explicit unit codes avoid floating-point assumptions.

Every inventory table has row-level security enabled. Direct anonymous and authenticated access is denied; administrator operations use narrowly scoped authenticated functions. The approved Main Inventory location is created idempotently.

## Approved Inventory Entry Rules

- REYON begins with one **Main Inventory** location; the model supports future stores and warehouses.
- Stock is tracked per sellable product variant.
- Approved movements are Opening Stock, Purchase / Receive, Sale, Return In, Return Out, Adjustment In, Adjustment Out, and Damage / Loss.
- Negative on-hand stock is rejected transactionally.
- On-hand is derived from the immutable movement ledger. Available equals on-hand minus active reservations.
- Historical movements are never edited or deleted. A correction adds an attributable reversing movement and preserves the original evidence.
- The audit trail records actor, occurrence and recording timestamps, type, signed quantity, variant, location, and applicable reason/reference.
- Published variants with zero available stock display **Out of Stock** and cannot be added to the bag.
- Batch and expiry fields remain available through inventory lots; operational workflows are deferred.

## Stock Dimensions

An inventory position may need to be distinguished by item, location, condition, ownership, lot/batch, expiry, and unit of measure. Approved dimensions must be sufficient to reconcile physical and financial stock without unnecessary complexity.

## Movement Ledger

Inventory changes should be represented by attributable business movements with source reference, quantity, unit, origin/destination where applicable, actor, time, reason, and correction relationship. Directly overwriting unexplained balances is not an acceptable design principle.

The persistence foundation represents movement impact as one or more signed lines. A transfer can later be represented by balanced lines at different locations, while receipts, issues, adjustments, and condition changes can use approved line patterns. No balancing or allowed-pattern rule is implemented until movement policies are approved.

The approved movement vocabulary is enforced by the database. Backdating is not exposed in the current administrator workflow. Corrections require a reason and are themselves append-only.

## Availability and Reservation

On-hand is the sum of movement deltas. Reserved is the sum of active future order reservations. Available equals on-hand minus reserved. Expected, damaged, quarantined, and other views remain separate future concerns.

For Sprint 15, adding a product to a cart does not reserve stock. Order confirmation starts an auditable 30-minute reservation. Cancellation, expiry, or leaving confirmed state without successful fulfillment releases it. Confirmation never reserves above available stock; insufficient stock places the order into an administrator-handled exception without trusting stale cart availability.

Sprint 17 converts the active reservation into one append-only sold/fulfilled inventory movement when the order reaches Shipped. The conversion, reservation release, and order transition are transactional and idempotent so stock is never deducted twice.

### TODO — Domain Owner

- Define reservation timing, allocation priority, expiry, release, and order integration behavior.
- Define channel and location sharing or partitioning of stock.

## Counting and Reconciliation

The system must support a controlled comparison of recorded and observed stock. Count scheduling, blind counts, tolerances, recounts, approvals, and financial consequences remain pending.

## Traceability and Controls

Inventory-impacting operations require role-based authority and audit evidence. Sensitive actions may need reason codes, approval, supporting evidence, and exception reports after business controls are approved.

## Integration Boundaries

Inventory interacts with product catalog, orders, fulfillment, POS, purchasing, returns, accounts, reports, and external logistics. Each integration must declare which domain owns the fact and how failures reconcile.

## Pending Decisions

### TODO — Product Owner / Inventory Owner

- Confirm additional locations, stock ownership, unit conversions, bundles/kits, and required lot/expiry workflows.
- Define receiving, transfer, damage, loss, return-to-vendor, and customer-return treatment.
- Define valuation responsibility, reconciliation cadence, and required reports.

## Future Expansion

Add approved movement and reservation state models, location topology, count procedures, replenishment policy, inventory event catalog, reconciliation dashboards, and migration controls.

## Related Documents

- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Purchase System](06_PURCHASE_SYSTEM.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)
- [Operating Topology Architecture](19_OPERATING_TOPOLOGY_ARCHITECTURE.md)
