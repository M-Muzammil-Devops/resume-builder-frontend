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
import { ApiError, apiFetch } from "@/lib/api";
import { finishSignIn } from "@/lib/finishSignIn";
import { MagicCodePanel } from "@/components/auth/MagicCodePanel";
import { SsoButtons, useProviders } from "@/components/auth/SsoButtons";
import s from "./AuthSlider.module.css";
import m from "./AuthSso.module.css";

/** ?oauth_error=… set by the API when a Google/Facebook sign-in could not finish. */
const OAUTH_ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Choose an option to try again.",
  expired: "That sign-in took too long or was opened in another browser. Please try again.",
  email: "Your account did not share a verified email address. Use another option, or allow email access.",
  provider: "We couldn't reach the sign-in provider. Please try again.",
  rate_limited: "Too many sign-in attempts. Try again in a few minutes.",
  unavailable: "That sign-in option is not available right now.",
  invalid: "That sign-in link is not valid. Please try again.",
  registration_closed: "New sign-ups are paused right now. Existing accounts can still sign in.",
};

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

  const [view, setView] = useState<"password" | "magic">("password");
  const providers = useProviders();
  const oauthError = OAUTH_ERRORS[search.get("oauth_error") || ""] || null;

  const wantsTemplate = search.get("next") === "template";

  // BUG-1327: password, magic code and SSO sign-in all finish the same way (lib/finishSignIn).
  async function finishAuth(token: string, refreshToken?: string) {
    await finishSignIn((href) => router.push(href), search, token, refreshToken);
  }

  function openMagic() {
    setError(null);
    setView("magic");
    requestAnimationFrame(() => document.getElementById("login-title")?.focus({ preventScroll: true }));
  }

  function closeMagic() {
    setView("password");
    requestAnimationFrame(() => document.getElementById("login-title")?.focus({ preventScroll: true }));
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

  if (view === "magic") {
    return (
      <MagicCodePanel
        intent="login"
        titleId="login-title"
        idPrefix="login"
        initialEmail={email}
        onBack={closeMagic}
        backLabel="Back to password sign in"
        onSession={finishAuth}
      />
    );
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

      {oauthError && (
        <div className={m.oauthError}>
          <AuroraError message={oauthError} id="oauth-error" />
        </div>
      )}
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
          {providers?.email ? (
            <span className={m.forgotMagic}>
              Forgot password?{" "}
              <button type="button" className={s.linkBtn} onClick={openMagic}>
                Sign in with a magic code
              </button>
            </span>
          ) : (
            <Link href="/forgot-password" className={s.link}>
              Forgot password?
            </Link>
          )}
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
      <SsoButtons intent="login" idPrefix="login" onEmail={openMagic} />

      <p className={s.foot}>
        New here?{" "}
        <button type="button" className={s.linkBtn} onClick={onSwitch}>
          Create an account
        </button>
      </p>
      <div className={s.extras}>
        <Link href="/admin/login" className={s.extraLink}>
          Admin sign-in
        </Link>
      </div>
    </>
  );
}
