"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Lock, MapPin, X } from "lucide-react";
import clsx from "clsx";
import type { ImproveSuggestion } from "@/shared";
import { ApiError, apiFetch } from "@/lib/api";
import {
  analyzeResume,
  applySuggestionToSection,
  filterValidSuggestions,
} from "@/lib/improveEngine";
import { useEditorStore } from "@/store/editorStore";

type ToggleKey = "tailored" | "spellcheck" | "wording" | "recommendations";

const TOGGLES: { key: ToggleKey; label: string; locked?: boolean }[] = [
  { key: "tailored", label: "Tailored Suggestions" },
  { key: "spellcheck", label: "Spellcheck & Grammar", locked: true },
  { key: "wording", label: "Wording & Readability", locked: true },
  { key: "recommendations", label: "Recommendations", locked: true },
];

const LANGS = ["Autodetected", "English", "Urdu", "Arabic", "French", "German", "Spanish"];

const CATEGORY_LABEL: Record<ImproveSuggestion["category"], string> = {
  spellcheck: "Spellcheck",
  wording: "Wording",
  recommendation: "Recommendation",
};

function suggestionKey(s: ImproveSuggestion) {
  return `${s.category}|${s.sectionId ?? ""}|${s.fieldPath ?? ""}|${s.original.toLowerCase().slice(0, 80)}`;
}

