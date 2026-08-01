# Database Architecture

## Purpose

This document establishes data-architecture principles, ownership questions, and controlled physical decisions. Supabase PostgreSQL is approved for Sprint 2's private catalog foundation; later domains still require their own evidence and boundaries.

## Table of Contents

- [Architecture goals](#architecture-goals)
- [Domain ownership](#domain-ownership)
- [Conceptual data domains](#conceptual-data-domains)
- [Identity and keys](#identity-and-keys)
- [Consistency and transactions](#consistency-and-transactions)
- [History and audit](#history-and-audit)
- [Security and privacy](#security-and-privacy)
- [Integration and analytics](#integration-and-analytics)
- [Content and SEO data boundaries](#content-and-seo-data-boundaries)
- [Reliability and operations](#reliability-and-operations)
- [Decision gates](#decision-gates)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Architecture Goals

Data must be trustworthy, explainable, secure, evolvable, and recoverable. Architecture must preserve business invariants, prevent ambiguous ownership, support reconciliation, and avoid forcing every module into accidental shared coupling.

## Domain Ownership

Each business fact requires one authoritative owner, a defined lifecycle, and supported read models for consumers. Shared database access must not substitute for an explicit contract between domains.

The `catalog` schema owns product, brand, category, variant, product-media, category-assignment, and channel-offer records. Inventory remains authoritative for stock, accounting remains authoritative for financial postings, and approved content artifacts remain separate from product master facts.

The `organization` schema owns stable organization, location, channel, and location-channel reference identities. It does not own inventory quantities, fulfillment decisions, order state, tax treatment, or financial postings.

### TODO — Architecture

- Create bounded-context and data-ownership maps after business discovery.
- Define allowed cross-domain communication and consistency expectations.

## Conceptual Data Domains

Candidate domains are identity/access, organization/location/channel, catalog, product content/SEO, customer/CRM, order, payment, fulfillment, inventory, supplier/purchase, accounting, reporting/analytics, automation, and audit. These boundaries are hypotheses.

## Identity and Keys

Identifiers should be stable, non-semantic where appropriate, and distinct from mutable display codes. External identifiers require source namespace and collision handling. Human-readable numbering requirements are pending.

## Consistency and Transactions

Business invariants determine transaction boundaries. Cross-domain workflows require explicit idempotency, ordering, retry, failure visibility, and reconciliation. Distributed architecture is not presumed.

## History and Audit

The design should distinguish current state, business history, security audit, and technical logs. Corrections must remain attributable. Retention, immutability, legal hold, and deletion rules require approval.

## Security and Privacy

Data must be classified before access, encryption, masking, residency, retention, and export controls are designed. Secrets must not be stored as ordinary business data. Production data must not enter lower environments without approved protection.

### TODO — Product Owner / Security / Privacy

- Identify personal, payment, financial, employee, supplier, and commercially sensitive data.
- Confirm consent, residency, retention, deletion, disclosure, and breach obligations.

## Integration and Analytics

Operational schemas should not become undocumented public APIs. Integration contracts require versioning and ownership. Analytics must preserve metric definitions, lineage, latency, correction behavior, and access controls.

## Content and SEO Data Boundaries

Product facts, business policy, marketing context, SEO configuration, AI-generated suggestions, approved content artifacts, and publication records are separate conceptual responsibilities. Generated text must not overwrite product master data or become publishable without a recorded human approval.

The future logical model must support typed and locale-aware content artifacts, immutable source snapshots, versions and supersession, generation lineage, validation evidence, review decisions, canonical/URL history, channel projections, and publication reconciliation. Physical tables and storage boundaries remain pending architecture decisions.

Structured data should be rendered from authoritative facts and approved artifacts. AI output must not become an opaque source of JSON-LD truth.

## Reliability and Operations

The database decision must address availability, backup, restore validation, recovery objectives, capacity, observability, migrations, archival, and incident response. Requirements precede vendor selection.

Database schema changes use append-only SQL migrations under `supabase/migrations`. Remote migration history must match the repository. Every migration requires a dry run, database lint, and post-application inspection. Destructive migrations require explicit Product Owner approval and a recovery plan.

## Decision Gates

### TODO — Architecture

- Approve domain model and system-of-record boundaries.
- Record workload, scale, latency, consistency, availability, recovery, security, residency, and cost requirements.
- Select storage technologies through architecture decision records.
- Define schema migration, compatibility, seed/reference data, backup, and restore standards.
- Produce conceptual, logical, and physical models in that order as appropriate.
- Define the content artifact, source snapshot, review, approval, URL registry, publication, and channel-projection models described in the AI SEO architecture.

## Future Expansion

Add context and entity-relationship diagrams, data dictionary, classification catalog, event schemas, retention schedule, migration strategy, capacity model, recovery runbook, and database decision records.

## Related Documents

- [Business Overview](01_BUSINESS_OVERVIEW.md)
- [Tech Stack](10_TECH_STACK.md)
- [Coding Standards](11_CODING_STANDARDS.md)
- [Folder Structure](12_FOLDER_STRUCTURE.md)
- [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md)
- [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)
- [Operating Topology Architecture](19_OPERATING_TOPOLOGY_ARCHITECTURE.md)
