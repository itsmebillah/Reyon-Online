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
const hardening = readFileSync(
  new URL(
    "../../supabase/migrations/20260814062000_completed_sale_posting_account_hardening.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

test("posting is activation-gated and uses configured accounts", () => {
  assert.match(migration, /posting_enabled and activated_at is not null/);
  assert.match(migration, /posting_account_mappings/);
  assert.match(migration, /financial_accounts/);
  assert.doesNotMatch(migration, /insert into accounting\.ledger_accounts/);
  assert.match(hardening, /matching_accounts <> 1/);
  assert.match(hardening, /a\.is_active and a\.approved_at is not null/);
  assert.doesNotMatch(hardening, /insert into accounting\.ledger_accounts/);
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
  assert.match(hardening, /purpose_key = 'product-sales'/);
  assert.match(hardening, /purpose_key = 'delivery-revenue'/);
  assert.match(hardening, /purpose_key = 'sales-discounts'/);
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
  assert.match(hardening, /if journal_id is not null then return journal_id/);
  assert.match(hardening, /if journal_id is null then raise/);
});

test("milestone does not implement deferred postings or alter sales records", () => {
  assert.doesNotMatch(
    migration,
    /cost of goods|supplier payable|refund journal|expense journal/,
  );
  assert.doesNotMatch(
    `${migration}\n${hardening}`,
    /update sales\.orders|delete from sales\.|update sales\.completed_sales/,
  );
});

test("journal captures the required source, posting, and separated revenue structure", () => {
  assert.match(hardening, /'completed-sale', cs\.id::text/);
  assert.match(hardening, /'system:completed-sale'/);
  assert.match(hardening, /journal_reference_sequence/);
  assert.match(hardening, /cs\.grand_total_amount/);
  assert.match(hardening, /o\.gross_product_amount/);
  assert.match(hardening, /cs\.delivery_charge_amount/);
  assert.match(hardening, /o\.discount_amount/);
});
