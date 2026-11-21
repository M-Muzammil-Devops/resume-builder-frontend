/**
 * Local Improve Text engine (no network required).
 * Scans the resume for real spelling, wording, and content issues —
 * every suggestion points at a section/field that exists in the document.
 */
import type { ImproveSuggestion, ResumeDocument, ResumeSection } from "@/shared";

export type ImproveOptions = {
  spellcheck?: boolean;
  wording?: boolean;
  recommendations?: boolean;
  tailored?: boolean;
};

type TextHit = {
  sectionId: string;
  sectionType: string;
  sectionTitle: string;
  itemId?: string;
  fieldPath: string;
  locationLabel: string;
  text: string;
};

const COMMON_MISSPELLINGS: Record<string, string> = {
  enviroment: "environment",
  enviroments: "environments",
  infrastrucure: "infrastructure",
  infrastruture: "infrastructure",
  sucess: "success",
  succesful: "successful",
  successfuly: "successfully",
  acheive: "achieve",
  acheived: "achieved",
  acheivement: "achievement",
  responsibile: "responsible",
  managment: "management",
  developement: "development",
  experiance: "experience",
  experince: "experience",
  relevent: "relevant",
  seperate: "separate",
  occured: "occurred",
  definately: "definitely",
  recieve: "receive",
  recieved: "received",
  maintanance: "maintenance",
  maintainance: "maintenance",
  performace: "performance",
  performence: "performance",
  reliablity: "reliability",
  availablity: "availability",
  automtion: "automation",
  depoyment: "deployment",
  deployement: "deployment",
  orchestation: "orchestration",
  kubernettes: "kubernetes",
  kubernets: "kubernetes",
  containarization: "containerization",
  monitoning: "monitoring",
  observabilty: "observability",
  tecnical: "technical",
  teh: "the",
  alot: "a lot",
  adress: "address",
  commited: "committed",
  transfered: "transferred",
  writen: "written",
  langauge: "language",
  devops: "DevOps",
  javascript: "JavaScript",
  typescript: "TypeScript",
  github: "GitHub",
  linkedin: "LinkedIn",
};

/** Tech / proper nouns we never flag as misspellings */
const ALLOWLIST = new Set(
  [
    "aws",
    "eks",
    "ec2",
    "iam",
    "s3",
    "vpc",
    "cdn",
    "ci",
    "cd",
    "cicd",
    "k8s",
    "helm",
    "argo",
    "nginx",
    "apache",
    "redis",
    "postgresql",
    "mariadb",
    "terraform",
    "ansible",
    "prometheus",
    "grafana",
    "devops",
    "sre",
    "mttr",
    "sla",
    "slos",
    "tls",
    "ssl",
    "api",
    "apis",
    "saas",
    "paas",
    "iaas",
    "github",
    "gitlab",
    "linkedin",
    "cncf",
    "cka",
    "ckad",
    "az",
    "multi",
    "muzammil",
    "muhammad",
    "multan",
    "punjab",
    "pakistan",
    "nafi",
    "softsolution",
    "elevate",
  ].map((w) => w.toLowerCase())
);

type WordingRule = {
  pattern: RegExp;
  replace: string | ((m: string) => string);
  reason: string;
};

