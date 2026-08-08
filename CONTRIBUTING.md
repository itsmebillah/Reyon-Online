# Contributing

## Workflow

1. Read the [project vision](docs/00_PROJECT_VISION.md), applicable domain documents, and [coding standards](docs/11_CODING_STANDARDS.md).
2. Confirm that the requested behavior is an approved rule rather than an unresolved assumption or TODO.
3. Keep domain rules independent from framework and data-access concerns.
4. Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:domain`, and `npm run build`.
5. Add or update tests when catalog lifecycle, authorization, or data rules change.
6. Update [the changelog](docs/14_CHANGELOG.md) for meaningful product or architecture changes.

Never commit production credentials, customer information, or Supabase service-role keys.
