import assert from "node:assert/strict";
import test from "node:test";
import { buildPageMap, freePercent, sharePercent } from "./pageMap";

const A4 = { pagePx: 1123, gap: 36, pad: 72 };
const usable = 1123 - 144;

test("single page: shares and free space follow measured heights", () => {
  const map = buildPageMap(
    [
      { id: "header", top: 72, height: 98 },
      { id: "exp", top: 180, height: usable * 0.38 },
    ],
    A4
  );
  assert.equal(map.pages, 1);
  const exp = map.segments.find((s) => s.id === "exp")!;
  assert.equal(sharePercent(exp.fraction), 38);
  assert.equal(exp.continuesOnNext, false);
  assert.ok(freePercent(map.used[0]) > 40 && freePercent(map.used[0]) < 55);
});

test("a section pushed to page 2 lands there, not on page 1", () => {
  const stride = 1123 + 36;
  const map = buildPageMap(
    [
      { id: "a", top: 72, height: 900 },
      { id: "b", top: stride + 72, height: 200 },
    ],
    A4,
    2
  );
  assert.equal(map.pages, 2);
  const b = map.segments.filter((s) => s.id === "b");
  assert.equal(b.length, 1);
  assert.equal(b[0].page, 1);
  assert.equal(b[0].offset, 0);
});

test("a long section split across pages appears on both with continue flags", () => {
  const stride = 1123 + 36;
  const map = buildPageMap([{ id: "long", top: 600, height: stride }], A4);
  const parts = map.segments.filter((s) => s.id === "long");
  assert.equal(parts.length, 2);
  assert.deepEqual(parts.map((p) => p.page), [0, 1]);
  assert.equal(parts[0].continuesOnNext, true);
  assert.equal(parts[1].continuedFromPrev, true);
  assert.equal(map.pages, 2);
});

test("zero-height sections are ignored and an empty map has one page", () => {
  const map = buildPageMap([{ id: "x", top: 10, height: 0 }], A4);
  assert.equal(map.pages, 1);
  assert.equal(map.segments.length, 0);
  assert.equal(freePercent(map.used[0]), 100);
});
