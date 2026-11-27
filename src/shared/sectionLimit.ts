/**
 * Free-plan section limit for PDF download. Kept byte-identical in
 * resume-builder-backend/src/shared and resume-builder-frontend/src/shared (parity test).
 *
 * Counting rules (CEO, Nov 27 2026):
 * - every section in the resume counts, filled or empty;
 * - the Header / Personal Info block never counts (counting starts at Summary);
 * - a repeated section id is counted once.
 */

/** Default Free-plan limit (admin setting `freeLimits.maxSectionsForFreePdf`). */
export const DEFAULT_FREE_PDF_SECTION_LIMIT = 4;

/** Error code sent with HTTP 402 when a PDF is blocked by the section limit. */
export const SECTION_LIMIT_CODE = "SECTION_LIMIT";

/** Sections in a resume, excluding Header / Personal Info. Filled and empty sections both count. */
export function countResumeSections(content: unknown): number {
  if (!content || typeof content !== "object") return 0;
  const list = (content as { sections?: unknown }).sections;
  if (!Array.isArray(list)) return 0;
  const seen = new Set<string>();
  let count = 0;
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const sec = raw as { type?: unknown; id?: unknown };
    if (typeof sec.type !== "string" || !sec.type || sec.type === "header") continue;
    if (typeof sec.id === "string" && sec.id) {
      if (seen.has(sec.id)) continue;
      seen.add(sec.id);
    }
    count += 1;
  }
  return count;
}

/** Plan of an account for the section limit. Admins and Pro are never limited. */
export type SectionPlan = "free" | "pro" | "admin";

/** Effective limit: 0 = unlimited (Pro, Admin, limit switched off, or set to 0). */
export function effectiveSectionLimit(plan: SectionPlan, settings: { enabled: boolean; max: number }): number {
  if (plan !== "free" || !settings.enabled) return 0;
  return Number.isFinite(settings.max) && settings.max > 0 ? Math.floor(settings.max) : 0;
}

/** True when a PDF download must be blocked (limit > 0 and the resume has more sections). */
export function sectionLimitBlocked(count: number, limit: number): boolean {
  return limit > 0 && count > limit;
}

/** The user-facing message for a blocked PDF download. */
export function sectionLimitMessage(limit: number, count: number): string {
  return `Your Free plan allows up to ${limit} section${limit === 1 ? "" : "s"} for PDF download. This resume has ${count} section${count === 1 ? "" : "s"}. Upgrade your plan to download.`;
}
