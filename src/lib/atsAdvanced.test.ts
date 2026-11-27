import test from "node:test";
import assert from "node:assert/strict";
import { addSkillToDocument, getAtPath, hasSkill, issueSectionId, parseFieldPath, setAtPath } from "./atsAdvanced";
import type { ResumeDocument } from "../shared";

const doc = {
  id: "r",
  title: "CV",
  templateId: "t",
  layoutKey: "classic",
  design: {},
  content: {
    leftColumnIds: ["s", "e"],
    rightColumnIds: ["k"],
    sections: [
      { type: "header", id: "h", fullName: "A", title: "", contact: {} },
      { type: "summary", id: "s", title: "Summary", content: "Old summary" },
      { type: "experience", id: "e", title: "Experience", items: [{ id: "1", title: "Dev", company: "X", startDate: "", endDate: "", location: "", bullets: ["Worked on it", "Second"] }] },
      { type: "skills", id: "k", title: "Skills", categories: [{ id: "c", name: "", skills: ["AWS"] }] },
    ],
  },
} as unknown as ResumeDocument;

test("field paths: parse, read and immutable set (missing paths are not created)", () => {
  assert.deepEqual(parseFieldPath("items[0].bullets[1]"), ["items", 0, "bullets", 1]);
  const exp = doc.content.sections[2];
  assert.equal(getAtPath(exp, "items[0].bullets[0]"), "Worked on it");
  const next = setAtPath(exp, "items[0].bullets[0]", "Delivered it")!;
  assert.equal(getAtPath(next, "items[0].bullets[0]"), "Delivered it");
  assert.equal(getAtPath(exp, "items[0].bullets[0]"), "Worked on it", "original untouched");
  assert.equal(getAtPath(next, "items[0].bullets[1]"), "Second");
  assert.equal(setAtPath(exp, "items[3].bullets[0]", "x"), null);
  assert.equal(getAtPath(setAtPath(doc.content.sections[1], "content", "New")!, "content"), "New");
});

test("Add to Skills appends once, and creates a Skills section when missing", () => {
  const added = addSkillToDocument(doc, "Kubernetes")!;
  assert.ok(hasSkill(added, "kubernetes"));
  assert.equal(addSkillToDocument(added, "kubernetes"), null, "no duplicates");
  const noSkills = { ...doc, content: { ...doc.content, sections: doc.content.sections.filter((s) => s.type !== "skills"), rightColumnIds: [] } } as ResumeDocument;
  const created = addSkillToDocument(noSkills, "Terraform")!;
  const sec = created.content.sections.find((s) => s.type === "skills")!;
  assert.ok(created.content.leftColumnIds.includes(sec.id));
  assert.ok(hasSkill(created, "Terraform"));
  assert.equal(issueSectionId(doc, { section: "skills" }), "k");
  assert.equal(issueSectionId(doc, { section: "general" }), null);
  assert.equal(issueSectionId(doc, { section: "summary", sectionId: "nope" }), "s");
});