const WORDING_RULES: WordingRule[] = [
  {
    pattern: /\bhelped with\b/gi,
    replace: "drove",
    reason: "Swap vague “helped with” for a stronger ownership verb.",
  },
  {
    pattern: /\bresponsible for\b/gi,
    replace: "owned",
    reason: "“Responsible for” is weak — show ownership.",
  },
  {
    pattern: /\bworked on\b/gi,
    replace: "delivered",
    reason: "Prefer outcome verbs over “worked on”.",
  },
  {
    pattern: /\bassisted with\b/gi,
    replace: "supported delivery of",
    reason: "Make the contribution concrete.",
  },
  {
    pattern: /\bhelped\b/gi,
    replace: "enabled",
    reason: "Stronger action verb than “helped”.",
  },
  {
    pattern: /\bsupported\b/gi,
    replace: "operated",
    reason: "“Supported” undersells ownership — try a stronger verb.",
  },
  {
    pattern: /\bmaintained\b/gi,
    replace: "ran",
    reason: "“Maintained” is passive — show active ownership.",
  },
  {
    pattern: /\bcollaborated with\b/gi,
    replace: "partnered with",
    reason: "Slightly stronger collaboration language.",
  },
  {
    pattern: /\bparticipated in\b/gi,
    replace: "contributed to",
    reason: "Show contribution, not attendance.",
  },
  {
    pattern: /\binvolved in\b/gi,
    replace: "led",
    reason: "Replace vague involvement with leadership/impact.",
  },
  {
    pattern: /\bduties included\b/gi,
    replace: "delivered",
    reason: "Lead with outcomes, not a duty list.",
  },
  {
    pattern: /\bvarious\b/gi,
    replace: "cross-functional",
    reason: "“Various” is filler — be specific when you can.",
  },
  {
    pattern: /\ba lot of\b/gi,
    replace: "multiple",
    reason: "Tighten casual phrasing.",
  },
  {
    pattern: /\bthings\b/gi,
    replace: "initiatives",
    reason: "Replace vague nouns with concrete ones.",
  },
];

