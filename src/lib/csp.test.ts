import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { NEXT_BUILTIN_STYLE_HASHES, buildCsp, createNonce } from "./csp";

test("BUG-916 production CSP uses a nonce and no unsafe-inline/unsafe-eval for scripts", () => {
  const nonce = createNonce();
  const csp = buildCsp(nonce);
  const script = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src")) || "";
  assert.match(script, new RegExp(`'nonce-${nonce.replace(/[+/=]/g, (c) => `\\${c}`)}'`));
  assert.match(script, /'strict-dynamic'/);
  assert.equal(script.includes("unsafe-inline"), false);
  assert.equal(script.includes("unsafe-eval"), false);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
});

test("BUG-916 dev CSP only adds unsafe-eval", () => {
  const script = buildCsp("abc", { dev: true }).split(";").find((d) => d.includes("script-src")) || "";
  assert.match(script, /'unsafe-eval'/);
  assert.equal(script.includes("unsafe-inline"), false);
});

test("BUG-1404 production style elements need the nonce or a Next built-in hash; no unsafe-inline", () => {
  const csp = buildCsp("n0nce");
  const parts = csp.split(";").map((d) => d.trim());
  for (const name of ["style-src", "style-src-elem"]) {
    const d = parts.find((x) => x.split(" ")[0] === name) || "";
    assert.match(d, /'nonce-n0nce'/, name);
    assert.equal(d.includes("unsafe-inline"), false, name);
    for (const h of NEXT_BUILTIN_STYLE_HASHES) assert.ok(d.includes(`'${h}'`), name);
  }
  assert.equal(parts.find((d) => d.startsWith("style-src-attr")), "style-src-attr 'unsafe-inline'");
  assert.ok(parts.includes("worker-src 'self'"));
  assert.ok(parts.includes("manifest-src 'self'"));
  assert.ok(parts.includes("upgrade-insecure-requests"));
  assert.equal(buildCsp("n", { dev: true }).includes("upgrade-insecure-requests"), false);
});

test("BUG-1404 hashes match the inline styles shipped in node_modules/next", () => {
  const cwd = process.cwd();
  const root = fs.existsSync(path.join(cwd, "node_modules/next")) && fs.existsSync(path.join(cwd, "src/lib/csp.ts")) ? cwd : path.resolve(cwd, "../frontend");
  const nextDir = path.join(root, "node_modules/next/dist/client/components");
  const load = createRequire(path.join(root, "package.json"));
  const theme = load(path.join(nextDir, "builtin/error-styles.js")).errorThemeCss as string;
  const fallbackSrc = fs.readFileSync(path.join(nextDir, "http-access-fallback/error-fallback.js"), "utf8");
  const m = /__html: `([^`]+)`/.exec(fallbackSrc);
  assert.ok(m, "error-fallback inline style not found");
  const sha = (text: string) => "sha256-" + createHash("sha256").update(text).digest("base64");
  assert.deepEqual([sha(theme), sha(m![1])].sort(), [...NEXT_BUILTIN_STYLE_HASHES].sort());
});

test("BUG-916 nonce is random per request", () => {
  const a = createNonce();
  const b = createNonce();
  assert.notEqual(a, b);
  assert.ok(Buffer.from(a, "base64").length >= 16);
});
