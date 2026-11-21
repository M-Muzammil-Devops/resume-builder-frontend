"use client";

import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <main className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="auth-glow auth-glow-a" aria-hidden />
      <div className="auth-glow auth-glow-b" aria-hidden />
      <div className="auth-grid" aria-hidden />

      <div className="auth-card relative z-10 w-full max-w-[420px]">
        <div className="auth-card-shine" aria-hidden />
        <Link href="/" className="auth-brand inline-flex items-center gap-2.5">
          <span className="auth-brand-mark" aria-hidden>
            RB
          </span>
          <span className="auth-display text-[1.65rem] font-bold tracking-tight text-white">
            ResumeBuilder
          </span>
        </Link>

        <h1 className="auth-title auth-display mt-5 text-[1.75rem] font-bold leading-tight tracking-tight text-white">
          {title}
        </h1>
        <p className="auth-sub mt-1.5 text-[0.95rem] leading-relaxed">{subtitle}</p>

        <div className="auth-body mt-7">{children}</div>
        <div className="auth-footer mt-6 text-center text-sm">{footer}</div>
      </div>
    </main>
  );
}

export function AuthInput({
  id,
  label,
  value,
  onChange,
  type = "text",
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
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  /** BUG-1007: error wiring for assistive tech. */
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <label className="auth-field block space-y-1.5 text-sm" htmlFor={id}>
      <span className="font-medium">{label}</span>
      <input
        id={id}
        className="auth-input w-full rounded-xl border px-3.5 py-2.5 outline-none transition-[border-color,box-shadow,background] duration-200"
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
    </label>
  );
}

export function AuthSubmitButton({
  loading,
  idleLabel,
  loadingLabel,
}: {
  loading: boolean;
  idleLabel: string;
  loadingLabel: string;
}) {
  return (
    <button type="submit" disabled={loading} aria-busy={loading} className="auth-submit">
      {/* BUG-905: visible spinner while the request runs. */}
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {loading ? (
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        {loading ? loadingLabel : idleLabel}
      </span>
    </button>
  );
}

export function AuthError({
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
    <div className="auth-error" role="alert" id={id}>
      {message}
      {children}
    </div>
  );
}
