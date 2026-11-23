"use client";

import { use, useEffect, useMemo, Suspense } from "react";
import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { useEditorStore } from "@/store/editorStore";
import { useDocumentCss } from "@/hooks/useDocumentCss";
import { scrubPlaceholders, setProvenanceMode } from "@/lib/placeholders";
import { hasSampleMarks } from "@/shared";
import { LANDING_TEMPLATES } from "@/lib/landingTemplates";
import { templateFingerprint, templatePreviewDocument } from "@/lib/templateFingerprint";

/**
 * Public, read-only render of a landing template's starter resume with the real ResumeCanvas and
 * the same print CSS as /print/[id]. scripts/template-thumbs.mjs screenshots it into
 * public/templates/<id>.webp, so the landing / picker thumbnail is always the real template.
 */
function PreviewView({ id }: { id: string }) {
  const setDocument = useEditorStore((s) => s.setDocument);
  const resumeDoc = useEditorStore((s) => s.document);
  const landing = LANDING_TEMPLATES.find((t) => t.id === id);
  const source = useMemo(() => templatePreviewDocument(id, landing?.layoutKey), [id, landing?.layoutKey]);

  useEffect(() => {
    if (!source) return;
    setProvenanceMode(hasSampleMarks(source.content));
    setDocument(scrubPlaceholders(source));
  }, [source, setDocument]);

  const pagePad = resumeDoc
    ? Math.round(48 + (Math.min(8, Math.max(0, resumeDoc.design.pageMargins)) / 8) * 48)
    : 72;
  const banner = resumeDoc?.design.headerStyle === "banner";
  const css = `
        @page { size: A4; margin: 0; }
        html, body { margin: 0 !important; background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        [data-print-ready] .resume-sheet-host { min-height: 0 !important; }
        [data-print-ready] .resume-page {
          padding: ${banner ? `${pagePad}px 0` : `${pagePad}px`} !important;
          min-height: 0 !important;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          box-shadow: none !important;
        }
        .rb-section-hit.group\\/header, .rb-section-hit:not(:has(.rb-entry)), .rb-entry, h2, h3, table, tr { break-inside: avoid; page-break-inside: avoid; }
        h2, h3, .rb-section-hit > :first-child { break-after: avoid; page-break-after: avoid; }
        [data-page-push] { margin-top: var(--rb-base-mt, 0px) !important; }
        a { color: inherit; text-decoration: underline; }
        input::placeholder, textarea::placeholder { color: transparent !important; }
        [data-placeholder]:empty::before { content: none !important; }
      `;
  useDocumentCss(resumeDoc && source ? css : "");

  if (!source) return <p data-print-error="unknown template">Unknown template</p>;
  return (
    <div style={{ background: "#ffffff" }}>
      {resumeDoc?.id === source.id ? (
        <div data-print-ready data-page-pad={pagePad} data-template-fingerprint={templateFingerprint(id)}>
          <ResumeCanvas readOnly />
        </div>
      ) : (
        <p>Loading template…</p>
      )}
    </div>
  );
}

export default function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<p>Loading template…</p>}>
      <PreviewView id={id} />
    </Suspense>
  );
}
