# Dynamic Product Collections

## Purpose

This document defines the permanent business and technical rules for database-driven product collections across REYON Business OS. It prevents customer experiences from depending on source-code edits or hardcoded product lists.

## Table of Contents

- [Business Rule](#business-rule)
- [Collection Model](#collection-model)
- [Approved Collection Strategies](#approved-collection-strategies)
- [Selection and Ranking](#selection-and-ranking)
- [Administration](#administration)
- [Current Implementation](#current-implementation)
- [Controls](#controls)
- [Future Expansion](#future-expansion)
- [Related Documents](#related-documents)

## Business Rule

Every customer-facing product collection must be generated from governed business data. Product Owners manage configuration and optional product pins in the Admin Panel; no source-code change is required when assortment or ranking inputs change. The same collection engine serves homepage, category, brand, campaign, seasonal, search, landing, mobile, and marketing experiences.

## Collection Model

A collection has an immutable system key, editable presentation name, strategy key, enabled state, item limit, ranking period, optional inventory threshold, display order, and timestamps. Optional ordered pins reference stable Product IDs and never copy product facts. Products remain eligible only when the catalog publication projection considers them customer-visible.

Strategy implementations are selected by stable keys behind one repository contract. Ranking logic can change or be versioned without changing pages, collection identities, or product relationships. Consumers request a collection by key and receive an ordered product projection; they do not duplicate queries or implement local filters.

## Approved Collection Strategies

| Collection           | Default strategy                           | Optional administrator control            | Initial state                                     |
| -------------------- | ------------------------------------------ | ----------------------------------------- | ------------------------------------------------- |
| New Arrivals         | Newest publish date                        | Ordered pins precede automatic results    | Active                                            |
| Bestsellers          | Completed-sale ranking                     | Ordered pins                              | Inactive until governed sales facts are available |
| Most Loved           | Engagement ranking                         | Ordered manual features during cold start | Active manual-first                               |
| Featured Products    | Manual                                     | Ordered pins                              | Active                                            |
| On Sale              | Promotional price exists                   | None required                             | Active                                            |
| Low Stock            | Inventory at or below configured threshold | Configurable threshold                    | Inactive until inventory projection is released   |
| Out of Stock         | Inventory quantity is zero                 | None required                             | Inactive until inventory projection is released   |
| Trending             | Configurable engagement ranking            | Future pins/configuration                 | Inactive                                          |
| Recommended Products | Customer-specific replaceable strategy     | Future personalization controls           | Inactive                                          |

## Selection and Ranking

Pins augment rather than disable automatic strategies unless the strategy is manual. A pinned product must still be Published and pass active Brand and Category visibility. Duplicate products are removed by stable Product ID. Automatic results fill remaining capacity after eligible pins.

New Arrivals ranks by publication event date. On Sale requires an active promotional price. Bestsellers will consume completed-sales metrics with replaceable quantity, revenue, and period configuration. Most Loved will transition from manual pins to configurable wishlist, purchase, rating, review, and engagement signals as those sources become governed. Trending and Recommendations remain inactive until their inputs and privacy controls are approved.

## Administration

Administrators can view collections, enable or disable a collection, set item limits and display order, configure supported strategy parameters, and manage ordered product pins. Configuration changes take effect through database reads without deployment. The interface must explain unavailable strategies rather than fabricate results.

## Current Implementation

Sprint 14 establishes governed collection configuration and pin records, one public collection projection, a reusable repository method, and database-backed homepage rendering. New Arrivals, manual-first Most Loved, Featured Products, and On Sale are supported by current catalog facts. Hardcoded demonstration products are excluded from all customer reads.

## Controls

- Collection queries never bypass catalog publication, Brand visibility, or Category visibility rules.
- Pins cannot publish an ineligible product.
- Sales, inventory, engagement, and personalization strategies remain inactive until their authoritative projections exist.
- Purchase price and other private facts never enter customer collection projections.
- Configuration updates require authenticated REYON administrator membership.
- Collection identity and strategy keys are stable; presentation labels are editable.

## Future Expansion

### TODO — Sales and Reporting Owners

- Approve completed-sale metric, revenue treatment, ranking period presets, returns/cancellations behavior, and tie-breaking for Bestsellers.

### TODO — Inventory Owner

- Approve low-stock defaults and per-product, per-category, or per-location threshold precedence.

### TODO — CRM, Content, and Privacy Owners

- Approve engagement event definitions, rating/review authority, customer consent, profiling boundaries, retention, explainability, and personalization controls.

### TODO — Product Owner

- Configure collection presentation, activation, item limits, ordering, and initial pins using approved catalog products.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [Inventory System](05_INVENTORY_SYSTEM.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
- [Product Catalog Architecture](18_PRODUCT_CATALOG_ARCHITECTURE.md)
- [Reporting and Analytics Contract Architecture](23_REPORTING_ANALYTICS_CONTRACT_ARCHITECTURE.md)
