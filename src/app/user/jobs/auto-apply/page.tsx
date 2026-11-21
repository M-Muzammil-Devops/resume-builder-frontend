"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Play, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, getToken } from "@/lib/api";

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

export default function AutoApplyPage() {
  const router = useRouter();
  const [rolesText, setRolesText] = useState("DevOps Engineer, SRE");
  const [locationsText, setLocationsText] = useState("Remote, Pakistan");
  const [remote, setRemote] = useState(true);
  const [credits, setCredits] = useState<Credits>({ remaining: 50, processing: 0, applied: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    apiFetch<{ config: AutoApplyConfig; credits: Credits }>("/auto-apply")
      .then((res) => {
        setRolesText(res.config.roles.join(", "));
        setLocationsText(res.config.locations.join(", "));
        setRemote(res.config.remote);
        setCredits(res.credits);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load config"));
  }, [router]);

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
    <AppShell>
      <main className="p-8">
        <div className="mx-auto max-w-3xl">
          <div className="app-page-in">
            <h1 className="auth-display text-3xl font-bold text-slate-900">Auto Apply</h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure targeting and run a demo queue — no external boards are contacted.
            </p>
          </div>

          <div className="app-page-body mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Coins size={16} className="text-[var(--rb-teal)]" />
                Credits remaining
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900">{credits.remaining}</div>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-semibold text-slate-700">Processing</div>
              <div className="mt-3 text-3xl font-bold text-amber-600">{credits.processing}</div>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-semibold text-slate-700">Applied (demo)</div>
              <div className="mt-3 text-3xl font-bold text-emerald-600">{credits.applied}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-900">
              <ShieldCheck size={16} />
              Safety note
            </div>
            <p className="mt-2 text-sm text-teal-800">
              Run queue moves shortlisted jobs to Applied in your tracker only. No real applications
              are submitted.
            </p>
          </div>

          <form
            onSubmit={onSave}
            className="mt-6 space-y-4 rounded-xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur"
          >
            <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-700">
              Prefer remote roles
              <input
                type="checkbox"
                checked={remote}
                onChange={(e) => setRemote(e.target.checked)}
                className="h-4 w-4 accent-teal-600"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Target roles (comma-separated)</span>
              <input
                value={rolesText}
                onChange={(e) => setRolesText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2"
                placeholder="DevOps Engineer, SRE, Platform Engineer"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Locations (comma-separated)</span>
              <input
                value={locationsText}
                onChange={(e) => setLocationsText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2"
                placeholder="Remote, Berlin, NYC"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={saving} className="btn-app-primary disabled:opacity-60">
                {saving ? "Saving…" : "Save configuration"}
              </button>
              <button
                type="button"
                onClick={runQueue}
                disabled={running || credits.remaining <= 0}
                className="btn-app-secondary disabled:opacity-60"
              >
                <Play size={16} />
                {running ? "Running…" : "Run demo queue"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </AppShell>
  );
}
