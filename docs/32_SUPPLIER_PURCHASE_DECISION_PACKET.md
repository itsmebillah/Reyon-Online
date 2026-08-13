# Sprint 20 — Supplier and Purchase Operations

## Purpose

This document records the authoritative Product Owner decisions for Supplier and Purchase Operations and the bounded Sprint 20 execution sequence. It reuses Catalog variant identity, Main Inventory, append-only audit, Payment evidence, and Notification foundations from Sprints 14–19.

## Table of Contents

- [Approved supplier rules](#approved-supplier-rules)
- [Approved purchase order rules](#approved-purchase-order-rules)
- [Receiving and inventory](#receiving-and-inventory)
- [Supplier payments](#supplier-payments)
- [Controls and reporting](#controls-and-reporting)
- [Implementation sequence](#implementation-sequence)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Approved Supplier Rules

- Supplier lifecycle is **Draft → Active → Suspended → Archived**.
- Suspended suppliers cannot receive new purchase orders. Existing operations and historical records remain accessible.
- A product variant may have multiple suppliers, with at most one active preferred supplier.
- Supplier–variant sourcing records store supplier SKU/code, minimum order quantity, pack size, purchase cost, and lead time.

## Approved Purchase Order Rules

- Purchase numbers are globally unique, database-generated, and formatted `PO-YYYY-XXXXXX`.
- Lifecycle is **Draft → Pending Approval → Approved → Ordered → Partially Received → Fully Received → Closed**; exceptional terminal states are **Cancelled** and **Rejected**.
- Approval is the purchasing commitment point.
- Super Admin has full authority. Admin performs normal operations and approval. Staff may create drafts and perform permitted receiving tasks but cannot approve their own PO.
- Initial currency is BDT. Supplier discounts and unit/pack conversion are supported.
- Material changes after approval require a separately auditable amendment and reapproval.
- Cancellation and amendment become increasingly restricted by lifecycle stage. Fully Received and Closed history is immutable.
- Emergency purchases use the governed workflow and may be manually flagged.

## Receiving and Inventory

- Multiple receipts and partial receiving are supported. Short, partial, and excess quantities are explicit observed facts; excess requires review.
- Substitutions are never accepted automatically.
- Inspection distinguishes accepted, damaged/rejected, batch, and expiry facts where applicable.
- Only accepted quantities create the approved `Purchase / Receive` movement and enter available inventory.
- Purchase returns are append-only, auditable, and create the approved `Return Out` movement only through the governed workflow.
- Initial inventory cost basis is purchase cost. Landed-cost allocation is deferred.

## Supplier Payments

- Operational states are **Unpaid**, **Partially Paid**, and **Paid**, with **Overdue** and **Disputed** exceptions.
- Credit purchasing and partial settlement are supported.
- Purchase payment verification requires evidence. Sprint 20 records operational payment facts; accounting interpretation remains owned by Sprint 21.

## Controls and Reporting

- Purchase lifecycle, amendments, receipts, discrepancies, returns, and payments preserve actor, role, timestamps, reasons, evidence references, and append-only history.
- Supplier performance is tracked from governed operational facts and never automatically suspends a supplier.
- Initial replenishment is manual. Automated reorder suggestions are deferred.

## Implementation Sequence

1. **Supplier management:** lifecycle, supplier–variant sourcing, preferred source, and role-aware Admin operations.
2. **Purchase order operations:** numbering, draft lines, submission, approval/rejection, ordering, amendments, and cancellation controls.
3. **Receiving and inspection:** multiple/partial receipts, discrepancies, excess review, accepted inventory movements, batch/expiry evidence.
4. **Purchase returns:** auditable approved quantities and `Return Out` movements.
5. **Supplier payment operations:** credit terms, payment states, evidence, and conflict-safe verification.
6. **Closeout and performance:** immutable closure, supplier operational history, and manual replenishment insight.

## Future Expansion

Future approvals may add supplier contacts and compliance records, quotations, multiple warehouses, automated replenishment, landed-cost allocation, EDI/vendor portals, invoice matching, and accounting adapters without replacing stable supplier, PO, receipt, or payment evidence.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Purchase System](06_PURCHASE_SYSTEM.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Roadmap](13_ROADMAP.md)
- [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)
