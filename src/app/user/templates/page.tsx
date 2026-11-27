"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LayoutTemplate, Plus, Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { createResumeFromLandingTemplate } from "@/lib/continueAfterAuth";
import { LANDING_TEMPLATES, type LandingTemplate } from "@/lib/landingTemplates";
import { applyTemplateSettings, fetchTemplateSettings, type TemplateSetting } from "@/lib/templateSettings";
import type { LayoutKey } from "@/shared";
import { COLUMN_OPTIONS, PHOTO_OPTIONS, cardImage, categoryOf, previewSrc, type Card, type ColumnFilter, type PhotoFilter } from "@/components/landing/aurora/data";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { createStarterResume, friendlyError } from "@/components/dashboard/actions";
import { cx } from "@/components/dashboard/format";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";

const SINGLE_LAYOUTS = new Set(["classic", "timeline", "single-column", "elegant"]);

/** Templates view inside the User Dashboard shell: only the template gallery (the dashboard shows resumes). */
function TemplatesView() {
  const router = useRouter();
  const [remote, setRemote] = useState<LandingTemplate[]>([]);
  const [settings, setSettings] = useState<TemplateSetting[] | null>(null);
  const [category, setCategory] = useState("All");
  const [photo, setPhoto] = useState<PhotoFilter>("all");
  const [columns, setColumns] = useState<ColumnFilter>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Card | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchTemplateSettings().then((rows) => alive && setSettings(rows));
    // Admin-uploaded templates (same endpoint as the landing page gallery).
    apiFetch<{ templates: Array<LandingTemplate & { layoutKey: string }> }>("/landing-templates")
      .then((res) => {
        if (!alive) return;
        setRemote((res.templates || []).map((t) => ({ ...t, layoutKey: t.layoutKey as LayoutKey, source: "admin" as const })));
      })
      .catch(() => alive && setRemote([]));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreview(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  const cards = useMemo(() => {
    const staticCards: Card[] = LANDING_TEMPLATES.map((t) => ({
      ...t,
      source: "static" as const,
      hasPhoto: t.hasPhoto ?? (t.id !== "classic-serif" && t.id !== "precision-line"),
      columns: t.columns ?? (SINGLE_LAYOUTS.has(t.layoutKey) ? "single" : "double"),
      category: categoryOf(t.layoutKey, t.department),
    }));
    const remoteCards: Card[] = remote.map((t) => ({ ...t, source: "admin" as const, category: categoryOf(t.layoutKey, t.department) }));
    return applyTemplateSettings([...remoteCards, ...staticCards], settings);
  }, [remote, settings]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(cards.map((c) => c.category)))], [cards]);
  const q = query.trim().toLowerCase();
  const shown = cards.filter((c) => {
    if (category !== "All" && c.category !== category) return false;
    if (photo === "photo" && c.hasPhoto === false) return false;
    if (photo === "none" && c.hasPhoto !== false) return false;
    if (columns === "single" && c.columns !== "single") return false;
    if (columns === "double" && c.columns !== "double") return false;
    if (q && !`${c.name} ${c.blurb} ${c.category}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const filtered = category !== "All" || photo !== "all" || columns !== "all" || q !== "";

  async function startTemplate(t: Card) {
    setBusyId(t.id);
    setError(null);
    try {
      const doc = await createResumeFromLandingTemplate(t);
      router.push(`/user/editor/${doc.id}`);
    } catch (err) {
      setError(friendlyError(err, "Could not start this template. Please try again."));
      setBusyId(null);
    }
  }

  async function startBlank() {
    setBusyId("blank");
    setError(null);
    try {
      const id = await createStarterResume();
      router.push(`/user/editor/${id}`);
    } catch (err) {
      setError(friendlyError(err, "Could not create a resume. Please try again."));
      setBusyId(null);
    }
  }

  const busy = busyId !== null;

  return (
    <>
      <WorkspaceHeader
        icon={<LayoutTemplate size={22} />}
        title="Templates"
        sub={`${cards.length} ATS-ready designs. Pick one to start a new resume — you can switch templates any time in the editor.`}
        actions={
          <button type="button" className={cx(s.btn, s.primary)} disabled={busy} onClick={() => void startBlank()}>
            <Plus size={16} aria-hidden="true" /> Blank resume
          </button>
        }
      />

      <div className={cx(w.panel, w.tgBar)} role="search" aria-label="Filter templates">
        <div className={w.inputIco}>
          <Search size={16} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates…" aria-label="Search templates" className={w.input} type="search" />
        </div>
        <div className={w.tgFilters}>
          <div className={w.tgFilter}>
            <span id="tg-cat">Category</span>
            <div className={cx(s.seg, w.tgSeg)} role="group" aria-labelledby="tg-cat">
              {categories.map((c) => (
                <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className={w.tgFilter}>
            <span id="tg-photo">Photo</span>
            <div className={cx(s.seg, w.tgSeg)} role="group" aria-labelledby="tg-photo">
              {PHOTO_OPTIONS.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={photo === id} onClick={() => setPhoto(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={w.tgFilter}>
            <span id="tg-cols">Columns</span>
            <div className={cx(s.seg, w.tgSeg)} role="group" aria-labelledby="tg-cols">
              {COLUMN_OPTIONS.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={columns === id} onClick={() => setColumns(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className={cx(s.notice, s.noticeErr)}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <ul className={w.tgGrid} aria-label="Templates">
        <li className={cx(w.tgCard, w.tgBlank)}>
          <button type="button" className={w.tgBlankBtn} disabled={busy} onClick={() => void startBlank()} aria-label="Start a blank resume">
            <span className={w.tgBlankIco} aria-hidden="true">
              <Plus size={26} />
            </span>
            <b>Blank resume</b>
            <small>Start from a guided sample layout</small>
          </button>
        </li>
        {shown.map((t) => {
          const img = cardImage(t.image);
          return (
            <li key={`${t.source}-${t.id}`} className={w.tgCard}>
              <button type="button" className={w.tgThumb} onClick={() => setPreview(t)} aria-label={`Preview the ${t.name} template`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} srcSet={img.srcSet} sizes="(max-width: 640px) 46vw, 240px" alt="" loading="lazy" decoding="async" width={300} height={400} />
                <span className={w.tgEye} aria-hidden="true">
                  <Eye size={15} /> Preview
                </span>
              </button>
              <div className={w.tgBody}>
                <div className={w.tgName}>
                  <b title={t.name}>{t.name}</b>
                  <span className={cx(s.pill, s.gr)}>{t.category}</span>
                </div>
                <small title={t.blurb}>{t.blurb}</small>
                <button type="button" className={cx(s.btn, s.primary, s.sm, w.tgUse)} disabled={busy} onClick={() => void startTemplate(t)}>
                  {busyId === t.id ? "Opening…" : "Use template"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {shown.length === 0 && filtered && (
        <div className={cx(w.panel, s.empty)}>
          <h4>No templates match these filters</h4>
          <p>Try another category or clear the filters.</p>
          <button
            type="button"
            className={s.btn}
            onClick={() => {
              setCategory("All");
              setPhoto("all");
              setColumns("all");
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {preview && (
        <div className={s.modalBack} role="presentation" onClick={() => setPreview(null)}>
          <div className={cx(s.modal, w.tgModal)} role="dialog" aria-modal="true" aria-labelledby="tg-prev-title" onClick={(e) => e.stopPropagation()}>
            <div className={w.tgModalHead}>
              <h3 id="tg-prev-title">{preview.name}</h3>
              <button type="button" className={s.icoBtn} aria-label="Close preview" onClick={() => setPreview(null)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className={w.tgModalImg}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc(preview.image)} alt={`${preview.name} template preview`} width={600} height={800} />
            </div>
            <p>
              {preview.category} · {preview.columns === "single" ? "Single column" : "Two columns"} · {preview.hasPhoto === false ? "No photo" : "Photo"}
            </p>
            <div className={s.modalActs}>
              <button type="button" className={s.btn} onClick={() => setPreview(null)}>
                Close
              </button>
              <button type="button" className={cx(s.btn, s.primary)} disabled={busy} onClick={() => void startTemplate(preview)}>
                {busyId === preview.id ? "Opening…" : "Use template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function UserTemplatesPage() {
  return (
    <UserWorkspace active="templates">
      <TemplatesView />
    </UserWorkspace>
  );
}
