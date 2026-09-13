import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBangladeshPhone,
  districts,
} from "../../src/lib/bangladesh.ts";

test("Bangladesh phone formats normalize consistently", () => {
  for (const phone of ["01712345678", "+880 1712-345678", "০১৭১২৩৪৫৬৭৮"]) {
    assert.equal(normalizeBangladeshPhone(phone), "+8801712345678");
  }
  for (const phone of ["01212345678", "0171234567", "+911712345678", "hello"]) {
    assert.equal(normalizeBangladeshPhone(phone), null);
  }
  assert.equal(new Set(districts).size, 64);
});
