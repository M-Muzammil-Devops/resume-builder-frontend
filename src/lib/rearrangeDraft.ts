/**
 * Draft state for the Rearrange modal (BUG-1292 / BUG-1293). Every change in the modal —
 * drag, keyboard move, Single/Two columns, Reset — only edits this draft. The resume (and so
 * autosave) changes once, on Save. Esc, X and Cancel all simply drop the draft.
 * Relative imports only so the backend test runner can load it.
 */
import { resolveColumns, splitIntoTwoColumns } from "../shared/layout";
import { resolveLandingPreset, type LandingTemplatePreset } from "../shared/templateStarter";
import type { ColumnLayout, LayoutKey, ResumeDocument } from "../shared/types";

export type RearrangeDraft = {
  left: string[];
  right: string[];
  columnLayout: ColumnLayout;
  layoutKey: LayoutKey;
};

export type CloseAction = "save" | "cancel" | "escape" | "close";

export function draftFrom(doc: ResumeDocument): RearrangeDraft {
  return {
    left: [...doc.content.leftColumnIds],
    right: [...doc.content.rightColumnIds],
    columnLayout: (doc.design.columnLayout || "wide-left") as ColumnLayout,
    layoutKey: doc.layoutKey,
  };
}

/** The document the draft describes (used for the print-mode preview and on Save). */
export function applyDraft(doc: ResumeDocument, d: RearrangeDraft): ResumeDocument {
  return {
    ...doc,
    layoutKey: d.layoutKey,
    design: { ...doc.design, columnLayout: d.columnLayout },
    content: { ...doc.content, leftColumnIds: [...d.left], rightColumnIds: [...d.right] },
  };
}

export function draftChanged(doc: ResumeDocument, d: RearrangeDraft): boolean {
  return JSON.stringify(draftFrom(doc)) !== JSON.stringify({ ...d, columnLayout: d.columnLayout });
}

/** Only Save writes; every other way out of the modal discards the draft. */
export function finishRearrange(action: CloseAction, doc: ResumeDocument, d: RearrangeDraft): ResumeDocument | null {
  return action === "save" && draftChanged(doc, d) ? applyDraft(doc, d) : null;
}

export function presetFor(doc: ResumeDocument): LandingTemplatePreset | undefined {
  return resolveLandingPreset(doc.templateId) || resolveLandingPreset(doc.layoutKey);
}

/** Template default order + layout, as a new draft (nothing is written). */
export function resetDraft(doc: ResumeDocument): RearrangeDraft | null {
  const preset = presetFor(doc);
  if (!preset) return null;
  const headerId = doc.content.sections.find((s) => s.type === "header")?.id;
  const known = new Set(doc.content.sections.map((s) => s.id));
  const typeToId = new Map(doc.content.sections.map((s) => [s.type as string, s.id]));
  // Presets list ids; map by id first, then by section type for documents with generated ids.
  const map = (ids: string[]) =>
    ids.map((id) => (known.has(id) ? id : typeToId.get(id) ?? "")).filter((id) => id && id !== headerId);
  const left = map(preset.leftColumnIds);
  const right = map(preset.rightColumnIds).filter((id) => !left.includes(id));
  const resolved = resolveColumns({ ...doc.content, leftColumnIds: left, rightColumnIds: right }, preset.columnLayout);
  return {
    left: resolved.left,
    right: resolved.right,
    columnLayout: preset.columnLayout as ColumnLayout,
    layoutKey: preset.layoutKey as LayoutKey,
  };
}

/** Single column / Two columns toggle, on the draft. */
export function layoutDraft(doc: ResumeDocument, d: RearrangeDraft, mode: "single" | "two"): RearrangeDraft {
  const current = applyDraft(doc, d);
  const cols = resolveColumns(current.content, d.columnLayout);
  if (mode === "single") {
    return { ...d, columnLayout: "single", left: [...cols.left, ...cols.right], right: [] };
  }
  const preset = presetFor(doc);
  const columnLayout: ColumnLayout =
    d.columnLayout !== "single"
      ? d.columnLayout
      : preset && preset.columnLayout && preset.columnLayout !== "single"
        ? (preset.columnLayout as ColumnLayout)
        : "wide-left";
  // Main content stays in the wide column; side sections move right.
  const split = splitIntoTwoColumns(current.content, preset?.rightColumnIds ?? []);
  return {
    // "single-column" templates force one column, so leave that layout family when switching.
    layoutKey: d.layoutKey === "single-column" ? ("high-performer" as LayoutKey) : d.layoutKey,
    columnLayout,
    left: split.left,
    right: split.right,
  };
}
