"use client";

import { useEffect, useState } from "react";
import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { useEditorStore } from "@/store/editorStore";
import { isLetterPage, type ResumeDocument } from "@/shared";

export function PublicResume({ resume }: { resume: ResumeDocument }) {
  const setDocument = useEditorStore((s) => s.setDocument);
  const document = useEditorStore((s) => s.document);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setDocument(resume);
    return () => setDocument(null);
  }, [resume, setDocument]);

  useEffect(() => {
    function fit() {
      const page = isLetterPage(resume.design?.pageSize) ? 816 : 794;
      setScale(Math.min(1, (window.innerWidth - 24) / page));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [resume.design?.pageSize]);

  if (!document) return <p className="text-center text-sm text-slate-400">Loading…</p>;

  const page = isLetterPage(document.design.pageSize) ? 816 : 794;
  return (
    <div className="mx-auto overflow-x-hidden" style={{ width: Math.round(page * scale) }}>
      <div style={{ width: page, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <ResumeCanvas readOnly />
      </div>
    </div>
  );
}
