import test from "node:test";
import assert from "node:assert/strict";
import { applyTemplateSettings } from "./templateSettings";

const cards = [
  { id: "up1", name: "Uploaded", blurb: "", source: "admin" },
  { id: "a", name: "A", blurb: "a", category: "Modern", source: "static" },
  { id: "b", name: "B", blurb: "b", category: "Modern", source: "static" },
  { id: "c", name: "C", blurb: "c", category: "Modern", source: "static" },
];

test("no settings leaves the gallery unchanged", () => {
  assert.deepEqual(applyTemplateSettings(cards, null), cards);
});

test("disable, rename, reorder and feature", () => {
  const out = applyTemplateSettings(cards, [
    { id: "a", name: "", category: "", description: "", isActive: false, featured: false, sortOrder: 0 },
    { id: "b", name: "Bee", category: "Tech", description: "new", isActive: true, featured: false, sortOrder: 1 },
    { id: "c", name: "", category: "", description: "", isActive: true, featured: true, sortOrder: 2 },
  ]);
  assert.deepEqual(out.map((c) => c.id), ["up1", "c", "b"]);
  const bee = out.find((c) => c.id === "b")!;
  assert.equal(bee.name, "Bee");
  assert.equal(bee.blurb, "new");
  assert.equal(bee.category, "Tech");
});
