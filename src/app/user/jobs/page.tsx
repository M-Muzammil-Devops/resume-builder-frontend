"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileText,
  MapPin,
  RefreshCw,
  Search,
  SquareKanban,
  X,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  JD_STORAGE_KEY,
  STATUS_LABEL,
  buildFeedQuery,
  coverLetterHref,
  hostOf,
  matchTone,
  safeApplyUrl,
  statusOf,
  timeAgo,
  type FeedJob,
  type FeedJobDetail,
  type FeedResponse,
} from "@/lib/jobsFeed";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { cx } from "@/components/dashboard/format";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";
import j from "@/components/jobs/Jobs.module.css";

type ResumeOption = { id: string; title: string; isComplete: boolean; updatedAt?: string };
const RESUME_KEY = "rb_jobs_resume";
const PAGE_SIZE = 18;

function MatchBadge({ score, big = false }: { score: number; big?: boolean }) {
  const tone = matchTone(score);
  return (
    <span
      className={cx(j.match, big && j.matchBig, j[tone])}
      style={{ ["--p" as string]: String(score) }}
      role="img"
      aria-label={`ATS match ${score}%`}
      title={`ATS match ${score}%`}
    >
      <span>
        <span>
          {score}%<small>MATCH</small>
        </span>
      </span>
    </span>
  );
}

function SkillChips({ matched, missing, max = 3 }: { matched: string[]; missing: string[]; max?: number }) {
  if (!matched.length && !missing.length) return null;
  return (
    <div className={j.skills}>
      {matched.slice(0, max).map((k) => (
        <span key={`h-${k}`} className={cx(j.skill, j.skillHit)}>
          <CheckCircle2 size={11} aria-hidden="true" />
          {k}
        </span>
      ))}
      {missing.slice(0, max).map((k) => (
        <span key={`m-${k}`} className={cx(j.skill, j.skillMiss)} title="Missing from your resume">
          + {k}
        </span>
      ))}
    </div>
  );
}

function JobCard({ job, tracked, onOpen }: { job: FeedJob; tracked?: { stage: string }; onOpen: (job: FeedJob) => void }) {
  return (
    <li className={j.card} data-job={job.id}>
      <button type="button" className={j.cardOpen} onClick={() => onOpen(job)} aria-label={`View ${job.title} at ${job.company}`} />
      <div className={j.cardTop}>
        <div className={j.cardTitle}>
          <h3>{job.title}</h3>
          <p>{job.company}</p>
        </div>
        {job.match && <MatchBadge score={job.match.score} />}
      </div>
      <div className={j.badges}>
        {job.remote && <span className={cx(j.badge, j.bRemote)}>Remote</span>}
        {job.location && job.location !== "Remote" && (
          <span className={j.badge}>
            <MapPin size={11} aria-hidden="true" />
            {job.location}
          </span>
        )}
        {job.salary && <span className={cx(j.badge, j.bSalary)}>{job.salary}</span>}
        {tracked && <span className={cx(j.badge, j.bTracked)}>{STATUS_LABEL[statusOf(tracked.stage)]}</span>}
      </div>
      {job.snippet && <p className={j.snippet}>{job.snippet}</p>}
      {job.match && <SkillChips matched={job.match.matched} missing={job.match.missing} />}
      <div className={j.cardFoot}>
        <span className={cx(j.badge, j.bSource)}>{job.sourceLabel}</span>
        <span>{timeAgo(job.postedAt) || "Recently"}</span>
      </div>
    </li>
  );
}

