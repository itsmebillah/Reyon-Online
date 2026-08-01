# User Roles

## Purpose

This document defines the framework for identifying platform actors and designing least-privilege access. It does not assign unapproved permissions or assume REYON's organization structure.

## Table of Contents

- [Access principles](#access-principles)
- [Actor categories](#actor-categories)
- [Role definition template](#role-definition-template)
- [Permission model](#permission-model)
- [Approval and segregation](#approval-and-segregation)
- [Identity lifecycle](#identity-lifecycle)
- [Audit and review](#audit-and-review)
- [Pending decisions](#pending-decisions)
- [Future expansion](#future-expansion)
- [Related documents](#related-documents)

## Access Principles

- Grant the minimum access required for an approved responsibility.
- Separate identity, role, permission, scope, and approval authority.
- Scope access by relevant organizational dimensions only after those dimensions are confirmed.
- Require traceability for privileged, financial, inventory, customer-data, and override actions.
- Deny by default when authorization evidence is absent.

## Actor Categories

Potential categories include workforce users, customers, suppliers, delivery or service partners, system integrations, automation identities, and support personnel. These categories are not approved roles.

### TODO — Product Owner

- Identify actual personas, employment or contractual relationships, and responsibilities.
- Identify external and machine actors that require controlled access.

## Role Definition Template

| Field | Description |
|---|---|
| Role ID and name | Stable identifier and business-readable label |
| Purpose | Responsibility the role enables |
| Eligible actors | Who may receive it |
| Capabilities | View, create, change, approve, reverse, export, or administer |
| Scope | Entity, location, channel, team, or record restrictions |
| Sensitive data | Permitted classifications and masking needs |
| Conflicts | Incompatible roles or permissions |
| Approval | Granting authority and evidence |
| Review | Owner, frequency, and expiry behavior |

## Permission Model

The architecture should support capability-based authorization with explicit scope and contextual controls. Whether roles are fixed, composable, attribute-based, or hybrid is an architecture decision pending approved requirements.

## Approval and Segregation

High-risk activities may require segregation between initiation, approval, execution, and review. No specific approval threshold or role pairing is assumed.

### TODO — Domain Owners

- Identify actions requiring maker-checker controls, thresholds, or secondary approval.
- Define emergency access and break-glass review.
- Confirm who may view or export customer, employee, supplier, and financial information.

## Identity Lifecycle

Required lifecycle stages include invitation or provisioning, verification, access grant, modification, suspension, recovery, termination, and archival. Service identities require named ownership and credential rotation.

## Audit and Review

Access decisions and privileged actions should produce durable evidence. Access reviews must verify continuing need, scope, conflicting privileges, inactive accounts, and ownership of non-human identities.

## Pending Decisions

### TODO — Product Owner / Security Owner

- Approve the identity provider, authentication requirements, and account-recovery policy.
- Define role owners, access approvers, review frequency, and session policy.
- Confirm regulatory or contractual identity and privacy obligations.

## Future Expansion

Add an approved role catalog, permission matrix, segregation-of-duties matrix, identity flows, access-review procedure, and privileged-access runbook.

## Related Documents

- [Business Rules](02_BUSINESS_RULES.md)
- [UI Guidelines](09_UI_GUIDELINES.md)
- [Database Architecture](08_DATABASE_ARCHITECTURE.md)
- [Accounting Rules](07_ACCOUNTING_RULES.md)
