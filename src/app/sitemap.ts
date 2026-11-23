import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/siteUrl";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await publicSiteUrl();
  const now = new Date();
  return ["", "/tools/audio-noise-remover", "/tools/ai-voice-cleaner", "/login", "/register", "/forgot-password", "/privacy", "/terms"].map((path) => ({
    url: base ? `${base}${path || "/"}` : path || "/",
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.4,
  }));
}
