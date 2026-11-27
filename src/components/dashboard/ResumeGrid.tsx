"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, MoreHorizontal, PenLine, Plus, Search, Trash2, Type } from "lucide-react";
import type { DashResume, SortKey } from "./types";
import { cx, templateName, templateOf, timeAgo } from "./format";
import s from "./Dashboard.module.css";

function scoreTone(score: number) {
  if (score >= 80) return s.g;
  if (score >= 50) return s.a;
  return s.r;
}

function ResumeCard({
  resume,
  busy,
  pdfBusy,
  onEdit,
  onPdf,
  onDuplicate,
  onRename,
  onDelete,
}: {
  resume: DashResume;
  busy: boolean;
  pdfBusy: boolean;
  onEdit: () => void;
  onPdf: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tpl = templateOf(resume.templateId);

  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const onPointer = (e: PointerEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const act = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const missing = resume.missing.slice(0, 3).join(", ");

  return (
    <article className={cx(s.card, s.rc)} aria-label={resume.title}>
      <button type="button" className={s.rcTh} onClick={onEdit} aria-label={`Open ${resume.title} in the editor`} style={{ border: 0, cursor: "pointer", width: "100%" }}>
        {tpl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tpl.image} alt="" loading="lazy" decoding="async" width={300} height={400} />
        ) : (
          <span className={s.mini} style={{ ["--thumb" as string]: resume.accentColor || "#3b82f6" }} aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i />
          </span>
        )}
        <span
          className={cx(s.pill, scoreTone(resume.score), s.badgeL)}
          title={missing ? `Readiness score from the sections you filled. Still missing: ${missing}` : "Readiness score: every key section is filled"}
        >
          ATS {resume.score}
        </span>
        <span className={cx(s.pill, resume.status === "ready" ? s.bl : s.gr, s.badgeR)}>{resume.status === "ready" ? "READY" : "DRAFT"}</span>
      </button>
      <div className={s.rcBd}>
        <h4 title={resume.title}>{resume.title}</h4>
        <div className={s.meta}>
          {templateName(resume.templateId)} · edited {timeAgo(resume.updatedAt)}
        </div>
        <div className={s.rcActs} ref={ref}>
          <button type="button" className={cx(s.btn, s.sm, s.primary)} onClick={onEdit} disabled={busy}>
            <PenLine size={14} aria-hidden="true" />
            Edit
          </button>
          <button type="button" className={cx(s.btn, s.sm)} onClick={onPdf} disabled={busy || pdfBusy} aria-label={`Download ${resume.title} as PDF`}>
            <Download size={14} aria-hidden="true" />
            {pdfBusy ? "…" : "PDF"}
          </button>
          <button
            ref={btnRef}
            type="button"
            className={cx(s.btn, s.sm, s.ic)}
            aria-label={`More actions for ${resume.title}`}
            aria-haspopup="menu"
            aria-expanded={open}
            disabled={busy}
            onClick={() => setOpen((v) => !v)}
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
          {open && (
            <div className={s.menu} role="menu" aria-label={`Actions for ${resume.title}`}>
              <button type="button" role="menuitem" onClick={act(onDuplicate)}>
                <Copy size={15} aria-hidden="true" /> Duplicate
              </button>
              <button type="button" role="menuitem" onClick={act(onRename)}>
                <Type size={15} aria-hidden="true" /> Rename
              </button>
              <button type="button" role="menuitem" className={s.danger} onClick={act(onDelete)}>
                <Trash2 size={15} aria-hidden="true" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ResumeGrid({
  resumes,
  loading,
  busyId,
  pdfId,
  creating,
  onEdit,
  onPdf,
  onDuplicate,
  onRename,
  onDelete,
  onCreate,
}: {
  resumes: DashResume[];
  loading: boolean;
  busyId: string | null;
  pdfId: string | null;
  creating: boolean;
  onEdit: (r: DashResume) => void;
  onPdf: (r: DashResume) => void;
  onDuplicate: (r: DashResume) => void;
  onRename: (r: DashResume) => void;
  onDelete: (r: DashResume) => void;
  onCreate: () => void;
}) {
  const [sort, setSort] = useState<SortKey>("recent");
  const [filter, setFilter] = useState("");
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = resumes.filter((r) => !q || r.title.toLowerCase().includes(q) || templateName(r.templateId).toLowerCase().includes(q));
    return [...rows].sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title) : sort === "score" ? b.score - a.score || b.updatedAt.localeCompare(a.updatedAt) : b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [resumes, sort, filter]);

  return (
    <section id="resumes" className={s.sec} aria-labelledby="dash-resumes">
      <div className={s.secTtl}>
        <h2 id="dash-resumes">
          My resumes <small>{resumes.length} document{resumes.length === 1 ? "" : "s"}</small>
        </h2>
        <div className={s.tools}>
          <label className={s.filter}>
            <Search size={14} aria-hidden="true" />
            <span className={s.srOnly}>Filter resumes</span>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter resumes" type="text" />
          </label>
          <div className={s.seg} role="group" aria-label="Sort resumes">
            {(
              [
                ["recent", "Recent"],
                ["name", "Name"],
                ["score", "ATS score"],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={sort === key} onClick={() => setSort(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {loading ? (
        <div className={s.rg} aria-busy="true" aria-label="Loading resumes">
          {[0, 1, 2].map((i) => (
            <div key={i} className={s.skel} />
          ))}
        </div>
      ) : (
        <div className={s.rg}>
          {visible.map((r) => (
            <ResumeCard
              key={r.id}
              resume={r}
              busy={busyId === r.id}
              pdfBusy={pdfId === r.id}
              onEdit={() => onEdit(r)}
              onPdf={() => onPdf(r)}
              onDuplicate={() => onDuplicate(r)}
              onRename={() => onRename(r)}
              onDelete={() => onDelete(r)}
            />
          ))}
          {filter.trim() && visible.length === 0 ? (
            <div className={cx(s.card, s.pad, s.empty)} role="status" style={{ gridColumn: "1 / -1" }}>
              <h4>No resume matches “{filter.trim()}”</h4>
              <p>Try another name, or clear the filter.</p>
              <button type="button" className={cx(s.btn, s.sm)} onClick={() => setFilter("")}>
                Clear filter
              </button>
            </div>
          ) : (
            <button type="button" className={s.newc} onClick={onCreate} disabled={creating}>
              <div>
                <div className={s.big}>
                  <Plus size={24} aria-hidden="true" />
                </div>
                <h4>{resumes.length ? "Create new resume" : "Create your first resume"}</h4>
                <p>Pick a template or start blank</p>
                <span className={cx(s.btn, s.sm)}>{creating ? "Creating…" : "Start now"}</span>
              </div>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
