# Tech Stack

## Purpose

This document governs technology evaluation and records approved stack decisions. Sprint 1 establishes the customer experience baseline; later business modules still require evidence-based architecture decisions.

## Table of Contents

- [Selection principles](#selection-principles)
- [Architecture posture](#architecture-posture)
- [Decision categories](#decision-categories)
- [Evaluation criteria](#evaluation-criteria)
- [Decision process](#decision-process)
- [Lifecycle and support](#lifecycle-and-support)
- [Security and compliance](#security-and-compliance)
- [Developer experience](#developer-experience)
- [Pending decisions](#pending-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Selection Principles

- Requirements and constraints precede product selection.
- Prefer the smallest operational footprint that meets verified needs.
- Evaluate total ownership cost, skills, support horizon, interoperability, portability, and exit path.
- Limit overlapping tools with equivalent responsibility.
- Use managed services only after data, resilience, security, and vendor-risk review.
- Record material choices and rejected alternatives in architecture decision records.

## Architecture Posture

The system is expected to be modular, but modularity does not require distributed services. Deployment boundaries should follow scale, team ownership, reliability, security, and change-isolation evidence. Premature distribution can increase transaction, observability, and operating risk.

### Approved Sprint 1 Baseline

| Responsibility            | Selection                                | Rationale                                                                                                    |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Runtime                   | Node.js 24.x                             | Matches the verified local and Vercel runtime; pinned to the supported major                                 |
| Language                  | TypeScript 5.9, strict mode              | Strong contracts and scalable refactoring                                                                    |
| Web framework             | Next.js 16 App Router                    | Server-first rendering, route-level metadata, image optimization, static generation, and Vercel alignment    |
| UI runtime                | React 19                                 | Supported Next.js rendering and component model                                                              |
| Package manager           | npm 11 with lockfile                     | Available, auditable, deterministic baseline without an additional tool dependency                           |
| Icons                     | Lucide React                             | Accessible, consistent, tree-shakeable interface icons                                                       |
| Quality                   | ESLint 9 and Prettier 3                  | Automated correctness and formatting gates                                                                   |
| Browser testing           | Playwright with installed Microsoft Edge | Real browser, responsive, console, network, image, and interaction verification                              |
| Deployment                | Vercel                                   | Existing linked project and native Next.js delivery                                                          |
| Operational data platform | Supabase PostgreSQL                      | Private domain schemas, append-only migrations, exact numerics, constraints, RLS, and deny-by-default access |

Transitive `postcss` and `sharp` versions are explicitly overridden to patched compatible releases while upstream Next.js dependency ranges lag the current advisories. Overrides must be reviewed during every framework upgrade.

## Decision Categories

Required decisions include client applications, backend/runtime, API and integration style, transactional storage, search, cache, messaging, analytics platform, identity, file/media storage, infrastructure, deployment, observability, testing, security tooling, and developer workflow.

## Evaluation Criteria

Every candidate should be scored against functional fit, performance, consistency, availability, recovery, scale, security, privacy, compliance, accessibility, offline/device needs, team capability, ecosystem maturity, maintainability, licensing, cost, vendor risk, data portability, and migration effort.

## Decision Process

1. State the decision, owner, deadline, and affected modules.
2. Record measurable requirements and constraints.
3. Identify viable options and conduct proportionate proof work.
4. Assess risks, operations, costs, and exit strategy.
5. Approve and publish an architecture decision record.
6. Review when assumptions, support status, or requirements change.

## Lifecycle and Support

Approved technologies require supported version policy, upgrade cadence, vulnerability remediation, dependency ownership, end-of-life monitoring, licensing review, and replacement triggers.

## Security and Compliance

Technology choices must support least privilege, encryption, secrets management, audit evidence, secure supply chain, data classification, residency, retention, backup, restoration, and incident response as applicable.

## Developer Experience

The stack should enable repeatable local setup, automated quality checks, deterministic builds, representative testing, safe migrations, actionable observability, and documented troubleshooting without requiring uncontrolled production access.

## Pending Decisions

### TODO — Product Owner / Architecture / Operations

- Define expected users, transaction volumes, catalog size, locations, channels, integrations, regions, and growth assumptions.
- Define availability, latency, recovery, data residency, security, compliance, offline, device, and budget requirements.
- Assess team skills, operating model, hosting constraints, and procurement policy.
- Create decision records before selecting or scaffolding technologies.

## Future Expansion

Add an approved stack matrix with versions, owners, rationale, support policy, license status, cost model, and links to architecture decision records and operational standards.

## Related Documents

- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Coding Standards](11_CODING_STANDARDS.md)
- [Folder Structure](12_FOLDER_STRUCTURE.md)
- [Roadmap](13_ROADMAP.md)
