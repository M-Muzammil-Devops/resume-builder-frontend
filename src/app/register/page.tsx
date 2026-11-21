"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import {
  AuthError,
  AuthInput,
  AuthShell,
  AuthSubmitButton,
} from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { apiFetch, setSession } from "@/lib/api";
import { continueAfterAuth } from "@/lib/continueAfterAuth";
import { passwordError } from "@/lib/passwordPolicy";
import { LANDING_TEMPLATES, PENDING_TEMPLATE_KEY } from "@/lib/landingTemplates";

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const wantsTemplate = search.get("next") === "template";
  const tplId = search.get("tpl");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const weak = passwordError(password);
    if (weak) {
      setError(weak);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{
        token?: string;
        refreshToken?: string;
        needsVerification?: boolean;
        email?: string;
      }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      if (res.needsVerification) {
        if (wantsTemplate && tplId) {
          const tpl = LANDING_TEMPLATES.find((t) => t.id === tplId);
          if (tpl) sessionStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify(tpl));
        }
        setPendingEmail(res.email || email.trim());
        return;
      }
      if (!res.token) throw new Error("Registration failed");
      setSession(res.token, res.refreshToken);
      if (wantsTemplate && tplId) {
        const tpl = LANDING_TEMPLATES.find((t) => t.id === tplId);
        if (tpl) sessionStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify(tpl));
      }
      await continueAfterAuth((href) => router.push(href));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!pendingEmail) return;
    setResent(false);
    setError(null);
    try {
      await apiFetch("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: pendingEmail }),
      });
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the email");
    }
  }

  if (pendingEmail) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Confirm your address before the account can be used."
        footer={
          <Link href="/login" className="auth-link">
            Back to log in
          </Link>
        }
      >
        <p className="text-sm leading-relaxed text-slate-200">
          We sent a verification link to <strong>{pendingEmail}</strong>. Open it to finish creating your account. It expires in 24 hours.
        </p>
        <AuthError message={error} />
        {resent && <p className="auth-hint">Verification email sent again.</p>}
        <button type="button" onClick={() => void resend()} className="auth-demo mt-4">
          Resend email
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        wantsTemplate
          ? "Create an account to open your selected template."
          : "Start building ATS-ready resumes in minutes."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={
              wantsTemplate && tplId
                ? `/login?next=template&tpl=${encodeURIComponent(tplId)}`
                : "/login"
            }
            className="auth-link"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthInput
          id="name"
          label="Name"
          value={name}
          onChange={setName}
          required
          autoComplete="name"
          placeholder="Your name"
          maxLength={80}
        />
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
        <PasswordField
          value={password}
          onChange={setPassword}
          minLength={8}
          required
          autoComplete="new-password"
        />
        <AuthError message={error} />
        <AuthSubmitButton
          loading={loading}
          idleLabel="Create account"
          loadingLabel="Creating…"
        />
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="auth-page min-h-screen" />}>
      <RegisterForm />
    </Suspense>
  );
}
