/**
 * Lightweight ATS simulation (no network, no AI).
 * Models how Indeed / LinkedIn / Glassdoor typically flatten resumes:
 * - strip visual layout/columns
 * - parse plain text + labeled fields
 * - keyword & structure scoring
 */
import type { ResumeDocument, ResumeSection } from "@/shared";
import { isPlaceholder, sectionIsEmpty } from "@/lib/placeholders";

export type AtsPlatform = "indeed" | "linkedin" | "glassdoor";

export type AtsPlatformResult = {
  platform: AtsPlatform;
  label: string;
  plainText: string;
  fields: { label: string; value: string }[];
  score: number;
  issues: string[];
  tips: string[];
  keywordsFound: string[];
  keywordsMissing: string[];
};

const KEYWORDS = [
  "aws",
  "azure",
  "gcp",
  "kubernetes",
  "k8s",
  "docker",
  "terraform",
  "ci/cd",
  "c++",
  "node.js",
  "javascript",
  "go",
  "github actions",
  "gitlab",
  "jenkins",
  "linux",
  "python",
  "ansible",
  "prometheus",
  "grafana",
  "microservices",
  "devops",
  "sre",
  "iam",
  "eks",
  "helm",
  "nginx",
];

const SYNONYM_GROUPS = [
  ["kubernetes", "k8s"],
  ["javascript", "js"],
];

const KEPT_PHRASES = ["github actions", "ci/cd", "c++", "node.js", "react.js", "next.js"];

const ROLE_OR_SKILL =
  /\b(?:engineer|developer|manager|designer|analyst|nurse|teacher|marketing|sales|support|scientist|architect|consultant|director|recruiter|intern|administrator|specialist|coordinator|officer|associate|senior|junior|lead|skill|skills|experience|responsibilities|requirements|qualifications|proficient|python|java|javascript|typescript|react|sql|aws|azure|gcp|docker|kubernetes|node\.js|ci\/cd|c\+\+|communication|customer|product|software|data|clinical|finance|accounting|design)\b/i;

