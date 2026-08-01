# Purchase System

## Purpose

This document structures the procurement and supplier-management domain for future definition. It establishes control questions and integration boundaries without inventing purchasing policy.

## Table of Contents

- [Scope and objectives](#scope-and-objectives)
- [Supplier foundation](#supplier-foundation)
- [Implemented persistence foundation](#implemented-persistence-foundation)
- [Purchase lifecycle](#purchase-lifecycle)
- [Demand and replenishment](#demand-and-replenishment)
- [Receiving and discrepancies](#receiving-and-discrepancies)
- [Cost and financial integration](#cost-and-financial-integration)
- [Controls and audit](#controls-and-audit)
- [Exceptions](#exceptions)
- [Pending decisions](#pending-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope and Objectives

The purchase domain may cover supplier records, sourcing, purchase requests, approvals, purchase orders, receiving, discrepancies, returns to supplier, invoice matching, and performance insight. Actual scope and sequencing are pending.

## Supplier Foundation

Supplier data may include identity, contacts, commercial terms, tax details, payment details, assortment, lead times, service expectations, compliance evidence, and status. Sensitive data and approval requirements must be classified.

### TODO — Product Owner

- Define supplier onboarding, verification, modification, suspension, and offboarding.
- Identify ownership and evidence requirements for supplier master data.

## Implemented Persistence Foundation

Sprint 8 establishes an empty, private `purchasing` schema that preserves only stable supplier identity, purchase-order identity, line-level quantity and unit-cost snapshots, and append-only lifecycle-transition evidence. Row-level security is enabled, browser-facing roles receive no policies or privileges, and no production or demonstration records are inserted.

| Record                 | Owned facts                                                                                               | Explicit exclusions                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `suppliers`            | Organization-scoped code and display/legal identity; optional external-source identity                    | Contacts, terms, tax, payment details, compliance, assortment, lead times, and status                        |
| `purchase_orders`      | Organization, supplier, optional destination, currency, source identity, idempotency, and occurrence time | Numbering policy, approvals, delivery promises, tax, landed cost, invoice, payment, and accounting treatment |
| `purchase_order_lines` | Stable catalog reference when available plus SKU/name/variant snapshots, exact quantity, and unit cost    | Receiving, accepted quantity, valuation, tax allocation, discount allocation, and substitutions              |
| `purchase_transitions` | Ordered, attributable, append-only state-change evidence                                                  | State vocabulary, allowed transitions, approval authority, cancellation, amendment, and downstream effects   |

Supplier and destination foreign keys enforce organization ownership. Purchase transitions cannot be updated or deleted; corrections require new attributable evidence. Purchase headers and lines remain mutable only at the storage layer for a future controlled service, but no client or user can access them until role and workflow policy is approved.

Inventory remains the authority for physical receipt movements. Purchasing must not infer stock from ordered quantities, and no receiving integration will be implemented until inspection, discrepancy, and inventory-posting rules are approved. Finance remains the authority for tax, liability, valuation, payment, and accounting interpretation.

## Purchase Lifecycle

The lifecycle must define each approved document or commitment, its states, entry and exit criteria, permitted actors, amendments, cancellation, and downstream effects. No assumed request-to-order-to-receipt sequence is authoritative.

### TODO — Purchasing Owner

- Define required procurement artifacts, states, transitions, and approval thresholds.
- Define partial, split, substituted, over-, under-, and late-delivery behavior.

## Demand and Replenishment

Replenishment may use human judgment, parameters, forecasts, or approved automation. Inputs, ownership, safety controls, and override policy must be established before automated ordering.

## Receiving and Discrepancies

Receiving should preserve what was expected, what was observed, condition, time, location, actor, and evidence. Discrepancy handling must distinguish inventory acceptance from supplier and financial resolution.

### TODO — Domain Owners

- Define inspection, lot/expiry capture, quality hold, discrepancy tolerances, claims, and returns.
- Define who may correct a receipt and how downstream effects are reversed.

## Cost and Financial Integration

Purchasing must exchange controlled facts with inventory and accounts without deciding accounting treatment in the purchasing module. Purchase commitments, receipts, supplier invoices, landed costs, taxes, and payments require owned definitions.

## Controls and Audit

Potential controls include supplier-change approval, spending authority, competitive sourcing, segregation of duties, duplicate detection, match tolerances, and exception review. None are adopted until approved.

## Exceptions

The future design must address rejected goods, missing documents, price or quantity variance, damaged receipt, duplicate invoice, failed integration, and supplier dispute, with explicit ownership and aging.

## Pending Decisions

### TODO — Product Owner / Purchasing / Finance

- Confirm procurement policy, approval authority, supplier terms, currencies, taxes, and payment practices.
- Define purchasing units, destinations, replenishment ownership, and emergency buying.
- Define matching method, tolerances, period-close treatment, and required reporting.

## Future Expansion

Add supplier and purchase state models, approval matrix, receiving procedure, matching policy, sourcing workflow, replenishment design, supplier scorecard, and integration contracts.

## Related Documents

- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [User Roles](03_USER_ROLES.md)
- [Business Rules](02_BUSINESS_RULES.md)
