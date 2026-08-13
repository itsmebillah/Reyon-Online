import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260814050000_admin_order_lifecycle_stabilization.sql",
    import.meta.url,
  ),
  "utf8",
);

test("generic Order controls cannot bypass Delivery or Return evidence", () => {
  assert.match(migration, /Record courier pickup and handoff evidence/);
  assert.match(migration, /Proof of Delivery is required/);
  assert.match(
    migration,
    /Record the delivery exception in Delivery Operations/,
  );
  assert.match(migration, /Use the approved Returns and Refunds workflow/);
  assert.match(migration, /fulfillment\.proof_of_delivery/);
  assert.match(migration, /reverse_logistics\.return_requests/);
});

test("cancellation and review recovery preserve lifecycle and inventory audit", () => {
  assert.match(migration, /admin_record_delivery_exception/);
  assert.match(
    migration,
    /After courier pickup, use the Delivery or Return workflow/,
  );
  assert.match(migration, /reserve_order_after_review/);
  assert.match(migration, /inventory\.reservation_events/);
  assert.match(migration, /order_exception_opens_review/);
  assert.match(migration, /terminal_delivery_exception_updates_order/);
});

test("order detail exposes only workflow-owned transition controls", () => {
  assert.doesNotMatch(
    migration.match(/'allowedTransitions',[\s\S]*?'workflow'/)?.[0] ?? "",
    /\('packed','shipped'\)/,
  );
  assert.match(migration, /'deliveryRequired'/);
  assert.match(migration, /'returnsRequired'/);
});
