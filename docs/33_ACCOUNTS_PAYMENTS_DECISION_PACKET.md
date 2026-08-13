# Sprint 21 — Accounts and Payments

## Purpose

This document records the authoritative Sprint 21 Product Owner decisions and execution boundary. Sprints 14–20 remain unchanged.

## Table of Contents

- [Approved accounting policy](#approved-accounting-policy)
- [Posting and valuation](#posting-and-valuation)
- [Payments and balances](#payments-and-balances)
- [Controls and reporting](#controls-and-reporting)
- [Implementation sequence](#implementation-sequence)
- [Required production configuration](#required-production-configuration)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Approved Accounting Policy

- Accounting basis is **Accrual**; timezone is **Asia/Dhaka**.
- Legal-entity identity and fiscal-year boundaries are configurable. Monthly periods are required.
- Controlled financial actions require an authorized Finance approver.
- Initial account groups support Assets (Cash, Bank, MFS, Card/Clearing, Accounts Receivable, Inventory), Liabilities (Accounts Payable, Customer Refund Payable, Other Current Liabilities), Equity (Owner/Business Equity, Retained Earnings), Revenue (Product Sales, Delivery Revenue), Contra Revenue (Sales Discounts, Sales Returns/Refunds), COGS (Cost of Sales), and Expenses (Delivery Expense, Payment/MFS Fees, configurable operating expenses).
- The core Commerce and Accounting engine remains industry agnostic. Niche data belongs only to configurable Catalog and Presentation domains.

## Posting and Valuation

- Order `Completed` remains the sale-recognition event. Product revenue, delivery revenue, and discounts remain separately traceable.
- System journals are generated automatically for approved Sales, COGS, Inventory, Refund, and Supplier Payable events and are immutable.
- Weighted Average Cost is the initial valuation method. Accepted purchase receipts update inventory cost; historical completed-sale cost is never silently rewritten.
- Supplier Payable is recognized on accepted receipt, never on PO creation/approval. Supplier payments reduce payable; mismatches are auditable exceptions.
- Completed refunds append accounting adjustments. Sellable returns reverse the applicable Inventory/COGS effect; refund settlement uses its actual source or Customer Refund Payable. Sprint 19 proportional rules remain authoritative.
- Exceptional manual journals must be balanced, evidence-backed, and authorized. Corrections use reversal/replacement entries.

## Payments and Balances

- Cash, Bank, MFS, Card/Clearing, and COD remain separately identifiable.
- Settlement and reconciliation are separate from Order status. Manual evidence remains append-only and provider-neutral.
- Customer credit is unavailable initially; Accounts Receivable remains future-ready.
- Supplier advances, deposits, overpayments, and unapplied balances are supported.
- Reconciliation is initially manual and supported daily. Differences, fees, and settlement variances remain separate auditable facts.
- Internal transfers record source, destination, amount, date, reference, and evidence; self-approval is prohibited.
- Expenses require configurable category, payment source, amount, payee, evidence, and authorized approval. Recurring automation is deferred.

## Controls and Reporting

- Super Admin has full accounting authority; Admin has approved operational authority; Staff is limited to permitted data entry and cannot approve its own financial transaction.
- Monthly periods are lockable. Reopening requires Super Admin/authorized Finance approval; required reconciliations precede close.
- Sensitive corrections record actor, timestamp, reason, affected evidence, and authorization.
- Initial reporting supports Trial Balance, General Ledger, Profit & Loss, Balance Sheet, Cash/Bank/MFS position, Accounts Payable, Sales, COGS, Gross Profit, Refunds, Expenses, Supplier Payments, Reconciliation, and Journal history.

## Implementation Sequence

1. **Accounting configuration foundation:** legal/fiscal profile, monthly periods, Finance approver assignment, governed chart and real financial accounts.
2. **Balanced posting engine:** immutable idempotent journals, period enforcement, reversal/replacement boundary.
3. **Commerce posting projections:** Completed Sales, weighted-average COGS, accepted Purchase receipts/Supplier Payable, Refund adjustments.
4. **Settlement operations:** customer/manual payments, COD, supplier payments, advances/unapplied amounts, fees and exceptions.
5. **Cash operations:** financial accounts, transfers, expenses, evidence, segregation of duties.
6. **Reconciliation and close:** daily reconciliation, monthly lock/reopen, controlled corrections.
7. **Financial reports:** approved statements, balances, operational-financial reconciliation, and audit history.

## Required Production Configuration

Implementation must not invent the following production records:

- Legal entity name/type and fiscal-year start date.
- Named authorized Finance approver membership.
- Real Cash, Bank, MFS, Card/COD clearing account identities and masked references.
- Opening balances, effective dates, and evidence.

The foundation may be deployed before these values exist, but financial posting remains disabled until required configuration is complete.

## Future Expansion

Payroll, fixed assets/depreciation, loans, complex accruals, prepayment accounting, automated bank/MFS integrations, landed cost, multi-currency, and recurring-expense automation are deferred. The schema remains extensible without niche coupling.

## Related Documents

- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Roadmap](13_ROADMAP.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
- [Reporting Architecture](23_REPORTING_ANALYTICS_CONTRACT_ARCHITECTURE.md)
- [Sales Processing](29_SALES_PROCESSING.md)
- [Returns and Refunds](31_RETURNS_REFUNDS_DECISION_PACKET.md)
- [Supplier and Purchase Operations](32_SUPPLIER_PURCHASE_DECISION_PACKET.md)
