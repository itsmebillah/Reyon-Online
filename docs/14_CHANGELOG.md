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

### Sprint 20 — Supplier and Purchase Operations

- Opened Product Owner decision review for supplier lifecycle and records, supplier–variant sourcing, PO identity/lifecycle/authority, commercial lines, partial receiving and discrepancies, supplier returns, operational payment/credit status, amendments/cancellation, cost scope, performance history, replenishment, and audit controls while preserving all Sprint 14–19 boundaries.

### Sprint 19 — Returns and Refunds

- Opened Product Owner decision review for eligibility, lifecycle, evidence, authority, reverse logistics, inspection, inventory disposition, refund execution, customer documents, notifications, reporting adjustments, and append-only corrections while preserving all Sprint 14–18 boundaries.
- Approved the seven-day Delivered-based window, product/condition rules, reason/evidence catalog, partial and multiple returns, lifecycle and authority, shipping responsibility, inspected inventory dispositions, manual refunds, immutable source history, net adjustments, notifications, and append-only corrections.
- Added the Sprint 19 return-request foundation: authoritative eligibility checks, product-level returnability, approved reason/condition evidence, partial quantity and duplicate-return protection, append-only request events, customer intake, Admin queue visibility, and notification outbox events.
- Added governed return review operations: attributable intake processing, Admin/Super Admin-only approval and rejection, Staff-safe operational progression, conflict-resistant state guards, customer withdrawal of newly requested returns, and lifecycle notifications.
- Added auditable returned-item receipt and inspection: cumulative quantity caps prevent duplicate/over-receipt, every received unit requires an approved disposition, sellable stock posts an idempotent referenced Return In movement, and quarantine, damaged/loss, expiry, and batch outcomes remain unavailable and traceable without rewriting inventory or sales history.
- Added Admin/Super Admin-controlled manual refunds with proportional discount allocation from immutable order values, actual-payment and prior-refund caps, optional reason-gated REYON-fault delivery refunds, separate globally numbered adjustment records, mandatory execution evidence, and append-only lifecycle/notification history.
- Connected completed refund facts to sales reconciliation and the reusable Best Sellers collection strategy. Gross completed-sale history remains intact while Admin sees refunded and net product revenue, and ranking subtracts only quantities whose manual refund reached Refunded.
- Closed Sprint 19 with Admin/Super Admin-only append-only exceptional corrections and explicit non-physical Missing Item resolution. Missing quantities bypass receipt/inspection inventory disposition, never create Return In stock, and enter the same evidence-backed proportional refund and net-adjustment path.

### Sprint 17 — Sales Processing

- Approved Completed as the operational completed-sale event, Shipped inventory conversion, separate product/delivery reporting, invoice and receipt identities, audited discounts, and net-of-returns sales measures.
- Added the first Sales Processing milestone: Shipped atomically converts active reservations into one idempotent sold inventory movement, Delivered records COD collection separately, Completed creates immutable official sale evidence, and the Admin sales register separates product sales, delivery charges, and Grand Total.
- Added globally unique database-numbered customer invoices for completed sales and separate payment receipts for verified manual payments or collected COD, with immutable document snapshots and a privacy-scoped customer retrieval boundary.
- Added role-controlled line/order discounts with approved Super Admin/Admin/Staff limits, transactional cumulative enforcement, mandatory reasons, append-only evidence, protected finalized orders, and discount-aware customer invoices.
- Added reporting-oriented daily sales reconciliation from immutable Completed-sale facts, separating product sales, delivery charges, discounts, and Grand Total without introducing a POS opening/closing workflow.
- Closed Sprint 17 while deferring returned quantity, refunded revenue, net-sales, and net Best Seller adjustments to Sprint 19; completed Sales evidence remains unchanged.
- Opened Sprint 18 Delivery Operations decision review without implementing unapproved carrier, tracking, attempt, proof, failure, or reconciliation behavior.

### Sprint 18 — Delivery Operations

