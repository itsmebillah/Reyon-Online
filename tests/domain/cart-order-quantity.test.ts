import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const confirmation = readFileSync(
  new URL(
    "../../supabase/migrations/20260811210000_order_confirmation.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const consumption = readFileSync(
  new URL(
    "../../supabase/migrations/20260814060000_cart_order_consumption_integrity.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const queryFix = readFileSync(
  new URL(
    "../../supabase/migrations/20260814061000_cart_order_consumption_query_fix.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

test("order lines and reservations use the same persisted cart quantity", () => {
  assert.match(consumption, /item\.quantity, item\.price_amount/);
  assert.match(consumption, /item\.price_amount \* item\.quantity/);
  assert.match(
    consumption,
    /reservation_id, item\.stock_item_id, v_location_id, item\.quantity/,
  );
  assert.match(consumption, /coalesce\(item\.available, 0\) < item\.quantity/);
  assert.match(confirmation, /item\.quantity\)/);
});

test("insufficient stock aborts before an order or reservation is created", () => {
  const insufficientGuard = consumption.indexOf("insufficient stock for");
  const orderInsert = consumption.indexOf("insert into sales.orders");
  const reservationInsert = consumption.indexOf(
    "insert into inventory.reservations",
  );
  assert.ok(insufficientGuard > -1);
  assert.ok(insufficientGuard < orderInsert);
  assert.ok(insufficientGuard < reservationInsert);
  assert.doesNotMatch(consumption, /confirmation-exception/);
});

test("successful checkout archives one cart snapshot and creates a fresh cart", () => {
  assert.match(consumption, /set access_token = consumed_token/);
  assert.match(consumption, /consumed_order_id = v_order_id/);
  assert.match(consumption, /insert into commerce\.cart_consumptions/);
  assert.match(
    consumption,
    /insert into commerce\.carts\(access_token, customer_id\)/,
  );
  assert.match(consumption, /'successaccesstoken', consumed_token/);
});

test("empty-cart retries return the existing order without duplicating it", () => {
  assert.match(consumption, /if existing_order is not null then/);
  assert.match(consumption, /'idempotent', true/);
  assert.match(consumption, /order by cc\.consumed_at desc limit 1/);
});

test("cart snapshot ordering uses the composite-key variant column", () => {
  assert.match(queryFix, /ci\.created_at, ci\.variant_id/);
  assert.doesNotMatch(
    queryFix,
    /execute replace\([\s\S]*'ci\.created_at, ci\.variant_id',[\s\S]*'ci\.created_at, ci\.id'/,
  );
});
