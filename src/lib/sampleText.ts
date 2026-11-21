/**
 * BUG-027/409/1240: sample copy shipped in the default/template resumes (defaults.ts,
 * templateStarter.ts). Used ONLY at export time (PDF/print, TXT, DOCX), never on save, so a
 * value the user really typed is always stored. Short real-world values (degrees, single skills)
 * are not listed; a skills group is dropped only when it is exactly an untouched sample group.
 */
export const SAMPLE_TEXT: readonly string[] = [
  // BUG-1250: sample role titles.
  "role title",
  "senior role title",
  "junior role title",
  "+1-(234)-555-1234",
  "analyzed performance data and recommended changes that raised conversion.",
  "automated recurring tasks and reduced manual work for the team.",
  "built and improved core workflows used by customers and internal teams.",
  "city, country",
  "collaborated with design and engineering to ship reliable releases.",
  "company name",
  "drove a cross-team initiative that lifted the primary kpi within two quarters.",
  "end-to-end initiative with clear goals, measurable outcomes, and documented learnings.",
  "exploring new tools, books, and communities that sharpen craft.",
  "first company",
  "flagship project",
  "grew key metric by 40%",
  "hello@email.com",
  "helping teammates grow through feedback and shared practice.",
  "improved team delivery",
  "industry certificate",
  "issuing organization",
  "launched major product",
  "led initiatives that improved delivery speed and quality across the team.",
  "mentored teammates and documented processes for clearer handoffs.",
  "partnered with stakeholders to define goals, roadmaps, and success metrics.",
  "personal or open-source project showcasing craft and problem-solving.",
  "previous company",
  "professional certification",
  "reduced cycle time by standardizing rituals and clarifying ownership.",
  "results-driven professional with experience delivering impact across teams and products. skilled at turning goals into clear plans, collaborating cross-functionally, and improving outcomes with measurable results.",
  "shipped a new offering from discovery to release with clear stakeholder alignment.",
  "side project",
  "supported day-to-day operations and prepared reports for leadership.",
  "training provider",
  "university name",
  "your name",
  "your role | specialty | focus area"
];

/** Untouched sample skill groups (sorted, lower-case). */
export const SAMPLE_SKILL_SETS: readonly string[] = [
  // BUG-1250: sample project technology tags.
  "analytics|delivery|research",
  "build|design",
  "analysis|communication|leadership|strategy",
  "excel|figma|jira|notion|sql"
];

export function isSampleSkillGroup(skills: unknown): boolean {
  if (!Array.isArray(skills) || skills.length === 0) return false;
  const key = skills
    .map((s) => String(s ?? "").replace(/<[^>]+>/g, "").trim().toLowerCase())
    .sort()
    .join("|");
  return SAMPLE_SKILL_SETS.includes(key);
}
