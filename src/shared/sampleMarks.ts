/**
 * BUG-1240b: provenance for template sample text.
 *
 * content.sampleFields maps a field path to the sample value the field was created with
 * (defaults.ts / templateStarter.ts, or an entry added from the editor's "+" buttons).
 * The editor drops a mark the first time the user edits that field, so exports strip only
 * text the user never touched, and a typed value that happens to equal a sample is kept.
 * Resumes without sampleFields (created before this) keep the old value-based scrub.
 */
import type { ResumeContent } from "./types";

export type SampleFields = Record<string, string>;

/** Keys that are structure, not text (never marked, never stripped). */
const SKIP_KEYS = new Set([
  "type", "id", "settings", "layoutKey", "variant", "icon", "level", "style",
  "proficiency", "percent", "logoUrl", "photoUrl",
]);

type Leaf = { path: string; value: string };
type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function segOf(child: unknown, index: number): string {
  return isRec(child) && typeof child.id === "string" && child.id ? child.id : String(index);
}

function walk(node: unknown, path: string, out: Leaf[]) {
  if (typeof node === "string") {
    if (node.trim()) out.push({ path, value: node });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, `${path}/${segOf(child, i)}`, out));
    return;
  }
  if (isRec(node)) {
    for (const [k, v] of Object.entries(node)) if (!SKIP_KEYS.has(k)) walk(v, `${path}/${k}`, out);
  }
}

/** Every text leaf of the resume, keyed by a stable path (section id / key / item id ...). */
export function sampleLeaves(content: unknown): Leaf[] {
  const out: Leaf[] = [];
  const sections = isRec(content) && Array.isArray(content.sections) ? content.sections : [];
  for (const section of sections) {
    if (!isRec(section) || typeof section.id !== "string") continue;
    for (const [k, v] of Object.entries(section)) {
      if (SKIP_KEYS.has(k)) continue;
      // A section heading ("EXPERIENCE") is structure; the header's title is the job title.
      if (k === "title" && section.type !== "header") continue;
      walk(v, `${section.id}/${k}`, out);
    }
  }
  return out;
}

export function hasSampleMarks(content: unknown): content is ResumeContent & { sampleFields: SampleFields } {
  return isRec(content) && isRec(content.sampleFields);
}

/** Mark every text field of freshly created sample content as untouched sample. */
export function markSampleContent<T extends ResumeContent>(content: T): T {
  const sampleFields: SampleFields = {};
  for (const leaf of sampleLeaves(content)) sampleFields[leaf.path] = leaf.value;
  return { ...content, sampleFields };
}

/**
 * Mark the text of entries (or whole sections) that exist in `after` but not in `before`,
 * i.e. what the editor's "+ entry" / "+ section" buttons just created. No-op for old resumes.
 */
export function markNewEntries<T extends ResumeContent>(before: ResumeContent, after: T): T {
  if (!hasSampleMarks(after)) return after;
  const old = new Set(sampleLeaves(before).map((l) => l.path.split("/").slice(0, 3).join("/")));
  const oldSections = new Set((before.sections || []).map((s) => s.id));
  const marks: SampleFields = { ...after.sampleFields };
  let changed = false;
  for (const leaf of sampleLeaves(after)) {
    const parts = leaf.path.split("/");
    const isNewSection = !oldSections.has(parts[0]);
    const entryKey = parts.slice(0, 3).join("/");
    const isNewEntry = parts.length > 3 && !old.has(entryKey) && !beforeHasEntry(before, parts);
    if ((isNewSection || isNewEntry) && !(leaf.path in marks)) {
      marks[leaf.path] = leaf.value;
      changed = true;
    }
  }
  return changed ? { ...after, sampleFields: marks } : after;
}

function beforeHasEntry(before: ResumeContent, parts: string[]): boolean {
  const section = (before.sections || []).find((s) => s.id === parts[0]) as unknown as Rec | undefined;
  const list = section?.[parts[1]];
  return Array.isArray(list) && list.some((item, i) => segOf(item, i) === parts[2]);
}

