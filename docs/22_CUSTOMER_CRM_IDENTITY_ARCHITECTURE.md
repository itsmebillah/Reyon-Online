# Customer and CRM Identity Architecture

## Purpose

This document defines the privacy-minimizing customer identity boundary for REYON Business OS. It separates pseudonymous customer identity and relationship evidence from personal data, authentication, consent, preferences, segmentation, loyalty, marketing, customer service, and analytics behavior.

## Table of Contents

- [Scope](#scope)
- [Architecture](#architecture)
- [Logical data model](#logical-data-model)
- [Evidence and corrections](#evidence-and-corrections)
- [Security and privacy](#security-and-privacy)
- [Domain boundaries](#domain-boundaries)
- [Approved Sprint 15 customer identity](#approved-sprint-15-customer-identity)
- [Pending business decisions](#pending-business-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope

Sprint 10 creates empty, organization-owned pseudonymous customer identities, opaque external identity references, append-only order associations, and append-only customer events. It stores no name, email address, phone number, postal address, date of birth, demographic attribute, credential, consent, preference, segment, loyalty balance, support case, or marketing interaction.

## Architecture

Customer identity is a distinct business concept from authentication identity. A customer may eventually transact as a guest, use multiple channels or authentication providers, or have multiple source-system references without those systems becoming REYON's customer system of record. External references are opaque adapter-owned identifiers and contain no credentials or raw provider payloads.

Order association is modeled separately from the order aggregate so sales remains the authority for the commercial commitment and CRM remains the authority for customer identity. The foundation permits multiple attributable associations without deciding customer roles, guest behavior, householding, business customers, ownership, or merge rules.

## Logical Data Model

| Record            | Responsibility                                                   | Explicit boundary                                                                          |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Customer          | Stable, organization-owned pseudonymous identity                 | Contains no profile, contact, demographic, consent, preference, credential, or status data |
| External identity | Opaque source namespace and reference associated with a customer | Stores no token, password, authentication secret, provider payload, email, or phone number |
| Order association | Append-only evidence relating a customer identity to an order    | Defines no association vocabulary, cardinality, guest rule, ownership, or order behavior   |
| Customer event    | Ordered, attributable, append-only identity evidence             | Defines no lifecycle, merge, erasure, consent, segmentation, or automation effect          |

Migration `20260802110000_customer_crm_identity_foundation.sql` creates these records in a private `crm` schema and inserts no reference, demonstration, or production data.

## Evidence and Corrections

All four record types are append-only. Idempotency keys prevent retried external-identity, order-association, and customer-event commands from silently duplicating evidence. Corrections, merges, splits, unlinking, anonymization, or erasure must eventually use a privacy-approved contract that preserves only legally and operationally permitted evidence.

Organization-safe composite foreign keys prevent a customer from being connected to an order or source identity owned by another organization. Event sequence numbers preserve deterministic customer history without defining a current status.

## Security and Privacy

Every table has row-level security enabled. Anonymous and authenticated roles have no privileges or policies, and the schema is not exposed through the configured Data API. Only trusted server-side adapters may eventually receive narrowly approved access.

This foundation deliberately applies data minimization by storing no directly identifying customer attributes. Before any personal data is added, REYON must approve its purpose, lawful basis or consent requirements, classification, collection source, verification, masking, access, export, retention, correction, deletion, breach response, and data-subject request process. Personal data must not be placed into opaque reference or free-text fields to bypass those controls.

## Domain Boundaries

- CRM owns pseudonymous customer identity and customer relationship evidence.
- Authentication owns credentials, sessions, verification, recovery, and account-security controls.
- A future privacy-controlled profile domain may own approved contact and personal attributes.
- Sales owns orders and commercial line snapshots; CRM owns explicit customer-order associations.
- Fulfillment owns delivery work but no customer address or contact data in the current foundation.
- Payments owns monetary evidence and stores no customer identity or payment instrument.
- Reporting and automation may consume customer facts only through approved, purpose-limited projections.

## Approved Sprint 15 Customer Identity

Guest checkout is allowed and successful checkout/order creation automatically creates or associates an initially unverified customer profile. OTP verification is optional and deferred until a provider is configured; it is not required for order placement in the current release and must never be simulated. An existing verified phone/email match reuses the customer identity under the approved confidence rule.

Three states remain explicit and independent: profile/account existence, OTP/contact verification, and REYON customer verification. Only a genuinely delivered/completed order marks the associated profile as a verified REYON customer. Append-only verification evidence records source `successful-order-delivery`, order reference, and timestamp. Cancelled, failed, returned, rejected, or undelivered orders do not verify customers.

Only data required for account, order, delivery, and support is collected. Private information is protected by existing authentication/authorization boundaries and never exposed publicly. Required privacy notice/consent, recovery, correction, and configurable retention/deletion paths are part of the customer-data contract. The structured address requirements are defined in the Delivery Architecture.

## Pending Business Decisions

### TODO — Product Owner / CRM Owner

- Define customer types, guest behavior, customer-order roles, duplicate handling, merge/split policy, and service ownership.
- Define approved profile attributes, contact verification, communication preferences, consent, suppression, loyalty, segmentation, and customer-service workflows.
- Define customer value, retention, service, and engagement measures without embedding metric assumptions into operational records.

### TODO — Privacy / Security / Architecture

- Confirm applicable privacy obligations, lawful bases, consent evidence, age restrictions, retention, deletion, export, correction, and breach response.
- Approve authentication separation, identity-provider contracts, account linking, takeover protection, recovery, and privileged support access.
- Define field-level classification, encryption, masking, audit, environment controls, data-subject request workflows, and privacy-safe analytics projections.

## Future Expansion

Add approved profile/contact vaults, verified contact points, consent and suppression ledgers, authentication links, duplicate resolution, merge/split evidence, household or organization relationships, addresses, service cases, preferences, loyalty, segmentation, interaction history, privacy-request workflows, and purpose-limited reporting projections. Each expansion requires explicit business and privacy approval before implementation.

## Related Documents

- [Business Overview](01_BUSINESS_OVERVIEW.md)
- [Business Rules](02_BUSINESS_RULES.md)
- [User Roles](03_USER_ROLES.md)
- [Order Lifecycle](04_ORDER_LIFECYCLE.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
- [Fulfillment and Delivery Architecture](20_FULFILLMENT_DELIVERY_ARCHITECTURE.md)
- [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md)