- Approved the provider-neutral single-courier/single-shipment model, lifecycle and exceptions, three-attempt maximum, handoff/proof evidence, address-change boundary, COD reconciliation, permissions, customer visibility, and notification rules.
- Added the first Delivery Operations milestone: Packed orders create exactly one Ready for Dispatch shipment, Admin configures one active provider-neutral partner, authorized staff assign handler/reference evidence, and delivery transitions enqueue customer/Admin notifications.
- Added guarded pickup/handoff, In Transit, and Out for Delivery operations. Pickup requires append-only evidence and atomically drives the existing Order Shipped/inventory fulfillment path; customers can retrieve status and shipment reference without simulated real-time tracking.
- Added capped delivery-attempt recording, required receiver/responsible-party proof of delivery, governed Lost/Damaged/Delivery Cancelled exceptions, and append-only COD reconciliation. Delivery attempts and reconciliation outcomes use the existing failure-safe notification outbox; COD mismatches enter review and cannot be treated as collected until an authorized correction matches the expected Grand Total.
- Completed the initial Delivery Operations release with a privacy-scoped customer status view and operational Admin delivery register. Customers see only REYON-recorded state and shipment reference; the interface explicitly avoids claiming unsupported live courier tracking.

### Sprint 16 — Order Management

- Approved the Order Management lifecycle, cancellation, review, role, payment, reservation, delivery-handoff, notification, and append-only correction rules.
- Added the first Order Management milestone: immutable globally sequential `RYN-YYYY-XXXXXX` references, governed state/transition records, extensible Super Admin/Admin/Staff memberships, and a secure searchable Admin order register.
- Added secure order details, commercial snapshots, append-only lifecycle history, guarded state commands, private reason evidence, delivery-handoff evidence, payment/reservation gates, and auditable reservation release.
- Added customer cancellation requests before shipment and a private administrator cancellation/manual-review queue with role-gated, reasoned resolutions.
- Added auditable reservation-expiry processing that releases stock, moves confirmed orders to a reservation exception, appends lifecycle evidence, and opens review cases.
- Added permission-gated manual payment verification/rejection, append-only evidence history, a minimal private review queue, and customer resubmission of rejected references; COD remains separate.
- Added a provider-neutral notification outbox for order and manual-payment events with separate append-only delivery-attempt evidence; notification failure cannot mutate order state.
- Added append-only correction and return boundaries: pre-shipment corrections enter controlled review, while shipped/delivered changes hand off to Return/Refund without mutating history.

- Corrected Sprint 15 payment-step navigation by separating method selection from payment confirmation/evidence. Continue now follows client selection state, mobile evidence remains mandatory, Card is represented as manual pending follow-up without collecting card data or claiming gateway success, COD remains payable on delivery, and server-side persistence errors are explicit.
  - Approval/owner: Product Owner checkout payment-step correction dated 2026-08-12
  - Impact: checkout payment component, payment administration wording, and migration `20260811220000_payment_step_navigation.sql`

- Prepared Sprint 15 Order Creation and Stock Reservation independently of the unavailable OTP provider. Checkout now persists delivery-zone selection and configured charges, preserves manual payment selection/evidence, reports authoritative readiness, and blocks confirmation until a real verified customer contact exists. The idempotent confirmation transaction revalidates cart, price, stock, address, delivery, and payment facts; snapshots the order; appends lifecycle/customer evidence; and creates auditable 30-minute reservations or a non-reserving insufficient-stock exception.
  - Approval/owner: Product Owner Sprint 15 continuation dated 2026-08-12
  - Impact: checkout flow and migration `20260811210000_order_confirmation.sql`; no OTP provider or verified identity is fabricated

- Extended Product Media Management with direct device uploads in Product creation and a reusable, storage-provider-neutral Media Library backed initially by Supabase Storage. Existing assets can be shared across products without copying physical files while preserving product-specific ALT text, primary selection, and gallery order.
  - Approval/owner: Product Owner Product Media workflow direction dated 2026-08-12
  - Impact: admin Product and Media workflows plus migration `20260811200000_reusable_media_library.sql`

- Improved the Admin workspace with grouped sidebar navigation, clearer dashboard actions, consistent module cards, responsive layouts, and shared loading/error states without changing business behavior.
  - Impact: Administration usability and navigation only; customer pages and domain rules are unchanged.

- Released Sprint 15E administrator-configurable delivery zones and charges without hardcoded prices.
  - Approval/owner: Product Owner finalized Sprint 15 rules dated 2026-08-11
  - Related: [Fulfillment and Delivery Architecture](20_FULFILLMENT_DELIVERY_ARCHITECTURE.md), [Roadmap](13_ROADMAP.md)

- Released Sprint 15D private structured Checkout Address entry with required-field enforcement and opaque-cart ownership.
  - Approval/owner: Product Owner finalized Sprint 15 rules dated 2026-08-11
  - Related: [Fulfillment and Delivery Architecture](20_FULFILLMENT_DELIVERY_ARCHITECTURE.md), [Roadmap](13_ROADMAP.md)

