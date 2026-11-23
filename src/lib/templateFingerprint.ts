/**
 * Landing-match drift guard. The landing / picker thumbnail of a template is a screenshot of the
 * real ResumeCanvas render of that template's starter resume (npm run templates:thumbs). The
 * fingerprint covers everything that render depends on in data (preset design + starter content),
 * so templateThumbs.test.ts fails as soon as a preset or its sample text changes without the
 * thumbnails being regenerated. Bump RENDER_VERSION when a canvas change alters how templates look.
 * Relative imports only: this file is also loaded by the backend test runner.
 */
import { buildTemplateContent, buildTemplateDesign, LANDING_PRESETS } from "../shared/templateStarter";
import type { LayoutKey, ResumeDocument } from "../shared/types";

export const RENDER_VERSION = 2;

/** Pages each landing template's starter resume may print on (default 1). */
export const EXPECTED_PAGES: Record<string, number> = {};

export function expectedPages(id: string): number {
  return EXPECTED_PAGES[id] ?? 1;
}

/** cyrb53: small, stable, dependency-free string hash (browser + node). */
function hash53(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

/** The exact document the thumbnail renders (also what a new resume from this template starts as). */
export function templatePreviewDocument(id: string, layoutKey?: LayoutKey): ResumeDocument | null {
  const preset = LANDING_PRESETS[id];
  if (!preset) return null;
  return {
    id: `template-preview-${id}`,
    title: "Template preview",
    templateId: `tmpl-landing-${id}`,
    layoutKey: layoutKey || preset.layoutKey,
    content: buildTemplateContent(id),
    design: buildTemplateDesign(id),
    isComplete: false,
  };
}

export function templateFingerprint(id: string): string {
  const doc = templatePreviewDocument(id);
  if (!doc) return "";
  return hash53(JSON.stringify({ v: RENDER_VERSION, layoutKey: doc.layoutKey, design: doc.design, content: doc.content }));
}
