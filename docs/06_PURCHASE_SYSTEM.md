# Purchase System

## Purpose

This document defines the approved procurement and supplier-management operating model and its integration boundaries.

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

Sprint 20 approves the supplier lifecycle **Draft → Active → Suspended → Archived**. Suspended suppliers cannot receive new purchase orders, while existing operations and history remain accessible. Multiple suppliers may source one variant, with one active preferred supplier; the relationship records supplier SKU/code, MOQ, pack size, BDT purchase cost, lead time, and active/preferred status.

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

Purchase orders use globally unique database-generated `PO-YYYY-XXXXXX` references. The approved lifecycle is **Draft → Pending Approval → Approved → Ordered → Partially Received → Fully Received → Closed**, with **Cancelled** and **Rejected** exceptions. Approval is the commitment point. Material changes after approval require amendment and reapproval; Fully Received and Closed history is immutable.

Super Admin has full authority, Admin performs normal purchasing and approvals, and Staff may draft and perform permitted receiving operations but cannot approve their own purchase order. Emergency purchases remain in this workflow and may be flagged.

The released Purchase Order Admin workflow creates database-numbered drafts, validates every line against the selected supplier's active variant relationship, snapshots product/SKU, MOQ, pack size and commercial cost facts, supports bounded fixed/percentage discounts, and calculates non-negative BDT totals. Submit, approve, reject, order, amendment, and cancellation commands append audit transitions. Creation and approval never create Inventory movements.

The lifecycle must define each approved document or commitment, its states, entry and exit criteria, permitted actors, amendments, cancellation, and downstream effects. No assumed request-to-order-to-receipt sequence is authoritative.

### TODO — Purchasing Owner

- Define required procurement artifacts, states, transitions, and approval thresholds.
- Define partial, split, substituted, over-, under-, and late-delivery behavior.

## Demand and Replenishment

Initial replenishment is manual. Automated reorder suggestions are deferred.

Replenishment may use human judgment, parameters, forecasts, or approved automation. Inputs, ownership, safety controls, and override policy must be established before automated ordering.

## Receiving and Discrepancies

Multiple and partial receipts are supported. Partial, short, and excess observations remain explicit; excess requires review and substitutions are not automatically accepted. Inspection records accepted, damaged/rejected, and applicable batch/expiry facts. Only accepted quantities enter available inventory through the `Purchase / Receive` movement. Supplier returns use an auditable `Return Out` movement.

The released Receiving workspace records each supplier delivery as immutable receipt and line evidence. It rejects duplicate supplier delivery references and cumulative over-receipt unless an Admin/Super Admin explicitly approves the excess with a discrepancy note. Accepted quantities alone create referenced, idempotent Main Inventory movements; damaged/rejected and quarantined quantities remain unavailable. Cumulative observations transition Ordered POs to Partially Received or Fully Received without rewriting PO lines.

Purchase Returns reference accepted receipt-line quantities and preserve PO, receipt, batch, and expiry facts. Partial and multiple returns are permitted within cumulative eligibility. Admin/Super Admin approval governs the Requested → Approved → Awaiting Return → Returned → Completed lifecycle; Rejected and Cancelled remain auditable exceptions. Physical return evidence is mandatory, and only the Returned transition posts the outward `purchase-return` movement.

Supplier payables are derived from accepted receipt value after proportional PO discounts, less physically returned quantities. Manual BDT payments support partial settlement, credit due dates, and Unpaid, Partially Paid, Paid, Overdue, and Disputed operational states. Immutable payment evidence and allocations are separated from append-only verification decisions; pending and verified allocations prevent overpayment, while rejected evidence never counts as paid.

Receiving should preserve what was expected, what was observed, condition, time, location, actor, and evidence. Discrepancy handling must distinguish inventory acceptance from supplier and financial resolution.

### TODO — Domain Owners

- Define inspection, lot/expiry capture, quality hold, discrepancy tolerances, claims, and returns.
- Define who may correct a receipt and how downstream effects are reversed.

## Cost and Financial Integration

Initial purchasing currency is BDT. Supplier discounts and unit/pack conversion are supported. Purchase cost is the initial inventory cost basis; landed-cost allocation is deferred. Supplier operational payment states are Unpaid, Partially Paid, Paid, Overdue, and Disputed; credit purchases and evidence-backed verification are supported without defining Sprint 21 accounting entries.

Purchasing must exchange controlled facts with inventory and accounts without deciding accounting treatment in the purchasing module. Purchase commitments, receipts, supplier invoices, landed costs, taxes, and payments require owned definitions.

## Controls and Audit

Supplier performance derives from governed operational history and never automatically suspends a supplier. Lifecycle, approval, amendment, receipt, discrepancy, return, and payment evidence is attributable and append-only.

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
