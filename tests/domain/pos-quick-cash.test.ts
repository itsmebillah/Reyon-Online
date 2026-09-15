import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePaymentSummary,
  generateQuickCashPresets,
} from "../../src/features/pos/domain/quick-cash.ts";

test("quick cash preserves exact payable and ascending useful tenders", () => {
  assert.deepEqual(generateQuickCashPresets(2120), [2120, 2500, 3000, 10000]);
  assert.equal(generateQuickCashPresets(850)[0], 850);
});

test("payment summary keeps change and due mutually exclusive", () => {
  assert.deepEqual(calculatePaymentSummary(850, 1000), {
    payable: 850,
    paid: 1000,
    change: 150,
    due: 0,
  });
  assert.deepEqual(calculatePaymentSummary(850, 500), {
    payable: 850,
    paid: 500,
    change: 0,
    due: 350,
  });
});
