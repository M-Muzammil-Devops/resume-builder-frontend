"use client";

import { useState } from "react";

type Props = {
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
};

export function PasswordField({
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
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="auth-field block space-y-1.5 text-sm" htmlFor={id}>
      <span className="font-medium">{label}</span>
      <div className="relative">
        <input
          id={id}
          className="auth-input w-full rounded-xl border py-2.5 pl-3.5 pr-11 outline-none transition-[border-color,box-shadow,background] duration-200"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={visible ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={[minLength ? `${id}-hint` : "", describedBy || ""].filter(Boolean).join(" ") || undefined}
        />
        <button
          type="button"
          tabIndex={0}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {minLength ? (
        <p id={`${id}-hint`} className="auth-hint">
          Use at least {minLength} characters.
        </p>
      ) : null}
    </label>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M9.4 5.2A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a16.7 16.7 0 0 1-3.2 4.1M6.2 6.3A16.4 16.4 0 0 0 2.5 12S6 19 12 19c1.5 0 2.9-.4 4.1-1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
