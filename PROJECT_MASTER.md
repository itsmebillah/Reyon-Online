# Reyon Online + Physical POS Integration — Master Plan and Current State

**Document authority:** This is the primary handoff, current-state, and continuation document for the Reyon Online physical POS integration. Domain-specific documents under `docs/` remain authoritative for their detailed business rules. If implementation and documentation disagree, verify the current migrations and code, resolve the discrepancy deliberately, and update this document.

**State recorded:** 2026-09-16 (Asia/Dhaka)

**POS implementation commit:** `99d4ca8aecb3bd6e79e3ba03c8685f5e3bedfbdc`

**Canonical production URL:** <https://reyon-online.vercel.app>
**Canonical Supabase project:** `reyononline` (`pcjjbishaajzogzkuruc`)

## Current Status Dashboard

| Area                           | Status                         | Notes                                                                                                                                                                                     |
| ------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reyon storefront               | Implemented and deployed       | Existing public watch store remains the primary customer storefront. Basic production `/` check returned HTTP 200.                                                                        |
| Customer experience            | Implemented and deployed       | Existing cart, checkout, account, order success, and aftercare behavior retained. Full live regression remains pending.                                                                   |
| Administration                 | Implemented and deployed       | Existing catalog, inventory, orders, returns, purchasing, payment, and accounting operations retained.                                                                                    |
| POS UI                         | Implemented and deployed       | Native Reyon POS shell and workflows are available under `/pos`.                                                                                                                          |
| POS backend                    | Implemented and deployed       | Server actions call authorized PostgreSQL RPCs over Reyon's canonical domains.                                                                                                            |
| Inventory                      | Unified                        | Website and POS use the same location-based ledger, stock position, and reservations.                                                                                                     |
| POS checkout                   | Implemented and locally tested | Transactional, idempotent, server-priced, stock-locked, and accounting-gated. Live sale testing is pending.                                                                               |
| Payments                       | Implemented as evidence        | Cash, card, mobile, bank-transfer, split tender, change, and due evidence are represented. No new automatic external gateway was added.                                                   |
| Barcode                        | Implemented and locally tested | Code 128 generation, search, keyboard-wedge scanning, browser camera scanning, labels, and printing. Hardware live testing is pending.                                                    |
| Employees                      | Implemented                    | Direct Supabase Auth account creation plus profile, capability, location, activation, and deactivation management. Live account-creation testing is pending.                              |
| Registers and shifts           | Implemented but frozen         | Schema, functions, capabilities, components, and history are preserved; active shifts are temporarily not required for selling.                                                           |
| Reports                        | Partially implemented          | Sales, revenue, discounts, tax, due, tender, product, cashier, channel, and date-range views. Profit, inventory, customer, and export reports are not implemented in the POS report page. |
| Database                       | Migrated in production         | `20260915100000_pos_operating_foundation.sql` is present in local and remote migration history.                                                                                           |
| Automated tests                | Passing                        | Formatting, lint, types, 44 domain tests, 9 database tests, 3 responsive POS browser tests, and production build passed at implementation handoff.                                        |
| Vercel production deploy       | Ready                          | Deployment `dpl_HZ13zqfCWqqKF9Snfz7dum9fG69M` is READY and aliased to the existing production URL.                                                                                        |
| Basic live verification        | Partial                        | `/` returned 200. Unauthenticated `/pos` returned 307 to `/admin/login`, then resolved to 200. Authenticated POS workflows have not been live-tested.                                     |
| Git publication                | Pending                        | POS commit exists locally. At this snapshot `main` is 32 commits ahead of `origin/main`; GitHub authentication blocked the push.                                                          |
| Autopilot standalone           | Independent and untouched      | No standalone repository, database, or deployment change is part of this integration.                                                                                                     |
| Historical Autopilot migration | Not performed                  | Only empty staging/reconciliation structures exist for a separately approved future process.                                                                                              |

Status vocabulary used here:

- **Implemented:** behavior exists in the repository.
- **Tested locally:** automated or isolated database evidence exists.
- **Deployed:** the application/migration reached the named production service.
- **Live verified:** the actual production interaction was exercised, not merely built or deployed.
- **Pending:** implementation, hardening, publication, or live evidence is still required.

## 1. Project Purpose and Product Boundary

Reyon Online is a Bangladesh-focused watch commerce and business operations application built with Next.js, React, TypeScript, Supabase Auth, and Supabase PostgreSQL. Reyon is both the primary application and the owner of the primary database.

The intended Reyon product contains these connected capabilities:

1. Public online store
2. Customer experience
3. Administration
4. Physical POS
5. Inventory
6. Orders and sales
7. Payments
8. Customers
9. Suppliers and purchasing
10. Returns and refunds
11. Employees and access control
12. Registers and shifts
13. Reports
14. Accounting
15. Receipts and invoices

The physical POS was integrated so in-store and website commerce can operate against one catalog, one inventory ledger, one order history, and one financial evidence system. The POS is not a synchronized copy of another product.

## 2. Authoritative Final Architecture

```text
Public storefront (/...)             Physical POS (/pos/...)
             |                                  |
             +---------- Reyon server ----------+
                              |
                 authorized server actions/RPCs
                              |
                 one Reyon Supabase database
                              |
      catalog · inventory · sales · payments · CRM · returns
         purchasing · accounting · organization · access
```

Core rules:

- Reyon Online is the primary application.
- Reyon's Supabase PostgreSQL database is the sole canonical database.
- `website` and `physical-pos` are sales channels in the same commerce system.
- Inventory is location-based, not channel-based.
- Catalog products, variants, inventory movements, reservations, orders, payments, returns, and accounting remain owned by their existing Reyon domains.
- The `pos` schema stores POS-specific operating evidence; it does not duplicate the core business masters.
- There is no POS inventory database, product master, or permanent two-way synchronization service.

