"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, MapPin, Search, Star } from "lucide-react";
import clsx from "clsx";
import { AppShell } from "@/components/AppShell";
import { apiFetch, getToken } from "@/lib/api";

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

export default function JobsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => jobs.find((j) => j.id === selectedId) ?? null,
    [jobs, selectedId]
  );

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
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function shortlist(jobId: string) {
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch("/tracker", {
        method: "POST",
        body: JSON.stringify({ jobId, stage: "shortlist" }),
      });
      setMessage("Added to shortlist. View it in Job Tracker.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not shortlist job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell mainClassName="overflow-hidden">
      <main className="flex h-full min-h-screen flex-col overflow-hidden">
        <div className="app-page-in border-b border-white/60 bg-white/70 px-6 py-4 backdrop-blur">
          <h1 className="auth-display text-2xl font-bold text-slate-900">Jobs</h1>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void loadJobs();
            }}
          >
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles, companies, skills…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-teal-500 focus:ring-2"
              />
            </div>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Department"
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2"
            />
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="accent-teal-600"
              />
              Remote only
            </label>
            <button type="submit" disabled={busy} className="btn-app-primary disabled:opacity-60">
              Search
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {message && (
            <div role="status" className="rb-toast">
              {message}
            </div>
          )}
        </div>

        <div className="app-page-body grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_1fr]">
          <div className="rb-scroll overflow-y-auto border-r border-white/50 bg-white/55 backdrop-blur-sm">
            {jobs.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                {busy ? "Searching…" : "No jobs found. Try another query."}
              </p>
            ) : (
              jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedId(job.id)}
                  className={clsx(
                    "block w-full border-b border-slate-100 px-5 py-4 text-left transition",
                    selectedId === job.id ? "bg-teal-50" : "hover:bg-slate-50"
                  )}
                >
                  <div className="font-semibold text-slate-900">{job.title}</div>
                  <div className="mt-0.5 text-sm text-slate-600">{job.company}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {job.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} />
                        {job.location}
                      </span>
                    )}
                    {job.remote && (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-700">Remote</span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">{job.department}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="rb-scroll overflow-y-auto p-6">
            {!selected ? (
              <p className="text-sm text-slate-500">Select a job to view details.</p>
            ) : (
              <div className="mx-auto max-w-3xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selected.title}</h2>
                    <p className="mt-1 text-slate-600">
                      {selected.company}
                      {selected.location ? ` · ${selected.location}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => shortlist(selected.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-60"
                    >
                      <Star size={16} />
                      Shortlist
                    </button>
                    {selected.applyUrl && (
                      <a
                        href={selected.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-app-primary"
                      >
                        <ExternalLink size={16} />
                        Apply externally
                      </a>
                    )}
                  </div>
                </div>

                {selected.keywords && selected.keywords.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.keywords.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-6 whitespace-pre-wrap rounded-xl border border-white/70 bg-white/85 p-5 text-sm leading-relaxed text-slate-700 shadow-sm backdrop-blur">
                  {selected.description || "No description provided."}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
