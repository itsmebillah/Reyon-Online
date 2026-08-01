# Roadmap

## Purpose

This document provides a controlled, outcome-oriented planning structure for REYON Business OS. It does not commit dates, modules, or features without Product Owner approval and dependency evidence.

## Table of Contents

- [Roadmap principles](#roadmap-principles)
- [Planning horizons](#planning-horizons)
- [Entry and exit criteria](#entry-and-exit-criteria)
- [Foundation work](#foundation-work)
- [Capability planning](#capability-planning)
- [Dependencies and sequencing](#dependencies-and-sequencing)
- [Risks and readiness](#risks-and-readiness)
- [Measures and review](#measures-and-review)
- [Pending prioritization](#pending-prioritization)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Roadmap Principles

- Plan for measurable business outcomes, not module completion alone.
- Validate policy, ownership, controls, and data before automating a workflow.
- Expose dependencies, migration, training, and operating change.
- Deliver end-to-end slices that can be verified and supported.
- Treat reporting, security, accessibility, observability, and recovery as delivery scope.
- Re-plan when evidence changes; retain decision history.

## Planning Horizons

| Horizon | Planning intent | Commitment level |
|---|---|---|
| Vision | Preserve long-term capability direction | Not a delivery commitment |
| Discovery | Resolve outcomes, policy, users, process, data, and constraints | Time-boxed learning only after approval |
| Candidate | Shape options, dependencies, risk, and acceptance evidence | Prioritization pending |
| Committed | Deliver an approved outcome with owner, capacity, and acceptance criteria | Explicit Product Owner commitment |
| Released | Operate, measure, support, and improve | Evidence-based review |

No item is currently marked committed.

## Entry and Exit Criteria

A candidate should identify outcome, owner, users, business rules, process, data, controls, dependencies, risks, non-functional needs, migration, operational owner, and measurable acceptance. Exit requires verified acceptance, documentation, training/support readiness, monitoring, and post-release ownership.

## Foundation Work

Potential foundation outcomes include product charter, stakeholder map, business glossary, rule register, role and permission model, current/target process maps, system/data inventory, architecture decisions, security/privacy assessment, design foundation, engineering workflow, and operating model.

These are candidates; scope and priority require approval.

## Capability Planning

Ecommerce, Admin, POS, CRM, Inventory, Purchase, Accounts, Reports, Analytics, Automation, and AI must each be decomposed into outcomes only after discovery. A module name must not be used as a sufficient roadmap item.

### Initiative Record

Each approved initiative should capture: identifier, outcome, accountable owner, users, in/out scope, dependencies, rules, acceptance measures, risks, target horizon, status, and decision links.

## Dependencies and Sequencing

Likely dependency categories include identity and authorization, organization/location/channel model, catalog, customer identity, inventory ownership, order lifecycle, financial policy, integration contracts, data quality, and operational readiness. Actual dependency relationships require architecture and domain validation.

## Risks and Readiness

Readiness reviews should cover unclear policy, unavailable owners, poor source data, uncontrolled manual workarounds, migration risk, external vendors, security/privacy, financial controls, staff adoption, support capacity, and recovery preparedness.

## Measures and Review

The roadmap should have an agreed review cadence. Each outcome needs baseline, target, measurement source, observation window, and responsible owner. Delivery output without business or control evidence is insufficient.

## Pending Prioritization

### TODO — Product Owner

- Approve business outcomes and priority order.
- Identify first users, locations, channels, and workflows.
- Confirm budget, timeline constraints, team, decision owners, and risk tolerance.
- Choose discovery initiatives and define acceptance evidence.
- Decide migration/coexistence expectations for current tools and data.

## Future Expansion

Add approved initiative records, dependency visualization, milestones, release policy, migration waves, training/change plan, benefit tracking, and links to detailed module specifications. Dates should appear only after commitment.

## Related Documents

- [Project Vision](00_PROJECT_VISION.md)
- [Business Overview](01_BUSINESS_OVERVIEW.md)
- [Tech Stack](10_TECH_STACK.md)
- [Changelog](14_CHANGELOG.md)
