"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthError, AuthShell, AuthSubmitButton } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { apiFetch } from "@/lib/api";
import { PASSWORD_HINT, passwordError } from "@/lib/passwordPolicy";

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const weak = passwordError(password);
    if (weak) {
      setError(weak);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      window.setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={done ? "Password updated. Taking you to log in." : PASSWORD_HINT}
      footer={
        <Link href="/login" className="auth-link">
          Back to log in
        </Link>
      }
    >
      {done ? null : (
        <form onSubmit={onSubmit} className="space-y-4">
          <PasswordField value={password} onChange={setPassword} minLength={8} required autoComplete="new-password" />
          <PasswordField id="confirm" label="Confirm password" value={confirm} onChange={setConfirm} minLength={8} required autoComplete="new-password" />
          <AuthError message={error} />
          <AuthSubmitButton loading={loading} idleLabel="Update password" loadingLabel="Saving…" />
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-page min-h-screen" />}>
      <ResetForm />
    </Suspense>
  );
}
