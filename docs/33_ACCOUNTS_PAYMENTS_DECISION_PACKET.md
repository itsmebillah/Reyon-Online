# Sprint 21 — Accounts and Payments Decision Packet

## Purpose

This packet requests only the Product Owner and qualified Finance decisions still required before Accounts and Payments can post financial records. It preserves the operational facts approved and released in Sprints 14–20.

## Table of Contents

- [Decisions already closed](#decisions-already-closed)
- [Permanent architecture boundary](#permanent-architecture-boundary)
- [Required Product Owner decisions](#required-product-owner-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Decisions Already Closed

- Order `Completed` is the official completed-sale event; `Delivered` is not.
- Product sales and delivery charges are separate operational measures; Customer Grand Total includes both.
- Verified prepaid payment permits processing but does not complete a sale. COD collection occurs at delivery and is reconciled against the expected amount.
- bKash, Nagad, Rocket, Card, COD, supplier payments, and refunds remain manual/provider-neutral and evidence-backed. No gateway outcome may be fabricated.
- Completed refunds append separate adjustments. Original Order, Sale, Invoice, Receipt, payment, and refund evidence remains immutable.
- Supplier payable facts derive from accepted receipt value, PO commercial terms, physical purchase returns, and verified supplier payments.
- Purchase cost is the initial inventory cost basis. Landed-cost allocation is deferred.
- Current commerce behavior performs no separate customer tax calculation. Sprint 21 must not silently introduce one.
- Financial corrections must use attributable append-only counter-evidence, never destructive mutation.

## Permanent Architecture Boundary

The core Commerce and Accounting engine is industry agnostic. Order, Sales, Inventory, Purchase, Payment, Accounting, Delivery, Return, and Reporting rules may depend on governed commercial facts, but never on cosmetics-specific categories, claims, attributes, content, or branding. Niche configuration belongs to Catalog and Presentation. This boundary applies to all Sprint 21 decisions and implementation.

## Required Product Owner Decisions

### 1. Accounting authority, entity, and calendar

1. What legal business/entity name owns the books, and is REYON Online currently operated as an individual/sole proprietorship, partnership, or registered company?
2. Confirm accounting basis: cash basis or accrual basis.
3. Confirm fiscal year start/end, reporting timezone, and whether monthly periods are required from the first release.
4. Name the qualified accountant/finance adviser who will approve the opening chart, posting matrix, and opening balances before production posting begins.

### 2. Chart of accounts and opening balances

5. Approve the initial account list and hierarchy, including at minimum Cash, each Bank account, each MFS wallet, COD clearing, Card clearing, Customer Receivables, Supplier Payables, Inventory, Product Sales, Delivery Revenue, Sales Returns/Refunds, Purchase/Inventory Cost, Cost of Sales, Expenses, Owner Equity/Capital, and opening-balance offset.
6. For each real Cash/Bank/MFS account, provide its display name, institution/provider, masked business reference, opening balance, and opening date. Confirm whether negative opening balances are allowed.
7. Should account identities be Admin-managed after setup, or Super Admin only? Should an account with history be deactivated rather than deleted? (Deletion of history is not permitted.)

### 3. Posting and recognition rules

8. At Order `Completed`, approve the balanced entry pattern for product revenue, delivery revenue, customer payment/receivable, discounts, and COD/prepaid clearing.
9. Approve the inventory valuation method used for Cost of Sales: moving weighted average, FIFO, or another accountant-approved method. Confirm rounding precision and treatment of cost changes.
10. For accepted purchase receipts, confirm when Supplier Payable and Inventory are recognized: receipt date, supplier invoice date, or another approved matching event. Define treatment when the supplier invoice differs from the PO/receipt.
11. For completed refunds, approve the entry pattern for product revenue reversal, optional delivery-charge reversal, payment/cash reduction or customer payable, and inventory/Cost of Sales effects for sellable versus damaged/quarantined returns.

### 4. Customer and supplier balances

12. Can a customer order be completed with an unpaid balance other than approved COD timing? If yes, define credit authority, limit, due date, and overdue handling; otherwise confirm no customer credit initially.
13. Confirm supplier payable due-date source and overdue rule: PO credit terms, supplier invoice, receipt, or manual Admin entry. Define how disputed amounts affect outstanding and aging reports.
14. Are advances, deposits, overpayments, and unapplied customer/supplier amounts allowed initially? If yes, approve allocation and refund/carry-forward rules.

### 5. Payment reconciliation and transfers

15. Define who reconciles Cash, each MFS wallet, Bank, Card clearing, and COD clearing; required evidence; reconciliation frequency; and mismatch handling.
16. Confirm whether verified manual MFS/Card evidence posts first to a provider clearing account and moves to Bank only when settlement is recorded. Define provider fees and settlement-shortfall treatment.
17. Define COD remittance workflow: courier settlement batch/reference, expected versus received amount, fees/deductions, responsible role, and when COD clearing moves to Cash/Bank.
18. Approve internal transfer rules between Cash/Bank/MFS accounts: initiation role, approval role, mandatory evidence/reference, transfer date, fees, and whether self-approval is prohibited.

### 6. Expenses

19. Approve initial expense categories/accounts and whether expenses may be paid from Cash, Bank, or MFS.
20. Define required expense evidence, beneficiary/payee fields, expense date, approval roles, monetary approval limits, recurring expenses, and correction/cancellation rules.
21. Confirm whether employee advances, owner drawings/contributions, payroll, fixed assets, depreciation, loans, and accrual/prepaid expenses are in Sprint 21 or explicitly deferred.

### 7. Close, locks, corrections, and permissions

22. Is daily closing required, optional reconciliation only, or deferred? Define who performs and approves it.
23. Confirm monthly close workflow, close deadline, required reconciliations, who may lock a period, and whether reopening requires Super Admin plus mandatory reason.
24. Approve role permissions for account setup, journals, payments, reconciliation, expenses, transfers, closing, reopening, and corrections across Super Admin, Admin, and Staff. Confirm whether Staff may create drafts but never approve their own financial operation.
25. Confirm whether all system-generated journals post automatically from approved source events or enter a review queue first. Define which exceptional/manual journals require approval and whether self-approval is prohibited.
26. Approve correction policy: reversal plus replacement entry, mandatory reason/evidence, authorized roles, and whether corrections in locked periods post in the current open period or require controlled reopening.

### 8. Reports, retention, and external boundaries

27. Approve initial financial reports: Trial Balance, General Ledger, Cash/Bank/MFS balances, Profit and Loss, Balance Sheet, Receivables aging, Payables aging, payment reconciliation, expense report, and daily/monthly summaries.
28. Confirm report basis, comparative periods, export format, and who may view/export sensitive financial reports.
29. Confirm financial record retention period and whether any external accounting system, accountant export, bank/MFS import, or statutory/tax report is required initially.

## Future Expansion

Tax automation, landed cost, multi-currency, gateway settlement, bank feeds, payroll, fixed assets, budgeting, consolidation, and industry-specific reporting remain deferred unless explicitly approved. Their future addition must not replace source evidence or couple the core ledger to a retail niche.

## Related Documents

- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Roadmap](13_ROADMAP.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
- [Reporting Architecture](23_REPORTING_ANALYTICS_CONTRACT_ARCHITECTURE.md)
- [Sales Processing](29_SALES_PROCESSING.md)
- [Returns and Refunds](31_RETURNS_REFUNDS_DECISION_PACKET.md)
- [Supplier and Purchase Operations](32_SUPPLIER_PURCHASE_DECISION_PACKET.md)