function clean(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function sectionLabel(section: ResumeSection): string {
  if (section.type === "header") return "Header";
  if ("title" in section && typeof section.title === "string") {
    return section.title.replace(/_/g, " ");
  }
  return section.type;
}

function pushHit(
  out: TextHit[],
  section: ResumeSection,
  text: string,
  fieldPath: string,
  locationLabel: string,
  itemId?: string
) {
  const t = clean(text);
  if (!t) return;
  out.push({
    sectionId: section.id,
    sectionType: section.type,
    sectionTitle: sectionLabel(section),
    itemId,
    fieldPath,
    locationLabel,
    text: t,
  });
}

/** Extract every editable text fragment with a stable location. */
export function extractTextHits(doc: ResumeDocument): TextHit[] {
  const hits: TextHit[] = [];

  for (const section of doc.content.sections) {
    const label = sectionLabel(section);

    switch (section.type) {
      case "header": {
        pushHit(hits, section, section.fullName, "fullName", `${label} · name`);
        pushHit(hits, section, section.title, "title", `${label} · title`);
        break;
      }
      case "summary": {
        pushHit(hits, section, section.content, "content", `${label}`);
        break;
      }
      case "experience": {
        section.items.forEach((item, i) => {
          const where = item.company || item.title || `Role ${i + 1}`;
          pushHit(hits, section, item.title, `items[${i}].title`, `${label} · ${where} · title`, item.id);
          pushHit(hits, section, item.company, `items[${i}].company`, `${label} · ${where} · company`, item.id);
          if (item.description) {
            pushHit(
              hits,
              section,
              item.description,
              `items[${i}].description`,
              `${label} · ${where} · description`,
              item.id
            );
          }
          item.bullets.forEach((b, bi) => {
            pushHit(
              hits,
              section,
              b,
              `items[${i}].bullets[${bi}]`,
              `${label} · ${where} · bullet ${bi + 1}`,
              item.id
            );
          });
          item.projects?.forEach((p, pi) => {
            pushHit(
              hits,
              section,
              p.name,
              `items[${i}].projects[${pi}].name`,
              `${label} · ${where} · project · name`,
              item.id
            );
            pushHit(
              hits,
              section,
              p.description,
              `items[${i}].projects[${pi}].description`,
              `${label} · ${where} · project · description`,
              item.id
            );
          });
        });
        break;
      }
      case "projects": {
        section.items.forEach((item, i) => {
          const where = item.name || `Project ${i + 1}`;
          pushHit(hits, section, item.name, `items[${i}].name`, `${label} · ${where}`, item.id);
          pushHit(
            hits,
            section,
            item.description,
            `items[${i}].description`,
            `${label} · ${where} · description`,
            item.id
          );
        });
        break;
      }
      case "achievements":
      case "strengths": {
        section.items.forEach((item, i) => {
          const where = item.title || item.text || `Item ${i + 1}`;
          if (item.title) {
            pushHit(hits, section, item.title, `items[${i}].title`, `${label} · ${where}`, item.id);
          }
          if (item.text) {
            pushHit(hits, section, item.text, `items[${i}].text`, `${label} · ${where}`, item.id);
          }
          if (item.description) {
            pushHit(
              hits,
              section,
              item.description,
              `items[${i}].description`,
              `${label} · ${where} · details`,
              item.id
            );
          }
        });
        break;
      }
      case "education": {
        section.items.forEach((item, i) => {
          const where = item.school || item.degree || `Education ${i + 1}`;
          pushHit(hits, section, item.degree, `items[${i}].degree`, `${label} · ${where} · degree`, item.id);
          pushHit(hits, section, item.school, `items[${i}].school`, `${label} · ${where} · school`, item.id);
          item.bullets?.forEach((b, bi) => {
            pushHit(
              hits,
              section,
              b,
              `items[${i}].bullets[${bi}]`,
              `${label} · ${where} · bullet ${bi + 1}`,
              item.id
            );
          });
        });
        break;
      }
      case "certifications": {
        section.items.forEach((item, i) => {
          pushHit(
            hits,
            section,
            item.name,
            `items[${i}].name`,
            `${label} · ${item.name || `Cert ${i + 1}`}`,
            item.id
          );
        });
        break;
      }
      case "skills": {
        section.categories.forEach((cat, i) => {
          pushHit(hits, section, cat.name, `categories[${i}].name`, `${label} · ${cat.name}`, cat.id);
          cat.skills.forEach((sk, si) => {
            pushHit(
              hits,
              section,
              sk,
              `categories[${i}].skills[${si}]`,
              `${label} · ${cat.name} · skill`,
              cat.id
            );
          });
        });
        break;
      }
      case "custom": {
        section.items.forEach((item, i) => {
          const where = item.title || `Item ${i + 1}`;
          pushHit(hits, section, item.title, `items[${i}].title`, `${label} · ${where}`, item.id);
          pushHit(
            hits,
            section,
            item.description,
            `items[${i}].description`,
            `${label} · ${where} · description`,
            item.id
          );
        });
        break;
      }
      case "philosophy": {
        pushHit(hits, section, section.quote, "quote", `${label} · quote`);
        break;
      }
      default:
        break;
    }
  }

  return hits;
}

function uid(prefix: string, n: number) {
  return `${prefix}_${n}`;
}

/** Strip HTML tags for analysis / plain comparison */
export function toPlainText(htmlOrText: string): string {
  return (htmlOrText || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** First spelling fix in text, or null */
export function findSpellingIssue(
  htmlOrText: string
): { original: string; suggestion: string } | null {
  const text = toPlainText(htmlOrText);
  const tokens = text.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (ALLOWLIST.has(lower)) continue;
    if (lower.length < 4) continue;
    const fix = COMMON_MISSPELLINGS[lower];
    if (!fix) continue;
    const suggestion =
      fix[0] === fix[0].toUpperCase()
        ? fix
        : token[0] === token[0].toUpperCase()
          ? fix[0].toUpperCase() + fix.slice(1)
          : fix;
    return { original: token, suggestion };
  }
  return null;
}

/** Long / hard-to-read bullet (Enhancv-style wording tip) */
export function isHardToReadBullet(htmlOrText: string): boolean {
  const text = toPlainText(htmlOrText);
  if (text.length < 90) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 22) return true;
  // Multiple clauses joined with commas / "and" / "alongside"
  const clauses = text.split(/,|;|\band\b|\balongside\b|\bwhile\b/i).filter((c) => c.trim().length > 20);
  return clauses.length >= 3 && words.length >= 18;
}

function spellcheckHits(hits: TextHit[], startId: number): ImproveSuggestion[] {
  const out: ImproveSuggestion[] = [];
  let n = startId;
  const seen = new Set<string>();

  for (const hit of hits) {
    const tokens = hit.text.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (ALLOWLIST.has(lower)) continue;
      if (lower.length < 4) continue;
      const fix = COMMON_MISSPELLINGS[lower];
      if (!fix) continue;
      const key = `${hit.fieldPath}:${lower}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const original = token;
      const suggestion =
        token[0] === token[0].toUpperCase()
          ? fix[0].toUpperCase() + fix.slice(1)
          : fix;

      out.push({
        id: uid("sp", n++),
        category: "spellcheck",
        severity: "warning",
        original,
        suggestion,
        reason: `Spelling: “${original}” → “${suggestion}”.`,
        sectionId: hit.sectionId,
        itemId: hit.itemId,
        fieldPath: hit.fieldPath,
        locationLabel: hit.locationLabel,
      });
    }
  }
  return out;
}

function wordingHits(hits: TextHit[], startId: number): ImproveSuggestion[] {
  const out: ImproveSuggestion[] = [];
  let n = startId;
  const seen = new Set<string>();

  for (const hit of hits) {
    // Skip short labels / skill tags
    if (hit.text.length < 18) continue;
    if (hit.fieldPath.includes(".skills[")) continue;

    for (const rule of WORDING_RULES) {
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(hit.text);
      if (!match) continue;
      const original = match[0];
      let suggestion =
        typeof rule.replace === "function" ? rule.replace(original) : rule.replace;
      // Keep sentence case when replacing a leading verb
      if (match.index === 0 && original[0] === original[0].toUpperCase()) {
        suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
      }
      const key = `${hit.fieldPath}:${original.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const nextText = hit.text.replace(original, suggestion);
      out.push({
        id: uid("wd", n++),
        category: "wording",
        severity: "info",
        original: hit.text,
        suggestion: nextText,
        reason: rule.reason,
        sectionId: hit.sectionId,
        itemId: hit.itemId,
        fieldPath: hit.fieldPath,
        locationLabel: hit.locationLabel,
      });
      break; // one wording tip per fragment
    }
  }
  return out;
}

function hasMetric(text: string) {
  return /\d/.test(text) || /\b(percent|%|x|times)\b/i.test(text);
}

/** Already nudged / polluted by a previous Apply — don't re-flag. */
function alreadyCoached(text: string) {
  return (
    /add your\s*%/i.test(text) ||
    /measurable result/i.test(text) ||
    /operational toil/i.test(text) ||
    /\be\.g\.\s*\d/i.test(text) ||
    /\(~?\d+%\)/i.test(text) ||
    /30%\s*faster recovery/i.test(text) ||
    /add your metric/i.test(text)
  );
}

/** Strip leftover coach suffixes so Apply never stacks the same tip. */
export function stripCoachSuffix(text: string) {
  return clean(
    text
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/gi, "&")
      .replace(/,?\s*improving reliability and cutting operational toil\s*\(add your % \/ MTTR \/ cost figure\)\.?/gi, "")
      .replace(/\s*—\s*add a measurable result\s*\([^)]*\)\.?/gi, "")
      .replace(/\s*\(e\.g\.\s*30%\s*faster recovery\s*\/\s*lower MTTR\)\.?/gi, "")
      .replace(/\s*\(e\.g\.\s*25%\s*improvement\)\.?/gi, "")
      .replace(/\s*—\s*add your metric\s*\([^)]*\)\.?/gi, "")
      .replace(/(\s*,?\s*improving reliability and cutting operational toil\s*\(add your % \/ MTTR \/ cost figure\)\.?)+/gi, "")
  );
}

