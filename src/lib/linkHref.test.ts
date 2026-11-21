import assert from "node:assert/strict";
import test from "node:test";
import { contactLinkHref, emailHref, linkHrefFromText, phoneHref } from "./linkHref";

test("typed header link becomes that URL once", () => {
  assert.equal(
    linkHrefFromText("linkedin.com/in/ayesha-qa-khan"),
    "https://linkedin.com/in/ayesha-qa-khan"
  );
  assert.equal(linkHrefFromText("https://github.com/ayesha"), "https://github.com/ayesha");
  assert.equal(linkHrefFromText("javascript:alert(1)"), "");
});

test("BUG-1100 empty or unsafe header links render without an href", () => {
  assert.equal(contactLinkHref("My profile", ""), "");
  assert.equal(contactLinkHref("My profile", "javascript:window.__xl=1"), "");
  assert.equal(contactLinkHref("", "https://example.com"), "");
  assert.equal(contactLinkHref("My profile", "https://example.com/me"), "https://example.com/me");
  assert.equal(linkHrefFromText("https://"), "");
  assert.equal(linkHrefFromText("Portfolio site"), "");
  assert.equal(linkHrefFromText(" JaVaScRiPt:alert(1)"), "");
  assert.equal(linkHrefFromText("data:text/html,x"), "");
});

test("BUG-400 typed URL text is the link target", () => {
  assert.equal(
    contactLinkHref("linkedin.com/in/qa-test", "https://linkedin.com"),
    "https://linkedin.com/in/qa-test"
  );
  assert.equal(contactLinkHref("github.com/ayesha", ""), "https://github.com/ayesha");
});

test("BUG-1100 tel: only for real phone numbers", () => {
  assert.equal(phoneHref("+1-(234)-555-1234"), "tel:+12345551234");
  assert.equal(phoneHref("0300 1234567"), "tel:03001234567");
  assert.equal(phoneHref("javascript:window.__x=31"), "");
  assert.equal(phoneHref("call me 31"), "");
  assert.equal(phoneHref("31"), "");
  assert.equal(emailHref("a@b.co"), "mailto:a@b.co");
  assert.equal(emailHref("not an email"), "");
});
