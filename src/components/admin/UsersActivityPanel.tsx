"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Globe2, Laptop, Monitor, RotateCcw, Search, Smartphone, Tablet, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { adminBlob, flagOf, fmtDate, localDayBound, saveBlob } from "./adminFetch";
import s from "./AdminPanels.module.css";

type LoginRow = {
  id: string;
  createdAt: string;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  user: { id: string; email: string; name: string | null; role: string };
};

type Facets = { countries: { country: string; count: number }[]; devices: { device: string; count: number }[]; geoDb: boolean };
type Summary = { days: number; pageViews: number; visitors: number; topPaths: { path: string; views: number }[]; consent: Record<string, number> };
type Detail = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    lastLoginAt: string | null;
    emailVerifiedAt: string | null;
    _count: { resumes: number; loginEvents: number; exportEvents: number };
  };
  logins: LoginRow[];
  pageViews: { id: string; path: string; device: string | null; createdAt: string }[];
};

const PAGE = 50;
const EMPTY = { search: "", from: "", to: "", country: "", device: "" };

function DeviceIcon({ device }: { device: string | null }) {
  if (device === "mobile") return <Smartphone size={14} aria-hidden="true" />;
  if (device === "tablet") return <Tablet size={14} aria-hidden="true" />;
  if (device === "desktop") return <Monitor size={14} aria-hidden="true" />;
  return <Laptop size={14} aria-hidden="true" />;
}

function place(r: Pick<LoginRow, "city" | "region" | "country">) {
  return [r.city, r.region !== r.city ? r.region : null, r.country].filter(Boolean).join(", ") || "Unknown";
}

function filterParams(f: typeof EMPTY) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (!v) continue;
    p.set(k, k === "from" ? localDayBound(v, false) : k === "to" ? localDayBound(v, true) : v);
  }
  return p;
}

function query(f: typeof EMPTY, skip = 0) {
  const p = filterParams(f);
  if (skip) p.set("skip", String(skip));
  p.set("take", String(PAGE));
  return p.toString();
}

