# Product Catalog Administration — Sprint 14 Decision Packet

## Purpose

This document is the Product Owner decision and data-intake packet for the first operational REYON Business OS vertical slice: Product Catalog Administration. It converts unresolved catalog policy into plain-language decisions that a non-technical business owner can complete without designing software. It records no business rule until the Product Owner supplies and approves an answer.

## Table of Contents

- [Proposed business outcome](#proposed-business-outcome)
- [Known approved context](#known-approved-context)
- [Proposed slice boundary](#proposed-slice-boundary)
- [Product data intake](#product-data-intake)
- [Field and validation decisions](#field-and-validation-decisions)
- [Category and brand decisions](#category-and-brand-decisions)
- [SKU barcode and variant decisions](#sku-barcode-and-variant-decisions)
- [Pricing decisions](#pricing-decisions)
- [Lifecycle and publication decisions](#lifecycle-and-publication-decisions)
- [Roles and permissions](#roles-and-permissions)
- [Duplicate and correction decisions](#duplicate-and-correction-decisions)
- [Media decisions](#media-decisions)
- [Usability and accessibility acceptance](#usability-and-accessibility-acceptance)
- [Representative scenarios](#representative-scenarios)
- [Explicit non-decisions](#explicit-non-decisions)
- [Readiness checklist](#readiness-checklist)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Proposed Business Outcome

Enable the Product Owner to create, review, correct, and deliberately publish trustworthy product records through a low-cognitive-load administration interface. The slice should replace repetitive technical data handling with guided forms, clear previews, safe defaults, validation, and recoverable workflows while preserving catalog ownership boundaries.

This outcome is proposed because governed product facts are prerequisites for ecommerce, inventory, purchasing, content generation, search, reporting, and external channel feeds. It does not authorize implementation until the decisions in this packet are approved.

## Known Approved Context

- REYON is a premium multi-brand beauty and personal care retailer, not a manufacturer.
- Authentic Korean beauty is a strong specialization, not the entire identity.
- Current top-level categories are Skin Care, Hair Care, Makeup, Perfume, Baby Care, and Personal Care.
- The Product Owner's primary product-entry inputs are brand, product name, category, variant, size, price, images, and basic specifications.
- Generated or edited AI suggestions must never publish automatically.
- The interface must minimize cognitive load, clicks, repetition, and preventable errors for a non-technical owner.
- Product facts, inventory, purchasing, marketing, SEO, AI suggestions, and publication evidence remain separate responsibilities.

## Proposed Slice Boundary

### Proposed In Scope — Requires Approval

- Admin-only product list, search, filters, and product-detail workspace.
- Guided creation and editing of approved product, variant, category-assignment, media, and channel-offer fields.
- Draft preservation, validation feedback, preview, review, and explicit publication request according to the approved lifecycle.
- Duplicate signals, concurrent-change protection, attributable history, and clear correction paths.
- Empty, loading, error, permission-denied, validation, success, and recovery states.
- Keyboard-operable, responsive administration experience suitable for desktop and tablet; mobile use requirements remain a decision below.

### Proposed Out of Scope — Requires Approval

- Inventory quantities, purchase orders, supplier terms, customer data, checkout, payment, fulfillment, tax calculation, accounting postings, promotions, marketplace publication, AI generation, bulk import, and destructive deletion.
- Any public customer-facing catalog switch until publication, pricing, availability, and approved-content contracts are defined and tested.

### TODO — Product Owner

- Approve or amend the proposed in-scope and out-of-scope boundaries.
- State the single business problem that would make this slice valuable on its first day of use.

## Product Data Intake

Provide approved initial records in a spreadsheet or table using the fields below. One row should represent one sellable variant unless the Product Owner approves a different grain.

| Field                | Owner input                         | Decision needed                                                              |
| -------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Product brand        | Approved third-party brand name     | Confirm approved spelling and whether an unknown brand may be created inline |
| Product name         | Customer-recognizable product name  | Confirm naming convention and required language                              |
| Category             | One or more approved categories     | Confirm whether exactly one primary category is required                     |
| Variant label        | Variant/size presentation           | Confirm when a product needs separate variants                               |
| Size and unit        | Numeric or labeled package size     | Confirm allowed units and display format                                     |
| SKU                  | Internal sellable identifier        | Confirm assignment owner and format                                          |
| Barcode              | Manufacturer barcode when available | Confirm optionality and accepted formats                                     |
| Price                | Channel price                       | Confirm currency, tax display, zero-price rule, and effective timing         |
| Compare-at price     | Optional reference price            | Confirm meaning and permitted use                                            |
| Images               | Approved product images             | Confirm source ownership, minimum set, ordering, and quality rules           |
| Basic specifications | Approved factual attributes         | Confirm required attributes by category                                      |
| Claims and warnings  | Approved evidence-backed statements | Confirm source evidence and who may approve them                             |

### TODO — Product Owner

- Supply at least five representative products covering simple, multi-variant, missing-barcode, multiple-image, and category-edge cases.
- Clearly label all supplied data as approved production data or non-production test data.

## Field and Validation Decisions

For each field, approve whether it is required, optional, system-generated, conditionally required, read-only, or prohibited. Also approve maximum lengths, character rules, uniqueness, normalization, error messages, and whether a warning blocks saving or only publication.

### TODO — Product Owner / Catalog Owner

- Define required fields for saving a draft.
- Define additional requirements for review and publication.
- Define which specifications vary by category.
- Confirm whether slugs are generated automatically and whether the owner may edit them.
- Define handling for incomplete products and unavailable facts.

## Category and Brand Decisions

The approved top-level category list does not yet define hierarchy, subcategories, ordering, filters, or product-assignment policy.

### TODO — Product Owner

- Approve the category tree, display order, and whether products may belong to multiple categories.
- Define primary-category behavior and category-change effects.
- Approve brand creation, spelling changes, merging, suspension, and visibility rules.
- Confirm that REYON must never be offered as a product brand unless the business later becomes a manufacturer and explicitly changes this rule.

## SKU Barcode and Variant Decisions

### TODO — Product Owner / Operations Owner

- State whether SKUs are entered, generated, imported, or assigned through another process.
- Approve SKU format, uniqueness scope, immutability, and correction behavior.
- Identify supported barcode standards and whether barcodes are optional.
- Define product versus variant boundaries for size, shade, scent, formulation, bundle, and packaging differences.
- Define whether a variant may be retired while the parent product remains active.

## Pricing Decisions

The database supports exact monetary values and explicit currency but does not approve pricing policy.

### TODO — Product Owner / Finance Owner

- Confirm the initial selling currency and whether prices include any tax.
- Identify who may enter, review, approve, schedule, and correct prices.
- Define whether zero, missing, negative, or future-dated prices are allowed.
- Define compare-at price meaning, evidence, display conditions, and expiry.
- Define channel-specific price variation and effective-time behavior.
- Confirm that promotions and automated repricing remain out of this slice unless separately approved.

## Lifecycle and Publication Decisions

No product lifecycle, state vocabulary, or transition policy is currently approved.

### TODO — Product Owner / Catalog Owner

- Name the required product states in business language.
- For every transition, define entry criteria, permitted actor, required evidence, resulting visibility, notification, and recovery path.
- Define whether review and approval may be performed by the same person.
- Define how published products are corrected without losing history.
- Define suspension, archival, reactivation, and permanent-deletion policy.
- Define what "published" means for the website and future channels.

## Roles and Permissions

Use responsibilities rather than technical role names.

| Responsibility               | Person or business role        | Allowed actions | Scope | Approval required |
| ---------------------------- | ------------------------------ | --------------- | ----- | ----------------- |
| Create product drafts        | TODO — Product Owner           | TODO            | TODO  | TODO              |
| Edit product facts           | TODO — Product Owner           | TODO            | TODO  | TODO              |
| Review accuracy              | TODO — Product Owner           | TODO            | TODO  | TODO              |
| Approve publication          | TODO — Product Owner           | TODO            | TODO  | TODO              |
| Change prices                | TODO — Product Owner / Finance | TODO            | TODO  | TODO              |
| Manage categories and brands | TODO — Product Owner           | TODO            | TODO  | TODO              |
| View history and exports     | TODO — Product Owner           | TODO            | TODO  | TODO              |

### TODO — Security / Product Owner

- Approve authentication, session, account recovery, access-review, and privileged-support requirements before an admin user can access production data.

## Duplicate and Correction Decisions

### TODO — Product Owner

- Define what makes two products or variants duplicates: brand/name, SKU, barcode, attributes, or another combination.
- Define whether duplicates block draft save, review, or publication.
- Define merge, split, correction, and mistaken-publication behavior.
- Define which historical facts must remain visible and for how long.
- Define who resolves ambiguous duplicates and what evidence is required.

## Media Decisions

### TODO — Product Owner / Brand Owner

- Approve image ownership and licensing evidence requirements.
- Define permitted formats, size/resolution limits, aspect ratios, background expectations, and maximum image count.
- Define primary-image selection, ordering, replacement, and archival behavior.
- Define required image ALT-text review and whether AI may later suggest it.
- Confirm storage, retention, malware scanning, moderation, and sensitive-metadata requirements with Security.

## Usability and Accessibility Acceptance

The proposed interface should optimize the owner's daily workflow rather than expose database structure.

### Proposed Acceptance Principles — Requires Approval

- One guided workspace should handle the common create-and-review flow without forcing navigation between unrelated screens.
- Previously entered values must survive validation errors and recoverable failures.
- The interface should explain business consequences before high-impact actions.
- Repeated attributes should support safe reuse without silently copying outdated facts.
- Validation should use plain language and focus the first problem requiring attention.
- Keyboard access, visible focus, semantic labels, sufficient contrast, zoom, and responsive layouts are release requirements.

### TODO — Product Owner / UX Owner

- Approve primary devices and whether complete mobile administration is required.
- Identify the acceptable number of steps or time for creating a representative product.
- Confirm accessibility target and any users needing assistive technology.
- Approve usability testing with representative product records before release.

## Representative Scenarios

For each scenario, provide actual example data and the expected business outcome.

1. Create and publish a simple single-variant product.
2. Save an incomplete draft and finish it later.
3. Create a product with multiple sizes or shades.
4. Detect and resolve a duplicate SKU or barcode.
5. Correct a mistake after publication.
6. Replace and reorder product images.
7. Change a price with the approved effective timing.
8. Suspend or archive a product without deleting history.
9. Attempt an unauthorized or unapproved action.
10. Recover from a failed save, stale concurrent edit, or unavailable dependency.

### TODO — Product Owner

- Supply expected results for all applicable scenarios and mark any scenario that is intentionally out of scope.
- Add edge cases that occur in REYON's real daily product-entry process.

## Explicit Non-Decisions

This packet does not approve example states, permissions, required fields, generated SKUs, tax handling, duplicate thresholds, publication behavior, product data, or UI workflow. Proposed scope and acceptance principles remain proposals until the Product Owner records approval.

## Readiness Checklist

Sprint 14 implementation may begin only when all applicable items have accountable approval:

- [ ] Slice scope and first-day business outcome
- [ ] Representative approved/test product dataset
- [ ] Field requirements and validation behavior
- [ ] Brand and category rules
- [ ] Product, variant, SKU, and barcode rules
- [ ] Pricing and currency rules
- [ ] Lifecycle and publication rules
- [ ] Role and permission matrix
- [ ] Duplicate, correction, archival, and deletion rules
- [ ] Media and storage requirements
- [ ] Security, privacy, accessibility, and device requirements
- [ ] Representative scenarios with expected results
- [ ] Measurable acceptance criteria and operational owner

## Future Expansion

After the first slice is proven, extend the same governed product workspace to bulk import/export, inventory setup, supplier assortment, localized approved content, AI suggestion review, scheduled publication, product relationships, promotions, marketplace feeds, quality dashboards, and automation. Each expansion retains explicit ownership, versioning, human control, and channel separation.

## Related Documents

- [Business Overview](01_BUSINESS_OVERVIEW.md)
- [Business Rules](02_BUSINESS_RULES.md)
- [User Roles](03_USER_ROLES.md)
- [UI Guidelines](09_UI_GUIDELINES.md)
- [Roadmap](13_ROADMAP.md)
- [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md)
- [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)
- [Customer and CRM Identity Architecture](22_CUSTOMER_CRM_IDENTITY_ARCHITECTURE.md)
