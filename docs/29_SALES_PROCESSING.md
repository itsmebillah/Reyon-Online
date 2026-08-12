# Sprint 17 — Sales Processing

## Purpose

This document records the approved Sales Processing rules connecting completed orders, inventory, payment, customers, delivery, future Accounts, and Reports.

## Table of Contents

- [Approved rules](#approved-rules)
- [Implementation sequence](#implementation-sequence)
- [Controls](#controls)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Approved Rules

- `Completed` is the official completed-sale event; `Delivered` is a distinct delivery milestone.
- Verified prepaid/manual payment permits processing but does not complete a sale. COD is collected at delivery; its sale is recognized only at Completed.
- Shipped transactionally converts the active reservation into one auditable sold/fulfilled inventory movement. Idempotency prevents double deduction.
- Existing catalog prices remain valid. Authorized admins may apply line/order discounts with complete audit evidence.
- A globally unique database-generated customer Invoice is required. Payment Receipt is separate and generated only for verified/collected payment.
- Cancelled, Rejected, Failed, and abandoned orders are excluded from completed sales.
- Returns/refunds append adjustments and never destroy original sale evidence.
- Daily control is reporting/reconciliation oriented; POS opening/closing is not mandatory initially.
- Product sales revenue and delivery charges are reported separately; customer Grand Total includes both.
- Best Seller and net-sales reporting use completed quantities/revenue net of auditable returns.

## Implementation Sequence

1. Shipment inventory conversion and completed-sale evidence.
2. Globally unique invoices and separate payment receipts.
3. Role-controlled audited discounts and customer confirmation boundary.
4. Sales register, daily reconciliation, and net-sales projections.
5. Return/refund adjustment consumption when Sprint 19 supplies approved workflows.

## Controls

Sales evidence, documents, discounts, inventory movements, and adjustments are append-only or corrected by attributable counter-evidence. Accounting posting remains deferred until Finance approves accounts and entry mappings.

## Future Expansion

Add POS sessions only if approved, settlement reconciliation, invoice rendering/delivery, accounting adapters, tax rules, and governed reporting projections without changing sales source evidence.

## Related Documents

- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Roadmap](13_ROADMAP.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
- [Reporting Architecture](23_REPORTING_ANALYTICS_CONTRACT_ARCHITECTURE.md)
