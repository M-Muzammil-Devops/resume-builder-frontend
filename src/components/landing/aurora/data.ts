import type { LandingTemplate } from "@/lib/landingTemplates";

/** Shared copy for the Aurora landing (same wording as the previous landing). */
export type Card = LandingTemplate & { source: "static" | "admin"; category: string };
export type Billing = "monthly" | "yearly";
export type PhotoFilter = "all" | "photo" | "none";
export type ColumnFilter = "all" | "single" | "double";

export const PHOTO_OPTIONS: Array<[PhotoFilter, string]> = [["all", "All"], ["photo", "Photo"], ["none", "No Photo"]];
export const COLUMN_OPTIONS: Array<[ColumnFilter, string]> = [["all", "All"], ["single", "Single"], ["double", "Double"]];

export const FAQS = [
  ["Is the free account enough to download a resume?", "Yes. You can create a resume, edit it, and download a PDF without a paid plan."],
  ["Will the preview match the PDF?", "The PDF is rendered from the same resume page you edit, including A4 and US Letter."],
  ["Does the AI rewrite my text by itself?", "No. Shorter, longer, improve, and grammar suggestions wait for Accept, Reject, or Retry."],
  ["Can I use it on a phone?", "Yes. The editor tools stay reachable on a small screen."],
] as const;

export const STEPS = [
  { title: "Choose a template", body: "Flip through designs, preview one up close, and open the one that fits your role." },
  { title: "Edit live", body: "Type on the page. Saving starts as you write, and the layout stays put." },
  { title: "AI polish", body: "Ask for shorter, longer, clearer, or cleaner grammar. Nothing changes until you accept it." },
  { title: "Download PDF", body: "Download a PDF on the free plan in A4 or US Letter. Links stay clickable in the PDF." },
] as const;

export const AI_BEFORE = "Helped the team with deployments and stuff.";
export const AI_AFTER = "Cut release time by 30% by automating the deployment pipeline.";
export const ATS_SAMPLE = 92;
export const ATS_KEYWORDS = ["CI/CD", "Node.js", "Docker", "Kubernetes", "Terraform"];

export function categoryOf(layoutKey: string, department?: string) {
  if (department && department !== "Custom") return department;
  if (layoutKey === "classic" || layoutKey === "elegant" || layoutKey === "timeline") return "Traditional";
  if (layoutKey === "stylish" || layoutKey === "polished" || layoutKey === "ivy-league" || layoutKey === "single-column" || layoutKey === "crest") return "Leadership";
  return "Modern";
}

/** BUG-1300: cards use small WebP thumbnails; the preview modal keeps the full-size PNG. */
export function previewSrc(image: string) {
  return /^\/templates\/[\w-]+\.webp$/.test(image) ? image.replace(/\.webp$/, ".png") : image;
}

/**
 * BUG-1319: carousel cards show ~200–330 CSS px, so they use 280w / 560w resized copies
 * (public/templates/thumbs/<id>-{280,560}.webp, made by `npm run templates:thumbs`) instead of the
 * 1191px original. The PREVIEW modal keeps the full-size image (previewSrc). Other images pass through.
 */
export const CARD_SIZES = "(max-width: 767px) 200px, 300px";

export function cardImage(image: string): { src: string; srcSet?: string; sizes?: string } {
  const m = /^\/templates\/([\w-]+)\.webp$/.exec(image);
  if (!m) return { src: image };
  const base = `/templates/thumbs/${m[1]}`;
  return { src: `${base}-560.webp`, srcSet: `${base}-280.webp 280w, ${base}-560.webp 560w`, sizes: CARD_SIZES };
}
