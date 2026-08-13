import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260814030000_completed_sale_accounting_posting.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

test("posting is activation-gated and uses configured accounts", () => {
  assert.match(migration, /posting_enabled and activated_at is not null/);
  assert.match(migration, /posting_account_mappings/);
  assert.match(migration, /financial_accounts/);
  assert.doesNotMatch(migration, /insert into accounting\.ledger_accounts/);
});

test("completed sale journal is balanced and keeps discounts traceable", () => {
  const grossProduct = 1250;
  const discount = 150;
  const delivery = 80;
  const grandTotal = grossProduct - discount + delivery;
  const debit = grandTotal + discount;
  const credit = grossProduct + delivery;
  assert.equal(debit, credit);
  assert.match(migration, /purpose_key='sales-discounts'/);
  assert.match(migration, /journal lines are not balanced/);
  assert.match(migration, /total_debit = total_credit/);
});

test("source idempotency and immutability are enforced", () => {
  assert.match(migration, /'completed-sale:'\|\|cs\.id::text/);
  assert.match(
    migration,
    /source_namespace='completed-sale' and source_reference=cs\.id::text/,
  );
  assert.match(migration, /exception when unique_violation/);
  assert.match(migration, /journal_line_debit_credit_valid/);
  assert.match(migration, /completed_sale_accounting_posting after insert/);
});

test("milestone does not implement deferred postings or alter sales records", () => {
  assert.doesNotMatch(
    migration,
    /cost of goods|supplier payable|refund journal|expense journal/,
  );
  assert.doesNotMatch(
    migration,
    /update sales\.orders|delete from sales\.|update sales\.completed_sales/,
  );
});
