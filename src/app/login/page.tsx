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
import { ApiError, apiFetch, setSession } from "@/lib/api";
import { continueAfterAuth } from "@/lib/continueAfterAuth";
import { LANDING_TEMPLATES, PENDING_TEMPLATE_KEY } from "@/lib/landingTemplates";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [badCredentials, setBadCredentials] = useState(false);

  const wantsTemplate = search.get("next") === "template";
  const tplId = search.get("tpl");

  async function finishAuth(token: string, refreshToken?: string) {
    setSession(token, refreshToken);
    if (wantsTemplate && tplId) {
      const existing = sessionStorage.getItem(PENDING_TEMPLATE_KEY);
      if (!existing) {
        const tpl = LANDING_TEMPLATES.find((t) => t.id === tplId);
        if (tpl) sessionStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify(tpl));
      }
    }
    // BUG-600: an expired session on /editor/:id comes back to that resume after login.
    const nextPath = search.get("next") || "";
    if (!wantsTemplate && /^\/(user\/)?editor\/[\w-]+$/.test(nextPath)) {
      router.push(nextPath);
      return;
    }
    await continueAfterAuth((href) => router.push(href));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // BUG-912: our own validation instead of the native browser bubble.
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Enter a valid email address, like name@example.com.";
    if (!password) errs.password = "Enter your password.";
    setFieldErrors(errs);
    setBadCredentials(false);
    if (errs.email || errs.password) {
      setError(null);
      document.getElementById(errs.email ? "email" : "password")?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ token: string; refreshToken?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await finishAuth(res.token, res.refreshToken);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setBadCredentials(true);
        setError("That email and password don't match. Check for typos or Caps Lock.");
      } else if (err instanceof ApiError && err.status < 500 && err.message) {
        setError(err.message);
      } else {
        setError("We couldn't sign you in right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ token: string; refreshToken?: string }>("/auth/demo", { method: "POST" });
      await finishAuth(res.token, res.refreshToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        wantsTemplate
          ? "Sign in to open your selected template in the editor."
          : "Sign in to manage resumes and job applications."
      }
      footer={
        <>
          No account?{" "}
          <Link
            href={
              wantsTemplate && tplId
                ? `/register?next=template&tpl=${encodeURIComponent(tplId)}`
                : "/register"
            }
            className="auth-link"
          >
            Register
          </Link>
          {" · "}
          <Link href="/user/editor/local-demo" className="auth-link">
            Local editor
          </Link>
          {" · "}
          <Link href="/admin/login" className="auth-link">
            Admin sign-in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <AuthInput
          id="email"
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
          required
          autoComplete="email"
          invalid={Boolean(fieldErrors.email) || badCredentials}
          describedBy={fieldErrors.email ? "email-error" : badCredentials ? "login-error" : undefined}
        />
        {fieldErrors.email ? (
          <p id="email-error" className="auth-error text-sm" role="alert">
            {fieldErrors.email}
          </p>
        ) : null}
        <PasswordField
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
          invalid={Boolean(fieldErrors.password) || badCredentials}
          describedBy={fieldErrors.password ? "password-error" : badCredentials ? "login-error" : undefined}
        />
        {fieldErrors.password ? (
          <p id="password-error" className="auth-error text-sm" role="alert">
            {fieldErrors.password}
          </p>
        ) : null}
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>
        <AuthError message={error} id="login-error">
          {badCredentials ? (
            <>
              {" "}
              <Link href="/forgot-password" className="auth-link underline">
                Reset your password
              </Link>
            </>
          ) : null}
        </AuthError>
        <AuthSubmitButton
          loading={loading}
          idleLabel="Sign in"
          loadingLabel="Signing in…"
        />
      </form>

      <button type="button" onClick={onDemo} disabled={loading} className="auth-demo mt-3">
        Continue with demo account
      </button>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-page min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