export function ImproveTextPanel() {
  const resume = useEditorStore((s) => s.document);
  const setActivePanel = useEditorStore((s) => s.setActivePanel);
  const updateSection = useEditorStore((s) => s.updateSection);
  const setSelectedSectionId = useEditorStore((s) => s.setSelectedSectionId);
  const setImproveFocus = useEditorStore((s) => s.setImproveFocus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ImproveSuggestion[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [language, setLanguage] = useState("Autodetected");
  const [langOpen, setLangOpen] = useState(false);
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    tailored: true,
    spellcheck: true,
    wording: true,
    recommendations: true,
  });
  const [analyzed, setAnalyzed] = useState(false);

  const visible = useMemo(() => {
    return suggestions.filter((s) => {
      if (dismissed.has(suggestionKey(s))) return false;
      if (s.category === "spellcheck" && !toggles.spellcheck) return false;
      if (s.category === "wording" && !toggles.wording) return false;
      if (s.category === "recommendation" && !toggles.recommendations) return false;
      return true;
    });
  }, [suggestions, toggles, dismissed]);

  function jumpTo(s: ImproveSuggestion) {
    if (!s.sectionId) return;
    setActiveId(s.id);
    setSelectedSectionId(s.sectionId);
    if (s.fieldPath) {
      setImproveFocus({
        sectionId: s.sectionId,
        fieldPath: s.fieldPath,
        suggestionId: s.id,
      });
    } else {
      setImproveFocus(null);
    }

    window.setTimeout(() => {
      const key = `${s.sectionId}:${s.fieldPath ?? ""}`;
      const fieldEl = s.fieldPath
        ? window.document.querySelector(`[data-field-path="${key}"]`)
        : null;
      const sectionEl = window.document.querySelector(`[data-section-id="${s.sectionId}"]`);
      (fieldEl ?? sectionEl)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 40);

    // Clear yellow field highlight after a short pulse (keep section selected)
    window.setTimeout(() => {
      const current = useEditorStore.getState().improveFocus;
      if (current?.suggestionId === s.id) {
        useEditorStore.getState().setImproveFocus(null);
      }
    }, 4200);
  }

  async function runImprove() {
    if (!resume) return;
    setLoading(true);
    setError(null);
    setActiveId(null);
    setImproveFocus(null);

    const local = analyzeResume(resume, {
      tailored: toggles.tailored,
      spellcheck: toggles.spellcheck,
      wording: toggles.wording,
      recommendations: toggles.recommendations,
    }).filter((s) => !dismissed.has(suggestionKey(s)));
    setSuggestions(local);
    setAnalyzed(true);

    try {
      const res = await apiFetch<{ suggestions: ImproveSuggestion[] }>("/ai/improve", {
        method: "POST",
        body: JSON.stringify({ resume, language }),
      });
      const remote = filterValidSuggestions(resume, res.suggestions ?? []);
      const seen = new Set(local.map(suggestionKey));
      const merged = [...local];
      for (const s of remote) {
        const key = suggestionKey(s);
        if (seen.has(key) || dismissed.has(key)) continue;
        seen.add(key);
        merged.push(s);
      }
      setSuggestions(merged.slice(0, 16));
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many AI requests. Wait a minute and try again.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Sign in to get AI suggestions. The local checks above still work.");
      } else {
        setError(err instanceof Error ? err.message : "Couldn’t analyze the resume. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function applySuggestion(s: ImproveSuggestion) {
    if (!resume || !s.sectionId) return;
    updateSection(s.sectionId, (section) => applySuggestionToSection(section, s));
    setDismissed((prev) => new Set(prev).add(suggestionKey(s)));
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    jumpTo(s);
  }

  function canApply(s: ImproveSuggestion) {
    if (!s.sectionId || !s.original) return false;
    if (s.category === "recommendation") {
      const adviceOnly =
        s.suggestion.toLowerCase().startsWith("expand the summary") ||
        s.suggestion.toLowerCase().startsWith("tighten the summary") ||
        s.suggestion.toLowerCase().startsWith("add 3–5") ||
        s.suggestion.toLowerCase().startsWith("add 3-5");
      return !adviceOnly;
    }
    return true;
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-white">
      <div className="relative flex items-center justify-center border-b border-[#eceef1] px-3 py-3.5">
        <h2 className="text-[15px] font-semibold text-[#3a414a]">Improve Text</h2>
        <button
          type="button"
          aria-label="Close improve text"
          onClick={() => setActivePanel(null)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-[#9aa3ad] hover:bg-[#f1f3f5] hover:text-[#4b5563]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="rb-scroll flex-1 overflow-y-auto px-3.5 py-4">
        <label className="mb-1.5 block text-[12px] text-[#8b939e]">Document Language</label>
        <div className="relative mb-2">
          <button
            type="button"
            onClick={() => setLangOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#e4e7ec] bg-white px-3 py-2.5 text-left"
          >
            <span className="text-sm font-semibold text-[#6b5b95]">{language}</span>
            <ChevronDown size={16} className="text-[#6b5b95]" />
          </button>
          {langOpen && (
            <ul className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-[#e4e7ec] bg-white py-1 shadow-lg">
              {LANGS.map((lang) => (
                <li key={lang}>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage(lang);
                      setLangOpen(false);
                    }}
                    className={clsx(
                      "w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-[#f5f6f8]",
                      language === lang ? "font-semibold text-[#6b5b95]" : "text-[#3a414a]"
                    )}
                  >
                    {lang}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-2 divide-y divide-[#eceef1] border-y border-[#eceef1]">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-2 py-3">
              <span className="min-w-0 text-[13px] font-medium leading-tight text-[#3a414a]">
                {t.label}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                {t.locked && <Lock size={13} className="text-[#8b7bb5]" strokeWidth={2.2} />}
                <button
                  type="button"
                  role="switch"
                  aria-checked={toggles[t.key]}
                  onClick={() => setToggles((prev) => ({ ...prev, [t.key]: !prev[t.key] }))}
                  className={clsx(
                    "relative h-[20px] w-[36px] cursor-pointer rounded-full transition",
                    toggles[t.key] ? "bg-[#5aaa7a]" : "bg-[#cfd4db]"
                  )}
                >
                  <span
                    className={clsx(
                      "absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition",
                      toggles[t.key] ? "left-[18px]" : "left-[2px]"
                    )}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={runImprove}
          disabled={loading || !resume}
          className="mt-1.5 w-full cursor-pointer rounded-lg bg-[#5aaa7a] px-3 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d966b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analyzing…" : analyzed ? "Re-analyze Resume" : "Analyze Resume"}
        </button>

        {loading && (
          <p className="mt-3 text-sm text-[#6b7280]">Analyzing resume…</p>
        )}
        {error && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </p>
        )}

        {analyzed && !loading && visible.length === 0 && (
          <p className="mt-4 text-sm text-[#6b7280]">
            No issues found for the enabled checks. Your wording looks solid — try toggling more
            categories or edit a bullet and re-analyze.
          </p>
        )}

        {visible.length > 0 && (
          <div className="mt-4 space-y-3">
            {visible.map((s) => {
              const active = activeId === s.id;
              return (
                <div
                  key={s.id}
                  className={clsx(
                    "w-full rounded-lg border p-3 text-left transition",
                    active
                      ? "border-[#5aaa7a] bg-[#f3faf6] shadow-sm"
                      : "border-[#e4e7ec]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5aaa7a]">
                      {CATEGORY_LABEL[s.category]}
                    </span>
                    <span className="text-[11px] capitalize text-[#9aa3ad]">{s.severity}</span>
                  </div>

                  {s.locationLabel && (
                    <p className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-[#6b5b95]">
                      <MapPin size={11} className="mt-0.5 shrink-0" />
                      <span>{s.locationLabel}</span>
                    </p>
                  )}

                  {s.original ? (
                    <p className="mt-2 text-sm text-[#8b939e] line-through decoration-[#c5cbd3]">
                      {s.original}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-sm font-medium text-[#3a414a]">{s.suggestion}</p>
                  <p className="mt-1 text-xs text-[#8b939e]">{s.reason}</p>

                  <div className="mt-3 flex items-center gap-2">
                    {s.sectionId && (
                      <button
                        type="button"
                        onClick={() => jumpTo(s)}
                        className="cursor-pointer rounded-md border border-[#d8dee6] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4b5563] transition hover:border-[#5aaa7a] hover:bg-[#f3faf6] hover:text-[#2f6b4f]"
                      >
                        Show in resume
                      </button>
                    )}
                    {canApply(s) && (
                      <button
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="cursor-pointer rounded-md bg-[#5aaa7a] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#4d966b]"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
