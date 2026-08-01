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

Sprint 2 established the typed customer read model and private catalog persistence foundation. Sprint 14 extends that design with the approved product identity, variant, pricing, authenticity, origin, image, category, lifecycle, and visibility rules. Inventory remains stock authority; Purchasing remains supplier-terms authority; Accounting remains financial-posting authority; content governance remains publication-artifact authority.

## Architecture

Customer routes depend on the catalog repository contract rather than a storage vendor. The current in-memory adapter contains visibly isolated demonstration records. A future Supabase adapter can replace it without changing route or component contracts.

Dependency direction is `customer experience -> catalog contract <- catalog adapter`. Inventory, orders, purchasing, SEO content, and external channels will consume governed projections rather than mutate catalog records directly.

## Core Concepts

- **Brand:** third-party product-brand identity, separate from REYON's retailer identity.
- **Category:** governed discovery classification with a stable identifier, slug, label, and display order.
- **Product:** stable catalog identity and customer-facing name.
- **Variant:** sellable presentation identity with one approved variant type, unique SKU, optional barcode, price facts, and inventory stock identity.
- **Offer:** channel-facing money and availability projection, not accounting or inventory truth.
- **Content and media:** approved customer-facing summary and asset references, separate from AI suggestions.

## Logical Data Model

| Record             | Responsibility                                                                     | Key relationships                                             |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Brand              | Third-party product-brand identity                                                 | Owns products                                                 |
| Category           | Hierarchical discovery classification                                              | Relates to products through explicit assignments              |
| Product            | Stable catalog identity                                                            | Belongs to a brand and owns variants and media                |
| Variant            | Sellable presentation identity                                                     | Belongs to a product and owns channel offers                  |
| Product category   | Product-to-category assignment                                                     | Can identify one primary category per product                 |
| Product media      | Governed storage reference and accessibility text                                  | Belongs to a product; can identify one primary asset          |
| Offer              | Channel-scoped monetary presentation                                               | Belongs to a variant; does not own stock or accounting truth  |
| Product lifecycle  | Current approved status and append-only transition evidence                        | Controls customer visibility without granting actor authority |
| Authenticity facts | Evidence-ready authenticity, import, supplier, distributor, and country references | Does not convert unsupported claims into approved content     |

Stable UUIDs are distinct from mutable slugs, SKUs, and display labels. Money uses exact numeric storage with an explicit ISO currency code. Foreign keys restrict implicit deletion so future workflows must make destructive consequences explicit.

An optional Product Code is distinct from the immutable UUID; the UUID is the business reference when the code is absent. No Product Code uniqueness policy is inferred. Every product has exactly one brand, one primary category, and at least one ordered image. Approved lifecycle vocabulary is Draft, Review, Approved, Published, Hidden, and Archived; only Published is eligible for customer projections and publication additionally requires at least one valid variant.

## Current Implementation

The feature is owned under `src/features/catalog`. Domain types contain no framework or persistence dependency. `CatalogRepository` defines supported reads. The in-memory adapter provides deterministic development data and query behavior. Shop filters use shareable URL parameters and remain usable without client-side JavaScript.

Migration `20260802030000_catalog_foundation.sql` establishes the private `catalog` schema in the linked Supabase project. Migration `20260802150000_catalog_administration_rules.sql` adds the approved Product Code fallback, lifecycle vocabulary and transition command, country reference, variant types and SKU provenance, ordered-media controls, authenticity/sourcing facts, four variant price types, immutable identity guards, append-only status evidence, business-reference and primary-image projections, and the six approved category records. Migration `20260802151000_catalog_rule_alignment.sql` removes an unapproved Product Code uniqueness assumption while preserving immutable internal identity and globally unique SKU.

The typed administration contract lives in `src/features/catalog/domain/catalog-administration.ts`. It validates exact money and country references, SKU/barcode collisions within an aggregate, publication prerequisites, lifecycle transitions, customer visibility, business-reference fallback, and primary-image ordering without depending on React or Supabase. Focused domain tests execute locally and in CI.

No brand, product, variant, price, supplier, provenance, status-event, inventory, user, or customer record was inserted. The only reference rows are the six Product Owner-approved top-level categories.

## Persistence and Security

The `catalog` schema is not exposed through the configured Data API schemas. Anonymous and authenticated roles have no schema or table privileges. Row-level security is enabled on every table, with no access policies until roles and workflows are approved. The service role is reserved for trusted server-side adapters and must never be shipped to a browser.

Migration history is append-only and shared between the repository and linked project. Catalog migrations were dry-run before application, then verified through remote migration history, database lint, and table inspection. New administration records remain private and deny-by-default; no anonymous or authenticated policy was added.

## Controls and Boundaries

- REYON must never be assigned as manufacturer or third-party product brand by default.
- Demonstration data must remain distinguishable from approved assortment.
- Money includes an explicit currency; pricing rules are not inferred.
- Availability text in the current adapter is presentation data, not inventory authority.
- Product facts and approved content must not be overwritten by future AI suggestions.
- Sprint 13 content artifacts reference catalog subject/version evidence without copying ownership of product facts; catalog corrections never silently regenerate, approve, or publish content.
- Slugs are lookup keys, not permanent entity identifiers.

## Approved Sprint 14 Decisions

The Product Owner supplied the core catalog decisions in [Product Catalog Administration — Sprint 14 Decisions](25_PRODUCT_CATALOG_ADMIN_DISCOVERY.md). Additive schema and contract changes may implement those rules without redesigning the established boundaries.

## Pending Business Decisions

### TODO — Product Owner / Catalog Owner / Security

- Approve initial brands and product records, operating currency, actor permissions, review segregation, exception transitions, naming, duplicate/correction behavior, and detailed media controls.
- Approve authentication and production administration access before any user-facing write workflow is enabled.
- Define secondary categories, merchandising collections, promotions, scheduled pricing, and channel variation separately.

### TODO — Architecture

- Define authorization policies after actor responsibilities are approved.
- Define import, fuzzy duplicate detection, media storage, and search-index strategy after their dependent requirements are approved.

## Future Expansion

After the feature-specific access and operational decisions are approved, add an authenticated server-only repository adapter, administration workflows, media storage, conflict-safe correction, localized content projections, faceted search, product relationships, inventory availability projections, audit browsing, and catalog feeds. Adapters for Google Merchant Center, Meta, TikTok, Pinterest, and marketplaces must consume versioned channel projections.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
- [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md)
- [Brand and Business Configuration](17_BRAND_BUSINESS_CONFIGURATION.md)
- [Sprint 14 Product Catalog Administration Decision Packet](25_PRODUCT_CATALOG_ADMIN_DISCOVERY.md)
