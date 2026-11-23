import assert from "node:assert/strict";
import { test } from "node:test";
import { isSafeNextPath, parseLoginNext } from "./loginNext";

const q = (s: string) => new URLSearchParams(s);

test("BUG-1327 next/tpl survive sign-in (password and demo use the same parser)", () => {
  assert.deepEqual(parseLoginNext(q("next=template&tpl=cm123-abc")), { kind: "template", tplId: "cm123-abc" });
  assert.deepEqual(parseLoginNext(q("next=/user/editor/abc123")), { kind: "path", path: "/user/editor/abc123" });
  assert.deepEqual(parseLoginNext(q("next=/tools/audio-noise-remover")), { kind: "path", path: "/tools/audio-noise-remover" });
  assert.deepEqual(parseLoginNext(q("")), { kind: "default" });
  assert.deepEqual(parseLoginNext(q("next=template&tpl=<x>")), { kind: "default" });
});

test("BUG-1327 next stays a safe relative path", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "/user/../admin", "javascript:alert(1)", "/admin", "/user/editor/a?x=1", " /x"]) {
    assert.equal(isSafeNextPath(bad), false, bad);
    assert.deepEqual(parseLoginNext(q(`next=${encodeURIComponent(bad)}`)), { kind: "default" }, bad);
  }
  assert.equal(isSafeNextPath("/user/jobs/tracker"), true);
});
