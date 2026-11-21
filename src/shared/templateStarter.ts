import type { LayoutKey, ResumeContent, ResumeDesign } from "./types";
import { DEFAULT_DESIGN, DEFAULT_HEADER_SETTINGS } from "./defaults";
import { markSampleContent, sampleLeaves } from "./sampleMarks";

/** Generic placeholder content for new resumes (not personal sample data). */
export const TEMPLATE_STARTER_CONTENT: ResumeContent = {
  sections: [
    {
      type: "header",
      id: "header",
      fullName: "YOUR NAME",
      title: "Your Role | Specialty | Focus Area",
      contact: {
        phone: "+1-(234)-555-1234",
        email: "hello@email.com",
        linkedin: "linkedin.com",
        linkedinHref: "https://linkedin.com",
        location: "City, Country",
      },
      settings: {
        ...DEFAULT_HEADER_SETTINGS,
        extraLink: false,
        extraField: false,
        dateOfBirth: false,
        nationality: false,
        photo: true,
        uppercaseName: true,
      },
    },
    {
      type: "summary",
      id: "summary",
      title: "SUMMARY",
      content:
        "Results-driven professional with experience delivering impact across teams and products. Skilled at turning goals into clear plans, collaborating cross-functionally, and improving outcomes with measurable results.",
    },
    {
      type: "experience",
      id: "experience",
      title: "EXPERIENCE",
      items: [
        {
          id: "exp1",
          title: "Senior Role Title",
          company: "Company Name",
          startDate: "2021-01",
          endDate: "Present",
          location: "Remote",
          bullets: [
            "Led initiatives that improved delivery speed and quality across the team.",
            "Partnered with stakeholders to define goals, roadmaps, and success metrics.",
            "Mentored teammates and documented processes for clearer handoffs.",
          ],
        },
        {
          id: "exp2",
          title: "Role Title",
          company: "Previous Company",
          startDate: "2018-06",
          endDate: "2020-12",
          location: "City, Country",
          bullets: [
            "Built and improved core workflows used by customers and internal teams.",
            "Analyzed performance data and recommended changes that raised conversion.",
            "Collaborated with design and engineering to ship reliable releases.",
          ],
        },
        {
          id: "exp3",
          title: "Junior Role Title",
          company: "First Company",
          startDate: "2016-03",
          endDate: "2018-05",
          location: "City, Country",
          bullets: [
            "Supported day-to-day operations and prepared reports for leadership.",
            "Automated recurring tasks and reduced manual work for the team.",
          ],
        },
      ],
    },
    {
      type: "education",
      id: "education",
      title: "EDUCATION",
      items: [
        {
          id: "ed1",
          degree: "Master of Science",
          school: "University Name",
          startDate: "2014",
          endDate: "2016",
          location: "City, Country",
        },
        {
          id: "ed2",
          degree: "Bachelor of Science",
          school: "University Name",
          startDate: "2010",
          endDate: "2014",
          location: "City, Country",
        },
      ],
    },
    {
      type: "skills",
      id: "skills",
      title: "SKILLS",
      categories: [
        {
          id: "sk1",
          name: "Core skills",
          skills: ["Strategy", "Communication", "Analysis", "Leadership"],
        },
        {
          id: "sk2",
          name: "Tools",
          skills: ["Excel", "SQL", "Jira", "Figma", "Notion"],
        },
      ],
    },
    {
      type: "achievements",
      id: "achievements",
      title: "KEY ACHIEVEMENTS",
      items: [
        {
          id: "ac1",
          text: "Grew key metric by 40%",
          title: "Grew key metric by 40%",
          description: "Drove a cross-team initiative that lifted the primary KPI within two quarters.",
          icon: "star",
        },
        {
          id: "ac2",
          text: "Launched major product",
          title: "Launched major product",
          description: "Shipped a new offering from discovery to release with clear stakeholder alignment.",
          icon: "zap",
        },
        {
          id: "ac3",
          text: "Improved team delivery",
          title: "Improved team delivery",
          description: "Reduced cycle time by standardizing rituals and clarifying ownership.",
          icon: "diamond",
        },
      ],
    },
    {
      type: "certifications",
      id: "certifications",
      title: "CERTIFICATION",
      items: [
        {
          id: "ce1",
          name: "Professional Certification",
          issuer: "Issuing Organization",
        },
        {
          id: "ce2",
          name: "Industry Certificate",
          issuer: "Training Provider",
        },
      ],
    },
    {
      type: "projects",
      id: "projects",
      title: "PROJECTS",
      items: [
        {
          id: "pr1",
          name: "Flagship Project",
          description:
            "End-to-end initiative with clear goals, measurable outcomes, and documented learnings.",
          technologies: ["Research", "Delivery", "Analytics"],
        },
        {
          id: "pr2",
          name: "Side Project",
          description: "Personal or open-source project showcasing craft and problem-solving.",
          technologies: ["Design", "Build"],
        },
      ],
    },
    {
      type: "interests",
      id: "interests",
      title: "PASSIONS",
      items: [
        {
          id: "in1",
          title: "Continuous learning",
          description: "Exploring new tools, books, and communities that sharpen craft.",
        },
        {
          id: "in2",
          title: "Mentorship",
          description: "Helping teammates grow through feedback and shared practice.",
        },
      ],
    },
    {
      type: "languages",
      id: "languages",
      title: "LANGUAGES",
      items: [
        { id: "ln1", name: "English", level: "Native", proficiency: 100 },
        { id: "ln2", name: "Spanish", level: "Advanced", proficiency: 80 },
      ],
    },
  ],
  leftColumnIds: ["summary", "experience", "projects"],
  rightColumnIds: ["skills", "achievements", "certifications", "education"],
};

