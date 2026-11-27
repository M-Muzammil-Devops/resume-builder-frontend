"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, RotateCcw, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AdminAccess, AdminSettings, Integration } from "./types";
import { cx } from "./format";
import { Toast, type ToastMsg } from "./Dialog";
import s from "./AdminV2.module.css";

type Resp = { settings: AdminSettings; integrations: Integration[] };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Switch({ id, on, disabled, onChange, label }: { id: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      className={cx(s.switch, on && s.switchOn)} onClick={() => onChange(!on)} />
  );
}

function NumField({ id, label, value, hint, max, disabled, onChange }: { id: string; label: string; value: number; hint: string; max: number; disabled: boolean; onChange: (n: number) => void }) {
  return (
    <div className={s.fl}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className={s.input} type="number" inputMode="numeric" min={0} max={max} step={1} value={Number.isFinite(value) ? value : ""} disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Math.floor(Number(e.target.value)))} />
      <div className={s.hintTxt}>{hint}</div>
    </div>
  );
}

export function SettingsPanel({ access }: { access: AdminAccess | null }) {
  const [saved, setSaved] = useState<AdminSettings | null>(null);
  const [form, setForm] = useState<AdminSettings | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);
  const canEdit = Boolean(access?.canSystem);
  const clearToast = useCallback(() => setToast(null), []);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch<Resp>("/admin/settings");
      setSaved(r.settings);
      setForm(r.settings);
      setIntegrations(r.integrations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const dirty = useMemo(() => Boolean(form && saved && JSON.stringify(form) !== JSON.stringify(saved)), [form, saved]);
  const problem = useMemo(() => {
    if (!form) return null;
    if (!form.siteName.trim()) return "Site name is required.";
    if (form.siteName.trim().length > 60) return "Site name can be up to 60 characters.";
    if (form.supportEmail.trim() && !EMAIL_RE.test(form.supportEmail.trim())) return "Enter a valid support email (or leave it empty).";
    const lim = form.freeLimits;
    for (const [v, name, max] of [[lim.pdfExportsPerMonth, "PDF export limit", 100000], [lim.audioMinutesPerMonth, "Audio minutes limit", 100000], [lim.maxResumes, "Max resumes", 1000]] as const) {
      if (!Number.isFinite(v) || v < 0 || v > max) return `${name} must be a whole number from 0 to ${max.toLocaleString("en-US")}.`;
    }
    if (form.maintenance.message.length > 300) return "Maintenance message can be up to 300 characters.";
    return null;
  }, [form]);

  function set<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }
  function setLimit<K extends keyof AdminSettings["freeLimits"]>(key: K, value: AdminSettings["freeLimits"][K]) {
    setForm((f) => (f ? { ...f, freeLimits: { ...f.freeLimits, [key]: value } } : f));
  }

  async function save() {
    if (!form || problem) return;
    setBusy(true);
    try {
      const body: AdminSettings = { ...form, siteName: form.siteName.trim(), supportEmail: form.supportEmail.trim(), maintenance: { ...form.maintenance, message: form.maintenance.message.trim() } };
      const r = await apiFetch<Resp>("/admin/settings", { method: "PATCH", body: JSON.stringify(body) });
      setSaved(r.settings);
      setForm(r.settings);
      setIntegrations(r.integrations);
      setToast({ kind: "ok", text: "Settings saved." });
    } catch (err) {
      setToast({ kind: "err", text: err instanceof Error ? err.message : "Could not save settings." });
    } finally {
      setBusy(false);
    }
  }

  const off = !canEdit || busy;
  return (
    <>
      <div className={s.sh}>
        <div>
          <h2>Settings</h2>
          <p>Brand, free-plan limits, sign-ups, maintenance and integrations</p>
        </div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}
      {!canEdit && <div className={s.notice}>You can view these settings. Changing them needs System access.</div>}
      {!form && !error && <div className={cx(s.card, s.skel)}>Loading settings…</div>}

      {form && (
        <>
          <div className={s.setGrid}>
            <section className={cx(s.card, s.pad)}>
              <div className={s.ttl}><div><h3>Brand &amp; support</h3><small>Shown in emails and on the site</small></div></div>
              <div className={s.fields}>
                <div className={s.fl}>
                  <label htmlFor="v2-set-site">Site / brand name</label>
                  <input id="v2-set-site" className={s.input} value={form.siteName} maxLength={60} disabled={off} onChange={(e) => set("siteName", e.target.value)} />
                </div>
                <div className={s.fl}>
                  <label htmlFor="v2-set-support">Support email</label>
                  <input id="v2-set-support" className={s.input} type="email" placeholder="support@example.com" value={form.supportEmail} maxLength={160} disabled={off} onChange={(e) => set("supportEmail", e.target.value)} />
                </div>
              </div>
            </section>

            <section className={cx(s.card, s.pad)}>
              <div className={s.ttl}><div><h3>Access</h3><small>Sign-ups and maintenance mode</small></div></div>
              <div className={s.toggleRow}>
                <div>
                  <b>Allow new sign-ups</b>
                  <small>{form.registrationOpen ? "Anyone can create an account." : "Only existing accounts can sign in."}</small>
                </div>
                <Switch id="v2-set-reg" label="Allow new sign-ups" on={form.registrationOpen} disabled={off} onChange={(v) => set("registrationOpen", v)} />
              </div>
              <div className={s.toggleRow}>
                <div>
                  <b>Maintenance mode</b>
                  <small>{form.maintenance.enabled ? "On: visitors see the message below in a banner at the top of the site." : "Off: the site works normally."}</small>
                </div>
                <Switch id="v2-set-maint" label="Maintenance mode" on={form.maintenance.enabled} disabled={off} onChange={(v) => set("maintenance", { ...form.maintenance, enabled: v })} />
              </div>
              <div className={s.fl} style={{ marginTop: 4 }}>
                <label htmlFor="v2-set-msg">Maintenance message</label>
                <textarea id="v2-set-msg" className={s.textarea} value={form.maintenance.message} maxLength={300} disabled={off}
                  onChange={(e) => set("maintenance", { ...form.maintenance, message: e.target.value })} />
                <div className={s.hintTxt}>{form.maintenance.message.length}/300</div>
              </div>
            </section>
          </div>

          <section className={cx(s.card, s.pad)} style={{ marginTop: 18 }}>
            <div className={s.ttl}><div><h3>Free plan limits</h3><small>Per account · 0 = unlimited</small></div></div>
            <div className={s.fields}>
              <NumField id="v2-set-pdf" label="PDF exports per month" value={form.freeLimits.pdfExportsPerMonth} max={100000} disabled={off}
                hint="Same value as PDF & Templates → export settings." onChange={(n) => setLimit("pdfExportsPerMonth", n)} />
              <NumField id="v2-set-audio" label="Audio minutes per month" value={form.freeLimits.audioMinutesPerMonth} max={100000} disabled={off}
                hint="Noise Remover minutes for Free accounts." onChange={(n) => setLimit("audioMinutesPerMonth", n)} />
              <NumField id="v2-set-resumes" label="Max resumes" value={form.freeLimits.maxResumes} max={1000} disabled={off}
                hint="Resumes a Free account can keep." onChange={(n) => setLimit("maxResumes", n)} />
              <div className={s.fl}>
                <span className={s.flabel}>Watermark on Free exports</span>
                <div className={s.toggleRow} style={{ borderTop: 0, padding: "6px 0 0" }}>
                  <div><small>{form.freeLimits.watermark ? "“Made with ResumeBuilder” footer on Free PDFs." : "No footer on Free PDFs."}</small></div>
                  <Switch id="v2-set-wm" label="Watermark on Free exports" on={form.freeLimits.watermark} disabled={off} onChange={(v) => setLimit("watermark", v)} />
                </div>
              </div>
            </div>
          </section>

          <section className={cx(s.card, s.pad)} style={{ marginTop: 18 }}>
            <div className={s.ttl}><div><h3>Integrations</h3><small>Read-only · set on the server, secrets are never shown here</small></div></div>
            <div className={s.intg}>
              {integrations.map((i) => (
                <div key={i.key}>
                  {i.configured ? <CheckCircle2 size={18} color="#22c55e" aria-hidden="true" /> : <CircleDashed size={18} color="#94a3b8" aria-hidden="true" />}
                  <div>
                    <b>{i.label}</b>
                    <span className={cx(s.pill, i.configured ? s.pG : s.pN)} style={{ marginTop: 4 }}>{i.configured ? "Configured" : "Not configured"}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {canEdit && (
            <div className={s.saveBar}>
              <span role={problem ? "alert" : undefined} className={problem ? s.dn : undefined}>{problem || (dirty ? "You have unsaved changes." : "All changes saved.")}</span>
              <button type="button" className={s.btn} disabled={!dirty || busy} onClick={() => saved && setForm(saved)}><RotateCcw size={14} aria-hidden="true" /> Reset</button>
              <button type="button" className={cx(s.btn, s.primary)} disabled={!dirty || busy || Boolean(problem)} onClick={() => void save()}>
                <Save size={14} aria-hidden="true" /> {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </>
      )}
      <Toast msg={toast} onDone={clearToast} />
    </>
  );
}
