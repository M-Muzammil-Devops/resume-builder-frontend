"use client";

import { use, useEffect, useState, Suspense } from "react";
import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { useEditorStore } from "@/store/editorStore";
import type { ResumeDocument } from "@/shared";
import { PAPER_COLORS } from "@/lib/paper";
import { useDocumentCss } from "@/hooks/useDocumentCss";
import { scrubPlaceholders, setProvenanceMode } from "@/lib/placeholders";
import { hasSampleMarks } from "@/shared";

declare global {
  interface Window {
    __RB_PRINT_TOKEN__?: string;
  }
}

/**
 * BUG-1100: the PDF renderer injects a short-lived token into the page before it loads.
 * It is never read from the URL, so no link on the page can carry it into the PDF.
 */
function printToken(): string {
  if (typeof window === "undefined") return "";
  return typeof window.__RB_PRINT_TOKEN__ === "string" ? window.__RB_PRINT_TOKEN__ : "";
}

function PrintView({ id }: { id: string }) {
  const [token] = useState(printToken);
  const setDocument = useEditorStore((s) => s.setDocument);
  const resumeDoc = useEditorStore((s) => s.document);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing print token");
      return;
    }
    let cancel = false;
    async function load() {
      const res = await fetch(`/rb-api/resumes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (!cancel) setError(`Could not load resume (HTTP ${res.status})`);
        return;
      }
      const data = (await res.json()) as { resume: ResumeDocument };
      // BUG-1240b: this page only renders the export, so typed text is never treated as a placeholder.
      setProvenanceMode(hasSampleMarks(data.resume.content));
      if (!cancel) setDocument(scrubPlaceholders(data.resume));
    }
    load().catch(() => {
      if (!cancel) setError("Could not load resume (network error)");
    });
    return () => {
      cancel = true;
    };
  }, [id, token, setDocument]);

  const letter = resumeDoc?.design.pageSize === "US Letter";
  // BUG-506: the page (margins included) uses the paper colour the user picked.
  const paper = PAPER_COLORS[resumeDoc?.design.background || "white"] || "#ffffff";
  const pagePad = resumeDoc
    ? Math.round(48 + (Math.min(8, Math.max(0, resumeDoc.design.pageMargins)) / 8) * 48)
    : 72;

  const banner = resumeDoc?.design.headerStyle === "banner";
  // BUG-050 / BUG-506: page margins are padding that repeats on every printed page
  // (box-decoration-break: clone), so each page gets the same top/bottom margin and the
  // paper colour reaches the page edge. This style comes after ResumeCanvas's own
  // @page rule so it wins.
  const printCss = `
        @page { size: ${letter ? "8.5in 11in" : "A4"}; margin: 0; }
        html, body { margin: 0 !important; background: ${paper} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        [data-print-ready] .resume-sheet-host { min-height: 0 !important; }
        [data-print-ready] .resume-page {
          padding: ${banner ? `${pagePad}px 0` : `${pagePad}px`} !important;
          min-height: 0 !important;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          box-shadow: none !important;
        }
        .rb-section-hit, .rb-entry, h2, h3, table, tr { break-inside: avoid; page-break-inside: avoid; }
        h2, h3 { break-after: avoid; page-break-after: avoid; }
        a { color: inherit; text-decoration: underline; }
        /* BUG-027: empty fields never print their placeholder hint. */
        input::placeholder, textarea::placeholder { color: transparent !important; }
        [data-placeholder]:empty::before { content: none !important; }
      `;
  // Applied once the resume (and so ResumeCanvas) is mounted, so this sheet is added
  // after the canvas @page rule and wins (BUG-1404 moved both out of inline <style>).
  useDocumentCss(resumeDoc ? printCss : "");

  return (
    <div style={{ background: paper }}>
      {/* The export renderer waits for data-print-ready or data-print-error (BUG-705). */}
      {error ? <p data-print-error={error}>{error}</p> : null}
      {resumeDoc ? (
        <div data-print-ready data-page-pad={pagePad} data-paper={paper}>
          <ResumeCanvas readOnly />
        </div>
      ) : (
        !error && <p>Loading resume…</p>
      )}
    </div>
  );
}

export default function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<p>Loading resume…</p>}>
      <PrintView id={id} />
    </Suspense>
  );
}
