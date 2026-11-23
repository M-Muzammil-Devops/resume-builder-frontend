"use client";

import { useEffect, useState } from "react";
import { apiFetch, getApiUrl } from "@/lib/api";
import { SSO_RETURN_KEY } from "@/lib/finishSignIn";
import s from "./AuthSso.module.css";

export type Providers = { google: boolean; facebook: boolean; email: boolean };
let providersFlight: Promise<Providers> | null = null;

/** GET /auth/providers once per page; a provider's button shows only when it is configured. */
export function useProviders(): Providers | null {
  const [providers, setProviders] = useState<Providers | null>(null);
  useEffect(() => {
    let alive = true;
    providersFlight ??= apiFetch<Providers>("/auth/providers").catch(() => {
      providersFlight = null;
      return { google: false, facebook: false, email: false };
    });
    void providersFlight.then((p) => alive && setProviders(p));
    return () => {
      alive = false;
    };
  }, []);
  return providers;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
      <path fill="#fff" d="m16.7 15.5.5-3.5h-3.4V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.7 0-4.5 1.6-4.5 4.7V12h-3v3.5h3v8.4a12 12 0 0 0 3.7 0v-8.4h2.9z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" className={s.mailIcon}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

/** "or" divider + Continue with Google / Facebook / Email. */
export function SsoButtons({
  intent,
  onEmail,
  idPrefix,
}: {
  intent: "login" | "signup";
  onEmail: () => void;
  idPrefix: string;
}) {
  const providers = useProviders();
  if (!providers) return <div className={s.ssoSlot} aria-hidden="true" />;
  const count = Number(providers.google) + Number(providers.facebook) + Number(providers.email);
  if (!count) return null;

  function startHref(provider: "google" | "facebook") {
    return `${getApiUrl()}/auth/oauth/${provider}/start?intent=${intent}`;
  }
  function rememberReturn() {
    try {
      sessionStorage.setItem(SSO_RETURN_KEY, window.location.search);
    } catch {
      /* storage blocked: the default destination is used */
    }
  }
  const verb = intent === "signup" ? "Sign up" : "Continue";

  return (
    <div className={s.sso}>
      <div className={s.divider} role="separator" aria-label="or continue with">
        <span>or continue with</span>
      </div>
      <div className={`${s.ssoGrid} ${count === 1 ? s.one : count === 2 ? s.two : s.three}`}>
        {providers.google && (
          <a id={`${idPrefix}-google`} href={startHref("google")} className={s.ssoBtn} onClick={rememberReturn}>
            <GoogleIcon />
            <span className={s.short} aria-hidden="true">Google</span>
            <span className={s.long}>{verb} with Google</span>
          </a>
        )}
        {providers.facebook && (
          <a id={`${idPrefix}-facebook`} href={startHref("facebook")} className={s.ssoBtn} onClick={rememberReturn}>
            <FacebookIcon />
            <span className={s.short} aria-hidden="true">Facebook</span>
            <span className={s.long}>{verb} with Facebook</span>
          </a>
        )}
        {providers.email && (
          <button id={`${idPrefix}-email`} type="button" className={s.ssoBtn} onClick={onEmail}>
            <MailIcon />
            <span className={count === 1 ? s.long1 : s.short} aria-hidden={count === 1 ? undefined : true}>{count === 1 ? `${verb} with Email` : "Email"}</span>
            {count > 1 && <span className={s.long}>{verb} with Email</span>}
          </button>
        )}
      </div>
    </div>
  );
}
