import type { Metadata } from "next";
import { LandingAurora } from "@/components/landing/aurora/LandingAurora";
import { publicSiteUrl } from "@/lib/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const site = await publicSiteUrl();
  return {
    metadataBase: site ? new URL(site) : undefined,
    alternates: site ? { canonical: site } : undefined,
    title: "ResumeBuilder — ATS-ready resumes in minutes",
    description:
      "Pick a template, edit live, polish with AI, check the ATS score, and download a PDF that matches the page.",
    keywords: ["resume builder", "ATS resume", "CV template", "AI resume"],
    openGraph: {
      title: "ResumeBuilder — ATS-ready resumes in minutes",
      description: "Templates, live editing, AI polish, and a PDF that matches the editor.",
      type: "website",
      url: site || "/",
      images: [{ url: "/templates/executive-navy.png", alt: "Executive resume template" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "ResumeBuilder — ATS-ready resumes in minutes",
      description: "Templates, live editing, AI polish, and a PDF that matches the editor.",
      images: ["/templates/executive-navy.png"],
    },
  };
}

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ResumeBuilder",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: "Build an ATS-ready resume, edit it live, and download a matching PDF.",
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <LandingAurora />
    </>
  );
}
