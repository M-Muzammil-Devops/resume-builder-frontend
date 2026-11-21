import type { ResumeSection } from "@/shared";
import { SAMPLE_TEXT, isSampleSkillGroup } from "./sampleText";
import { dropEmptySections, hasSampleMarks, stripSampleFields, type ResumeContent } from "@/shared";

/**
 * BUG-1240b: while an export of a resume with sample marks renders, only blank text counts as a
 * placeholder, so a typed value that equals a sample string is never hidden.
 */
let provenance = false;
export function setProvenanceMode(on: boolean) {
  provenance = on;
}
export function withProvenance<R>(content: unknown, fn: () => R): R {
  const previous = provenance;
  provenance = hasSampleMarks(content);
  try {
    return fn();
  } finally {
    provenance = previous;
  }
}

const PLACEHOLDERS = new Set([
  "title",
  "company name",
  "location",
  "company description",
  "highlight your accomplishments, using numbers if possible.",
  "text",
  "project name",
  "description",
  "your skill",
  "group",
  "award name",
  "issuer",
  "date",
  "url",
  "date period",
  "to",
  "role title",
  "senior role title",
  "junior role title",
  "previous company",
  "your name",
  "industry certificate",
  "describe your custom entry",
  "describe your custom entry.",
  "short summary",
  "city, country",
  "start",
  "end",
  "add dates",
  // BUG-027: sample header copy must never export.
  "your role | specialty | focus area",
  "hello@email.com",
  "+1-(234)-555-1234",
  "university name",
  "school name",
  "issuing organization",
]);

const SAMPLE_SET = new Set(SAMPLE_TEXT);

export function isPlaceholder(value: unknown): boolean {
  const text = String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim()
    .toLowerCase();
  if (provenance) return !text;
  if (!text || PLACEHOLDERS.has(text) || SAMPLE_SET.has(text)) return true;
  const parts = text.split(/\s*(?:\/|–|—|-|\|)\s*/).filter(Boolean);
  return parts.length > 1 && parts.every((part) => PLACEHOLDERS.has(part));
}

const SCRUB_SKIP = new Set(["type", "id", "settings", "layoutKey", "variant", "icon", "level", "style"]);

/**
 * BUG-027/409: a copy of the resume with sample/placeholder text blanked, for every
 * export path (print/PDF, TXT, DOCX). Links, ids and settings are left alone.
 */
export function scrubPlaceholders<T extends { content: unknown }>(doc: T): T {
  // BUG-1240b: marked resumes drop only untouched sample fields; empty sections are dropped too.
  if (hasSampleMarks(doc.content)) {
    return { ...doc, content: dropEmptySections(stripSampleFields(doc.content)) as T["content"] };
  }
  const walk = (value: unknown, key: string | null): unknown => {
    if (typeof value === "string") {
      if (key && (SCRUB_SKIP.has(key) || /href|url|link$/i.test(key))) return value;
      return value.trim() && isPlaceholder(value) ? "" : value;
    }
    if (Array.isArray(value)) return value.map((item) => walk(item, key));
    if (value && typeof value === "object") {
      const rec = value as Record<string, unknown>;
      if (isSampleSkillGroup(rec.skills)) return { ...rec, name: "", skills: [] };
      if (isSampleSkillGroup(rec.technologies)) return walk({ ...rec, technologies: [] }, key);
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = SCRUB_SKIP.has(k) ? v : walk(v, k);
      }
      return out;
    }
    return value;
  };
  const scrubbed = walk(doc.content, null) as ResumeContent;
  const content = scrubbed && Array.isArray(scrubbed.sections) ? dropEmptySections(scrubbed) : scrubbed;
  return { ...doc, content: content as T["content"] };
}

export function sectionIsEmpty(section: ResumeSection): boolean {
  switch (section.type) {
    case "header":
      return false;
    case "summary":
      return isPlaceholder(section.content);
    case "experience":
      return section.items.every(
        (item) =>
          isPlaceholder(item.title) &&
          isPlaceholder(item.company) &&
          isPlaceholder(item.description) &&
          isPlaceholder(item.location) &&
          !item.link?.trim() &&
          (item.bullets ?? []).every((bullet) => isPlaceholder(bullet)) &&
          (item.projects ?? []).every(
            (row) => isPlaceholder(row.name) && isPlaceholder(row.description)
          )
      );
    case "education":
      return section.items.every(
        (item) => isPlaceholder(item.degree) && isPlaceholder(item.school)
      );
    case "skills":
      return section.categories.every(
        (cat) => cat.skills.every((skill) => isPlaceholder(skill))
      );
    case "projects":
      return section.items.every(
        (item) => isPlaceholder(item.name) && isPlaceholder(item.description)
      );
    case "certifications":
      return section.items.every((item) => isPlaceholder(item.name) && isPlaceholder(item.issuer));
    case "achievements":
    case "strengths":
      return section.items.every((item) => isPlaceholder(item.text));
    case "languages":
      return section.items.every((item) => isPlaceholder(item.name));
    case "awards":
      return section.items.every(
        (item) => isPlaceholder(item.name) && isPlaceholder(item.issuer)
      );
    case "custom":
      return section.items.every(
        (item) => isPlaceholder(item.title) && isPlaceholder(item.description)
      );
    case "interests":
      return section.items.length === 0 || section.items.every(
        (item) => isPlaceholder(item.title) && isPlaceholder(item.description)
      );
    case "references":
      return section.items.length === 0 || section.items.every(
        (item) => isPlaceholder(item.name) && isPlaceholder(item.email) && isPlaceholder(item.phone)
      );
    case "volunteering":
      return section.items.length === 0 || section.items.every(
        (item) => isPlaceholder(item.role) && isPlaceholder(item.organization) && isPlaceholder(item.description)
      );
    case "myTime":
      return section.items.length === 0 || section.items.every((item) => isPlaceholder(item.label));
    default:
      return false;
  }
}
