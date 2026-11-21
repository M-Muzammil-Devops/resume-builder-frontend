"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  FileUp,
  LayoutDashboard,
  LogOut,
  MapPin,
  Trash2,
  Users,
} from "lucide-react";
import { ApiError, apiFetch, getRefreshToken, getToken, logoutSession, refreshAdminCookie } from "@/lib/api";
import { ADMIN_LOGIN_PATH, USER_HOME_PATH } from "@/lib/adminSession";

type Stats = {
  totals: {
    users: number;
    newUsersToday: number;
    newUsersMonth: number;
    oldUsers: number;
    dailyActive: number;
    monthlyActive: number;
    loginsToday: number;
    templates: number;
    resumes: number;
  };
  locations: { country: string; count: number }[];
  recentUsers: {
    id: string;
    email: string;
    name: string | null;
    location: string | null;
    country: string | null;
    createdAt: string;
    lastLoginAt: string | null;
  }[];
  redis: { enabled: boolean; active: boolean; reason: string };
};

type AdminTemplate = {
  id: string;
  name: string;
  department: string;
  hasPhoto: boolean;
  columns: string;
  image: string;
  isActive: boolean;
  accentColor: string;
  fontFamily: string;
  layoutKey: string;
};

const DEPTS = [
  "DevOps",
  "Cloud",
  "SRE",
  "Platform",
  "Software Engineering",
  "Data",
  "Design",
  "Marketing",
  "Product",
  "Security",
  "General",
];

export type AdminTab = "overview" | "templates" | "users";
type Tab = AdminTab;

/** BUG-1220: each tab has its own URL (/admin, /admin/templates, /admin/users). */
const TAB_PATH: Record<Tab, string> = { overview: "/admin", templates: "/admin/templates", users: "/admin/users" };
const NAV = [
  ["overview", "Overview", LayoutDashboard],
  ["templates", "Templates", FileUp],
  ["users", "Users", Users],
] as const;

function tabFromPath(path: string): Tab {
  const hit = (Object.keys(TAB_PATH) as Tab[]).find((t) => TAB_PATH[t] === path.replace(/\/+$/, ""));
  return hit || "overview";
}