function JobDrawer({
  jobId,
  preview,
  resumeId,
  resumeTitle,
  tracked,
  onClose,
  onTracked,
}: {
  jobId: string;
  preview: FeedJob;
  resumeId: string | null;
  resumeTitle: string | null;
  tracked?: { id: string; stage: string };
  onClose: () => void;
  onTracked: (jobId: string, row: { id: string; stage: string }, message: string) => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<FeedJobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "apply" | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError(null);
    const q = resumeId ? `?resumeId=${encodeURIComponent(resumeId)}` : "";
    apiFetch<{ job: FeedJobDetail }>(`/jobs/feed/${encodeURIComponent(jobId)}${q}`, { cache: "no-store" })
      .then((r) => alive && setDetail(r.job))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Could not load this job"));
    return () => {
      alive = false;
    };
  }, [jobId, resumeId]);

  const job = detail ?? { ...preview, description: preview.snippet };
  const url = safeApplyUrl(job.applyUrl);
  const match = job.match;

  async function save() {
    setBusy("save");
    setError(null);
    try {
      const r = await apiFetch<{ application: { id: string; stage: string } }>("/tracker", {
        method: "POST",
        body: JSON.stringify({ jobId, stage: tracked ? undefined : "saved", ...(resumeId ? { resumeId } : {}) }),
      });
      onTracked(jobId, { id: r.application.id, stage: r.application.stage }, tracked ? "Tracker updated" : "Saved to Tracker");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this job");
    } finally {
      setBusy(null);
    }
  }

  async function applyAndTrack() {
    if (!url) return;
    // Open the real posting first (inside the click, so pop-up blockers allow it), then track it.
    window.open(url, "_blank", "noopener,noreferrer");
    setBusy("apply");
    setError(null);
    try {
      const r = await apiFetch<{ application: { id: string; stage: string } }>("/tracker/apply", {
        method: "POST",
        body: JSON.stringify({ jobId, ...(resumeId ? { resumeId } : {}) }),
      });
      onTracked(jobId, { id: r.application.id, stage: r.application.stage }, "Opened the job post and marked it Applied in your Tracker");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The job opened, but it could not be added to your Tracker");
    } finally {
      setBusy(null);
    }
  }

  function coverLetter() {
    try {
      if (detail?.description) sessionStorage.setItem(JD_STORAGE_KEY, JSON.stringify({ jobId, text: detail.description.slice(0, 12000) }));
    } catch {
      /* storage full / blocked: the generator still opens with title + company */
    }
    router.push(coverLetterHref({ id: jobId, title: job.title, company: job.company }, resumeId));
  }

  return (
    <div className={j.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={j.drawer} role="dialog" aria-modal="true" aria-labelledby="job-drawer-title">
        <div className={j.dHead}>
          <div className={j.dHeadTxt}>
            <div>
              <h2 id="job-drawer-title">{job.title}</h2>
              <p>{job.company}</p>
            </div>
            <div className={j.badges}>
              {job.remote && <span className={cx(j.badge, j.bRemote)}>Remote</span>}
              {job.location && job.location !== "Remote" && (
                <span className={j.badge}>
                  <MapPin size={11} aria-hidden="true" />
                  {job.location}
                </span>
              )}
              {job.salary && <span className={cx(j.badge, j.bSalary)}>{job.salary}</span>}
              <span className={cx(j.badge, j.bSource)}>via {job.sourceLabel}</span>
              {job.postedAt && <span className={j.badge}>Posted {timeAgo(job.postedAt)}</span>}
              {tracked && <span className={cx(j.badge, j.bTracked)}>In Tracker · {STATUS_LABEL[statusOf(tracked.stage)]}</span>}
            </div>
          </div>
          <button ref={closeRef} type="button" className={j.dClose} onClick={onClose} aria-label="Close job details">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={j.dBody}>
          {error && (
            <p role="alert" className={cx(w.msg, w.msgErr)}>
              {error}
            </p>
          )}
          {match ? (
            <div className={j.dMatch}>
              <MatchBadge score={match.score} big />
              <div>
                <b>ATS match against “{resumeTitle ?? "your resume"}”</b>
                <p>
                  {match.basis === "keywords"
                    ? `${match.matched.length} of ${match.matched.length + match.missing.length} skills in this post are on your resume.`
                    : "This post lists few skills, so the match is based on the job title."}
                </p>
              </div>
            </div>
          ) : (
            <p className={cx(w.msg, w.msgInfo)}>
              Create a resume to see your ATS match % for this job. <Link href="/user/dashboard">Go to dashboard</Link>
            </p>
          )}
          {match && match.matched.length > 0 && (
            <section className={j.dSec}>
              <h3>Matched skills ({match.matched.length})</h3>
              <SkillChips matched={match.matched} missing={[]} max={40} />
            </section>
          )}
          {match && match.missing.length > 0 && (
            <section className={j.dSec}>
              <h3>Missing from your resume ({match.missing.length})</h3>
              <SkillChips matched={[]} missing={match.missing} max={40} />
              <p className={j.note} style={{ marginTop: 8 }}>
                Add the ones you really have to your resume (Editor → ATS Checker) to raise your match.
              </p>
            </section>
          )}
          <section className={j.dSec}>
            <h3>Job description</h3>
            <div className={j.desc} aria-busy={!detail && !error}>
              {detail ? detail.description || "No description provided." : `${preview.snippet}\n\nLoading the full description…`}
            </div>
          </section>
          {url && (
            <p className={j.note}>
              Apply on {hostOf(url)}. Listing provided by {job.sourceLabel}; Resume Builder never submits applications for you.
            </p>
          )}
        </div>

        <div className={j.dActs}>
          <button type="button" className={cx(s.btn, s.primary)} onClick={() => void applyAndTrack()} disabled={!url || busy !== null}>
            <ExternalLink size={15} aria-hidden="true" />
            {busy === "apply" ? "Tracking…" : "Apply & Track"}
          </button>
          <button type="button" className={s.btn} onClick={() => void save()} disabled={busy !== null}>
            <BookmarkPlus size={15} aria-hidden="true" />
            {tracked ? "Update in Tracker" : busy === "save" ? "Saving…" : "Save to Tracker"}
          </button>
          <button type="button" className={s.btn} onClick={coverLetter}>
            <FileText size={15} aria-hidden="true" />
            Create Cover Letter
          </button>
        </div>
      </aside>
    </div>
  );
}

