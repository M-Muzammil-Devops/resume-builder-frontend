"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileText, Mail, Sparkles, X } from "lucide-react";
import { ApiError } from "@/lib/api";
import { LETTER_TONES, downloadLetter, generateLetter, type CoverLetter, type LetterResume, type LetterTone } from "@/lib/coverLetters";
import c from "./GenerateLetterDialog.module.css";

const cx = (...n: Array<string | false | null | undefined>) => n.filter(Boolean).join(" ");

/**
 * Batch 2: "Generate Cover Letter" dialog. Opens right after "Finalize Resume" in the editor, and from
 * the Cover Letters page. Target job, company and job description are optional; the server falls back
 * to the resume headline. A draft resume gets a one-click "Finalize & Generate".
 */
export function GenerateLetterDialog({
  resumes,
  initialResumeId,
  defaultRole = "",
  initialCompany = "",
  initialJd = "",
  justFinalized = false,
  showResult = false,
  onClose,
  onGenerated,
}: {
  resumes: LetterResume[];
  initialResumeId?: string;
  defaultRole?: string;
  /** Pre-fill from a job ("Create Cover Letter" on /user/jobs). */
  initialCompany?: string;
  initialJd?: string;
  /** Opened by "Finalize Resume": friendlier heading and a "Skip for now" button. */
  justFinalized?: boolean;
  /** Keep the dialog open after generating, with download and open buttons (editor). */
  showResult?: boolean;
  onClose: () => void;
  onGenerated?: (letter: CoverLetter) => void;
}) {
  const [resumeId, setResumeId] = useState(initialResumeId || resumes.find((r) => r.isComplete)?.id || resumes[0]?.id || "");
  const [role, setRole] = useState(defaultRole);
  const [company, setCompany] = useState(initialCompany);
  const [jd, setJd] = useState(initialJd);
  const [tone, setTone] = useState<LetterTone>("professional");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CoverLetter | null>(null);
  const [dl, setDl] = useState<"pdf" | "docx" | null>(null);
  const first = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const resume = resumes.find((r) => r.id === resumeId) ?? null;
  const draft = Boolean(resume && !resume.isComplete);

  useEffect(() => {
    first.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function submit() {
    if (!resumeId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await generateLetter({
        resumeId,
        tone,
        targetRole: role.trim() || undefined,
        targetCompany: company.trim() || undefined,
        jobDescription: jd.trim() || undefined,
        finalize: draft || undefined,
      });
      onGenerated?.(res.coverLetter);
      if (showResult) setDone(res.coverLetter);
      else onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not write the cover letter. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function download(format: "pdf" | "docx") {
    if (!done) return;
    setDl(format);
    setError(null);
    try {
      await downloadLetter(done.id, format, done.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed. Please try again.");
    } finally {
      setDl(null);
    }
  }

  return (
    <div className={c.back} role="presentation" onClick={() => !busy && onClose()}>
      <div className={c.dialog} role="dialog" aria-modal="true" aria-labelledby="gl-title" onClick={(e) => e.stopPropagation()}>
        <div className={c.head}>
          <span className={c.ico} aria-hidden="true">
            {done ? <CheckCircle2 size={20} /> : <Mail size={20} />}
          </span>
          <div className={c.headTxt}>
            <h2 id="gl-title">{done ? "Your cover letter is ready" : justFinalized ? "Resume finalized — create your cover letter?" : "Generate Cover Letter"}</h2>
            <p>
              {done
                ? "Edit it any time in Cover Letters, or download it now."
                : "We write it from your resume: your name, recent roles, top results and skills. All fields are optional."}
            </p>
          </div>
          <button type="button" className={c.x} aria-label="Close" disabled={busy} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {done ? (
          <div className={c.body}>
            <div className={c.preview} aria-label="Cover letter preview">
              <b>{done.title}</b>
              <p>{done.body.slice(0, 420)}{done.body.length > 420 ? "…" : ""}</p>
            </div>
            {error && <p role="alert" className={c.err}>{error}</p>}
            <div className={c.acts}>
              <button type="button" className={c.btn} disabled={dl !== null} onClick={() => void download("docx")}>
                <FileText size={15} aria-hidden="true" /> {dl === "docx" ? "Preparing…" : "Download DOCX"}
              </button>
              <button type="button" className={c.btn} disabled={dl !== null} onClick={() => void download("pdf")}>
                <Download size={15} aria-hidden="true" /> {dl === "pdf" ? "Preparing…" : "Download PDF"}
              </button>
              <Link href={`/user/cover-letters?id=${encodeURIComponent(done.id)}`} className={cx(c.btn, c.primary)}>
                Open cover letter
              </Link>
            </div>
          </div>
        ) : (
          <form
            className={c.body}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {resumes.length > 1 || !initialResumeId ? (
              <label className={c.field}>
                Resume
                <select
                  ref={(el) => {
                    first.current = el;
                  }}
                  className={c.input}
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  disabled={busy}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                      {r.isComplete ? " · Finalized" : " · Draft"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {draft && (
              <p className={c.note} role="note">
                This resume is still a draft. Cover letters are written from a finalized resume — we&apos;ll finalize it for you.
              </p>
            )}
            <div className={c.grid}>
              <label className={c.field}>
                <span className={c.lbl}>Target job title <small>optional</small></span>
                <input
                  ref={(el) => {
                    if (!first.current) first.current = el;
                  }}
                  className={c.input}
                  value={role}
                  maxLength={120}
                  placeholder="e.g. Senior Product Manager"
                  onChange={(e) => setRole(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className={c.field}>
                <span className={c.lbl}>Company name <small>optional</small></span>
                <input className={c.input} value={company} maxLength={120} placeholder="e.g. Canva" onChange={(e) => setCompany(e.target.value)} disabled={busy} />
              </label>
            </div>
            <label className={c.field}>
              <span className={c.lbl}>Job description <small>optional — paste it to match the letter to the job</small></span>
              <textarea className={cx(c.input, c.area)} value={jd} maxLength={8000} rows={4} placeholder="Paste the job post here…" onChange={(e) => setJd(e.target.value)} disabled={busy} />
            </label>
            <fieldset className={c.tones}>
              <legend>Tone</legend>
              <div className={c.toneRow} role="radiogroup" aria-label="Tone">
                {LETTER_TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={tone === t.id}
                    className={cx(c.tone, tone === t.id && c.toneOn)}
                    onClick={() => setTone(t.id)}
                    disabled={busy}
                  >
                    <b>{t.label}</b>
                    <small>{t.hint}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            {error && <p role="alert" className={c.err}>{error}</p>}
            <div className={c.acts}>
              <button type="button" className={c.btn} onClick={onClose} disabled={busy}>
                {justFinalized ? "Skip for now" : "Cancel"}
              </button>
              <button type="submit" className={cx(c.btn, c.primary)} disabled={busy || !resumeId}>
                <Sparkles size={15} aria-hidden="true" />
                {busy ? "Writing your letter…" : draft ? "Finalize & Generate" : "Generate Cover Letter"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