export type LandingTemplatePreset = {
  id: string;
  layoutKey: LayoutKey;
  accentColor: string;
  inkColor?: string;
  fontFamily: string;
  columnLayout: ResumeDesign["columnLayout"];
  headerStyle: NonNullable<ResumeDesign["headerStyle"]>;
  photoPosition?: NonNullable<ResumeDesign["photoPosition"]>;
  titlePlacement?: NonNullable<ResumeDesign["titlePlacement"]>;
  sectionHeadingStyle?: NonNullable<ResumeDesign["sectionHeadingStyle"]>;
  contactLayout?: NonNullable<ResumeDesign["contactLayout"]>;
  entryLayout?: NonNullable<ResumeDesign["entryLayout"]>;
  leftColumnIds: string[];
  rightColumnIds: string[];
  skillsLayout?: "tags" | "list" | "bullets";
  /** Hide skill group labels (Core skills / Tools). */
  hideSkillGroups?: boolean;
  /** Hide language proficiency bars. */
  hideLanguageBars?: boolean;
  /** Hide company/school logos (matches clean executive templates). */
  hideLogos?: boolean;
  /** Hide experience company description field. */
  hideExperienceDescription?: boolean;
  /** Override section titles for this template. */
  sectionTitles?: Partial<Record<string, string>>;
  /** Header field overrides (nationality, DOB, uppercase, etc.). */
  headerSettings?: Partial<typeof DEFAULT_HEADER_SETTINGS>;
};

