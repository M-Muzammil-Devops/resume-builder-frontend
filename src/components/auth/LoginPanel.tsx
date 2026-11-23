"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AuroraBrand,
  AuroraError,
  AuroraInput,
  AuroraPassword,
  AuroraSubmit,
  FieldError,
} from "@/components/auth/AuroraFields";
import { ApiError, apiFetch, setSession } from "@/lib/api";
import { continueAfterAuth, readPendingTemplate } from "@/lib/continueAfterAuth";
import { parseLoginNext } from "@/lib/loginNext";
import { LANDING_TEMPLATES, PENDING_TEMPLATE_KEY, type LandingTemplate } from "@/lib/landingTemplates";
import s from "./AuthSlider.module.css";

/** Sign-in form. Logic moved unchanged from app/login/page.tsx (round 12: Aurora slider UI). */
export function LoginPanel({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [badCredentials, setBadCredentials] = useState(false);

  const wantsTemplate = search.get("next") === "template";

  async function finishAuth(token: string, refreshToken?: string) {
    setSession(token, refreshToken);
    // BUG-1327: password AND demo sign-in both come here, so ?next=template&tpl=… is never dropped.
    const next = parseLoginNext(search);
    if (next.kind === "template") {
      let pending = readPendingTemplate();
      if (!pending || pending.id !== next.tplId) {
        pending = LANDING_TEMPLATES.find((t) => t.id === next.tplId) ?? null;
        if (!pending) {
          // Landing templates come from the API; a fresh tab has nothing in sessionStorage.
          const res = await apiFetch<{ templates: LandingTemplate[] }>("/landing-templates").catch(() => null);
          const hit = res?.templates?.find((t) => t.id === next.tplId);
          pending = hit ? { ...hit, source: "admin" as const } : null;
        }
        if (pending) sessionStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify(pending));
      }
    }
    // BUG-600: an expired session on /editor/:id comes back to that resume after login.
    if (next.kind === "path") {
      router.push(next.path);
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
    <>
      <AuroraBrand />
      <h1 id="login-title" className={s.title} tabIndex={-1}>
        Welcome back
      </h1>
      <p className={s.sub}>
        {wantsTemplate
          ? "Sign in to open your selected template in the editor."
          : "Sign in to manage your resumes and job applications."}
      </p>

      <form onSubmit={onSubmit} noValidate className={s.form}>
        <AuroraInput
          id="email"
          label="Email"
          icon="mail"
          value={email}
          onChange={setEmail}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(fieldErrors.email) || badCredentials}
          describedBy={fieldErrors.email ? "email-error" : badCredentials ? "login-error" : undefined}
        />
        {fieldErrors.email ? <FieldError id="email-error">{fieldErrors.email}</FieldError> : null}
        <AuroraPassword
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
          invalid={Boolean(fieldErrors.password) || badCredentials}
          describedBy={fieldErrors.password ? "password-error" : badCredentials ? "login-error" : undefined}
        />
        {fieldErrors.password ? <FieldError id="password-error">{fieldErrors.password}</FieldError> : null}
        <div className={s.forgotRow}>
          <Link href="/forgot-password" className={s.link}>
            Forgot password?
          </Link>
        </div>
        <AuroraError message={error} id="login-error">
          {badCredentials ? (
            <>
              {" "}
              <Link href="/forgot-password" className={s.errorLink}>
                Reset your password
              </Link>
            </>
          ) : null}
        </AuroraError>
        <AuroraSubmit loading={loading} idleLabel="Sign in" loadingLabel="Signing in…" />
      </form>

      <p className={s.foot}>
        New here?{" "}
        <button type="button" className={s.linkBtn} onClick={onSwitch}>
          Create an account
        </button>
      </p>
      <div className={s.extras}>
        <button type="button" onClick={onDemo} disabled={loading} className={s.extraBtn}>
          Continue with demo account
        </button>
        <span aria-hidden>·</span>
        <Link href="/user/editor/local-demo" className={s.extraLink}>
          Local editor
        </Link>
        <span aria-hidden>·</span>
        <Link href="/admin/login" className={s.extraLink}>
          Admin sign-in
        </Link>
      </div>
    </>
  );
}
