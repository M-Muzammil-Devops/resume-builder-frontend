"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ApiError, apiFetch, getRefreshToken, getToken, refreshAdminCookie, setSession } from "@/lib/api";
import { safeAdminNext } from "@/lib/adminSession";

type LoginResponse = { token: string; refreshToken?: string; user: { role: string } };

function AdminLoginForm() {
  const search = useSearchParams();
  const next = safeAdminNext(search.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    search.get("reason") === "session" ? "Your admin session ended. Sign in again." : null
  );
  const [notAdmin, setNotAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  // Already signed in as an admin (or a refresh token can renew it): go straight in.
  useEffect(() => {
    if (!getToken() && !getRefreshToken()) return;
    let cancelled = false;
    apiFetch("/admin/me")
      .then(() => refreshAdminCookie())
      .then((ok) => {
        if (!cancelled && ok) window.location.replace(next);
      })
      .catch(() => {
        /* not an admin session: stay on the sign-in form */
      });
    return () => {
      cancelled = true;
    };
  }, [next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotAdmin(false);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await apiFetch<LoginResponse>("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          country: timeZone.split("/")[0] || undefined,
          location: timeZone,
        }),
      });
      if (res.user?.role !== "admin") {
        setNotAdmin(true);
        setError("This account is not an admin.");
        return;
      }
      setSession(res.token, res.refreshToken);
      window.location.assign(next);
    } catch (err) {
      const code =
        err instanceof ApiError && typeof err.body === "object" && err.body
          ? (err.body as { code?: string }).code
          : undefined;
      if (code === "NOT_ADMIN") {
        setNotAdmin(true);
        setError("This account is not an admin.");
      } else {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-root flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="admin-panel w-full max-w-md p-6" noValidate={false}>
        <div className="flex items-center gap-2 text-cyan-300">
          <ShieldCheck size={18} />
          <span className="text-xs font-semibold uppercase tracking-wide">Admin console</span>
        </div>
        <h1 className="mt-2 text-xl font-bold text-white">Admin sign-in</h1>
        <p className="mt-1 text-sm text-slate-200">Only admin accounts can sign in here.</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-300">
            {error}
            {notAdmin && (
              <>
                {" "}
                <Link href="/login" className="font-semibold text-cyan-300 underline">
                  Go to the user sign-in
                </Link>
              </>
            )}
          </p>
        )}
        <label htmlFor="admin-email" className="mt-5 block text-xs text-slate-300">
          Email
        </label>
        <input
          id="admin-email"
          className="admin-input mt-1 w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="username"
          required
        />
        <label htmlFor="admin-password" className="mt-3 block text-xs text-slate-300">
          Password
        </label>
        <input
          id="admin-password"
          className="admin-input mt-1 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          required
        />
        <button type="submit" disabled={busy} className="admin-btn mt-5 w-full">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-xs text-slate-200">
          Not an admin?{" "}
          <Link href="/login" className="text-cyan-300 underline">
            User sign-in
          </Link>
        </p>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="admin-root min-h-screen" />}>
      <AdminLoginForm />
    </Suspense>
  );
}