function JobsView() {
  const [resumes, setResumes] = useState<ResumeOption[] | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [remote, setRemote] = useState(false);
  const [source, setSource] = useState("");
  const [sort, setSort] = useState<"match" | "newest">("match");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState<FeedJob | null>(null);
  const [tracked, setTracked] = useState<Record<string, { id: string; stage: string }>>({});
  const [, tick] = useState(0);
  const reqId = useRef(0);

  const note = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  // Resumes for the "Matching against" picker.
  useEffect(() => {
    apiFetch<{ resumes: ResumeOption[] }>("/resumes", { cache: "no-store" })
      .then((r) => {
        const list = r.resumes.map((x) => ({ id: x.id, title: x.title || "Untitled resume", isComplete: Boolean(x.isComplete), updatedAt: x.updatedAt }));
        setResumes(list);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(RESUME_KEY);
        } catch {
          saved = null;
        }
        if (saved && list.some((x) => x.id === saved)) setResumeId(saved);
        else setResumeId("");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return;
        setResumes([]);
        setResumeId("");
      });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (resumeId === null) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<FeedResponse>(
        `/jobs/feed?${buildFeedQuery({ resumeId: resumeId || null, q: debouncedQ, remote, source, sort, page, pageSize: PAGE_SIZE })}`,
        { cache: "no-store" }
      );
      if (id !== reqId.current) return;
      setData(res);
      setTracked(res.tracked);
      if (res.page !== page) setPage(res.page);
      if (!resumeId && res.resume) setResumeId(res.resume.id);
    } catch (err) {
      if (id !== reqId.current) return;
      if (err instanceof ApiError && err.status === 401) return;
      if (err instanceof ApiError && err.status === 404 && resumeId) {
        setResumeId("");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load jobs");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [resumeId, debouncedQ, remote, source, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function pickResume(id: string) {
    setResumeId(id);
    setPage(1);
    try {
      localStorage.setItem(RESUME_KEY, id);
    } catch {
      /* ignore */
    }
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const r = await apiFetch<{ providers: FeedResponse["status"]["providers"]; nextRefreshInSec: number }>("/jobs/refresh", { method: "POST" });
      const fetched = r.providers.filter((p) => p.status === "fetched").length;
      note(fetched ? "Jobs refreshed from the live feeds" : "Jobs are already up to date");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh jobs");
    } finally {
      setRefreshing(false);
    }
  }

  const onTracked = useCallback(
    (jobId: string, row: { id: string; stage: string }, message: string) => {
      setTracked((prev) => ({ ...prev, [jobId]: row }));
      note(message);
    },
    [note]
  );

  const status = data?.status;
  const failed = status?.providers.filter((p) => p.status === "failed") ?? [];
  const resumeTitle = data?.resume?.title ?? resumes?.find((r) => r.id === resumeId)?.title ?? null;
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0;
  const sourceOptions = useMemo(() => data?.sources ?? [], [data]);
  const closeDrawer = useCallback(() => setOpen(null), []);

  return (
    <>
      <WorkspaceHeader
        icon={<Briefcase size={22} />}
        title="Jobs"
        sub="Real, live openings from public job boards, scored against your resume. Save the ones you like or Apply & Track in one click."
        actions={
          <Link href="/user/tracker" className={s.btn}>
            <SquareKanban size={15} aria-hidden="true" />
            Open Tracker
          </Link>
        }
      />

      <section className={cx(w.panel, j.bar)} aria-label="Job filters">
        <div className={j.barTop}>
          <label className={j.resumePick}>
            <span>Matching against:</span>
            <select
              className={w.select}
              value={resumeId ?? ""}
              onChange={(e) => pickResume(e.target.value)}
              aria-label="Resume to match against"
              disabled={!resumes || resumes.length === 0}
            >
              {!resumes ? (
                <option value="">Loading resumes…</option>
              ) : resumes.length === 0 ? (
                <option value="">No resume yet</option>
              ) : (
                <>
                  {!resumeId && <option value="">Newest finalized resume</option>}
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                      {r.isComplete ? "" : " (draft)"}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
          <div className={j.refresh}>
            <small aria-live="polite">
              {status ? (
                <>
                  <span className={j.live} aria-hidden="true" />
                  {status.total} live jobs{status.lastRefreshedAt ? ` · updated ${timeAgo(status.lastRefreshedAt)}` : ""}
                </>
              ) : (
                "Loading live jobs…"
              )}
            </small>
            <button type="button" className={cx(s.btn, s.sm)} onClick={() => void refresh()} disabled={refreshing}>
              <RefreshCw size={13} aria-hidden="true" className={refreshing ? j.spin : undefined} />
              {refreshing ? "Refreshing…" : "Refresh Jobs"}
            </button>
          </div>
        </div>
        <div className={j.filters}>
          <div className={w.inputIco}>
            <Search size={16} aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, company or skill…"
              aria-label="Search jobs"
              className={w.input}
              type="search"
            />
          </div>
          <label className={w.check}>
            <input
              type="checkbox"
              checked={remote}
              onChange={(e) => {
                setRemote(e.target.checked);
                setPage(1);
              }}
            />
            Remote only
          </label>
          <select
            className={w.select}
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            aria-label="Job source"
          >
            <option value="">All sources</option>
            {sourceOptions.map((o) => (
              <option key={o.source} value={o.source}>
                {o.label} ({o.count})
              </option>
            ))}
          </select>
          <select
            className={w.select}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as "match" | "newest");
              setPage(1);
            }}
            aria-label="Sort jobs"
          >
            <option value="match">Best match</option>
            <option value="newest">Newest</option>
          </select>
        </div>
        {failed.length > 0 && (
          <p className={j.provWarn} role="status">
            {failed.map((p) => p.label).join(", ")} did not answer just now. Showing the latest jobs we have; other feeds are live.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className={cx(w.msg, w.msgErr)}>
          {error}
        </p>
      )}
      {toast && (
        <div role="status" className={w.toast} style={open ? { bottom: 96, zIndex: 95 } : undefined}>
          {toast}
        </div>
      )}

      {!data && loading ? (
        <ul className={j.grid} aria-busy="true" aria-label="Loading jobs">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className={j.skel} />
          ))}
        </ul>
      ) : data && data.jobs.length === 0 ? (
        <div className={cx(w.panel, j.empty)}>
          <span className={j.emptyIco} aria-hidden="true">
            <Search size={26} />
          </span>
          <h2>No jobs match these filters</h2>
          <p>Try a broader search, switch off “Remote only”, or pick “All sources”.</p>
          <button
            type="button"
            className={s.btn}
            onClick={() => {
              setQ("");
              setRemote(false);
              setSource("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : data ? (
        <>
          <div className={j.meta}>
            <span aria-live="polite">
              Showing {from}–{to} of {data.total} jobs{data.sort === "match" && data.resume ? " · best match first" : " · newest first"}
            </span>
            {loading && <span>Updating…</span>}
          </div>
          <ul className={j.grid} aria-label="Job results">
            {data.jobs.map((job) => (
              <JobCard key={job.id} job={job} tracked={tracked[job.id]} onOpen={setOpen} />
            ))}
          </ul>
          {data.pages > 1 && (
            <nav className={j.pager} aria-label="Pages">
              <button type="button" className={cx(s.btn, s.sm)} disabled={data.page <= 1 || loading} onClick={() => setPage(data.page - 1)}>
                Previous
              </button>
              <span>
                Page {data.page} of {data.pages}
              </span>
              <button type="button" className={cx(s.btn, s.sm)} disabled={data.page >= data.pages || loading} onClick={() => setPage(data.page + 1)}>
                Next
              </button>
            </nav>
          )}
          <p className={j.attrib}>
            Live jobs via <a href="https://remoteok.com" target="_blank" rel="noopener">Remote OK</a>,{" "}
            <a href="https://www.arbeitnow.com" target="_blank" rel="noopener">Arbeitnow</a> and{" "}
            <a href="https://remotive.com" target="_blank" rel="noopener">Remotive</a>. Applications happen on the employer’s or board’s own site.
          </p>
        </>
      ) : null}

      {open && (
        <JobDrawer
          jobId={open.id}
          preview={open}
          resumeId={data?.resume?.id ?? null}
          resumeTitle={resumeTitle}
          tracked={tracked[open.id]}
          onClose={closeDrawer}
          onTracked={onTracked}
        />
      )}
    </>
  );
}

export default function JobsPage() {
  return (
    <UserWorkspace active="jobs">
      <JobsView />
    </UserWorkspace>
  );
}
