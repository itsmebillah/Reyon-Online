# Accounting Rules

## Purpose

This document provides the governance structure for financial definitions, events, controls, and reporting. It is not accounting advice and records no accounting treatment until approved by qualified REYON finance owners and, where necessary, professional advisers.

## Table of Contents

- [Authority and principles](#authority-and-principles)
- [Accounting scope](#accounting-scope)
- [Financial event specification](#financial-event-specification)
- [Implemented persistence foundation](#implemented-persistence-foundation)
- [Ledger and dimensions](#ledger-and-dimensions)
- [Recognition and valuation](#recognition-and-valuation)
- [Tax, currency, and payments](#tax-currency-and-payments)
- [Reconciliation and close](#reconciliation-and-close)
- [Controls and auditability](#controls-and-auditability)
- [Pending decisions](#pending-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Authority and Principles

Financial rules require named finance approval, jurisdictional context, effective dates, and source evidence. Operational modules emit business facts; approved accounting policy determines their financial interpretation. Posted history should be corrected through controlled entries rather than silent mutation.

## Accounting Scope

Potential scope includes sales, discounts, tax, tender, refunds, customer balances, inventory value, cost of sales, purchasing, supplier liabilities, expenses, cash/bank activity, journals, period close, and financial reporting. Inclusion and system-of-record boundaries are pending.

## Financial Event Specification

| Field                 | Required definition                           |
| --------------------- | --------------------------------------------- |
| Event                 | Approved business occurrence                  |
| Recognition point     | Conditions and business date                  |
| Source                | Authoritative record and identifier           |
| Accounts / dimensions | Approved classification                       |
| Amount basis          | Currency, tax, rounding, and valuation inputs |
| Entry pattern         | Debit/credit treatment approved by Finance    |
| Reversal / correction | Controlled remediation                        |
| Reconciliation        | Evidence tying source to ledger               |

### TODO — Finance Owner

- Define event-to-entry rules and provide worked, approved examples.
- Identify which events are commitments, operational facts, subledger records, or general-ledger postings.

## Implemented Persistence Foundation

Sprint 9 establishes an empty private `accounting` schema for organization-scoped account identities and append-only, source-linked journal evidence. It does not establish a chart of accounts, approve any event-to-entry mapping, or authorize any operational module to create financial entries. Row-level security is enabled, browser-facing roles receive no policies or privileges, and no financial records are inserted.

| Record            | Owned structure                                                                                                         | Explicit exclusions                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ledger_accounts` | Organization-scoped account identity, optional hierarchy, and optional external-source identity                         | Account codes/records, classifications, normal balance, effective dates, currencies, consolidation, and governance |
| `journal_entries` | Organization, currency, source identity, idempotency, occurrence/recording time, actor, and optional reversal reference | Posting status, numbering, period assignment, approval, recognition, tax, valuation, and source mappings           |
| `journal_lines`   | Account-linked exact signed amount and line order within the same organization                                          | Sign convention, debit/credit presentation, dimensions, allocation, rounding, balancing workflow, and reports      |

Journal entries and lines cannot be updated or deleted; corrections require new attributable entries. Account identities may be maintained only through a future controlled service. The schema structurally prevents cross-organization account, journal, hierarchy, and reversal references.

Balance enforcement is intentionally not exposed as an ad hoc table-write rule because journal headers and lines are stored separately. A future Finance-approved posting transaction must validate completeness, balanced amounts, authorized accounts, currency, period, mappings, and permissions atomically before it may write journal evidence. Until that contract exists, only the service role has storage access and no application workflow may post.

## Ledger and Dimensions

Chart of accounts, fiscal periods, legal entities, cost centers, locations, channels, projects, and other reporting dimensions are unconfirmed. Dimensions should be governed centrally and effective-dated where change affects history.

## Recognition and Valuation

No revenue recognition, inventory valuation, cost allocation, discount allocation, rounding, bad debt, depreciation, or accrual policy is assumed.

The approved operational completed-sale event is Order `Completed`; Delivered alone is not a completed sale. Product sales and delivery charges remain separate operational measures while Grand Total includes both. This creates source evidence only and does not define debit/credit mappings, statutory recognition, inventory costing, tax, or general-ledger posting.

### TODO — Finance Owner

- Approve applicable accounting framework and every required treatment.
- Define inventory costing method and treatment of landed cost, shrinkage, damage, samples, and returns.

## Tax, Currency, and Payments

Jurisdictions, registrations, tax calculations, invoice requirements, functional/presentation currencies, exchange-rate sources, tender types, settlement, fees, and chargebacks require confirmation.

The private payment-evidence foundation records exact monetary facts and explicit order allocations without assigning debit, credit, revenue, receivable, cash, fee, tax, or settlement treatment. Finance-approved mappings must consume payment evidence through controlled contracts and must never rewrite it.

The private purchase foundation records ordered quantities and unit-cost snapshots without creating supplier liabilities, inventory value, tax, landed cost, accruals, payments, or ledger postings. Those snapshots are operational source evidence only; finance-approved mappings, invoice evidence, receiving evidence, and reconciliation rules are required before any accounting effect exists.

Sprint 20 records provider-neutral supplier payment evidence and operational payable status without creating accounting entries. Eligible supplier payable is derived from accepted purchase receipts, PO commercial terms, and completed physical purchase returns. Accounting recognition, ledger posting, reconciliation, and correction treatment remain Sprint 21 responsibilities.

## Reconciliation and Close

Each financial balance should reconcile to controlled source records. Close procedures must define cutoff, dependencies, responsible roles, review evidence, adjustments, locking, and reopening authority.

## Controls and Auditability

The future system must support balanced entries, immutable posting evidence, authorization, segregation, sequence integrity where required, period controls, supporting references, and complete export for audit. Retention terms are pending.

## Pending Decisions

### TODO — Product Owner / Finance Owner

- Identify legal entities, jurisdictions, registrations, reporting framework, fiscal calendar, and external advisers.
- Supply chart of accounts and dimension governance.
- Define posting granularity, close cadence, approval thresholds, reconciliation ownership, and statutory reports.
- Confirm integration with any external accounting, payment, banking, or tax system.

## Future Expansion

Add an approved accounting policy register, chart of accounts, posting matrix, close calendar, reconciliation catalog, tax specification, financial-control matrix, and audit/export requirements.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Purchase System](06_PURCHASE_SYSTEM.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