- Established the Sprint 15C private customer account data boundary with minimal profiles and unique verified phone/email identities.
  - Approval/owner: Product Owner finalized Sprint 15 rules dated 2026-08-11
  - Related: [Customer and CRM Identity Architecture](22_CUSTOMER_CRM_IDENTITY_ARCHITECTURE.md), [Roadmap](13_ROADMAP.md)

- Released Sprint 15B Checkout review with authoritative current-price and stock projection, explicit edit/exception paths, and no premature order or reservation side effects.
  - Approval/owner: Product Owner finalized Sprint 15 rules dated 2026-08-11
  - Related: [Order Lifecycle](04_ORDER_LIFECYCLE.md), [Roadmap](13_ROADMAP.md)

- Released Sprint 15A persistent guest Cart with secure opaque identity, rolling 30-day retention, a 10-unit per-variant limit, live catalog/stock projection, quantity management, and no cart-time reservation.
  - Approval/owner: Product Owner finalized Sprint 15 rules dated 2026-08-11
  - Related: [Business Rules](02_BUSINESS_RULES.md), [Roadmap](13_ROADMAP.md)

- Finalized the Sprint 15 Cart, Checkout, and Customer Account baseline covering verified identity reuse, 30-day carts, quantity limits, 24-hour privacy-safe cart social proof, authoritative checkout revalidation, 30-minute auditable reservations, structured addresses, configurable delivery zones and charges, manual payment evidence, and customer-data protection.
  - Approval/owner: Product Owner Sprint 15 decision set dated 2026-08-11
  - Impact: Sprint 15 is approved for sequential implementation; OTP provider credentials may independently gate its integration milestone.
  - Related: [Business Rules](02_BUSINESS_RULES.md), [Roadmap](13_ROADMAP.md)

- Released Inventory Entry with Main Inventory, all approved movement types, immutable corrections, transactional negative-stock prevention, complete audit evidence, and ledger-derived stock positions.
  - Approval/owner: Product Owner Inventory Entry baseline dated 2026-08-11
  - Impact: Customer availability, purchase controls, and dynamic Low Stock/Out of Stock collections now synchronize from inventory.
  - Related: [Inventory System](05_INVENTORY_SYSTEM.md), [Roadmap](13_ROADMAP.md)

