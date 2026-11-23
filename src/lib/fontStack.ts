/**
 * BUG-1320: Raleway and Montserrat come from next/font (root layout, `--font-raleway` /
 * `--font-montserrat`), not from legacy @font-face rules, so no page downloads them twice.
 * Resume content still stores the plain family name ("Raleway"); this maps it to the next/font stack.
 */
export const NEXT_FONT_VARS: Record<string, string> = {
  Raleway: "var(--font-raleway)",
  Montserrat: "var(--font-montserrat)",
};

export function fontStack(name: string | undefined | null, fallback = "sans-serif"): string {
  const family = String(name || "").replace(/["\\]/g, "").trim();
  if (!family) return fallback;
  const v = NEXT_FONT_VARS[family];
  return v ? `${v}, "${family}", ${fallback}` : `"${family}", ${fallback}`;
}
