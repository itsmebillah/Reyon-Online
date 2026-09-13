# REYON Watches

Bangladesh-focused watch commerce at https://reyon-online.vercel.app, built with Next.js, React, TypeScript and Supabase PostgreSQL. Existing purchasing, inventory, order and financial evidence is preserved.

## Storefront and operations

Watch collections, search and filters, SKU selection, image galleries, specifications, stock-aware cart, Bangladesh addresses, district-based delivery charges and COD/manual payment checkout. Prices, inventory reservations and order totals are authoritative in PostgreSQL. Customer aftercare requires the private checkout browser token.

Administrators manage brands, categories, watch specifications, variants, prices, media and inventory through /admin. Existing order, delivery, returns, purchasing and finance workflows remain available. Create a watch, add verified specifications and media, publish it and receive stock through inventory before selling it. Historical cosmetics records remain in administration but are excluded from the watch storefront.

## Development and checks

Use Node.js 24 and npm ci. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local. Never commit credentials.

- npm run dev — local server
- npm run quality — format, lint, types, domain tests, migration/checkout integration tests, production build
- npm run test:e2e — builds and tests against an isolated in-memory PostgreSQL fixture; never creates production orders
- REYON_E2E_BROWSER_CHANNEL=msedge selects installed Edge on Windows; CI uses bundled Chromium

Migrations are in supabase/migrations. Review and dry-run before applying to a linked project. Tests execute the complete migration history in PGlite with stand-ins for Supabase-managed auth/storage schemas. They are complementary to production migration validation.

## Release limitations

Real watch inventory, images, prices and warranty terms must be supplied by the merchant. No demonstration products, reviews, certifications or courier/payment integrations are presented as real. Manual payments require configured account details and administrative review. Same-browser aftercare is limited by the private order cookie; support handles older orders or other devices.

Earlier architecture documents and screenshots record the original system and may describe historical cosmetics functionality.

## Editorial image

The generated hero is an unbranded editorial illustration, not a photograph of a saleable SKU. Asset: public/images/watch-hero.webp. Creative brief: premium close-up wristwatch with midnight-blue dial, brushed steel case and brown leather strap, watch on the right over dark stone, generous dark negative space on the left for typography, natural directional light, no branding or text. Product galleries must use images of actual merchandise.
