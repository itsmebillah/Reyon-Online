# Delivery Assurance

## Purpose

This document defines the policy-neutral engineering controls used to validate REYON Business OS changes before release. It separates automated repository evidence from the mandatory deployment and live-browser verification performed for each completed milestone. It does not approve business behavior, production data changes, or release authority.

## Table of Contents

- [Scope](#scope)
- [Delivery states](#delivery-states)
- [Automated quality workflow](#automated-quality-workflow)
- [Local validation](#local-validation)
- [Deployment verification](#deployment-verification)
- [Evidence and failure handling](#evidence-and-failure-handling)
- [Security boundaries](#security-boundaries)
- [Feature and project blockers](#feature-and-project-blockers)
- [Pending decisions](#pending-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Scope

The controls apply to application, test, documentation, configuration, and migration changes. They establish repeatable technical checks only. Domain acceptance, migration execution, protected production actions, and business-policy approval remain separate gates owned by their accountable stakeholders.

## Delivery States

| State             | Meaning                                                        | Required evidence                                                                                         |
| ----------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| In development    | A bounded change is being prepared locally                     | Traceable scope and a clean understanding of affected modules                                             |
| Validated locally | Repository checks pass in the isolated development environment | Formatting, lint, types, build, and relevant tests                                                        |
| Published         | The intended commit exists on the remote branch                | Local and remote commit identities match                                                                  |
| Deployed          | Vercel reports the intended production deployment ready        | Deployment identifier, target, alias, and successful build                                                |
| Verified          | The canonical live site passes browser inspection              | Route, interaction, responsive, accessibility-basics, console, network, image, font, and runtime evidence |
| Released          | All applicable evidence is complete and reported               | Commit, GitHub, deployment, and verification results                                                      |

A successful deployment alone is not a completed release.

## Automated Quality Workflow

GitHub Actions runs the repository workflow at `.github/workflows/quality.yml` for pull requests and pushes to `main`. It grants read-only repository contents access, uses lockfile installation, pins Node.js to the approved major, and cancels superseded runs for the same ref.

The workflow has two independent jobs:

1. Static quality runs formatting verification, ESLint with zero warnings, strict TypeScript checking, and a production build.
2. Browser quality builds the application and runs the complete Playwright desktop, tablet, and mobile matrix against an isolated OS-assigned loopback port after verifying the REYON application identity.

Browser failure traces, screenshots, and reports are retained as a short-lived artifact. CI uses Playwright's bundled Chromium; local Windows development defaults to installed Microsoft Edge. The same test specifications and timeout constraints apply to both.

## Local Validation

Before a commit, run:

```text
npm run format
npm run quality
npm run test:e2e
```

`npm run quality` is non-mutating and suitable for CI. The browser launcher must choose an available port and confirm the rendered page belongs to REYON before executing automation. A developer must not assume a fixed local port or test an unidentified process.

## Deployment Verification

For every completed milestone:

1. Confirm the intended commit and clean worktree.
2. Push without rewriting published history.
3. Confirm the remote branch contains the exact commit.
4. deploy that revision through the linked Vercel project.
5. Confirm the deployment is ready and assigned to the canonical production alias.
6. Open the canonical URL and test every available page and interactive element.
7. Exercise desktop, tablet, and mobile viewports.
8. Inspect console messages, failed requests, runtime errors, images, fonts, animations, and accessibility basics.
9. Record any page timeout at 120 seconds, capture failure evidence, and continue the remaining route matrix.
10. If a defect is found, fix, revalidate, commit, push, redeploy, and repeat the live verification cycle.

Production verification must target `https://reyon-online.vercel.app`, not merely a local build or deployment-specific URL.

## Evidence and Failure Handling

Evidence must identify the tested commit, command or workflow, environment, deployment identifier, canonical URL, result counts, and material exceptions. Passing narrow tests cannot prove broader release requirements. A failed required gate prevents the affected milestone from being called released, but does not prohibit work on unrelated modules.

No failing check may be bypassed by weakening assertions, excluding affected files, or silently changing the required outcome. Flaky behavior requires root-cause investigation; retries are diagnostic support rather than acceptance evidence.

## Security Boundaries

- CI receives no production database, service-role, or deployment credentials in this foundation.
- Forked or untrusted changes must not receive protected secrets.
- Dependencies are installed from the committed lockfile.
- Workflow permissions remain least-privilege and must be expanded only for an approved capability.
- Logs and artifacts must not contain secrets, customer data, provider tokens, or protected business records.
- Database changes remain append-only migrations and require their own safety and remote-state verification.

## Feature and Project Blockers

A **feature blocker** prevents only the behavior that depends on the missing decision, credential, external state, or safety approval. Its status and dependency must be recorded while independent roadmap work continues.

A **project blocker** exists only when the same dependency prevents meaningful progress across every remaining documented module. A single unresolved product, catalog, finance, security, or operational rule is not a project blocker when independent engineering work remains.

## Pending Decisions

### TODO — Repository Owner / Security / Engineering

- Configure branch protection and select which workflow checks are required before merging.
- Define review-count, code-owner, exception, and emergency-release governance.
- Approve dependency update, vulnerability remediation, and workflow-action pinning policy.
- Define preview-environment protection and secret access when integration testing requires provider credentials.
- Define evidence retention beyond the short-lived failure artifacts in this foundation.

These decisions refine governance; they do not prevent the least-privilege validation workflow from running.

## Future Expansion

Extend the pipeline with migration verification, unit and contract suites, accessibility scanning, dependency and secret scanning, software bill-of-materials generation, performance budgets, preview smoke tests, controlled promotion, release attestations, and rollback or forward-recovery exercises when their requirements and authority are approved.

## Related Documents

- [Coding Standards](11_CODING_STANDARDS.md)
- [Tech Stack](10_TECH_STACK.md)
- [Environment Audit](15_ENVIRONMENT_AUDIT.md)
- [Roadmap](13_ROADMAP.md)
- [Product Catalog Administration Decision Packet](25_PRODUCT_CATALOG_ADMIN_DISCOVERY.md)
