"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileSearch,
  LocateFixed,
  Plus,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { jobDescriptionRejection } from "@/lib/atsEngine";
import {
  addSkillToDocument,
  getAtPath,
  hasSkill,
  issueSectionId,
  setAtPath,
  type AdvancedAts,
  type AtsBoard,
  type AtsIssue,
  type AtsRewrite,
} from "@/lib/atsAdvanced";
import { useEditorStore } from "@/store/editorStore";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import a from "@/components/ats/AtsChecker.module.css";

const cx = (...n: Array<string | false | null | undefined>) => n.filter(Boolean).join(" ");
type Tab = "issues" | "keywords" | "plain";
const JD_KEY = (id: string) => `rb_ats_jd_${id}`;
const STATUS_LABEL: Record<AtsBoard["status"], string> = { pass: "Pass", warn: "Warn", fail: "Needs fix" };
const SECTION_LABEL: Record<string, string> = {
  header: "Header", summary: "Summary", experience: "Experience", education: "Education", skills: "Skills", projects: "Projects", general: "General",
};
const LAYER_LABEL: Record<string, string> = { parseability: "Format", keywords: "Keywords", impact: "Impact", boards: "Job boards" };

function barTone(score: number, max: number) {
  const r = max ? score / max : 0;
  return r >= 0.8 ? a.barOk : r >= 0.55 ? a.barWarn : a.barBad;
}

