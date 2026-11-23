import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AudioLines, PencilLine } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PdfIcon } from "@/components/nav/PdfIcon";
import { PDF_EDITOR, PDF_TOOL_GROUPS } from "@/components/nav/tools";
import p from "@/components/site/pages.module.css";

export const metadata: Metadata = {
  title: "All Tools — Audio & PDF Tools | ResumeBuilder",
  description: "Free AI background noise removal today, and a full PDF toolkit coming soon: compress, convert, edit, sign and protect PDFs.",
  alternates: { canonical: "/tools" },
};

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

export default function ToolsPage() {
  return (
    <SiteShell>
      <section className={p.hero} aria-labelledby="tools-title">
        <div className={p.wrap}>
          <span className={p.eyebrow}>✦ Tools</span>
          <h1 id="tools-title">
            Every tool you need, <span className={p.grad}>in one place</span>
          </h1>
          <p className={p.lead}>Clean up audio today. A complete PDF toolkit is on the way — optimize, convert, edit and secure documents without leaving ResumeBuilder.</p>
          <ul className={p.jump} aria-label="Jump to a section">
            <li><a href="#audio">Audio</a></li>
            <li><a href="#pdf-editor">PDF Editor</a></li>
            {PDF_TOOL_GROUPS.map((g) => (
              <li key={g.id}><a href={`#${g.id}`}>{g.title}</a></li>
            ))}
          </ul>
        </div>
      </section>

      <div className={p.wrap}>
        <section id="audio" className={p.section} aria-labelledby="audio-title">
          <div className={p.secHead}>
            <div>
              <h2 id="audio-title">Audio</h2>
              <p>Live now — free with your account.</p>
            </div>
          </div>
          <Link href="/tools/audio-noise-remover" className={cx(p.panel, p.feature)}>
            <span className={cx(p.ico, p.icoBlue, p.featureIco)} aria-hidden="true"><AudioLines size={28} /></span>
            <div>
              <h3>Remove Background Noise</h3>
              <p>Upload any audio or video file and get a clean, clear voice back in seconds. Files are deleted after 1 hour.</p>
            </div>
            <span className={p.cta}>Open tool <ArrowRight size={16} aria-hidden="true" /></span>
          </Link>
        </section>

        <section id="pdf-editor" className={p.section} aria-labelledby="pdf-editor-title">
          <div className={p.secHead}>
            <div>
              <h2 id="pdf-editor-title">PDF Editor</h2>
              <p>Edit any PDF right in your browser.</p>
            </div>
            <span className={p.badge}>Coming soon</span>
          </div>
          <Link href={`/tools/pdf/${PDF_EDITOR.slug}`} className={cx(p.panel, p.feature)}>
            <span className={cx(p.ico, p.featureIco)} aria-hidden="true"><PencilLine size={28} /></span>
            <div>
              <h3>{PDF_EDITOR.title}</h3>
              <p>{PDF_EDITOR.blurb}</p>
            </div>
            <span className={p.ghost}>Learn more <ArrowRight size={15} aria-hidden="true" /></span>
          </Link>
        </section>

        {PDF_TOOL_GROUPS.map((group) => (
          <section key={group.id} id={group.id} className={p.section} aria-labelledby={`${group.id}-title`}>
            <div className={p.secHead}>
              <div>
                <h2 id={`${group.id}-title`}>{group.title}</h2>
                <p>{group.blurb}</p>
              </div>
              <span className={p.badge}>Coming soon</span>
            </div>
            <ul className={cx(p.grid, group.tools.length === 6 && p.grid6)} role="list">
              {group.tools.map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/tools/pdf/${tool.slug}`} className={p.card}>
                    <span className={p.cardTop}>
                      <span className={p.ico} aria-hidden="true"><PdfIcon name={tool.icon} size={20} /></span>
                      <span className={p.badge}>Soon</span>
                    </span>
                    <h3>{tool.title}</h3>
                    <p>{tool.blurb}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </SiteShell>
  );
}
