# AI SEO and Product Content Architecture

## Purpose

This document defines the architecture for an AI-ready product content system in REYON Business OS. It establishes responsibility boundaries, content lifecycle, human-review controls, quality contracts, and channel extensibility without implementing AI, choosing a provider, creating prompts, generating product content, or defining a physical database schema.

## Table of Contents

- [Scope and non-goals](#scope-and-non-goals)
- [Architectural principles](#architectural-principles)
- [Domain boundaries](#domain-boundaries)
- [Source product data](#source-product-data)
- [Content artifact model](#content-artifact-model)
- [Content type catalog](#content-type-catalog)
- [Generation request model](#generation-request-model)
- [Human review and publication lifecycle](#human-review-and-publication-lifecycle)
- [Versioning and provenance](#versioning-and-provenance)
- [SEO quality architecture](#seo-quality-architecture)
- [URL and canonical architecture](#url-and-canonical-architecture)
- [Structured data architecture](#structured-data-architecture)
- [Image content architecture](#image-content-architecture)
- [Localization architecture](#localization-architecture)
- [Channel and marketplace architecture](#channel-and-marketplace-architecture)
- [Integration contracts](#integration-contracts)
- [Authorization and audit](#authorization-and-audit)
- [Validation and observability](#validation-and-observability)
- [Retention and recovery](#retention-and-recovery)
- [Conceptual relationships](#conceptual-relationships)
- [Decision gates](#decision-gates)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope and Non-Goals

The system must enable approved product facts to become reviewable content suggestions and, only after human approval, channel-ready published content. It covers ecommerce SEO, product copy, social copy, structured data, images, future localization, and future channel feeds.

This design does not:

- implement an AI model, provider, job runner, prompt, API, schema, user interface, or publishing integration;
- generate descriptions, captions, keywords, claims, warnings, or other product content;
- treat generated output as approved business truth;
- allow automatic publication of AI suggestions;
- define legal, regulatory, brand, medical, cosmetic, or marketplace policy;
- make SEO fields part of the authoritative product master record.

## Architectural Principles

1. Product facts remain authoritative and independent of generated prose.
2. Business policy, marketing strategy, SEO configuration, and AI output have separate owners and lifecycles.
3. AI output is a suggestion with provenance, never a source of product truth.
4. Human approval is mandatory before any generated or edited suggestion becomes publishable.
5. Content is typed, locale-aware, channel-aware, versioned, and auditable.
6. Generation and publication are independent capabilities connected through stable contracts.
7. Channel-specific formatting occurs through adapters without contaminating core product data.
8. Quality checks produce evidence and review signals; they do not silently rewrite content.
9. Rejected, superseded, and previously published versions remain explainable.
10. New languages, channels, and content types should extend catalogs and adapters rather than require redesign.

## Domain Boundaries

| Domain            | Owns                                                                                                                                                                       | Must not own                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Product Data      | Brand reference, product name, category, variant, size, images, basic specifications, identifiers, and other approved product facts                                        | SEO copy, campaign language, AI output, publication state                |
| Business Data     | Organization policy, market/channel availability, compliance constraints, approved claims, required warnings, brand/category governance, and other approved business facts | Generated prose or channel serialization                                 |
| Marketing Data    | Audience, campaign, tone/voice references, positioning, promotional context, and channel marketing intent after approval                                                   | Product truth, canonical identity, AI execution records                  |
| SEO Data          | Search presentation, URL/canonical decisions, indexing directives, structured-data selections, keyword strategy, duplicate relationships, and SEO validation evidence      | Product master facts, generation-provider internals                      |
| AI Generated Data | Suggestions, generation inputs snapshot, provider/model metadata, timestamps, status, validation results, and lineage                                                      | Approved product facts or automatically published content                |
| Publication       | Approved content selection, target channel/locale, rendered payload version, release status, and external references                                                       | Editing source facts or treating channel state as canonical product data |

Ownership boundaries are conceptual. Physical deployment and storage boundaries require later architecture decisions.

## Source Product Data

The Product Owner's primary product-entry inputs are:

- brand;
- product name;
- category;
- variant;
- size;
- price;
- images;
- basic specifications.

These inputs are generation sources only when they have passed the product domain's required validation. Price and availability are time-sensitive commerce facts and should be referenced at render/publication time where appropriate rather than copied permanently into prose.

### TODO — Product Owner / Domain Owners

- Define the approved product taxonomy, attributes, units, identifiers, and required specifications by category.
- Identify claims, ingredients, warnings, directions, certifications, and evidence that may legally or safely be used.
- Define which source fields are mandatory before each content type may be requested.
- Define the authoritative owners and correction workflow for inaccurate source facts.

## Content Artifact Model

A content artifact represents one typed piece of content for a subject, locale, and intended scope. The conceptual contract includes:

| Field group    | Required meaning                                                                           |
| -------------- | ------------------------------------------------------------------------------------------ |
| Identity       | Stable artifact identifier, subject type, and subject identifier                           |
| Classification | Content type, locale, market, channel scope, and optional campaign context                 |
| Content        | Typed value or structured payload; not an ungoverned generic text field                    |
| Lifecycle      | Suggestion, review, approval, rejection, publication, and supersession state               |
| Lineage        | Source-data snapshot/version, generation request, parent artifact, and derivation method   |
| Ownership      | Creator/generator, reviewer, approver, editor, and responsible domain                      |
| Quality        | Validation results, duplicate signals, policy findings, and review notes                   |
| Version        | Revision number, effective time, superseded relationship, and optimistic concurrency token |
| Publication    | Approved target, rendered payload version, publication time, and external reference        |

Structured content such as FAQ, features, schema input, or breadcrumbs must retain typed items and relationships rather than be stored only as presentation-ready HTML.

## Content Type Catalog

Content types should be defined in a governed catalog with value shape, applicable subjects, allowed locales/channels, dependencies, validation profile, review authority, and renderer support.

| Content family      | Required future content types                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Search metadata     | SEO title, meta title, meta description, Google search snippet, search keywords                                                         |
| URL and discovery   | URL slug, canonical URL, product tags, internal-link candidates                                                                         |
| Product editorial   | Product summary, short description, long description, product features, benefits, how to use, ingredients when available, warnings, FAQ |
| Image accessibility | Image ALT text associated with a specific product-image asset and locale                                                                |
| Social metadata     | Open Graph title, Open Graph description, Twitter Card data                                                                             |
| Structured data     | JSON-LD Product Schema input, Breadcrumb Schema input, rich-snippet data                                                                |
| Social marketing    | Facebook caption, Instagram caption                                                                                                     |
| Campaign copy       | Marketing copy and promotional headline                                                                                                 |

“Twitter Card” and structured-data entries are modeled as typed payloads with controlled fields, not single opaque text blobs. Actual field constraints require current platform and search-engine specifications at implementation time.

### TODO — Product Owner / SEO Owner

- Approve required versus optional content types by product category, market, locale, and channel.
- Define content ownership, brand voice, prohibited language, claims policy, and review authority.
- Define whether “SEO title” and “meta title” are distinct REYON concepts or aliases.

## Generation Request Model

A future generation request should describe intent without coupling the content domain to a particular AI vendor. Its contract should include:

- target product or other subject;
- requested content types;
- target locale, market, channel, and optional campaign context;
- immutable references or snapshots of approved source facts;
- applicable business, brand, SEO, and compliance policy versions;
- generation configuration identifier and version;
- requestor, reason, priority, correlation identifier, and idempotency key;
- previous artifact reference when regenerating;
- requested validation profile.

The generation gateway may later route to providers through adapters. Provider credentials, model identifiers, safety settings, quotas, retries, cost metadata, and raw responses belong to the generation infrastructure and audit boundary—not to Product Data.

No prompt architecture is defined in this sprint.

## Human Review and Publication Lifecycle

The required human actions are **approve**, **reject**, **edit**, **regenerate**, and **save**. Their conceptual workflow is:

```text
Approved source facts
        │
        ▼
Generation request ──► Generated suggestion ──► Saved review draft
                              │                         │
                              ├── regenerate           ├── edit and save
                              │                         ├── reject
                              │                         └── approve
                              │                                │
                              └────────────────────────────────▼
                                                    Approved artifact
                                                             │
                                                  explicit publication
                                                             │
                                                             ▼
                                                    Published version
```

Required invariants:

- Generated output cannot transition directly to published.
- Editing a suggestion creates a traceable revision and does not erase the generated original.
- Regeneration creates a new candidate linked to its request and predecessor; it does not overwrite an approved or published version.
- Rejection records actor, time, and a reason or review note according to future policy.
- Approval records the exact artifact version, reviewer/approver, time, and validation evidence.
- Publication accepts only the approved immutable version and records its target and result.
- A source-data change can mark affected content stale but cannot silently regenerate, approve, or publish it.
- Concurrent reviews must not allow approval of an unintended older revision.

Whether review and approval may be performed by the same role is a pending segregation-of-duties decision.

## Versioning and Provenance

Every generated, edited, approved, rendered, and published representation requires end-to-end lineage. At minimum, provenance should identify:

- exact source product and business data versions;
- generation request and configuration version;
- provider/model metadata when AI is connected;
- automated validation results and their rule versions;
- human edits, reviewer decisions, notes, and timestamps;
- channel renderer and contract version;
- publication target, result, and superseded version.

Approved content should be immutable. Corrections create a successor version. Published content must be reproducible from an approved artifact plus the versioned renderer and referenced dynamic facts.

## SEO Quality Architecture

Quality evaluation should be implemented as composable, versioned validators that report findings to reviewers. Candidate validation classes include:

- required-field and allowed-format validation;
- uniqueness and similarity/duplicate analysis across products, variants, locales, and channels;
- length and presentation-preview checks by content type;
- canonical and URL consistency;
- heading hierarchy and readability signals;
- factual consistency with approved source data;
- prohibited, unsupported, or regulated-claim detection;
- keyword overuse and conflicting-target signals;
- structured-data completeness and syntax validation;
- image ALT coverage and accessibility checks;
- internal-link opportunity and broken-target checks;
- stale-content detection after relevant source changes.

Validator results need severity, code, explanation, evidence, validator version, affected artifact/version, and disposition. Thresholds and blocking behavior require Product Owner, SEO, legal/compliance, and architecture approval.

## URL and Canonical Architecture

URL identity must be separated from editable product names. The future URL registry should support:

- normalized, readable slug candidates;
- locale and market scope;
- deterministic collision detection and resolution;
- reserved words and disallowed patterns;
- immutable route identity separate from the current slug;
- redirect history when an approved slug changes;
- one approved canonical target for each indexable page context;
- duplicate/variant/collection relationships;
- prevention of canonical loops, chains, and targets that are not publishable;
- preview before approval and conflict checks at publication time.

AI may suggest a slug but cannot reserve, approve, or publish it. Canonical policy, variant indexing, trailing-slash behavior, case normalization, transliteration, and redirect retention are pending business/SEO decisions.

## Structured Data Architecture

Structured data should be rendered from authoritative product/business facts plus approved content—not accepted as an opaque AI-produced JSON document. A typed internal representation should support Product and Breadcrumb data first while allowing future schema types.

The renderer must:

- map only approved and currently valid facts;
- separate required, recommended, and optional properties;
- retain currency, availability, price, image, brand, identifier, review/rating, and breadcrumb provenance;
- omit unsupported facts rather than fabricate them;
- validate output against the approved schema version;
- escape and serialize safely;
- version the renderer and retain publication evidence.

Reviews, ratings, offers, shipping, returns, and other rich-result properties must not be emitted until their authoritative domains and policies exist.

## Image Content Architecture

Image ALT text belongs to a particular image asset, product/context, and locale. The source image model should provide stable asset identity, ordering/role, and approved visual facts where available. Generated ALT suggestions follow the same review lifecycle as other content.

The system must distinguish accessibility ALT text from captions, filenames, social copy, and image SEO metadata. Empty ALT text may be valid for decorative use only under an approved accessibility rule; AI must not infer product attributes that are not present in approved data or verified image context.

## Localization Architecture

Future multilingual SEO is supported by making locale a first-class dimension, not an afterthought or a suffix on one text field. The architecture should distinguish language, market, currency, channel, and legal context. A localized artifact may be independently generated, translated, transcreated, edited, approved, published, and superseded.

Fallback must never cause unreviewed content to be published in another locale. Canonical and alternate-language relationships require an approved market/locale strategy. Terminology, brand voice, claims, ingredients, warnings, units, and regulatory text may differ by locale and require independent evidence.

### TODO — Product Owner

- Approve launch languages/markets, fallback behavior, translation ownership, and locale-specific review authority.
- Define whether product identity, catalog availability, URLs, and content vary by market.

## Channel and Marketplace Architecture

Core content artifacts should feed channel-specific projections through versioned adapters. Each adapter owns external field mapping, formatting, validation, capability negotiation, publication, error translation, and reconciliation for its target.

The architecture must be extensible to:

- Google Shopping and Merchant Center;
- Facebook Catalog and Instagram Shopping;
- TikTok Shop;
- Pinterest Catalog;
- future marketplaces and owned channels.

An adapter must not become the source of product truth. Channel overrides, when approved, are separate scoped artifacts with provenance. External identifiers and publication state remain namespaced by channel/account/market. Feed exports and API publication should consume the same approved projection contract.

Channel requirements change over time; implementation must verify current official specifications and version mappings rather than encode this document as a permanent external contract.

## Integration Contracts

The content system should expose capabilities through technology-neutral contracts:

| Capability      | Contract responsibility                                                                       |
| --------------- | --------------------------------------------------------------------------------------------- |
| Source snapshot | Supply validated, versioned product/business/marketing/SEO inputs                             |
| Generate        | Accept a generation request and return traceable suggestions asynchronously where appropriate |
| Review          | Save edits and record approve/reject/regenerate decisions with concurrency control            |
| Validate        | Evaluate an immutable artifact against named, versioned quality profiles                      |
| Publish         | Render and deliver only an approved version to an authorized target                           |
| Reconcile       | Compare intended and observed channel state and surface drift/errors                          |
| Search/read     | Return authorized current, historical, and review-queue projections                           |

Events may include source facts changed, generation requested/completed/failed, draft saved, artifact approved/rejected/superseded, validation completed, publication requested/succeeded/failed, and external drift detected. Event names, delivery guarantees, payloads, and technology remain pending architecture decisions.

## Authorization and Audit

Permissions should distinguish requesting generation, viewing suggestions, editing drafts, approving, rejecting, managing SEO configuration, managing canonical/URL decisions, publishing, rolling back, and administering providers or channel credentials.

Audit evidence should capture actor, action, artifact/version, before/after relationship, source and policy versions, reason, time, target, and outcome. Provider and channel credentials must use secrets management and must never appear in content artifacts, prompts, logs, analytics, or client-visible payloads.

### TODO — Product Owner / Security Owner

- Define eligible reviewers and approvers by content type, market, and channel.
- Define segregation, approval expiry, emergency correction, rollback, and access-review policy.

## Validation and Observability

Operational visibility should cover request volume, queue age, generation outcomes, validation failures, review time, approval/rejection/regeneration rates, stale artifacts, publication errors, channel drift, duplicate signals, cost and quota metadata, and provider health when AI is introduced.

Metrics must not become employee-performance or content-quality policy without approval. Logs and traces must exclude secrets and minimize product or business data according to classification. Failed generation or publication must remain retryable, idempotent where appropriate, and visible to an accountable human.

## Retention and Recovery

Retention should distinguish source snapshots, raw provider responses, generated suggestions, human edits, approval records, published payloads, validation evidence, and operational logs. The system needs approved policies for retention duration, deletion, legal hold, model/provider audit, backup, restoration, and re-publication after recovery.

No content version should be physically deleted merely because it is rejected or superseded until retention and audit policy permits it.

## Conceptual Relationships

```text
Product Data ──────────────┐
Business Data ─────────────┼──► Source Snapshot ──► Generation Request
Marketing Data ────────────┤                              │
SEO Configuration ─────────┘                              ▼
                                                 AI Suggestions
                                                        │
                                         Human Review / Edit / Decision
                                                        │
                                                        ▼
                                                Approved Artifacts
                                                        │
                               ┌────────────────────────┼──────────────────────┐
                               ▼                        ▼                      ▼
                         Web SEO Renderer       Structured Data        Channel Adapters
                               │                        │                      │
                               └────────────────────────┴──────────────────────┘
                                                        │
                                                        ▼
                                           Publication and Reconciliation
```

This is a responsibility map, not a service topology or database design.

## Decision Gates

### TODO — Product Owner / SEO / Domain Owners

- Approve product data requirements, product taxonomy, content types, claims/warnings policy, and evidence standards.
- Approve brand voice, audiences, SEO strategy, keyword ownership, duplicate thresholds, URL/canonical policy, and publication targets.
- Approve reviewer/approver roles, decision reasons, service expectations, and correction/rollback policy.
- Approve markets, languages, channels, and marketplace priorities.
- Confirm whether the public site will support product variants as separate indexable pages.

### TODO — Architecture / Security / Engineering

- Define bounded contexts, stable contracts, persistence model, event semantics, job execution, and concurrency strategy.
- Select AI/provider abstractions only after privacy, security, quality, cost, residency, and exit requirements are known.
- Define policy/configuration versioning, source snapshot strategy, validation framework, secrets management, and audit retention.
- Verify current search-engine, Schema.org, social, and marketplace specifications during implementation.
- Create threat models for generation inputs, prompt injection through source data, unsafe output, credential boundaries, publication, and supply-chain integrations.
- Define performance, availability, recovery, rate-limit, cost, and observability requirements.

## Future Expansion

The same artifact and review architecture should extend to blog content, knowledge-base articles, category/collection pages, landing pages, internal-link recommendations, editorial calendars, content experiments, search analytics feedback, content refresh suggestions, and additional structured-data types. Such expansion must retain source ownership, human approval, localization, provenance, and channel separation.

Implementation documentation should later add approved context diagrams, state machines, content-type schemas, API/event contracts, validation profiles, threat models, permissions matrix, data-retention schedule, channel adapter specifications, and architecture decision records.

## Related Documents

- [Project Vision](00_PROJECT_VISION.md)
- [Business Rules](02_BUSINESS_RULES.md)
- [User Roles](03_USER_ROLES.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [UI Guidelines](09_UI_GUIDELINES.md)
- [Tech Stack](10_TECH_STACK.md)
- [Coding Standards](11_CODING_STANDARDS.md)
- [Roadmap](13_ROADMAP.md)
