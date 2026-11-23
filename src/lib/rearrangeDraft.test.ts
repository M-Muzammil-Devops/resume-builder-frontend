import assert from "node:assert/strict";
import test from "node:test";
import { buildTemplateContent, buildTemplateDesign } from "../shared/templateStarter";
import type { ResumeDocument } from "../shared/types";
import { applyDraft, draftFrom, finishRearrange, layoutDraft, resetDraft } from "./rearrangeDraft";

function doc(): ResumeDocument {
  const content = buildTemplateContent("emerald-numbered");
  // The user's arrangement: single column with ids spread across both lists.
  const id = (t: string) => content.sections.find((s) => s.type === t)?.id || "";
  content.leftColumnIds = ["summary", "skills", "education", "certifications"].map(id).filter(Boolean);
  content.rightColumnIds = ["languages", "experience"].map(id).filter(Boolean);
  return {
    id: "r1",
    title: "R",
    templateId: "emerald-numbered",
    layoutKey: "numbered" as ResumeDocument["layoutKey"],
    content,
    design: buildTemplateDesign("emerald-numbered"),
  };
}

test("BUG-1292: Esc, X and Cancel discard a Single/Two columns change; only Save writes", () => {
  const d0 = doc();
  const before = JSON.stringify(d0);
  const two = layoutDraft(d0, draftFrom(d0), "two");
  assert.notEqual(two.columnLayout, "single");
  assert.ok(two.right.length > 0);
  for (const action of ["escape", "close", "cancel"] as const) {
    assert.equal(finishRearrange(action, d0, two), null, `${action} must not save`);
  }
  assert.equal(JSON.stringify(d0), before, "the resume itself is untouched by the draft");
  const saved = finishRearrange("save", d0, two);
  assert.ok(saved);
  assert.equal(saved!.design.columnLayout, two.columnLayout);
  assert.deepEqual(saved!.content.rightColumnIds, two.right);
});

test("BUG-1293: Reset only changes the draft; nothing persists until Save", () => {
  const d0 = doc();
  const before = JSON.stringify(d0);
  const moved = { ...draftFrom(d0), left: [...draftFrom(d0).left].reverse() };
  const reset = resetDraft(applyDraft(d0, moved));
  assert.ok(reset, "emerald has a template default");
  assert.equal(JSON.stringify(d0), before);
  assert.equal(finishRearrange("escape", d0, reset!), null);
  assert.equal(finishRearrange("cancel", d0, reset!), null);
  // Template default = the preset's single column order, Experience right after Summary.
  const types = reset!.left.map((sid) => d0.content.sections.find((s) => s.id === sid)?.type);
  assert.deepEqual(types.slice(0, 2), ["summary", "experience"]);
  assert.equal(reset!.columnLayout, "single");
  assert.ok(finishRearrange("save", d0, reset!));
});

test("Save without changes writes nothing; single column keeps the whole order in one list", () => {
  const d0 = doc();
  assert.equal(finishRearrange("save", d0, draftFrom(d0)), null);
  const two = layoutDraft(d0, draftFrom(d0), "two");
  const back = layoutDraft(applyDraft(d0, two), two, "single");
  assert.equal(back.columnLayout, "single");
  assert.equal(back.right.length, 0);
  assert.deepEqual([...back.left].sort(), [...two.left, ...two.right].sort());
});
