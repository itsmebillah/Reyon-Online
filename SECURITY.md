# Security Policy

## Current status

REYON Business OS is in active foundation development. The public storefront and catalog administration paths are implemented, while broader commerce and operating modules remain governed designs rather than released workflows.

## Reporting

Report vulnerabilities privately to [itsmbillah@gmail.com](mailto:itsmbillah@gmail.com). Do not open a public issue containing customer data, credentials, access details, or exploit instructions.

## Deployment expectations

- Keep Supabase Row Level Security enabled and verify anonymous, customer, and administrator access independently.
- Store only public project identifiers in `NEXT_PUBLIC_*` variables; never commit service-role keys or database credentials.
- Provision administrator accounts and memberships explicitly. Public signup is disabled.
- Apply migrations in order and test authorization using a non-production project before deployment.
