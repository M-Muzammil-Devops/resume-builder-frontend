"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, Eye, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import type { AdminAccess, AdminUserRow } from "./types";
import { ago, cx, flag, initials, num, pkt } from "./format";
import s from "./AdminV2.module.css";

type Detail = {
  user: { id: string; email: string; name: string | null; createdAt: string; lastLoginAt: string | null; emailVerifiedAt: string | null; _count: { resumes: number; loginEvents: number; exportEvents: number } };
  logins: { id: string; createdAt: string; city: string | null; country: string | null; countryCode: string | null; device: string | null; browser: string | null; os: string | null }[];
  pageViews: { id: string; path: string; createdAt: string }[];
};

const PAGE = 25;

export function PlanPill({ plan }: { plan: string }) {
  return <span className={cx(s.pill, plan === "PRO" ? s.pV : s.pB)}>{plan === "PRO" ? "Pro" : "Free"}</span>;
}
export function StatusPill({ status }: { status: string }) {
  const cls = status === "ACTIVE" ? s.pG : status === "SUSPENDED" ? s.pA : s.pR;
  return <span className={cx(s.pill, cls)}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

export function UsersPanel({ access, onChanged }: { access: AdminAccess | null; onChanged: () => void }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [skip, setSkip] = useState(0);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<AdminUserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ take: String(PAGE), skip: String(skip), plan, status });
      if (search.trim()) q.set("search", search.trim());
      const res = await apiFetch<{ users: AdminUserRow[]; total: number }>(`/admin/users?${q}`);
      setRows(res.users);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [search, plan, status, skip]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, search]);

  async function act(u: AdminUserRow, kind: "suspend" | "activate" | "delete" | "plan", value?: string) {
    if (kind === "delete" && !window.confirm(`Delete ${u.email}? The account is closed and hidden; support can still restore it.`)) return;
    if (kind === "suspend" && !window.confirm(`Suspend ${u.email}? They are signed out and cannot sign in until re-activated.`)) return;
    setBusyId(u.id);
    setError(null);
    try {
      if (kind === "delete") await apiFetch(`/admin/users/${encodeURIComponent(u.id)}`, { method: "DELETE" });
      else if (kind === "plan") await apiFetch(`/admin/users/${encodeURIComponent(u.id)}/plan`, { method: "PATCH", body: JSON.stringify({ plan: value }) });
      else await apiFetch(`/admin/users/${encodeURIComponent(u.id)}/status`, { method: "PATCH", body: JSON.stringify({ status: kind === "suspend" ? "SUSPENDED" : "ACTIVE" }) });
      await load();
      onChanged();
      if (view?.id === u.id) {
        setView(kind === "delete" ? null : { ...u, ...(kind === "plan" ? { plan: value as "FREE" | "PRO" } : { status: kind === "suspend" ? "SUSPENDED" : "ACTIVE" }) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const canWrite = Boolean(access?.canWrite);
  const canDelete = Boolean(access?.canDelete);

  return (
    <>
      <div className={s.sh}>
        <div>
          <h2>Users</h2>
          <p>Search, filter and manage accounts · {num(total)} found</p>
        </div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}
      <section className={cx(s.card, s.pad)}>
        <div className={cx(s.filters)} style={{ marginBottom: 14 }}>
          <label className="sr-only" htmlFor="v2-user-search">Search users</label>
          <input id="v2-user-search" type="search" className={cx(s.input, s.search)} placeholder="Search by email or name" value={search} maxLength={200}
            onChange={(e) => { setSearch(e.target.value); setSkip(0); }} />
          <label className="sr-only" htmlFor="v2-user-plan">Plan</label>
          <select id="v2-user-plan" className={s.select} value={plan} onChange={(e) => { setPlan(e.target.value); setSkip(0); }}>
            <option value="all">Plan: All</option>
            <option value="FREE">Free</option>
            <option value="PRO">Pro</option>
          </select>
          <label className="sr-only" htmlFor="v2-user-status">Status</label>
          <select id="v2-user-status" className={s.select} value={status} onChange={(e) => { setStatus(e.target.value); setSkip(0); }}>
            <option value="all">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DELETED">Deleted</option>
          </select>
        </div>
        <div className={s.tw}>
          <table className={cx(s.table, s.rt)}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Location</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last active</th>
                <th className={s.right}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className={cx(s.empty, s.tdFull)}>{search.trim() ? `No users match "${search.trim()}".` : "No users yet."}</td></tr>
              )}
              {rows.map((u) => {
                const loc = [u.city, u.country].filter(Boolean).join(", ") || u.location || "—";
                return (
                  <tr key={u.id}>
                    <td className={s.tdFull}>
                      <div className={s.u}>
                        <span className={cx(s.av, s.avSm)} aria-hidden="true">{initials(u.name, u.email)}</span>
                        <b>{u.name || u.email.split("@")[0]}</b>
                      </div>
                    </td>
                    <td data-l="Email" className={s.tdFull}>{u.email}</td>
                    <td data-l="Location">{flag(u.countryCode)} {loc}</td>
                    <td data-l="Plan"><PlanPill plan={u.plan} /></td>
                    <td data-l="Status"><StatusPill status={u.status} /></td>
                    <td data-l="Joined">{pkt(u.createdAt, false)}</td>
                    <td data-l="Last active">{ago(u.lastActiveAt)}</td>
                    <td className={cx(s.right, s.tdFull)}>
                      <div className={s.acts}>
                        <button type="button" className={cx(s.btn, s.sm, s.iconOnly)} onClick={() => setView(u)} aria-label={`View ${u.email}`} title="View details">
                          <Eye size={14} />
                        </button>
                        {u.status !== "DELETED" && u.role !== "admin" && canWrite && (
                          u.status === "SUSPENDED" ? (
                            <button type="button" className={cx(s.btn, s.sm, s.iconOnly)} disabled={busyId === u.id} onClick={() => void act(u, "activate")} aria-label={`Activate ${u.email}`} title="Activate">
                              <CheckCircle2 size={14} />
                            </button>
                          ) : (
                            <button type="button" className={cx(s.btn, s.sm, s.iconOnly)} disabled={busyId === u.id} onClick={() => void act(u, "suspend")} aria-label={`Suspend ${u.email}`} title="Suspend">
                              <Ban size={14} />
                            </button>
                          )
                        )}
                        {u.status !== "DELETED" && u.role !== "admin" && canDelete && (
                          <button type="button" className={cx(s.btn, s.sm, s.iconOnly, s.danger)} disabled={busyId === u.id} onClick={() => void act(u, "delete")} aria-label={`Delete ${u.email}`} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={s.foot}>
          <span>{loading ? "Loading…" : `Showing ${rows.length ? skip + 1 : 0}–${skip + rows.length} of ${num(total)}`}</span>
          <div className={s.acts}>
            <button type="button" className={cx(s.btn, s.sm)} disabled={skip === 0 || loading} onClick={() => setSkip(Math.max(0, skip - PAGE))}>Prev</button>
            <button type="button" className={cx(s.btn, s.sm)} disabled={skip + PAGE >= total || loading} onClick={() => setSkip(skip + PAGE)}>Next</button>
          </div>
        </div>
      </section>
      {view && <UserDrawer user={view} onClose={() => setView(null)} canWrite={canWrite} busy={busyId === view.id} onPlan={(p) => void act(view, "plan", p)} />}
    </>
  );
}

function UserDrawer({ user, onClose, canWrite, busy, onPlan }: { user: AdminUserRow; onClose: () => void; canWrite: boolean; busy: boolean; onPlan: (plan: string) => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEscapeClose(onClose);
  useEffect(() => {
    let alive = true;
    apiFetch<Detail>(`/admin/activity/users/${encodeURIComponent(user.id)}`)
      .then((d) => alive && setDetail(d))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Could not load details"));
    return () => {
      alive = false;
    };
  }, [user.id]);
  const loc = [user.city, user.country].filter(Boolean).join(", ") || user.location || "—";
  return (
    <div className={s.drawerBack} role="presentation" onClick={onClose}>
      <aside className={s.drawer} role="dialog" aria-modal="true" aria-label={`User ${user.email}`} onClick={(e) => e.stopPropagation()}>
        <div className={s.drawerHead}>
          <div className={s.u}>
            <span className={s.av} aria-hidden="true">{initials(user.name, user.email)}</span>
            <div style={{ minWidth: 0 }}>
              <b style={{ display: "block" }}>{user.name || user.email.split("@")[0]}</b>
              <small className={s.mute} style={{ overflowWrap: "anywhere" }}>{user.email}</small>
            </div>
          </div>
          <button type="button" className={s.icoBtn} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <dl className={s.kvList}>
          <dt>Status</dt><dd><StatusPill status={user.status} /></dd>
          <dt>Plan</dt>
          <dd>
            <PlanPill plan={user.plan} />{" "}
            {canWrite && user.status !== "DELETED" && (
              <button type="button" className={cx(s.btn, s.sm)} disabled={busy} onClick={() => onPlan(user.plan === "PRO" ? "FREE" : "PRO")}>
                {user.plan === "PRO" ? "Move to Free" : "Upgrade to Pro"}
              </button>
            )}
          </dd>
          <dt>Location</dt><dd>{flag(user.countryCode)} {loc}</dd>
          <dt>Joined</dt><dd>{pkt(user.createdAt)}</dd>
          <dt>Last active</dt><dd>{pkt(user.lastActiveAt)}</dd>
          <dt>Verified</dt><dd>{user.emailVerifiedAt ? pkt(user.emailVerifiedAt, false) : "Not verified"}</dd>
          <dt>Resumes</dt><dd>{num(detail?.user._count.resumes ?? user.resumes)}</dd>
          <dt>Exports</dt><dd>{detail ? num(detail.user._count.exportEvents) : "…"}</dd>
          <dt>Sign-ins</dt><dd>{detail ? num(detail.user._count.loginEvents) : "…"}</dd>
        </dl>
        {error && <div className={s.error} style={{ marginTop: 16 }}>{error}</div>}
        <h4 style={{ margin: "22px 0 8px", fontSize: 13 }}>Recent sign-ins</h4>
        {detail && detail.logins.length === 0 && <p className={s.mute}>No sign-ins recorded.</p>}
        {detail?.logins.slice(0, 8).map((l) => (
          <div key={l.id} className={s.it}>
            <div className={s.itMain}>
              <b>{flag(l.countryCode)} {[l.city, l.country].filter(Boolean).join(", ") || "Unknown location"}</b>
              <small>{[l.device, l.browser, l.os].filter(Boolean).join(" · ") || "—"}</small>
            </div>
            <div className={s.itR}><span className={s.mute}>{ago(l.createdAt)}</span></div>
          </div>
        ))}
        {detail && detail.pageViews.length > 0 && (
          <>
            <h4 style={{ margin: "22px 0 8px", fontSize: 13 }}>Recent pages</h4>
            {detail.pageViews.slice(0, 8).map((p) => (
              <div key={p.id} className={s.it}>
                <div className={s.itMain}><b>{p.path}</b></div>
                <div className={s.itR}><span className={s.mute}>{ago(p.createdAt)}</span></div>
              </div>
            ))}
          </>
        )}
      </aside>
    </div>
  );
}
