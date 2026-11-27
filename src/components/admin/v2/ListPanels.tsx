"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Range } from "./types";
import { RANGE_LONG } from "./types";
import { ago, cx, num, pkt } from "./format";
import s from "./AdminV2.module.css";

function useLoad<T>(path: string, delay = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setData(await apiFetch<T>(path));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load");
    }
  }, [path]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), delay);
    return () => window.clearTimeout(t);
  }, [load, delay]);
  return { data, error, reload: load };
}

/* ---------- Leads ---------- */
type Lead = { id: string; type: "contact" | "signup"; name: string; email: string; note: string; delivered: boolean | null; createdAt: string; country: string | null; plan: string | null };
export function LeadsPanel({ range }: { range: Range }) {
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const q = new URLSearchParams({ range, type });
  if (search.trim()) q.set("search", search.trim());
  const { data, error } = useLoad<{ contact: number; signups: number; leads: Lead[] }>(`/admin/leads?${q}`, search ? 300 : 0);
  return (
    <>
      <div className={s.sh}>
        <div>
          <h2>Leads</h2>
          <p>Contact-form messages and new sign-ups · {RANGE_LONG[range]}</p>
        </div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}
      <section className={cx(s.card, s.pad)}>
        <div className={s.ttl}>
          <div>
            <h3>{data ? num(data.contact + data.signups) : "…"} leads</h3>
            <small>{data ? `${num(data.contact)} contact · ${num(data.signups)} sign-ups` : "Loading…"}</small>
          </div>
          <div className={s.filters}>
            <label className="sr-only" htmlFor="v2-lead-search">Search leads</label>
            <input id="v2-lead-search" type="search" className={cx(s.input, s.search)} placeholder="Search name or email" value={search} maxLength={200} onChange={(e) => setSearch(e.target.value)} />
            <label className="sr-only" htmlFor="v2-lead-type">Type</label>
            <select id="v2-lead-type" className={s.select} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">Type: All</option>
              <option value="contact">Contact form</option>
              <option value="signup">Sign-ups</option>
            </select>
          </div>
        </div>
        <div className={s.tw}>
          <table className={cx(s.table, s.rt)}>
            <thead><tr><th>Type</th><th>Name</th><th>Email</th><th>Message / details</th><th>When</th></tr></thead>
            <tbody>
              {data && data.leads.length === 0 && <tr><td colSpan={5} className={cx(s.empty, s.tdFull)}>No leads in this range yet.</td></tr>}
              {data?.leads.map((l) => (
                <tr key={l.id}>
                  <td data-l="Type">
                    <span className={cx(s.pill, l.type === "contact" ? s.pV : s.pG)}>
                      {l.type === "contact" ? <Mail size={11} aria-hidden="true" /> : <UserPlus size={11} aria-hidden="true" />}
                      {l.type === "contact" ? "Contact" : "Sign-up"}
                    </span>
                  </td>
                  <td data-l="Name">{l.name}</td>
                  <td data-l="Email" className={s.tdFull}><a href={`mailto:${l.email}`}>{l.email}</a></td>
                  <td data-l="Details" className={cx(s.tdWrap, s.tdFull)}>
                    {l.type === "contact" ? l.note : [l.plan === "PRO" ? "Pro plan" : "Free plan", l.country].filter(Boolean).join(" · ")}
                    {l.type === "contact" && l.delivered === false && <span className={s.mute}> (email not delivered)</span>}
                  </td>
                  <td data-l="When" title={pkt(l.createdAt)}>{ago(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ---------- Website pages ---------- */
type Pages = { publicPages: number; totalViews: number; pages: { path: string; views: number; visitors: number; public: boolean }[] };
export function PagesPanel({ range }: { range: Range }) {
  const { data, error } = useLoad<Pages>(`/admin/pages?range=${range}`);
  const max = Math.max(1, ...(data?.pages.map((p) => p.views) || [1]));
  return (
    <>
      <div className={s.sh}>
        <div>
          <h2>Website pages</h2>
          <p>{data ? `${num(data.publicPages)} public pages · ${num(data.totalViews)} views` : "Loading…"} · {RANGE_LONG[range]}</p>
        </div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}
      <div className={s.notice}>Page views are counted only for visitors who allowed analytics cookies.</div>
      <section className={cx(s.card, s.pad)}>
        <div className={s.tw}>
          <table className={cx(s.table, s.rt)}>
            <thead><tr><th>Page</th><th>Type</th><th className={s.right}>Views</th><th className={s.right}>Visitors</th><th>Share</th></tr></thead>
            <tbody>
              {data?.pages.map((p) => (
                <tr key={p.path}>
                  <td data-l="Page" className={cx(s.tdFull, s.amt)} style={{ overflowWrap: "anywhere" }}>{p.path}</td>
                  <td data-l="Type"><span className={cx(s.pill, p.public ? s.pB : s.pN)}>{p.public ? "Public" : "App"}</span></td>
                  <td data-l="Views" className={cx(s.right, s.amt)}>{num(p.views)}</td>
                  <td data-l="Visitors" className={s.right}>{num(p.visitors)}</td>
                  <td data-l="Share" className={s.tdFull} style={{ minWidth: 120 }}><div className={s.pgbar}><i style={{ width: `${(p.views / max) * 100}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ---------- Cookie consents ---------- */
type Consent = { id: string; anonId: string; userId: string | null; version: number; preferences: boolean; analytics: boolean; marketing: boolean; action: string; createdAt: string };
const ACTION_LABEL: Record<string, [string, string]> = { accept_all: ["Accept all", s.pG], reject_all: ["Reject all", s.pR], custom: ["Custom", s.pA] };
export function ConsentsPanel() {
  const [action, setAction] = useState("all");
  const [skip, setSkip] = useState(0);
  const { data, error } = useLoad<{ entries: Consent[]; total: number; totals: Record<string, number> }>(`/admin/consents?action=${action}&take=50&skip=${skip}`);
  const t = data?.totals || {};
  const all = (t.accept_all || 0) + (t.reject_all || 0) + (t.custom || 0);
  return (
    <>
      <div className={s.sh}>
        <div><h2>Cookie consents</h2><p>Every choice saved in the cookie banner (anonymous visitor IDs are shortened)</p></div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}
      <div className={s.bill}>
        {[["All choices", all, s.bcHero], ["Accept all", t.accept_all || 0, ""], ["Reject all", t.reject_all || 0, ""], ["Custom", t.custom || 0, ""]].map(([label, v, cls]) => (
          <div key={String(label)} className={cx(s.card, s.bc, String(cls))}>
            <div className={s.kl}><span>{label}</span></div>
            <div className={s.kv}>{num(Number(v))}</div>
            <div className={s.kd}>{all ? `${((Number(v) / all) * 100).toFixed(0)}% of choices` : "No choices yet"}</div>
          </div>
        ))}
      </div>
      <section className={cx(s.card, s.pad)} style={{ marginTop: 18 }}>
        <div className={s.ttl}>
          <div><h3>Latest choices</h3><small>{data ? `${num(data.total)} entries` : "Loading…"}</small></div>
          <select className={s.select} aria-label="Filter by choice" value={action} onChange={(e) => { setAction(e.target.value); setSkip(0); }}>
            <option value="all">Choice: All</option>
            <option value="accept_all">Accept all</option>
            <option value="reject_all">Reject all</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className={s.tw}>
          <table className={cx(s.table, s.rt)}>
            <thead><tr><th>When</th><th>Choice</th><th className={s.center}>Preferences</th><th className={s.center}>Analytics</th><th className={s.center}>Marketing</th><th>Visitor</th><th>Signed in</th></tr></thead>
            <tbody>
              {data && data.entries.length === 0 && <tr><td colSpan={7} className={cx(s.empty, s.tdFull)}>No consent choices yet.</td></tr>}
              {data?.entries.map((e) => (
                <tr key={e.id}>
                  <td data-l="When">{pkt(e.createdAt)}</td>
                  <td data-l="Choice"><span className={cx(s.pill, ACTION_LABEL[e.action]?.[1] || s.pN)}>{ACTION_LABEL[e.action]?.[0] || e.action}</span></td>
                  <td data-l="Preferences" className={s.center}>{e.preferences ? "Yes" : "No"}</td>
                  <td data-l="Analytics" className={s.center}>{e.analytics ? "Yes" : "No"}</td>
                  <td data-l="Marketing" className={s.center}>{e.marketing ? "Yes" : "No"}</td>
                  <td data-l="Visitor">{e.anonId} · v{e.version}</td>
                  <td data-l="Signed in">{e.userId ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.foot}>
          <span>{data ? `Showing ${data.entries.length ? skip + 1 : 0}–${skip + data.entries.length} of ${num(data.total)}` : ""}</span>
          <div className={s.acts}>
            <button type="button" className={cx(s.btn, s.sm)} disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 50))}>Prev</button>
            <button type="button" className={cx(s.btn, s.sm)} disabled={!data || skip + 50 >= data.total} onClick={() => setSkip(skip + 50)}>Next</button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------- Audit log ---------- */
type Audit = { id: string; adminEmail: string; action: string; targetType: string; targetId: string | null; details: unknown; ip: string | null; createdAt: string };
export function AuditPanel() {
  const [action, setAction] = useState("");
  const [skip, setSkip] = useState(0);
  const q = new URLSearchParams({ take: "50", skip: String(skip) });
  if (action) q.set("action", action);
  const { data, error } = useLoad<{ entries: Audit[]; total: number }>(`/admin/audit?${q}`);
  return (
    <>
      <div className={s.sh}>
        <div><h2>Audit log</h2><p>Every admin action: users, team, templates, resumes and settings</p></div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}
      <section className={cx(s.card, s.pad)}>
        <div className={s.ttl}>
          <div><h3>{data ? `${num(data.total)} entries` : "Loading…"}</h3><small>Newest first · PKT</small></div>
          <select className={s.select} aria-label="Filter by action" value={action} onChange={(e) => { setAction(e.target.value); setSkip(0); }}>
            <option value="">Action: All</option>
            <option value="user.">Users</option>
            <option value="team.">Team</option>
            <option value="template">Templates</option>
            <option value="resume">Resumes</option>
            <option value="settings">Settings</option>
          </select>
        </div>
        <div className={s.tw}>
          <table className={cx(s.table, s.rt)}>
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>
              {data && data.entries.length === 0 && <tr><td colSpan={5} className={cx(s.empty, s.tdFull)}>No admin actions recorded yet.</td></tr>}
              {data?.entries.map((e) => (
                <tr key={e.id}>
                  <td data-l="When">{pkt(e.createdAt)}</td>
                  <td data-l="Admin" className={s.tdFull}>{e.adminEmail}</td>
                  <td data-l="Action"><span className={cx(s.pill, e.action.includes("delete") || e.action.includes("remove") ? s.pR : e.action.includes("suspend") ? s.pA : s.pB)}>{e.action}</span></td>
                  <td data-l="Target">{e.targetType}{e.targetId ? ` · ${e.targetId.slice(0, 10)}` : ""}</td>
                  <td data-l="Details" className={cx(s.tdWrap, s.tdFull)}><code style={{ fontSize: 11.5 }}>{e.details ? JSON.stringify(e.details).slice(0, 220) : "—"}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.foot}>
          <span>{data ? `Showing ${data.entries.length ? skip + 1 : 0}–${skip + data.entries.length} of ${num(data.total)}` : ""}</span>
          <div className={s.acts}>
            <button type="button" className={cx(s.btn, s.sm)} disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 50))}>Prev</button>
            <button type="button" className={cx(s.btn, s.sm)} disabled={!data || skip + 50 >= data.total} onClick={() => setSkip(skip + 50)}>Next</button>
          </div>
        </div>
      </section>
    </>
  );
}