const WEAK_VERB_SWAPS: [RegExp, string][] = [
  [/^(was responsible for|responsible for)\b/i, "Owned"],
  [/^(worked on|worked with|worked)\b/i, "Delivered"],
  [/^(helped with|helped)\b/i, "Enabled"],
  [/^(assisted with|assisted)\b/i, "Supported"],
  [/^(duties included)\b/i, "Delivered"],
  [/^(participated in)\b/i, "Contributed to"],
  [/^(involved in)\b/i, "Led"],
  [/^(maintained)\b/i, "Ran"],
  [/^(supported)\b/i, "Operated"],
  [/^(managed)\b/i, "Led"],
];

/** Rewrite a real sentence. Keeps numbers that are already there, and never invents a stock metric. */
export function rewriteFragment(
  text: string,
  mode: "shorter" | "longer" | "improve" | "grammar" = "improve"
): string {
  const source = stripCoachSuffix(text);
  if (!source) return text.trim();
  const hadMetric = /\d/.test(source);
  const metric = source.match(/\d[\d,]*(?:\.\d+)?%?/)?.[0];

  if (mode === "grammar") {
    let sentence = source.charAt(0).toUpperCase() + source.slice(1);
    sentence = sentence.replace(/\s+/g, " ").replace(/\bi\b/g, "I");
    return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
  }

  let body = source.replace(/[.!?]+$/g, "").trim();
  for (const [pattern, verb] of WEAK_VERB_SWAPS) {
    if (pattern.test(body)) {
      body = body.replace(pattern, verb);
      break;
    }
  }
  if (mode === "shorter") {
    const cut = body.split(/\s*,\s*(?:alongside|while|and also|as well as)\s+/i)[0] ?? body;
    body = cut.replace(/[,;:\s]+$/, "");
  } else if (!hadMetric && mode === "longer") {
    body = `${body} — add your metric (number, %, or time saved)`;
  } else if (hadMetric && mode === "longer" && metric) {
    body = `${body}, with a measured ${metric} result`;
  }

  return /[.!?]$/.test(body) ? body : `${body}.`;
}