## 3. Relationship to Standalone Autopilot

Standalone Autopilot POS remains an independent product, repository, database, and deployment. It may continue evolving toward a separately sellable POS SaaS product.

Reyon adapted Autopilot's useful **experience concepts**, including its register-oriented layout, search and cart interaction, checkout flow, quick cash, split tenders, barcode workflows, receipt presentation, sales history, shifts, employees, reports, and responsive behavior.

Reyon did **not** copy Autopilot's legacy or unsafe backend architecture. In particular, the integration did not copy or introduce:

- a separate writable POS inventory;
- a separate POS product master;
- client-authoritative prices, totals, stock, or privileges;
- unsafe direct browser database mutations;
- plaintext password storage;
- a permanent Autopilot-to-Reyon synchronization process;
- historical Autopilot production records.

The correct description is: **a native Reyon implementation of the Autopilot-inspired POS experience using Reyon's canonical backend**.

## 4. Route and Module Inventory

| Route             | Current purpose                                                     | Important limitation/boundary                                                                            |
| ----------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/pos`            | Main sales register                                                 | Requires authenticated `pos.access` and `pos.checkout`; no active shift is currently required.           |
| `/pos/register`   | Alias that redirects to `/pos`                                      | No independent register implementation.                                                                  |
| `/pos/dashboard`  | Today's location POS summary and navigation                         | Financial values require `reports.financial`.                                                            |
| `/pos/sales`      | Searchable POS sales and invoice history                            | POS-originated sales only.                                                                               |
| `/pos/sales/[id]` | Receipt/invoice detail and reprint                                  | Authorization is checked through `pos_receipt`.                                                          |
| `/pos/returns`    | POS return entry point                                              | Hands work to Reyon's canonical `/admin/returns` workflow; no separate POS return engine.                |
| `/pos/products`   | Canonical product/variant listing, barcode labels, CSV import       | Full create/edit lifecycle uses `/admin/products`.                                                       |
| `/pos/inventory`  | Location stock position and authorized manual movements             | Purchasing receipts also remain available through canonical purchasing workflows.                        |
| `/pos/purchasing` | POS-styled hub for suppliers, POs, receiving, returns, and payments | Links to existing protected admin modules rather than duplicating them.                                  |
| `/pos/customers`  | Search and POS sales/spend summary                                  | New customer creation occurs during checkout when a phone is supplied; no standalone POS profile editor. |
| `/pos/shifts`     | Preserved shift history and frozen-feature notice                   | Opening, cash events, and closing controls are hidden until a future phase.                              |
| `/pos/reports`    | Date-range sales and tender reporting                               | No export, profit, inventory, or customer report UI yet.                                                 |
| `/pos/employees`  | Create employee accounts and manage access                          | Account creation needs the server-only Supabase service-role environment variable.                       |
| `/pos/account`    | Change the authenticated employee's password                        | Current-password verification is required; the user signs in again after a successful change.            |
| `/pos/settings`   | Location receipt/invoice presentation and default tax               | Payment-method and register-definition editors are not implemented here.                                 |

The POS uses a dedicated shell and scoped CSS under `src/app/pos`; Reyon's public storefront chrome is intentionally excluded from POS routes.

## 5. Implemented Feature Inventory

### 5.1 Register and Checkout

Implemented:

- product grid with location-specific available stock;
- name, SKU, and barcode search through the canonical catalog RPC;
- product selection, quantity changes, and line removal;
- user-and-location-scoped cart persistence in browser `localStorage` for navigation/reload continuity;
- fixed and percentage discounts;
- configurable tax rate;
- walk-in checkout or customer name/phone capture;
- sale notes;
- cash, card, mobile, and bank-transfer tender lines;
- required references for non-cash tenders;
- split/multiple tenders;
- quick-cash presets, change calculation, partial payment, and due amount;
- permission-gated due sales;
- transactional sale completion;
- immediate receipt modal, invoice identity, printing, history, and reprinting;
- mobile cart behavior and responsive POS navigation;
- keyboard-wedge barcode handling.

Authority boundary: the browser presents estimates and captures intent, but `public.pos_checkout` reloads authoritative catalog prices, locks stock, recalculates totals, validates permissions, and writes all evidence transactionally.

Not currently implemented as distinct POS actions:

- sale voiding;
- offline sale capture or offline synchronization;
- automatic card/mobile gateway capture;
- general keyboard shortcut coverage beyond barcode-scanner key handling.

### 5.2 Barcode

Implemented:

- deterministic Code 128B barcode generation and SVG rendering;
- validation of barcode input;
- search/add from keyboard-wedge hardware scanners;
- camera scanning through the browser `BarcodeDetector` API and device camera permission;
- printable product barcode labels;
- configurable label selection/quantity through the label component.

Camera support depends on browser/device implementation of `BarcodeDetector`; a provider library fallback is not present. Physical scanners, printers, cameras, label media, and print scaling still require live hardware verification.

### 5.3 Sales, Receipts, Invoices, and Returns

Implemented:

- physical POS orders in canonical `sales.orders` and `sales.order_lines`;
- `physical-pos` source/channel attribution;
- POS-specific immutable sale detail and tender evidence;
- canonical payment records, allocations, events, and receipts;
- canonical invoice generation through existing completed-sale behavior;
- searchable POS sales history;
- authorized receipt/invoice detail and reprint;
- customer association when a phone-backed customer is selected or created;
- return entry from POS into Reyon's existing return-review, inspection, refund, and stock-restoration workflow.

The POS does not implement a second return/refund system. There is no dedicated POS void workflow. Return live testing must prove that refund evidence and sellable-stock restoration follow existing canonical rules.

### 5.4 Products and CSV Import

Implemented:

- canonical product, variant, category, SKU, barcode, price, and stock display;
- product search through the register/catalog query;
- access to existing product create/edit/publication workflows under `/admin/products`;
- atomic CSV import of 1–100 watch products using `public.pos_bulk_import_products`;
- CSV import idempotency and changed-payload rejection;
- canonical watch creation through `public.admin_create_watch`;
- one selected brand, category, and existing media asset applied as import defaults;
- optional immediate publication after validation.

The CSV import is a catalog operation, not historical Autopilot migration. It does not import orders, customers, stock history, employees, or accounting data.

### 5.5 Inventory

Reyon's inventory ledger remains authoritative. Implemented POS-facing operations include:

- location-scoped stock position with on-hand, reserved, and available quantities;
- opening stock;
- purchase/receive stock entry;
- adjustment in;
- adjustment out;
- damage/loss;
- sale stock-out from `pos_checkout`;
- canonical supplier receiving and purchase returns through the existing purchasing modules;
- website availability refresh after authorized stock changes.

Manual POS movements call `public.pos_adjust_inventory`, which checks `inventory.adjust` and delegates to Reyon's existing `public.admin_record_inventory_movement`. It does not update a mutable POS balance.

### 5.6 Customers

Implemented:

- walk-in customer behavior;
- optional customer name and phone at checkout;
- existing-customer lookup by normalized phone;
- canonical CRM customer/profile/contact creation when no matching phone exists;
- canonical customer-order association;
- POS customer search and POS sales/spend summary.

Standalone customer profile editing, consent management, and advanced CRM functions are not present in the POS UI.

### 5.7 Suppliers and Purchasing

The POS purchasing hub provides capability-gated access to Reyon's existing authoritative modules for:

- supplier management;
- purchase orders;
- receiving and inspection;
- purchase returns;
- supplier payments.

Those modules continue to own receiving evidence, inventory movement, valuation, payable events, and supplier performance. They were reused rather than copied into a second POS backend.

### 5.8 Employees and Access

Implemented:

- direct employee account creation through Supabase Auth;
- full name, optional phone, administrator-supplied initial password, and active status;
- cashier, manager, inventory, accountant, and custom capability profiles over the existing `staff` role;
- default cashier/staff capability set;
- `staff`, `admin`, and `super-admin` role assignment;
- location assignment;
- capability selection and explicit override storage;
- activation/deactivation;
- protected POS login redirection;
- authenticated self-service password changes with current-password verification.

The employee form sends the administrator-selected initial password directly to Supabase Auth and never persists it in Reyon tables or logs. The configured temporary default is `123456`, and administrators can replace it before creation. Password changes require at least eight characters. The service-role credential is read only by `src/lib/supabase/admin.ts`, which is server-only. If access/profile assignment fails after account creation, the server removes only that newly-created Auth user as compensation.

### 5.9 Registers and Shifts

Implemented:

- a seeded Main Register for the Main Inventory location;
- register/location ownership validation;
- opening cash;
- one-open-shift-per-register enforcement;
- operator attribution;
- cash-in and cash-out events with positive amount, reason, and idempotency key;
- sales associated with shifts;
- expected closing cash from opening cash, cash tender, and cash events;
- closing count, variance, optional close note, and shift history.

Register creation/editing and multi-register administration UI are not implemented in the POS settings page.

**Register/Shift functionality is implemented architecturally but temporarily frozen. Current POS operation does not require an active shift. Shift/cash-session functionality is reserved for a future phase.** Existing shift tables, functions, capability keys, components, and historical records remain intact. New sales retain their register association while `shift_id` is null during the freeze.

### 5.10 Reports

Implemented in `/pos/reports`:

- location POS sale count;
- revenue;
- discounts on the dashboard;
- tax;
- outstanding due;
- payment/tender breakdown;
- product quantity and revenue breakdown;
- cashier sale/revenue breakdown;
- channel sale/revenue comparison;
- date range;
- selected POS location context.

Not implemented in the POS report page:

- profit or margin report;
- inventory report;
- customer report;
- downloadable/export files;
- advanced accounting statements.

The current channel-comparison query is broader than the location-only POS aggregates and requires explicit multi-organization/multi-location security review before topology expands.

### 5.11 Settings

Implemented location-scoped receipt settings:

- business/receipt name;
- phone;
- address;
- currency symbol;
- default tax rate;
- 58mm, 80mm, or A4 receipt/invoice format;
- logo URL;
- receipt footer;
- return policy text.

Payment-method configuration, register definitions, invoice numbering policy, hardware configuration, and general store configuration are not editable from this POS settings form.

## 6. Canonical Database Architecture

### 6.1 Existing Domain Authority

The POS migration builds on, and does not replace, these canonical areas:

| Domain              | Authoritative entities used by POS                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `catalog`           | `products`, `variants`, product/category relationships, media, channel offers, watch details                   |
| `organization`      | organizations, locations, channels, location-channel relationships                                             |
| `inventory`         | `stock_items`, `movements`, `movement_lines`, `reservations`, `stock_position`, valuation evidence             |
| `sales`             | `orders`, `order_lines`, `order_transitions`, completed sales, invoices                                        |
| `payments`          | payment records, order allocations, payment events, receipts, return refunds                                   |
| `crm`               | customers, profiles, contacts, external identities, order associations, customer events                        |
| `reverse_logistics` | return requests, lines, evidence, inspection, events                                                           |
| `purchasing`        | suppliers, purchase orders, receipts, returns, payments, performance evidence                                  |
| `accounting`        | configuration, financial accounts, posting mappings, journal entries/lines, valuation and payable consequences |
| `access`            | admin membership plus POS role, capability, override, and location-assignment controls                         |

### 6.2 POS Operating Migration

`supabase/migrations/20260915100000_pos_operating_foundation.sql` is an additive migration that:

- adds the `physical-pos` organization channel and links existing Reyon locations;
- introduces capability definitions, role defaults, user overrides, and location assignments;
- introduces the private `pos` schema;
- enables RLS on POS/access tables and denies direct `anon`/`authenticated` table access;
- grants authenticated users only the named security-definer RPC surface;
- seeds the Main Register and receipt settings for the existing main location;
- adds immutable/evidence controls and reloads the PostgREST schema cache.

POS-owned entities:

| Entity                            | Purpose                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pos.registers`                   | Register identity scoped to organization and location                                                              |
| `pos.shifts`                      | Opening/closing cash, operator, expected cash, and variance                                                        |
| `pos.cash_events`                 | Immutable cash-in/out evidence                                                                                     |
| `pos.sale_details`                | POS-specific order, register, shift, operator, tax, tender/change/due, customer snapshot, and idempotency evidence |
| `pos.tenders`                     | Immutable tender lines and references associated with canonical payments/orders                                    |
| `pos.receipt_settings`            | Location receipt/invoice presentation defaults                                                                     |
| `pos.catalog_imports`             | Atomic CSV request/result and idempotency evidence                                                                 |
| `pos.migration_staging_batches`   | Empty staging header for separately approved future migration/reconciliation                                       |
| `pos.migration_identity_mappings` | Future source-to-canonical identity mapping evidence                                                               |

