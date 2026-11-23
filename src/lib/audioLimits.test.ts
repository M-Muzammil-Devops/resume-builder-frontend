import assert from "node:assert/strict";
import { test } from "node:test";
import { AUDIO_MAX_MB, AUDIO_MAX_SECONDS, limitsLabel, maxReductionDb, progressHint } from "./audioLimits";

test("round23 drop-zone copy: up to 100 MB · 20 min", () => {
  assert.equal(AUDIO_MAX_MB, 100);
  assert.equal(AUDIO_MAX_SECONDS, 1200);
  assert.equal(limitsLabel(AUDIO_MAX_MB * 1024 * 1024, AUDIO_MAX_SECONDS), "up to 100 MB · 20 min");
  assert.equal(limitsLabel(50 * 1024 * 1024, 600), "up to 50 MB · 10 min");
});

test("round23 progress hint shows the chunk being cleaned", () => {
  assert.equal(progressHint({ status: "denoising", chunks: { done: 2, total: 19 }, etaSeconds: 40 }), "Part 3 of 19 · ~40s left");
  assert.equal(progressHint({ status: "denoising", chunks: { done: 19, total: 19 }, etaSeconds: null }), "Part 19 of 19");
  assert.equal(progressHint({ status: "denoising", chunks: { done: 0, total: 1 }, etaSeconds: 5 }), "~5s left");
  assert.equal(progressHint({ status: "encoding", chunks: { done: 19, total: 19 }, etaSeconds: 200 }), "~3 min left");
  assert.equal(progressHint(null), "Working…");
});

test("BUG-1340/1343: strength → max reduction is capped (6-18 dB), graded and matches the API table", () => {
  assert.equal(maxReductionDb(0), 6);
  assert.equal(maxReductionDb(20), 8.4);
  assert.equal(maxReductionDb(50), 12);
  assert.equal(maxReductionDb(80), 15);
  assert.equal(maxReductionDb(100), 18);
  assert.equal(maxReductionDb(80, "conversation"), 11.2);
  assert.equal(maxReductionDb(100, "conversation"), 12);
  for (let s = 1; s <= 100; s++) assert.ok(maxReductionDb(s) > maxReductionDb(s - 1), `monotonic at ${s}`);
});
