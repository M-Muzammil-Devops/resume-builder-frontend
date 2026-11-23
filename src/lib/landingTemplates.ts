import type { LayoutKey } from "@/shared";

export type LandingTemplate = {
  id: string;
  name: string;
  blurb: string;
  image: string;
  layoutKey: LayoutKey;
  accentColor: string;
  fontFamily: string;
  templateId: string;
  department?: string;
  hasPhoto?: boolean;
  columns?: "single" | "double";
  pdfUrl?: string;
  source?: "static" | "admin";
};

/** Featured gallery cards shown on the marketing landing page. */
export const LANDING_TEMPLATES: LandingTemplate[] = [
  {
    id: "classic-serif",
    name: "Classic Serif",
    blurb: "Centered single column with elegant serif headings.",
    image: "/templates/classic-serif.webp",
    layoutKey: "classic",
    accentColor: "#1f2937",
    fontFamily: "Volkhov",
    templateId: "tmpl-landing-classic-serif",
  },
  {
    id: "marketing-cyan",
    name: "Growth Cyan",
    blurb: "Photo header + two-column marketing layout.",
    image: "/templates/marketing-cyan.webp",
    layoutKey: "high-performer",
    accentColor: "#06b6d4",
    fontFamily: "Montserrat",
    templateId: "tmpl-landing-marketing-cyan",
  },
  {
    id: "executive-navy",
    name: "Executive Navy",
    blurb: "Bold navy header block with sidebar accents.",
    image: "/templates/executive-navy.webp",
    layoutKey: "stylish",
    accentColor: "#1c2b42",
    fontFamily: "Lato",
    templateId: "tmpl-landing-executive-navy",
  },
  {
    id: "clean-cyan",
    name: "Clean Cyan",
    blurb: "Minimal two-column with soft cyan accents.",
    image: "/templates/clean-cyan.webp",
    layoutKey: "contemporary",
    accentColor: "#22d3ee",
    fontFamily: "Raleway",
    templateId: "tmpl-landing-clean-cyan",
  },
  {
    id: "engineer-sky",
    name: "Engineer Sky",
    blurb: "Skills pills + projects sidebar for engineers.",
    image: "/templates/engineer-sky.webp",
    layoutKey: "compact",
    accentColor: "#38bdf8",
    fontFamily: "Rubik",
    templateId: "tmpl-landing-engineer-sky",
  },
  {
    id: "product-blue",
    name: "Product Blue",
    blurb: "Product manager style with achievement icons.",
    image: "/templates/product-blue.webp",
    layoutKey: "polished",
    accentColor: "#2563eb",
    fontFamily: "Montserrat",
    templateId: "tmpl-landing-product-blue",
  },
  {
    id: "steady-form",
    name: "Steady Form",
    blurb: "Banner section headers with photo contact grid.",
    image: "/templates/steady-form.webp",
    layoutKey: "elegant",
    accentColor: "#334155",
    fontFamily: "Lato",
    templateId: "tmpl-landing-steady-form",
  },
  {
    id: "saffron-line",
    name: "Saffron Line",
    blurb: "Serif two-column with warm saffron dividers.",
    image: "/templates/saffron-line.webp",
    layoutKey: "ivy-league",
    accentColor: "#c4a035",
    fontFamily: "Bitter",
    templateId: "tmpl-landing-saffron-line",
  },
  {
    id: "tech-hex",
    name: "Tech Hex",
    blurb: "Modern engineer layout with hexagonal accents.",
    image: "/templates/tech-hex.webp",
    layoutKey: "creative",
    accentColor: "#2563eb",
    fontFamily: "Chivo",
    templateId: "tmpl-landing-tech-hex",
  },
  {
    id: "strategy-clean",
    name: "Strategy Clean",
    blurb: "Leadership resume with skills descriptions.",
    image: "/templates/strategy-clean.webp",
    layoutKey: "crest",
    accentColor: "#0f172a",
    fontFamily: "Raleway",
    templateId: "tmpl-landing-strategy-clean",
    department: "Leadership",
    hasPhoto: false,
    columns: "double",
  },
  {
    id: "precision-line",
    name: "Precision Line",
    blurb: "Centered header with crisp divider sections.",
    image: "/templates/precision-line.webp",
    layoutKey: "timeline",
    accentColor: "#1e3a5f",
    fontFamily: "Montserrat",
    templateId: "tmpl-landing-precision-line",
  },
  {
    id: "emerald-numbered",
    name: "Emerald Numbered",
    blurb: "Initials badge with numbered green section headers.",
    image: "/templates/emerald-numbered.webp",
    layoutKey: "numbered",
    accentColor: "#15803d",
    fontFamily: "Lato",
    templateId: "tmpl-landing-emerald-numbered",
    hasPhoto: false,
    columns: "single",
  },
];

export const PENDING_TEMPLATE_KEY = "rb_pending_template";
