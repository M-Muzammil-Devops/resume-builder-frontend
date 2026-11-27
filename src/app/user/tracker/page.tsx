"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Briefcase, ExternalLink, Pencil, Plus, Search, SquareKanban, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  STATUS_LABEL,
  STATUS_TABS,
  dateInputValue,
  hostOf,
  matchTone,
  safeApplyUrl,
  shortDate,
  stageFor,
  statusOf,
  type StatusTab,
  type TrackerApplication,
} from "@/lib/jobsFeed";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { cx } from "@/components/dashboard/format";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";
import j from "@/components/jobs/Jobs.module.css";

type Status = Exclude<StatusTab, "all">;
const STATUS_PILL: Record<Status, string> = { saved: j.pSaved, applied: j.pApplied, interview: j.pInterview, offer: j.pOffer, rejected: j.pRejected };
const LIVE = new Set(["remoteok", "arbeitnow", "remotive", "jsearch", "jooble"]);
const SOURCE_LABEL: Record<string, string> = { remoteok: "RemoteOK", arbeitnow: "Arbeitnow", remotive: "Remotive", jsearch: "JSearch", jooble: "Jooble" };

const isCustom = (a: TrackerApplication) => a.job.source === "custom" || a.job.department === "Custom";

function TrackerItem({
  item,
  onPatch,
  onRemove,
}: {
  item: TrackerApplication;
  onPatch: (item: TrackerApplication, patch: Record<string, unknown>, message?: string) => Promise<boolean>;
  onRemove: (item: TrackerApplication) => void;
}) {
  const status = statusOf(item.stage);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [savedNote, setSavedNote] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.job.title);
  const [company, setCompany] = useState(item.job.company);
  const url = safeApplyUrl(item.job.applyUrl);
  const legacy = item.stage === "auto_apply" ? "Auto Apply queue" : item.stage === "recommended" ? "Recommended" : null;
  const dateLabel =
    status === "saved"
      ? `Saved ${shortDate(item.createdAt)}`
      : item.appliedAt
        ? `Applied ${shortDate(item.appliedAt)}`
        : `Updated ${shortDate(item.updatedAt)}`;

  useEffect(() => setNotes(item.notes ?? ""), [item.notes]);

  async function saveNotes() {
    if ((item.notes ?? "") === notes) return;
    if (await onPatch(item, { notes: notes.slice(0, 2000) })) {
      setSavedNote(true);
      window.setTimeout(() => setSavedNote(false), 1800);
    }
  }

  return (
    <li className={j.tItem} data-app={item.id}>
      <div className={j.tTop}>
        <div className={j.tTitle}>
          <h3>{item.job.title}</h3>
          <p>{item.job.company}</p>
        </div>
        <div className={j.tCtl}>
          <select
            className={w.select}
            aria-label={`Status of ${item.job.title}`}
            value={legacy ? item.stage : stageFor(status)}
            onChange={(e) => {
              const next = e.target.value;
              const label = STATUS_LABEL[statusOf(next)];
              void onPatch(item, { stage: next }, `Moved to ${label}`);
            }}
          >
            {legacy && <option value={item.stage}>{legacy}</option>}
            {(Object.keys(STATUS_LABEL) as Status[]).map((k) => (
              <option key={k} value={stageFor(k)}>
                {STATUS_LABEL[k]}
              </option>
            ))}
          </select>
          {isCustom(item) && (
            <button type="button" className={w.icoBtn} aria-label={`Edit ${item.job.title}`} onClick={() => setEditing((v) => !v)}>
              <Pencil size={14} aria-hidden="true" />
            </button>
          )}
          <button type="button" className={cx(w.icoBtn, w.icoDanger)} aria-label={`Delete ${item.job.title}`} onClick={() => onRemove(item)}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {editing && (
        <form
          className={w.addForm}
          onSubmit={async (e) => {
            e.preventDefault();
            if (await onPatch(item, { title: title.trim() || item.job.title, company: company.trim() || item.job.company }, "Card updated")) setEditing(false);
          }}
        >
          <input aria-label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} className={w.input} maxLength={120} />
          <input aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} className={w.input} maxLength={120} />
          <button type="submit" className={cx(s.btn, s.primary)} style={{ height: 42 }}>
            Save
          </button>
        </form>
      )}

      <div className={j.tMeta}>
        <span className={cx(j.pill, STATUS_PILL[status])}>{legacy ?? STATUS_LABEL[status]}</span>
        <span>{dateLabel}</span>
        {item.resume ? (
          <span>
            · Resume: <b>{item.resume.title}</b>
            {typeof item.atsMatch === "number" && (
              <>
                {" "}
                · <span className={cx(j.mText, j[matchTone(item.atsMatch)])}>{item.atsMatch}% ATS match</span>
              </>
            )}
          </span>
        ) : null}
        {LIVE.has(item.job.source) && <span>· via {SOURCE_LABEL[item.job.source]}</span>}
        {item.job.location && <span>· {item.job.location}</span>}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={12} aria-hidden="true" />
            Open posting ({hostOf(url)})
          </a>
        )}
        {LIVE.has(item.job.source) && item.job.active === false && <span>· listing closed on the board</span>}
      </div>

      <div className={j.tEdit}>
        <label>
          <span>
            Notes {savedNote && <span className={j.saved}>Saved</span>}
          </span>
          <textarea
            className={w.textarea}
            value={notes}
            maxLength={2000}
            placeholder="Recruiter, salary, next steps…"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => void saveNotes()}
            aria-label={`Notes for ${item.job.title}`}
          />
        </label>
        <label>
          Follow-up date
          <input
            type="date"
            className={w.input}
            value={dateInputValue(item.followUpAt)}
            onChange={(e) => void onPatch(item, { followUpAt: e.target.value || null }, e.target.value ? "Follow-up date saved" : "Follow-up date cleared")}
            aria-label={`Follow-up date for ${item.job.title}`}
          />
        </label>
      </div>
    </li>
  );
}

