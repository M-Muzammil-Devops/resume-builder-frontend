"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Trash2, Upload } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AdminAccess } from "./types";
import { cx } from "./format";
import s from "./AdminV2.module.css";

type AdminTemplate = { id: string; name: string; department: string; hasPhoto: boolean; columns: string; image: string; isActive: boolean };

const DEPTS = ["DevOps", "Cloud", "SRE", "Platform", "Software Engineering", "Data", "Design", "Marketing", "Product", "Security", "General"];

/** Template uploads (PDF + preview) for the landing gallery — same API as v1. */
export function UploadsPanel({ access }: { access: AdminAccess | null }) {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", blurb: "", department: "General", hasPhoto: "true", columns: "double", layoutKey: "high-performer", accentColor: "#1c2b42", fontFamily: "Lato" });
  const [pdf, setPdf] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);
  const canWrite = Boolean(access?.canWrite);
  const canDelete = Boolean(access?.canDelete);

  const load = useCallback(async () => {
    try {
      const t = await apiFetch<{ templates: AdminTemplate[] }>("/admin/templates");
      setTemplates(t.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load templates");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!pdf) return setError("PDF is required");
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
      setFormKey((k) => k + 1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(t: AdminTemplate) {
    try {
      await apiFetch(`/admin/templates/${t.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !t.isActive }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }
  async function remove(t: AdminTemplate) {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    try {
      await apiFetch(`/admin/templates/${t.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const seg = (key: "hasPhoto" | "columns", opts: [string, string][]) => (
    <div className={s.seg} role="group">
      {opts.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={form[key] === v} onClick={() => setForm({ ...form, [key]: v })}>{label}</button>
      ))}
    </div>
  );

  return (
    <>
      <div className={s.sh}>
        <div><h2>Template uploads</h2><p>Templates uploaded as PDF + preview for the landing gallery</p></div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}
      <div className={s.uploads}>
        <form key={formKey} onSubmit={upload} className={cx(s.card, s.pad)} style={{ height: "fit-content" }}>
          <div className={s.ttl}><div><h3>Upload PDF template</h3><small>Set Photo + Columns so the landing filters work</small></div></div>
          <div className={s.fl}><label htmlFor="up-name">Template name</label><input id="up-name" className={s.input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canWrite} /></div>
          <div className={s.fl}><label htmlFor="up-blurb">Short blurb</label><input id="up-blurb" className={s.input} value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} disabled={!canWrite} /></div>
          <div className={s.fl}>
            <label htmlFor="up-dept">Department</label>
            <select id="up-dept" className={s.select} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} disabled={!canWrite}>
              {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className={s.fl}><span className={s.flabel}>Photo</span>{seg("hasPhoto", [["true", "Photo"], ["false", "No photo"]])}</div>
          <div className={s.fl}><span className={s.flabel}>Columns</span>{seg("columns", [["single", "Single"], ["double", "Double"]])}</div>
          <div className={s.fl}><label htmlFor="up-pdf">PDF file *</label><input id="up-pdf" type="file" accept="application/pdf" required onChange={(e) => setPdf(e.target.files?.[0] || null)} disabled={!canWrite} /></div>
          <div className={s.fl}><label htmlFor="up-prev">Preview image (optional)</label><input id="up-prev" type="file" accept="image/*,.svg" onChange={(e) => setPreview(e.target.files?.[0] || null)} disabled={!canWrite} /></div>
          <button type="submit" className={cx(s.btn, s.primary, s.full)} disabled={busy || !canWrite}><Upload size={14} aria-hidden="true" /> {busy ? "Uploading…" : "Upload to landing"}</button>
        </form>
        <div className={s.tplGrid}>
          {templates.length === 0 && <p className={cx(s.card, s.empty)}>No uploaded templates yet.</p>}
          {templates.map((t) => (
            <div key={t.id} className={s.card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt={t.name} className={s.tplImg} loading="lazy" />
              <div style={{ padding: 14 }}>
                <b style={{ display: "block" }}>{t.name}</b>
                <small className={s.mute}>{t.department} · {t.columns} · {t.hasPhoto ? "Photo" : "No photo"}</small>
                <div className={s.acts} style={{ justifyContent: "flex-start", marginTop: 10 }}>
                  {canWrite && <button type="button" className={cx(s.btn, s.sm)} onClick={() => void toggle(t)}>{t.isActive ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}</button>}
                  {canDelete && <button type="button" className={cx(s.btn, s.sm, s.danger)} onClick={() => void remove(t)}><Trash2 size={13} /> Delete</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