export const LANDING_PRESETS: Record<string, LandingTemplatePreset> = {
  "classic-serif": {
    id: "classic-serif",
    layoutKey: "classic",
    accentColor: "#1f2937",
    inkColor: "#1f2937",
    fontFamily: "Volkhov",
    columnLayout: "single",
    headerStyle: "centered",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "row",
    entryLayout: "stacked",
    leftColumnIds: ["summary", "experience", "education", "achievements", "skills", "certifications"],
    rightColumnIds: [],
    skillsLayout: "list",
    hideLogos: true,
    headerSettings: { photo: false, uppercaseName: false },
  },
  "marketing-cyan": {
    id: "marketing-cyan",
    layoutKey: "high-performer",
    accentColor: "#06b6d4",
    inkColor: "#0f172a",
    fontFamily: "Montserrat",
    columnLayout: "wide-left",
    headerStyle: "default",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "row",
    entryLayout: "side-meta",
    leftColumnIds: ["experience", "education", "languages"],
    rightColumnIds: ["summary", "achievements", "skills", "certifications"],
    skillsLayout: "tags",
  },
  "executive-navy": {
    id: "executive-navy",
    layoutKey: "stylish",
    accentColor: "#1c2b42",
    inkColor: "#0b1220",
    fontFamily: "Lato",
    columnLayout: "wide-left",
    headerStyle: "banner",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "row",
    entryLayout: "side-meta",
    leftColumnIds: ["experience", "education", "skills"],
    rightColumnIds: ["summary", "achievements", "certifications", "interests"],
    skillsLayout: "tags",
    hideLogos: true,
    hideExperienceDescription: true,
    sectionTitles: { certifications: "COURSES" },
  },
  "clean-cyan": {
    id: "clean-cyan",
    layoutKey: "contemporary",
    accentColor: "#22d3ee",
    inkColor: "#0f172a",
    fontFamily: "Raleway",
    columnLayout: "wide-left",
    headerStyle: "default",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "row",
    entryLayout: "side-meta",
    leftColumnIds: ["experience", "education", "languages"],
    rightColumnIds: ["summary", "achievements", "skills", "certifications", "interests"],
  },
  "engineer-sky": {
    id: "engineer-sky",
    layoutKey: "compact",
    accentColor: "#38bdf8",
    inkColor: "#0f172a",
    fontFamily: "Rubik",
    columnLayout: "wide-right",
    headerStyle: "default",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "row",
    entryLayout: "side-meta",
    leftColumnIds: ["skills", "projects", "achievements"],
    rightColumnIds: ["summary", "experience", "education"],
    skillsLayout: "tags",
  },
  "product-blue": {
    id: "product-blue",
    layoutKey: "polished",
    accentColor: "#2563eb",
    inkColor: "#0f172a",
    fontFamily: "Montserrat",
    columnLayout: "wide-left",
    headerStyle: "default",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "row",
    entryLayout: "side-meta",
    leftColumnIds: ["summary", "experience", "education"],
    rightColumnIds: ["achievements", "skills", "certifications"],
    skillsLayout: "list",
  },
  "steady-form": {
    id: "steady-form",
    layoutKey: "elegant",
    accentColor: "#334155",
    inkColor: "#1e293b",
    fontFamily: "Lato",
    columnLayout: "single",
    headerStyle: "default",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "grid",
    entryLayout: "stacked",
    leftColumnIds: ["summary", "experience", "education", "skills", "languages", "certifications"],
    rightColumnIds: [],
    skillsLayout: "list",
    hideLogos: true,
  },
  "saffron-line": {
    id: "saffron-line",
    layoutKey: "ivy-league",
    accentColor: "#c4a035",
    inkColor: "#1f2937",
    fontFamily: "Bitter",
    columnLayout: "wide-right",
    headerStyle: "default",
    photoPosition: "left",
    titlePlacement: "beside",
    sectionHeadingStyle: "icon-line",
    contactLayout: "grid",
    entryLayout: "stacked",
    leftColumnIds: ["summary", "skills", "languages", "certifications"],
    rightColumnIds: ["experience", "education"],
    skillsLayout: "bullets",
    hideSkillGroups: true,
    hideLanguageBars: true,
    hideLogos: true,
    hideExperienceDescription: true,
    sectionTitles: {
      summary: "Summary",
      skills: "Skills",
      languages: "Languages",
      certifications: "Certificates",
      experience: "Professional Experience",
      education: "Education",
    },
    headerSettings: {
      uppercaseName: false,
      dateOfBirth: true,
      nationality: true,
      photo: true,
      photoStyle: "circle",
      photoAccent: "#c4a035",
    },
  },
  "tech-hex": {
    id: "tech-hex",
    layoutKey: "creative",
    accentColor: "#2563eb",
    inkColor: "#0f172a",
    fontFamily: "Chivo",
    columnLayout: "wide-left",
    headerStyle: "default",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "row",
    entryLayout: "side-meta",
    leftColumnIds: ["summary", "experience", "skills", "interests"],
    rightColumnIds: ["education", "languages", "projects", "achievements", "certifications"],
    skillsLayout: "tags",
  },
  "strategy-clean": {
    id: "strategy-clean",
    layoutKey: "single-column",
    accentColor: "#0f172a",
    inkColor: "#0f172a",
    fontFamily: "Raleway",
    columnLayout: "wide-left",
    headerStyle: "default",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "row",
    entryLayout: "side-meta",
    leftColumnIds: ["summary", "experience"],
    rightColumnIds: ["education", "skills", "languages", "certifications"],
    skillsLayout: "list",
  },
  "precision-line": {
    id: "precision-line",
    layoutKey: "timeline",
    accentColor: "#1e3a5f",
    inkColor: "#0f172a",
    fontFamily: "Montserrat",
    columnLayout: "single",
    headerStyle: "centered",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "underline",
    contactLayout: "row",
    entryLayout: "stacked",
    leftColumnIds: ["summary", "experience", "education", "skills", "languages", "certifications"],
    rightColumnIds: [],
    hideLogos: true,
    headerSettings: { photo: false, uppercaseName: false },
  },
};

