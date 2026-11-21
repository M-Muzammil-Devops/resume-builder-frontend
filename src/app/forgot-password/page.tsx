"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthError, AuthInput, AuthShell, AuthSubmitButton } from "@/components/auth/AuthShell";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ message?: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setNotice(res.message || null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        sent
          ? notice || "If an account exists for that email, we sent a reset link."
          : "Enter your email and we'll send a link to choose a new password."
      }
      footer={
        <Link href="/login" className="auth-link">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-200">
            If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It expires in one hour.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <AuthInput
            id="email"
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
          <AuthError message={error} />
          <AuthSubmitButton loading={loading} idleLabel="Send reset link" loadingLabel="Sending…" />
        </form>
      )}
    </AuthShell>
  );
}