function TrackerView() {
  const [items, setItems] = useState<TrackerApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusTab>("all");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const note = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    apiFetch<{ applications: TrackerApplication[] }>("/tracker", { cache: "no-store" })
      .then((res) => setItems(res.applications))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return;
        setError(err instanceof Error ? err.message : "Failed to load tracker");
        setItems([]);
      });
  }, []);

  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = { all: 0, saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
    for (const it of items ?? []) {
      c.all += 1;
      c[statusOf(it.stage)] += 1;
    }
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items ?? []).filter(
      (it) =>
        (tab === "all" || statusOf(it.stage) === tab) &&
        (!needle || `${it.job.title} ${it.job.company} ${it.notes ?? ""}`.toLowerCase().includes(needle))
    );
  }, [items, tab, q]);

  const patch = useCallback(
    async (item: TrackerApplication, body: Record<string, unknown>, message?: string) => {
      setError(null);
      const before = items;
      // Optimistic for status / follow-up so the select feels instant.
      setItems((prev) => (prev ?? []).map((row) => (row.id === item.id ? ({ ...row, ...("stage" in body ? { stage: String(body.stage) } : {}) } as TrackerApplication) : row)));
      try {
        const res = await apiFetch<{ application: TrackerApplication }>(`/tracker/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setItems((prev) => (prev ?? []).map((row) => (row.id === item.id ? res.application : row)));
        if (message) note(message);
        return true;
      } catch (err) {
        setItems(before);
        setError(err instanceof Error ? err.message : "Could not save the change");
        return false;
      }
    },
    [items, note]
  );

  async function remove(item: TrackerApplication) {
    if (!window.confirm(`Delete “${item.job.title}” from your tracker?`)) return;
    try {
      await apiFetch(`/tracker/${item.id}`, { method: "DELETE" });
      setItems((prev) => (prev ?? []).filter((row) => row.id !== item.id));
      note("Removed from tracker");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the job");
    }
  }

  async function addCard(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const res = await apiFetch<{ application: TrackerApplication }>("/tracker/custom", {
        method: "POST",
        body: JSON.stringify({ title, company, stage: "shortlist" }),
      });
      setItems((prev) => [res.application, ...(prev ?? [])]);
      setTitle("");
      setCompany("");
      note("Added to Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the job");
    }
  }

  return (
    <>
      <WorkspaceHeader
        icon={<SquareKanban size={22} />}
        title="Tracker"
        sub="Every job you saved or applied to, with its status, resume, ATS match, notes and follow-up date."
        actions={
          <Link href="/user/jobs" className={cx(s.btn, s.primary)}>
            <Briefcase size={15} aria-hidden="true" />
            Find live jobs
          </Link>
        }
      />

      <form className={cx(w.panel, w.addForm)} onSubmit={(event) => void addCard(event)} aria-label="Add a job you found elsewhere">
        <input aria-label="New job title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title (found elsewhere)" className={w.input} />
        <input aria-label="New company" required maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className={w.input} />
        <button type="submit" className={cx(s.btn, w.btnFull)} style={{ height: 42 }}>
          <Plus size={15} aria-hidden="true" />
          Add job
        </button>
      </form>

      <div className={j.tBar}>
        <div className={j.tabs} role="tablist" aria-label="Filter by status">
          {STATUS_TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={cx(j.tab, tab === t.key && j.tabOn)} onClick={() => setTab(t.key)}>
              {t.label}
              <em>{counts[t.key]}</em>
            </button>
          ))}
        </div>
        <div className={w.inputIco}>
          <Search size={16} aria-hidden="true" />
          <input type="search" className={w.input} placeholder="Search title, company, notes…" aria-label="Search tracker" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {error && (
        <p role="alert" className={cx(w.msg, w.msgErr)}>
          {error}
        </p>
      )}
      {toast && (
        <div role="status" className={w.toast}>
          {toast}
        </div>
      )}

      {items === null ? (
        <ul className={j.tList} aria-busy="true" aria-label="Loading tracker">
          {[0, 1, 2].map((i) => (
            <li key={i} className={j.skel} style={{ height: 150 }} />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className={cx(w.panel, j.empty)}>
          <span className={j.emptyIco} aria-hidden="true">
            <SquareKanban size={26} />
          </span>
          <h2>Your tracker is empty</h2>
          <p>Browse real, live jobs matched to your resume. “Save to Tracker” or “Apply & Track” adds them here automatically.</p>
          <Link href="/user/jobs" className={cx(s.btn, s.primary)}>
            <Briefcase size={15} aria-hidden="true" />
            Browse live jobs
          </Link>
        </div>
      ) : shown.length === 0 ? (
        <div className={cx(w.panel, j.empty)}>
          <h2>Nothing here</h2>
          <p>No tracked jobs match this status or search.</p>
          <button
            type="button"
            className={s.btn}
            onClick={() => {
              setTab("all");
              setQ("");
            }}
          >
            Show all
          </button>
        </div>
      ) : (
        <ul className={j.tList} aria-label="Tracked jobs">
          {shown.map((item) => (
            <TrackerItem key={item.id} item={item} onPatch={patch} onRemove={(it) => void remove(it)} />
          ))}
        </ul>
      )}
    </>
  );
}

export default function TrackerPage() {
  return (
    <UserWorkspace active="tracker">
      <TrackerView />
    </UserWorkspace>
  );
}
