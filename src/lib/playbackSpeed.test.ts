import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SPEED, SPEEDS, applySpeed, shouldOpenPicker, speedLabel, stepSpeed } from "./playbackSpeed";

const audioDir = path.join(__dirname, "..", "components", "tools", "audio");
const read = (f: string) => fs.readFileSync(path.join(audioDir, f), "utf8");

test("speeds: 0.75, 1, 1.25, 1.5, 2 with 1× default", () => {
  assert.deepEqual([...SPEEDS], [0.75, 1, 1.25, 1.5, 2]);
  assert.equal(DEFAULT_SPEED, 1);
  assert.equal(speedLabel(0.75), "0.75×");
  assert.equal(speedLabel(2), "2×");
});

test("stepSpeed: arrows move one step and clamp; Home/End jump", () => {
  assert.equal(stepSpeed(1, "ArrowRight"), 1.25);
  assert.equal(stepSpeed(1, "ArrowUp"), 1.25);
  assert.equal(stepSpeed(1, "ArrowLeft"), 0.75);
  assert.equal(stepSpeed(0.75, "ArrowLeft"), 0.75);
  assert.equal(stepSpeed(2, "ArrowRight"), 2);
  assert.equal(stepSpeed(1.5, "Home"), 0.75);
  assert.equal(stepSpeed(1, "End"), 2);
  assert.equal(stepSpeed(1.25, "x"), 1.25);
});

test("applySpeed: sets rate, default rate and preservesPitch (+ webkit/moz)", () => {
  const el = { playbackRate: 1, defaultPlaybackRate: 1 } as Record<string, unknown> & { playbackRate: number; defaultPlaybackRate: number };
  applySpeed(el, 1.5);
  assert.equal(el.playbackRate, 1.5);
  assert.equal(el.defaultPlaybackRate, 1.5);
  assert.equal(el.preservesPitch, true);
  assert.equal(el.webkitPreservesPitch, true);
  assert.equal(el.mozPreservesPitch, true);
  applySpeed(null, 2); // no throw
});

test("drop zone: any click opens the picker except data-no-pick targets or while busy", () => {
  const plain = { closest: () => null };
  const removeBtn = { closest: (sel: string) => (sel === "[data-no-pick]" ? {} : null) };
  assert.equal(shouldOpenPicker(plain, false), true);
  assert.equal(shouldOpenPicker(removeBtn, false), false);
  assert.equal(shouldOpenPicker(plain, true), false);
  assert.equal(shouldOpenPicker(null, false), false);
});

test("drop zone markup: whole zone is a keyboard button; remove (x), input and login links are excluded; no nested browse button", () => {
  const src = read("AudioCleaner.tsx");
  assert.match(src, /role="button"/);
  assert.match(src, /onKeyDown=\{onPickKey\}/);
  assert.match(src, /aria-label="Remove file"[^>]*data-no-pick/);
  assert.match(src, /type="file"[\s\S]{0,200}data-no-pick/);
  assert.match(src, /className=\{s\.loginNote\} data-no-pick/);
  assert.doesNotMatch(src, /onClick=\{onBrowse\}/, "browse files must not have its own handler (double open)");
  const css = read("AudioTool.module.css");
  assert.match(css, /\.drop:has\(\.pick:focus-visible\)/);
});

test("speed control is in the result player and the Example card; CSS module only", () => {
  const cleaner = read("AudioCleaner.tsx");
  const demo = read("DemoPlayer.tsx");
  for (const src of [cleaner, demo]) {
    assert.match(src, /<SpeedControl /);
    assert.match(src, /applySpeed\(/);
    assert.doesNotMatch(src, /style=\{/);
  }
  assert.doesNotMatch(read("SpeedControl.tsx"), /style=\{/);
});
