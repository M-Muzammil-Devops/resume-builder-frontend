import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { PdfIcon } from "@/components/nav/PdfIcon";
import { PDF_TOOLS, findPdfTool } from "@/components/nav/tools";
import { NotifyButton } from "@/components/site/NotifyButton";
import p from "@/components/site/pages.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PDF_TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = findPdfTool((await params).slug);
  if (!tool) return { title: "Tool not found | ResumeBuilder" };
  return {
    title: `${tool.title} — Coming soon | ResumeBuilder`,
    description: `${tool.blurb} ${tool.title} is coming soon to ResumeBuilder's PDF tools.`,
    alternates: { canonical: `/tools/pdf/${tool.slug}` },
  };
}

export default async function PdfToolPage({ params }: Props) {
  const tool = findPdfTool((await params).slug);
  if (!tool) notFound();
  const related = PDF_TOOLS.filter((t) => t.group === tool.group && t.slug !== tool.slug).slice(0, 4);
  const more = related.length ? related : PDF_TOOLS.filter((t) => t.slug !== tool.slug).slice(0, 4);

  return (
    <SiteShell>
      <section className={p.hero} aria-labelledby="pdf-title">
        <div className={p.wrap}>
          <div className={`${p.panel} ${p.soon}`}>
            <div className={p.soonIco} aria-hidden="true"><PdfIcon name={tool.icon} size={40} /></div>
            <span className={p.badge}>Coming soon</span>
            <h1 id="pdf-title">{tool.title}</h1>
            <p className={p.lead}>{tool.blurb} We&apos;re building it now — it will live right here, free to try with your ResumeBuilder account.</p>
            <div className={p.soonActions}>
              <NotifyButton tool={tool.title} />
              <Link href="/tools" className={p.ghost}>Browse all tools</Link>
            </div>
            <ol className={p.crumbs} aria-label="Breadcrumb">
              <li><Link href="/tools">Tools</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/tools#pdf-editor">PDF tools</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{tool.group === tool.title ? tool.title : `${tool.group} · ${tool.title}`}</li>
            </ol>
          </div>

          <div className={p.related}>
            <h2>{related.length ? `More in ${tool.group}` : "More PDF tools"}</h2>
            <ul className={p.grid} role="list">
              {more.map((t) => (
                <li key={t.slug}>
                  <Link href={`/tools/pdf/${t.slug}`} className={p.card}>
                    <span className={p.cardTop}>
                      <span className={p.ico} aria-hidden="true"><PdfIcon name={t.icon} size={20} /></span>
                      <span className={p.badge}>Soon</span>
                    </span>
                    <h3>{t.title}</h3>
                    <p>{t.blurb}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
