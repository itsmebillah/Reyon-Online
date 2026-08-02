# Product Catalog Administration — Sprint 14 Decisions

## Purpose

This document records the Product Owner-approved business rules for Product Catalog Administration and identifies the smaller capabilities that still require separate decisions. It is the implementation authority for Sprint 14 together with the existing catalog architecture. Decisions were approved on 2026-08-02 and replace earlier unanswered items in the discovery packet.

## Table of Contents

- [Business outcome](#business-outcome)
- [Approved scope](#approved-scope)
- [Product identity](#product-identity)
- [Brands and categories](#brands-and-categories)
- [Variants SKU and barcode](#variants-sku-and-barcode)
- [Images](#images)
- [Authenticity and origin](#authenticity-and-origin)
- [Pricing tax and stock](#pricing-tax-and-stock)
- [Lifecycle and customer visibility](#lifecycle-and-customer-visibility)
- [Implementation controls](#implementation-controls)
- [Feature-specific pending decisions](#feature-specific-pending-decisions)
- [Acceptance scenarios](#acceptance-scenarios)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Business Outcome

Enable trustworthy administration of multi-brand beauty and personal-care products while keeping product facts, inventory, purchasing, content, and channel publication independently governed. The interface should ultimately minimize repetitive work and mistakes for a non-technical Product Owner, but no unauthenticated administration capability may be exposed while access rules remain undecided.

## Approved Scope

Sprint 14 may implement the approved catalog facts, constraints, lifecycle vocabulary, validation, private persistence, and administration-ready contracts. Customer visibility must follow the approved publication rule. Inventory continues to own stock movements and quantities; catalog records only establish the variant identity to which stock belongs.

The following remain outside this approval: tax calculation, promotions, automated repricing, AI generation, automatic publication, marketplace publication, destructive deletion, supplier commercial terms, and accounting treatment.

## Product Identity

| Rule ID         | Approved rule                                                                          |
| --------------- | -------------------------------------------------------------------------------------- |
| CAT-PRODUCT-001 | Every product has an immutable, system-generated internal Product ID.                  |
| CAT-PRODUCT-002 | An administrator may optionally enter a custom Product Code.                           |
| CAT-PRODUCT-003 | When no custom Product Code exists, the internal Product ID is the business reference. |
| CAT-PRODUCT-004 | A custom Product Code must not replace or mutate the internal Product ID.              |

The internal UUID is authoritative identity. A business-reference projection returns the normalized custom code when present and otherwise the immutable UUID. Custom-code format and uniqueness are technical data-integrity concerns; correction authority remains part of access governance.

## Brands and Categories

| Rule ID          | Approved rule                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| CAT-BRAND-001    | Every product belongs to exactly one third-party product brand.                                      |
| CAT-BRAND-002    | REYON is the retailer and must never be represented as the manufacturer.                             |
| CAT-CATEGORY-001 | Every product has exactly one primary category.                                                      |
| CAT-CATEGORY-002 | Approved initial categories are Skin Care, Hair Care, Makeup, Perfume, Baby Care, and Personal Care. |
| CAT-CATEGORY-003 | The category model must support future subcategories without redesign.                               |

Additional secondary discovery classifications are not approved. The existing hierarchical category identity and explicit primary assignment remain compatible with future subcategories.

## Variants SKU and Barcode

Every sellable product variant has its own immutable internal Variant ID and supports the following approved variant types:

- Size
- Volume
- Color
- Shade
- Weight
- Pack Size

| Rule ID         | Approved rule                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| CAT-VARIANT-001 | SKU, price, stock association, and optional barcode belong to the sellable variant rather than the product. |
| CAT-SKU-001     | Every sellable variant has a globally unique SKU.                                                           |
| CAT-SKU-002     | The system may generate the SKU and an administrator may override it.                                       |
| CAT-BARCODE-001 | A manufacturer barcode is optional and should be recorded when available.                                   |
| CAT-BARCODE-002 | Absence of a barcode must not prevent purchasing, stocking, or selling.                                     |

The SKU source is recorded as system-generated or administrator-provided so later corrections remain attributable. No branded SKU pattern is approved; generated values therefore use stable system identity rather than an invented merchandising convention.

## Images

| Rule ID       | Approved rule                                                        |
| ------------- | -------------------------------------------------------------------- |
| CAT-MEDIA-001 | Every product requires at least one image.                           |
| CAT-MEDIA-002 | Two images are recommended, but the recommendation is not a minimum. |
| CAT-MEDIA-003 | The first ordered image is the primary display image.                |
| CAT-MEDIA-004 | The model must support larger future galleries without redesign.     |

Storage provider, licensing evidence, file types, dimensions, file-size limits, malware scanning, retention, and ALT-text approval remain separate media/security decisions. Persistence stores ordered references and does not weaken those future controls.

## Authenticity and Origin

The catalog supports explicit fields for:

- authentic-product status;
- imported-product status;
- supplier reference/information;
- future official-distributor information; and
- country of origin.

Country of origin is stored as a filterable country reference rather than free-form presentation copy. Examples supplied by the Product Owner—South Korea, Japan, France, Germany, USA, and Bangladesh—illustrate valid countries but do not restrict the future country list.

Authenticity fields are facts requiring evidence and attributable administration; this approval does not authorize unsupported customer claims. Supplier commercial terms remain owned by Purchasing.

## Pricing Tax and Stock

Each variant supports:

- Purchase Price
- Selling Price
- Compare-at Price (MRP)
- optional Discount Price

Money uses exact decimal values and explicit ISO currency. Negative monetary values are invalid. Compare-at and discount display semantics beyond their named purpose are not inferred. Tax is not calculated separately in the current system; the architecture must allow a future tax module without changing product identity or historical price evidence.

Inventory is tracked per variant, never at the parent-product level. The inventory ledger remains authoritative for quantity. Catalog pricing must not be treated as an accounting posting or inventory valuation rule.

## Lifecycle and Customer Visibility

The approved ordered vocabulary is:

```text
Draft → Review → Approved → Published → Hidden → Archived
```

| Rule ID           | Approved rule                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| CAT-LIFECYCLE-001 | Every product has one of the approved lifecycle statuses.                                                   |
| CAT-LIFECYCLE-002 | Only Published products are visible to customers.                                                           |
| CAT-LIFECYCLE-003 | Status history must remain attributable and append-only.                                                    |
| CAT-LIFECYCLE-004 | Publication requires at least one valid sellable variant in addition to the universal product requirements. |

The arrows establish the approved forward workflow. Actor permissions, segregation of review and approval, correction/republication, reactivation, and exception transitions remain unapproved. Until those decisions exist, only trusted server-side infrastructure may hold persistence privileges and no public administration command is enabled.

## Implementation Controls

- Product and Variant IDs are generated by the system and never updated.
- Product Code, SKU, and barcode are separate identifiers.
- Variant price types remain distinct and retain explicit currency.
- The primary category is explicit and unique per product.
- Image order is explicit; the lowest ordered image is the primary projection.
- Product completeness and publication eligibility are validated from authoritative catalog facts rather than UI state.
- Customer queries must filter to Published products when persistent runtime catalog access is introduced.
- Product facts must not be overwritten by AI-generated content.
- Append-only migrations extend the existing private, deny-by-default Supabase schema.

## Feature-Specific Pending Decisions

These unresolved items block only their dependent subfeatures:

### Administration Authorization — Feature Blocked

- First-admin provisioning, account recovery, and privileged-support procedures. Authentication and deny-by-default admin membership are implemented.
- Responsibilities allowed to create, edit, review, approve, publish, hide, archive, manage price, manage brand/category, or view history.
- Whether review and approval require different people.

### Operational Data Entry — Feature Blocked

- Approved initial brands and representative product/variant records.
- Required draft fields beyond the approved universal brand, primary-category, and image requirements.
- Product and variant naming convention, maximum text lengths, and category-specific specifications.
- Generated SKU presentation format; UUID-backed generation remains the neutral technical fallback.
- Initial operating currency and who may approve price corrections.

### Duplicate and Correction Workflow — Feature Blocked

- Duplicate matching beyond exact unique SKU or non-null barcode.
- Merge/split behavior, mistaken-publication recovery, reactivation, and permanent-deletion policy.
- Concurrent-edit conflict resolution and historical retention terms.

### Media Upload — Feature Blocked

- File formats, dimensions, size limits, licensing evidence, storage retention, scanning, and moderation.
- ALT-text ownership and approval.
- Complete mobile administration and formal accessibility target.

## Acceptance Scenarios

The approved foundation must prove that:

1. a product receives an immutable internal ID and can omit its custom Product Code;
2. a custom Product Code does not replace internal identity;
3. every variant has a unique SKU and can omit a barcode;
4. all six approved variant types are representable;
5. stock identity references the variant rather than the parent product;
6. all four approved price types are representable with exact currency values;
7. every product requires its brand, primary category, and image facts, while publication additionally requires a sellable variant;
8. only Published is customer-visible;
9. lifecycle evidence is append-only; and
10. future subcategories, larger galleries, distributor facts, filtering by origin, and tax integration do not require changing stable product identity.

Real workflow acceptance will be added when approved actors, example products, media rules, and exception paths are supplied.

## Future Expansion

After dependent decisions are approved, add authenticated administration, guided forms, approved media upload, conflict-safe editing, duplicate resolution, audit browsing, bulk import/export, inventory projections, localized content, AI suggestion review, scheduled publication, product relationships, promotions, marketplace feeds, and operational quality dashboards.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [User Roles](03_USER_ROLES.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
- [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md)
- [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)
- [Delivery Assurance](26_DELIVERY_ASSURANCE.md)
