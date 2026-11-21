"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Copy, LayoutTemplate, Mail, Plus, Search, Trash2 } from "lucide-react";
import { createSampleDevopsResume } from "@/shared";
import { AppShell } from "@/components/AppShell";
import { ApiError, apiFetch, clearToken, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

type CoverLetter = {
  id: string;
  title: string;
  body?: string;
  updatedAt?: string;
};

type ResumeCard = {
  id: string;
  title: string;
  updatedAt?: string;
  isComplete?: boolean;
  templateId: string;
  layoutKey: string;
  content: unknown;
  design: unknown;
};

function accentOf(design: unknown) {
  if (design && typeof design === "object" && "accentColor" in design) {
    const value = (design as { accentColor?: unknown }).accentColor;
    if (typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  }
  return "#0f766e";
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** BUG-920/320: friendly messages; never show raw server error text. */
function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 402) {
    return "You've reached the free plan limit. Upgrade to Pro, or delete a resume to make room.";
  }
  if (err instanceof ApiError && err.status >= 500) return fallback;
  if (err instanceof ApiError && err.message && err.message.length < 160) return err.message;
  return fallback;
}

export default function DashboardPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [resumes, setResumes] = useState<ResumeCard[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"updated" | "title">("updated");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = resumes.filter((resume) => !q || resume.title.toLowerCase().includes(q));
    return [...rows].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : (b.updatedAt || "").localeCompare(a.updatedAt || "")
    );
  }, [resumes, query, sort]);

  async function createResume() {
    setBusy(true);
    setError(null);
    try {
      const sample = createSampleDevopsResume();
      const res = await apiFetch<{ resume: ResumeCard }>("/resumes", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled Resume",
          templateId: sample.templateId,
          layoutKey: sample.layoutKey,
          content: sample.content,
          design: sample.design,
        }),
      });
      router.push(`/user/editor/${res.resume.id}`);
    } catch (err) {
      setError(friendlyError(err, "Could not create a resume. Please try again."));
      setBusy(false);
    }
  }

  async function renameResume(resume: ResumeCard) {
    const next = window.prompt("Resume name", resume.title);
    if (next === null) return;
    const title = next.trim().slice(0, 100) || "Untitled Resume";
    try {
      const res = await apiFetch<{ resume: ResumeCard }>(`/resumes/${resume.id}`, {
        method: "PUT",
        body: JSON.stringify({ title }),
      });
      setResumes((rows) => rows.map((row) => (row.id === resume.id ? { ...row, ...res.resume } : row)));
    } catch (err) {
      setError(friendlyError(err, "Could not rename the resume. Please try again."));
    }
  }

  async function duplicateResume(resume: ResumeCard) {
    setError(null);
    try {
    const res = await apiFetch<{ resume: ResumeCard }>("/resumes", {
      method: "POST",
      body: JSON.stringify({
        title: `${resume.title} copy`.slice(0, 100),
        templateId: resume.templateId,
        layoutKey: resume.layoutKey,
        content: resume.content,
        design: resume.design,
      }),
    });
    setResumes((rows) => [res.resume, ...rows]);
    } catch (err) {
      setError(friendlyError(err, "Could not duplicate the resume. Please try again."));
    }
  }

  async function deleteResume(resume: ResumeCard) {
    if (!window.confirm(`Delete “${resume.title}”?`)) return;
    try {
      await apiFetch(`/resumes/${resume.id}`, { method: "DELETE" });
      setResumes((rows) => rows.filter((row) => row.id !== resume.id));
    } catch (err) {
      setError(friendlyError(err, "Could not delete the resume. Please try again."));
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      setLoadFailed(false);
      try {
        // Resumes live on the landing templates flow — dashboard only shows cover letters.
        const [letterRes, resumeRes] = await Promise.all([
          apiFetch<{ coverLetters: CoverLetter[] }>("/cover-letters").catch(
            () => ({ coverLetters: [] as CoverLetter[] })
          ),
          apiFetch<{ resumes: ResumeCard[] }>("/resumes"),
        ]);
        setLetters(letterRes.coverLetters);
        setResumes(resumeRes.resumes);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace("/login");
          return;
        }
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router, reloadKey]);


  // BUG-315: start a blank cover letter and open it.
  async function newLetter() {
    setBusy(true);
    try {
      const res = await apiFetch<{ coverLetter: CoverLetter }>("/cover-letters", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled Cover Letter", body: "" }),
      });
      router.push(`/user/cover-letters/${res.coverLetter.id}`);
    } catch (err) {
      setError(friendlyError(err, "Could not create a cover letter. Please try again."));
      setBusy(false);
    }
  }
  return (
    <AppShell>
      <main className="p-8">
        <div className="app-page-in mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="min-h-5 text-sm font-semibold text-[var(--rb-teal-dark)]">{greeting}</p>
            <h1 className="auth-display mt-1 text-3xl font-bold text-slate-900">
              Pick up where you left off
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Your resumes, cover letters, and job tracker live here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-app-primary" disabled={busy} onClick={() => void createResume()}>
              <Plus size={16} />
              New resume
            </button>
            <Link href="/user/jobs" className="btn-app-secondary">
              Browse jobs
            </Link>
            <Link href="/#templates" className="btn-app-primary">
              <LayoutTemplate size={16} />
              Choose template
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading resumes">
            {[0, 1, 2].map((item) => (
              <div key={item} className="dash-skel" />
            ))}
          </div>
        ) : loadFailed ? (
          <div role="alert" className="dash-empty">
            <h3 className="auth-display text-lg font-bold text-slate-900">We couldn't load your documents</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Something went wrong on our side. Check your connection and try again.
            </p>
            <div className="mt-5 flex justify-center">
              <button type="button" className="btn-app-primary" onClick={() => setReloadKey((k) => k + 1)}>
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="app-page-body space-y-10">
            <section>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Resumes</h2>
                <label className="relative ml-auto min-w-[180px] flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search resumes"
                    aria-label="Search resumes"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm"
                  />
                </label>
                <select
                  aria-label="Sort resumes"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "updated" | "title")}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                >
                  <option value="updated">Last edited</option>
                  <option value="title">Title</option>
                </select>
              </div>
              {visible.length === 0 && resumes.length > 0 && query.trim() ? (
                <div className="dash-empty" role="status">
                  <h3 className="auth-display text-lg font-bold text-slate-900">No results</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                    No resume matches “{query.trim()}”.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <button type="button" className="btn-app-secondary" onClick={() => setQuery("")}>
                      Clear search
                    </button>
                  </div>
                </div>
              ) : visible.length === 0 ? (
                <div className="dash-empty">
                  <svg className="mx-auto mb-3" width="72" height="88" viewBox="0 0 72 88" aria-hidden>
                    <rect x="8" y="6" width="56" height="76" rx="6" fill="#fff" stroke="#cbd5e1" />
                    <rect x="8" y="6" width="56" height="16" rx="6" fill="#0f766e" />
                    <rect x="16" y="32" width="40" height="4" rx="2" fill="#e2e8f0" />
                    <rect x="16" y="42" width="32" height="4" rx="2" fill="#e2e8f0" />
                    <rect x="16" y="52" width="36" height="4" rx="2" fill="#e2e8f0" />
                  </svg>
                  <h3 className="auth-display text-lg font-bold text-slate-900">No resumes yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    Create one here, or start from a template.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button type="button" className="btn-app-primary" disabled={busy} onClick={() => void createResume()}>
                      <Plus size={16} />
                      New resume
                    </button>
                    <Link href="/#templates" className="btn-app-secondary">
                      Browse templates
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((resume) => (
                    <article key={resume.id} className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
                      <Link href={`/user/editor/${resume.id}`} className="block">
                        <div className="resume-thumb" style={{ ["--thumb" as string]: accentOf(resume.design) }} aria-hidden>
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="px-4 pt-3">
                        <h3 className="truncate text-base font-bold text-slate-900">{resume.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {resume.updatedAt ? `Edited ${new Date(resume.updatedAt).toLocaleString()}` : "Not saved yet"}
                          {" · "}
                          {resume.isComplete ? "Complete" : "Draft"}
                        </p>
                        </div>
                      </Link>
                      <div className="mt-3 flex gap-2 px-4 pb-4">
                        <button type="button" className="btn-app-secondary" onClick={() => void renameResume(resume)}>
                          Rename
                        </button>
                        <button type="button" className="btn-app-secondary" aria-label={`Duplicate ${resume.title}`} onClick={() => void duplicateResume(resume)}>
                          <Copy size={14} />
                        </button>
                        <button type="button" className="btn-app-secondary" aria-label={`Delete ${resume.title}`} onClick={() => void deleteResume(resume)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section id="cover-letters" className="scroll-mt-20">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Cover letters
                </h2>
                <button type="button" className="btn-app-secondary" disabled={busy} onClick={() => void newLetter()}>
                  <Plus size={14} aria-hidden="true" /> New cover letter
                </button>
              </div>
              {letters.length === 0 ? (
                <div className="dash-empty py-8">
                  <Mail className="mx-auto text-[var(--rb-teal)]" size={22} />
                  <p className="mt-2 text-sm text-slate-500">
                    No cover letters yet. Create one, or mark a resume complete to draft one.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {letters.map((letter, i) => (
                    <Link
                      key={letter.id}
                      href={`/user/cover-letters/${letter.id}`}
                      aria-label={`Open ${letter.title}`}
                      className="dash-tile block"
                      style={{ animationDelay: `${0.05 + i * 0.06}s` }}
                    >
                      <div className="dash-tile-strip" />
                      <div className="p-5">
                        <h3 className="font-semibold text-slate-900">{letter.title}</h3>
                        {letter.body && (
                          <p className="mt-2 line-clamp-3 text-xs text-slate-600">{letter.body}</p>
                        )}
                        {letter.updatedAt && (
                          <p className="mt-3 text-xs text-slate-400">
                            Updated {new Date(letter.updatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