function buildMetricSuggestion(text: string, _tailored: boolean) {
  return rewriteFragment(text, "improve");
}

function recommendationHits(
  doc: ResumeDocument,
  hits: TextHit[],
  startId: number,
  tailored: boolean
): ImproveSuggestion[] {
  const out: ImproveSuggestion[] = [];
  let n = startId;

  // Bullets without metrics (experience / projects)
  for (const hit of hits) {
    const isBullet =
      hit.fieldPath.includes(".bullets[") ||
      (hit.sectionType === "projects" && hit.fieldPath.endsWith(".description"));
    if (!isBullet) continue;
    if (hit.text.length < 24) continue;

    const original = stripCoachSuffix(hit.text);
    if (original.length < 24) continue;
    if (hasMetric(original) || alreadyCoached(original)) continue;
    const suggestion = buildMetricSuggestion(original, tailored);

    out.push({
      id: uid("rc", n++),
      category: "recommendation",
      severity: "info",
      original,
      suggestion,
      reason: tailored
        ? "Recruiters and ATS prefer quantified outcomes (latency, cost, uptime %, MTTR)."
        : "Quantify impact so readers can see the result of your work.",
      sectionId: hit.sectionId,
      itemId: hit.itemId,
      fieldPath: hit.fieldPath,
      locationLabel: hit.locationLabel,
    });
    if (out.filter((s) => s.category === "recommendation").length >= 4) break;
  }

  // Summary length / punch
  const summary = doc.content.sections.find((s) => s.type === "summary");
  if (summary && summary.type === "summary") {
    const words = clean(summary.content).split(/\s+/).filter(Boolean);
    if (words.length > 0 && words.length < 35) {
      out.push({
        id: uid("rc", n++),
        category: "recommendation",
        severity: "info",
        original: summary.content,
        suggestion:
          "Expand the summary to ~40–60 words: years of experience, top stacks, and 1–2 quantified wins.",
        reason: "A slightly richer summary improves ATS keyword coverage and recruiter skim.",
        sectionId: summary.id,
        fieldPath: "content",
        locationLabel: "SUMMARY",
      });
    }
    if (words.length > 90) {
      out.push({
        id: uid("rc", n++),
        category: "recommendation",
        severity: "warning",
        original: summary.content,
        suggestion: "Tighten the summary to under ~70 words — lead with role + 2 proof points.",
        reason: "Long summaries get skimmed; keep the hook short.",
        sectionId: summary.id,
        fieldPath: "content",
        locationLabel: "SUMMARY",
      });
    }
  }

  // Experience with no bullets
  for (const section of doc.content.sections) {
    if (section.type !== "experience") continue;
    section.items.forEach((item, i) => {
      if (item.bullets.filter((b) => clean(b)).length === 0) {
        out.push({
          id: uid("rc", n++),
          category: "recommendation",
          severity: "warning",
          original: item.title || "Role",
          suggestion: "Add 3–5 achievement bullets with tools + metrics for this role.",
          reason: "Empty experience entries hurt ATS and recruiter trust.",
          sectionId: section.id,
          itemId: item.id,
          fieldPath: `items[${i}].bullets[0]`,
          locationLabel: `${sectionLabel(section)} · ${item.company || item.title}`,
        });
      }
    });
  }

  return out;
}

