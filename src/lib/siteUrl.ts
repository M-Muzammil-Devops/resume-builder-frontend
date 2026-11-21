import { headers } from "next/headers";

/** Public origin from NEXT_PUBLIC_SITE_URL, otherwise the request host. Never falls back to loopback. */
export async function publicSiteUrl() {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (fromEnv && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(fromEnv)) return fromEnv;
  const h = await headers();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  if (!host || /^(localhost|127\.0\.0\.1)(:|$)/.test(host)) return "";
  const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim() === "http" ? "http" : "https";
  return `${proto}://${host}`;
}
