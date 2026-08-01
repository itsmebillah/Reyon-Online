# Operating Topology Architecture

## Purpose

This document defines the organization, location, and channel foundation required to assign ownership consistently across catalog, inventory, orders, purchasing, finance, reporting, and future integrations. It creates structural capacity without assuming REYON's legal entity, warehouse, store, office, or channel topology.

## Table of Contents

- [Scope](#scope)
- [Architecture](#architecture)
- [Logical data model](#logical-data-model)
- [Identity and ownership](#identity-and-ownership)
- [Persistence and security](#persistence-and-security)
- [Domain boundaries](#domain-boundaries)
- [Pending business decisions](#pending-business-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope

Sprint 3 establishes stable identities for organizations, locations, and sales or service channels, plus an explicit location-to-channel association. It does not create business records, location classifications, channel classifications, addresses, stock ownership, fulfillment routing, tax registrations, accounting entities, or access policies.

## Architecture

The operating topology is a shared reference domain, not a generic configuration bucket. Downstream modules reference stable identifiers or explicit contracts and retain ownership of their own facts. A location does not own inventory balances merely because it exists, and a channel association does not imply fulfillment eligibility or stock sharing.

## Logical Data Model

| Record           | Responsibility                                        | Key relationships             |
| ---------------- | ----------------------------------------------------- | ----------------------------- |
| Organization     | Stable operating or legal ownership boundary          | Owns locations and channels   |
| Location         | Stable physical or virtual operating place            | Belongs to one organization   |
| Channel          | Stable customer, sales, or service channel identity   | Belongs to one organization   |
| Location channel | Structural association between a location and channel | Defines no operational policy |

UUIDs are permanent internal identifiers. Codes are unique within their ownership scope and may support integrations or human recognition, but code formats and assignment processes remain governed decisions. Display names are mutable and must never be used as foreign keys.

## Identity and Ownership

The working brand REYON and working business name Reyon Online do not establish a legal entity record. No organization row is seeded until the Product Owner confirms the accountable business identity. Locations and channels cannot exist without an owning organization, preventing orphaned operational references.

## Persistence and Security

Migration `20260802040000_operating_topology_foundation.sql` creates the private `organization` schema. Every table has row-level security enabled; anonymous and authenticated roles receive no schema or table privileges, and no policies exist. The schema is not included in the configured Data API exposure list.

Only the trusted server-side service role can access the empty foundation. Service-role credentials must never be exposed to browsers. Future workforce access requires approved identities, permissions, scopes, and audit requirements.

## Domain Boundaries

- Catalog owns product and channel-offer facts, while topology owns channel identity.
- Inventory will own quantities, movements, reservations, and conditions; topology only identifies locations.
- Orders will own order-channel attribution and fulfillment decisions.
- Purchasing will own supplier and receiving workflows.
- Accounting will own legal posting entities, ledgers, and financial treatment.
- CRM will own customer identity and consent, not channel identity.

## Pending Business Decisions

### TODO — Product Owner / Operations Owner

- Confirm the legal or operating organization name and accountable owner.
- Identify actual warehouses, stores, offices, virtual locations, and service areas.
- Identify current ecommerce, social, marketplace, POS, and assisted-sales channels.
- Define location and channel codes, classifications, ownership, and lifecycle rules.
- Define which locations can serve which channels and under what conditions.

### TODO — Architecture / Security

- Define scoped workforce permissions and system identities.
- Define address, contact, timezone, locale, currency, tax-registration, and integration-reference models when required.
- Define topology audit history, merge/deactivation controls, and downstream compatibility rules.

## Future Expansion

Add approved organization records, hierarchical locations, service regions, facilities and sublocations, channel configuration, external identifiers, calendars, addresses, contacts, lifecycle history, and scoped access. Expansion must preserve stable identities and avoid embedding inventory, order, tax, or accounting policy inside topology records.

## Related Documents

- [Business Overview](01_BUSINESS_OVERVIEW.md)
- [User Roles](03_USER_ROLES.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
- [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)
