import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/siteUrl";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await publicSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/user/", "/editor/", "/dashboard", "/print/", "/cover-letters/", "/settings", "/jobs"] },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