/** Drop marks whose field no longer holds the sample value (the user edited it). */
export function pruneSampleMarks<T extends ResumeContent>(content: T): T {
  if (!hasSampleMarks(content)) return content;
  const current = new Map(sampleLeaves(content).map((l) => [l.path, l.value]));
  const marks: SampleFields = {};
  let changed = false;
  for (const [path, value] of Object.entries(content.sampleFields)) {
    if (current.get(path) === value) marks[path] = value;
    else changed = true;
  }
  return changed ? { ...content, sampleFields: marks } : content;
}

/** Drop marks for fields under `scope` (a path prefix) that currently hold `value`. */
export function touchSampleValue<T extends ResumeContent>(content: T, value: string, scope = ""): T {
  if (!hasSampleMarks(content)) return content;
  const marks: SampleFields = {};
  let changed = false;
  for (const [path, mark] of Object.entries(content.sampleFields)) {
    const inScope = !scope || path.startsWith(`${scope}/`) || path.includes(`/${scope}/`);
    if (inScope && mark === value) changed = true;
    else marks[path] = mark;
  }
  return changed ? { ...content, sampleFields: marks } : content;
}

function hasText(node: unknown): boolean {
  if (typeof node === "string") return Boolean(node.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim());
  if (Array.isArray(node)) return node.some(hasText);
  if (isRec(node)) return Object.entries(node).some(([k, v]) => !SKIP_KEYS.has(k) && hasText(v));
  return false;
}

function stripNode(node: unknown, path: string, marks: SampleFields): unknown {
  if (typeof node === "string") return marks[path] === node ? "" : node;
  if (Array.isArray(node)) {
    const mapped = node.map((child, i) => stripNode(child, `${path}/${segOf(child, i)}`, marks));
    // Bullet / skill / tag lists lose blanked strings; entry lists lose entries with no text left.
    return mapped.filter((child, i) => {
      if (typeof child === "string") return typeof node[i] !== "string" || child !== "" || node[i] === "";
      if (isRec(child) && isRec(node[i]) && hasText(node[i])) return hasText(child);
      return true;
    });
  }
  if (isRec(node)) {
    const out: Rec = {};
    for (const [k, v] of Object.entries(node)) out[k] = SKIP_KEYS.has(k) ? v : stripNode(v, `${path}/${k}`, marks);
    return out;
  }
  return node;
}

/** Export copy: every field still holding its untouched sample value becomes empty. */
export function stripSampleFields<T extends ResumeContent>(content: T): T {
  if (!hasSampleMarks(content)) return content;
  const marks = content.sampleFields;
  const sections = content.sections.map((section) => {
    const s = section as unknown as Rec;
    const out: Rec = {};
    for (const [k, v] of Object.entries(s)) {
      const keep = SKIP_KEYS.has(k) || (k === "title" && s.type !== "header");
      out[k] = keep ? v : stripNode(v, `${s.id}/${k}`, marks);
    }
    return out as unknown as typeof section;
  });
  return { ...content, sections };
}

/** True when a body section has no text left (its heading alone is not content). */
export function isEmptySection(section: unknown): boolean {
  if (!isRec(section) || section.type === "header") return false;
  return !Object.entries(section).some(([k, v]) => !SKIP_KEYS.has(k) && k !== "title" && hasText(v));
}

/** Export copy without empty sections, so TXT/DOCX/PDF never print a lone heading. */
export function dropEmptySections<T extends ResumeContent>(content: T): T {
  if (!Array.isArray(content.sections)) return content;
  const empty = new Set(content.sections.filter(isEmptySection).map((s) => s.id));
  if (!empty.size) return content;
  return {
    ...content,
    sections: content.sections.filter((s) => !empty.has(s.id)),
    leftColumnIds: (content.leftColumnIds || []).filter((id) => !empty.has(id)),
    rightColumnIds: (content.rightColumnIds || []).filter((id) => !empty.has(id)),
  };
}
