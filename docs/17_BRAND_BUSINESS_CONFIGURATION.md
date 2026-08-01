# Brand and Business Configuration

## Purpose

This document is the authoritative, Product Owner-approved configuration baseline for REYON's public business identity, customer channels, product-category vocabulary, and visual direction. It prevents inconsistent facts across customer interfaces, operations modules, integrations, metadata, and documentation. It defines configuration facts only; it does not establish unapproved commercial, legal, fulfillment, or product rules.

## Table of Contents

- [Configuration authority](#configuration-authority)
- [Business identity](#business-identity)
- [Retail model](#retail-model)
- [Product categories](#product-categories)
- [Customer contact channels](#customer-contact-channels)
- [Website](#website)
- [Brand presentation](#brand-presentation)
- [Content and localization](#content-and-localization)
- [Required customer experience](#required-customer-experience)
- [Change control](#change-control)
- [Pending Product Owner information](#pending-product-owner-information)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Configuration Authority

The Product Owner supplied this baseline on 2026-08-01. Product data, page content, metadata, customer communications, integrations, and documentation must consume or align with these approved values. A subsequent Product Owner decision supersedes this document only after every affected surface is identified and updated consistently.

## Business Identity

| Attribute             | Approved value              |
| --------------------- | --------------------------- |
| Store brand           | REYON                       |
| Working business name | Reyon Online                |
| Industry              | Beauty & Care               |
| Business model        | Multi-brand online retailer |

REYON identifies the retailer and customer experience. It must not be presented as the manufacturer or product brand for third-party products. Product-brand attribution must come from approved catalog data.

## Retail Model

REYON sells products made by other brands. Architecture and content must keep retailer identity separate from manufacturer, supplier, distributor, marketplace seller, and product-brand identity. Demonstration catalog records must be clearly identified and must never imply that REYON manufactures the displayed products.

### TODO — Product Owner

- Approve the initial third-party brands and products before catalog publication.
- Confirm authorized seller, distributor, authenticity, and warranty statements per brand where applicable.
- Define geographic sales scope and supported customer segments.

## Product Categories

The currently approved top-level categories are:

1. Skin Care
2. Hair Care
3. Makeup
4. Perfume
5. Baby Care
6. Personal Care

These labels are the canonical English display vocabulary. Category hierarchy, aliases, filters, and product assignments remain subject to catalog governance.

### TODO — Product Owner / Catalog Owner

- Approve subcategories, ordering, category imagery, and merchandising descriptions.
- Define whether products may belong to multiple categories.
- Approve category changes before feeds, URLs, redirects, and SEO records are updated.

## Customer Contact Channels

| Channel                | Approved value                                            |
| ---------------------- | --------------------------------------------------------- |
| Business email         | `reyononline22@gmail.com`                                 |
| Facebook               | <https://www.facebook.com/profile.php?id=100083040951242> |
| Instagram              | <https://www.instagram.com/reyononline.bd>                |
| WhatsApp Business      | `+8801623321524`                                          |
| Messenger display name | রেয়ন - Reyon                                             |

Customer-facing surfaces must use these values consistently. Contact links must use secure destination URLs. No response-time, service-hours, availability, or support-level promise may be published until approved.

## Website

The approved production origin is <https://reyon-online.vercel.app>. Canonical URLs, sitemap URLs, metadata, social previews, catalog feeds, and verified integration callbacks must derive from environment-aware configuration while resolving to this origin in production.

## Brand Presentation

The approved direction is premium, minimal, elegant, and modern, with a luxury beauty-retail character. Primary colors are black, white, and rose gold. Interfaces must avoid loud colors and low-trust, visually cluttered, or generic discount-marketplace styling.

Visual restraint must not reduce usability. Color contrast, keyboard focus, readable typography, clear status feedback, and accessible interaction targets remain acceptance criteria.

### TODO — Product Owner / Brand Owner

- Supply approved logo files, exact color values, typography licenses, imagery rules, and trademark guidance.
- Approve iconography, photography, motion, and social-template standards.
- Define permissible promotional treatments and sale messaging.

## Content and Localization

Professional English is the current publication language. Bengali localization is planned and must be added through a locale-aware content architecture rather than duplicated page implementations. Realistic, approved content should replace generic filler; Lorem Ipsum must not be used where meaningful content is possible.

Product claims, descriptions, ingredients, warnings, benefits, usage instructions, and regulated statements require approved source data and must not be inferred from a product name or image.

## Required Customer Experience

The homepage must communicate within its initial viewport that REYON is a trustworthy, premium, multi-brand beauty and personal-care retailer. The footer must include About, Contact, Privacy Policy, Terms, Return Policy, Shipping Policy, approved social links, copyright information, and newsletter access. Return and shipping pages remain explicitly pending until their policies are approved.

The Product Owner experience must minimize cognitive load, repetitive entry, avoidable mistakes, and daily operational effort. Safe automation is preferred, but consequential or AI-generated output requires clear review and control.

## Change Control

When an approved configuration value changes:

1. Record the decision and effective date.
2. Search application, documentation, metadata, environment configuration, integrations, tests, and generated feeds for affected references.
3. Update the central configuration source and all non-derived consumers.
4. Run the complete quality, deployment, and browser-verification workflow.
5. Record the change in the changelog.

Secrets, credentials, private identifiers, and provider tokens must never be stored in this document or committed configuration.

## Pending Product Owner Information

- Legal business name, registered address, jurisdiction, and registration identifiers.
- Customer-service hours, expected response times, and channel ownership.
- Approved product brands, initial catalog, sourcing evidence, and product claims.
- Currency, tax, pricing, promotion, payment, delivery, return, refund, and warranty policies.
- Service geography and delivery partners.
- Newsletter consent wording, privacy notice, terms, and retention requirements.
- Approved logo, design tokens, typography, and licensed brand assets.
- Bengali locale launch scope, translation ownership, and approval workflow.

## Future Expansion

Extend this baseline with governed legal-entity, location, locale, currency, channel, marketplace, catalog-feed, customer-service, and brand-asset configuration. Configuration should remain typed, validated, versioned, environment-aware, auditable, and consumable by ecommerce, admin, POS, CRM, inventory, purchasing, accounting, reporting, automation, and AI modules.

## Related Documents

- [Project Vision](00_PROJECT_VISION.md)
- [Business Overview](01_BUSINESS_OVERVIEW.md)
- [Business Rules](02_BUSINESS_RULES.md)
- [UI Guidelines](09_UI_GUIDELINES.md)
- [AI SEO and Product Content Architecture](16_AI_SEO_CONTENT_ARCHITECTURE.md)
- [Changelog](14_CHANGELOG.md)
