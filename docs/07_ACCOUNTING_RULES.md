# Accounting Rules

## Purpose

This document provides the governance structure for financial definitions, events, controls, and reporting. It is not accounting advice and records no accounting treatment until approved by qualified REYON finance owners and, where necessary, professional advisers.

## Table of Contents

- [Authority and principles](#authority-and-principles)
- [Accounting scope](#accounting-scope)
- [Financial event specification](#financial-event-specification)
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

## Ledger and Dimensions

Chart of accounts, fiscal periods, legal entities, cost centers, locations, channels, projects, and other reporting dimensions are unconfirmed. Dimensions should be governed centrally and effective-dated where change affects history.

## Recognition and Valuation

No revenue recognition, inventory valuation, cost allocation, discount allocation, rounding, bad debt, depreciation, or accrual policy is assumed.

### TODO — Finance Owner

- Approve applicable accounting framework and every required treatment.
- Define inventory costing method and treatment of landed cost, shrinkage, damage, samples, and returns.

## Tax, Currency, and Payments

Jurisdictions, registrations, tax calculations, invoice requirements, functional/presentation currencies, exchange-rate sources, tender types, settlement, fees, and chargebacks require confirmation.

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