Public authenticated RPC surface:

- `pos_context`
- `pos_catalog`
- `pos_open_shift`
- `pos_record_cash_event`
- `pos_close_shift`
- `pos_checkout`
- `pos_receipt`
- `pos_sales`
- `pos_dashboard`
- `pos_shift_history`
- `pos_customers`
- `pos_save_settings`
- `pos_settings`
- `pos_adjust_inventory`
- `pos_staff`
- `pos_set_staff_access`
- `pos_bulk_import_products`

### 6.3 Checkout Transaction

`public.pos_checkout(jsonb)` performs one database transaction:

1. Requires an authenticated caller and idempotency key.
2. Returns the existing receipt for a successful retry.
3. Checks `pos.checkout` for the selected location.
4. Validates register ownership. Active-shift validation is temporarily frozen.
5. Aggregates requested variants in deterministic UUID order.
6. Locks canonical `inventory.stock_items` rows with `FOR UPDATE`.
7. Reloads published products, location stock position, and `physical-pos` price with `website` fallback.
8. Rejects non-positive/non-whole quantities, unsaleable items, and insufficient stock.
9. Recalculates gross, discount, tax, total, tendered, change, and due.
10. Checks `pos.record_due` when payment is incomplete.
11. Finds or creates canonical CRM evidence when a phone is supplied.
12. Creates canonical completed order and order lines under `physical-pos`.
13. Creates one canonical sale movement and negative movement lines.
14. Creates canonical payment records, allocations, payment events, and receipts for applied tender amounts.
15. Creates immutable POS sale/tender evidence and customer association.
16. Adds the completed transition, invoking existing invoice, completed-sale, valuation/COGS, and accounting behavior.
17. Returns the authorized receipt projection.

