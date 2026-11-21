"use client";

import { useEffect, useMemo, useState } from "react";
import type { TemplateMeta } from "@/shared";
import { X } from "lucide-react";
import clsx from "clsx";
import { apiFetch } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";

export function TemplatesPanel() {
  const document = useEditorStore((s) => s.document);
  const applyTemplate = useEditorStore((s) => s.applyTemplate);
  const setActivePanel = useEditorStore((s) => s.setActivePanel);
  const [department, setDepartment] = useState("All");
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<TemplateMeta | null>(null);
  const [role, setRole] = useState("user");
  const [upgrade, setUpgrade] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: { role?: string } | null }>("/auth/me")
      .then((res) => setRole(res.user?.role || "user"))
      .catch(() => setRole("user"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const qs =
          department !== "All" ? `?department=${encodeURIComponent(department)}` : "";
        const res = await apiFetch<{ templates: TemplateMeta[] }>(`/templates${qs}`);
        if (!cancelled) setTemplates(res.templates);
      } catch {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [department]);

  const departments = useMemo(
    () => ["All", ...Array.from(new Set(templates.map((t) => t.department)))],
    [templates]
  );

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        t.layoutKey.includes(q)
      );
    });
  }, [templates, query]);

  return (
    <aside className="relative flex h-full w-full shrink-0 flex-col bg-white">
      <div className="relative flex items-center justify-center border-b border-[#eceef1] px-4 py-3.5">
        <div className="text-center">
          <div className="text-[15px] font-semibold text-[#3a414a]">Templates</div>
          <div className="text-[11px] text-[#8b939e]">Apply design & layout from template</div>
        </div>
        <button
          type="button"
          aria-label="Close templates"
          onClick={() => setActivePanel(null)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9aa3ad] hover:bg-[#f1f3f5] hover:text-[#4b5563]"
        >
          <X size={18} />
        </button>
      </div>
      <div className="space-y-2 border-b border-slate-100 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates…"
          aria-label="Search templates"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2"
        />
        <div className="rb-scroll flex gap-1 overflow-x-auto pb-1">
          {departments.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDepartment(d)}
              className={clsx(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                department === d
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="rb-scroll grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-3">
        {loading ? (
          <p className="col-span-2 p-4 text-sm text-slate-500">Loading templates…</p>
        ) : filtered.length === 0 ? (
          <p className="col-span-2 p-4 text-sm text-slate-500">No templates match your filters.</p>
        ) : (
          filtered.map((template) => {
            const active = document?.templateId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  if (template.isPremium && role !== "admin") {
                    setUpgrade(template.name);
                    return;
                  }
                  setPending(template);
                }}
                className={clsx(
                  "rounded-xl border p-3 text-left transition hover:border-teal-300 hover:shadow-sm",
                  active ? "border-teal-500 ring-2 ring-teal-200" : "border-slate-200"
                )}
              >
                <div
                  className="mb-2 h-20 rounded-lg border border-black/5 p-2"
                  style={{ background: `${template.accentColor}14` }}
                >
                  <div className="h-2 w-2/3 rounded" style={{ background: template.accentColor }} />
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 rounded bg-slate-300/80" />
                    <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                    <div className="h-1.5 w-3/5 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="truncate text-xs font-semibold text-slate-900">{template.name}</div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{template.previewLabel}</span>
                  {template.isPremium && <span className="text-amber-600">PRO</span>}
                </div>
              </button>
            );
          })
        )}
      </div>
      {upgrade && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/95 p-6 text-center">
          <div>
            <p className="text-sm font-semibold text-slate-800">{upgrade} is a Pro template</p>
            <p className="mt-1 text-xs text-slate-500">Upgrade to apply it. Free accounts keep the standard templates.</p>
            <button type="button" className="mt-3 text-sm font-semibold text-teal-700" onClick={() => setUpgrade(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {pending && (
        <div
          className="absolute inset-0 z-20 flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-confirm-title"
        >
          <div className="border-b border-[#eceef1] px-4 py-3 text-center">
            <div id="template-confirm-title" className="text-[15px] font-semibold text-[#3a414a]">
              Preview template
            </div>
            <div className="text-[11px] text-[#8b939e]">Apply only after you confirm</div>
          </div>
          <div className="rb-scroll flex-1 overflow-y-auto p-4">
            <div
              className="mx-auto max-w-[240px] rounded-xl border border-slate-200 p-3 shadow-sm"
              style={{ fontFamily: `"${pending.fontFamily}", sans-serif` }}
            >
              <div className="h-2 w-16 rounded-full" style={{ background: pending.accentColor }} />
              <div className="mt-2 h-3 w-2/3 rounded" style={{ background: pending.accentColor }} />
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 w-full rounded bg-slate-200" />
                <div className="h-1.5 w-5/6 rounded bg-slate-200" />
                <div className="h-1.5 w-4/6 rounded bg-slate-100" />
              </div>
              <div className="mt-3 h-px w-full" style={{ background: pending.accentColor }} />
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full rounded bg-slate-200" />
                <div className="h-1.5 w-3/4 rounded bg-slate-100" />
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm font-semibold text-slate-900">{pending.name}</div>
              <div className="mt-1 text-[12px] text-slate-500">
                {pending.department} · {pending.previewLabel}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">{pending.fontFamily}</div>
            </div>
          </div>
          <div className="flex gap-2 border-t border-[#eceef1] p-3">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (pending.isPremium && role !== "admin") {
                  setUpgrade(pending.name);
                  setPending(null);
                  return;
                }
                applyTemplate(pending);
                setPending(null);
              }}
              className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Apply template
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
