const nf = new Intl.NumberFormat("en-US");
export const num = (n: number | null | undefined) => nf.format(Math.round(n ?? 0));
export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
export function money(cents: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}
/** Dates shown in the owner's zone (Asia/Karachi) with a PKT label. */
export function pkt(value: string | null | undefined, withTime = true): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const s = d.toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
  });
  return withTime ? `${s} PKT` : s;
}
export function ago(value: string | null | undefined): string {
  if (!value) return "never";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : pkt(value, false);
}
export function initials(name: string | null | undefined, email: string) {
  const src = (name || "").trim() || email.split("@")[0];
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
}
export function flag(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
export function uptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}
export const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");
