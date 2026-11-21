"use client";

import { useEffect, useState } from "react";
import { ADDABLE_SECTIONS } from "@/shared";
import { CalendarDays, Crown, MapPin, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import { useEscapeClose } from "@/hooks/useEscapeClose";

function PreviewCard({ type }: { type: string }) {
  const accent = "var(--rb-teal)";
  if (type === "experience" || type === "volunteering" || type === "education") {
    return (
      <div className="rounded-lg border border-slate-100 bg-white p-2.5 text-left shadow-sm">
        <div className="border-b-2 border-slate-800 pb-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-800">
          {type}
        </div>
        <div className="mt-1.5 text-[10px] font-semibold text-slate-800">Title / Degree</div>
        <div className="text-[10px] font-medium" style={{ color: accent }}>
          Company / School
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-[9px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={9} /> 01/2025 – 12/2026
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={9} /> City, Country
          </span>
        </div>
        {(type === "experience" || type === "volunteering") && (
          <ul className="mt-1 list-disc pl-3 text-[8px] text-slate-500">
            <li>Highlight with metrics</li>
          </ul>
        )}
      </div>
    );
  }
  if (type === "skills") {
    return (
      <div className="rounded-lg border border-slate-100 bg-white p-2.5 text-left shadow-sm">
        <div className="border-b-2 border-slate-800 pb-0.5 text-[9px] font-bold uppercase">Skills</div>
        <div className="mt-1.5 text-[9px] font-semibold" style={{ color: accent }}>
          Frontend
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {["React", "Node", "AWS"].map((t) => (
            <span key={t} className="rounded border border-slate-200 px-1 py-0.5 text-[8px] text-slate-600">
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (type === "languages") {
    return (
      <div className="rounded-lg border border-slate-100 bg-white p-2.5 text-left shadow-sm">
        <div className="border-b-2 border-slate-800 pb-0.5 text-[9px] font-bold uppercase">Languages</div>
        <div className="mt-2 flex items-center justify-between text-[9px]">
          <span>English</span>
          <span className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: i <= 4 ? accent : "#d1d5db" }}
              />
            ))}
          </span>
        </div>
      </div>
    );
  }
  if (type === "industryExpertise") {
    return (
      <div className="rounded-lg border border-slate-100 bg-white p-2.5 text-left shadow-sm">
        <div className="border-b-2 border-slate-800 pb-0.5 text-[9px] font-bold uppercase">
          Industry Expertise
        </div>
        <div className="mt-2 text-[9px] text-slate-600">Leadership</div>
        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
          <div className="h-1.5 w-4/5 rounded-full" style={{ background: accent }} />
        </div>
      </div>
    );
  }
  if (type === "philosophy") {
    return (
      <div className="rounded-lg border border-slate-100 bg-white p-2.5 text-center shadow-sm">
        <div className="border-b-2 border-slate-800 pb-0.5 text-left text-[9px] font-bold uppercase">
          Philosophy
        </div>
        <p className="mt-2 text-[9px] italic" style={{ color: accent }}>
          “Be the change…”
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-2.5 text-left shadow-sm">
      <div className="border-b-2 border-slate-800 pb-0.5 text-[9px] font-bold uppercase">
        {type}
      </div>
      <div className="mt-2 space-y-1">
        <div className="h-1.5 w-4/5 rounded bg-slate-100" />
        <div className="h-1.5 w-3/5 rounded bg-slate-100" />
        <div className="mt-1 flex items-center gap-1 text-[8px] text-slate-400">
          <CalendarDays size={8} /> Dates · <MapPin size={8} /> Location
        </div>
      </div>
    </div>
  );
}

export function AddSectionModal() {
  const addSection = useEditorStore((s) => s.addSection);
  const setModal = useEditorStore((s) => s.setModal);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [role, setRole] = useState("user");
  useEscapeClose(() => setModal(null));

  useEffect(() => {
    apiFetch<{ user: { role?: string } | null }>("/auth/me")
      .then((res) => setRole(res.user?.role || "user"))
      .catch(() => setRole("user"));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
      <div className="rb-pop rb-scroll max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 relative border-b border-slate-100 bg-white px-6 py-5">
          <h2 className="text-center text-xl font-bold text-slate-900">Add a new section</h2>
          <p className="mt-1 text-center text-sm text-slate-500">
            Click on a section to add it to your resume
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setModal(null)}
            className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
          {ADDABLE_SECTIONS.map((section) => (
            <button
              key={section.type}
              type="button"
              onClick={() => {
                if (section.type === "custom" && role !== "admin") {
                  setUpgrade("Custom Title");
                  return;
                }
                addSection(section.type, "right");
              }}
              className="group relative rounded-xl border border-slate-200 p-2 text-left transition hover:border-[var(--rb-teal)] hover:shadow-md"
            >
              <PreviewCard type={section.type} />
              <div className="mt-2 flex items-center justify-between px-0.5">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{section.name}</div>
                  <div className="text-[10px] text-slate-500">{section.blurb}</div>
                </div>
                {section.premium && (
                  <Crown size={14} className="text-amber-500" />
                )}
              </div>
            </button>
          ))}
        </div>
        {upgrade && (
          <div className="border-t border-amber-100 bg-amber-50 px-6 py-4 text-sm text-amber-900">
            {upgrade} is a Pro section. Upgrade to add it.
            <button type="button" className="ml-3 font-semibold" onClick={() => setUpgrade(null)}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
