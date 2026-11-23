import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";

const req = createRequire(path.join(__dirname, "..", "..", "package.json"));

test("round23 slow uploads: the preload lifts Node's 5-minute request timeout for next start", async () => {
  const mod = req("./server-timeouts.cjs") as { REQUEST_TIMEOUT_MS: number; HEADERS_TIMEOUT_MS: number };
  assert.ok(mod.REQUEST_TIMEOUT_MS >= 60 * 60_000, "at least 60 min for a 100 MB upload on a slow line");
  assert.equal(mod.HEADERS_TIMEOUT_MS, 60_000);
  const server = http.createServer((_q, r) => r.end("ok"));
  assert.equal(server.requestTimeout, 300_000); // Node default before listen
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  assert.equal(server.requestTimeout, mod.REQUEST_TIMEOUT_MS);
  await new Promise((resolve) => server.close(resolve));
});