export default function AdminConsole({ initialTab = "overview" }: { initialTab?: Tab }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab);

  function selectTab(next: Tab) {
    setTab(next);
    if (window.location.pathname !== TAB_PATH[next]) window.history.pushState(null, "", TAB_PATH[next]);
  }

  useEffect(() => {
    const onPop = () => setTab(tabFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function signOut() {
    void logoutSession().finally(() => window.location.assign(ADMIN_LOGIN_PATH));
  }
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [users, setUsers] = useState<Stats["recentUsers"]>([]);
  const [busy, setBusy] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchBusy, setUserSearchBusy] = useState(false);

  // upload form
  const [form, setForm] = useState({
    name: "",
    blurb: "",
    department: "General",
    hasPhoto: "true",
    columns: "double",
    layoutKey: "high-performer",
    accentColor: "#1c2b42",
    fontFamily: "Lato",
  });
  const [pdf, setPdf] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);

  async function bootstrap() {
    // Sign-in lives at /admin/login; this page only ever shows the console.
    if (!getToken() && !getRefreshToken()) {
      window.location.replace(ADMIN_LOGIN_PATH);
      return;
    }
    try {
      await apiFetch<{ user: { role: string } }>("/admin/me");
    } catch (err) {
      // 403: signed in, but not an admin. Anything else: sign in again.
      window.location.replace(
        err instanceof ApiError && err.status === 403 ? USER_HOME_PATH : `${ADMIN_LOGIN_PATH}?reason=session`
      );
      return;
    }
    // Keep the HttpOnly page-guard cookie in step with the (possibly refreshed) token.
    void refreshAdminCookie();
    setAuthed(true);
    setReady(true);
    try {
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin data");
    }
  }

  async function loadAll() {
    const [s, t, u] = await Promise.all([
      apiFetch<Stats>("/admin/stats"),
      apiFetch<{ templates: AdminTemplate[] }>("/admin/templates"),
      apiFetch<{ users: Stats["recentUsers"] }>("/admin/users?take=100"),
    ]);
    setStats(s);
    setTemplates(t.templates);
    setUsers(u.users);
  }

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** BUG-800: server-side user search (GET /admin/users?search=), debounced. */
  useEffect(() => {
    if (tab !== "users") return;
    const q = userSearch.trim();
    const t = window.setTimeout(() => {
      setUserSearchBusy(true);
      apiFetch<{ users: Stats["recentUsers"] }>(
        `/admin/users?take=100${q ? `&search=${encodeURIComponent(q)}` : ""}`
      )
        .then((res) => setUsers(res.users))
        .catch(() => undefined)
        .finally(() => setUserSearchBusy(false));
    }, q ? 300 : 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  /** BUG-801: admins can remove user accounts (the API refuses admin accounts). */
  async function deleteUser(id: string, email: string) {
    if (!window.confirm(`Delete ${email}? Their resumes and data are removed permanently.`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      setUsers((list) => list.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the user");
    } finally {
      setBusy(false);
    }
  }

  async function uploadTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!pdf) {
      setError("PDF is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("pdf", pdf);
      if (preview) fd.append("preview", preview);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      await apiFetch("/admin/templates", { method: "POST", body: fd, headers: {} });
      setPdf(null);
      setPreview(null);
      setForm((f) => ({ ...f, name: "", blurb: "" }));
      await loadAll();
      selectTab("templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await apiFetch(`/admin/templates/${id}`, { method: "DELETE" });
    await loadAll();
  }

  async function toggleActive(t: AdminTemplate) {
    await apiFetch(`/admin/templates/${t.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    await loadAll();
  }

  const cards = useMemo(() => {
    if (!stats) return [];
    const t = stats.totals;
    return [
      { label: "Total users", value: t.users, hint: `${t.oldUsers} returning` },
      { label: "New today", value: t.newUsersToday, hint: `${t.newUsersMonth} this month` },
      { label: "Daily active", value: t.dailyActive, hint: `${t.monthlyActive} monthly` },
      { label: "Templates", value: t.templates, hint: `${t.resumes} resumes` },
    ];
  }, [stats]);

  if (!ready) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading admin…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center text-sm text-slate-400">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="admin-root min-h-screen">
      {/* BUG-1210: below 900px the sidebar is hidden, so a top bar carries the same nav. */}
      <nav className="admin-topnav" aria-label="Admin">
        <span className="admin-topnav-brand">Admin</span>
        {NAV.map(([id, label, Icon]) => (
          <a
            key={id}
            href={TAB_PATH[id]}
            aria-current={tab === id ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              selectTab(id);
            }}
            className={`admin-topnav-link ${tab === id ? "active" : ""}`}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </a>
        ))}
        <button type="button" className="admin-topnav-link" onClick={signOut}>
          <LogOut size={15} aria-hidden="true" />
          Sign out
        </button>
      </nav>
      <aside className="admin-side">
        <div className="px-4 py-5">
          <div className="text-sm font-bold tracking-wide text-cyan-300">ResumeBuilder</div>
          <div className="text-xs text-slate-400">Admin console</div>
        </div>
        <nav className="space-y-1 px-2" aria-label="Admin sections">
          {NAV.map(([id, label, Icon]) => (
            <a
              key={id}
              href={TAB_PATH[id]}
              aria-current={tab === id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                selectTab(id);
              }}
              className={`admin-nav ${tab === id ? "active" : ""}`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>
        <button type="button" className="admin-nav mt-auto mx-2 mb-4" onClick={signOut}>
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      <main className="admin-main">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-slate-400">Monitor users, locations, and landing templates</p>
          </div>
          {stats && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              Cache: {stats.redis.active ? "on" : "off"}
            </div>
          )}
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((c) => (
                <div key={c.label} className="admin-panel p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{c.label}</div>
                  <div className="mt-2 text-3xl font-bold text-cyan-300">{c.value}</div>
                  <div className="mt-1 text-xs text-slate-400">{c.hint}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="admin-panel p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <MapPin size={16} className="text-cyan-300" /> Locations
                </div>
                <div className="space-y-2">
                  {(stats?.locations || []).length === 0 && (
                    <p className="text-sm text-slate-400">No location data yet</p>
                  )}
                  {(stats?.locations || []).map((l) => (
                    <div key={l.country} className="flex items-center justify-between text-sm">
                      <span className="text-slate-200">{l.country}</span>
                      <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-cyan-200">{l.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="admin-panel p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <Activity size={16} className="text-cyan-300" /> Recent users
                </div>
                <div className="space-y-2">
                  {(stats?.recentUsers || []).map((u) => (
                    <div key={u.id} className="border-b border-white/5 pb-2 text-sm last:border-0">
                      <div className="font-medium text-slate-100">{u.email}</div>
                      <div className="text-xs text-slate-400">
                        {u.country || u.location || "—"} · {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "templates" && (
          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <form onSubmit={uploadTemplate} className="admin-panel h-fit space-y-3 p-4">
              <h2 className="font-semibold text-white">Upload PDF template</h2>
              <p className="text-xs text-slate-400">
                Click-based: set Photo + Columns filters so landing page filters work.
              </p>
              <input
                className="admin-input w-full"
                placeholder="Template name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                className="admin-input w-full"
                placeholder="Short blurb"
                value={form.blurb}
                onChange={(e) => setForm({ ...form, blurb: e.target.value })}
              />
              <label className="block text-xs text-slate-400">Department</label>
              <select
                className="admin-input w-full"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                {DEPTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-300">Photo</div>
                <div className="admin-seg">
                  {[
                    ["true", "Photo"],
                    ["false", "No Photo"],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      className={form.hasPhoto === v ? "on" : ""}
                      onClick={() => setForm({ ...form, hasPhoto: v })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-300">Columns</div>
                <div className="admin-seg">
                  {[
                    ["single", "Single"],
                    ["double", "Double"],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      className={form.columns === v ? "on" : ""}
                      onClick={() => setForm({ ...form, columns: v })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  You can make more adjustments in the builder
                </p>
              </div>

              <label className="block text-xs text-slate-400">PDF file *</label>
              <input
                type="file"
                accept="application/pdf"
                className="block w-full text-xs text-slate-300"
                onChange={(e) => setPdf(e.target.files?.[0] || null)}
                required
              />
              <label className="block text-xs text-slate-400">Preview image (optional)</label>
              <input
                type="file"
                accept="image/*,.svg"
                className="block w-full text-xs text-slate-300"
                onChange={(e) => setPreview(e.target.files?.[0] || null)}
              />
              <button type="submit" disabled={busy} className="admin-btn w-full">
                {busy ? "Uploading…" : "Upload to landing"}
              </button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <div key={t.id} className="admin-panel overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.image} alt={t.name} className="h-40 w-full object-cover object-top bg-slate-800" />
                  <div className="p-3">
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-400">
                      {t.department} · {t.columns} · {t.hasPhoto ? "Photo" : "No photo"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="admin-btn-sm" onClick={() => void toggleActive(t)}>
                        {t.isActive ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn-sm danger"
                        onClick={() => void removeTemplate(t.id)}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-sm text-slate-400">No uploaded templates yet.</p>
              )}
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="admin-panel overflow-x-auto">
            <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
              <label htmlFor="admin-user-search" className="sr-only">
                Search users by email or name
              </label>
              <input
                id="admin-user-search"
                type="search"
                className="admin-input w-full max-w-sm"
                placeholder="Search users by email or name"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                maxLength={200}
              />
              <span className="text-xs text-slate-300" role="status" aria-live="polite">
                {userSearchBusy ? "Searching…" : `${users.length} user${users.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* BUG-800: say so when a search matches nobody. */}
                {!userSearchBusy && users.length === 0 && (
                  <tr className="border-t border-white/5">
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-300">
                      {userSearch.trim() ? `No users match "${userSearch.trim()}".` : "No users yet."}
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-white/5 text-slate-200">
                    <td className="px-4 py-2.5">{u.email}</td>
                    <td className="px-4 py-2.5">{u.location || "—"}</td>
                    <td className="px-4 py-2.5">{u.country || "—"}</td>
                    <td className="px-4 py-2.5">{new Date(u.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteUser(u.id, u.email)}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/10"
                        aria-label={`Delete user ${u.email}`}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