export function resolveLandingPreset(
  idOrLayout?: string | null
): LandingTemplatePreset | undefined {
  if (!idOrLayout) return undefined;
  if (LANDING_PRESETS[idOrLayout]) return LANDING_PRESETS[idOrLayout];
  const stripped = idOrLayout.replace(/^tmpl-landing-/, "");
  if (LANDING_PRESETS[stripped]) return LANDING_PRESETS[stripped];
  return Object.values(LANDING_PRESETS).find((p) => p.layoutKey === idOrLayout);
}

/** Reorder columns + section chrome settings; keep existing text content. */
export function applyPresetStructure(
  content: ResumeContent,
  preset: LandingTemplatePreset
): ResumeContent {
  const next = structuredClone(content);
  next.leftColumnIds = [...preset.leftColumnIds];
  next.rightColumnIds = [...preset.rightColumnIds];

  next.sections = next.sections.map((s) => {
    const titleOverride = preset.sectionTitles?.[s.type];
    const stock = /^(summary|experience|professional experience|work experience|education|skills|certificates|certification|certifications|courses|projects|languages|key achievements|awards)$/i;
    const keepCustomTitle = Boolean(s.title && !stock.test(s.title.trim()));
    let section = titleOverride && !keepCustomTitle ? ({ ...s, title: titleOverride } as typeof s) : s;

    if (section.type === "skills") {
      return {
        ...section,
        settings: {
          ...(section.settings || {}),
          ...(preset.skillsLayout ? { skillsLayout: preset.skillsLayout } : {}),
          ...(preset.hideSkillGroups ? { groupName: false } : {}),
        },
      };
    }
    if (section.type === "languages" && preset.hideLanguageBars) {
      return {
        ...section,
        settings: { ...(section.settings || {}), description: false },
      };
    }
    if (section.type === "experience") {
      return {
        ...section,
        settings: {
          ...(section.settings || {}),
          ...(preset.hideLogos ? { logo: false } : {}),
          ...(preset.hideExperienceDescription ? { description: false } : {}),
        },
      };
    }
    if (section.type === "education" && preset.hideLogos) {
      return {
        ...section,
        settings: { ...(section.settings || {}), logo: false },
      };
    }
    if (section.type === "header") {
      const photoOff =
        preset.headerStyle === "centered" || preset.headerSettings?.photo === false;
      return {
        ...section,
        settings: {
          ...DEFAULT_HEADER_SETTINGS,
          ...section.settings,
          ...preset.headerSettings,
          ...(photoOff ? { photo: false } : {}),
        },
        contact: {
          ...section.contact,
          ...(preset.headerSettings?.nationality && !section.contact.nationality
            ? { nationality: "Nationality" }
            : {}),
          ...(preset.headerSettings?.dateOfBirth && !section.contact.dateOfBirth
            ? { dateOfBirth: "DD / MM / YYYY" }
            : {}),
        },
      };
    }
    return section;
  });

  // BUG-1240b: placeholder contact values added here are untouched sample text too.
  if (next.sampleFields) {
    const before = new Set(sampleLeaves(content).map((leaf) => leaf.path));
    for (const leaf of sampleLeaves(next)) {
      if (!before.has(leaf.path) && !(leaf.path in next.sampleFields)) next.sampleFields[leaf.path] = leaf.value;
    }
  }
  return next;
}

export function buildTemplateContent(presetId: string): ResumeContent {
  const preset = LANDING_PRESETS[presetId];
  const base = structuredClone(TEMPLATE_STARTER_CONTENT);
  if (!preset) return markSampleContent(base);
  return markSampleContent(applyPresetStructure(base, preset));
}

export function buildTemplateDesign(presetId: string): ResumeDesign {
  const preset = LANDING_PRESETS[presetId];
  if (!preset) {
    return { ...DEFAULT_DESIGN, background: "white", headerStyle: "default" };
  }
  return {
    ...DEFAULT_DESIGN,
    accentColor: preset.accentColor,
    inkColor: preset.inkColor || DEFAULT_DESIGN.inkColor,
    fontFamily: preset.fontFamily,
    columnLayout: preset.columnLayout,
    background: "white",
    headerStyle: preset.headerStyle,
    photoPosition: preset.photoPosition || "right",
    titlePlacement: preset.titlePlacement || "below",
    sectionHeadingStyle: preset.sectionHeadingStyle || "underline",
    contactLayout: preset.contactLayout || "row",
    entryLayout: preset.entryLayout || "side-meta",
    pageMargins: 4,
  };
}
