# Sprint 19 — Returns and Refunds Decision Packet

## Purpose

This packet requests only the Product Owner decisions still required to implement safe Returns and Refunds. It preserves the approved Order, Sales, Delivery, Payment, Inventory, audit, notification, and reporting boundaries from Sprints 14–18.

## Table of Contents

- [Already decided](#already-decided)
- [Decisions required](#decisions-required)
- [Implementation boundary](#implementation-boundary)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Already Decided

- After shipment, customer changes use the Return/Refund workflow; original Order, Sale, Invoice, Receipt, Payment, Delivery, and Inventory evidence is never overwritten or deleted.
- `Completed` remains the official completed-sale event. Returns/refunds append adjustments against that history.
- Return inventory effects use approved append-only movement types; they never silently alter on-hand stock.
- Product sales and delivery charges remain separately reportable. Net sales and Best Seller calculations consume auditable returned quantities and refunded product revenue while preserving gross completed-sale history.
- Customer and administrator events use the existing provider-neutral, failure-safe notification outbox.
- Ordinary corrections require attributable counter-evidence. Accounting postings remain deferred until Finance approves account mappings.

## Decisions Required

### RR-01 — Eligibility Window and Starting Event

Approve the return-request time limit and the event from which it is measured: Delivered or Completed. State whether any approved reason receives a different window.

### RR-02 — Eligible Order and Delivery States

Confirm whether customer returns may be requested from Delivered, Completed, or both. Define how Delivery Failed, Lost, Damaged, Returned-to-sender, cancelled, rejected, and failed orders enter resolution without being treated as ordinary customer returns.

### RR-03 — Product Eligibility and Condition

Define returnable and non-returnable products or categories, including opened/used beauty and personal-care goods, hygiene seals, damaged packaging, promotional/free items, bundles, and products near or past expiry. Define the evidence and condition required for each eligible case.

### RR-04 — Approved Reasons and Evidence

Approve the customer-facing reason list and required evidence for damaged, defective, wrong, missing, expired, counterfeit/authenticity concern, changed-mind, and other requests. Confirm when photo or video evidence is mandatory and who may waive it.

### RR-05 — Customer Request and Return Lifecycle

Approve the return/refund states and allowed transitions from request through review, receipt/inspection, resolution, rejection, cancellation, and closure. Confirm whether customers may withdraw an open request and which status/details they may see.

### RR-06 — Approval Authority and Review Timing

Define which of Super Admin, Admin, and Staff may review, approve, reject, inspect, and close returns; which roles may approve full or partial refunds; whether value thresholds apply; required rejection reasons; and target review/refund timeframes.

### RR-07 — Return Scope and Repeat Requests

Confirm whether partial item/quantity returns are allowed, whether full-order returns are allowed, whether multiple return requests may be opened against one order, and how the system prevents returned quantities or refund amounts from exceeding the original eligible quantities and amounts.

### RR-08 — Return Shipping and Responsibility

Define who arranges and pays return shipping for each approved reason, whether the original delivery charge is refundable, whether a return-shipping charge may be deducted, and what evidence marks courier handoff and returned-goods receipt. Exchanges require a separate explicit approval if desired in Sprint 19.

### RR-09 — Inspection and Inventory Disposition

Approve inspection outcomes and their inventory effects: restock as sellable, quarantine, damaged/loss, or other approved disposition. Define who may classify stock, whether unopened/sealed status is required for restocking, and how batch/expiry evidence affects the decision.

### RR-10 — Refund Eligibility, Amount, and Timing

Define when a refund becomes eligible—approval, return handoff, physical receipt, inspection, or another event—and how product discounts, order discounts, original delivery charge, return shipping, partial quantities, missing items, and rounding determine the refundable amount. Refunds must never exceed collected/verified payment attributable to the order.

### RR-11 — Refund Method and Evidence

Approve refund methods for bKash, Nagad, Rocket, manual Card selections, and COD; whether refund must use the original method; what customer payout details may be collected; what evidence proves refund execution; and how failed, rejected, or retried refunds are handled without claiming provider success.

### RR-12 — Financial Documents and Reporting Adjustments

Confirm the customer document issued for an approved return/refund—such as a return confirmation, credit note, refund receipt, or approved combination—and when it is issued. Approve whether net product revenue changes at return approval, accepted inspection, or executed refund, and whether returned quantity affects Best Seller ranking only after accepted inspection. Original Invoice and Payment Receipt remain immutable.

### RR-13 — Notifications and Service Communication

Approve which customer and administrator events require notification, the minimum information shown, and any escalation timing for overdue review, return receipt, inspection, or refund. Provider/channel selection remains configurable and does not block the operational outbox.

### RR-14 — Exceptional Corrections and Audit

Define who may correct an erroneous return decision, stock disposition, or refund record; whether any correction requires higher authority; and the required reason/reference evidence. Corrections remain append-only, idempotent, attributable, and cannot destructively rewrite prior facts.

## Implementation Boundary

Sprint 19 can begin only after RR-01 through RR-14 are approved. Implementation will reuse the existing customer/order association, Admin roles, order-change boundary, delivery evidence, inventory ledger, manual payment evidence, sales adjustments, document numbering, notification outbox, and audit architecture. No gateway, courier integration, exchange policy, tax treatment, or accounting entry is implied.

## Future Expansion

Future decisions may add automated carrier labels, provider-initiated refunds, exchanges, store credit, supplier claims, warranty handling, fraud scoring, multi-location return routing, or jurisdiction-specific tax/accounting documents without changing the append-only source records.

## Related Documents

- [Roadmap](13_ROADMAP.md)
- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Fulfillment and Delivery Architecture](20_FULFILLMENT_DELIVERY_ARCHITECTURE.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
- [Reporting and Analytics Architecture](23_REPORTING_ANALYTICS_CONTRACT_ARCHITECTURE.md)
- [Order Management Decision Packet](28_ORDER_MANAGEMENT_DECISION_PACKET.md)
- [Sales Processing](29_SALES_PROCESSING.md)
- [Delivery Operations Decision Packet](30_DELIVERY_OPERATIONS_DECISION_PACKET.md)
