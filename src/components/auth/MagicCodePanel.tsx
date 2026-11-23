"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AuroraBrand, AuroraError, AuroraInput, AuroraSubmit } from "@/components/auth/AuroraFields";
import { ApiError, apiFetch } from "@/lib/api";
import s from "./AuthSlider.module.css";
import m from "./AuthSso.module.css";

const RESEND_SECONDS = 30;

/**
 * Passwordless sign-in (also the "forgot password" path): email -> 6-digit code -> session.
 * The reply never says whether the email has an account.
 */
export function MagicCodePanel({
  intent,
  titleId,
  idPrefix,
  initialEmail = "",
  name,
  onBack,
  backLabel,
  onSession,
}: {
  intent: "login" | "signup";
  titleId: string;
  idPrefix: string;
  initialEmail?: string;
  name?: string;
  onBack: () => void;
  backLabel: string;
  onSession: (token: string, refreshToken?: string) => Promise<void>;
}) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const submitted = useRef("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function requestCode(resend = false) {
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError("Enter a valid email address, like name@example.com.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/auth/magic/request", {
        method: "POST",
        body: JSON.stringify({ email: clean, intent, ...(name?.trim() ? { name: name.trim() } : {}) }),
      });
      setStep("code");
      setCode("");
      submitted.current = "";
      setCooldown(RESEND_SECONDS);
      if (resend) setNotice("A new code is on its way. Only the newest code works.");
    } catch (err) {
      setError(err instanceof ApiError && err.status < 500 ? err.message : "We couldn't send a code right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(value: string) {
    if (!/^\d{6}$/.test(value) || submitted.current === value) return;
    submitted.current = value;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ token: string; refreshToken?: string }>("/auth/magic/verify", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), code: value }),
      });
      await onSession(res.token, res.refreshToken);
    } catch (err) {
      submitted.current = "";
      setError(err instanceof ApiError && err.status < 500 ? err.message : "We couldn't check the code right now. Please try again.");
      codeRef.current?.select();
    } finally {
      setLoading(false);
    }
  }

  function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    void requestCode();
  }

  function onCodeSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email.");
      codeRef.current?.focus();
      return;
    }
    void verify(code);
  }

  function onCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void verify(digits);
  }

  const heading = intent === "signup" ? "Sign up with a magic code" : "Sign in with a magic code";

  if (step === "code") {
    return (
      <>
        <AuroraBrand />
        <h1 id={titleId} className={s.title} tabIndex={-1}>
          Check your inbox
        </h1>
        <p className={s.sub}>
          We sent a 6-digit code to <strong className={m.strong}>{email.trim()}</strong>. It expires in 10 minutes.
        </p>
        <form onSubmit={onCodeSubmit} noValidate className={s.form}>
          <label htmlFor={`${idPrefix}-code`} className={s.label}>
            Magic code
          </label>
          <input
            ref={codeRef}
            id={`${idPrefix}-code`}
            className={`${s.input} ${m.codeInput}`}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="••••••"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${idPrefix}-magic-error` : undefined}
          />
          <div className={m.codeGap} />
          <AuroraError message={error} id={`${idPrefix}-magic-error`} />
          {notice && (
            <p className={`${s.hint} ${m.notice}`} role="status">
              {notice}
            </p>
          )}
          <AuroraSubmit loading={loading} idleLabel="Verify & continue" loadingLabel="Checking…" />
        </form>
        <p className={m.row}>
          <button type="button" className={s.linkBtn} disabled={cooldown > 0 || loading} onClick={() => void requestCode(true)}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            className={s.linkBtn}
            onClick={() => {
              setStep("email");
              setError(null);
              setNotice(null);
            }}
          >
            Use a different email
          </button>
        </p>
        <p className={s.foot}>
          <button type="button" className={s.linkBtn} onClick={onBack}>
            {backLabel}
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <AuroraBrand />
      <h1 id={titleId} className={s.title} tabIndex={-1}>
        {heading}
      </h1>
      <p className={s.sub}>We will send you a magic code to sign in ✨</p>
      <form onSubmit={onEmailSubmit} noValidate className={s.form}>
        <AuroraInput
          id={`${idPrefix}-magic-email`}
          label="Email"
          icon="mail"
          value={email}
          onChange={setEmail}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(error)}
          describedBy={error ? `${idPrefix}-magic-error` : undefined}
        />
        <AuroraError message={error} id={`${idPrefix}-magic-error`} />
        <AuroraSubmit loading={loading} idleLabel="Send magic code" loadingLabel="Sending…" />
      </form>
      <p className={m.small}>No password needed. The code works once and expires in 10 minutes.</p>
      <p className={s.foot}>
        <button type="button" className={s.linkBtn} onClick={onBack}>
          {backLabel}
        </button>
      </p>
    </>
  );
}
