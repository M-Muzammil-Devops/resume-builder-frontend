"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, ExternalLink, MapPin, Search, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { cx } from "@/components/dashboard/format";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  department: string;
  description: string;
  applyUrl: string;
  keywords?: string[];
};

function JobsView() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(() => jobs.find((j) => j.id === selectedId) ?? null, [jobs, selectedId]);

  async function loadJobs() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (department) params.set("department", department);
      if (remoteOnly) params.set("remote", "true");
      const res = await apiFetch<{ jobs: Job[] }>(`/jobs?${params.toString()}`);
      setJobs(res.jobs);
      setSelectedId(res.jobs[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
      setJobs([]);
      setSelectedId(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function shortlist(jobId: string) {
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch("/tracker", {
        method: "POST",
        body: JSON.stringify({ jobId, stage: "shortlist" }),
      });
      setMessage("Added to shortlist. View it in Tracker.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not shortlist job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <WorkspaceHeader
        icon={<Briefcase size={22} />}
        title="Jobs"
        sub="Search roles, read the details and shortlist the ones you like. Shortlisted jobs appear in your Tracker."
        actions={
          <Link href="/user/tracker" className={s.btn}>
            Open Tracker
          </Link>
        }
      />

      <form
        className={cx(w.panel, w.row)}
        onSubmit={(e) => {
          e.preventDefault();
          void loadJobs();
        }}
      >
        <div className={w.inputIco}>
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles, companies, skills…" aria-label="Search jobs" className={w.input} />
        </div>
        <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" aria-label="Department" className={w.input} style={{ flex: "0 1 180px" }} />
        <label className={w.check}>
          <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
          Remote only
        </label>
        <button type="submit" disabled={busy} className={cx(s.btn, s.primary)} style={{ height: 42 }}>
          Search
        </button>
      </form>
      {error && (
        <p role="alert" className={cx(w.msg, w.msgErr)}>
          {error}
        </p>
      )}
      {message && (
        <div role="status" className={w.toast}>
          {message}
        </div>
      )}

      <div className={w.jobs}>
        <div className={cx(w.panel, w.jobList)} aria-label="Job results">
          {jobs.length === 0 ? (
            <p className={w.muted} style={{ padding: 12 }}>
              {busy ? "Searching…" : "No jobs found. Try another query."}
            </p>
          ) : (
            jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedId(job.id)}
                aria-pressed={selectedId === job.id}
                className={cx(w.jobItem, selectedId === job.id && w.jobOn)}
              >
                <b>{job.title}</b>
                <span>{job.company}</span>
                <span className={w.tags}>
                  {job.location && (
                    <span className={w.tag}>
                      <MapPin size={11} aria-hidden="true" />
                      {job.location}
                    </span>
                  )}
                  {job.remote && <span className={cx(w.tag, w.tagBlue)}>Remote</span>}
                  {job.department && <span className={w.tag}>{job.department}</span>}
                </span>
              </button>
            ))
          )}
        </div>

        <div className={cx(w.panel, w.jobDetail)}>
          {!selected ? (
            <p className={w.muted}>Select a job to view details.</p>
          ) : (
            <>
              <div className={w.jobTop}>
                <div style={{ minWidth: 0 }}>
                  <h2>{selected.title}</h2>
                  <p className={w.jobMeta}>
                    {selected.company}
                    {selected.location ? ` · ${selected.location}` : ""}
                  </p>
                </div>
                <div className={w.row}>
                  <button type="button" disabled={busy} onClick={() => void shortlist(selected.id)} className={s.btn}>
                    <Star size={15} aria-hidden="true" />
                    Shortlist
                  </button>
                  {selected.applyUrl && (
                    <a href={selected.applyUrl} target="_blank" rel="noopener noreferrer" className={cx(s.btn, s.primary)}>
                      <ExternalLink size={15} aria-hidden="true" />
                      Apply externally
                    </a>
                  )}
                </div>
              </div>
              {selected.keywords && selected.keywords.length > 0 && (
                <div className={w.tags} style={{ marginTop: 14 }}>
                  {selected.keywords.map((tag) => (
                    <span key={tag} className={w.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className={w.desc}>{selected.description || "No description provided."}</div>
            </>
          )}
        </div>
      </div>
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
