import type { LayoutKey, TemplateMeta } from "./types";

const DEPARTMENTS = [
  "DevOps",
  "Cloud",
  "SRE",
  "Platform",
  "Software Engineering",
  "Data",
  "Design",
  "Marketing",
  "Finance",
  "Healthcare",
  "Product",
  "Security",
  "QA",
  "Support",
  "Sales",
] as const;

const LAYOUTS: { key: LayoutKey; name: string }[] = [
  { key: "high-performer", name: "High Performer" },
  { key: "single-column", name: "Single column" },
  { key: "stylish", name: "Stylish" },
  { key: "timeline", name: "Timeline" },
  { key: "creative", name: "Creative" },
  { key: "classic", name: "Classic" },
  { key: "compact", name: "Compact" },
  { key: "elegant", name: "Elegant" },
  { key: "ivy-league", name: "Ivy League" },
  { key: "crest", name: "Crest" },
  { key: "contemporary", name: "Contemporary" },
  { key: "polished", name: "Polished" },
];

const ACCENTS = [
  "#14b8a6",
  "#2563eb",
  "#0f766e",
  "#1e3a8a",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#334155",
  "#0891b2",
  "#be123c",
];

const FONTS = [
  "Raleway",
  "Lato",
  "Montserrat",
  "Rubik",
  "Bitter",
  "Chivo",
  "Oswald",
  "Volkhov",
];

/** 100+ selectable templates = layout × department × accent presets */
export function generateTemplates(): TemplateMeta[] {
  const templates: TemplateMeta[] = [];
  let i = 0;

  // Featured DevOps / Cloud / SRE / Platform first
  const featured = ["DevOps", "Cloud", "SRE", "Platform"] as const;
  for (const dept of featured) {
    for (const layout of LAYOUTS) {
      const accent = ACCENTS[i % ACCENTS.length];
      const font = FONTS[i % FONTS.length];
      templates.push({
        id: `tmpl-${dept.toLowerCase()}-${layout.key}-${i}`,
        name: `${dept} ${layout.name}`,
        department: dept,
        layoutKey: layout.key,
        accentColor: accent,
        fontFamily: font,
        isPremium: i % 7 === 0,
        previewLabel: layout.name,
      });
      i += 1;
    }
  }

  // Fill remaining departments until 120+
  for (const dept of DEPARTMENTS) {
    if ((featured as readonly string[]).includes(dept)) continue;
    for (const layout of LAYOUTS.slice(0, 6)) {
      const accent = ACCENTS[i % ACCENTS.length];
      const font = FONTS[i % FONTS.length];
      templates.push({
        id: `tmpl-${dept.toLowerCase().replace(/\s+/g, "-")}-${layout.key}-${i}`,
        name: `${dept} ${layout.name}`,
        department: dept,
        layoutKey: layout.key,
        accentColor: accent,
        fontFamily: font,
        isPremium: i % 9 === 0,
        previewLabel: layout.name,
      });
      i += 1;
    }
  }

  // Ensure canonical DevOps High Performer id used by sample resume
  const hp = templates.find(
    (t) => t.department === "DevOps" && t.layoutKey === "high-performer"
  );
  if (hp) {
    hp.id = "tmpl-devops-high-performer";
    hp.name = "DevOps High Performer";
  }

  // Emerald Numbered: appended after the generated list so existing template ids never shift.
  for (const [dept, accent] of [
    ["DevOps", "#15803d"],
    ["Cloud", "#047857"],
    ["SRE", "#166534"],
    ["Platform", "#15803d"],
  ] as const) {
    templates.push({
      id: `tmpl-${dept.toLowerCase()}-numbered`,
      name: `${dept} Numbered`,
      department: dept,
      layoutKey: "numbered",
      accentColor: accent,
      fontFamily: "Lato",
      isPremium: false,
      previewLabel: "Numbered",
    });
  }

  return templates;
}

export const TEMPLATES = generateTemplates();