If accounting configuration/posting fails, the complete checkout rolls back. Unique-key retry handling returns the already-created receipt rather than duplicating stock, order, or financial evidence.

### 6.4 CSV Import Transaction

`public.pos_bulk_import_products(uuid,text,jsonb)`:

- requires `catalog.manage` for the location;
- accepts 1–100 rows;
- treats the idempotency key and exact request payload as one command identity;
- returns prior product IDs for an identical retry;
- rejects reuse of the key with different input;
- calls the existing canonical `public.admin_create_watch` operation for each row;
- records canonical product IDs in `pos.catalog_imports`;
- rolls back the entire function if any row fails.

## 7. Authentication and Authorization

### 7.1 Request Flow

- Next.js proxy session handling applies to `/admin/:path*` and `/pos/:path*`.
- `requirePosAccess()` obtains verified Supabase Auth claims server-side.
- Unauthenticated users are redirected to `/admin/login?next=/pos`.
- Login accepts only safe `/admin` or `/pos` destinations.
- `pos_context` returns only locations assigned to the authenticated member and their effective capabilities.
- Selected location is stored in an HTTP-only, same-site cookie scoped to `/pos`; server code validates it against the assigned-location list.
- Server actions call database RPCs. The database repeats authorization checks for privileged mutations.

### 7.2 Capability Model

Exact capabilities currently defined:

- `pos.access`
- `pos.checkout`
- `pos.refund`
- `pos.open_shift`
- `pos.close_shift`
- `pos.cash_event`
- `pos.record_due`
- `inventory.view`
- `inventory.adjust`
- `catalog.manage`
- `purchasing.manage`
- `customers.manage`
- `staff.manage`
- `settings.manage`
- `reports.financial`

`super-admin` and `admin` receive all defined capabilities by role. `staff` defaults to `pos.access`, `pos.checkout`, `pos.open_shift`, `pos.close_shift`, `pos.cash_event`, `inventory.view`, and `customers.manage`. Per-member grants/denials can override role defaults. Location assignment is separately required for location-scoped operations.

The design is deny-by-default: absence of valid authentication, active membership, capability, or location assignment denies the operation. POS tables are not directly writable by authenticated browser clients.

### 7.3 Security Properties to Preserve

- Privileged authorization must remain server/database enforced.
- Client totals, roles, location IDs, prices, stock, and payment success are untrusted input.
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only and must never use a `NEXT_PUBLIC_` name.
- Payment instruments, CVV/PIN, provider credentials, and plaintext passwords must never enter POS tables or logs.
- Retryable stock/financial commands must retain idempotency.
- Stock rows must remain locked and checked within the same transaction that records the sale.
- RLS plus revoked table privileges must not be weakened to make UI integration easier.

