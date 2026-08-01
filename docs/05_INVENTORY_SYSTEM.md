# Inventory System

## Purpose

This document defines the future inventory domain's conceptual boundaries and control framework. It does not assume valuation, reservation, replenishment, or adjustment rules.

## Table of Contents

- [Objectives and scope](#objectives-and-scope)
- [Inventory concepts](#inventory-concepts)
- [Implemented persistence foundation](#implemented-persistence-foundation)
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

The inventory domain should provide explainable stock positions, controlled movements, availability inputs, and reconciliation evidence across approved products and locations. Scope must be confirmed for physical stock, samples, testers, bundles, packaging, damaged goods, consignment, and non-stock items.

## Inventory Concepts

Candidate concepts include stock item, product variant, location, sublocation, lot/batch, serial identifier, expiry, stock condition, ownership, movement, reservation, count, and adjustment. These are candidates only.

### TODO — Domain Owner

- Approve inventory terminology, identifiers, units of measure, and location hierarchy.
- Define which product attributes require traceability.

## Implemented Persistence Foundation

Migration `20260802050000_inventory_ledger_foundation.sql` establishes an empty private `inventory` schema with the following rule-neutral records:

| Record        | Responsibility                                                                                    | Explicit boundary                                                         |
| ------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Stock item    | Inventory identity optionally linked to one catalog variant                                       | Does not define whether every variant is stocked                          |
| Lot           | Optional lot/batch identity and date facts                                                        | Does not require lot tracking or define expiry policy                     |
| Movement      | Attributable event header, source, actor reference, occurrence time, and optional correction link | Movement-type and reason vocabularies remain unapproved                   |
| Movement line | Signed quantity delta by stock item and location                                                  | Does not calculate availability, value, reservations, or financial impact |

Movement headers and lines are append-only at the database boundary. Corrections require new attributable movements rather than overwriting history. Idempotency keys prevent the same integration command from silently creating duplicate movement headers. Exact numeric quantities and explicit unit codes avoid floating-point assumptions.

Every inventory table has row-level security enabled. Anonymous and authenticated roles have no privileges or policies, the schema is not exposed by the configured Data API, and no stock or reference data has been inserted.

## Stock Dimensions

An inventory position may need to be distinguished by item, location, condition, ownership, lot/batch, expiry, and unit of measure. Approved dimensions must be sufficient to reconcile physical and financial stock without unnecessary complexity.

## Movement Ledger

Inventory changes should be represented by attributable business movements with source reference, quantity, unit, origin/destination where applicable, actor, time, reason, and correction relationship. Directly overwriting unexplained balances is not an acceptable design principle.

The persistence foundation represents movement impact as one or more signed lines. A transfer can later be represented by balanced lines at different locations, while receipts, issues, adjustments, and condition changes can use approved line patterns. No balancing or allowed-pattern rule is implemented until movement policies are approved.

### TODO — Product Owner

- Define approved movement types and their initiating business events.
- Define rules for backdating, reversal, negative stock, and corrections.

## Availability and Reservation

Physical quantity, available-to-sell, reserved, expected, damaged, quarantined, and other views must not be treated as interchangeable. No calculation is approved.

### TODO — Domain Owner

- Define availability formulas, reservation timing, allocation priority, expiry, release, and overselling policy.
- Define channel and location sharing or partitioning of stock.

## Counting and Reconciliation

The system must support a controlled comparison of recorded and observed stock. Count scheduling, blind counts, tolerances, recounts, approvals, and financial consequences remain pending.

## Traceability and Controls

Inventory-impacting operations require role-based authority and audit evidence. Sensitive actions may need reason codes, approval, supporting evidence, and exception reports after business controls are approved.

## Integration Boundaries

Inventory interacts with product catalog, orders, fulfillment, POS, purchasing, returns, accounts, reports, and external logistics. Each integration must declare which domain owns the fact and how failures reconcile.

## Pending Decisions

### TODO — Product Owner / Inventory Owner

- Confirm locations, stock ownership, unit conversions, bundles/kits, lot and expiry requirements.
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
