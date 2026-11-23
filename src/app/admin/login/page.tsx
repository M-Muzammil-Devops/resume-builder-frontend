"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Fingerprint, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { AuroraBrand, AuroraError, AuroraInput, AuroraPassword, AuroraSubmit } from "@/components/auth/AuroraFields";
import { ApiError, apiFetch, getRefreshToken, getToken, refreshAdminCookie, setSession } from "@/lib/api";
import { safeAdminNext } from "@/lib/adminSession";
import s from "@/components/auth/AuthSlider.module.css";
import a from "@/components/auth/AdminLogin.module.css";

type LoginResponse = { token: string; refreshToken?: string; user: { role: string } };

/** 3D-looking shield (pure SVG, CSP safe). `idp` keeps gradient ids unique per instance. */
function ShieldArt({ idp, className }: { idp: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 210 250" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${idp}-back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#312e81" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <linearGradient id={`${idp}-face`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.45" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#3730a3" />
        </linearGradient>
        <linearGradient id={`${idp}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#a5f3fc" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id={`${idp}-lock`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id={`${idp}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* depth layer */}
      <path d="M113 14 L196 44 V118 C196 176 160 216 113 238 C66 216 30 176 30 118 V44 Z" fill={`url(#${idp}-back)`} />
      {/* rim */}
      <path d="M105 8 L188 38 V112 C188 170 152 210 105 232 C58 210 22 170 22 112 V38 Z" fill={`url(#${idp}-rim)`} />
      {/* face */}
      <path d="M105 20 L177 46 V112 C177 162 146 197 105 218 C64 197 33 162 33 112 V46 Z" fill={`url(#${idp}-face)`} />
      {/* gloss */}
      <path d="M105 20 L177 46 V92 C150 104 70 112 33 98 V46 Z" fill={`url(#${idp}-gloss)`} />
      {/* lock */}
      <path d="M85 112 V96 a20 20 0 0 1 40 0 V112" fill="none" stroke={`url(#${idp}-lock)`} strokeWidth="11" strokeLinecap="round" />
      <rect x="70" y="108" width="70" height="56" rx="14" fill={`url(#${idp}-lock)`} />
      <rect x="70" y="150" width="70" height="14" rx="7" fill="#c7d2fe" opacity="0.6" />
      <circle cx="105" cy="131" r="8" fill="#4338ca" />
      <rect x="101.5" y="134" width="7" height="15" rx="3.5" fill="#4338ca" />
    </svg>
  );
}

function AdminLoginForm() {
  const search = useSearchParams();
  const next = safeAdminNext(search.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    search.get("reason") === "session" ? "Your admin session ended. Sign in again." : null
  );
  const [notAdmin, setNotAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  // Already signed in as an admin (or a refresh token can renew it): go straight in.
  useEffect(() => {
    if (!getToken() && !getRefreshToken()) return;
    let cancelled = false;
    apiFetch("/admin/me")
      .then(() => refreshAdminCookie())
      .then((ok) => {
        if (!cancelled && ok) window.location.replace(next);
      })
      .catch(() => {
        /* not an admin session: stay on the sign-in form */
      });
    return () => {
      cancelled = true;
    };
  }, [next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotAdmin(false);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await apiFetch<LoginResponse>("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          country: timeZone.split("/")[0] || undefined,
          location: timeZone,
        }),
      });
      if (res.user?.role !== "admin") {
        setNotAdmin(true);
        setError("This account is not an admin.");
        return;
      }
      setSession(res.token, res.refreshToken);
      window.location.assign(next);
    } catch (err) {
      const code =
        err instanceof ApiError && typeof err.body === "object" && err.body
          ? (err.body as { code?: string }).code
          : undefined;
      if (code === "NOT_ADMIN") {
        setNotAdmin(true);
        setError("This account is not an admin.");
      } else {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={s.page}>
      {/* Background 3D shapes (decorative). */}
      <div className={s.scene} aria-hidden>
        <div className={`${s.sh} ${s.big} ${s.sph} ${s.bgSphereA} ${s.float1}`} />
        <div className={`${s.sh} ${s.big} ${s.bgTorus} ${s.float2}`}>
          <div className={s.torw}>
            <div className={s.tor} />
          </div>
        </div>
        <div className={`${s.sh} ${s.big} ${s.sph} ${s.bgSphereB} ${s.float3}`} />
        <div className={`${s.sh} ${s.big} ${s.bgCube} ${s.float2}`}>
          <div className={s.cube}>
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>

      <div className={s.stage}>
        <div className={s.card}>
          <div className={s.shine} aria-hidden />

          <section className={`${s.pane} ${s.login}`} aria-labelledby="admin-title">
            <div className={`${s.mav} ${a.mavShield}`} aria-hidden>
              <ShieldArt idp="adm-m" />
            </div>
            <AuroraBrand />
            <span className={a.eyebrow}>
              <ShieldCheck aria-hidden />
              Admin console
            </span>
            <h1 id="admin-title" className={s.title}>
              Admin sign-in
            </h1>
            <p className={s.sub}>Only admin accounts can sign in here.</p>

            <form onSubmit={onSubmit} className={s.form} noValidate={false}>
              <AuroraError message={error}>
                {notAdmin && (
                  <>
                    {" "}
                    <Link href="/login" className={s.errorLink}>
                      Go to the user sign-in
                    </Link>
                  </>
                )}
              </AuroraError>
              <AuroraInput
                id="admin-email"
                label="Email"
                icon="mail"
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="username"
                placeholder="admin@example.com"
                required
              />
              <AuroraPassword
                id="admin-password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                required
              />
              <AuroraSubmit loading={busy} idleLabel="Sign in" loadingLabel="Signing in…" />
            </form>

            <p className={s.foot}>
              Not an admin?{" "}
              <Link href="/login" className={s.link}>
                User sign-in
              </Link>
            </p>
          </section>

          <aside className={`${s.ov} ${a.ovStatic}`} aria-label="Admin console">
            <div className={s.ovbg} aria-hidden>
              <div className={`${s.sh} ${s.sph} ${s.ovSphereA} ${s.float1}`} />
              <div className={`${s.sh} ${s.sph} ${s.ovSphereB} ${s.float3}`} />
              <div className={`${s.sh} ${s.ovTorus} ${s.float2}`}>
                <div className={s.torw}>
                  <div className={s.tor} />
                </div>
              </div>
            </div>
            <div className={`${s.copy} ${s.c1}`}>
              <h2 className={s.ovTitle}>Admin Console</h2>
              <p className={s.ovText}>Restricted access. Every sign-in is checked and logged to keep ResumeBuilder safe.</p>
              <Link href="/login" className={s.ghost}>
                User sign-in
              </Link>
              <div className={a.shieldWrap} aria-hidden>
                <div className={s.pod} />
                <div className={a.glow} />
                <div className={`${a.shield} ${a.shieldFloat}`}>
                  <ShieldArt idp="adm-d" />
                </div>
                <span className={`${a.chip} ${a.chipA} ${s.float2}`}>
                  <LockKeyhole aria-hidden /> Encrypted session
                </span>
                <span className={`${a.chip} ${a.chipB} ${s.float3}`}>
                  <KeyRound aria-hidden /> Admins only
                </span>
                <span className={`${a.chip} ${a.chipC} ${s.float1}`}>
                  <Fingerprint aria-hidden /> Activity logged
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="admin-root min-h-screen" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
