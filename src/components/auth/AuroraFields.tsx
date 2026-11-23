"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import s from "./AuthSlider.module.css";

type IconName = "mail" | "lock" | "user";

function FieldIcon({ name }: { name: IconName }) {
  return (
    <svg className={s.icon} viewBox="0 0 24 24" aria-hidden focusable="false">
      {name === "mail" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m4 7 8 6 8-6" />
        </>
      ) : name === "lock" ? (
        <>
          <rect x="4" y="11" width="16" height="10" rx="3" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
    </svg>
  );
}

export function AuroraInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  icon,
  required,
  autoComplete,
  placeholder,
  maxLength,
  invalid,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon: IconName;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <div className={s.control}>
        <FieldIcon name={icon} />
        <input
          id={id}
          className={s.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy || undefined}
        />
      </div>
    </div>
  );
}

export function AuroraPassword({
  id = "password",
  label = "Password",
  value,
  onChange,
  minLength,
  required,
  autoComplete = "new-password",
  placeholder = "••••••••",
  invalid,
  describedBy,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  const described = [minLength ? `${id}-hint` : "", describedBy || ""].filter(Boolean).join(" ");
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <div className={s.control}>
        <FieldIcon name="lock" />
        <input
          id={id}
          className={`${s.input} ${s.inputPw}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={visible ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={described || undefined}
        />
        <button
          type="button"
          className={s.eye}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((v) => !v)}
        >
          <svg viewBox="0 0 24 24" aria-hidden focusable="false">
            {visible ? (
              <path d="M3 3l18 18M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M9.4 5.2A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a16.7 16.7 0 0 1-3.2 4.1M6.2 6.3A16.4 16.4 0 0 0 2.5 12S6 19 12 19c1.5 0 2.9-.4 4.1-1" />
            ) : (
              <>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
      {minLength ? (
        <p id={`${id}-hint`} className={s.hint}>
          Use at least {minLength} characters.
        </p>
      ) : null}
    </div>
  );
}

export function AuroraSubmit({
  loading,
  idleLabel,
  loadingLabel,
}: {
  loading: boolean;
  idleLabel: string;
  loadingLabel: string;
}) {
  return (
    <button type="submit" disabled={loading} aria-busy={loading} className={s.btn}>
      <span className={s.btnInner}>
        {loading ? <span aria-hidden className={s.spinner} /> : null}
        {loading ? loadingLabel : idleLabel}
      </span>
    </button>
  );
}

export function AuroraError({
  message,
  id,
  children,
}: {
  message: string | null;
  id?: string;
  children?: ReactNode;
}) {
  if (!message) return null;
  return (
    <div className={s.error} role="alert" aria-live="assertive" id={id}>
      {message}
      {children}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className={s.fieldError} role="alert">
      {children}
    </p>
  );
}

export function AuroraBrand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className={s.brand} aria-label="ResumeBuilder home">
      <span className={s.mark} aria-hidden>
        RB
      </span>
      <span aria-hidden>ResumeBuilder</span>
    </Link>
  );
}
