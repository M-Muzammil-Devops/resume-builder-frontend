import { markSampleContent } from "./sampleMarks";
import type {
  HeaderSettings,
  ResumeContent,
  ResumeDesign,
  ResumeDocument,
  SectionSettings,
  SectionType,
} from "./types";

export const DEFAULT_HEADER_SETTINGS: HeaderSettings = {
  title: true,
  phone: true,
  link: true,
  email: true,
  location: true,
  extraLink: false,
  extraField: false,
  dateOfBirth: false,
  nationality: false,
  uppercaseName: true,
  photo: true,
  photoStyle: "circle",
  photoAccent: "#4d9d92",
};

export const DEFAULT_DESIGN: ResumeDesign = {
  accentColor: "#00788a", // BUG-1232: AA (5.2:1) on white; was #00b6cb (2.46:1)
  inkColor: "#343334",
  fontFamily: "Raleway",
  fontSize: 2,
  lineHeight: 1,
  pageMargins: 4,
  sectionSpacing: 2,
  columnLayout: "wide-left",
  background: "white",
  showBranding: true,
  pageSize: "A4",
  headerStyle: "default",
  photoPosition: "right",
  titlePlacement: "below",
  sectionHeadingStyle: "underline",
  contactLayout: "row",
  entryLayout: "side-meta",
};

export function defaultSectionSettings(
  type: SectionType
): SectionSettings {
  const base = { uppercaseTitles: true as const };
  switch (type) {
    case "education":
      return {
        ...base,
        title: true,
        institution: true,
        location: true,
        datePeriod: true,
        gpa: false,
        bullets: true,
        logo: true,
      };
    case "experience":
      return {
        ...base,
        title: true,
        subtitle: true,
        location: true,
        datePeriod: true,
        bullets: true,
        description: true,
        link: true,
        logo: true,
      };
    case "projects":
      return {
        ...base,
        title: true,
        subtitle: true,
        location: true,
        datePeriod: true,
        description: true,
        bullets: true,
        link: false,
      };
    case "volunteering":
    case "custom":
      return {
        ...base,
        title: true,
        subtitle: true,
        location: true,
        datePeriod: true,
        description: true,
        bullets: false,
        link: false,
      };
    case "skills":
      return {
        ...base,
        groupName: true,
        skillsLayout: "tags",
        skillBorder: true,
      };
    case "certifications":
      return {
        ...base,
        title: true,
        subtitle: true,
        datePeriod: true,
        link: true,
      };
    case "achievements":
    case "strengths":
      return {
        ...base,
        title: true,
        description: true,
        icons: true,
      };
    case "awards":
      return {
        ...base,
        title: true,
        subtitle: true,
        datePeriod: true,
        icons: true,
      };
    case "online":
      return {
        ...base,
        icons: true,
        username: true,
      };
    case "interests":
      return {
        ...base,
        title: true,
        description: true,
        icons: true,
      };
    case "languages":
      return {
        ...base,
        title: true,
        subtitle: true,
        description: true,
        languageSliderStyle: "bars",
      };
    default:
      return { ...base, title: true };
  }
}

export function createId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const SAMPLE_DEVOPS_CONTENT: ResumeContent = {
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
        extraLink: "",
        extraField: "",
        dateOfBirth: "",
        nationality: "",
      },
      settings: {
        ...DEFAULT_HEADER_SETTINGS,
        extraLink: false,
        extraField: false,
        dateOfBirth: false,
        nationality: false,
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
      settings: { groupName: true, skillsLayout: "tags", skillBorder: true },
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
      ],
    },
    {
      type: "certifications",
      id: "certifications",
      title: "CERTIFICATIONS",
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
      type: "education",
      id: "education",
      title: "EDUCATION",
      items: [
        {
          id: "ed1",
          degree: "Bachelor of Science",
          school: "University Name",
          startDate: "2014",
          endDate: "2018",
          location: "City, Country",
        },
      ],
    },
  ],
  leftColumnIds: ["summary", "experience", "projects"],
  rightColumnIds: ["skills", "achievements", "certifications", "education"],
};

export function createSampleDevopsResume(id = "demo-resume"): ResumeDocument {
  return {
    id,
    title: "Untitled Resume",
    templateId: "tmpl-devops-high-performer",
    layoutKey: "high-performer",
    content: markSampleContent(structuredClone(SAMPLE_DEVOPS_CONTENT)),
    design: { ...DEFAULT_DESIGN, background: "white" },
    isComplete: false,
  };
}

