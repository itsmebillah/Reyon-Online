import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260915100000_pos_operating_foundation.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const shiftFreeze = readFileSync(
  new URL(
    "../../supabase/migrations/20260916210000_pos_shift_requirement_freeze.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

test("POS uses Reyon canonical orders, inventory, payments and channel", () => {
  assert.match(migration, /'physical-pos'/);
  assert.match(migration, /insert into sales\.orders/);
  assert.match(migration, /insert into inventory\.movements/);
  assert.match(migration, /insert into inventory\.movement_lines/);
  assert.match(migration, /insert into payments\.payment_records/);
  assert.match(migration, /insert into payments\.order_allocations/);
  assert.match(migration, /join inventory\.stock_position/);
});

test("checkout is deny-first, idempotent and locks canonical stock", () => {
  assert.match(migration, /auth\.uid\(\) is null/);
  assert.match(migration, /access\.has_capability\('pos\.checkout'/);
  assert.match(migration, /for update/);
  assert.match(migration, /pos-order:'\|\|v_idempotency/);
  assert.match(migration, /pos-stock:'\|\|v_idempotency/);
});

test("migration stages future reconciliation without importing Autopilot", () => {
  assert.match(migration, /migration_staging_batches/);
  assert.match(migration, /migration_identity_mappings/);
  assert.doesNotMatch(migration, /autopilot.*insert into/);
  assert.doesNotMatch(
    migration,
    /create table (public\.)?(products|sales|sale_items|stock)\b/,
  );
});

test("catalog CSV import is canonical, atomic and retry-safe", () => {
  assert.match(migration, /function public\.pos_bulk_import_products/);
  assert.match(migration, /public\.admin_create_watch\(row_data\)/);
  assert.match(migration, /idempotency_key text not null unique/);
  assert.match(migration, /existing\.request_rows<>p_rows/);
});

test("shift enforcement is frozen without creating an alternate checkout", () => {
  assert.match(shiftFreeze, /alter column shift_id drop not null/);
  assert.match(shiftFreeze, /create or replace function public\.pos_checkout/);
  assert.match(shiftFreeze, /access\.has_capability\('pos\.checkout'/);
  assert.match(shiftFreeze, /insert into sales\.orders/);
  assert.match(shiftFreeze, /insert into inventory\.movements/);
  assert.match(shiftFreeze, /insert into payments\.payment_records/);
  assert.doesNotMatch(shiftFreeze, /an open shift is required/);
  assert.doesNotMatch(shiftFreeze, /drop table pos\.shifts/);
});
