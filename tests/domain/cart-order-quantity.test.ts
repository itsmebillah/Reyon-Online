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

test("order lines and reservations use the same persisted cart quantity", () => {
  assert.match(confirmation, /item\.quantity\)/);
  assert.match(confirmation, /v_location_id,item\.quantity,'checkout-order'/);
  assert.match(confirmation, /item\.price_amount\*item\.quantity/);
  assert.match(confirmation, /if item\.available<item\.quantity/);
});
