import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260814080000_supplier_payable_accounting.sql",
  "utf8",
).toLowerCase();

test("accepted receipts post net valuation to Inventory and Accounts Payable", () => {
  assert.match(migration, /post_accepted_receipt_payable/);
  assert.match(migration, /ve\.total_value_delta/);
  assert.match(migration, /accepted_quantity<=0/);
  assert.match(migration, /'payable-created'/);
  assert.match(migration, /inventory_account,amount,amount,0/);
  assert.match(migration, /payable_account,-amount,0,amount/);
  assert.doesNotMatch(
    migration.slice(migration.indexOf("post_accepted_receipt_payable")),
    /unit_cost_amount\s*\*/,
  );
});

test("discount, partial, multiple, and rejected quantities reuse valuation authority", () => {
  assert.match(migration, /inventory\.valuation_events/);
  assert.match(migration, /quantity_delta<>rl\.accepted_quantity/);
  assert.match(migration, /source_reference=rl\.id::text/);
  assert.doesNotMatch(migration, /damaged_rejected_quantity\s*\+/);
  assert.doesNotMatch(migration, /quarantined_quantity\s*\+/);
});

test("purchase return creates current-WAC supplier credit without rewriting payable", () => {
  assert.match(migration, /post_purchase_return_credit/);
  assert.match(migration, /ve\.total_value_delta>=0/);
  assert.match(migration, /'supplier-credit'/);
  assert.match(migration, /payable_account,amount,amount,0/);
  assert.match(migration, /inventory_account,-amount,0,amount/);
  assert.doesNotMatch(migration, /update accounting\.supplier_payable_events/);
});

test("payable journals and events are immutable, balanced, and idempotent", () => {
  assert.match(migration, /supplier_payable_events_immutable/);
  assert.match(
    migration,
    /unique \(source_namespace,source_reference,event_type\)/,
  );
  assert.match(migration, /'accepted-purchase-receipt:'\|\|rl\.id::text/);
  assert.match(migration, /'purchase-return-credit:'\|\|pr\.id::text/);
  assert.equal(
    (migration.match(/ref,amount,amount,'system:/g) ?? []).length,
    2,
  );
});

test("missing activation or mappings create exceptions without partial journals", () => {
  assert.match(migration, /'configuration-inactive'/);
  assert.match(migration, /'account-mapping-missing'/);
  assert.match(migration, /return null/);
  assert.match(migration, /purpose_key='accounts-payable'/);
  assert.match(migration, /account_class='liability'/);
  assert.match(migration, /retry_supplier_payables_on_activation/);
  assert.match(migration, /retry_supplier_payable_postings/);
});

test("supplier balances derive only from immutable financial events", () => {
  assert.match(migration, /sum\(signed_payable_amount\)balance/);
  assert.match(migration, /signed_payable_amount = amount/);
  assert.match(migration, /signed_payable_amount = -amount/);
  assert.doesNotMatch(migration, /supplier_payment_allocations/);
});

test("accounting creates no physical inventory movement or supplier settlement", () => {
  assert.doesNotMatch(migration, /insert into inventory\.movements/);
  assert.doesNotMatch(migration, /insert into purchasing\.supplier_payments/);
  assert.doesNotMatch(migration, /supplier-payment-accounting/);
});
