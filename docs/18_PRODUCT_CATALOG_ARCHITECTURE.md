# Product Catalog Architecture

## Purpose

This document defines the implementation boundary for REYON's reusable product catalog foundation. It separates product identity and discovery from inventory, purchasing, orders, AI-generated content, and channel publication so those capabilities can evolve without redesigning the customer website.

## Table of Contents

- [Scope](#scope)
- [Architecture](#architecture)
- [Core concepts](#core-concepts)
- [Logical data model](#logical-data-model)
- [Current implementation](#current-implementation)
- [Persistence and security](#persistence-and-security)
- [Controls and boundaries](#controls-and-boundaries)
- [Pending business decisions](#pending-business-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope

Sprint 2 establishes a typed catalog read model, stable repository contract, isolated data adapter, customer filtering and sorting, and reusable product lookup. It does not establish product approval, publishing, pricing policy, stock truth, promotions, supplier ownership, or AI behavior.

## Architecture

Customer routes depend on the catalog repository contract rather than a storage vendor. The current in-memory adapter contains visibly isolated demonstration records. A future Supabase adapter can replace it without changing route or component contracts.

Dependency direction is `customer experience -> catalog contract <- catalog adapter`. Inventory, orders, purchasing, SEO content, and external channels will consume governed projections rather than mutate catalog records directly.

## Core Concepts

- **Brand:** third-party product-brand identity, separate from REYON's retailer identity.
- **Category:** governed discovery classification with a stable identifier, slug, label, and display order.
- **Product:** stable catalog identity and customer-facing name.
- **Variant:** sellable presentation identity and SKU; variant policy remains pending.
- **Offer:** channel-facing money and availability projection, not accounting or inventory truth.
- **Content and media:** approved customer-facing summary and asset references, separate from AI suggestions.

## Logical Data Model

| Record           | Responsibility                                    | Key relationships                                            |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| Brand            | Third-party product-brand identity                | Owns products                                                |
| Category         | Hierarchical discovery classification             | Relates to products through explicit assignments             |
| Product          | Stable catalog identity                           | Belongs to a brand and owns variants and media               |
| Variant          | Sellable presentation identity                    | Belongs to a product and owns channel offers                 |
| Product category | Product-to-category assignment                    | Can identify one primary category per product                |
| Product media    | Governed storage reference and accessibility text | Belongs to a product; can identify one primary asset         |
| Offer            | Channel-scoped monetary presentation              | Belongs to a variant; does not own stock or accounting truth |

Stable UUIDs are distinct from mutable slugs, SKUs, and display labels. Money uses exact numeric storage with an explicit ISO currency code. Foreign keys restrict implicit deletion so future workflows must make destructive consequences explicit.

## Current Implementation

The feature is owned under `src/features/catalog`. Domain types contain no framework or persistence dependency. `CatalogRepository` defines supported reads. The in-memory adapter provides deterministic development data and query behavior. Shop filters use shareable URL parameters and remain usable without client-side JavaScript.

Migration `20260802030000_catalog_foundation.sql` establishes the private `catalog` schema in the linked Supabase project. It creates seven empty tables, supporting constraints and indexes, update timestamps, and the service-role boundary. No demonstration or production assortment was inserted.

## Persistence and Security

The `catalog` schema is not exposed through the configured Data API schemas. Anonymous and authenticated roles have no schema or table privileges. Row-level security is enabled on every table, with no access policies until roles and workflows are approved. The service role is reserved for trusted server-side adapters and must never be shipped to a browser.

Migration history is append-only and shared between the repository and linked project. The migration was dry-run before application, then verified through remote migration history, database lint, and table inspection.

## Controls and Boundaries

- REYON must never be assigned as manufacturer or third-party product brand by default.
- Demonstration data must remain distinguishable from approved assortment.
- Money includes an explicit currency; pricing rules are not inferred.
- Availability text in the current adapter is presentation data, not inventory authority.
- Product facts and approved content must not be overwritten by future AI suggestions.
- Slugs are lookup keys, not permanent entity identifiers.

## Pending Business Decisions

### TODO — Product Owner / Catalog Owner

- Approve the initial brands, products, variants, media, claims, and category assignments.
- Define product and variant naming, SKU/barcode, lifecycle, approval, and publication policies.
- Define pricing ownership, tax display, promotions, compare-at pricing, and channel variation.
- Define category hierarchy, filters, collections, brand visibility, and merchandising order.

### TODO — Architecture

- Define authorization policies, audit, and publication contracts after the pending roles and workflows are approved.
- Define import, validation, duplicate detection, media storage, and search-index strategy.

## Future Expansion

Add a server-only Supabase repository adapter, administration workflows, localized content projections, faceted search, product relationships, inventory availability projections, audit history, and catalog feeds after their rules are approved. Adapters for Google Merchant Center, Meta, TikTok, Pinterest, and marketplaces must consume versioned channel projections.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
- [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md)
- [Brand and Business Configuration](17_BRAND_BUSINESS_CONFIGURATION.md)
