"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuroraBrand } from "@/components/auth/AuroraFields";
import { ApiError, apiFetch } from "@/lib/api";
import { SSO_RETURN_KEY, finishSignIn } from "@/lib/finishSignIn";
import s from "./AuthSlider.module.css";
import m from "./AuthSso.module.css";

export function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = hash.get("code") || "";
    // Drop the one-time code from the address bar and history right away.
    window.history.replaceState(window.history.state, "", "/auth/callback");
    let saved = "";
    try {
      saved = sessionStorage.getItem(SSO_RETURN_KEY) || "";
      sessionStorage.removeItem(SSO_RETURN_KEY);
    } catch {
      /* storage blocked */
    }
    const search = new URLSearchParams(saved);
    const apiNext = hash.get("next");
    if (apiNext && !search.get("next")) search.set("next", apiNext);
    if (!code) {
      setError("This sign-in link is not valid. Please try again.");
      return;
    }
    apiFetch<{ token: string; refreshToken?: string }>("/auth/oauth/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
      .then((res) => finishSignIn((href) => router.replace(href), search, res.token, res.refreshToken))
      .catch((err) => {
        setError(err instanceof ApiError && err.status < 500 ? err.message : "We couldn't finish signing you in. Please try again.");
      });
  }, [router]);

  return (
    <main className={s.page}>
      <div className={m.signedWrap}>
      <section className={m.signedCard} aria-live="polite" aria-busy={!error}>
        <div className={m.signedBrand}>
          <AuroraBrand />
        </div>
        {error ? (
          <>
            <h1 className={m.signedName}>Sign-in didn&apos;t finish</h1>
            <p className={m.callbackText}>{error}</p>
            <Link href="/login" className={`${s.btn} ${m.signedPrimary}`}>
              <span className={s.btnInner}>Back to sign in</span>
            </Link>
          </>
        ) : (
          <>
            <span className={m.bigSpinner} aria-hidden="true" />
            <h1 className={m.signedName}>Signing you in…</h1>
            <p className={m.callbackText}>One moment while we open your workspace.</p>
          </>
        )}
      </section>
      </div>
    </main>
  );
}