function normalizeAtsText(value: string): string {
  let text = value.toLowerCase();
  for (let pass = 0; pass < 3; pass += 1) {
    const next = text
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/<[^>]+>/g, " ");
    if (next === text) break;
    text = next;
  }
  return text
    .replace(/[.,;:!?]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandSynonyms(tokens: Set<string>) {
  for (const group of SYNONYM_GROUPS) {
    if (group.some((item) => tokens.has(item))) {
      for (const item of group) tokens.add(item);
    }
  }
}

/** Tokens kept for ATS matching. Trailing punctuation is removed; Go, CI/CD, C++, and Node.js stay. */
export function atsTokenSet(value: string): Set<string> {
  const normalized = normalizeAtsText(value);
  const tokens = new Set<string>();
  for (const phrase of KEPT_PHRASES) {
    if (normalized.includes(phrase)) tokens.add(phrase);
  }
  for (const raw of normalized.split(/[^a-z0-9+./#]+/)) {
    const token = raw.replace(/^[./#]+|[./#]+$/g, "");
    if (token.length < 2) continue;
    tokens.add(token);
  }
  expandSynonyms(tokens);
  return tokens;
}

export function keywordMatches(text: string, keyword: string): boolean {
  const needle = keyword.toLowerCase().replace(/[.,;:!?]+$/g, "").trim();
  if (!needle) return false;
  const tokens = atsTokenSet(text);
  if (tokens.has(needle)) return true;
  for (const group of SYNONYM_GROUPS) {
    if (group.includes(needle) && group.some((item) => tokens.has(item))) return true;
  }
  if (needle.includes(" ") && normalizeAtsText(text).includes(needle)) return true;
  return false;
}

/** Nonsense or too-thin job ads are rejected instead of scored. */
export function jobDescriptionRejection(jd: string): string | null {
  const visible = String(jd ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  const letters = visible.replace(/[^a-z]/gi, "");
  const words = visible
    .toLowerCase()
    .split(/[^a-z0-9+./#]+/)
    .map((word) => word.replace(/^[./#]+|[./#]+$/g, ""))
    .filter((word) => word.length >= 2);
  const unique = new Set(words);
  const hasRoleOrSkill = ROLE_OR_SKILL.test(visible);
  if (letters.length < 40 || unique.size < 5 || !hasRoleOrSkill) {
    return "This doesn’t look like a job description — no clear role or skills, or it’s too short. Paste a real posting. Nothing was scored.";
  }
  return null;
}

function plain(value: unknown): string {
  let text = String(value ?? "");
  for (let pass = 0; pass < 3; pass += 1) {
    const next = text
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_, n: string) => {
        const code = Number(n);
        return code > 0 && code < 0x10ffff ? String.fromCharCode(code) : "";
      })
      .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => {
        const code = parseInt(n, 16);
        return code > 0 && code < 0x10ffff ? String.fromCharCode(code) : "";
      })
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "");
    if (next === text) break;
    text = next;
  }
  return text.replace(/&amp;/gi, "&");
}

function clean(s: unknown) {
  return plain(s).replace(/[ \t]+/g, " ").trim();
}

function sectionTitle(s: ResumeSection) {
  if (s.type === "header") return "HEADER";
  return "title" in s && typeof s.title === "string" ? s.title.toUpperCase() : s.type.toUpperCase();
}

/** Flatten resume the way ATS parsers usually do (ignore columns/colors). */
export function flattenResumeText(doc: ResumeDocument): string {
  const lines: string[] = [];
  const order = [
    ...doc.content.sections.filter((s) => s.type === "header"),
    ...doc.content.leftColumnIds
      .map((id) => doc.content.sections.find((s) => s.id === id))
      .filter(Boolean),
    ...doc.content.rightColumnIds
      .map((id) => doc.content.sections.find((s) => s.id === id))
      .filter(Boolean),
  ] as ResumeSection[];

  // de-dupe by id while preserving order
  const seen = new Set<string>();
  for (const section of order) {
    if (seen.has(section.id)) continue;
    seen.add(section.id);

    if (section.type !== "header" && sectionIsEmpty(section)) continue;

    if (section.type === "header") {
      lines.push(clean(section.fullName));
      lines.push(clean(section.title));
      const c = section.contact;
      lines.push(
        [c.phone, c.email, c.linkedinHref || c.linkedin, c.location, c.website || c.extraLinkHref, c.github]
          .map((part) => clean(part))
          .filter((part) => part && !isPlaceholder(part))
          .join(" | ")
      );
      lines.push("");
      continue;
    }

    lines.push(sectionTitle(section));
    lines.push("-".repeat(Math.min(40, sectionTitle(section).length)));

    switch (section.type) {
      case "summary":
        if (!isPlaceholder(section.content)) lines.push(clean(section.content));
        break;
      case "experience":
        for (const i of section.items) {
          const title = clean(i.title);
          const company = clean(i.company);
          if (!isPlaceholder(title)) lines.push(title);
          if (!isPlaceholder(company)) lines.push(company);
          const dates = [i.startDate, i.endDate].filter((part) => part && !isPlaceholder(part)).join(" - ");
          if (dates) lines.push(dates);
          if (!isPlaceholder(i.location)) lines.push(clean(i.location));
          if (i.link && !isPlaceholder(i.link)) lines.push(clean(i.link));
          if (i.description && !isPlaceholder(i.description)) lines.push(clean(i.description));
          for (const b of i.bullets) {
            if (!isPlaceholder(b)) lines.push(`- ${clean(b)}`);
          }
          for (const row of i.projects ?? []) {
            if (isPlaceholder(row.name) && isPlaceholder(row.description)) continue;
            lines.push(`${clean(row.name)}: ${clean(row.description)}`);
          }
          lines.push("");
        }
        break;
      case "education":
        for (const i of section.items) {
          lines.push(i.degree);
          lines.push(i.school);
          lines.push(`${i.startDate} - ${i.endDate}`);
          lines.push(i.location);
          if (i.gpa) lines.push(`GPA: ${i.gpa}`);
          lines.push("");
        }
        break;
      case "skills":
        for (const c of section.categories) {
          lines.push(`${c.name}: ${c.skills.join(", ")}`);
        }
        break;
      case "projects":
        for (const i of section.items) {
          lines.push(i.name);
          if (i.startDate || i.endDate)
            lines.push(`${i.startDate ?? ""} - ${i.endDate ?? ""}`);
          if (i.location) lines.push(i.location);
          lines.push(i.description);
          if (i.technologies?.length) lines.push(i.technologies.join(", "));
          if (i.link) lines.push(i.link);
          lines.push("");
        }
        break;
      case "certifications":
        for (const i of section.items) {
          lines.push(`${i.name} — ${i.issuer}${i.date ? ` (${i.date})` : ""}`);
          if (i.url) lines.push(i.url);
        }
        break;
      case "achievements":
      case "strengths":
        for (const i of section.items) lines.push(`- ${i.text}`);
        break;
      case "volunteering":
        for (const i of section.items) {
          lines.push(i.role);
          lines.push(i.organization);
          lines.push(`${i.startDate} - ${i.endDate}`);
          if (i.location) lines.push(i.location);
          lines.push(i.description);
          lines.push("");
        }
        break;
      case "languages":
        for (const i of section.items) lines.push(`${i.name}: ${i.level}`);
        break;
      case "awards":
        for (const i of section.items) {
          lines.push(`${i.name}${i.issuer ? ` — ${i.issuer}` : ""}${i.date ? ` (${i.date})` : ""}`);
        }
        break;
      case "interests":
        for (const i of section.items) lines.push(`${i.title}${i.description ? `: ${i.description}` : ""}`);
        break;
      case "references":
        for (const i of section.items) lines.push([i.name, i.email, i.phone].filter(Boolean).join(" · "));
        break;
      case "custom":
        for (const i of section.items) {
          lines.push(i.title);
          if (i.subtitle) lines.push(i.subtitle);
          if (i.link) lines.push(i.link);
          if (i.description) lines.push(i.description);
          lines.push("");
        }
        break;
      case "philosophy":
        lines.push(section.quote);
        if (section.author) lines.push(section.author);
        break;
      case "online":
        for (const i of section.items) lines.push([i.platform, i.username, i.url].filter(Boolean).join(" · "));
        break;
      case "industryExpertise":
        for (const i of section.items) lines.push(i.name);
        break;
      case "myTime":
        for (const i of section.items) lines.push(`${i.label}: ${i.percent}%`);
        break;
      default:
        break;
    }
    lines.push("");
  }

  // BUG-1250: no lines that are only a star/bullet glyph (left over from blank sample items).
  return lines
    .map(clean)
    .filter((l) => !/^\s*[★☆•·▪\-–—*]+\s*$/.test(l))
    .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
    .join("\n");
}

function linkedinUrl(contact: { linkedin?: string; linkedinHref?: string }): string {
  const href = clean(contact.linkedinHref || "");
  const label = clean(contact.linkedin || "");
  if (href) return href;
  return label;
}

function extractFields(doc: ResumeDocument): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];
  const header = doc.content.sections.find((s) => s.type === "header");
  if (header && header.type === "header") {
    fields.push({ label: "Name", value: clean(header.fullName) });
    fields.push({ label: "Headline", value: clean(header.title) });
    if (header.contact.email) fields.push({ label: "Email", value: clean(header.contact.email) });
    if (header.contact.phone) fields.push({ label: "Phone", value: clean(header.contact.phone) });
    if (header.contact.location)
      fields.push({ label: "Location", value: clean(header.contact.location) });
    const linkedin = linkedinUrl(header.contact);
    if (linkedin && !isPlaceholder(linkedin)) fields.push({ label: "LinkedIn", value: linkedin });
  }
  const exp = doc.content.sections.find((s) => s.type === "experience");
  if (exp && exp.type === "experience") {
    exp.items.forEach((i, n) => {
      fields.push({
        label: `Job ${n + 1}`,
        value: clean(`${i.title} @ ${i.company} (${i.startDate}–${i.endDate}) · ${i.location}`),
      });
    });
  }
  const edu = doc.content.sections.find((s) => s.type === "education");
  if (edu && edu.type === "education") {
    edu.items.forEach((i, n) => {
      fields.push({
        label: `Education ${n + 1}`,
        value: clean(`${i.degree}, ${i.school} (${i.startDate}–${i.endDate})`),
      });
    });
  }
  const skills = doc.content.sections.find((s) => s.type === "skills");
  if (skills && skills.type === "skills") {
    fields.push({
      label: "Skills",
      value: clean(skills.categories.flatMap((c) => c.skills).join(", ")),
    });
  }
  return fields;
}

function scoreFor(
  platform: AtsPlatform,
  plain: string,
  doc: ResumeDocument
): Pick<AtsPlatformResult, "score" | "issues" | "tips" | "keywordsFound" | "keywordsMissing"> {
  const found = KEYWORDS.filter((k) => keywordMatches(plain, k));
  const missing = KEYWORDS.filter((k) => !keywordMatches(plain, k)).slice(0, 8);
  const issues: string[] = [];
  const tips: string[] = [];
  let score = 45 + found.length * 4;

  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(plain);
  const hasPhone = /\+?\d[\d\s()-]{7,}/.test(plain);
  const hasDates = /\d{4}/.test(plain);
  const hasExperience = /experience/i.test(plain);
  const hasSkills = /skill/i.test(plain);

  if (!hasEmail) {
    issues.push("Email not detected — ATS often rejects incomplete contact blocks.");
    score -= 12;
  }
  if (!hasPhone) {
    issues.push("Phone number missing or hard to parse.");
    score -= 6;
  }
  if (!hasDates) {
    issues.push("Few/no dates found — chronological ATS ranking suffers.");
    score -= 10;
  }
  if (!hasExperience) {
    issues.push("No clear EXPERIENCE heading.");
    score -= 8;
  }
  if (!hasSkills) {
    tips.push("Add a SKILLS section with exact job-description keywords.");
    score -= 4;
  }

  // tables / multi-column risk note
  if (doc.design.columnLayout !== "single") {
    tips.push(
      "Multi-column layouts can scramble reading order in some ATS parsers — plain-text order is what matters."
    );
    if (platform === "indeed") score -= 3;
  }

  if (platform === "indeed") {
    tips.push(
      "Indeed ATS prefers simple chronological text: Title → Company → Dates → Location → bullets."
    );
    if (found.length < 4) {
      issues.push("Low keyword overlap for Indeed search ranking.");
      score -= 5;
    }
  }

  if (platform === "linkedin") {
    tips.push(
      "LinkedIn Easy Apply / Recruiter parses Headline, About, Experience titles, and skill tokens heavily."
    );
    const header = doc.content.sections.find((s) => s.type === "header");
    if (header && header.type === "header" && header.title.length > 120) {
      issues.push("Headline is long — LinkedIn truncates aggressively.");
      score -= 4;
    }
    if (
      header?.type === "header" &&
      !clean(header.contact.linkedinHref || "") &&
      !clean(header.contact.linkedin || "")
    ) {
      tips.push("Add a LinkedIn URL for profile matching.");
    }
  }

  if (platform === "glassdoor") {
    tips.push(
      "Glassdoor/employer ATS stacks often match employer names + job titles before body keywords."
    );
    const exp = doc.content.sections.find((s) => s.type === "experience");
    if (exp && exp.type === "experience") {
      const weak = exp.items.some((i) => !i.company || !i.title || !i.startDate);
      if (weak) {
        issues.push("Some roles missing title/company/dates — Glassdoor parsers drop incomplete jobs.");
        score -= 8;
      }
    }
  }

  score = Math.max(18, Math.min(98, Math.round(score)));
  return { score, issues, tips, keywordsFound: found, keywordsMissing: missing };
}

/** Simulate Indeed-style HTML→text extraction (links/lists often leak as tags). */
function indeedHtmlLeak(doc: ResumeDocument): string {
  const lines: string[] = [];
  const order = [
    ...doc.content.sections.filter((s) => s.type === "header"),
    ...doc.content.leftColumnIds
      .map((id) => doc.content.sections.find((s) => s.id === id))
      .filter(Boolean),
    ...doc.content.rightColumnIds
      .map((id) => doc.content.sections.find((s) => s.id === id))
      .filter(Boolean),
  ] as ResumeSection[];

  const seen = new Set<string>();
  for (const section of order) {
    if (seen.has(section.id)) continue;
    seen.add(section.id);

    if (section.type === "header") {
      lines.push(section.fullName, section.title);
      const c = section.contact;
      if (c.email) lines.push(c.email);
      if (c.phone) lines.push(c.phone);
      if (c.location) lines.push(c.location);
      const linkedin = linkedinUrl(c);
      if (linkedin) lines.push(linkedin);
      lines.push("");
      continue;
    }

    lines.push(sectionTitle(section));
    switch (section.type) {
      case "summary": {
        const items = section.content
          .split(/\n|•/)
          .map((x) => x.trim())
          .filter(Boolean);
        for (const item of items) lines.push(items.length > 1 ? `- ${item}` : item);
        break;
      }
      case "experience":
        for (const i of section.items) {
          lines.push(i.title || "Title");
          lines.push(i.company || "Company Name");
          lines.push(`${i.startDate || "Date period"} - ${i.endDate || ""}`);
          lines.push(i.location || "Location");
          for (const bullet of i.bullets) lines.push(`- ${bullet}`);
          lines.push("");
        }
        break;
      case "education":
        for (const i of section.items) {
          lines.push(i.degree, i.school, `${i.startDate} - ${i.endDate}`, i.location);
          if (i.gpa) lines.push(`GPA: ${i.gpa}`);
          lines.push("");
        }
        break;
      case "skills":
        for (const c of section.categories) {
          lines.push(`${c.name}: ${c.skills.join(", ")}`);
        }
        break;
      case "projects":
        for (const i of section.items) {
          lines.push(i.name);
          if (i.startDate || i.endDate) lines.push(`${i.startDate ?? ""} - ${i.endDate ?? ""}`);
          if (i.location) lines.push(i.location);
          lines.push(i.description);
          lines.push("");
        }
        break;
      case "certifications":
        for (const i of section.items) {
          lines.push(`${i.name} — ${i.issuer}${i.date ? ` (${i.date})` : ""}`);
        }
        break;
      case "achievements":
      case "strengths":
        for (const i of section.items) lines.push(i.text);
        break;
      case "volunteering":
        for (const i of section.items) {
          lines.push(i.role, i.organization, `${i.startDate} - ${i.endDate}`, i.description, "");
        }
        break;
      case "languages":
        for (const i of section.items) lines.push(`${i.name}: ${i.level}`);
        break;
      default:
        break;
    }
    lines.push("");
  }

  return lines
    .map(clean)
    .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
    .join("\n");
}

function renderPlatformText(
  platform: AtsPlatform,
  doc: ResumeDocument,
  plain: string
): string {
  const fields = extractFields(doc);
  if (platform === "linkedin") {
    return [
      "=== LINKEDIN EASY APPLY / RECRUITER PARSE ===",
      "Profile fields mapped from resume upload:",
      "",
      ...fields.map((f) => `${f.label}: ${f.value}`),
      "",
      "=== SKILLS TOKENS ===",
      fields.find((f) => f.label === "Skills")?.value || "(none detected)",
      "",
      "=== RAW TEXT STREAM ===",
      plain,
    ].join("\n");
  }
  if (platform === "indeed") {
    return [
      "=== INDEED ATS DOCUMENT EXTRACT ===",
      "(PDF/DOCX → HTML → plain text; columns & styles discarded)",
      "",
      plain,
    ].join("\n");
  }
  return [
    "=== GLASSDOOR / EMPLOYER ATS EXTRACT ===",
    "(Structured match: employer · title · dates · location)",
    "",
    ...fields
      .filter((f) => /Name|Headline|Job|Education|Skills|Location|Email|Phone/i.test(f.label))
      .map((f) => `${f.label}: ${f.value}`),
    "",
    "=== FULL TEXT ===",
    plain.replace(/[•●◆]/g, "-"),
  ].join("\n");
}

const LABELS: Record<AtsPlatform, string> = {
  indeed: "Indeed",
  linkedin: "LinkedIn",
  glassdoor: "Glassdoor",
};

export function analyzeAts(doc: ResumeDocument, platform: AtsPlatform): AtsPlatformResult {
  const plain = flattenResumeText(doc);
  const scored = scoreFor(platform, plain, doc);
  return {
    platform,
    label: LABELS[platform],
    plainText: renderPlatformText(platform, doc, plain),
    fields: extractFields(doc),
    ...scored,
  };
}

export function analyzeAllAts(doc: ResumeDocument): AtsPlatformResult[] {
  return (["indeed", "linkedin", "glassdoor"] as const).map((p) => analyzeAts(doc, p));
}
