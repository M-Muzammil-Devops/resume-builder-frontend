import {
  LANDING_TEMPLATES,
  PENDING_TEMPLATE_KEY,
  type LandingTemplate,
} from "@/lib/landingTemplates";
import { apiFetch } from "@/lib/api";
import {
  DEFAULT_DESIGN,
  DEFAULT_HEADER_SETTINGS,
  TEMPLATE_STARTER_CONTENT,
  buildTemplateContent,
  hasSampleMarks,
  markSampleContent,
  buildTemplateDesign,
  LANDING_PRESETS,
  type ResumeDocument,
} from "@/shared";

export function readPendingTemplate(): LandingTemplate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_TEMPLATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LandingTemplate;
  } catch {
    return null;
  }
}

export function findLandingTemplate(id: string | null): LandingTemplate | null {
  if (!id) return null;
  return LANDING_TEMPLATES.find((t) => t.id === id) ?? null;
}

export async function createResumeFromLandingTemplate(
  tpl: LandingTemplate
): Promise<ResumeDocument> {
  const preset = LANDING_PRESETS[tpl.id];
  let content = buildTemplateContent(tpl.id);
  let design = buildTemplateDesign(tpl.id);

  // Admin-uploaded templates: apply photo/columns + design from metadata
  if (!preset) {
    content = structuredClone(TEMPLATE_STARTER_CONTENT);
    const isSingle = tpl.columns === "single";
    content.leftColumnIds = isSingle
      ? ["summary", "experience", "education", "skills", "achievements", "certifications"]
      : ["experience", "education", "skills"];
    content.rightColumnIds = isSingle ? [] : ["summary", "achievements", "certifications", "interests"];
    content.sections = content.sections.map((s) => {
      if (s.type !== "header") return s;
      return {
        ...s,
        settings: {
          ...DEFAULT_HEADER_SETTINGS,
          ...s.settings,
          photo: tpl.hasPhoto !== false,
        },
      };
    });
    design = {
      ...DEFAULT_DESIGN,
      accentColor: tpl.accentColor || DEFAULT_DESIGN.accentColor,
      fontFamily: tpl.fontFamily || DEFAULT_DESIGN.fontFamily,
      columnLayout: isSingle ? "single" : "wide-left",
      background: "white",
      headerStyle: isSingle ? "default" : "banner",
    };
  }

  const res = await apiFetch<{ resume: ResumeDocument }>("/resumes", {
    method: "POST",
    body: JSON.stringify({
      title: "Untitled Resume",
      templateId: tpl.templateId,
      layoutKey: preset?.layoutKey ?? tpl.layoutKey,
      // BUG-1240b: every field starts as untouched sample text.
      content: hasSampleMarks(content) ? content : markSampleContent(content),
      design,
    }),
  });
  return res.resume;
}

/** After auth: open pending template in editor, else go to dashboard. */
export async function continueAfterAuth(
  push: (href: string) => void
): Promise<void> {
  const pending = readPendingTemplate();
  if (!pending) {
    push("/user/dashboard");
    return;
  }

  try {
    const resume = await createResumeFromLandingTemplate(pending);
    sessionStorage.removeItem(PENDING_TEMPLATE_KEY);
    push(`/user/editor/${resume.id}`);
  } catch {
    push("/user/dashboard");
  }
}