- Released Product Media Management with validated licensed uploads, editable generated ALT-text drafts, ordered galleries, primary-image control, safe replacement, unreferenced-object cleanup, and a 12-image limit.
  - Approval/owner: Product Owner Product Media baseline dated 2026-08-11
  - Related: [Roadmap](13_ROADMAP.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

- Released searchable Product publication operations with explicit one-step Submit, Approve, Publish, Hide, and Archive controls backed by the approved append-only lifecycle.
  - Approval/owner: Product Owner-approved Sprint 14 lifecycle
  - Related: [Roadmap](13_ROADMAP.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

- Approved and implemented the permanent Dynamic Product Collections rule: all customer product collections use governed database configuration and reusable strategies, with optional ordered pins and no demonstration-product fallback.
  - Approval/owner: Product Owner Dynamic Product Collections decision dated 2026-08-02
  - Related: [Dynamic Product Collections](27_DYNAMIC_PRODUCT_COLLECTIONS.md), [Roadmap](13_ROADMAP.md)

- Completed the production Brand Management operations scope with search, lifecycle/visibility/featured filtering, deterministic sorting, display ordering, featured merchandising status, ISO country storage, visible audit timestamps, and case-insensitive duplicate-name protection.
  - Approval/owner: Product Owner Sprint 14B continuation dated 2026-08-02
  - Related: [Roadmap](13_ROADMAP.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

### Added

- Released guided Product Management for complete first-product creation, Draft saving, one-action approved-lifecycle publication, and immediate Published-only customer website synchronization.
  - Approval/owner: Product Owner Sprint 14 execution direction dated 2026-08-02
  - Impact: authenticated product interface, filtered brand/category options, atomic variant/pricing/offer/media creation, publication operation, and migration `20260802175000_product_management_entry.sql`; no verification records retained
  - Related: [Roadmap](13_ROADMAP.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

- Released complete Category Management with create/edit workflows, optional subcategory hierarchy, cycle prevention, descriptions, display ordering, store visibility, archive/restore controls, and immediate visible-category synchronization to customer pages.
  - Approval/owner: Product Owner Sprint 14 execution direction dated 2026-08-02
  - Impact: authenticated category interface, public visible-category projection, published-product visibility enforcement, and migration `20260802174000_category_management.sql`; no verification records retained
  - Related: [Roadmap](13_ROADMAP.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

- Released the complete Brand Management interface with create/edit workflows, JPG/PNG/WebP logo upload and replacement, descriptive details, website link, store visibility, archive, and restore controls.
  - Approval/owner: Product Owner Sprint 14 execution direction dated 2026-08-02
  - Impact: authenticated brand interface, private brand fields, public `brand-logos` bucket with admin-only writes, and migrations `20260802171000_brand_management.sql` and `20260802172000_brand_logo_upsert_policy.sql`; no verification records retained
  - Related: [Roadmap](13_ROADMAP.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

- Prepared secured category/product write primitives and a Published-only customer catalog projection without releasing their administration interfaces.
  - Approval/owner: Product Owner catalog vertical-slice direction dated 2026-08-02
  - Impact: migration `20260802170000_catalog_operations_vertical_slice.sql`; no business records inserted
  - Related: [Roadmap](13_ROADMAP.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

- Provisioned the single Product Owner-approved initial administrator and assigned the active admin membership required by the current deny-by-default authorization model; public registration remains disabled.
  - Approval/owner: Product Owner approval dated 2026-08-02
  - Impact: one Supabase Auth identity and one private admin membership; no credential stored in the repository and no additional user created
  - Related: [User Roles](03_USER_ROLES.md), [Roadmap](13_ROADMAP.md)

- Released the Sprint 14 admin authentication foundation with Supabase SSR sessions, server-verified claims, explicit active-membership authorization, disabled public signup, protected admin routing, sign-in/sign-out actions, and a responsive operational shell.
  - Approval/owner: Product Owner Sprint 14 execution priorities dated 2026-08-02
  - Impact: admin routes, authentication configuration, and migration `20260802160000_admin_authentication_foundation.sql`; no user, membership, role, or business record created
  - Related: [User Roles](03_USER_ROLES.md), [Roadmap](13_ROADMAP.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

- Aligned the Sprint 14 foundation exactly with the repeated Product Owner approval: brand, primary category, and one image are universal product requirements, while Product Code remains optional without an invented uniqueness policy.
  - Approval/owner: Product Owner catalog decisions dated 2026-08-02
  - Impact: typed validation, domain tests, and additive migration history; no business or customer data changed
  - Related: [Product Catalog Administration Decisions](25_PRODUCT_CATALOG_ADMIN_DISCOVERY.md), migration `20260802151000_catalog_rule_alignment.sql`

- Recorded the approved Sprint 14 Product Catalog Administration rules and implemented their private persistence and typed domain-validation foundation.
  - Approval/owner: Product Owner catalog decisions dated 2026-08-02
  - Impact: linked Supabase catalog schema, six approved category reference rows, lifecycle/identity/variant/media/provenance/price contracts, domain tests, and CI; no brand, product, variant, price, supplier, inventory, user, or customer record inserted
  - Related: [Product Catalog Administration Decisions](25_PRODUCT_CATALOG_ADMIN_DISCOVERY.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md), migration `20260802150000_catalog_administration_rules.sql`

- Added least-privilege GitHub Actions checks for locked dependency installation, formatting, linting, strict TypeScript, production builds, and the complete responsive browser matrix.
  - Approval/owner: engineering foundation under the approved autonomous roadmap
  - Impact: automated repository validation and release evidence only; no business behavior or production data introduced
  - Related: [Delivery Assurance](26_DELIVERY_ASSURANCE.md), [Roadmap](13_ROADMAP.md), [Coding Standards](11_CODING_STANDARDS.md)

- Added the Sprint 14 Product Catalog Administration decision and data-intake packet, translating all unresolved catalog rules into a non-technical Product Owner workflow.
  - Approval/owner: engineering discovery preparation; Product Owner answers remain pending
  - Impact: documentation only; no product data, business rule, role, lifecycle, validation, pricing, media, admin interface, or runtime behavior added
  - Related: [Sprint 14 Product Catalog Administration Decision Packet](25_PRODUCT_CATALOG_ADMIN_DISCOVERY.md), [Roadmap](13_ROADMAP.md)

- Added and deployed an empty content-governance schema for source snapshots, scoped artifacts, immutable typed versions, lineage, validation findings, mandatory human review evidence, and publication-attempt provenance, with RLS and deny-by-default client access.
  - Approval/owner: Product Owner Sprint 0.5 architecture and roadmap-execution directive; content and publication behavior still require accountable business and control approval
  - Impact: linked Supabase schema and migration history; no content type, product fact, policy, prompt, provider, model, generated content, validator, decision, renderer, channel, credential, publication, or content record inserted
  - Related: [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md), [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)

- Added and deployed an empty automation control-plane schema for versioned contract references, human review/control evidence, idempotent execution identities, and append-only execution/attempt history, with RLS and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02; executable behavior still requires approved domain rules and control policy
  - Impact: linked Supabase schema and migration history; no executable rule, trigger, condition, schedule, payload, credential, worker, retry, notification, side effect, enabled workflow, execution, or business data inserted
  - Related: [Automation Control-Plane Architecture](24_AUTOMATION_CONTROL_PLANE_ARCHITECTURE.md), [Business Rules](02_BUSINESS_RULES.md)

- Added and deployed an empty reporting schema for stable metric identities, immutable definition versions, versioned source bindings, append-only review evidence, and append-only projection-run lineage, with RLS and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02; metric semantics still require accountable domain-owner approval
  - Impact: linked Supabase schema and migration history; no metric, formula, dimension, value, target, threshold, report, dashboard, artifact, schedule, export, forecast, or business data inserted
  - Related: [Reporting and Analytics Contract Architecture](23_REPORTING_ANALYTICS_CONTRACT_ARCHITECTURE.md), [Database Architecture](08_DATABASE_ARCHITECTURE.md)

- Added and deployed an empty privacy-minimizing CRM schema for pseudonymous customer identities, opaque external references, append-only order associations, and append-only identity events, with organization-safe references, RLS, and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02; personal-data behavior still requires Privacy and Security approval
  - Impact: linked Supabase schema and migration history; no PII, profile, contact, credential, authentication, consent, preference, segment, loyalty, service, marketing behavior, or customer records inserted
  - Related: [Customer and CRM Identity Architecture](22_CUSTOMER_CRM_IDENTITY_ARCHITECTURE.md), [Order Lifecycle](04_ORDER_LIFECYCLE.md)

- Added and deployed an empty accounting schema for organization-scoped account identities and append-only source-linked journal evidence, with ownership-safe references, RLS, and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02; financial behavior still requires qualified Finance approval
  - Impact: linked Supabase schema and migration history; no chart, account record, journal, posting mapping, balance convention, period, recognition, valuation, tax, close, report, or financial behavior inserted
  - Related: [Accounting Rules](07_ACCOUNTING_RULES.md), [Database Architecture](08_DATABASE_ARCHITECTURE.md)

- Added and deployed an empty supplier and purchase-order schema for organization-scoped supplier identities, purchase commitments, cost/quantity line snapshots, and append-only lifecycle evidence, with ownership-safe references, RLS, and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02
  - Impact: linked Supabase schema and migration history; no supplier contacts, commercial terms, purchase states, approvals, receipts, tax, landed cost, invoice, payment, accounting behavior, or records inserted
  - Related: [Purchase System](06_PURCHASE_SYSTEM.md), [Accounting Rules](07_ACCOUNTING_RULES.md)

- Added and deployed an empty payment-evidence schema for provider-neutral monetary records, order allocations, append-only events, and opaque provider references, with RLS and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02
  - Impact: linked Supabase schema and migration history; no payment method, provider, state, sensitive instrument, settlement, refund, fee, fraud, accounting behavior, or payment records inserted
  - Related: [Payment Evidence Architecture](21_PAYMENT_EVIDENCE_ARCHITECTURE.md), [Accounting Rules](07_ACCOUNTING_RULES.md)

- Added and deployed an empty fulfillment schema for order-linked work, partial order-line assignments, append-only lifecycle evidence, and opaque external delivery references, with RLS and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02
  - Impact: linked Supabase schema and migration history; no fulfillment states, address data, carrier, shipping method, fee, routing, tracking workflow, or fulfillment records inserted
  - Related: [Fulfillment and Delivery Architecture](20_FULFILLMENT_DELIVERY_ARCHITECTURE.md), [Order Lifecycle](04_ORDER_LIFECYCLE.md)

- Added and deployed an empty order lifecycle schema for organization/channel-owned orders, commercial line snapshots, and append-only transition evidence, with idempotency, RLS, and deny-by-default client access.
  - Approval/owner: Product Owner roadmap-execution directive dated 2026-08-02
  - Impact: linked Supabase schema and migration history; no order states, transitions, customer data, payment, fulfillment, tax, return, or order records inserted
  - Related: [Order Lifecycle](04_ORDER_LIFECYCLE.md), [Database Architecture](08_DATABASE_ARCHITECTURE.md)

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