## 8. Inventory: Sole Source of Truth

**Reyon inventory is the only inventory source of truth.**

Neither the POS nor the website may keep an independent authoritative balance. Cart persistence is presentation state only. All stock-changing operations must create authorized evidence through Reyon's inventory workflows.

Current invariant:

```text
on-hand = sum of canonical inventory movement-line deltas
reserved = sum of active canonical reservations
available = on-hand - reserved
```

Website confirmation creates canonical reservations. POS checkout reads `inventory.stock_position`, locks the corresponding stock items, and records canonical sale movements. The tested concurrency contract is that a website reservation and a POS sale—or two simultaneous POS attempts—cannot both consume the same final available unit.

Inventory is partitioned by physical/operating location. Channel attribution belongs to the order; it does not create channel-owned stock.

## 9. Payments, Accounting, and Financial Authority

- The database calculates authoritative sale totals.
- Each applied tender creates canonical payment evidence and an order allocation.
- Non-cash tenders require a transaction reference, but the POS does not claim automatic provider verification or gateway settlement.
- Tender detail is retained in immutable `pos.tenders`; canonical payment evidence remains under `payments`.
- Invoice and completed-sale evidence remains under `sales`.
- Existing completed-sale accounting and weighted-average COGS behavior remains authoritative.
- Checkout is activation-gated by existing accounting configuration; posting failure rolls back the sale rather than leaving partial stock/order/payment evidence.
- Returns/refunds must use the existing canonical return and refund evidence instead of editing prior sale/payment rows.

Finance must review production account mappings, tender clearing/reconciliation policy, due/receivable treatment, tax treatment, and close procedures before financial reports are treated as fully approved operational statements.

## 10. Testing and Verification Record

Implementation verification recorded before deployment:

| Check                                     | Result              |
| ----------------------------------------- | ------------------- |
| Prettier formatting check                 | PASS                |
| ESLint                                    | PASS, zero warnings |
| TypeScript                                | PASS                |
| Domain tests                              | 44 passed, 0 failed |
| Fresh PostgreSQL migration/database tests | 9 passed, 0 failed  |
| Responsive POS browser tests              | 3 passed, 0 failed  |
| Production build                          | PASS                |
| `/pos` route compilation                  | PASS                |
| Secret scan                               | PASS                |
| `git diff --check`                        | PASS                |

The POS database suite verifies:

- anonymous and unassigned denial;
- staff role defaults and explicit denial overrides;
- atomic/idempotent canonical CSV import;
- canonical, transactional, receipted, idempotent checkout;
- complete rollback when accounting posting fails;
- website reservation versus POS checkout stock safety;
- two POS attempts for the last stock unit;
- complete fresh migration execution and existing storefront boundaries.

The responsive POS browser specification validates shell/register layout at configured desktop, tablet, and mobile Playwright projects. It does not replace live authenticated hardware and workflow testing.

These results are implementation and pre-deployment evidence. They do **not** prove full production functionality, accounting correctness for merchant policy, physical hardware compatibility, or complete live regression coverage.

## 11. Deployment and Repository State

Recorded production deployment:

- Vercel project: `reyon-online`
- Deployment: `dpl_HZ13zqfCWqqKF9Snfz7dum9fG69M`
- Deployment URL: `https://reyon-online-70h2ou1qz-md-masum-billahs-projects-9d6a5d49.vercel.app`
- Canonical alias preserved: `https://reyon-online.vercel.app`
- Vercel state: `READY`
- Production build: successful
- Production Supabase migration: `20260915100000` applied and confirmed in remote migration history
- Production server environment: `SUPABASE_SERVICE_ROLE_KEY` configured as a Vercel secret for employee account administration
- Basic `/` response: HTTP 200
- Basic `/pos` response: HTTP 307 to `/admin/login` when unauthenticated; redirect-following response HTTP 200

Not yet complete:

- authenticated production POS functional test;
- production sale/return/shift/employee/hardware test matrix;
- full storefront/admin regression in production;
- remote Git publication of commit `99d4ca8...` due to missing GitHub credentials at deployment time.

The direct Vercel deployment is real, but the milestone must not be called fully **released** under `docs/26_DELIVERY_ASSURANCE.md` until the exact commit is present remotely and the required live verification is recorded.

The pre-existing local `next-env.d.ts` modification remains outside POS implementation scope and was intentionally not included in the POS commit.

## 12. Production Live Test Plan

Use controlled test products, a dedicated test employee, approved financial configuration, and quantities that can be reconciled. Capture order, invoice, receipt, movement, payment, shift, and accounting identifiers for cleanup by forward correction—not destructive deletion.

### Basic Navigation and Register

- [ ] Sign in with an assigned POS employee and open `/pos`.
- [ ] Verify denied access for an authenticated user without `pos.access`.
- [ ] Verify dashboard, register, location selector, and navigation.
- [ ] Search by product name, SKU, and barcode.
- [ ] Add a product, increase/decrease quantity, and remove it.
- [ ] Navigate away/back and confirm user/location-scoped cart preservation.
- [ ] Confirm unavailable products cannot be oversold.

### Checkout

- [ ] Cash-only checkout.
- [ ] Card evidence with required reference.
- [ ] Mobile evidence with required reference.
- [ ] Split tender.
- [ ] Quick-cash amount and change.
- [ ] Authorized partial/due sale and unauthorized due denial.
- [ ] Fixed and percentage discount boundaries.
- [ ] Tax calculation and configured default.
- [ ] Walk-in and named/phone customer.
- [ ] Sale notes.
- [ ] Retry the same idempotency identity and confirm one sale/stock movement.

