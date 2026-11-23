import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { SiteShell } from "./SiteShell";
import p from "./pages.module.css";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Privacy / Terms layout: hero, sticky table of contents and one glass article. */
export function LegalPage({
  eyebrow,
  title,
  accent,
  lead,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <SiteShell>
      <section className={`${p.hero} ${p.heroSm}`} aria-labelledby="legal-title">
        <div className={p.wrap}>
          <span className={p.eyebrow}>{eyebrow}</span>
          <h1 id="legal-title">
            {title} <span className={p.grad}>{accent}</span>
          </h1>
          <p className={p.lead}>{lead}</p>
          <p className={p.meta}>Last updated: {updated}</p>
        </div>
      </section>
      <div className={p.wrap}>
        <div className={p.legal}>
          <nav className={`${p.panel} ${p.toc}`} aria-label="On this page">
            <p>On this page</p>
            <ol>
              {sections.map((sec) => (
                <li key={sec.id}><a href={`#${sec.id}`}>{sec.title}</a></li>
              ))}
            </ol>
          </nav>
          <article className={`${p.panel} ${p.article}`}>
            <p className={p.templateNote} role="note">
              <TriangleAlert size={18} aria-hidden="true" />
              <span>
                <strong>Template — pending owner review.</strong> This is a general SaaS template for ResumeBuilder. It is not
                legal advice; the owner should review it (ideally with a lawyer) before launch.
              </span>
            </p>
            {sections.map((sec) => (
              <section key={sec.id} id={sec.id} aria-labelledby={`${sec.id}-h`}>
                <h2 id={`${sec.id}-h`}>{sec.title}</h2>
                {sec.body}
              </section>
            ))}
          </article>
        </div>
      </div>
    </SiteShell>
  );
}
