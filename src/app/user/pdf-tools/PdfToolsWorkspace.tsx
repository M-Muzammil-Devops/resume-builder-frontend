"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ArrowLeft, Bell, CheckCircle2, FileType2, PencilLine } from "lucide-react";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { PdfIcon } from "@/components/nav/PdfIcon";
import { PDF_EDITOR, PDF_TOOL_GROUPS, PDF_TOOLS, findPdfTool } from "@/components/nav/tools";
import { cx } from "@/components/dashboard/format";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";

/** Same status as the public /tools page: every PDF tool is "Coming soon" for now. */
function ToolDetail({ slug, onBack, onPick }: { slug: string; onBack: () => void; onPick: (slug: string) => void }) {
  const tool = findPdfTool(slug);
  const [notified, setNotified] = useState(false);
  if (!tool) return null;
  const related = PDF_TOOLS.filter((t) => t.group === tool.group && t.slug !== tool.slug).slice(0, 4);
  const more = related.length ? related : PDF_TOOLS.filter((t) => t.slug !== tool.slug).slice(0, 4);
  return (
    <>
      <div>
        <button type="button" className={cx(s.btn, s.sm)} onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> All PDF tools
        </button>
      </div>
      <section className={cx(w.panel, w.soon)} aria-labelledby="pdf-tool-title">
        <span className={w.soonIco} aria-hidden="true">
          <PdfIcon name={tool.icon} size={34} />
        </span>
        <span className={cx(s.pill, s.a)}>Coming soon</span>
        <h2 id="pdf-tool-title">{tool.title}</h2>
        <p>{tool.blurb} We&apos;re building it now — it will open right here in your dashboard, free to try with your account.</p>
        <button type="button" className={cx(s.btn, s.primary)} disabled={notified} onClick={() => setNotified(true)}>
          {notified ? <CheckCircle2 size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
          {notified ? "You're on the list" : "Notify me"}
        </button>
        <span role="status" className={w.muted}>
          {notified ? `Thanks! ${tool.title} will appear here as soon as it launches.` : ""}
        </span>
      </section>
      <section className={w.pdfGroup} aria-labelledby="pdf-more-title">
        <div className={w.pdfGroupHead}>
          <h2 id="pdf-more-title">{related.length ? `More in ${tool.group}` : "More PDF tools"}</h2>
        </div>
        <ul className={w.pdfGrid} role="list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {more.map((t) => (
            <li key={t.slug}>
              <ToolCard title={t.title} blurb={t.blurb} icon={<PdfIcon name={t.icon} size={20} />} onClick={() => onPick(t.slug)} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function ToolCard({ title, blurb, icon, onClick }: { title: string; blurb: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={w.pdfCard} onClick={onClick} style={{ width: "100%", height: "100%" }}>
      <span className={w.pdfTop}>
        <span className={w.pdfIco} aria-hidden="true">
          {icon}
        </span>
        <span className={cx(s.pill, s.gr)}>Soon</span>
      </span>
      <b>{title}</b>
      <small>{blurb}</small>
    </button>
  );
}

function PdfToolsView() {
  const [slug, setSlug] = useState<string | null>(null);

  // Deep link: /user/pdf-tools#<slug> opens that tool's panel.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace(/^#/, "");
      setSlug(h && findPdfTool(h) ? h : null);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  function pick(next: string | null) {
    setSlug(next);
    const url = next ? `/user/pdf-tools#${next}` : "/user/pdf-tools";
    window.history.replaceState(window.history.state, "", url);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <WorkspaceHeader
        icon={<FileType2 size={22} />}
        title="PDF Tools"
        sub="Optimize, convert, edit and secure PDFs without leaving your dashboard. The toolkit is launching soon."
        actions={<span className={cx(s.pill, s.a)}>Coming soon</span>}
      />
      {slug ? (
        <ToolDetail slug={slug} onBack={() => pick(null)} onPick={(next) => pick(next)} />
      ) : (
        <>
          <section className={w.pdfGroup} aria-labelledby="pdf-editor-title">
            <div className={w.pdfGroupHead}>
              <h2 id="pdf-editor-title">PDF Editor</h2>
              <p>Edit any PDF right in your browser.</p>
            </div>
            <button type="button" className={cx(w.panel, w.pdfCard, w.feature)} onClick={() => pick(PDF_EDITOR.slug)}>
              <span className={w.soonIco} style={{ width: 54, height: 54, borderRadius: 16 }} aria-hidden="true">
                <PencilLine size={24} />
              </span>
              <div>
                <b style={{ fontSize: 15 }}>{PDF_EDITOR.title}</b>
                <small style={{ display: "block", marginTop: 4 }}>{PDF_EDITOR.blurb}</small>
              </div>
              <span className={cx(s.pill, s.gr)}>Soon</span>
            </button>
          </section>
          {PDF_TOOL_GROUPS.map((group) => (
            <section key={group.id} className={w.pdfGroup} aria-labelledby={`pdf-${group.id}-title`}>
              <div className={w.pdfGroupHead}>
                <h2 id={`pdf-${group.id}-title`}>{group.title}</h2>
                <p>{group.blurb}</p>
              </div>
              <ul className={w.pdfGrid} role="list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {group.tools.map((tool) => (
                  <li key={tool.slug}>
                    <ToolCard title={tool.title} blurb={tool.blurb} icon={<PdfIcon name={tool.icon} size={20} />} onClick={() => pick(tool.slug)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  );
}

export function PdfToolsWorkspace() {
  return (
    <UserWorkspace active="pdf-tools">
      <PdfToolsView />
    </UserWorkspace>
  );
}