### Sale Documents

- [ ] Complete sale and capture order/invoice/receipt IDs.
- [ ] Verify receipt content, tender detail, change/due, cashier, location, and register.
- [ ] Print 58mm, 80mm, and A4 formats as applicable.
- [ ] Reprint from sales history.
- [ ] Search sales by order/customer/phone.

### Barcode and Hardware

- [ ] Generate and print a Code 128 label.
- [ ] Scan the label with the intended hardware scanner.
- [ ] Scan through the intended mobile/tablet camera and browser.
- [ ] Confirm unsupported camera/browser messaging.
- [ ] Verify printer size, margins, readability, and scan reliability.

### Inventory and Cross-Channel Concurrency

- [ ] Record stock before the sale.
- [ ] Verify exactly one canonical stock-out after sale.
- [ ] Record authorized opening stock/adjustment in/adjustment out/damage-loss.
- [ ] Receive stock through canonical purchasing.
- [ ] Start a real website checkout reservation and a competing POS sale for the same final unit; verify only one succeeds.
- [ ] Confirm website stock display updates after POS movement.
- [ ] Confirm POS stock display respects active website reservations.

### Returns and Refunds

- [ ] Start from a POS sale and create the approved return request.
- [ ] Review, receive, and inspect the return.
- [ ] Verify only approved sellable quantity restores stock.
- [ ] Execute refund evidence and confirm reporting/accounting consequences.
- [ ] Confirm original sale/payment evidence remains immutable.

### Employees and Authorization

- [ ] Create an employee with a controlled temporary password.
- [ ] Confirm the employee can sign in immediately without an email invitation.
- [ ] Assign staff role and location.
- [ ] Sign in and verify default cashier capabilities.
- [ ] Test each sensitive capability grant and denial.
- [ ] Verify cross-location denial.
- [ ] Deactivate the employee and verify access is revoked.
- [ ] Exercise password reset/change.
- [ ] Confirm a non-super-admin cannot improperly grant super-admin access.

### Registers and Shifts — Future/Pending

- [ ] Re-enable shift enforcement through an additive migration and explicit feature decision.
- [ ] Restore the hidden shift navigation and operating controls.
- [ ] Open register with opening cash and confirm duplicate-open rejection.
- [ ] Record cash-in/cash-out, close with counted cash, and verify variance/history.
- [ ] Confirm future shift-linked sales while retaining compatibility with unshifted sales from this frozen phase.

### Reports

- [ ] Verify sale count, revenue, discounts, tax, and due against source sales.
- [ ] Verify tender totals.
- [ ] Verify product and cashier breakdowns.
- [ ] Verify website/physical channel comparison semantics.
- [ ] Verify date boundaries in Asia/Dhaka.
- [ ] Verify assigned-location behavior and denial.

### Existing Reyon Regression

- [ ] Storefront collections, search, product detail, images, and stock.
- [ ] Cart quantity and persistence.
- [ ] Website checkout, reservations, payment selection, and order success.
- [ ] Customer account/aftercare.
- [ ] Admin catalog/media/inventory.
- [ ] Order, delivery, return, purchasing, payment, and accounting workflows.
- [ ] No unexpected console errors or failed requests.

### Responsive Matrix

- [ ] 320px
- [ ] 375px
- [ ] 390px
- [ ] 414px
- [ ] 768px
- [ ] 1024px
- [ ] 1280px and wider

At each size verify navigation, product grid, cart access, checkout modal, tender lines, camera modal, tables, receipts, and print controls without horizontal-page overflow or unreachable actions.

## 13. Known Limitations and Remaining Work

### P0 — Required Before Production Confidence

1. Authenticate GitHub and push the current `main`, then verify remote commit identity and CI.
2. Execute and record the authenticated live test plan above, including a controlled shift-free sale, rollback-safe correction plan, receipt, and stock evidence.
3. Perform full role/capability/location tests against production-safe test users, including privilege-escalation and cross-location denial.
4. Perform a focused production security review of every POS security-definer RPC, employee creation flow, service-role usage, and report scope.
5. Validate live POS-versus-website concurrency using controlled final-unit stock.
6. Reconcile production accounting mappings and tender/due policy with Finance before relying on POS financial output.
7. Validate returns/refunds through stock restoration and accounting evidence.
8. Verify all existing Reyon storefront/admin workflows after the direct production deployment.

### P1 — Important Hardening

1. Add authenticated end-to-end tests for register, shift-free checkout, staff, reports, returns, and settings.
2. Add production observability for RPC failures, idempotency conflicts, stock rejection, accounting exceptions, and account-creation failures without logging secrets or customer-sensitive data.
3. Review channel-comparison report scope for multi-organization and multi-location safety.
4. Add explicit report timezone/date-boundary contract tests.
5. Strengthen CI/CD so remote commit, migration state, Vercel deployment, alias, and smoke checks are captured as release evidence.
6. Document and exercise forward recovery for failed deployment, migration, checkout, and employee-creation scenarios.
7. Validate receipt/label printing on supported physical devices and browsers.

### P2 — Product Improvements

1. Add approved POS profit/margin, inventory, customer, and export reports.
2. Add POS-native product editing only if it can reuse canonical catalog commands without duplicating lifecycle rules.
3. Add POS-native return orchestration only as a presentation over the canonical return domain.
4. Add register administration and hardware/profile settings.
5. Add approved payment configuration and reconciliation views.
6. Improve accessibility and keyboard workflow coverage beyond scanner input.
7. Add camera-scanner fallback support if approved browser coverage requires it.
8. Re-enable register/shift and cash-session operation when the future phase is approved.

### P3 — Future / Optional

