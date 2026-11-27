/** Batch 3: Advanced ATS Checker — API types and editor helpers (Add to Skills, apply a fix). */
import type { ResumeDocument, ResumeSection } from "@/shared";

export type AtsLayerId = "parseability" | "keywords" | "impact" | "boards";
export type AtsSeverity = "high" | "medium" | "low";
export type AtsIssueSection = "header" | "summary" | "experience" | "education" | "skills" | "projects" | "general";
export type AtsCheck = { id: string; label: string; points: number; max: number; passed: boolean; detail: string };
export type AtsLayer = { id: AtsLayerId; label: string; score: number; max: number; checks: AtsCheck[] };
export type AtsIssue = {
  id: string;
  layer: AtsLayerId;
  severity: AtsSeverity;
  section: AtsIssueSection;
  title: string;
  detail: string;
  fixable: boolean;
  suggestedFix?: string;
  itemIndex?: number;
  sectionId?: string;
  fieldPath?: string;
  original?: string;
};
export type AtsBoard = { board: "indeed" | "linkedin" | "remoteok" | "glassdoor" | "monster"; label: string; status: "pass" | "warn" | "fail"; score: number; reason: string };
export type AtsKeywordMatch = { keyword: string; matchedAs: string; kind: "exact" | "synonym" | "semantic"; group: "required" | "niceToHave" };
export type AdvancedAts = {
  version: 2;
  score: number;
  grade: string;
  layers: AtsLayer[];
  keywords: {
    mode: "jd" | "role";
    role: string;
    benchmark: string;
    total: number;
    matched: string[];
    missing: string[];
    missingRequired: string[];
    missingNiceToHave: string[];
    semanticMatches: AtsKeywordMatch[];
    matches: AtsKeywordMatch[];
    skillCoverage: number;
    aiEnhanced: boolean;
  };
  boards: AtsBoard[];
  issues: AtsIssue[];
  plainTextPreview: string;
  stats: { wordCount: number; bulletCount: number; quantifiedBullets: number; strongVerbBullets: number; weakBullets: number; sections: string[] };
  analyzedAt: string;
};
export type AtsRewrite = { text: string; source: "ai" | "rule"; changes: string[] };

/** Parse "items[0].bullets[2]" -> ["items", 0, "bullets", 2]. */
export function parseFieldPath(path: string): Array<string | number> {
  const out: Array<string | number> = [];
  const re = /([A-Za-z_]\w*)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) out.push(m[1] !== undefined ? m[1] : Number(m[2]));
  return out;
}

/** Read a value at a field path (undefined when the path does not exist). */
export function getAtPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of parseFieldPath(path)) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[key as never];
  }
  return cur;
}

/** Immutable set at a field path; returns null when the path does not exist (nothing is created). */
export function setAtPath<T>(obj: T, path: string, value: string): T | null {
  const keys = parseFieldPath(path);
  if (!keys.length) return null;
  const walk = (node: unknown, i: number): unknown => {
    if (node === null || typeof node !== "object") return Symbol.for("missing");
    const key = keys[i];
    const container = node as Record<string | number, unknown>;
    if (!(key in container)) return Symbol.for("missing");
    const next = i === keys.length - 1 ? value : walk(container[key as never], i + 1);
    if (next === Symbol.for("missing")) return next;
    if (Array.isArray(node)) {
      const copy = [...node];
      copy[key as number] = next;
      return copy;
    }
    return { ...container, [key]: next };
  };
  const res = walk(obj, 0);
  return res === Symbol.for("missing") ? null : (res as T);
}

const norm = (s: string) => s.replace(/<[^>]*>/g, "").trim().toLowerCase();

/** True when the resume already lists this skill in a Skills section. */
export function hasSkill(doc: ResumeDocument, keyword: string): boolean {
  const k = norm(keyword);
  return doc.content.sections.some((s) => s.type === "skills" && s.categories.some((c) => c.skills.some((x) => norm(x) === k)));
}

/**
 * Add a keyword to the resume's Skills (first category of the first Skills section). Creates the section
 * when the resume has none. Returns the new document, or null when the skill is already there.
 */
export function addSkillToDocument(doc: ResumeDocument, keyword: string): ResumeDocument | null {
  const kw = keyword.trim();
  if (!kw || hasSkill(doc, kw)) return null;
  const skills = doc.content.sections.find((s) => s.type === "skills");
  if (skills && skills.type === "skills") {
    const categories = skills.categories.length
      ? skills.categories.map((c, i) => (i === 0 ? { ...c, skills: [...c.skills, kw] } : c))
      : [{ id: `cat-${Date.now().toString(36)}`, name: "", skills: [kw] }];
    return {
      ...doc,
      content: { ...doc.content, sections: doc.content.sections.map((s) => (s.id === skills.id ? ({ ...skills, categories } as ResumeSection) : s)) },
    };
  }
  const id = `skills-${Date.now().toString(36)}`;
  const section: ResumeSection = { type: "skills", id, title: "Skills", categories: [{ id: `cat-${Date.now().toString(36)}`, name: "", skills: [kw] }] };
  const inLeft = doc.content.leftColumnIds.some((x) => doc.content.sections.find((s) => s.id === x)?.type === "experience");
  return {
    ...doc,
    content: {
      sections: [...doc.content.sections, section],
      leftColumnIds: inLeft || !doc.content.rightColumnIds.length ? [...doc.content.leftColumnIds, id] : doc.content.leftColumnIds,
      rightColumnIds: inLeft || !doc.content.rightColumnIds.length ? doc.content.rightColumnIds : [...doc.content.rightColumnIds, id],
    },
  };
}

/** The editor section an issue points at (explicit id first, then the first section of that type). */
export function issueSectionId(doc: ResumeDocument, issue: Pick<AtsIssue, "section" | "sectionId">): string | null {
  if (issue.sectionId && doc.content.sections.some((s) => s.id === issue.sectionId)) return issue.sectionId;
  if (issue.section === "general") return null;
  return doc.content.sections.find((s) => s.type === issue.section)?.id ?? null;
}
