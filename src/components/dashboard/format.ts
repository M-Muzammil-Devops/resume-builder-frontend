import { LANDING_TEMPLATES, type LandingTemplate } from "@/lib/landingTemplates";

export const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

/** Landing template for a stored templateId ("tmpl-landing-clean-cyan" or "clean-cyan"). */
export function templateOf(templateId: string): LandingTemplate | null {
  return (
    LANDING_TEMPLATES.find((t) => t.templateId === templateId || t.id === templateId || templateId.endsWith(`-${t.id}`)) ?? null
  );
}

export function templateName(templateId: string): string {
  const t = templateOf(templateId);
  if (t) return t.name;
  const tail = templateId.replace(/^tmpl-/, "").split("-").slice(-2).join(" ");
  return tail ? tail.replace(/\b\w/g, (c) => c.toUpperCase()) : "Custom";
}

/** "just now", "12 min ago", "3 hours ago", "yesterday", "4 days ago", then "21 Nov". */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(name: string | null | undefined, email: string): string {
  const n = (name || "").trim().split(/\s+/)[0];
  if (n) return n;
  const local = email.split("@")[0].split(/[._-]/)[0] || "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function initials(name: string | null | undefined, email: string): string {
  const source = (name || "").trim() || email.split("@")[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2)).toUpperCase();
}

/** Width % of a usage bar; an unlimited (0) limit shows a thin full-gradient track. */
export function usagePct(used: number, limit: number): number {
  if (!limit) return 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

export function fileSafe(raw: string) {
  return raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_").trim() || "Resume";
}
