"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Settings, Trash2, UserRound } from "lucide-react";
import { apiFetch, logoutSession, setSession } from "@/lib/api";
import { PASSWORD_HINT, passwordError } from "@/lib/passwordPolicy";
import { UserWorkspace, WorkspaceHeader } from "@/components/dashboard/UserDashboardShell";
import { cx } from "@/components/dashboard/format";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";

function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className={w.field}>
      <label htmlFor={id}>{label}</label>
      <div className={w.pw}>
        <input
          id={id}
          className={w.input}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder="••••••••"
          required
        />
        <button type="button" className={w.pwBtn} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

function SettingsView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"name" | "password" | "delete" | null>(null);

  useEffect(() => {
    apiFetch<{ user: { name: string | null; email: string } | null }>("/auth/me")
      .then((res) => {
        setEmail(res.user?.email || "");
        setName(res.user?.name || "");
      })
      .catch(() => router.replace("/login?next=/user/settings"));
  }, [router]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy("name");
    try {
      const res = await apiFetch<{ user: { name: string | null } }>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      setName(res.user.name || name.trim());
      setMessage("Name saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name");
    } finally {
      setBusy(null);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    const weak = passwordError(password);
    if (weak) {
      setError(weak);
      setMessage(null);
      return;
    }
    setError(null);
    setMessage(null);
    setBusy("password");
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
    } finally {
      setBusy(null);
    }
  }

  async function removeAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy("delete");
    try {
      await apiFetch("/auth/account", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      await logoutSession();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account");
      setBusy(null);
    }
  }

  return (
    <>
      <WorkspaceHeader icon={<Settings size={22} />} title="Account settings" sub={email || "Profile, password and account"} />
      {message && (
        <p role="status" className={cx(w.msg, w.msgOk)}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className={cx(w.msg, w.msgErr)}>
          {error}
        </p>
      )}

      <div className={w.grid2}>
        <form onSubmit={saveName} className={cx(w.panel, w.stack)}>
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UserRound size={17} aria-hidden="true" /> Profile
            </h2>
            <p className={w.panelSub}>The name shown on your dashboard and account menu.</p>
          </div>
          <label className={w.field}>
            Name
            <input className={w.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoComplete="name" />
          </label>
          <label className={w.field}>
            Email
            <input className={w.input} value={email} readOnly aria-readonly="true" />
          </label>
          <div>
            <button className={cx(s.btn, s.primary)} type="submit" disabled={busy === "name"}>
              {busy === "name" ? "Saving…" : "Save name"}
            </button>
          </div>
        </form>

        <form onSubmit={savePassword} className={cx(w.panel, w.stack)}>
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <KeyRound size={17} aria-hidden="true" /> Change password
            </h2>
            <p className={w.panelSub}>{PASSWORD_HINT}</p>
          </div>
          <PasswordInput label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <PasswordInput label="New password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
          <div>
            <button className={cx(s.btn, s.primary)} type="submit" disabled={busy === "password"}>
              {busy === "password" ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </div>

      <form onSubmit={removeAccount} className={cx(w.panel, w.stack, w.danger)}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Trash2 size={17} aria-hidden="true" /> Delete account
          </h2>
          <p className={w.panelSub}>This removes your resumes and cannot be undone.</p>
        </div>
        <div style={{ maxWidth: 420 }}>
          <PasswordInput label="Password" value={deletePassword} onChange={setDeletePassword} autoComplete="current-password" />
        </div>
        <div>
          <button className={cx(s.btn, s.dangerFill)} type="submit" disabled={busy === "delete"}>
            {busy === "delete" ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </form>
    </>
  );
}

export default function SettingsPage() {
  return (
    <UserWorkspace active="settings">
      <SettingsView />
    </UserWorkspace>
  );
}
