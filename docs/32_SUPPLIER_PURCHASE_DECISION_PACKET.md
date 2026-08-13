# Sprint 20 — Supplier and Purchase Operations Decision Packet

## Purpose

This packet requests only the Product Owner decisions still required to implement Supplier and Purchase Operations safely. It preserves the approved Catalog, variant-level Inventory, Main Inventory, immutable audit, role, Sales, Order, Return, and Finance ownership boundaries from Sprints 14–19.

## Table of Contents

- [Already decided](#already-decided)
- [Decisions required](#decisions-required)
- [Implementation boundary](#implementation-boundary)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Already Decided

- Products and sellable variants retain stable Catalog identities; inventory is tracked per variant at Main Inventory initially.
- Purchasing already has private supplier, purchase-order, commercial line-snapshot, and append-only transition foundations.
- Physical stock changes only through the Inventory ledger. An accepted purchase receipt uses the approved `Purchase / Receive` movement and cannot silently edit history or create negative stock.
- Purchase quantity and unit cost are exact snapshots. Purchasing does not own Catalog selling prices.
- Accounting owns liability, inventory valuation, tax, landed-cost interpretation, journal mappings, and financial statements. Sprint 20 cannot invent those treatments.
- Existing Super Admin, Admin, and Staff identities are extensible; exact Supplier/Purchase permissions remain to be approved.

## Decisions Required

### SP-01 — Supplier Lifecycle

Approve supplier states and transitions, including the initial state, active/approved use, inactive or suspended handling, archive/offboarding, reactivation, required reasons, and whether purchase history must remain available for non-active suppliers.

### SP-02 — Supplier Business and Contact Records

Define required and optional supplier fields: display/legal name, supplier code policy, contact people and roles, phone, email, address, country, website, tax/business-registration identifiers, notes, and authenticity/import/distributor evidence. Identify which fields are sensitive and who may view or edit them.

### SP-03 — Supplier–Product Relationships

Confirm that one variant may have multiple suppliers and define whether a preferred/default supplier is supported. Approve relationship fields such as supplier SKU, quoted cost, minimum order quantity, pack/case quantity, lead time, availability, effective dates, and active status; define duplicate prevention.

### SP-04 — Purchase Order Identity and Lifecycle

Approve the globally unique PO number format and lifecycle states/transitions from Draft through approval, issue/order, partial receipt, full receipt, closure, cancellation, and required exception states. Define when a PO becomes a binding supplier commitment.

### SP-05 — Drafting, Approval, and Permissions

Define what Super Admin, Admin, and Staff may create, edit, submit, approve, issue, receive, close, cancel, and return. Confirm whether approval thresholds, second approval, creator/approver separation, or spending limits apply initially.

### SP-06 — Commercial Line Rules

Confirm initial purchasing currency or allowed currencies, quantity unit (individual sellable units versus supplier packs with conversion), whether zero-cost lines are allowed, whether supplier discounts are recorded, and whether entered unit cost includes or excludes any tax/charges. Define rounding precision and whether price changes after approval require reapproval.

### SP-07 — Receiving and Quantity Variances

Approve partial receiving; whether multiple receipts per line are allowed; whether excess quantities are rejected, allowed within a tolerance, or require approval; how short deliveries remain open or are closed; whether substitutions are permitted; and what receipt reference/evidence is mandatory.

### SP-08 — Receipt Inspection and Discrepancies

Define receipt outcomes for accepted/sellable, quarantine, damaged, expired/near-expiry, wrong item, batch issue, and rejected quantities. Confirm required lot/batch and expiry capture, evidence, responsible roles, and which accepted outcomes create available stock. Define how shortages, damage, and excess create supplier claims without silently changing ordered or observed facts.

### SP-09 — Purchase Returns to Supplier

Approve the return-to-supplier lifecycle, eligible source quantities and reasons, approval authority, shipment/reference evidence, partial returns, replacement versus refund/credit outcomes, and the exact event that creates the approved `Return Out` inventory movement.

### SP-10 — Supplier Payment and Credit Status

Define operational statuses for unpaid, partially paid, paid, credit purchase, overdue, disputed, cancelled, and supplier credit. Approve credit terms/due-date capture, payment evidence, partial payments, overpayment handling, and who may record/verify payment. These are operational source facts only until Sprint 21 approves accounting mappings.

### SP-11 — PO Amendment and Cancellation

Define which fields may change at Draft, Approved, Issued, Partially Received, and Received stages; when supplier confirmation or reapproval is required; cancellation authority/reason/evidence; and treatment of open quantities after cancellation. Received history and inventory movements remain immutable.

### SP-12 — Cost, Valuation, and Landed Cost Scope

Confirm whether Sprint 20 should capture only PO unit-cost evidence or also operational landed-cost components such as freight, duty, handling, and insurance. If landed cost is in scope, approve allocation basis and correction timing. Select an inventory valuation method only with qualified Finance approval; otherwise valuation/posting remains explicitly deferred to Sprint 21.

### SP-13 — Supplier Performance and History

Approve which initial supplier history/performance facts are required: ordered versus received quantity, lead time, on-time delivery, shortages, excess, damaged/rejected quantity, returns, price history, payment/credit history, or manual rating. Define date basis, owner, visibility, and whether any metric automatically affects supplier status.

### SP-14 — Replenishment and Emergency Buying

Confirm whether Sprint 20 includes only manual PO creation or also reorder suggestions. If suggestions are included, define owner, inputs, safety-stock/reorder rules, approval, and override evidence. Define whether emergency purchases use the normal PO/receipt audit path or an approved exceptional path.

## Implementation Boundary

Sprint 20 implementation begins after SP-01 through SP-14 are approved or explicitly deferred. It will reuse the existing private purchasing records, Catalog variant identities, Main Inventory, append-only movement/correction rules, Admin roles, and audit patterns. It will not create accounting journals, infer supplier liabilities, invent tax treatment, automate supplier payments, or create external supplier integrations.

## Future Expansion

Future approvals may add purchase requests, quotations and competitive sourcing, multiple locations, automated replenishment, EDI/vendor portals, supplier invoices and matching, gateway/bank settlement, compliance scoring, and accounting adapters without replacing stable purchase and receipt evidence.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Purchase System](06_PURCHASE_SYSTEM.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Roadmap](13_ROADMAP.md)
- [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)
- [Sales Processing](29_SALES_PROCESSING.md)
- [Returns and Refunds](31_RETURNS_REFUNDS_DECISION_PACKET.md)
