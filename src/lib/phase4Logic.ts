/** Pure helpers for editor phase-4 behavior. No store or DOM. */

const RTL_CHARS = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export const CHECK_TAILOR_INTRO_KEY = "rb_check_tailor_intro_seen";

export const DESIGN_SPACING_DEFAULTS = {
  fontSize: 2,
  lineHeight: 1,
  pageMargins: 4,
  sectionSpacing: 2,
} as const;

export function textDirection(value: string): "rtl" | "ltr" {
  const plain = (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ");
  return RTL_CHARS.test(plain) ? "rtl" : "ltr";
}

export function isBlankText(value: string): boolean {
  const plain = (value || "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  return plain.length === 0;
}

export function bulletEnterAction(
  key: string,
  shiftKey: boolean,
  canSplit: boolean,
  multiline: boolean
): "split" | "linebreak" | "blur" | "default" {
  if (key !== "Enter") return "default";
  if (shiftKey) return multiline || canSplit ? "linebreak" : "blur";
  if (canSplit) return "split";
  if (!multiline) return "blur";
  return "default";
}

export function addedItemId(beforeIds: string[], afterIds: string[]): string | null {
  return afterIds.find((id) => !beforeIds.includes(id)) ?? null;
}

/** Year-month as months since year 0. Present and blank are null. */
export function parseYearMonth(value: string): number | null {
  const trimmed = (value || "").trim();
  if (!trimmed || trimmed.toLowerCase() === "present") return null;
  const match = trimmed.match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!match) return null;
  const month = match[2] ? Math.min(12, Math.max(1, Number(match[2]))) : 1;
  if (!Number.isFinite(month)) return null;
  return Number(match[1]) * 12 + month;
}

export function endBeforeStart(startDate: string, endDate: string): boolean {
  if (!endDate || endDate.trim().toLowerCase() === "present") return false;
  const start = parseYearMonth(startDate);
  const end = parseYearMonth(endDate);
  if (start == null || end == null) return false;
  return end < start;
}

export type DateSpan = { id: string; startDate: string; endDate: string };

function spanBounds(span: DateSpan, now: Date): { start: number; end: number } | null {
  const start = parseYearMonth(span.startDate);
  if (start == null) return null;
  const nowIndex = now.getFullYear() * 12 + now.getMonth() + 1;
  const rawEnd =
    (span.endDate || "").trim().toLowerCase() === "present"
      ? nowIndex
      : parseYearMonth(span.endDate);
  const end = rawEnd ?? start;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

export function jobOverlaps(items: DateSpan[], id: string, now = new Date()): boolean {
  const current = items.find((item) => item.id === id);
  if (!current) return false;
  const a = spanBounds(current, now);
  if (!a) return false;
  return items.some((other) => {
    if (other.id === id) return false;
    const b = spanBounds(other, now);
    if (!b) return false;
    return a.start <= b.end && b.start <= a.end;
  });
}

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

/** Contrast of a hex color against white. Null when the hex is incomplete. */
export function contrastRatioOnWhite(hex: string): number | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  const channel = (n: number) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(raw.slice(0, 2), 16));
  const g = channel(parseInt(raw.slice(2, 4), 16));
  const b = channel(parseInt(raw.slice(4, 6), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (luminance + 0.05);
}

export function failsWcagAaOnWhite(hex: string): boolean {
  const ratio = contrastRatioOnWhite(hex);
  return ratio != null && ratio < 4.5;
}

export function designSliderReadout(
  key: keyof typeof DESIGN_SPACING_DEFAULTS,
  value: number
): string {
  switch (key) {
    case "fontSize":
      return `${Math.round(11 + value * 0.6)} px`;
    case "lineHeight":
      return `${(1.35 + value * 0.08).toFixed(2)} em`;
    case "pageMargins":
      return `${(0.5 + (value / 8) * 0.5).toFixed(2)} in`;
    case "sectionSpacing":
      return `${Math.round(10 + value * 2.5)} px`;
  }
}

export function introShouldShow(stored: string | null): boolean {
  return stored !== "1";
}

export function fittedSize(width: number, height: number, maxEdge = 1600) {
  const w = Math.max(1, Math.round(width) || 1);
  const h = Math.max(1, Math.round(height) || 1);
  const edge = Math.max(w, h);
  if (edge <= maxEdge) return { width: w, height: h };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

export function placePopover(
  anchor: { top: number; bottom: number; left: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 8
): { top: number; left: number; maxHeight: number } {
  const maxHeight = Math.max(120, Math.min(size.height, viewport.height - margin * 2));
  let left = anchor.left;
  const maxLeft = Math.max(margin, viewport.width - margin - size.width);
  if (left > maxLeft) left = maxLeft;
  if (left < margin) left = margin;

  const gap = 6;
  const belowTop = anchor.bottom + gap;
  const aboveTop = anchor.top - gap - maxHeight;
  const spaceBelow = viewport.height - margin - belowTop;
  const spaceAbove = anchor.top - gap - margin;
  let top = spaceBelow >= maxHeight || spaceBelow >= spaceAbove ? belowTop : aboveTop;
  if (top < margin) top = margin;
  if (top + maxHeight > viewport.height - margin) {
    top = Math.max(margin, viewport.height - margin - maxHeight);
  }
  return { top, left, maxHeight };
}
