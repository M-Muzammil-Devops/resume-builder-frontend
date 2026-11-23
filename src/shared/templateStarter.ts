import type { LayoutKey, ResumeContent, ResumeDesign } from "./types";
import { DEFAULT_DESIGN, DEFAULT_HEADER_SETTINGS } from "./defaults";
import { markSampleContent, sampleLeaves } from "./sampleMarks";
import { TEMPLATE_SAMPLES, applyTemplateSample } from "./templateContent";
import { isSamplePhoto } from "./photoSlot";

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
  skillsLayout?: "tags" | "list" | "bullets" | "underline";
  /** Short lists as an N-column bullet grid (skills in bullets layout, languages, certificates, interests). */
  listColumns?: NonNullable<ResumeDesign["listColumns"]>;
  /** Entry density (default "compact", like the landing previews). */
  density?: NonNullable<ResumeDesign["density"]>;
  /** Page margin level 0–8 (default 2). */
  pageMargins?: number;
  /** Achievements without their icons (Classic Serif 3-column row). */
  hideAchievementIcons?: boolean;
  /** Hide the language level text too (just the language name). */
  hideLanguageLevel?: boolean;
  /** Hide certificate issuer + credential link (name only). */
  hideCertificationDetails?: boolean;
  /** Initials square instead of a photo in the header. */
  headerMonogram?: boolean;
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
    sectionHeadingStyle: "centered-rule",
    contactLayout: "row",
    entryLayout: "side-meta",
    leftColumnIds: ["summary", "experience", "education", "achievements", "skills", "certifications"],
    rightColumnIds: [],
    skillsLayout: "list",
    listColumns: 3,
    hideAchievementIcons: true,
    hideCertificationDetails: true,
    hideSkillGroups: true,
    hideLogos: true,
    hideExperienceDescription: true,
    sectionTitles: {
      summary: "Summary",
      experience: "Experience",
      education: "Education",
      achievements: "Key Achievements",
      skills: "Skills",
      certifications: "Certification",
    },
    headerSettings: { photo: false, uppercaseName: true },
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
    titlePlacement: "beside",
    sectionHeadingStyle: "banner",
    contactLayout: "grid",
    entryLayout: "date-left",
    leftColumnIds: ["summary", "experience", "education", "skills", "languages", "certifications"],
    rightColumnIds: [],
    skillsLayout: "bullets",
    listColumns: 3,
    hideSkillGroups: true,
    hideLanguageBars: true,
    hideLanguageLevel: true,
    hideCertificationDetails: true,
    hideLogos: true,
    hideExperienceDescription: true,
    sectionTitles: {
      summary: "Summary",
      experience: "Professional Experience",
      education: "Education",
      skills: "Skills",
      languages: "Languages",
      certifications: "Certificates",
    },
    headerSettings: {
      uppercaseName: false,
      nationality: true,
      dateOfBirth: true,
      photo: true,
      photoStyle: "circle",
    },
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
    // Two columns: "single-column" would force one column (isSingleColumnLayout).
    layoutKey: "crest",
    accentColor: "#0f172a",
    inkColor: "#0f172a",
    fontFamily: "Raleway",
    columnLayout: "wide-left",
    headerStyle: "default",
    photoPosition: "right",
    titlePlacement: "below",
    sectionHeadingStyle: "ruled-center",
    contactLayout: "row",
    entryLayout: "stacked",
    leftColumnIds: ["summary", "experience"],
    rightColumnIds: ["education", "skills", "languages", "certifications"],
    skillsLayout: "list",
    listColumns: 1,
    hideLanguageBars: true,
    hideLanguageLevel: true,
    hideCertificationDetails: true,
    hideLogos: true,
    hideExperienceDescription: true,
    sectionTitles: {
      summary: "Summary",
      experience: "Professional Experience",
      education: "Education",
      skills: "Skills",
      languages: "Languages",
      certifications: "Certificates",
    },
    headerSettings: { photo: false, uppercaseName: false },
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
    entryLayout: "side-meta",
    leftColumnIds: ["summary", "experience", "education", "skills", "languages", "certifications"],
    rightColumnIds: [],
    skillsLayout: "bullets",
    listColumns: 4,
    hideSkillGroups: true,
    hideLanguageBars: true,
    hideCertificationDetails: true,
    hideLogos: true,
    hideExperienceDescription: true,
    headerSettings: { photo: false, uppercaseName: false },
  },

  "emerald-numbered": {
    id: "emerald-numbered",
    layoutKey: "numbered",
    accentColor: "#15803d",
    inkColor: "#0f172a",
    fontFamily: "Lato",
    columnLayout: "single",
    headerStyle: "default",
    photoPosition: "left",
    titlePlacement: "below",
    sectionHeadingStyle: "numbered",
    contactLayout: "row",
    entryLayout: "side-meta",
    // The preview shows Summary, Experience, Skills (+ Education fits on the same page).
    leftColumnIds: ["summary", "experience", "skills", "education"],
    rightColumnIds: [],
    skillsLayout: "underline",
    hideLogos: true,
    headerMonogram: true,
    sectionTitles: {
      summary: "Summary",
      experience: "Experience",
      skills: "Skills",
      education: "Education",
      certifications: "Certifications",
      languages: "Languages",
    },
    // The initials square IS the photo slot: on by default, shows the photo once uploaded.
    headerSettings: { photo: true, photoStyle: "square", uppercaseName: true },
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
    if (section.type === "languages" && (preset.hideLanguageBars || preset.hideLanguageLevel)) {
      return {
        ...section,
        settings: {
          ...(section.settings || {}),
          ...(preset.hideLanguageBars ? { description: false } : {}),
          ...(preset.hideLanguageLevel ? { subtitle: false } : {}),
        },
      };
    }
    if (section.type === "achievements" && preset.hideAchievementIcons) {
      return { ...section, settings: { ...(section.settings || {}), icons: false } };
    }
    if (section.type === "certifications" && preset.hideCertificationDetails) {
      return {
        ...section,
        settings: { ...(section.settings || {}), subtitle: false, link: false, datePeriod: false },
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
      // An uploaded photo survives a template switch: it moves into the new template's slot
      // (unless the new header is centred text-only), keeping the user's own show/hide choice.
      // A template's sample headshot is not the user's photo: it follows the new template's setting.
      const keepPhoto = Boolean(section.photoUrl) && !isSamplePhoto(section.photoUrl) && preset.headerStyle !== "centered";
      const photoOff =
        preset.headerStyle === "centered" || (preset.headerSettings?.photo === false && !keepPhoto);
      return {
        ...section,
        settings: {
          ...DEFAULT_HEADER_SETTINGS,
          ...section.settings,
          ...preset.headerSettings,
          ...(photoOff ? { photo: false } : keepPhoto ? { photo: section.settings?.photo ?? true } : {}),
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

/**
 * Landing-match: a new resume starts with exactly the sections its landing preview shows (the
 * preset's columns). Sections outside the columns would otherwise be appended at the end and spill
 * onto an extra page (e.g. a lone "Passions" entry on page 3).
 */
export function presetSections(content: ResumeContent, preset: LandingTemplatePreset): ResumeContent {
  const keep = new Set([...preset.leftColumnIds, ...preset.rightColumnIds]);
  return { ...content, sections: content.sections.filter((s) => s.type === "header" || keep.has(s.id)) };
}

export function buildTemplateContent(presetId: string): ResumeContent {
  const preset = LANDING_PRESETS[presetId];
  if (!preset) return markSampleContent(structuredClone(TEMPLATE_STARTER_CONTENT));
  const base = presetSections(structuredClone(TEMPLATE_STARTER_CONTENT), preset);
  const sample = TEMPLATE_SAMPLES[preset.id];
  if (!sample) return markSampleContent(applyPresetStructure(base, preset));
  // Role-specific starter text is real, usable content: it is NOT marked as sample, so it stays in
  // PDF/TXT/DOCX even if the user never edits it. Only leftover generic placeholders keep a mark.
  const sampled = applyTemplateSample(base, sample);
  const fromSample = new Map(sampleLeaves(sampled).map((leaf) => [leaf.path, leaf.value]));
  const built = markSampleContent(applyPresetStructure(sampled, preset));
  const sampleFields: Record<string, string> = {};
  for (const [path, value] of Object.entries(built.sampleFields || {})) {
    if (fromSample.get(path) !== value) sampleFields[path] = value;
  }
  return { ...built, sampleFields };
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
    ...(preset.listColumns ? { listColumns: preset.listColumns } : {}),
    // Landing previews are dense one-page layouts: tight entries, narrower margins.
    density: preset.density ?? "compact",
    ...(preset.headerMonogram ? { headerMonogram: true } : {}),
    pageMargins: preset.pageMargins ?? 2,
  };
}