1. Additional scanner, printer, cash-drawer, scale, customer-display, and terminal integrations.
2. Advanced multi-store, transfer, count, replenishment, and register-fleet capabilities.
3. Advanced workforce scheduling and approval separation.
4. Advanced operational/financial analytics and accounting integrations.
5. Offline operation only if an explicit conflict, security, and reconciliation architecture is approved.
6. Controlled historical Autopilot data migration/reconciliation, separately authorized.

## 14. Historical Data Migration Policy

No historical Autopilot production data was migrated during this integration.

Any future migration must be a separately approved, staged reconciliation process with:

- immutable source-export identity and checksum/count evidence;
- source-to-canonical identity mappings;
- exact SKU/barcode matching where trustworthy;
- verified attribute matching;
- manual review for ambiguous identities;
- no name-only automatic merge;
- validation before canonical writes;
- documented reject/quarantine paths;
- pre/post counts and financial/inventory reconciliation;
- physical stock count and cutover plan;
- idempotent import batches;
- rollback by compensating/forward correction, not destructive reset;
- one final writable inventory: Reyon.

The empty `pos.migration_staging_batches` and `pos.migration_identity_mappings` tables reserve evidence structure only. Their existence is not approval to import or synchronize data.

## 15. Important File Map

| Path                                                              | What it does / why it exists                                                             | What must not be broken                                                                                         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `PROJECT_MASTER.md`                                               | Authoritative POS integration handoff, state, rules, and plan                            | Keep implementation/deployment claims current and distinguish verified from pending.                            |
| `src/app/pos/`                                                    | POS routes, layout, and scoped presentation                                              | Preserve `/pos` authentication, route compatibility, responsive behavior, and isolation from storefront chrome. |
| `src/app/pos/pos.css`                                             | Autopilot-inspired POS visual system and print/responsive rules                          | Do not casually merge into storefront styles or break receipt/label printing.                                   |
| `src/features/pos/actions.ts`                                     | Server actions for checkout, shifts, cash, inventory, settings, staff, and import        | Never move privileged trust to the browser; preserve RPC authorization and cache refreshes.                     |
| `src/features/pos/data/pos-access.ts`                             | Verified session, capability context, and selected-location handling                     | Never trust an arbitrary location cookie without assigned-location validation.                                  |
| `src/features/pos/data/pos-data.ts`                               | Typed read access to POS RPC projections                                                 | Keep reads on authorized projections rather than direct private-schema access.                                  |
| `src/features/pos/components/pos-register.tsx`                    | Register/cart/search/scanner/checkout orchestration                                      | Cart is non-authoritative UI state; server checkout must remain authoritative.                                  |
| `src/features/pos/components/checkout-modal.tsx`                  | Customer, discount, tax, tender, quick-cash, due, and notes UI                           | Client calculations are presentation only; do not treat them as posted truth.                                   |
| `src/features/pos/components/product-csv-import.tsx`              | CSV parsing and canonical import command submission                                      | Keep import bounded, validated, idempotent, and atomic in the database.                                         |
| `src/features/pos/domain/barcode-engine.ts`                       | Ported/adapted Code 128 generation and validation                                        | Preserve deterministic output and safe input constraints.                                                       |
| `src/features/pos/hooks/use-barcode-scanner.ts`                   | Keyboard-wedge scanner handling                                                          | Avoid swallowing ordinary typing or duplicating sale submission.                                                |
| `src/features/pos/components/camera-barcode-scanner.tsx`          | Camera and `BarcodeDetector` interaction                                                 | Preserve permission cleanup and unsupported-browser handling.                                                   |
| `src/features/pos/components/receipt-*.tsx`                       | Receipt/invoice display, print, and reprint                                              | Preserve canonical values and print formats; do not recalculate financial truth.                                |
| `src/features/pos/components/staff-table.tsx`                     | Direct employee creation and access-management UI                                        | Send initial passwords only to the server action; never persist or log them.                                    |
| `src/lib/supabase/admin.ts`                                       | Server-only service-role client used for Auth account administration                     | Must remain server-only; never import into client components.                                                   |
| `src/proxy.ts`                                                    | Session middleware matcher for `/admin` and `/pos`                                       | Keep protected POS routes within Supabase session refresh.                                                      |
| `src/app/admin/login/`                                            | Shared admin/POS login and safe return destination                                       | Do not allow open redirects or bypass `is_reyon_admin`.                                                         |
| `supabase/migrations/20260915100000_pos_operating_foundation.sql` | Entire additive POS operating schema, capability model, and RPC contract                 | Never rewrite an applied migration; add a new migration for future changes.                                     |
| `tests/database/pos.test.mjs`                                     | Fresh-schema authorization, transaction, idempotency, rollback, and concurrency evidence | Retain real database behavior and cross-channel race tests.                                                     |
| `tests/domain/pos-*.test.ts`                                      | Static architecture plus barcode/quick-cash behavior                                     | Do not weaken assertions to conceal architectural drift.                                                        |
| `tests/e2e/pos-responsive.spec.ts`                                | Desktop/tablet/mobile POS layout contract                                                | Extend with authenticated flows rather than treating layout-only checks as full E2E.                            |
| `src/features/catalog/` and admin product routes                  | Canonical product, variant, media, price, publication operations                         | POS must reuse these rules instead of creating another master.                                                  |
| `src/features/inventory/` and inventory migrations                | Canonical movement/position/reservation operations                                       | No direct balance edits or POS-owned stock table.                                                               |
| `src/features/orders/`, `src/features/sales/`, sales migrations   | Canonical orders, transitions, completed sales, invoices                                 | POS orders must remain compatible with shared lifecycle/accounting effects.                                     |
| payment migrations and admin payment routes                       | Canonical payment, allocation, receipt, verification, refund evidence                    | Never store payment credentials or claim unverified gateway success.                                            |
| `src/features/purchasing/` and purchasing admin routes            | Canonical suppliers, PO, receiving, return, payment, performance workflows               | No duplicated POS purchasing ledger.                                                                            |
| accounting migrations and admin accounts routes                   | Configuration, journals, COGS, valuation, payables                                       | POS checkout must fail atomically if required posting cannot complete.                                          |
| `docs/05_INVENTORY_SYSTEM.md`                                     | Detailed inventory policy and history                                                    | Keep available/on-hand/reservation semantics aligned.                                                           |
| `docs/08_DATABASE_ARCHITECTURE.md`                                | Cross-domain data ownership                                                              | POS-specific changes must respect domain ownership.                                                             |
| `docs/26_DELIVERY_ASSURANCE.md`                                   | Definitions for validated, published, deployed, verified, and released                   | Do not call deployment alone a completed release.                                                               |

