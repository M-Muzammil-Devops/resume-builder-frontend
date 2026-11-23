/**
 * Cookie consent (first-party cookie `rb_consent`), shared format with the API
 * (resume-builder-backend src/lib/consent.ts):
 *   "<version>.<preferences><analytics><marketing>.<anonId>.<unixSeconds>"   e.g. "1.010.Ab3_x9.1764000000"
 * Essential cookies (login, security, cart) are always on and need no consent.
 * Bump CONSENT_VERSION when categories or vendors change: everyone is asked again.
 */
export const CONSENT_COOKIE = "rb_consent";
export const CONSENT_VERSION = 1;
/** 6 months, then the banner asks again. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
export const CONSENT_EVENT = "rb:consent-change";
export const OPEN_SETTINGS_EVENT = "rb:open-cookie-settings";

export type ConsentCategory = "essential" | "preferences" | "analytics" | "marketing";
export type ConsentChoices = { preferences: boolean; analytics: boolean; marketing: boolean };
export type ConsentRecord = ConsentChoices & { version: number; anonId: string; at: number };

export const CONSENT_CATEGORIES: Array<{ id: ConsentCategory; title: string; body: string; locked?: boolean }> = [
  {
    id: "essential",
    title: "Essential",
    body: "Sign-in, security and your saved work. The site cannot run without these, so they are always on.",
    locked: true,
  },
  { id: "preferences", title: "Preferences", body: "Remember your language, theme and editor settings between visits." },
  {
    id: "analytics",
    title: "Analytics & performance",
    body: "Google Analytics 4 and our own page-view counts show which pages people use, so we can improve them. No ads.",
  },
  {
    id: "marketing",
    title: "Marketing & tracking",
    body: "Would let partners measure ads across sites. We use none today; turning this on changes nothing yet.",
  },
];

export const ALL_ON: ConsentChoices = { preferences: true, analytics: true, marketing: true };
export const ALL_OFF: ConsentChoices = { preferences: false, analytics: false, marketing: false };

const bit = (v: boolean) => (v ? "1" : "0");

export function formatConsent(rec: ConsentRecord): string {
  return `${rec.version}.${bit(rec.preferences)}${bit(rec.analytics)}${bit(rec.marketing)}.${rec.anonId}.${rec.at}`;
}

export function parseConsent(raw: string | null | undefined): ConsentRecord | null {
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const m = /^(\d{1,3})\.([01])([01])([01])\.([A-Za-z0-9_-]{8,64})\.(\d{1,12})$/.exec(value.trim());
  if (!m) return null;
  return {
    version: Number(m[1]),
    preferences: m[2] === "1",
    analytics: m[3] === "1",
    marketing: m[4] === "1",
    anonId: m[5],
    at: Number(m[6]),
  };
}

export function readCookie(name: string, cookieString?: string): string | null {
  const text = cookieString ?? (typeof document === "undefined" ? "" : document.cookie);
  for (const part of text.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0 && part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

/** The current, valid consent record, or null when the visitor has not chosen (or the version changed). */
export function readConsent(cookieString?: string): ConsentRecord | null {
  const rec = parseConsent(readCookie(CONSENT_COOKIE, cookieString));
  return rec && rec.version === CONSENT_VERSION ? rec : null;
}

/** True when the category is allowed now. Essential is always allowed. */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === "essential") return true;
  const rec = readConsent();
  return Boolean(rec && rec[category]);
}

export function newAnonId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function writeConsent(choices: ConsentChoices): ConsentRecord {
  const previous = parseConsent(readCookie(CONSENT_COOKIE));
  const rec: ConsentRecord = {
    ...choices,
    version: CONSENT_VERSION,
    anonId: previous?.anonId || newAnonId(),
    at: Math.floor(Date.now() / 1000),
  };
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${formatConsent(rec)}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: rec }));
  return rec;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

/** Removes Google Analytics cookies after analytics consent is withdrawn. */
export function clearAnalyticsCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_") || name === "_gid" || name === "_gat") {
      for (const d of domains) document.cookie = `${name}=; Path=/; Max-Age=0${d ? `; Domain=${d}` : ""}`;
    }
  }
}

/** GA4 measurement id from the build (NEXT_PUBLIC_GA_ID). Empty = analytics scripts never load. */
export function gaMeasurementId(): string {
  const id = (process.env.NEXT_PUBLIC_GA_ID || "").trim();
  return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : "";
}