export function UsersActivityPanel() {
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [rows, setRows] = useState<LoginRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const load = useCallback(async (f: typeof EMPTY, offset: number) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ events: LoginRow[]; total: number }>(`/admin/activity?${query(f, offset)}`);
      setRows(res.events);
      setTotal(res.total);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load activity");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(applied, skip);
  }, [applied, skip, load]);

  useEffect(() => {
    apiFetch<Facets>("/admin/activity/facets").then(setFacets).catch(() => undefined);
    apiFetch<Summary>("/admin/analytics/summary?days=30").then(setSummary).catch(() => undefined);
  }, []);

  // Search box applies itself after a short pause; the other filters apply on change.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setApplied((a) => (a.search === filters.search ? a : { ...a, search: filters.search }));
      setSkip(0);
    }, 350);
    return () => window.clearTimeout(t);
  }, [filters.search]);

  function setFilter(key: keyof typeof EMPTY, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    if (key !== "search") {
      setApplied((a) => ({ ...a, [key]: value }));
      setSkip(0);
    }
  }

  async function exportCsv() {
    setError(null);
    try {
      const p = filterParams(applied);
      const { blob, filename } = await adminBlob(`/admin/activity/export.csv?${p.toString()}`);
      saveBlob(blob, filename || "user-activity.csv");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV export failed");
    }
  }

  async function openUser(id: string) {
    setDetailBusy(true);
    try {
      setDetail(await apiFetch<Detail>(`/admin/activity/users/${encodeURIComponent(id)}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the user");
    } finally {
      setDetailBusy(false);
    }
  }

  const closeDetail = useCallback(() => setDetail(null), []);
  useEscapeClose(closeDetail, Boolean(detail));

  const stats = useMemo(() => {
    const devices = facets?.devices || [];
    const all = devices.reduce((n, d) => n + d.count, 0);
    const mobile = devices.filter((d) => d.device === "mobile" || d.device === "tablet").reduce((n, d) => n + d.count, 0);
    return [
      { label: "Logins recorded", value: all.toLocaleString(), hint: `${total.toLocaleString()} match filters` },
      { label: "Countries", value: String((facets?.countries || []).filter((c) => c.country !== "Unknown").length), hint: facets?.countries?.[0] ? `Top: ${facets.countries[0].country}` : "—" },
      { label: "Mobile share", value: all ? `${Math.round((mobile / all) * 100)}%` : "—", hint: "phones + tablets" },
      { label: "Page views (30d)", value: summary ? summary.pageViews.toLocaleString() : "—", hint: summary ? `${summary.visitors} consenting visitors` : "analytics consent only" },
    ];
  }, [facets, summary, total]);

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.floor(skip / PAGE) + 1;
  const dirty = Object.values(applied).some(Boolean) || filters.search !== "";

  return (
    <div className={s.stack}>
      <div className={s.statGrid}>
        {stats.map((c) => (
          <div key={c.label} className={s.stat}>
            <span className={s.statLabel}>{c.label}</span>
            <strong className={s.statValue}>{c.value}</strong>
            <span className={s.statHint}>{c.hint}</span>
          </div>
        ))}
      </div>

      {facets && !facets.geoDb && (
        <p className={s.notice} role="status">
          <Globe2 size={15} aria-hidden="true" /> Location lookup is off: the GeoIP database is not installed on the server
          (run <code>npm run geoip:update</code> in the backend).
        </p>
      )}

      <section className={s.card} aria-label="Login activity">
        <div className={s.toolbar}>
          <label className={s.searchBox}>
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search</span>
            <input
              className={s.input}
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              placeholder="Search email, name, IP or city"
              maxLength={200}
            />
          </label>
          <label className={s.field}>
            <span>From</span>
            <input type="date" className={s.input} value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from", e.target.value)} />
          </label>
          <label className={s.field}>
            <span>To</span>
            <input type="date" className={s.input} value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to", e.target.value)} />
          </label>
          <label className={s.field}>
            <span>Country</span>
            <select className={s.input} value={filters.country} onChange={(e) => setFilter("country", e.target.value)}>
              <option value="">All countries</option>
              {(facets?.countries || []).map((c) => (
                <option key={c.country} value={c.country}>
                  {c.country} ({c.count})
                </option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            <span>Device</span>
            <select className={s.input} value={filters.device} onChange={(e) => setFilter("device", e.target.value)}>
              <option value="">All devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
              <option value="bot">Bot / script</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <div className={s.toolbarEnd}>
            {dirty && (
              <button type="button" className={s.btnGhost} onClick={() => { setFilters(EMPTY); setApplied(EMPTY); setSkip(0); }}>
                <RotateCcw size={14} aria-hidden="true" /> Reset
              </button>
            )}
            <button type="button" className={s.btn} onClick={() => void exportCsv()}>
              <Download size={14} aria-hidden="true" /> Export CSV
            </button>
          </div>
        </div>

        {error && <p className={s.error} role="alert">{error}</p>}

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Date &amp; time</th>
                <th scope="col">User</th>
                <th scope="col">IP address</th>
                <th scope="col">Location</th>
                <th scope="col">Device</th>
                <th scope="col">Browser</th>
              </tr>
            </thead>
            <tbody aria-busy={busy}>
              {!loaded && busy && (
                <tr>
                  <td colSpan={6} className={s.empty} role="status">Loading activity…</td>
                </tr>
              )}
              {loaded && !busy && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className={s.empty}>No logins match these filters.</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={s.nowrap}>{fmtDate(r.createdAt)}</td>
                  <td>
                    <button type="button" className={s.userLink} onClick={() => void openUser(r.user.id)} disabled={detailBusy}>
                      <span className={s.avatar} aria-hidden="true">{(r.user.name || r.user.email).slice(0, 1).toUpperCase()}</span>
                      <span className={s.userText}>
                        <span className={s.userEmail}>{r.user.email}</span>
                        {r.user.name && <span className={s.muted}>{r.user.name}</span>}
                      </span>
                      {r.user.role === "admin" && <span className={s.tag}>admin</span>}
                    </button>
                  </td>
                  <td className={s.mono}>{r.ip || "—"}</td>
                  <td>
                    <span className={s.place}>
                      {flagOf(r.countryCode) && <span aria-hidden="true">{flagOf(r.countryCode)}</span>}
                      {place(r)}
                    </span>
                  </td>
                  <td>
                    <span className={s.device}>
                      <DeviceIcon device={r.device} />
                      <span>
                        <span className={s.cap}>{r.device || "unknown"}</span>
                        <span className={s.muted}>{r.os || "—"}</span>
                      </span>
                    </span>
                  </td>
                  <td className={s.nowrap}>{r.browser || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={s.pager}>
          <span className={s.muted}>
            {!loaded ? "Loading…" : total ? `${skip + 1}–${Math.min(skip + PAGE, total)} of ${total.toLocaleString()}` : "0 results"}
          </span>
          <div className={s.pagerBtns}>
            <button type="button" className={s.btnGhost} disabled={page <= 1 || busy} onClick={() => setSkip(Math.max(0, skip - PAGE))}>Previous</button>
            <span className={s.muted}>Page {page} / {pages}</span>
            <button type="button" className={s.btnGhost} disabled={page >= pages || busy} onClick={() => setSkip(skip + PAGE)}>Next</button>
          </div>
        </div>
      </section>

      {summary && summary.topPaths.length > 0 && (
        <section className={s.card} aria-label="Top pages">
          <h3 className={s.cardTitle}>Top pages, last 30 days <span className={s.muted}>(visitors who allowed analytics)</span></h3>
          <ul className={s.barList}>
            {summary.topPaths.map((p) => (
              <li key={p.path}>
                <span className={s.mono}>{p.path}</span>
                <span className={s.bar} style={{ width: `${Math.max(4, (p.views / summary.topPaths[0].views) * 100)}%` }} />
                <strong>{p.views}</strong>
              </li>
            ))}
          </ul>
          <p className={s.muted}>
            Consent choices: {summary.consent.accept_all || 0} accepted all · {summary.consent.reject_all || 0} rejected · {summary.consent.custom || 0} customized
          </p>
        </section>
      )}

      <p className={s.attrib}>
        IP geolocation by <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer">DB-IP</a> (CC BY 4.0), looked up offline on the server.
      </p>

      {detail && (
        <div className={s.drawerBack} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDetail(); }}>
          <aside className={s.drawer} role="dialog" aria-modal="true" aria-labelledby="rb-user-detail">
            <header className={s.drawerHead}>
              <span className={s.avatarLg} aria-hidden="true">{(detail.user.name || detail.user.email).slice(0, 1).toUpperCase()}</span>
              <div className={s.drawerTitle}>
                <h3 id="rb-user-detail">{detail.user.name || detail.user.email}</h3>
                <span className={s.muted}>{detail.user.email}</span>
              </div>
              <button type="button" className={s.iconBtn} onClick={closeDetail} aria-label="Close">
                <X size={18} />
              </button>
            </header>
            <dl className={s.kv}>
              <div><dt>Role</dt><dd>{detail.user.role}</dd></div>
              <div><dt>Joined</dt><dd>{fmtDate(detail.user.createdAt)}</dd></div>
              <div><dt>Last login</dt><dd>{fmtDate(detail.user.lastLoginAt)}</dd></div>
              <div><dt>Email verified</dt><dd>{detail.user.emailVerifiedAt ? fmtDate(detail.user.emailVerifiedAt) : "No"}</dd></div>
              <div><dt>Resumes</dt><dd>{detail.user._count.resumes}</dd></div>
              <div><dt>Exports</dt><dd>{detail.user._count.exportEvents}</dd></div>
            </dl>
            <h4 className={s.cardTitle}>Login history ({detail.user._count.loginEvents})</h4>
            <ol className={s.timeline}>
              {detail.logins.length === 0 && <li className={s.muted}>No logins recorded.</li>}
              {detail.logins.map((l) => (
                <li key={l.id}>
                  <span className={s.dot} aria-hidden="true" />
                  <div>
                    <strong>{fmtDate(l.createdAt)}</strong>
                    <span className={s.muted}>
                      {flagOf(l.countryCode)} {place(l)} · <span className={s.mono}>{l.ip || "—"}</span>
                    </span>
                    <span className={s.muted}>
                      <span className={s.cap}>{l.device || "unknown"}</span> · {[l.browser, l.os].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            {detail.pageViews.length > 0 && (
              <>
                <h4 className={s.cardTitle}>Recent pages (analytics consent)</h4>
                <ul className={s.simpleList}>
                  {detail.pageViews.map((p) => (
                    <li key={p.id}>
                      <span className={s.mono}>{p.path}</span>
                      <span className={s.muted}>{fmtDate(p.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
