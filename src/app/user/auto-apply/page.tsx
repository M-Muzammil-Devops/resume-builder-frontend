"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Play, Send, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { cx } from "@/components/dashboard/format";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";

type AutoApplyConfig = {
  roles: string[];
  locations: string[];
  remote: boolean;
};

type Credits = {
  remaining: number;
  processing: number;
  applied: number;
};

function AutoApplyView() {
  const [rolesText, setRolesText] = useState("DevOps Engineer, SRE");
  const [locationsText, setLocationsText] = useState("Remote, Pakistan");
  const [remote, setRemote] = useState(true);
  const [credits, setCredits] = useState<Credits>({ remaining: 50, processing: 0, applied: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    apiFetch<{ config: AutoApplyConfig; credits: Credits }>("/auto-apply")
      .then((res) => {
        setRolesText(res.config.roles.join(", "));
        setLocationsText(res.config.locations.join(", "));
        setRemote(res.config.remote);
        setCredits(res.credits);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load config"));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const config: AutoApplyConfig = {
        roles: rolesText.split(",").map((s) => s.trim()).filter(Boolean),
        locations: locationsText.split(",").map((s) => s.trim()).filter(Boolean),
        remote,
      };
      await apiFetch("/auto-apply", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      setMessage("Auto Apply settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  }

  async function runQueue() {
    setRunning(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch<{
        message: string;
        credits: Credits;
        appliedCount: number;
      }>("/auto-apply/run", { method: "POST" });
      setCredits(res.credits);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <WorkspaceHeader
        icon={<Send size={21} />}
        title="Auto Apply"
        sub="Configure targeting and run a demo queue — no external boards are contacted."
        actions={
          <Link href="/user/tracker" className={s.btn}>
            View Tracker
          </Link>
        }
      />

      <div className={w.grid3}>
        <div className={cx(w.panel, w.stat)}>
          <span>
            <Coins size={15} aria-hidden="true" />
            Credits remaining
          </span>
          <b>{credits.remaining}</b>
        </div>
        <div className={cx(w.panel, w.stat, w.statAmber)}>
          <span>Processing</span>
          <b>{credits.processing}</b>
        </div>
        <div className={cx(w.panel, w.stat, w.statGreen)}>
          <span>Applied (demo)</span>
          <b>{credits.applied}</b>
        </div>
      </div>

      <div className={cx(w.msg, w.msgInfo)}>
        <b style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} aria-hidden="true" />
          Safety note
        </b>
        <p style={{ marginTop: 6, fontWeight: 500 }}>Run queue moves shortlisted jobs to Applied in your tracker only. No real applications are submitted.</p>
      </div>

      <form onSubmit={onSave} className={cx(w.panel, w.stack)}>
        <h2>Targeting</h2>
        <label className={w.switchRow}>
          Prefer remote roles
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#3b82f6" }} />
        </label>
        <label className={w.field}>
          Target roles (comma-separated)
          <input value={rolesText} onChange={(e) => setRolesText(e.target.value)} className={w.input} placeholder="DevOps Engineer, SRE, Platform Engineer" />
        </label>
        <label className={w.field}>
          Locations (comma-separated)
          <input value={locationsText} onChange={(e) => setLocationsText(e.target.value)} className={w.input} placeholder="Remote, Berlin, NYC" />
        </label>
        {error && (
          <p role="alert" className={cx(w.msg, w.msgErr)}>
            {error}
          </p>
        )}
        {message && (
          <p role="status" className={cx(w.msg, w.msgOk)}>
            {message}
          </p>
        )}
        <div className={w.row}>
          <button type="submit" disabled={saving} className={cx(s.btn, s.primary)}>
            {saving ? "Saving…" : "Save configuration"}
          </button>
          <button type="button" onClick={() => void runQueue()} disabled={running || credits.remaining <= 0} className={s.btn}>
            <Play size={15} aria-hidden="true" />
            {running ? "Running…" : "Run demo queue"}
          </button>
        </div>
      </form>
    </>
  );
}

export default function AutoApplyPage() {
  return (
    <UserWorkspace active="auto-apply">
      <AutoApplyView />
    </UserWorkspace>
  );
}
