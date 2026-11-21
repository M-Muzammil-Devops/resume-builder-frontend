import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeHtml } from "./sanitizeHtml";
import { sanitizeHtml as apiSanitize } from "../../../backend/src/lib/sanitizeHtml";

test("BUG-402 frontend and backend sanitisers give identical output", () => {
  const samples = [
    "<img src=x onerror=window.__x7=1>",
    "<svg onload=window.__x8=1>",
    "<img src=x onerror=window.__x7=1",
    '<b title=">" onmouseover="window.__x7=1">x</b>',
    '<a href="javascript&colon;alert(1)">x</a>',
    "<b>bold</b> <i>x</i>",
    '<a href="https://example.com/in/me">me</a>',
    "QA restored.<br>",
    "line<br/>two",
    "a < b > c",
  ];
  for (const input of samples) assert.equal(sanitizeHtml(input), apiSanitize(input), input);
});

test("BUG-402 render-path sanitiser neutralises the QA payloads", () => {
  for (const input of ["<img src=x onerror=window.__x7=1>", "<svg onload=window.__x8=1>"]) {
    const el = sanitizeHtml(input);
    assert.equal(/<(img|svg)/i.test(el), false);
    assert.equal(/onerror|onload/i.test(el), false);
  }
});
