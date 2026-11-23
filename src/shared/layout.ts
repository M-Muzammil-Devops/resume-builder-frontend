/**
 * Shared page layout rules for the canvas, print/[id] PDF, share page and TXT/DOCX export.
 */
import type { ColumnLayout, ResumeContent } from "./types";

/** BUG-704: "US Letter", "Letter" and "letter" all mean US Letter; anything else is A4. */
export function isLetterPage(size: unknown): boolean {
  return typeof size === "string" && /^(us[\s-]*)?letter$/i.test(size.trim());
}

export function normalizePageSize(size: unknown): "A4" | "US Letter" {
  return isLetterPage(size) ? "US Letter" : "A4";
}

/**
 * BUG-1280: a section that exists in the resume but in neither column list still renders.
 * Orphans are appended (in document order) to the main column: the right column for
 * "wide-right" layouts, otherwise the left (single column layouts read left then right).
 */
export function resolveColumns(
  content: Pick<ResumeContent, "sections" | "leftColumnIds" | "rightColumnIds">,
  columnLayout?: ColumnLayout | string
): { left: string[]; right: string[] } {
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const known = new Set(sections.filter((s) => s && s.type !== "header").map((s) => String(s.id)));
  const seen = new Set<string>();
  const keep = (ids: unknown) =>
    (Array.isArray(ids) ? ids : []).map(String).filter((id) => {
      if (!known.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  const left = keep(content.leftColumnIds);
  const right = keep(content.rightColumnIds);
  const orphans = sections
    .filter((s) => s && s.type !== "header" && !seen.has(String(s.id)))
    .map((s) => String(s.id));
  if (columnLayout === "wide-right" && right.length) right.push(...orphans);
  else left.push(...orphans);
  return { left, right };
}

/**
 * One rule for "is this resume one column?" — canvas, PDF (print view), share page, preview and
 * HTML/TXT export all use it so the Rearrange modal always matches the output.
 * A two-column layout with nothing in the side column also reads (and renders) as one column.
 */
export function isSingleColumnLayout(
  layoutKey: string | null | undefined,
  columnLayout: string | null | undefined,
  rightCount?: number
): boolean {
  return columnLayout === "single" || layoutKey === "single-column" || rightCount === 0;
}

/** Section types that usually live in a side column when a resume switches to two columns. */
export const SIDE_COLUMN_TYPES = [
  "skills",
  "education",
  "languages",
  "certifications",
  "achievements",
  "awards",
  "interests",
  "strengths",
  "references",
] as const;

/**
 * Split a one-column reading order into two columns: sections listed in `preferRight` (by id or
 * type) go right; without a usable preference the common side-column types do. Relative order is
 * kept and the main column never ends up empty.
 */
export function splitIntoTwoColumns(
  content: Pick<ResumeContent, "sections" | "leftColumnIds" | "rightColumnIds">,
  preferRight: readonly string[] = []
): { left: string[]; right: string[] } {
  const cols = resolveColumns(content, "single");
  const order = [...cols.left, ...cols.right];
  const typeOf = new Map((content.sections || []).map((s) => [String(s.id), String(s.type)]));
  const pick = (keys: readonly string[]) => {
    const set = new Set(keys);
    return order.filter((id) => set.has(id) || set.has(typeOf.get(id) || ""));
  };
  let right = pick(preferRight);
  if (!right.length || right.length === order.length) right = pick(SIDE_COLUMN_TYPES);
  if (right.length === order.length) right = right.slice(Math.ceil(right.length / 2));
  const rightSet = new Set(right);
  return { left: order.filter((id) => !rightSet.has(id)), right };
}
