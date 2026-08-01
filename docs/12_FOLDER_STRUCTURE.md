# Folder Structure

## Purpose

This document defines the intended repository organization for a scalable modular system while preserving flexibility until architecture and technology choices are approved. The current repository contains documentation only.

## Table of Contents

- [Current structure](#current-structure)
- [Organization principles](#organization-principles)
- [Proposed target topology](#proposed-target-topology)
- [Module internal structure](#module-internal-structure)
- [Ownership and dependencies](#ownership-and-dependencies)
- [Naming and generated content](#naming-and-generated-content)
- [Change criteria](#change-criteria)
- [Pending decisions](#pending-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Current Structure

```text
/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── playwright.config.ts
├── public/
│   └── images/          # Original, project-owned optimized source imagery
├── scripts/
│   └── run-e2e.mjs      # OS-assigned isolated browser-test launcher
├── src/
│   ├── app/             # Customer routes, metadata, robots, sitemap, and global styles
│   ├── components/      # Reusable shell, design-system, product, and interaction components
│   └── data/            # Typed presentation fixtures pending approved backend contracts
├── tests/
│   └── e2e/             # Edge route, interaction, responsive, console, and network checks
├── supabase/
│   └── config.toml
└── docs/
    ├── 00_PROJECT_VISION.md
    ├── 01_BUSINESS_OVERVIEW.md
    ├── 02_BUSINESS_RULES.md
    ├── 03_USER_ROLES.md
    ├── 04_ORDER_LIFECYCLE.md
    ├── 05_INVENTORY_SYSTEM.md
    ├── 06_PURCHASE_SYSTEM.md
    ├── 07_ACCOUNTING_RULES.md
    ├── 08_DATABASE_ARCHITECTURE.md
    ├── 09_UI_GUIDELINES.md
    ├── 10_TECH_STACK.md
    ├── 11_CODING_STANDARDS.md
    ├── 12_FOLDER_STRUCTURE.md
    ├── 13_ROADMAP.md
    ├── 14_CHANGELOG.md
    ├── 15_ENVIRONMENT_AUDIT.md
    └── 16_AI_SEO_CONTENT_ARCHITECTURE.md
```

## Organization Principles

- Organize around owned capabilities and deployable products, not arbitrary technical layers alone.
- Keep public contracts explicit and internal implementation private.
- Separate source, tests, documentation, infrastructure, and generated artifacts.
- Centralize only genuinely shared capabilities with named ownership.
- Make dependency direction enforceable by tooling once the stack is known.

## Proposed Target Topology

The following is a planning model, not permission to create application folders:

```text
/
├── apps/              # Deployable user-facing or operational applications
├── modules/           # Owned business capabilities, if the chosen architecture uses them
├── packages/          # Deliberately shared libraries and contracts
├── integrations/      # External-system adapters and contract fixtures
├── platform/          # Approved infrastructure and operational definitions
├── tools/             # Repository automation with ownership
├── tests/             # Cross-system suites and representative fixtures
├── docs/              # Product, domain, architecture, and operational knowledge
└── decisions/         # Architecture decision records, if not held under docs
```

Exact names and even the monorepo approach remain pending.

## Module Internal Structure

A module should expose its contract, keep domain logic independent of transport/storage, colocate focused tests, and document ownership and dependencies. A final template depends on the selected language and architecture.

## Ownership and Dependencies

Each top-level area requires an accountable owner. Dependency rules should prevent cycles, direct access to another module's private data, and promotion of convenience utilities into ungoverned shared packages.

## Naming and Generated Content

Names should use stable business language and platform conventions. Generated files, build output, secrets, local state, production exports, and dependencies must not be committed unless an explicit policy requires a safe artifact.

## Change Criteria

Create a new top-level area only when it has a distinct responsibility, owner, lifecycle, and dependency policy. Structural changes require updated documentation, migration steps, and automated boundary checks where feasible.

## Pending Decisions

### TODO — Architecture / Engineering

- Decide repository strategy after team, stack, deployment, and ownership boundaries are known.
- Approve module boundaries, package naming, test layout, documentation taxonomy, and ownership mechanism.
- Define rules for generated artifacts, fixtures, migrations, infrastructure, and secrets.

## Future Expansion

Replace the proposed topology with the approved tree, ownership map, dependency graph, module template, and examples after architecture decision records are accepted.

## Related Documents

- [Tech Stack](10_TECH_STACK.md)
- [Coding Standards](11_CODING_STANDARDS.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Roadmap](13_ROADMAP.md)
