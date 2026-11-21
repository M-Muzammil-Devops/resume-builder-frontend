/** Turn the text the user typed into one absolute URL. Never prepend a second host. */
export function linkHrefFromText(raw: string): string {
  const text = (raw || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!text) return "";
  if (/^(javascript|data|vbscript|file|blob):/i.test(text.replace(/\s+/g, ""))) return "";
  if (/^https?:\/\//i.test(text)) return /^https?:\/\/[^\s"'<>`\\]+$/i.test(text) ? text : "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[\w-]+(\.[\w-]+)*:\d+(\/|$)/.test(text)) return "";
  if (!/^[\w-]+(\.[\w-]+)+(:\d+)?(\/[^\s"'<>`\\]*)?$/i.test(text.replace(/^\/+/, ""))) return "";
  return `https://${text.replace(/^\/+/, "")}`;
}

export function looksLikeUrl(raw: string): boolean {
  const text = raw.trim();
  return /^https?:\/\//i.test(text) || /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text);
}

/**
 * BUG-1100 / BUG-400: the href a header link renders with.
 * Typed URL text wins (the link follows what the user typed); otherwise the stored href is
 * used only when it is a safe absolute URL. "" means "render plain text, no link", so an
 * empty href is never resolved against the page address.
 */
export function contactLinkHref(label: string, href?: string): string {
  const text = (label || "").trim();
  if (!text) return "";
  if (looksLikeUrl(text)) {
    const typed = linkHrefFromText(text);
    if (typed) return typed;
  }
  const stored = (href || "").trim();
  if (/^mailto:[^\s"'<>`\\]+@[^\s"'<>`\\]+$/i.test(stored)) return stored;
  return /^https?:\/\//i.test(stored) ? linkHrefFromText(stored) : "";
}

/** BUG-1100: a tel: link only for text that is a phone number (7–15 digits). */
export function phoneHref(raw: string): string {
  const text = (raw || "").trim();
  if (!/^\+?[\d\s().\-/]+(\s*(ext\.?|x)\s*\d+)?$/i.test(text)) return "";
  const main = text.replace(/\s*(ext\.?|x)\s*\d+$/i, "");
  const digits = main.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "";
  return `tel:${main.trim().startsWith("+") ? "+" : ""}${digits}`;
}

/** mailto: only for a real-looking address. */
export function emailHref(raw: string): string {
  const text = (raw || "").trim();
  return /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/.test(text) ? `mailto:${text}` : "";
}
