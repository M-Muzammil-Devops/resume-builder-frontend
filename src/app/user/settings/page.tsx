"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { apiFetch, getToken, logoutSession, setSession } from "@/lib/api";
import { PASSWORD_HINT, passwordError } from "@/lib/passwordPolicy";

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<{ user: { name: string | null; email: string } | null }>("/auth/me")
      .then((res) => {
        setEmail(res.user?.email || "");
        setName(res.user?.name || "");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch<{ user: { name: string | null } }>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      setName(res.user.name || name.trim());
      setMessage("Name saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name");
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    const weak = passwordError(password);
    if (weak) {
      setError(weak);
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch<{ token: string; refreshToken?: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, password }),
      });
      setSession(res.token, res.refreshToken);
      setCurrentPassword("");
      setPassword("");
      setMessage("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password");
    }
  }

  async function removeAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/auth/account", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      await logoutSession();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-6 py-8 text-slate-800">
        <h1 className="text-2xl font-bold">Account settings</h1>
        <p className="mt-1 text-sm text-slate-500">{email}</p>
        {message && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <form onSubmit={saveName} className="mt-6 space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Profile</h2>
          <label className="block text-sm">
            Name
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </label>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Save name</button>
        </form>

        <form onSubmit={savePassword} className="mt-4 space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Change password</h2>
          <p className="text-xs text-slate-500">{PASSWORD_HINT}</p>
          <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" required />
          <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} minLength={8} autoComplete="new-password" required />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Update password</button>
        </form>

        <form onSubmit={removeAccount} className="mt-4 space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-rose-700">Delete account</h2>
          <p className="text-sm text-slate-500">This removes your resumes and cannot be undone.</p>
          <PasswordField id="delete-password" label="Password" value={deletePassword} onChange={setDeletePassword} autoComplete="current-password" required />
          <button className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Delete account</button>
        </form>
      </div>
    </AppShell>
  );
}