export const FONT_OPTIONS = [
  { id: "Raleway", label: "Raleway" },
  { id: "Lato", label: "Lato" },
  { id: "Montserrat", label: "Montserrat" },
  { id: "Rubik", label: "Rubik" },
  { id: "Arimo", label: "Arimo", note: "Arial-like font" },
  { id: "Bitter", label: "Bitter" },
  { id: "Exo 2", label: "Exo 2" },
  { id: "Chivo", label: "Chivo" },
  { id: "Tinos", label: "Tinos", note: "Times New Roman-like font" },
  { id: "Oswald", label: "Oswald" },
  { id: "Volkhov", label: "Volkhov" },
  { id: "Gelasio", label: "Gelasio", note: "Georgia-like font" },
] as const;

/** Dual color pairs: outer = Primary/ink, inner = Secondary/accent */
export const COLOR_PAIRS: { id: string; ink: string; accent: string; label: string }[] = [
  { id: "charcoal-teal", ink: "#343334", accent: "#00788a", label: "Charcoal / Teal" },
  { id: "ink-blue", ink: "#111827", accent: "#2563eb", label: "Ink / Blue" },
  { id: "ink-slate", ink: "#111827", accent: "#6b7280", label: "Ink / Slate" },
  { id: "forest-emerald", ink: "#14532d", accent: "#22c55e", label: "Forest / Emerald" },
  { id: "maroon-coral", ink: "#7f1d1d", accent: "#f97316", label: "Maroon / Coral" },
  { id: "navy-sky", ink: "#1e3a5f", accent: "#60a5fa", label: "Navy / Sky" },
  { id: "indigo-royal", ink: "#312e81", accent: "#6366f1", label: "Indigo / Royal" },
  { id: "ocean-amber", ink: "#1e3a8a", accent: "#f59e0b", label: "Ocean / Amber" },
  { id: "plum-violet", ink: "#581c87", accent: "#a855f7", label: "Plum / Violet" },
  { id: "charcoal-cyan", ink: "#1f2937", accent: "#06b6d4", label: "Charcoal / Cyan" },
  { id: "midnight-gold", ink: "#0f172a", accent: "#c4a035", label: "Midnight / Gold" },
  { id: "teal-mint", ink: "#115e59", accent: "#14b8a6", label: "Teal / Mint" },
  { id: "ink-rose", ink: "#111827", accent: "#f43f5e", label: "Ink / Rose" },
  { id: "espresso-amber", ink: "#292524", accent: "#d97706", label: "Espresso / Amber" },
  { id: "deep-sky", ink: "#0c4a6e", accent: "#0ea5e9", label: "Deep / Sky" },
  { id: "wine-blush", ink: "#881337", accent: "#fb7185", label: "Wine / Blush" },
  { id: "olive-lime", ink: "#365314", accent: "#84cc16", label: "Olive / Lime" },
  { id: "pine-aqua", ink: "#134e4a", accent: "#2dd4bf", label: "Pine / Aqua" },
  { id: "graphite-lilac", ink: "#1e1b4b", accent: "#818cf8", label: "Graphite / Lilac" },
  { id: "steel-azure", ink: "#334155", accent: "#38bdf8", label: "Steel / Azure" },
];

/** @deprecated use COLOR_PAIRS — kept for older imports */
export const COLOR_SWATCHES = COLOR_PAIRS.map((p) => p.accent);

export const ADDABLE_SECTIONS: {
  type: Exclude<import("./types").SectionType, "header">;
  name: string;
  premium?: boolean;
  blurb: string;
}[] = [
  { type: "experience", name: "Experience", blurb: "Title, company, dates & location" },
  { type: "education", name: "Education", blurb: "Degree, school, dates & location" },
  { type: "skills", name: "Skills", blurb: "Categorized skill tags" },
  { type: "projects", name: "Projects", blurb: "Projects with dates" },
  { type: "custom", name: "Custom Title", premium: true, blurb: "Flexible dated entries" },
  { type: "languages", name: "Languages", blurb: "Proficiency dots" },
  { type: "strengths", name: "Strengths", blurb: "Short strengths list" },
  { type: "volunteering", name: "Volunteering", blurb: "Role, org, dates & location" },
  { type: "industryExpertise", name: "Industry Expertise", blurb: "Progress bars" },
  { type: "interests", name: "Interests", blurb: "Icons + descriptions" },
  { type: "myTime", name: "My Time", blurb: "Time allocation chart" },
  { type: "online", name: "Find me online", blurb: "Social profiles" },
  { type: "certifications", name: "Certifications", premium: true, blurb: "Creds + issuer" },
  { type: "awards", name: "Awards", premium: true, blurb: "Awards grid" },
  { type: "references", name: "References", premium: true, blurb: "Contact grid" },
  { type: "philosophy", name: "My Life Philosophy", premium: true, blurb: "Quote block" },
];
