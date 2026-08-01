# Changelog

## Purpose

This document records meaningful changes to the documentation foundation and, later, approved product and architecture baselines. It complements version-control history with human-readable impact and decision context.

## Table of Contents

- [Policy](#policy)
- [Entry format](#entry-format)
- [Change categories](#change-categories)
- [Unreleased](#unreleased)
- [Documentation foundation](#documentation-foundation)
- [Pending governance](#pending-governance)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Policy

Record changes that affect product scope, approved rules, roles, lifecycles, data ownership, architecture, interfaces, technology, engineering standards, repository structure, roadmap commitments, or operational expectations. Typographical changes may be grouped when they do not alter meaning.

Entries must state what changed and, where material, why, who approved it, its effective date, migration or compatibility impact, and links to decisions. A changelog entry does not itself approve a business rule.

## Entry Format

```markdown
## [Version or date] - YYYY-MM-DD

### Added | Changed | Deprecated | Removed | Fixed | Security

- Summary of the change and affected scope.
  - Approval/owner: role or decision reference
  - Impact: users, data, processes, integrations, migration, or none
  - Related: document, rule, roadmap item, or architecture decision
```

## Change Categories

Use **Added** for new capability or documentation, **Changed** for altered behavior or meaning, **Deprecated** for planned retirement, **Removed** for completed retirement, **Fixed** for corrections, and **Security** for safely disclosed security-related changes.

## Unreleased

### Added

- Added and deployed an empty inventory ledger schema for stock items, optional lots, attributable movement headers, and signed location-level quantity lines, with append-only history, idempotency, RLS, and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02
  - Impact: linked Supabase schema and migration history; no stock, movement vocabulary, balance formula, reservation, valuation, or inventory data inserted
  - Related: [Inventory System](05_INVENTORY_SYSTEM.md), [Database Architecture](08_DATABASE_ARCHITECTURE.md)

- Added and deployed an empty operating-topology schema for organization, location, channel, and structural location-channel identities, with restrictive ownership, RLS, and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02
  - Impact: linked Supabase schema and migration history; no organization, location, channel, fulfillment, or inventory data inserted
  - Related: [Operating Topology Architecture](19_OPERATING_TOPOLOGY_ARCHITECTURE.md), [Database Architecture](08_DATABASE_ARCHITECTURE.md)

- Added and deployed the first Supabase migration: an empty private catalog schema for brands, categories, products, variants, category assignments, media, and channel offers, with exact money fields, restrictive relationships, RLS, and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02
  - Impact: linked Supabase schema and migration history; no customer/admin access and no product data inserted
  - Related: [Database Architecture](08_DATABASE_ARCHITECTURE.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

- Added Sprint 2's product catalog foundation with explicit domain types, a storage-independent repository contract, isolated demonstration data, and URL-addressable category and sorting behavior.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02
  - Impact: catalog architecture and customer discovery; no persistent product, pricing, inventory, publishing, or AI behavior
  - Related: [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md), [Roadmap](13_ROADMAP.md)

- Added a reusable, accessible back-navigation control to every customer-facing page except the homepage, with browser-history behavior and a homepage fallback for direct-entry visits.
  - Approval/owner: Product Owner navigation directive dated 2026-08-01
  - Impact: global customer navigation and browser acceptance coverage
  - Related: [UI Guidelines](09_UI_GUIDELINES.md)

- Added an original REYON homepage hero photograph based on the Product Owner's approved composition reference: warm neutral studio lighting, left-side copy space, and a trademark-free multi-category beauty assortment on the right.
  - Approval/owner: Product Owner homepage-template directive dated 2026-08-01
  - Impact: homepage visual presentation and responsive hero cropping; no product or authenticity claims
  - Related: [UI Guidelines](09_UI_GUIDELINES.md), [Brand and Business Configuration](17_BRAND_BUSINESS_CONFIGURATION.md)

- Added the Product Owner-supplied circular REYON Beauty & Care logo as the primary website brand mark and applied it consistently to the header and footer.
  - Approval/owner: Product Owner logo directive dated 2026-08-01
  - Impact: public brand presentation and logo-governance documentation
  - Related: [Brand and Business Configuration](17_BRAND_BUSINESS_CONFIGURATION.md)

- Added the Sprint 1 premium customer experience foundation using Next.js App Router, strict TypeScript, reusable design-system and commerce presentation components, original REYON imagery, responsive customer routes, metadata/robots/sitemap support, and isolated Playwright browser acceptance tests.
  - Approval/owner: Sprint 1 Premium Customer Experience Foundation mandate
  - Impact: customer-facing presentation and development pipeline; no backend, commerce transaction, authentication, database, or AI behavior
  - Related: [Tech Stack](10_TECH_STACK.md), [UI Guidelines](09_UI_GUIDELINES.md)

- Added the Sprint 0.5 AI SEO and Product Content Architecture covering separated data responsibilities, content artifacts, generation contracts, mandatory human review, provenance, SEO quality, localization, structured data, and channel adapters.
  - Approval/owner: pending Product Owner review
  - Impact: documentation and architecture only; no AI, application, database, content, or deployment behavior
  - Related: [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md)

- Added the Sprint 0 environment audit, repository ignore policy, public environment-variable contract, and Supabase local configuration.
  - Approval/owner: Sprint 0 environment and project-ownership mandate
  - Impact: development environment and documentation only; no application, database, or deployment behavior
  - Related: [Sprint 0 Environment Audit](15_ENVIRONMENT_AUDIT.md)

### Changed

- Refined the mobile header into a balanced three-column navigation row and replaced the floating circular seal with the compact horizontal REYON / Beauty & Care wordmark lockup; desktop and footer logo treatments remain unchanged.
  - Approval/owner: Product Owner mobile-header review dated 2026-08-01
  - Impact: mobile header brand balance, responsive logo behavior, and browser acceptance coverage; navigation features unchanged
  - Related: [UI Guidelines](09_UI_GUIDELINES.md), [Brand and Business Configuration](17_BRAND_BUSINESS_CONFIGURATION.md)

- Refined the positioning hierarchy so REYON is first presented as a Premium Beauty & Personal Care Retailer and second as specializing in Authentic Korean Beauty; removed messaging that could imply an exclusively Korean-beauty assortment.
  - Approval/owner: Product Owner positioning-refinement directive dated 2026-08-01
  - Impact: homepage information hierarchy, About, Shop, metadata, footer, tests, and authoritative business documentation; visual design unchanged
  - Related: [Business Overview](01_BUSINESS_OVERVIEW.md), [Brand and Business Configuration](17_BRAND_BUSINESS_CONFIGURATION.md)

- Established authentic Korean beauty as REYON's primary retail specialization and adopted the canonical positioning line “REYON — Your trusted destination for authentic Korean beauty and personal care products.”
  - Approval/owner: Product Owner business-positioning directive dated 2026-08-01
  - Impact: homepage, About, Shop, metadata, footer, documentation, authenticity messaging, and future international-brand architecture
  - Related: [Business Overview](01_BUSINESS_OVERVIEW.md), [Brand and Business Configuration](17_BRAND_BUSINESS_CONFIGURATION.md)

- Established the Product Owner-approved REYON business configuration, including multi-brand retailer positioning, category vocabulary, customer channels, production origin, premium visual direction, English content baseline, and footer requirements; removed sample implications that REYON was a product manufacturer.
  - Approval/owner: Product Owner business-context directive dated 2026-08-01
  - Impact: customer-facing identity, contact links, categories, metadata, documentation, and future configuration governance
  - Related: [Brand and Business Configuration](17_BRAND_BUSINESS_CONFIGURATION.md), [Business Overview](01_BUSINESS_OVERVIEW.md), [UI Guidelines](09_UI_GUIDELINES.md)

- Connected the verified GitHub origin, aligned the local branch with `main`, and linked the existing Supabase and Vercel projects.
  - Approval/owner: Sprint 0 environment and project-ownership mandate
  - Impact: repository and local provider metadata; no remote data mutation or deployment
  - Related: [Sprint 0 Environment Audit](15_ENVIRONMENT_AUDIT.md)

## Documentation Foundation

### Added

- Established the initial documentation set for REYON Business OS, covering vision, business context, rule governance, roles, order, inventory, purchasing, accounting, data architecture, UI, technology selection, coding standards, repository structure, roadmap, and change governance.
  - Approval/owner: initial repository documentation mandate
  - Impact: documentation only; no application behavior or business policy implemented
  - Related: [Repository README](../README.md)

## Pending Governance

### TODO — Product Owner / Engineering

- Approve versioning and release convention.
- Define changelog owner, review cadence, and relationship to releases and migration notices.
- Decide whether separate module changelogs will be needed as the repository grows.

## Future Expansion

When releases begin, add stable version links, release dates, compatibility notes, migration guidance, deprecation windows, and decision references. Security entries must avoid exposing exploitable detail before remediation and disclosure approval.

## Related Documents

- [Roadmap](13_ROADMAP.md)
- [Business Rules](02_BUSINESS_RULES.md)
- [Coding Standards](11_CODING_STANDARDS.md)
- [Folder Structure](12_FOLDER_STRUCTURE.md)
