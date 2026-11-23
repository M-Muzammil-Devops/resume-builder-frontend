import test from "node:test";
import assert from "node:assert/strict";
import { CONSENT_VERSION, formatConsent, parseConsent, readConsent } from "./consent";

test("consent cookie round-trips", () => {
  const rec = { version: CONSENT_VERSION, preferences: true, analytics: false, marketing: true, anonId: "abcDEF_12-x", at: 1764000000 };
  assert.equal(formatConsent(rec), "1.101.abcDEF_12-x.1764000000");
  assert.deepEqual(parseConsent(formatConsent(rec)), rec);
  assert.equal(parseConsent("1.1.abc.1"), null);
});

test("an old consent version asks again", () => {
  assert.equal(readConsent("x=1; rb_consent=0.111.abcdefgh12.1"), null);
  assert.equal(readConsent("rb_consent=1.010.abcdefgh12.1")?.analytics, true);
  assert.equal(readConsent(""), null);
});
