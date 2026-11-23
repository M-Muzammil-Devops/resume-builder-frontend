"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FileText,
  History,
  LayoutTemplate,
  Save,
  Search,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { adminBlob, fmtDate, openBlob, saveBlob } from "./adminFetch";
import s from "./AdminPanels.module.css";

type BuiltinTemplate = {
  id: string;
  templateId: string;
  defaultName: string;
  name: string;
  category: string;
  description: string;
  layoutKey: string;
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
  thumb: string;
  previewUrl: string;
  resumes: number;
  exports: number;
};

type ResumeRow = {
  id: string;
  title: string;
  templateId: string;
  templateName: string;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
  exports: number;
  lastExportAt: string | null;
  user: { id: string; email: string; name: string | null };
};

type ExportSettings = {
  defaultPageSize: "A4" | "US Letter";
  marginMm: number;
  watermarkFree: boolean;
  watermarkText: string;
  maxExports: { free: number; pro: number };
};

type AuditEntry = {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: unknown;
  ip: string | null;
  createdAt: string;
};

type Sub = "templates" | "resumes" | "settings" | "audit";
const SUBS: Array<[Sub, string, typeof LayoutTemplate]> = [
  ["templates", "Templates", LayoutTemplate],
  ["resumes", "Resumes & PDFs", FileText],
  ["settings", "Export settings", Settings2],
  ["audit", "Audit log", History],
];

