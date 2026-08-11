# Payment Evidence Architecture

## Purpose

This document defines a provider-neutral payment evidence boundary for REYON Business OS. It separates monetary events and order allocation from payment-provider behavior, customer payment instruments, order lifecycle, settlement, fraud controls, and accounting interpretation.

## Table of Contents

- [Scope](#scope)
- [Architecture](#architecture)
- [Logical data model](#logical-data-model)
- [Evidence and corrections](#evidence-and-corrections)
- [Security and sensitive data](#security-and-sensitive-data)
- [Domain boundaries](#domain-boundaries)
- [Approved Sprint 15 payment presentation](#approved-sprint-15-payment-presentation)
- [Pending business decisions](#pending-business-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope

Sprint 7 creates empty, append-only records for payment evidence, allocations to orders, provider-neutral events, and opaque provider references. It does not define payment kinds, methods, gateways, lifecycle states, authorization, capture, settlement, refunds, chargebacks, fees, fraud review, reconciliation, exchange rates, customer balances, or accounting entries.

## Architecture

Payment evidence records what occurred without deciding its order, customer, or accounting effect. An allocation explicitly associates part of a payment amount with an order; no rule currently requires full allocation, prevents over-allocation, or permits one payment to cover multiple orders. Those invariants require approved commercial and finance policy.

Provider integrations must be replaceable adapters. External identifiers and events may be recorded, but provider payloads, secrets, tokens, card data, mobile-wallet credentials, and bank credentials are outside this domain.

## Logical Data Model

| Record             | Responsibility                                                                  | Explicit boundary                                                          |
| ------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Payment record     | Organization-owned exact monetary evidence with source and idempotency identity | Defines no method, provider, state, or accounting effect                   |
| Order allocation   | Exact amount associated with an order                                           | Defines no allocation limit, currency rule, refund, or settlement behavior |
| Payment event      | Ordered provider-neutral lifecycle evidence                                     | Defines no event vocabulary, state machine, or side effect                 |
| Provider reference | Opaque external identifier                                                      | Stores no credential, instrument, or raw payload                           |

Migration `20260802080000_payment_evidence_foundation.sql` creates these records in a private `payments` schema. No reference or transactional data is inserted.

## Evidence and Corrections

All four record types are append-only. Source and event idempotency keys prevent duplicate commands from silently creating duplicate evidence. Corrections, reversals, refunds, and chargebacks must eventually be represented by approved new evidence rather than mutation or deletion.

Amounts use exact numeric storage and explicit ISO-style currency codes. A positive amount has no debit, credit, receipt, or refund meaning until paired with an approved payment-kind vocabulary and finance interpretation.

## Security and Sensitive Data

Every table has row-level security enabled. Anonymous and authenticated roles have no privileges or policies, and the schema is not exposed through the configured Data API. Only trusted server-side adapters may eventually use the service role.

The foundation stores no customer identity, cardholder data, account number, payment token, CVV, PIN, credential, provider secret, or raw webhook body. Applicable PCI, banking, privacy, retention, masking, and breach obligations require specialist review before any payment integration.

## Domain Boundaries

- Sales owns order commitment and commercial totals.
- Payments owns provider-neutral monetary evidence and explicit order allocations.
- Accounting interprets approved payment events into postings; payments never writes ledger entries directly.
- Customer/CRM will own customer identity and consent.
- Provider adapters own protocol translation, signature verification, retries, and reconciliation transport.
- Order state cannot infer payment success from an unapproved provider event.

## Approved Sprint 15 Payment Presentation

Checkout displays bKash, Nagad, Rocket, Card, and Cash on Delivery (COD). Initial processing is manual. Admin configures mobile-payment instructions/number, the customer supplies transaction/reference evidence, and an administrator verifies it before payment becomes verified.

Card remains represented in the architecture and UI, but automatic gateway processing is deferred and the system must never report Card success without a real gateway. COD is initially supported and its future eligibility restrictions remain configurable. Provider-neutral evidence preserves the later gateway expansion path.

The checkout payment journey separates method selection from confirmation/evidence. Every currently selectable method enables an explicit Continue action. Mobile methods require transaction/reference evidence before persistence; Card may proceed only as a manual pending-follow-up selection and never collects cardholder data or records gateway success; COD remains payable on delivery. Persisted selections remain unverified until the approved manual verification or collection event occurs.

## Pending Business Decisions

### TODO — Product Owner / Finance Owner

- Define supported payment methods, providers, currencies, timing, states, and customer experience.
- Define authorization, capture, partial payment, overpayment, refund, chargeback, fee, settlement, and failure policies.
- Define allocation rules, currency matching, rounding, cash handling, proof, approvals, and reconciliation ownership.
- Define fraud review, manual override, exception handling, customer communication, and reporting.

### TODO — Architecture / Security / Compliance

- Determine compliance scope and prohibited data for each payment method and provider.
- Define provider credentials, webhook signature verification, replay defense, tokenization, rotation, audit, and incident response.
- Define reconciliation contracts and approved event-to-accounting mapping with Finance.

## Future Expansion

Add approved payment commands, provider adapters, checkout sessions, cash evidence, settlement batches, reconciliation, disputes, refunds, chargebacks, exception queues, operational dashboards, and accounting-event projections. Sensitive payment instruments should remain with compliant providers whenever possible.

## Related Documents

- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
- [Fulfillment and Delivery Architecture](20_FULFILLMENT_DELIVERY_ARCHITECTURE.md)
