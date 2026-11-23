"use client";

import Image from "next/image";
import { KeyboardEvent, MouseEvent, PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { RegisterPanel } from "@/components/auth/RegisterPanel";
import { SignedInCard } from "@/components/auth/SignedInCard";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import s from "./AuthSlider.module.css";
import m from "./AuthSso.module.css";

export type AuthMode = "login" | "register";

const PATHS: Record<AuthMode, string> = { login: "/login", register: "/register" };
/** Keep in sync with --slide in AuthSlider.module.css; extra clicks during the slide are ignored. */
const SLIDE_MS = 580;
const SWIPE_PX = 40;

/**
 * Round 12 "Midnight Aurora" auth page: one card with both forms and a sliding overlay.
 * /login and /register both render this; switching keeps the query string (next, tpl) and
 * swaps the URL with history.replaceState, so deep links and refreshes land on the right side.
 */
export function AuthSlider({ initialMode }: { initialMode: AuthMode }) {
  const user = useCurrentUser();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const switched = useRef(false);
  const loginRef = useRef<HTMLElement>(null);
  const registerRef = useRef<HTMLElement>(null);

  const busyUntil = useRef(0);
  const dragStartX = useRef<number | null>(null);
  /** BUG-1313: a drag ends with a click on the captured overlay; ignore clicks until this time. */
  const suppressClickUntil = useRef(0);
  /** BUG-1310: where focus goes after a switch (tab keyboard keeps it on the tablist). */
  const focusAfter = useRef<"heading" | "tab">("heading");

  const go = useCallback(
    (next: AuthMode, opts: { focus?: "heading" | "tab"; force?: boolean } = {}) => {
      if (next === mode) return;
      const now = Date.now();
      // No double trigger mid-slide (tab keyboard may reverse mid-slide: CSS transitions retarget).
      if (!opts.force && now < busyUntil.current) return;
      busyUntil.current = now + SLIDE_MS;
      switched.current = true;
      focusAfter.current = opts.focus ?? "heading";
      const url = `${PATHS[next]}${window.location.search}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", url);
      setMode(next);
    },
    [mode],
  );

  const other: AuthMode = mode === "login" ? "register" : "login";

  // Round 15: the curved panel switches sides. Cursor fix: only its button switches on click (the rest of
  // the panel is plain, selectable text with a normal cursor); the button's click bubbles up to here.
  function onOverlayClick(e: MouseEvent<HTMLElement>) {
    if (Date.now() < suppressClickUntil.current) {
      suppressClickUntil.current = 0;
      e.preventDefault();
      return;
    }
    if (!(e.target instanceof Element) || !e.target.closest("button")) return;
    go(other);
  }

  // Optional swipe: drag the panel toward the other side (left on sign-in, right on create-account).
  // BUG-1313: capture the pointer so long drags and drags that end off the overlay still count.
  // Touch / pen only: a mouse drag selects text instead.
  function onOverlayPointerDown(e: PointerEvent<HTMLElement>) {
    if (e.pointerType === "mouse") return;
    dragStartX.current = e.clientX;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
  }
  function endDrag(e: PointerEvent<HTMLElement>) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function onOverlayPointerUp(e: PointerEvent<HTMLElement>) {
    const start = dragStartX.current;
    dragStartX.current = null;
    endDrag(e);
    if (start === null) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) < SWIPE_PX) return; // a tap: the click handler switches
    suppressClickUntil.current = Date.now() + 500; // a drag never also counts as a click
    const rightWay = mode === "login" ? dx < 0 : dx > 0; // no upper bound on distance
    if (rightWay) go(other);
  }
  function onOverlayPointerCancel(e: PointerEvent<HTMLElement>) {
    dragStartX.current = null;
    endDrag(e);
  }

  // Once the new side is active: tab-keyboard switches keep focus on the selected tab (BUG-1310);
  // overlay / button / link switches move focus to the new heading.
  useEffect(() => {
    if (!switched.current) return;
    if (focusAfter.current === "tab") {
      document.getElementById(`auth-tab-${mode}`)?.focus({ preventScroll: true });
      return;
    }
    const panel = mode === "login" ? loginRef.current : registerRef.current;
    const heading = panel?.querySelector<HTMLElement>("h1");
    heading?.focus({ preventScroll: true });
  }, [mode]);

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    let next: AuthMode | null = null;
    if (e.key === "Home") next = "login";
    else if (e.key === "End") next = "register";
    else if (e.key === "ArrowLeft" || e.key === "ArrowRight") next = mode === "login" ? "register" : "login"; // two tabs: arrows wrap
    if (!next) return;
    e.preventDefault();
    document.getElementById(`auth-tab-${next}`)?.focus({ preventScroll: true });
    go(next, { focus: "tab", force: true });
  }

  const isReg = mode === "register";

  // Signed in already: show the account card (Dashboard / Settings / Log out) instead of the forms.
  if (user) {
    return (
      <main className={s.page}>
        <div className={m.themeCorner}>
          <ThemeToggle />
        </div>
        <div className={m.signedWrap}>
          <SignedInCard user={user} />
        </div>
        <AuthFooter />
      </main>
    );
  }

  return (
    <main className={s.page} aria-busy={user === undefined || undefined}>
      <div className={m.themeCorner}>
        <ThemeToggle />
      </div>
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

      <div className={`${s.stage} ${isReg ? s.r : ""}`} data-mode={mode}>
        <div className={s.card}>
          <div className={s.shine} aria-hidden />

          <div className={s.tabs} role="tablist" aria-label="Choose sign in or create account" onKeyDown={onTabKey}>
            <button
              type="button"
              role="tab"
              id="auth-tab-login"
              aria-selected={!isReg}
              aria-controls="auth-panel-login"
              tabIndex={isReg ? -1 : 0}
              className={!isReg ? s.tabOn : s.tab}
              onClick={() => go("login", { focus: "tab" })}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              id="auth-tab-register"
              aria-selected={isReg}
              aria-controls="auth-panel-register"
              tabIndex={isReg ? 0 : -1}
              className={isReg ? s.tabOn : s.tab}
              onClick={() => go("register", { focus: "tab" })}
            >
              Sign up
            </button>
          </div>

          <section
            ref={loginRef}
            id="auth-panel-login"
            role="tabpanel"
            aria-labelledby="login-title"
            className={`${s.pane} ${s.login}`}
            inert={isReg}
          >
            <div className={s.mav} aria-hidden>
              <Image src="/auth/man.webp" alt="" width={540} height={1069} sizes="112px" className={s.mavImg} />
            </div>
            <LoginPanel onSwitch={() => go("register")} />
          </section>

          <section
            ref={registerRef}
            id="auth-panel-register"
            role="tabpanel"
            aria-labelledby="register-title"
            className={`${s.pane} ${s.reg}`}
            inert={!isReg}
          >
            <div className={s.mav} aria-hidden>
              <Image src="/auth/boy.webp" alt="" width={689} height={886} sizes="112px" className={s.mavImg} />
            </div>
            <RegisterPanel onSwitch={() => go("login")} />
          </section>

          <aside
            className={s.ov}
            aria-label="Switch between sign in and create account"
            onClick={onOverlayClick}
            onPointerDown={onOverlayPointerDown}
            onPointerUp={onOverlayPointerUp}
            onPointerCancel={onOverlayPointerCancel}
            onLostPointerCapture={() => {
              dragStartX.current = null;
            }}
            onDragStart={(e) => e.preventDefault()}
          >
            <div className={s.ovbg} aria-hidden>
              <div className={`${s.sh} ${s.sph} ${s.ovSphereA} ${s.float1}`} />
              <div className={`${s.sh} ${s.sph} ${s.ovSphereB} ${s.float3}`} />
              <div className={`${s.sh} ${s.ovTorus} ${s.float2}`}>
                <div className={s.torw}>
                  <div className={s.tor} />
                </div>
              </div>
            </div>

            <div className={`${s.copy} ${s.c1}`} inert={isReg}>
              <h2 className={s.ovTitle}>Hello, Friend!</h2>
              <p className={s.ovText}>New to ResumeBuilder? Create an account and build your first resume today.</p>
              <button type="button" className={s.ghost}>
                Sign up
              </button>
              <div className={`${s.char} ${s.man}`} aria-hidden>
                <div className={s.pod} />
                <Image src="/auth/man.webp" alt="" width={540} height={1069} sizes="200px" className={s.charImg} priority={!isReg} />
              </div>
            </div>

            <div className={`${s.copy} ${s.c2}`} inert={!isReg}>
              <h2 className={s.ovTitle}>Welcome Back!</h2>
              <p className={s.ovText}>Already have an account? Sign in to pick up right where you left off.</p>
              <button type="button" className={s.ghost}>
                Sign in
              </button>
              <div className={`${s.char} ${s.boy}`} aria-hidden>
                <div className={s.pod} />
                <Image src="/auth/boy.webp" alt="" width={689} height={886} sizes="240px" className={s.charImg} />
              </div>
            </div>
          </aside>
        </div>

        {/* Shapes in front of the card edge (decorative). */}
        <div className={`${s.sh} ${s.big} ${s.frontDoc} ${s.float3}`} aria-hidden>
          <svg className={s.doc} viewBox="0 0 150 190" width="150" height="190" focusable="false">
            <defs>
              <linearGradient id="aurora-pg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#dfe6f7" />
              </linearGradient>
              <linearGradient id="aurora-hd" x1="0" x2="1">
                <stop offset="0" stopColor="#38bdf8" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <path d="M12 6h92l36 36v136a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8V14a8 8 0 0 1 8-8z" fill="url(#aurora-pg)" />
            <path d="M104 6l36 36h-28a8 8 0 0 1-8-8z" fill="#c4cee8" />
            <circle cx="40" cy="48" r="16" fill="url(#aurora-hd)" />
            <rect x="64" y="38" width="44" height="7" rx="3.5" fill="url(#aurora-hd)" />
            <rect x="64" y="52" width="30" height="6" rx="3" fill="#c4cee8" />
            <rect x="20" y="84" width="104" height="7" rx="3.5" fill="#c4cee8" />
            <rect x="20" y="102" width="92" height="7" rx="3.5" fill="#d3dbef" />
            <rect x="20" y="120" width="104" height="7" rx="3.5" fill="#d3dbef" />
            <rect x="20" y="138" width="70" height="7" rx="3.5" fill="#d3dbef" />
            <rect x="20" y="158" width="52" height="9" rx="4.5" fill="url(#aurora-hd)" />
          </svg>
        </div>
        <div className={`${s.sh} ${s.big} ${s.sph} ${s.frontSphere} ${s.float1}`} aria-hidden />
      </div>
      <AuthFooter />
    </main>
  );
}