/** Analyze resume locally. Only returns suggestions tied to real content. */
export function analyzeResume(
  doc: ResumeDocument,
  options: ImproveOptions = {}
): ImproveSuggestion[] {
  const {
    spellcheck = true,
    wording = true,
    recommendations = true,
    tailored = true,
  } = options;

  const hits = extractTextHits(doc);
  const suggestions: ImproveSuggestion[] = [];

  if (spellcheck) suggestions.push(...spellcheckHits(hits, suggestions.length + 1));
  if (wording) suggestions.push(...wordingHits(hits, suggestions.length + 1));
  if (recommendations) {
    suggestions.push(...recommendationHits(doc, hits, suggestions.length + 1, tailored));
  }

  // Priority: spellcheck → wording → recommendations; cap for UI clarity
  const order = { spellcheck: 0, wording: 1, recommendation: 2 } as const;
  return suggestions
    .sort((a, b) => order[a.category] - order[b.category])
    .slice(0, 16);
}

/** Apply a suggestion to a section using fieldPath (e.g. items[0].bullets[2]). */
export function applySuggestionToSection(
  section: ResumeSection,
  suggestion: ImproveSuggestion
): ResumeSection {
  if (!suggestion.fieldPath) {
    // Fallback: naive string replace across JSON
    const raw = JSON.stringify(section);
    if (!suggestion.original || !raw.includes(suggestion.original)) return section;
    try {
      return JSON.parse(raw.replace(suggestion.original, suggestion.suggestion)) as ResumeSection;
    } catch {
      return section;
    }
  }

  const clone = structuredClone(section) as ResumeSection & Record<string, unknown>;
  const path = suggestion.fieldPath;
  const parts = path.replace(/\]/g, "").split(/\.|\[/);

  let cur: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur == null || typeof cur !== "object") return section;
    cur = (cur as Record<string, unknown>)[key];
  }
  const last = parts[parts.length - 1];
  if (cur == null || typeof cur !== "object") return section;
  const parent = cur as Record<string, unknown>;
  const current = parent[last];
  if (typeof current !== "string") return section;

  const cleanedCurrent = stripCoachSuffix(current);
  const cleanedOriginal = stripCoachSuffix(suggestion.original);

  // Full-field replacements (wording / recommendations)
  if (
    clean(cleanedCurrent) === clean(cleanedOriginal) ||
    clean(current) === clean(suggestion.original)
  ) {
    parent[last] = suggestion.suggestion;
    return clone as ResumeSection;
  }

  if (suggestion.original && current.includes(suggestion.original)) {
    parent[last] = current.replace(suggestion.original, suggestion.suggestion);
  } else if (cleanedOriginal && cleanedCurrent.includes(cleanedOriginal)) {
    parent[last] = cleanedCurrent.replace(cleanedOriginal, suggestion.suggestion);
  }
  return clone as ResumeSection;
}

/** Keep only AI suggestions that actually appear in the resume. */
export function filterValidSuggestions(
  doc: ResumeDocument,
  suggestions: ImproveSuggestion[]
): ImproveSuggestion[] {
  const hits = extractTextHits(doc);
  const corpus = hits.map((h) => h.text.toLowerCase()).join("\n");

  return suggestions.filter((s) => {
    if (!s.original || !s.original.trim()) return false;
    const needle = s.original.toLowerCase().trim();
    if (needle.length < 3) return false;
    if (!corpus.includes(needle)) return false;

    // Attach location if missing
    if (!s.sectionId || !s.locationLabel) {
      const hit = hits.find((h) => h.text.toLowerCase().includes(needle));
      if (hit) {
        s.sectionId = s.sectionId || hit.sectionId;
        s.itemId = s.itemId || hit.itemId;
        s.fieldPath = s.fieldPath || hit.fieldPath;
        s.locationLabel = s.locationLabel || hit.locationLabel;
      }
    }
    return Boolean(s.sectionId);
  });
}