function ScoreRing({ score }: { score: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#22c55e" : score >= 55 ? "#f59e0b" : "#f43f5e";
  return (
    <div className={a.ring} role="img" aria-label={`ATS score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="11" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className={a.ringTxt}>
        <div>
          <b>{score}</b>
          <small>/ 100</small>
        </div>
      </div>
    </div>
  );
}

/**
 * Batch 3: Advanced ATS Checker. 4-layer score (Parseability 25, Keywords 35, Impact 25, Job boards 15),
 * 5 job-board badges, optional job description, missing keywords with "+ Add to Skills", issues with
 * "Jump to section" and "Fix with AI", and the plain text an ATS parser reads.
 */
export function AtsModal() {
  const document = useEditorStore((s) => s.document);
  const setModal = useEditorStore((s) => s.setModal);
  const docId = document?.id ?? "";
  const [jd, setJd] = useState(() => {
    if (typeof window === "undefined" || !docId) return "";
    try {
      return sessionStorage.getItem(JD_KEY(docId)) ?? "";
    } catch {
      return "";
    }
  });
  const [appliedJd, setAppliedJd] = useState(jd);
  const [jdOpen, setJdOpen] = useState(!jd);
  const [result, setResult] = useState<AdvancedAts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("issues");
  const [sevFilter, setSevFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [fix, setFix] = useState<{ issue: AtsIssue; text: string; changes: string[]; source: AtsRewrite["source"] } | null>(null);
  const [fixBusy, setFixBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const seq = useRef(0);

  const close = useCallback(() => setModal(null), [setModal]);
  useEscapeClose(close);

  const showToast = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2400);
  };

  const analyze = useCallback(
    async (jobDescription: string) => {
      const doc = useEditorStore.getState().document;
      if (!doc) return;
      const run = ++seq.current;
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ result: AdvancedAts }>("/ats/analyze", {
          method: "POST",
          body: JSON.stringify({ resumeId: doc.id, resume: { content: doc.content }, jobDescription: jobDescription.trim() || undefined }),
        });
        if (run !== seq.current) return;
        setResult(res.result);
      } catch (err) {
        if (run !== seq.current) return;
        if (err instanceof ApiError && err.status === 401) setError("Sign in again to run the ATS check.");
        else if (err instanceof ApiError && err.status === 429) setError("Too many checks. Wait a minute and try again.");
        else setError(err instanceof Error ? err.message : "The ATS check failed. Please try again.");
      } finally {
        if (run === seq.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void analyze(appliedJd);
    // first run only; later runs are explicit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runJd() {
    const text = jd.trim();
    if (text) {
      const rejection = jobDescriptionRejection(text);
      if (rejection) {
        setError(rejection);
        return;
      }
    }
    try {
      if (text) sessionStorage.setItem(JD_KEY(docId), text);
      else sessionStorage.removeItem(JD_KEY(docId));
    } catch {
      /* private mode */
    }
    setAppliedJd(text);
    setTab("keywords");
    void analyze(text);
  }

  function clearJd() {
    setJd("");
    setAppliedJd("");
    try {
      sessionStorage.removeItem(JD_KEY(docId));
    } catch {
      /* ignore */
    }
    void analyze("");
  }

  function addSkill(keyword: string) {
    const doc = useEditorStore.getState().document;
    if (!doc) return;
    const next = addSkillToDocument(doc, keyword);
    if (!next) {
      showToast(`"${keyword}" is already in Skills`);
      return;
    }
    useEditorStore.getState().commitDocument(next);
    showToast(`Added "${keyword}" to Skills`);
    void analyze(appliedJd);
  }

  function jump(issue: AtsIssue) {
    const doc = useEditorStore.getState().document;
    if (!doc) return;
    const sectionId = issueSectionId(doc, issue);
    if (!sectionId) return;
    const store = useEditorStore.getState();
    store.setSelectedSectionId(sectionId);
    if (issue.fieldPath) store.setImproveFocus({ sectionId, fieldPath: issue.fieldPath, suggestionId: `ats-${issue.id}` });
    setModal(null);
    window.setTimeout(() => {
      const field = issue.fieldPath ? window.document.querySelector(`[data-field-path="${sectionId}:${issue.fieldPath}"]`) : null;
      const section = window.document.querySelector(`[data-section-id="${sectionId}"]`);
      (field ?? section)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    window.setTimeout(() => {
      if (useEditorStore.getState().improveFocus?.suggestionId === `ats-${issue.id}`) useEditorStore.getState().setImproveFocus(null);
    }, 4200);
  }

  async function fixWithAi(issue: AtsIssue) {
    const doc = useEditorStore.getState().document;
    if (!doc) return;
    const sectionId = issueSectionId(doc, issue);
    const section = doc.content.sections.find((s) => s.id === sectionId);
    const current = section && issue.fieldPath ? getAtPath(section, issue.fieldPath) : undefined;
    const text = typeof current === "string" && current.trim() ? current : issue.original ?? "";
    if (!text.trim()) return;
    setFixBusy(issue.id);
    setError(null);
    try {
      const res = await apiFetch<AtsRewrite>("/ats/rewrite", {
        method: "POST",
        body: JSON.stringify({ resumeId: doc.id, section: issue.section, text: text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000), jobDescription: appliedJd || undefined, issueTitle: issue.title }),
      });
      setFix({ issue, text: res.text, changes: res.changes, source: res.source });
    } catch (err) {
      // The server never fails on content; fall back to the precomputed suggestion if the request fails.
      if (issue.suggestedFix) setFix({ issue, text: issue.suggestedFix, changes: ["Suggested fix"], source: "rule" });
      else setError(err instanceof Error ? err.message : "Could not rewrite. Please try again.");
    } finally {
      setFixBusy(null);
    }
  }

  function applyFix() {
    if (!fix) return;
    const doc = useEditorStore.getState().document;
    if (!doc) return;
    const sectionId = issueSectionId(doc, fix.issue);
    const section = doc.content.sections.find((s) => s.id === sectionId);
    if (!section || !fix.issue.fieldPath) return;
    const next = setAtPath(section, fix.issue.fieldPath, fix.text.trim());
    if (!next) {
      setError("That text has changed in the editor. Run the check again.");
      return;
    }
    useEditorStore.getState().updateSection(section.id, () => next);
    setFix(null);
    showToast("Applied — your resume was updated");
    void analyze(appliedJd);
  }

  async function copyPlain() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.plainTextPreview);
    } catch {
      const ta = window.document.createElement("textarea");
      ta.value = result.plainTextPreview;
      window.document.body.appendChild(ta);
      ta.select();
      window.document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const issues = useMemo(() => (result?.issues ?? []).filter((i) => sevFilter === "all" || i.severity === sevFilter), [result, sevFilter]);
  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0 };
    for (const i of result?.issues ?? []) c[i.severity] += 1;
    return c;
  }, [result]);
  const kw = result?.keywords;
  const target = kw ? (kw.mode === "jd" ? "your job description" : `the ${kw.benchmark} benchmark`) : "";

  return (
    <div className={a.back} role="presentation" onClick={close}>
      <div className={a.root} role="dialog" aria-modal="true" aria-labelledby="ats-title" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <header className={a.head}>
          <span className={a.headIco} aria-hidden="true">
            <FileSearch size={19} />
          </span>
          <div className={a.headTxt}>
            <h2 id="ats-title">Advanced ATS Checker</h2>
            <p>Parseability, keywords, impact and job-board readiness — scored the way applicant tracking systems read your resume.</p>
          </div>
          <button type="button" className={a.iconBtn} onClick={() => void analyze(appliedJd)} disabled={loading} aria-label="Re-run ATS check" title="Re-run check">
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <button type="button" className={a.iconBtn} onClick={close} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={a.body}>
          {/* left: score, layers, boards */}
          <div className={a.col}>
            <section className={a.card} aria-label="ATS score">
              {result ? (
                <>
                  <div className={a.scoreRow}>
                    <ScoreRing score={result.score} />
                    <div className={a.scoreMeta}>
                      <p className={a.grade} style={{ color: "var(--ink)" }}>{result.grade}</p>
                      <p>
                        Scored against {target}. {result.stats.wordCount} words · {result.stats.bulletCount} bullets.
                      </p>
                    </div>
                  </div>
                  <div className={a.layers}>
                    {result.layers.map((l) => (
                      <div key={l.id} className={a.layer} title={l.checks.map((c) => `${c.label}: ${c.detail}`).join("\n")}>
                        <div className={a.layerTop}>
                          <span>{l.label}</span>
                          <span>
                            {l.score} / {l.max}
                          </span>
                        </div>
                        <div className={cx(a.bar, barTone(l.score, l.max))} role="progressbar" aria-label={l.label} aria-valuemin={0} aria-valuemax={l.max} aria-valuenow={l.score}>
                          <i style={{ width: `${(l.score / l.max) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={a.skel} style={{ height: 250 }} aria-busy="true" aria-label="Scoring your resume" />
              )}
            </section>

            <section className={a.card} aria-labelledby="ats-boards">
              <h3 className={a.cardTitle} id="ats-boards">Job board readiness</h3>
              {result ? (
                <ul className={a.boards} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {result.boards.map((b) => (
                    <li key={b.board} className={a.boardItem} data-board={b.board}>
                      <b>{b.label}</b>
                      <span className={cx(a.pill, a[b.status])}>
                        {b.status === "pass" ? <Check size={11} aria-hidden="true" /> : null}
                        {STATUS_LABEL[b.status]} · {b.score}
                      </span>
                      <p>{b.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={a.skel} style={{ height: 300 }} aria-hidden="true" />
              )}
            </section>
          </div>

          {/* right: JD, tabs */}
          <div className={a.col}>
            <section className={a.card} aria-label="Job description">
              <button type="button" className={a.jdToggle} onClick={() => setJdOpen((o) => !o)} aria-expanded={jdOpen} aria-controls="ats-jd">
                <Sparkles size={16} aria-hidden="true" />
                <b>Job description</b>
                <span>{appliedJd ? `Analyzing against your pasted JD (${appliedJd.split(/\s+/).length} words)` : `Optional — without one we use the ${kw?.benchmark ?? "role"} benchmark`}</span>
                {jdOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              </button>
              {jdOpen && (
                <div className={a.jdBody} id="ats-jd">
                  <textarea
                    className={a.textarea}
                    value={jd}
                    maxLength={20000}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder="Paste the full job post (requirements, nice-to-haves, tools)…"
                    aria-label="Paste job description"
                  />
                  <div className={a.row}>
                    <button type="button" className={cx(a.btn, a.primary)} onClick={runJd} disabled={loading || (!jd.trim() && !appliedJd)}>
                      <FileSearch size={15} aria-hidden="true" /> {loading ? "Analyzing…" : "Analyze against JD"}
                    </button>
                    {(jd || appliedJd) && (
                      <button type="button" className={cx(a.btn, a.ghost)} onClick={clearJd} disabled={loading}>
                        Clear JD
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {error && (
              <p role="alert" className={cx(a.msg, a.msgErr)}>
                {error}
              </p>
            )}

            <div className={a.tabs} role="tablist" aria-label="ATS results">
              {(
                [
                  ["issues", "Issues", "Issues", result?.issues.length],
                  ["keywords", "Keywords", "Keywords", kw ? `${kw.skillCoverage}%` : undefined],
                  ["plain", "Plain-text preview", "Plain text", undefined],
                ] as const
              ).map(([id, label, short, badge]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} aria-label={badge !== undefined ? `${label} ${badge}` : label} className={cx(a.tab, tab === id && a.tabOn)} onClick={() => setTab(id)}>
                  <span className={a.tabLong}>{label}</span>
                  <span className={a.tabShort} aria-hidden="true">{short}</span>
                  {badge !== undefined && <em>{badge}</em>}
                </button>
              ))}
            </div>

            {!result ? (
              <div className={a.skel} style={{ height: 360 }} aria-hidden="true" />
            ) : tab === "issues" ? (
              <section className={a.issues} role="tabpanel" aria-label="Issues">
                <div className={a.filters}>
                  {(["all", "high", "medium", "low"] as const).map((f) => (
                    <button key={f} type="button" className={cx(a.btn, a.sm, sevFilter === f && a.primary)} onClick={() => setSevFilter(f)} aria-pressed={sevFilter === f}>
                      {f === "all" ? `All ${result.issues.length}` : `${f[0].toUpperCase()}${f.slice(1)} ${counts[f]}`}
                    </button>
                  ))}
                </div>
                {issues.length === 0 && <p className={cx(a.msg, a.msgOk)}>No {sevFilter === "all" ? "" : `${sevFilter} `}issues — nice work.</p>}
                {issues.map((i) => {
                  const canJump = Boolean(document && issueSectionId(document, i));
                  return (
                    <article key={i.id} className={a.issue} data-issue={i.id}>
                      <div className={a.issueTop}>
                        <span className={cx(a.sev, a[`sev${i.severity}`])} aria-label={`${i.severity} severity`} />
                        <div className={a.issueTxt}>
                          <b>{i.title}</b>
                          <p>{i.detail}</p>
                        </div>
                      </div>
                      <div className={a.issueMeta}>
                        <span className={a.tag}>{LAYER_LABEL[i.layer]}</span>
                        <span className={a.tag}>{SECTION_LABEL[i.section]}</span>
                        <div className={a.issueActs}>
                          {canJump && (
                            <button type="button" className={cx(a.btn, a.sm)} onClick={() => jump(i)}>
                              <LocateFixed size={13} aria-hidden="true" /> Jump to section
                            </button>
                          )}
                          {i.fixable && i.fieldPath && (
                            <button type="button" className={cx(a.btn, a.sm, a.primary)} onClick={() => void fixWithAi(i)} disabled={fixBusy !== null}>
                              <Wand2 size={13} aria-hidden="true" /> {fixBusy === i.id ? "Rewriting…" : "Fix with AI"}
                            </button>
                          )}
                        </div>
                      </div>
                      {fix?.issue.id === i.id && (
                        <div className={a.fix} aria-label="Suggested rewrite">
                          <label>Before</label>
                          <p className={a.before}>{(i.original ?? "").slice(0, 400)}</p>
                          <label htmlFor={`fix-${i.id}`}>Improved {fix.source === "ai" ? "(AI)" : "(ATS rules)"}</label>
                          <textarea id={`fix-${i.id}`} className={a.textarea} value={fix.text} onChange={(e) => setFix({ ...fix, text: e.target.value })} />
                          {fix.changes.length > 0 && (
                            <ul className={a.changes}>
                              {fix.changes.map((ch) => (
                                <li key={ch}>{ch}</li>
                              ))}
                            </ul>
                          )}
                          <div className={a.row}>
                            <button type="button" className={cx(a.btn, a.primary)} onClick={applyFix} disabled={!fix.text.trim()}>
                              <Check size={15} aria-hidden="true" /> Apply
                            </button>
                            <button type="button" className={a.btn} onClick={() => setFix(null)}>
                              Discard
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            ) : tab === "keywords" && kw ? (
              <section className={a.card} role="tabpanel" aria-label="Keywords">
                <div className={a.kwHead}>
                  <b>{kw.skillCoverage}%</b>
                  <span>
                    keyword coverage vs {target} — {kw.matched.length} of {kw.total} matched{kw.aiEnhanced ? " (AI-enhanced)" : ""}.
                  </span>
                </div>
                <div className={cx(a.bar, barTone(kw.skillCoverage, 100))} style={{ marginTop: 10 }}>
                  <i style={{ width: `${kw.skillCoverage}%` }} />
                </div>
                {kw.missingRequired.length > 0 && (
                  <>
                    <h4 className={a.sub}>Missing — {kw.mode === "jd" ? "Required / Core" : "Core for this role"}</h4>
                    <div className={a.chips}>
                      {kw.missingRequired.map((k) => (
                        <MissingChip key={k} keyword={k} onAdd={addSkill} />
                      ))}
                    </div>
                  </>
                )}
                {kw.missingNiceToHave.length > 0 && (
                  <>
                    <h4 className={a.sub}>Missing — Nice-to-have / Tools</h4>
                    <div className={a.chips}>
                      {kw.missingNiceToHave.map((k) => (
                        <MissingChip key={k} keyword={k} onAdd={addSkill} />
                      ))}
                    </div>
                  </>
                )}
                {kw.matches.length > 0 && (
                  <>
                    <h4 className={a.sub}>Matched</h4>
                    <div className={a.chips}>
                      {kw.matches.map((m) => (
                        <span key={m.keyword} className={cx(a.chip, m.kind === "exact" ? a.chipOk : a.chipSyn)} title={m.kind === "exact" ? "Exact match" : `${m.kind === "synonym" ? "Synonym" : "Related"} match: ${m.matchedAs}`}>
                          {m.kind === "exact" ? <Check size={12} aria-hidden="true" /> : null}
                          {m.keyword}
                          {m.kind !== "exact" && <small>≈ {m.matchedAs}</small>}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <p className={a.note} style={{ marginTop: 14 }}>
                  Only add skills you really have. Synonyms (JS ↔ JavaScript, K8s ↔ Kubernetes) and related terms (CI/CD ≈ DevOps) count, but exact wording ranks best.
                </p>
              </section>
            ) : (
              <section className={a.card} role="tabpanel" aria-label="Plain-text preview">
                <div className={a.cardTitle}>
                  <span>What an ATS reads</span>
                  <button type="button" className={cx(a.btn, a.sm)} onClick={() => void copyPlain()}>
                    {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className={a.pre} data-testid="ats-plain">{result.plainTextPreview || "(empty)"}</pre>
              </section>
            )}
          </div>
        </div>
        {toast && (
          <div className={a.toast} role="status">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function MissingChip({ keyword, onAdd }: { keyword: string; onAdd: (k: string) => void }) {
  const document = useEditorStore((s) => s.document);
  const added = document ? hasSkill(document, keyword) : false;
  return (
    <span className={cx(a.chip, a.chipMiss, added && a.chipAdded)}>
      {keyword}
      {added ? (
        <Check size={12} aria-label="Added" />
      ) : (
        <button type="button" className={a.chipAdd} onClick={() => onAdd(keyword)} aria-label={`Add ${keyword} to Skills`}>
          <Plus size={11} aria-hidden="true" style={{ verticalAlign: -1 }} /> Add to Skills
        </button>
      )}
    </span>
  );
}