## 16. NON-NEGOTIABLE PRODUCTION RULES

1. Never create a second inventory source.
2. Never bypass Reyon's canonical inventory ledger.
3. Never trust client-calculated totals for authoritative financial records.
4. Never bypass server/database authorization.
5. Never store plaintext passwords.
6. Never use service-role credentials in browser/client code.
7. Never perform destructive database resets against production.
8. Never silently modify existing Reyon accounting, order, payment, return, or inventory semantics.
9. Never create permanent two-way synchronization with Autopilot.
10. Never modify standalone Autopilot while working on Reyon unless explicitly requested.
11. Database changes must be additive and migration-backed; never edit an already-applied production migration.
12. Preserve production data and use forward correction or compensating evidence.
13. Use idempotency for retryable financial, stock-changing, cash, and import commands.
14. Stock-changing operations must be transactional.
15. Verify active membership, capability, organization/location scope, and resource ownership before privileged operations.
16. Never expose private payment data, provider secrets, service credentials, or customer-sensitive data in logs, tests, or reports.
17. Never call a deployment fully released without remote commit evidence and required live verification.

## 17. Decision Log

| Decision                                                                                  | Why                                                                                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Reyon is the primary application.                                                         | The public store and business operations already live here; splitting authority would increase risk and operational ambiguity. |
| Reyon's Supabase database is canonical.                                                   | One source of truth prevents stock, order, payment, customer, return, and accounting divergence.                               |
| POS is integrated under `/pos`.                                                           | Staff receive a dedicated POS experience without creating or deploying another Reyon backend.                                  |
| Autopilot remains standalone.                                                             | It retains independent product/SaaS potential and can evolve without coupling production data or deployments.                  |
| Autopilot UX concepts were adapted.                                                       | Proven register interactions are valuable, while implementation must fit Reyon's security and domain contracts.                |
| Autopilot backend architecture was not copied.                                            | Reyon requires transactional, authorized, idempotent operations over canonical domains.                                        |
| Inventory is location-based and singular.                                                 | Channels represent where a sale originated; they must not own separate stock.                                                  |
| Website and POS are sibling channels.                                                     | Both sell the same products and compete for the same available stock.                                                          |
| POS-specific tables hold operating evidence only.                                         | Registers, shifts, tenders, and settings are POS concerns; catalog/orders/payments remain shared.                              |
| No historical Autopilot migration was included.                                           | Identity matching, reconciliation, stock cutover, and financial verification need separate approval and evidence.              |
| Future migration must be staged and reconciled.                                           | Silent or name-only merging could corrupt canonical records and stock.                                                         |
| Existing Reyon admin workflows are reused for returns/purchasing/full catalog management. | Reuse preserves authoritative lifecycle and accounting behavior while avoiding duplicate implementations.                      |

## 18. Recommended Continuation Order

1. Publish the existing POS commit to the remote `main` without rewriting history.
2. Confirm CI on the exact remote commit.
3. Run P0 security and configuration review, especially RPC scopes, service-role use, reporting, tender clearing, due, and accounting.
4. Create production-safe test identities/products/stock and an evidence/forward-correction plan.
5. Execute basic authenticated POS, authorization, shift, checkout, receipt, and inventory tests.
6. Execute website-versus-POS final-unit concurrency testing.
7. Execute returns/refunds and employee lifecycle testing.
8. Complete storefront/admin regression and responsive/hardware checks.
9. Record evidence and resolve P0 findings through additive changes and new migrations.
10. Only then prioritize P1 hardening, P2 product improvements, or P3 future capabilities.

## 19. NEXT DEVELOPER / CODEX START HERE

1. Read this master document completely.
2. Inspect `git status`, the current branch, local/remote divergence, and the last commit. Preserve unrelated user changes, especially the existing `next-env.d.ts` modification unless scope explicitly changes.
3. Read the relevant domain documents under `docs/`, especially inventory, database architecture, payments, returns, purchasing, accounting, and delivery assurance.
4. Inspect `src/app/pos` and `src/features/pos`; do not infer features from route names alone.
5. Inspect local and linked production migration history before any database change.
6. Run the existing quality, database, and relevant browser tests before changing behavior.
7. Identify the exact requested task and its owning canonical domain.
8. Do not duplicate functionality already provided by Reyon admin/domain modules.
9. Preserve Reyon's canonical catalog, inventory, order, payment, CRM, return, purchasing, and accounting systems.
10. Implement database changes through a new additive migration; never edit the applied POS migration.
11. Keep privileged work server/database authorized, transactional, location-scoped, and idempotent.
12. Run formatting, lint, TypeScript, domain, database, build, and proportional browser/concurrency tests.
13. Update this document when implementation, migration, deployment, verification, limitation, or roadmap state changes.
14. Record the exact commit, remote publication, migration, deployment, URL, and live verification evidence.
15. Never claim a feature, deployment, or release is complete without matching verification evidence.