export function PdfControlPanel() {
  const [sub, setSub] = useState<Sub>("templates");
  return (
    <div className={s.stack}>
      <div className={s.subTabs} role="tablist" aria-label="PDF and templates">
        {SUBS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sub === id}
            className={`${s.subTab} ${sub === id ? s.subTabOn : ""}`}
            onClick={() => setSub(id)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {sub === "templates" && <TemplatesControl />}
      {sub === "resumes" && <ResumesControl />}
      {sub === "settings" && <ExportSettingsControl />}
      {sub === "audit" && <AuditLog />}
    </div>
  );
}

/* ---------------- Templates ---------------- */

function TemplatesControl() {
  const [list, setList] = useState<BuiltinTemplate[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<BuiltinTemplate>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ templates: BuiltinTemplate[] }>("/admin/builtin-templates");
      setList(res.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load templates");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, body: Partial<BuiltinTemplate>) {
    setBusy(id);
    setError(null);
    try {
      await apiFetch(`/admin/builtin-templates/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
      setDrafts((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
      setSaved(id);
      window.setTimeout(() => setSaved((cur) => (cur === id ? null : cur)), 1800);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    setBusy("order");
    try {
      await apiFetch("/admin/builtin-templates/order", { method: "PUT", body: JSON.stringify({ ids: next.map((t) => t.id) }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
      await load();
    } finally {
      setBusy(null);
    }
  }

  const draftOf = (t: BuiltinTemplate) => ({ ...t, ...(drafts[t.id] || {}) });
  const edit = (id: string, key: keyof BuiltinTemplate, value: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] || {}), [key]: value } }));

  return (
    <section aria-label="Built-in templates" className={s.stack}>
      <p className={s.lead}>
        The {list.length || 12} built-in resume templates shown on the landing page. Disabled templates are hidden from the gallery; featured ones
        are shown first. Order here is the gallery order.
      </p>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.tplGrid}>
        {list.map((raw, index) => {
          const t = draftOf(raw);
          const dirty = Boolean(drafts[raw.id]);
          return (
            <article key={raw.id} className={`${s.tplCard} ${raw.isActive ? "" : s.tplOff}`}>
              <div className={s.tplThumb}>
                <Image src={raw.thumb} alt={`${raw.name} template`} width={280} height={396} sizes="(max-width: 640px) 40vw, 180px" />
                <span className={s.tplRank}>#{index + 1}</span>
                {raw.featured && (
                  <span className={s.tplFeatured}>
                    <Star size={11} aria-hidden="true" /> Featured
                  </span>
                )}
              </div>
              <div className={s.tplBody}>
                <label className={s.fieldFull}>
                  <span>Name</span>
                  <input className={s.input} value={t.name} maxLength={80} placeholder={raw.defaultName} onChange={(e) => edit(raw.id, "name", e.target.value)} />
                </label>
                <label className={s.fieldFull}>
                  <span>Category</span>
                  <input className={s.input} value={t.category} maxLength={40} onChange={(e) => edit(raw.id, "category", e.target.value)} />
                </label>
                <label className={s.fieldFull}>
                  <span>Description</span>
                  <textarea className={s.input} rows={2} value={t.description} maxLength={200} onChange={(e) => edit(raw.id, "description", e.target.value)} />
                </label>
                <div className={s.tplMeta}>
                  <span><strong>{raw.resumes}</strong> resumes</span>
                  <span><strong>{raw.exports}</strong> exports</span>
                  <span className={s.mono}>{raw.layoutKey}</span>
                </div>
                <div className={s.toggles}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={raw.isActive}
                    className={`${s.switch} ${raw.isActive ? s.switchOn : ""}`}
                    disabled={busy !== null}
                    onClick={() => void patch(raw.id, { isActive: !raw.isActive })}
                  >
                    <span className={s.knob} />
                    <span className={s.switchLabel}>{raw.isActive ? "Enabled" : "Disabled"}</span>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={raw.featured}
                    className={`${s.switch} ${raw.featured ? s.switchOn : ""}`}
                    disabled={busy !== null}
                    onClick={() => void patch(raw.id, { featured: !raw.featured })}
                  >
                    <span className={s.knob} />
                    <span className={s.switchLabel}>Featured</span>
                  </button>
                </div>
                <div className={s.rowBtns}>
                  <button type="button" className={s.iconBtn} aria-label={`Move ${raw.name} up`} disabled={index === 0 || busy !== null} onClick={() => void move(index, -1)}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className={s.iconBtn} aria-label={`Move ${raw.name} down`} disabled={index === list.length - 1 || busy !== null} onClick={() => void move(index, 1)}>
                    <ArrowDown size={15} />
                  </button>
                  <a className={s.btnGhost} href={raw.previewUrl} target="_blank" rel="noopener noreferrer">
                    <Eye size={14} aria-hidden="true" /> Preview
                  </a>
                  <button
                    type="button"
                    className={s.btn}
                    disabled={!dirty || busy !== null}
                    onClick={() => void patch(raw.id, { name: t.name, category: t.category, description: t.description })}
                  >
                    <Save size={14} aria-hidden="true" /> {saved === raw.id ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Resumes & PDFs ---------------- */

const RPAGE = 25;
const R_EMPTY = { search: "", template: "", status: "all", from: "", to: "" };

function ResumesControl() {
  const [filters, setFilters] = useState(R_EMPTY);
  const [applied, setApplied] = useState(R_EMPTY);
  const [rows, setRows] = useState<ResumeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [templates, setTemplates] = useState<BuiltinTemplate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: typeof R_EMPTY, offset: number) => {
    setBusy("list");
    setError(null);
    try {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(f)) if (v && !(k === "status" && v === "all")) p.set(k, v);
      p.set("take", String(RPAGE));
      if (offset) p.set("skip", String(offset));
      const res = await apiFetch<{ resumes: ResumeRow[]; total: number }>(`/admin/resumes?${p.toString()}`);
      setRows(res.resumes);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load resumes");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void load(applied, skip);
  }, [applied, skip, load]);

  useEffect(() => {
    apiFetch<{ templates: BuiltinTemplate[] }>("/admin/builtin-templates").then((r) => setTemplates(r.templates)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setApplied((a) => (a.search === filters.search ? a : { ...a, search: filters.search }));
      setSkip(0);
    }, 350);
    return () => window.clearTimeout(t);
  }, [filters.search]);

  function setFilter(key: keyof typeof R_EMPTY, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    if (key !== "search") {
      setApplied((a) => ({ ...a, [key]: value }));
      setSkip(0);
    }
  }

  async function pdf(row: ResumeRow, mode: "view" | "download") {
    setBusy(row.id);
    setError(null);
    try {
      const { blob, filename } = await adminBlob(`/admin/resumes/${encodeURIComponent(row.id)}/pdf${mode === "view" ? "?inline=1" : ""}`);
      if (mode === "view") openBlob(blob);
      else saveBlob(blob, filename || `${row.title || "resume"}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF could not be generated");
    } finally {
      setBusy(null);
    }
  }

  async function remove(row: ResumeRow) {
    if (!window.confirm(`Delete "${row.title}" by ${row.user.email}? This cannot be undone.`)) return;
    setBusy(row.id);
    try {
      await apiFetch(`/admin/resumes/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      await load(applied, skip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  const pages = Math.max(1, Math.ceil(total / RPAGE));
  const page = Math.floor(skip / RPAGE) + 1;

  return (
    <section className={s.card} aria-label="User resumes">
      <div className={s.toolbar}>
        <label className={s.searchBox}>
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search</span>
          <input className={s.input} value={filters.search} placeholder="Search title, email or name" maxLength={200} onChange={(e) => setFilter("search", e.target.value)} />
        </label>
        <label className={s.field}>
          <span>Template</span>
          <select className={s.input} value={filters.template} onChange={(e) => setFilter("template", e.target.value)}>
            <option value="">All templates</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>Status</span>
          <select className={s.input} value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="all">All</option>
            <option value="complete">Complete</option>
            <option value="draft">Draft</option>
            <option value="exported">Exported at least once</option>
          </select>
        </label>
        <label className={s.field}>
          <span>Updated from</span>
          <input type="date" className={s.input} value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
        </label>
        <label className={s.field}>
          <span>to</span>
          <input type="date" className={s.input} value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
        </label>
      </div>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">Resume</th>
              <th scope="col">Owner</th>
              <th scope="col">Template</th>
              <th scope="col">Updated</th>
              <th scope="col">Exports</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody aria-busy={busy === "list"}>
            {busy !== "list" && rows.length === 0 && (
              <tr><td colSpan={6} className={s.empty}>No resumes match these filters.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className={s.userText}>
                    <span className={s.userEmail}>{r.title || "Untitled"}</span>
                    <span className={r.isComplete ? s.okText : s.muted}>{r.isComplete ? "Complete" : "Draft"}</span>
                  </span>
                </td>
                <td>
                  <span className={s.userText}>
                    <span>{r.user.email}</span>
                    {r.user.name && <span className={s.muted}>{r.user.name}</span>}
                  </span>
                </td>
                <td>{r.templateName}</td>
                <td className={s.nowrap}>{fmtDate(r.updatedAt)}</td>
                <td>
                  <span className={s.userText}>
                    <strong>{r.exports}</strong>
                    {r.lastExportAt && <span className={s.muted}>last {fmtDate(r.lastExportAt)}</span>}
                  </span>
                </td>
                <td>
                  <div className={s.rowBtnsEnd}>
                    <button type="button" className={s.iconBtn} aria-label={`View ${r.title} as PDF`} disabled={busy !== null} onClick={() => void pdf(r, "view")}>
                      <Eye size={15} />
                    </button>
                    <button type="button" className={s.iconBtn} aria-label={`Download ${r.title} as PDF`} disabled={busy !== null} onClick={() => void pdf(r, "download")}>
                      <Download size={15} />
                    </button>
                    <button type="button" className={`${s.iconBtn} ${s.danger}`} aria-label={`Delete ${r.title}`} disabled={busy !== null} onClick={() => void remove(r)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.pager}>
        <span className={s.muted}>
          {busy && busy !== "list" ? "Generating PDF…" : total ? `${skip + 1}–${Math.min(skip + RPAGE, total)} of ${total}` : "0 results"}
        </span>
        <div className={s.pagerBtns}>
          <button type="button" className={s.btnGhost} disabled={page <= 1 || busy !== null} onClick={() => setSkip(Math.max(0, skip - RPAGE))}>Previous</button>
          <span className={s.muted}>Page {page} / {pages}</span>
          <button type="button" className={s.btnGhost} disabled={page >= pages || busy !== null} onClick={() => setSkip(skip + RPAGE)}>Next</button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Export settings ---------------- */

function ExportSettingsControl() {
  const [value, setValue] = useState<ExportSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiFetch<{ settings: ExportSettings }>("/admin/settings/export")
      .then((r) => setValue(r.settings))
      .catch((err) => setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not load settings" }));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiFetch<{ settings: ExportSettings }>("/admin/settings/export", { method: "PUT", body: JSON.stringify(value) });
      setValue(r.settings);
      setMsg({ ok: true, text: "Saved. New exports use these settings." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  if (!value) return <section className={s.card}>{msg ? <p className={s.error}>{msg.text}</p> : <p className={s.muted}>Loading…</p>}</section>;
  const num = (v: string, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

  return (
    <form className={s.card} onSubmit={save} aria-label="PDF export settings">
      <div className={s.settingsGrid}>
        <fieldset className={s.setting}>
          <legend>Default page size</legend>
          <p className={s.muted}>Used for resumes that never picked a size.</p>
          <div className={s.seg} role="radiogroup" aria-label="Default page size">
            {(["A4", "US Letter"] as const).map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={value.defaultPageSize === size}
                className={`${s.segBtn} ${value.defaultPageSize === size ? s.segOn : ""}`}
                onClick={() => setValue({ ...value, defaultPageSize: size })}
              >
                {size === "US Letter" ? "Letter" : size}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={s.setting}>
          <legend>Extra PDF margin</legend>
          <p className={s.muted}>Added around every page, in millimetres (0 = the resume&apos;s own margins).</p>
          <label className={s.inline}>
            <input type="range" min={0} max={30} value={value.marginMm} onChange={(e) => setValue({ ...value, marginMm: num(e.target.value, 30) })} aria-label="Extra margin in millimetres" />
            <strong>{value.marginMm} mm</strong>
          </label>
        </fieldset>
        <fieldset className={s.setting}>
          <legend>Watermark for free users</legend>
          <p className={s.muted}>Small footer text on every PDF page of free accounts. Admins never get it.</p>
          <button
            type="button"
            role="switch"
            aria-checked={value.watermarkFree}
            className={`${s.switch} ${value.watermarkFree ? s.switchOn : ""}`}
            onClick={() => setValue({ ...value, watermarkFree: !value.watermarkFree })}
          >
            <span className={s.knob} />
            <span className={s.switchLabel}>{value.watermarkFree ? "On" : "Off"}</span>
          </button>
          <label className={s.fieldFull}>
            <span>Watermark text</span>
            <input className={s.input} value={value.watermarkText} maxLength={80} onChange={(e) => setValue({ ...value, watermarkText: e.target.value })} />
          </label>
        </fieldset>
        <fieldset className={s.setting}>
          <legend>Max PDF exports per month</legend>
          <p className={s.muted}>Per account, per calendar month (UTC). 0 = unlimited.</p>
          <div className={s.twoCol}>
            <label className={s.fieldFull}>
              <span>Free plan</span>
              <input type="number" min={0} max={100000} className={s.input} value={value.maxExports.free} onChange={(e) => setValue({ ...value, maxExports: { ...value.maxExports, free: num(e.target.value, 100000) } })} />
            </label>
            <label className={s.fieldFull}>
              <span>Pro plan</span>
              <input type="number" min={0} max={100000} className={s.input} value={value.maxExports.pro} onChange={(e) => setValue({ ...value, maxExports: { ...value.maxExports, pro: num(e.target.value, 100000) } })} />
            </label>
          </div>
        </fieldset>
      </div>
      <div className={s.formFoot}>
        {msg && <span className={msg.ok ? s.okText : s.error} role="status">{msg.text}</span>}
        <button type="submit" className={s.btn} disabled={busy}>
          <Save size={14} aria-hidden="true" /> {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

/* ---------------- Audit log ---------------- */

const ACTION_LABEL: Record<string, string> = {
  "template.update": "Template edited",
  "template.reorder": "Templates reordered",
  "resume.delete": "Resume deleted",
  "resume.view": "Resume viewed",
  "resume.download": "Resume downloaded",
  "settings.export.update": "Export settings changed",
};

function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ entries: AuditEntry[]; total: number }>(`/admin/audit?take=50${skip ? `&skip=${skip}` : ""}`)
      .then((r) => {
        setEntries(r.entries);
        setTotal(r.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the audit log"));
  }, [skip]);

  return (
    <section className={s.card} aria-label="Admin audit log">
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Admin</th>
              <th scope="col">Action</th>
              <th scope="col">Target</th>
              <th scope="col">IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={5} className={s.empty}>No admin actions recorded yet.</td></tr>
            )}
            {entries.map((e) => (
              <tr key={e.id}>
                <td className={s.nowrap}>{fmtDate(e.createdAt)}</td>
                <td>{e.adminEmail}</td>
                <td><span className={s.tag}>{ACTION_LABEL[e.action] || e.action}</span></td>
                <td className={s.mono}>{e.targetType}{e.targetId ? ` · ${e.targetId}` : ""}</td>
                <td className={s.mono}>{e.ip || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.pager}>
        <span className={s.muted}>{total} entries</span>
        <div className={s.pagerBtns}>
          <button type="button" className={s.btnGhost} disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 50))}>Newer</button>
          <button type="button" className={s.btnGhost} disabled={skip + 50 >= total} onClick={() => setSkip(skip + 50)}>Older</button>
        </div>
      </div>
    </section>
  );
}
