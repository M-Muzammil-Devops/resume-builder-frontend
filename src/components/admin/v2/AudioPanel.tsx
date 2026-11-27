"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioLines, CheckCircle2, Clock3, ListChecks, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AudioJobRow, AudioJobs, Range } from "./types";
import { RANGE_LONG } from "./types";
import { ago, cx, num, pkt, plural } from "./format";
import { Kpi } from "./OverviewPanel";
import s from "./AdminV2.module.css";

const PAGE = 25;
const STATUS: Record<string, [string, string]> = {
  done: ["Completed", s.pG],
  failed: ["Failed", s.pR],
  canceled: ["Canceled", s.pN],
  queued: ["Queued", s.pB],
  processing: ["Processing", s.pA],
};
const MODE: Record<string, string> = { noise: "Noise removal", conversation: "Conversation" };

function size(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
function length(sec: number | null) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const r = Math.round(sec % 60);
  return m ? `${m}:${String(r).padStart(2, "0")} min` : `${r} s`;
}
const inRange = (r: Range) => (r === "today" ? "today" : `in the ${RANGE_LONG[r]}`);
const modeLabel = (m: string) => MODE[m] || (m ? m.charAt(0).toUpperCase() + m.slice(1) : "—");

export function AudioPanel({ range }: { range: Range }) {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<{ range: Range; skip: number }>({ range, skip: 0 });
  const skip = page.range === range ? page.skip : 0;
  const setSkip = (n: number) => setPage({ range, skip: n });
  const [data, setData] = useState<AudioJobs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ range, status, take: String(PAGE), skip: String(skip) });
      if (search.trim()) q.set("search", search.trim());
      setData(await apiFetch<AudioJobs>(`/admin/audio-jobs?${q}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load audio jobs");
    } finally {
      setLoading(false);
    }
  }, [range, status, search, skip]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, search]);

  const sm = data?.summary;
  const rate = sm && sm.completed + sm.failed > 0 ? Math.round((sm.completed / (sm.completed + sm.failed)) * 100) : null;
  const rows = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const filtered = status !== "all" || search.trim();

  return (
    <>
      <div className={s.sh}>
        <div>
          <h2>Audio jobs</h2>
          <p>Noise Remover jobs, newest first · {RANGE_LONG[range]} · times in PKT</p>
        </div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}

      <div className={cx(s.kpis, s.audioK)}>
        <Kpi icon={<ListChecks size={14} />} color="linear-gradient(135deg,#3b82f6,#8b5cf6)" label="Total jobs" value={sm ? num(sm.total) : "…"} sub="all time"
          hint={sm ? (sm.active ? `${num(sm.active)} in progress` : "None in progress") : " "} />
        <Kpi icon={<CheckCircle2 size={14} />} color="linear-gradient(135deg,#22c55e,#16a34a)" label="Completed" value={sm ? num(sm.completed) : "…"}
          hint={rate == null ? "No finished jobs yet" : `${rate}% success rate`} />
        <Kpi icon={<XCircle size={14} />} color="linear-gradient(135deg,#f43f5e,#e11d48)" label="Failed" value={sm ? num(sm.failed) : "…"}
          hint={sm ? `${num(sm.canceled)} canceled` : " "} />
        <Kpi icon={<Clock3 size={14} />} color="linear-gradient(135deg,#f59e0b,#f97316)" label="Minutes processed" value={sm ? num(Math.round(sm.minutesProcessed)) : "…"} sub="min"
          hint="Audio length of completed jobs" />
        <Kpi icon={<AudioLines size={14} />} color="linear-gradient(135deg,#22d3ee,#0ea5e9)" label="Jobs in range" value={sm ? num(sm.inRange) : "…"}
          hint={RANGE_LONG[range]} />
      </div>
      {sm && sm.untracked > 0 && (
        <div className={s.notice} style={{ marginTop: 14 }} role="status">
          {plural(sm.untracked, "older job was", "older jobs were")} counted before the job log started; their details are not available.
        </div>
      )}

      <section className={cx(s.card, s.pad)} style={{ marginTop: 18 }}>
        <div className={s.ttl}>
          <div>
            <h3>{data ? plural(total, "job", "jobs") : "Jobs"}</h3>
            <small>{loading && !data ? "Loading…" : filtered ? "Matching your filters" : `Every job ${inRange(range)}`}</small>
          </div>
          <div className={s.filters}>
            <label className="sr-only" htmlFor="v2-audio-search">Search jobs</label>
            <input id="v2-audio-search" type="search" className={cx(s.input, s.search)} placeholder="Search email or job ID" value={search} maxLength={200}
              onChange={(e) => { setSearch(e.target.value); setSkip(0); }} />
            <label className="sr-only" htmlFor="v2-audio-status">Status</label>
            <select id="v2-audio-status" className={s.select} value={status} onChange={(e) => { setStatus(e.target.value); setSkip(0); }}>
              <option value="all">Status: All</option>
              <option value="done">Completed</option>
              <option value="failed">Failed</option>
              <option value="canceled">Canceled</option>
              <option value="processing">Processing</option>
              <option value="queued">Queued</option>
            </select>
          </div>
        </div>
        <div className={s.tw}>
          <table className={cx(s.table, s.rt)}>
            <thead>
              <tr><th>User</th><th>Mode</th><th>Length</th><th>Size</th><th>Status</th><th>Created</th><th>Job ID</th></tr>
            </thead>
            <tbody>
              {data && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className={cx(s.empty, s.tdFull)}>
                    {filtered
                      ? "No jobs match these filters."
                      : sm && sm.total === 0
                        ? "No audio jobs yet. Jobs appear here as soon as someone uses the Noise Remover."
                        : `No audio jobs ${inRange(range)}.`}
                  </td>
                </tr>
              )}
              {rows.map((j) => (
                <JobRow key={j.id} j={j} />
              ))}
            </tbody>
          </table>
        </div>
        {total > PAGE && (
          <div className={s.foot}>
            <span>{loading ? "Loading…" : `Showing ${rows.length ? skip + 1 : 0}–${skip + rows.length} of ${num(total)}`}</span>
            <div className={s.acts}>
              <button type="button" className={cx(s.btn, s.sm)} disabled={skip === 0 || loading} onClick={() => setSkip(Math.max(0, skip - PAGE))}>Prev</button>
              <button type="button" className={cx(s.btn, s.sm)} disabled={skip + PAGE >= total || loading} onClick={() => setSkip(skip + PAGE)}>Next</button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function JobRow({ j }: { j: AudioJobRow }) {
  const [label, cls] = STATUS[j.status] || [j.status, s.pN];
  const detail = [j.inputExt?.toUpperCase(), j.outputFormat ? `→ ${j.outputFormat.toUpperCase()}` : null].filter(Boolean).join(" ");
  return (
    <tr>
      <td data-l="User" className={s.tdFull} style={{ overflowWrap: "anywhere" }}>
        {j.user ? <b>{j.user}</b> : <span className={s.mute}>Deleted account</span>}
      </td>
      <td data-l="Mode">
        {modeLabel(j.mode)}
        {j.strength != null && <span className={s.mute}> · {j.strength}%</span>}
      </td>
      <td data-l="Length">{length(j.durationSec)}</td>
      <td data-l="Size">
        {size(j.sizeBytes)}
        {detail && <div className={s.mute} style={{ fontSize: 11 }}>{detail}</div>}
      </td>
      <td data-l="Status">
        <span className={cx(s.pill, cls)} title={j.errorCode || undefined}>{label}</span>
        {j.status === "failed" && j.errorCode && <div className={s.mute} style={{ fontSize: 11, marginTop: 3 }}>{j.errorCode.replace(/_/g, " ").toLowerCase()}</div>}
      </td>
      <td data-l="Created" title={pkt(j.createdAt)}>{ago(j.createdAt)}</td>
      <td data-l="Job ID" className={s.mono} title={j.id}>{j.id.slice(0, 8)}</td>
    </tr>
  );
}
