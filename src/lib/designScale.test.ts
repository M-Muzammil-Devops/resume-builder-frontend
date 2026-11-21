import assert from "node:assert/strict";
import test from "node:test";
import { fontScale, fontSizePx } from "./designScale";

test("BUG-504 font size slider scales resume text", () => {
  assert.equal(fontScale(2), 1);
  assert.ok(fontScale(0) < 1);
  assert.ok(fontScale(8) > 1.2);
  assert.equal(Math.round(fontSizePx(8)), 16);
  assert.equal(fontScale(undefined), 1);
});
