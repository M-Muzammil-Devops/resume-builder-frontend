"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { useEditorStore } from "@/store/editorStore";
import {
  analyzeAts,
  type AtsPlatform,
  type AtsPlatformResult,
} from "@/lib/atsEngine";
import { useEscapeClose } from "@/hooks/useEscapeClose";

type Mode = "recruiter" | "ats";

const PLATFORMS: { id: AtsPlatform; label: string }[] = [
  { id: "indeed", label: "Indeed" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "glassdoor", label: "Glassdoor" },
];

export function PreviewModal() {
  const document = useEditorStore((s) => s.document);
  const setModal = useEditorStore((s) => s.setModal);
  useEscapeClose(() => setModal(null));
  const [mode, setMode] = useState<Mode>("recruiter");
  const [platform, setPlatform] = useState<AtsPlatform>("indeed");

  // Client-side ATS — zero network, instant, low CPU
  const ats: AtsPlatformResult | null = useMemo(() => {
    if (!document || mode !== "ats") return null;
    return analyzeAts(document, platform);
  }, [document, mode, platform]);

  if (!document) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex flex-col bg-[#2a2f36]/88 backdrop-blur-[1px]"
    >
      <header className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 bg-[#323840] px-4 py-3 text-slate-100">
        <h2 id="preview-modal-title" className="justify-self-start text-sm font-semibold">Resume Preview</h2>

        <div className="flex justify-self-center rounded-full bg-[#3a414a] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("recruiter")}
            className={clsx(
              "rounded-full px-3 py-1.5 transition",
              mode === "recruiter"
                ? "bg-[#4d9d92] text-white shadow"
                : "text-slate-300 hover:text-white"
            )}
          >
            What Recruiters See
          </button>
          <button
            type="button"
            onClick={() => setMode("ats")}
            className={clsx(
              "rounded-full px-3 py-1.5 transition",
              mode === "ats"
                ? "bg-[#4d9d92] text-white shadow"
                : "text-slate-300 hover:text-white"
            )}
          >
            What ATS Sees
          </button>
        </div>

        <button
          type="button"
          aria-label="Close preview"
          onClick={() => setModal(null)}
          className="justify-self-end rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </header>

      {mode === "ats" && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-white/10 bg-[#2f353c] px-4 py-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                platform === p.id
                  ? "bg-[#5aaa7a] text-white"
                  : "bg-[#3a414a] text-slate-300 hover:text-white"
              )}
            >
              {p.label} ATS
            </button>
          ))}
          {ats && (
            <span className="ml-2 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              Parse score {ats.score}/100
            </span>
          )}
        </div>
      )}

      <div className="rb-scroll flex-1 overflow-auto px-3 py-6 md:px-8">
        {mode === "recruiter" ? (
          <div className="pointer-events-none flex justify-center select-none">
            <ResumeCanvas readOnly />
          </div>
        ) : (
          ats && (
            <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_280px]">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-[#ebe8e1] p-5 font-mono text-[12px] leading-relaxed text-[#2c2a26] shadow-lg">
                {ats.plainText}
              </pre>
              <aside className="space-y-3 text-sm text-slate-200">
                <div className="rounded-xl bg-[#3a414a] p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Parsed fields
                  </div>
                  <ul className="space-y-1.5 text-[11px]">
                    {ats.fields.slice(0, 12).map((f) => (
                      <li key={f.label}>
                        <span className="text-slate-400">{f.label}: </span>
                        <span className="text-slate-100">{f.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {ats.issues.length > 0 && (
                  <div className="rounded-xl bg-[#4a3535] p-3">
                    <div className="mb-1 text-[11px] font-semibold uppercase text-rose-200">
                      Issues
                    </div>
                    <ul className="list-disc space-y-1 pl-4 text-[11px] text-rose-100">
                      {ats.issues.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="rounded-xl bg-[#3a414a] p-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                    Tips
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-200">
                    {ats.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-[#3a414a] p-3 text-[11px]">
                  <div className="text-emerald-300">
                    Keywords: {ats.keywordsFound.join(", ") || "—"}
                  </div>
                  <div className="mt-1 text-amber-200/90">
                    Missing: {ats.keywordsMissing.join(", ") || "—"}
                  </div>
                </div>
              </aside>
            </div>
          )
        )}
      </div>
    </div>
  );
}
