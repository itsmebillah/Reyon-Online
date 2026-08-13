# Sprint 19 — Returns and Refunds

## Purpose

This document records the authoritative Product Owner rules for Sprint 19. It preserves every approved Order, Sales, Delivery, Payment, Inventory, notification, reporting, and audit boundary from Sprints 14–18.

## Table of Contents

- [Eligibility](#eligibility)
- [Lifecycle and authority](#lifecycle-and-authority)
- [Shipping and inspection](#shipping-and-inspection)
- [Refunds and reporting](#refunds-and-reporting)
- [Controls](#controls)
- [Implementation sequence](#implementation-sequence)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Eligibility

- The request window is seven days from `Delivered`; normal requests apply to Delivered and Completed orders.
- Products support a product-level returnable flag. Unopened/unused products in original condition are normally returnable; opened hygiene-sensitive cosmetics and personal-care products are normally non-returnable.
- Wrong, Damaged, Defective, and Missing Item claims are exception-returnable. Approved reasons are Wrong Product, Damaged, Defective, Missing Item, Not as Described, Changed Mind, and Other.
- Wrong, Damaged, Defective, and Missing Item claims require photo evidence; video is optional.
- Partial and multiple returns are allowed, but cumulative returned/requested quantity cannot exceed the original ordered quantity.

## Lifecycle and Authority

The lifecycle is Requested → Under Review → Approved → Awaiting Return → Received → Inspected → Refund Pending → Refunded. Exceptional states are Rejected, Withdrawn, and Cancelled. Every transition is attributable and append-only.

Admin and Super Admin may review and approve/reject returns and refunds. Staff may view and process permitted operational tasks but cannot approve refunds. No second approval or monetary threshold applies initially.

## Shipping and Inspection

- REYON pays return shipping for Wrong Product, Damaged, Defective, and Missing Item cases. Customers pay return shipping for Changed Mind.
- The original delivery charge is normally non-refundable. Admin may approve it for a genuine REYON-fault case.
- Returned products require inspection before disposition. Sellable goods return to available inventory. Quarantine remains unavailable. Damage/loss, expiry, and batch issues use loss/quarantine handling.

## Refunds and Reporting

- Refund equals the actual paid amount attributable to accepted returned items after proportional discount allocation. A partial return refunds only its accepted quantity/value; amounts cannot be negative.
- Delivery charge is normally excluded unless an Admin approves it for genuine REYON fault.
- bKash, Nagad, Rocket, Card, and COD refunds are manual initially. No automatic gateway outcome may be claimed. Execution requires evidence and audit history.
- Refund completion appends net-sales and net-Best Seller adjustments. Original Order, Sale, Invoice, and Receipt history remains immutable; refund/adjustment documents are separate auditable records.

## Controls

Customer/Admin events use the provider-neutral notification outbox. Corrections are append-only, require Admin or Super Admin authority and a mandatory reason, and never destructively rewrite prior return, refund, payment, inventory, or reporting evidence.

## Implementation Sequence

1. Return eligibility, request intake, line quantities, evidence, and lifecycle foundation.
2. Admin review, approval/rejection, withdrawal, and operational return processing.
3. Receipt, inspection, and sellable/quarantine/loss inventory disposition.
4. Proportional refund calculation, manual execution evidence, and separate adjustment documents.
5. Net-sales and net-Best Seller adjustment projections plus customer/Admin notifications.
6. Append-only corrections and targeted release verification.

Sprint 19 is released. Missing Item claims use an explicit non-physical resolution after approval and cannot create inventory movements. Exceptional corrections append authorized counter-evidence containing the affected record, previous value, corrected value, actor, time, and mandatory reason; source history remains immutable.

## Future Expansion

Future approvals may add automated carrier labels, gateway refunds, exchanges, store credit, supplier claims, warranties, multi-location routing, or accounting/tax documents without replacing the append-only source records.

## Related Documents

- [Roadmap](13_ROADMAP.md)
- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
- [Reporting Architecture](23_REPORTING_ANALYTICS_CONTRACT_ARCHITECTURE.md)
- [Order Management](28_ORDER_MANAGEMENT_DECISION_PACKET.md)
- [Sales Processing](29_SALES_PROCESSING.md)
- [Delivery Operations](30_DELIVERY_OPERATIONS_DECISION_PACKET.md)
