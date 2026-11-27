/** Batch 4: types + pure helpers for /user/jobs and /user/tracker. */

export type JobSource = "remoteok" | "arbeitnow" | "remotive" | "jsearch" | "jooble";

export type JobMatch = { score: number; matched: string[]; missing: string[]; basis: "keywords" | "title" | "none" };

export type FeedJob = {
  id: string;
  source: JobSource;
  sourceLabel: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary: string | null;
  tags: string[];
  snippet: string;
  applyUrl: string;
  postedAt: string | null;
  match: JobMatch | null;
};

export type FeedJobDetail = FeedJob & { description: string };

export type ProviderReport = {
  source: JobSource;
  label: string;
  status: "fetched" | "cached" | "failed" | "disabled";
  count: number;
  error?: string;
  fetchedAt: string | null;
};

export type FeedStatus = { lastRefreshedAt: string | null; total: number; providers: ProviderReport[]; refreshing: boolean };

export type FeedResponse = {
  jobs: FeedJob[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  sort: "match" | "newest";
  resume: { id: string; title: string } | null;
  sources: { source: JobSource; label: string; count: number }[];
  tracked: Record<string, { id: string; stage: string }>;
  status: FeedStatus;
};

export type TrackerApplication = {
  id: string;
  jobId: string;
  stage: string;
  notes: string | null;
  resumeId: string | null;
  atsMatch: number | null;
  appliedAt: string | null;
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    remote: boolean;
    department: string;
    applyUrl: string;
    source: string;
    salary: string | null;
    tags: string[];
    postedAt: string | null;
    active: boolean;
  };
  resume: { id: string; title: string } | null;
};

/** Tracker tabs. "Saved" also holds the legacy recommended / shortlist / auto-apply stages. */
export type StatusTab = "all" | "saved" | "applied" | "interview" | "offer" | "rejected";
export const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
];

export function statusOf(stage: string): Exclude<StatusTab, "all"> {
  if (stage === "applied" || stage === "interview" || stage === "offer" || stage === "rejected") return stage;
  return "saved";
}

/** Stage value sent to the API for a status (Saved is stored as the legacy "shortlist"). */
export function stageFor(status: Exclude<StatusTab, "all">): string {
  return status === "saved" ? "shortlist" : status;
}

export const STATUS_LABEL: Record<Exclude<StatusTab, "all">, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export type MatchTone = "high" | "mid" | "low";
export function matchTone(score: number): MatchTone {
  if (score >= 70) return "high";
  if (score >= 45) return "mid";
  return "low";
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", else a short date. */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** YYYY-MM-DD for <input type=date> (UTC date part, matches what the API stores). */
export function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Only real https links are opened. */
export function safeApplyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export const JD_STORAGE_KEY = "rb_cl_prefill_jd";

/** Link that opens the cover-letter generator pre-filled for this job. */
export function coverLetterHref(job: { title: string; company: string; id?: string }, resumeId?: string | null): string {
  const q = new URLSearchParams({ new: "1", title: job.title.slice(0, 120), company: job.company.slice(0, 120) });
  if (resumeId) q.set("resume", resumeId);
  if (job.id) q.set("job", job.id);
  return `/user/cover-letters?${q.toString()}`;
}

export function buildFeedQuery(f: { resumeId?: string | null; q?: string; remote?: boolean; source?: string; sort?: string; page?: number; pageSize?: number }): string {
  const p = new URLSearchParams();
  if (f.resumeId) p.set("resumeId", f.resumeId);
  if (f.q && f.q.trim()) p.set("q", f.q.trim().slice(0, 120));
  if (f.remote) p.set("remote", "true");
  if (f.source) p.set("source", f.source);
  if (f.sort) p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  if (f.pageSize) p.set("pageSize", String(f.pageSize));
  return p.toString();
}
