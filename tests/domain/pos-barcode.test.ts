import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeCode128B,
  generateBarcodeSVG,
  isValidBarcode,
} from "../../src/features/pos/domain/barcode-engine.ts";

test("ported Code 128 labels remain deterministic and printable", () => {
  assert.equal(
    encodeCode128B("RYN-001").binary,
    encodeCode128B("RYN-001").binary,
  );
  const svg = generateBarcodeSVG("RYN-001");
  assert.match(svg, /^<svg/);
  assert.match(svg, /RYN-001/);
});

test("barcode validation accepts retail identifiers and rejects markup", () => {
  assert.equal(isValidBarcode("8801234567890"), true);
  assert.equal(isValidBarcode("RYN_SKU-01"), true);
  assert.equal(isValidBarcode("<script>"), false);
});
