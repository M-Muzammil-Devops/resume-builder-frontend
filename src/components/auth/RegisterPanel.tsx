"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AuroraBrand,
  AuroraError,
  AuroraInput,
  AuroraPassword,
  AuroraSubmit,
} from "@/components/auth/AuroraFields";
import { apiFetch, setSession } from "@/lib/api";
import { continueAfterAuth } from "@/lib/continueAfterAuth";
import { finishSignIn } from "@/lib/finishSignIn";
import { MagicCodePanel } from "@/components/auth/MagicCodePanel";
import { SsoButtons } from "@/components/auth/SsoButtons";
import { passwordError } from "@/lib/passwordPolicy";
import { LANDING_TEMPLATES, PENDING_TEMPLATE_KEY } from "@/lib/landingTemplates";
import s from "./AuthSlider.module.css";

/**
 * Create-account form. Logic moved unchanged from app/register/page.tsx (round 12: Aurora slider UI).
 * Field ids are prefixed "reg-" because the sign-in panel is in the same document.
 */
export function RegisterPanel({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const search = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [view, setView] = useState<"password" | "magic">("password");

  function focusTitle() {
    requestAnimationFrame(() => document.getElementById("register-title")?.focus({ preventScroll: true }));
  }

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

  if (view === "magic") {
    return (
      <MagicCodePanel
        intent="signup"
        titleId="register-title"
        idPrefix="reg"
        initialEmail={email}
        name={name}
        onBack={() => {
          setView("password");
          focusTitle();
        }}
        backLabel="Back to create account"
        onSession={async (token, refreshToken) => {
          if (wantsTemplate && tplId) {
            const tpl = LANDING_TEMPLATES.find((t) => t.id === tplId);
            if (tpl) sessionStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify(tpl));
          }
          await finishSignIn((href) => router.push(href), search, token, refreshToken);
        }}
      />
    );
  }

  if (pendingEmail) {
    return (
      <>
        <AuroraBrand />
        <h1 id="register-title" className={s.title} tabIndex={-1}>
          Check your email
        </h1>
        <p className={s.sub}>Confirm your address before the account can be used.</p>
        <p className={s.body}>
          We sent a verification link to <strong>{pendingEmail}</strong>. Open it to finish creating your account. It expires in 24 hours.
        </p>
        <AuroraError message={error} />
        {resent && (
          <p className={s.hint} role="status">
            Verification email sent again.
          </p>
        )}
        <button type="button" onClick={() => void resend()} className={`${s.btn} ${s.btnSpaced}`}>
          <span className={s.btnInner}>Resend email</span>
        </button>
        <p className={s.foot}>
          <button type="button" className={s.linkBtn} onClick={onSwitch}>
            Back to log in
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <AuroraBrand />
      <h1 id="register-title" className={s.title} tabIndex={-1}>
        Create account
      </h1>
      <p className={s.sub}>
        {wantsTemplate
          ? "Create an account to open your selected template."
          : "Start building ATS-ready resumes in minutes."}
      </p>
      <form onSubmit={onSubmit} className={s.form}>
        <AuroraInput
          id="reg-name"
          label="Full name"
          icon="user"
          value={name}
          onChange={setName}
          required
          autoComplete="name"
          placeholder="Your name"
          maxLength={80}
        />
        <AuroraInput
          id="reg-email"
          label="Email"
          icon="mail"
          value={email}
          onChange={setEmail}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        <AuroraPassword
          id="reg-password"
          value={password}
          onChange={setPassword}
          minLength={8}
          required
          autoComplete="new-password"
        />
        <AuroraError message={error} />
        <AuroraSubmit loading={loading} idleLabel="Create account" loadingLabel="Creating…" />
      </form>
      <SsoButtons
        intent="signup"
        idPrefix="reg"
        onEmail={() => {
          setError(null);
          setView("magic");
          focusTitle();
        }}
      />
      <p className={s.foot}>
        Already have an account?{" "}
        <button type="button" className={s.linkBtn} onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </>
  );
}
