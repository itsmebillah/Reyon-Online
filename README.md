# REYON Business OS

REYON Business OS is the planned operating platform for REYON's Beauty & Care retail business. It is broader than an ecommerce site: the platform is intended to unify ecommerce, administration, point of sale, customer relationships, inventory, purchasing, accounting, reporting, analytics, automation, and AI-enabled capabilities.

This repository currently contains the documentation foundation. Product policy and implementation decisions remain intentionally uncommitted until approved by the appropriate owner.

## Table of Contents

- [Documentation map](#documentation-map)
- [Product scope](#product-scope)
- [Documentation conventions](#documentation-conventions)
- [Getting started](#getting-started)
- [Governance](#governance)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Documentation Map

| Area | Document | Purpose |
|---|---|---|
| Direction | [Project Vision](docs/00_PROJECT_VISION.md) | Defines intent, outcomes, boundaries, and principles. |
| Business | [Business Overview](docs/01_BUSINESS_OVERVIEW.md) | Captures operating context and business capabilities. |
| Policy | [Business Rules](docs/02_BUSINESS_RULES.md) | Provides the controlled register for approved business rules. |
| Access | [User Roles](docs/03_USER_ROLES.md) | Defines the framework for personas, roles, and permissions. |
| Commerce | [Order Lifecycle](docs/04_ORDER_LIFECYCLE.md) | Specifies the future order state model and controls. |
| Operations | [Inventory System](docs/05_INVENTORY_SYSTEM.md) | Defines inventory concepts, movements, and control points. |
| Operations | [Purchase System](docs/06_PURCHASE_SYSTEM.md) | Defines procurement boundaries and lifecycle structure. |
| Finance | [Accounting Rules](docs/07_ACCOUNTING_RULES.md) | Provides the governance framework for financial treatment. |
| Data | [Database Architecture](docs/08_DATABASE_ARCHITECTURE.md) | Establishes data architecture principles and decision gates. |
| Experience | [UI Guidelines](docs/09_UI_GUIDELINES.md) | Establishes cross-module interface standards. |
| Engineering | [Tech Stack](docs/10_TECH_STACK.md) | Records technology-selection criteria and pending decisions. |
| Engineering | [Coding Standards](docs/11_CODING_STANDARDS.md) | Defines quality, security, review, and delivery expectations. |
| Repository | [Folder Structure](docs/12_FOLDER_STRUCTURE.md) | Defines the intended scalable repository organization. |
| Delivery | [Roadmap](docs/13_ROADMAP.md) | Provides a dependency-aware planning framework. |
| History | [Changelog](docs/14_CHANGELOG.md) | Records meaningful documentation and product changes. |
| Environment | [Sprint 0 Environment Audit](docs/15_ENVIRONMENT_AUDIT.md) | Records verified tool, repository, and service readiness. |

## Product Scope

The target system is a modular retail operating system. Each module must be capable of evolving independently while sharing governed identity, product, customer, inventory, transaction, and financial concepts. Module inclusion in the vision is not approval to implement it; scope enters delivery only through the roadmap and an approved specification.

## Documentation Conventions

- **TODO — Product Owner:** business intent, policy, market, or priority requires an accountable product decision.
- **TODO — Architecture:** a technical design must be evaluated and recorded before implementation.
- **TODO — Domain Owner:** specialist operational or financial validation is required.
- **Decision:** an approved conclusion with owner and date; decisions must replace, not merely sit beside, the related TODO.
- **Assumption:** a temporary proposition that must not silently become a business rule.

## Getting Started

1. Read the project vision and business overview.
2. Resolve business-rule and role questions before designing workflows.
3. Use the lifecycle documents to define module behavior.
4. Record architecture and technology decisions before application scaffolding.
5. Add roadmap entries only when outcomes, dependencies, and acceptance evidence are understood.

## Governance

Documentation changes require review by the owner of the affected domain. Cross-domain changes must identify downstream impacts. Business behavior must not be inferred from technical convenience, and unapproved TODO items must not be implemented as policy.

## Future Expansion

Future documentation may include architecture decision records, API standards, event catalogs, data classification, threat models, disaster recovery, testing strategy, deployment operations, module specifications, and support runbooks. Add these when their scope and accountable owner are known.

## Related Documents

Start with [Project Vision](docs/00_PROJECT_VISION.md), then use [Roadmap](docs/13_ROADMAP.md) for delivery sequencing and [Changelog](docs/14_CHANGELOG.md) for repository history.
