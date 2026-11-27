"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, Mail, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { JD_STORAGE_KEY } from "@/lib/jobsFeed";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { GenerateLetterDialog } from "@/components/coverLetters/GenerateLetterDialog";
import { cx, timeAgo } from "@/components/dashboard/format";
import {
  LETTER_TONES,
  downloadLetter,
  regenerateLetter,
  roleFromHeadline,
  type CoverLetter,
  type LetterResume,
  type LetterTone,
} from "@/lib/coverLetters";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";
import c from "@/components/coverLetters/CoverLetters.module.css";

type ResumeRow = LetterResume & { headline: string };
type ResumeDoc = { id: string; title: string; isComplete: boolean; updatedAt?: string; content?: { sections?: Array<{ type: string; title?: string }> } };

const toneLabel = (t: string | undefined) => LETTER_TONES.find((x) => x.id === t)?.label ?? "Professional";

function setQuery(id: string | null) {
  const url = id ? `/user/cover-letters?id=${encodeURIComponent(id)}` : "/user/cover-letters";
  window.history.replaceState(window.history.state, "", url);
}

/** Batch 2: Cover Letters workspace — list, generate from a finalized resume, edit, regenerate, download PDF/DOCX. */
function CoverLettersView() {
  const [letters, setLetters] = useState<CoverLetter[] | null>(null);
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [tone, setTone] = useState<LetterTone>("professional");
  const [body, setBody] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "regen" | "pdf" | "docx" | "txt" | "delete">(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "info"; text: string } | null>(null);
  const [dialog, setDialog] = useState<null | { resumeId?: string; role?: string; company?: string; jd?: string }>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fill = useCallback((l: CoverLetter) => {
    setLetter(l);
    setTitle(l.title);
    setCompany(l.targetCompany || "");
    setRole(l.targetRole || "");
    setTone((l.tone as LetterTone) || "professional");
    setBody(l.body);
    setDirty(false);
  }, []);

  const upsert = useCallback((l: CoverLetter) => {
    setLetters((prev) => [l, ...(prev ?? []).filter((x) => x.id !== l.id)]);
  }, []);

  // First load: letters + resumes, then honour ?id= and ?new=1.
  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<{ coverLetters: CoverLetter[] }>("/cover-letters", { cache: "no-store" }),
      apiFetch<{ resumes: ResumeDoc[] }>("/resumes", { cache: "no-store" }).catch(() => ({ resumes: [] as ResumeDoc[] })),
    ])
      .then(([l, r]) => {
        if (!alive) return;
        setLetters(l.coverLetters);
        setResumes(
          r.resumes.map((x) => ({
            id: x.id,
            title: x.title || "Untitled resume",
            isComplete: Boolean(x.isComplete),
            updatedAt: x.updatedAt,
            headline: roleFromHeadline(x.content?.sections?.find((sec) => sec.type === "header")?.title),
          }))
        );
        const q = new URLSearchParams(window.location.search);
        const want = q.get("id");
        if (q.get("new") === "1") {
          // "Create Cover Letter" from a job: title / company in the URL, the long JD in sessionStorage.
          let jd = "";
          const jobId = q.get("job");
          if (jobId) {
            try {
              const raw = sessionStorage.getItem(JD_STORAGE_KEY);
              const saved = raw ? (JSON.parse(raw) as { jobId?: string; text?: string }) : null;
              if (saved?.jobId === jobId && typeof saved.text === "string") jd = saved.text.slice(0, 12000);
            } catch {
              jd = "";
            }
          }
          setDialog({
            resumeId: q.get("resume") || undefined,
            role: (q.get("title") || "").slice(0, 120) || undefined,
            company: (q.get("company") || "").slice(0, 120) || undefined,
            jd: jd || undefined,
          });
          setQuery(null);
        }
        const first = want && l.coverLetters.some((x) => x.id === want) ? want : l.coverLetters[0]?.id ?? null;
        if (want && !l.coverLetters.some((x) => x.id === want)) setMsg({ tone: "err", text: "That cover letter was not found. It may have been deleted." });
        setSelectedId(first);
      })
      .catch((err) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 401) return; // the shell sends the visitor to /login
        setLoadError("Could not load your cover letters. Please refresh the page.");
      });
    return () => {
      alive = false;
    };
  }, []);

  // Load the selected letter (fresh copy with its resume status).
  useEffect(() => {
    if (!selectedId) {
      setLetter(null);
      return;
    }
    let alive = true;
    apiFetch<{ coverLetter: CoverLetter }>(`/cover-letters/${encodeURIComponent(selectedId)}`, { cache: "no-store" })
      .then((res) => alive && fill(res.coverLetter))
      .catch(() => alive && setMsg({ tone: "err", text: "Could not open this cover letter." }));
    return () => {
      alive = false;
    };
  }, [selectedId, fill]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  function select(id: string) {
    if (id === selectedId) return;
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    setMsg(null);
    setSelectedId(id);
    setQuery(id);
  }

  function edit<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setDirty(true);
    };
  }

  async function save() {
    if (!letter) return;
    setBusy("save");
    setMsg(null);
    try {
      const res = await apiFetch<{ coverLetter: CoverLetter }>(`/cover-letters/${letter.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: title.trim() || "Untitled Cover Letter", body, tone, targetRole: role.trim() || null, targetCompany: company.trim() || null }),
      });
      const merged = { ...letter, ...res.coverLetter, resume: letter.resume };
      fill(merged);
      upsert(merged);
      setMsg({ tone: "ok", text: "Cover letter saved." });
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof ApiError ? err.message : "Could not save. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    if (!letter) return;
    if (!letter.resumeId) {
      setDialog({});
      return;
    }
    if (dirty && !window.confirm("Regenerating replaces the letter text with a new version. Continue?")) return;
    setBusy("regen");
    setMsg(null);
    try {
      const res = await regenerateLetter(letter.id, { tone, targetRole: role.trim() || null, targetCompany: company.trim() || null });
      const keepTitle = title.trim() && title.trim() !== res.coverLetter.title ? title.trim() : null;
      let next: CoverLetter = { ...res.coverLetter, resume: res.coverLetter.resume ?? letter.resume };
      if (keepTitle && dirty) {
        const saved = await apiFetch<{ coverLetter: CoverLetter }>(`/cover-letters/${letter.id}`, { method: "PATCH", body: JSON.stringify({ title: keepTitle }) });
        next = { ...next, ...saved.coverLetter, resume: next.resume };
      }
      fill(next);
      upsert(next);
      setMsg({ tone: "ok", text: `New ${toneLabel(next.tone).toLowerCase()} version written from your latest resume.` });
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof ApiError ? err.message : "Could not regenerate. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function download(format: "pdf" | "docx" | "txt") {
    if (!letter) return;
    if (dirty) await save();
    setBusy(format);
    try {
      await downloadLetter(letter.id, format, title || letter.title);
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof Error ? err.message : "Download failed. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!letter) return;
    if (!window.confirm(`Delete "${letter.title}"? This cannot be undone.`)) return;
    setBusy("delete");
    try {
      await apiFetch(`/cover-letters/${letter.id}`, { method: "DELETE" });
      const rest = (letters ?? []).filter((x) => x.id !== letter.id);
      setLetters(rest);
      setDirty(false);
      const next = rest[0]?.id ?? null;
      setSelectedId(next);
      setQuery(next);
      setMsg({ tone: "ok", text: "Cover letter deleted." });
    } catch {
      setMsg({ tone: "err", text: "Could not delete. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  const finalized = useMemo(() => resumes.filter((r) => r.isComplete), [resumes]);
  const defaultRole = (id?: string) => resumes.find((r) => r.id === id)?.headline || (id ? "" : finalized[0]?.headline || "");
  const linked = letter?.resume ?? null;
  const stale = Boolean(letter?.resumeUpdatedAfter && letter.resumeId);

  return (
    <div className={w.page}>
      <WorkspaceHeader
        icon={<Mail size={22} />}
        title="Cover Letters"
        sub="Generated from your finalized resume. Edit, switch tone, regenerate and download as PDF or Word."
        actions={
          <button type="button" className={cx(s.btn, s.primary)} onClick={() => setDialog({})} disabled={!resumes.length}>
            <Sparkles size={15} aria-hidden="true" /> Generate from Finalized Resume
          </button>
        }
      />

      {loadError && <p role="alert" className={cx(w.msg, w.msgErr)}>{loadError}</p>}
      {letters && resumes.length > 0 && finalized.length === 0 && (
        <div className={c.notice} role="note">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <b>Finalize a resume to auto-generate cover letters.</b>
            <span>Your resumes are still drafts. We&apos;ll finalize the one you pick and write the letter in one click.</span>
          </div>
          <button type="button" className={cx(s.btn, s.sm, s.primary)} onClick={() => setDialog({ resumeId: resumes[0].id })}>
            Finalize &amp; Generate
          </button>
        </div>
      )}
      {letters && resumes.length === 0 && (
        <div className={c.notice} role="note">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <b>Create a resume first.</b>
            <span>Cover letters are written from your resume details.</span>
          </div>
          <Link href="/user/dashboard#resumes" className={cx(s.btn, s.sm, s.primary)}>Go to resumes</Link>
        </div>
      )}

      {letters === null && !loadError ? (
        <div className={w.jobs}>
          <div className={s.skel} style={{ height: 320 }} aria-busy="true" aria-label="Loading cover letters" />
          <div className={s.skel} style={{ height: 520 }} aria-hidden="true" />
        </div>
      ) : letters && letters.length === 0 ? (
        <section className={cx(w.panel, c.empty)} aria-label="No cover letters">
          <span className={c.emptyIco} aria-hidden="true"><Mail size={30} /></span>
          <h2>No cover letters yet</h2>
          <p className={w.muted}>Pick a resume and we&apos;ll write a tailored letter in seconds. You can edit it and download PDF or DOCX.</p>
          <button type="button" className={cx(s.btn, s.primary)} onClick={() => setDialog({})} disabled={!resumes.length}>
            <Sparkles size={15} aria-hidden="true" /> Generate from Finalized Resume
          </button>
        </section>
      ) : letters ? (
        <div className={w.jobs}>
          <section className={cx(w.panel, w.jobList, c.list)} aria-label="Your cover letters">
            <ul className={c.ul}>
              {letters.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className={cx(w.jobItem, l.id === selectedId && w.jobOn)}
                    aria-current={l.id === selectedId ? "true" : undefined}
                    onClick={() => select(l.id)}
                  >
                    <b>{l.title}</b>
                    <span>{l.targetCompany ? `${l.targetRole || "Application"} · ${l.targetCompany}` : l.targetRole || "General application"}</span>
                    <div className={w.tags}>
                      {l.resume ? (
                        <span className={cx(w.tag, w.tagBlue)} title={`Linked resume: ${l.resume.title}`}>
                          <FileText size={11} aria-hidden="true" /> {l.resume.title}
                        </span>
                      ) : (
                        <span className={w.tag}>No resume</span>
                      )}
                      <span className={w.tag}>{toneLabel(l.tone)}</span>
                      {l.resumeUpdatedAfter && <span className={cx(w.tag, c.tagWarn)}>Resume updated</span>}
                      <small className={c.when}>Updated {timeAgo(l.updatedAt)}</small>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {letter ? (
            <section className={cx(w.panel, w.stack, c.editor)} aria-label="Cover letter editor">
              {stale && (
                <div className={c.stale} role="status">
                  <RefreshCw size={16} aria-hidden="true" />
                  <span>Your resume was updated — regenerate cover letter?</span>
                  <button type="button" className={cx(s.btn, s.sm, s.primary)} onClick={() => void regenerate()} disabled={busy !== null}>
                    {busy === "regen" ? "Regenerating…" : "Regenerate"}
                  </button>
                </div>
              )}
              {linked && !linked.isComplete && (
                <div className={c.notice} role="note">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div>
                    <b>The linked resume is back in Draft.</b>
                    <span>Finalize it to keep this letter in sync with your latest resume.</span>
                  </div>
                  <button type="button" className={cx(s.btn, s.sm, s.primary)} onClick={() => setDialog({ resumeId: linked.id })}>
                    Finalize &amp; Generate
                  </button>
                </div>
              )}
              <div className={c.meta}>
                {linked ? (
                  <Link href={`/user/editor/${linked.id}`} className={cx(w.tag, w.tagBlue)} title="Open the linked resume">
                    <FileText size={11} aria-hidden="true" /> {linked.title}
                    {linked.isComplete && <CheckCircle2 size={11} aria-label="Finalized" />}
                  </Link>
                ) : (
                  <span className={w.tag}>Not linked to a resume</span>
                )}
                {letter.generatedAt && (
                  <span className={w.muted}>
                    {letter.source === "ai" ? "AI-written" : "Auto-written"} {timeAgo(letter.generatedAt)}
                  </span>
                )}
                <span className={cx(w.muted, c.save)} role="status">{dirty ? "Unsaved changes" : "All changes saved"}</span>
              </div>

              <label className={w.field}>
                Title / subject
                <input className={w.input} value={title} maxLength={120} onChange={(e) => edit(setTitle)(e.target.value)} />
              </label>
              <div className={w.grid2}>
                <label className={w.field}>
                  <span className={c.lbl}>Company <small>recipient</small></span>
                  <input className={w.input} value={company} maxLength={120} placeholder="e.g. Canva" onChange={(e) => edit(setCompany)(e.target.value)} />
                </label>
                <label className={w.field}>
                  Target job title
                  <input className={w.input} value={role} maxLength={120} placeholder="From your resume headline" onChange={(e) => edit(setRole)(e.target.value)} />
                </label>
              </div>
              <div className={w.field}>
                <span id="cl-tone" className={c.lbl}>Tone <small>switch tone, then Regenerate</small></span>
                <div className={c.seg} role="radiogroup" aria-labelledby="cl-tone">
                  {LETTER_TONES.map((t) => (
                    <button key={t.id} type="button" role="radio" aria-checked={tone === t.id} className={cx(c.segBtn, tone === t.id && c.segOn)} onClick={() => edit(setTone)(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className={w.field}>
                Letter
                <textarea className={w.textarea} value={body} maxLength={10000} rows={18} placeholder="Dear Hiring Manager," onChange={(e) => edit(setBody)(e.target.value)} />
              </label>

              {msg && (
                <p role={msg.tone === "err" ? "alert" : "status"} className={cx(w.msg, msg.tone === "ok" ? w.msgOk : msg.tone === "err" ? w.msgErr : w.msgInfo)}>
                  {msg.text}
                </p>
              )}

              <div className={c.acts}>
                <div className={c.actsMain}>
                  <button type="button" className={cx(s.btn, s.primary, c.big)} onClick={() => void download("pdf")} disabled={busy !== null}>
                    <Download size={16} aria-hidden="true" /> {busy === "pdf" ? "Preparing PDF…" : "Download PDF"}
                  </button>
                  <button type="button" className={cx(s.btn, s.primary, c.big)} onClick={() => void download("docx")} disabled={busy !== null}>
                    <FileText size={16} aria-hidden="true" /> {busy === "docx" ? "Preparing DOCX…" : "Download DOCX"}
                  </button>
                </div>
                <div className={c.actsSub}>
                  <button type="button" className={s.btn} onClick={() => void save()} disabled={busy !== null || !dirty}>
                    <Save size={15} aria-hidden="true" /> {busy === "save" ? "Saving…" : "Save"}
                  </button>
                  <button type="button" className={s.btn} onClick={() => void regenerate()} disabled={busy !== null}>
                    <RefreshCw size={15} aria-hidden="true" /> {busy === "regen" ? "Regenerating…" : "Regenerate"}
                  </button>
                  <button type="button" className={cx(s.btn, s.sm)} onClick={() => void download("txt")} disabled={busy !== null}>
                    TXT
                  </button>
                  <button type="button" className={cx(s.btn, s.sm, s.danger)} onClick={() => void remove()} disabled={busy !== null} aria-label="Delete cover letter">
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <div className={s.skel} style={{ height: 520 }} aria-busy="true" aria-label="Loading cover letter" />
          )}
        </div>
      ) : null}

      {dialog && (
        <GenerateLetterDialog
          resumes={resumes}
          initialResumeId={dialog.resumeId}
          defaultRole={dialog.role || defaultRole(dialog.resumeId)}
          initialCompany={dialog.company}
          initialJd={dialog.jd}
          onClose={() => setDialog(null)}
          onGenerated={(generated) => {
            const r = resumes.find((x) => x.id === generated.resumeId);
            const l: CoverLetter = {
              ...generated,
              resume: generated.resume ?? (r ? { id: r.id, title: r.title, isComplete: true, updatedAt: r.updatedAt } : null),
            };
            upsert(l);
            setResumes((prev) => prev.map((r) => (r.id === l.resumeId ? { ...r, isComplete: true } : r)));
            setDirty(false);
            setSelectedId(l.id);
            setQuery(l.id);
            fill(l);
            setMsg({ tone: "ok", text: "Cover letter ready. Review it, then download PDF or DOCX." });
          }}
        />
      )}
    </div>
  );
}

export default function CoverLettersPage() {
  return (
    <UserWorkspace active="cover-letters">
      <CoverLettersView />
    </UserWorkspace>
  );
}
