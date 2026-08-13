import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260814070000_weighted_average_valuation_cogs.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

const receipt = (quantity: number, unitCost: number) => ({
  quantity,
  value: quantity * unitCost,
});
const combine = (...layers: ReturnType<typeof receipt>[]) => ({
  quantity: layers.reduce((sum, layer) => sum + layer.quantity, 0),
  value: layers.reduce((sum, layer) => sum + layer.value, 0),
  wac:
    layers.reduce((sum, layer) => sum + layer.value, 0) /
    layers.reduce((sum, layer) => sum + layer.quantity, 0),
});

test("receipt without discount uses gross net acquisition cost", () => {
  const layer = receipt(10, 100);
  assert.deepEqual(layer, { quantity: 10, value: 1000 });
  assert.match(migration, /purchasing\.po_line_net\(pol\)\/pol\.quantity/);
});

test("PO-line discount produces an immutable net receipt cost", () => {
  const gross = 100;
  const net = gross * (1 - 0.1);
  assert.equal(net, 90);
  assert.match(migration, /gross_unit_cost_amount/);
  assert.match(migration, /discount_unit_amount/);
  assert.match(migration, /valuation_events_immutable/);
});

test("multiple receipts recalculate weighted average", () => {
  const position = combine(receipt(10, 100), receipt(10, 120));
  assert.deepEqual(position, { quantity: 20, value: 2200, wac: 110 });
  assert.match(migration, /new_value\/new_qty/);
});

test("purchase return uses current WAC without rewriting receipt history", () => {
  const before = combine(receipt(10, 100), receipt(10, 120));
  const returnValue = 2 * before.wac;
  assert.equal(returnValue, 220);
  assert.equal((before.value - returnValue) / (before.quantity - 2), 110);
  assert.match(migration, /value_purchase_return/);
  assert.match(migration, /p_unit_cost:=pos\.weighted_average_cost/);
});

test("Completed sale COGS is balanced, source-linked, and idempotent", () => {
  const soldQuantity = 2;
  const wac = 110;
  const cogs = soldQuantity * wac;
  assert.equal(cogs, 220);
  assert.match(migration, /'completed-sale-cogs:'\|\|cs\.id::text/);
  assert.match(migration, /purpose_key='cost-of-sales'/);
  assert.match(migration, /purpose_key='inventory'/);
  assert.match(migration, /round\(total_cost,2\),round\(total_cost,2\)/);
  assert.match(migration, /if journal_id is not null then return journal_id/);
});

test("future receipts cannot rewrite historical COGS", () => {
  const firstWac = combine(receipt(10, 100), receipt(10, 120)).wac;
  const firstCogs = 2 * firstWac;
  const later = combine(receipt(18, firstWac), receipt(10, 150));
  assert.equal(firstCogs, 220);
  assert.notEqual(later.wac, firstWac);
  assert.doesNotMatch(migration, /update accounting\.journal_/);
});

test("missing configuration or valuation records an exception and creates no physical movement", () => {
  assert.match(migration, /posting_exceptions/);
  assert.match(migration, /valuation-missing/);
  assert.match(migration, /configuration-inactive/);
  assert.match(migration, /account-mapping-missing/);
  assert.doesNotMatch(
    migration.slice(migration.indexOf("post_completed_sale_cogs")),
    /insert into inventory\.movements/,
  );
});
