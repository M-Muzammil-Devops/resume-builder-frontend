"use client";

import Image from "next/image";
import localFont from "next/font/local";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, LayoutTemplate, Menu, Minus, Plus, X } from "lucide-react";
import { LANDING_TEMPLATES, PENDING_TEMPLATE_KEY, type LandingTemplate } from "@/lib/landingTemplates";
import { createResumeFromLandingTemplate } from "@/lib/continueAfterAuth";
import { apiFetch, getRefreshToken, getToken } from "@/lib/api";
import type { LayoutKey } from "@/shared";
import {
  AI_AFTER,
  AI_BEFORE,
  ATS_KEYWORDS,
  ATS_SAMPLE,
  COLUMN_OPTIONS,
  FAQS,
  PHOTO_OPTIONS,
  STEPS,
  categoryOf,
  cardImage,
  previewSrc,
  type Billing,
  type Card,
  type ColumnFilter,
  type PhotoFilter,
} from "./data";
import { onScrollFrame, useAuroraMotion, useFloatPause, useHeroPointer, useReducedMotion } from "./useAuroraMotion";
import { ToolsMenu } from "@/components/nav/ToolsMenu";
import { HeaderAccount } from "@/components/nav/HeaderAccount";
import { TOOL_LINKS } from "@/components/nav/tools";
import { MobilePdfLinks } from "@/components/nav/MobilePdfLinks";
import { CookieSettingsLink } from "@/components/consent/CookieSettingsLink";
import { applyTemplateSettings, fetchTemplateSettings, type TemplateSetting } from "@/lib/templateSettings";
import s from "./LandingAurora.module.css";

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

/* ---------- decorative 3D pieces (aria-hidden) ---------- */

type ShapeKind = "sa" | "sb" | "sc" | "sg";
function Sphere({ at, kind, float = "f1", depth = 0.06 }: { at: string; kind: ShapeKind; float?: "f1" | "f2" | "f3"; depth?: number }) {
  return (
    <div className={cx(s.par, at)} data-depth={depth} aria-hidden="true">
      <div className={cx(s.sph, s[kind], s[float])} />
    </div>
  );
}
function Torus({ at, float = "f2", depth = 0.05 }: { at: string; float?: "f1" | "f2" | "f3"; depth?: number }) {
  return (
    <div className={cx(s.par, at)} data-depth={depth} aria-hidden="true">
      <div className={cx(s.fill, s[float])}>
        <div className={s.torw}><div className={s.tor} /></div>
      </div>
    </div>
  );
}
function Cube({ at, float = "f2", small = false, depth = 0.05 }: { at: string; float?: "f1" | "f2" | "f3"; small?: boolean; depth?: number }) {
  return (
    <div className={cx(s.par, at)} data-depth={depth} aria-hidden="true">
      <div className={s[float]}>
        <div className={cx(s.cube, small && s.cubeSm)}><i /><i /><i /></div>
      </div>
    </div>
  );
}
function Pill({ at, float = "f1", depth = 0.05 }: { at: string; float?: "f1" | "f2" | "f3"; depth?: number }) {
  return (
    <div className={cx(s.par, at)} data-depth={depth} aria-hidden="true">
      <div className={cx(s.fill, s[float])}><div className={s.pill3d} /></div>
    </div>
  );
}

const STEP_ICONS: ReactNode[] = [
  <svg key="1" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  <svg key="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  <svg key="3" viewBox="0 0 24 24" aria-hidden="true"><path d="m21.6 2.4-1.2 1.2M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M10.2 6.2 9 5" /><path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" /></svg>,
  <svg key="4" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3" /></svg>,
];
const STEP_TONES = [s.i1, s.i2, s.i3, s.i4];

/* ---------- page ---------- */

const auroraBody = localFont({
  src: [
    { path: "../../../../public/fonts/Raleway-Regular.woff", weight: "400", style: "normal" },
    { path: "../../../../public/fonts/Raleway-Bold.woff", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

const auroraHead = localFont({
  src: [
    { path: "../../../../public/fonts/Montserrat-Regular.woff", weight: "400", style: "normal" },
    { path: "../../../../public/fonts/Montserrat-Bold.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-aurora-head",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

export function LandingAurora() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const faqBase = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewTrigger = useRef<HTMLElement | null>(null);
  /** BUG-1315: true while the preview is open; makes close idempotent across pointerdown/click/Esc. */
  const closePreviewRef = useRef<() => void>(() => undefined);
  const previewOpenRef = useRef(false);
  const swallowOff = useRef<(() => void) | null>(null);
  const swipeRef = useRef<{ x: number; moved: boolean } | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remote, setRemote] = useState<LandingTemplate[]>([]);
  // Admin overrides for the built-in templates (enable/disable, order, names, featured).
  const [tplSettings, setTplSettings] = useState<TemplateSetting[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchTemplateSettings().then((rows) => {
      if (!cancelled) setTplSettings(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [category, setCategory] = useState("All");
  const [photo, setPhoto] = useState<PhotoFilter>("all");
  const [columns, setColumns] = useState<ColumnFilter>("all");
  const [active, setActive] = useState(0);
  const [preview, setPreview] = useState<Card | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  /** null until read on the client: the auth slot stays empty (no "Log in" flash for signed-in users). */
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSignedIn(Boolean(getToken() || getRefreshToken())));
    return () => cancelAnimationFrame(frame);
  }, []);
  const [scrolled, setScrolled] = useState(false);
  const [billing, setBilling] = useState<Billing>("monthly");
  const [openFaq, setOpenFaq] = useState(0);

  useAuroraMotion(rootRef, s.in, s.js, reduced, s.instant);
  useFloatPause(rootRef, `.${s.f1}, .${s.f2}, .${s.f3}`, "", reduced);
  useHeroPointer(heroRef, reduced);

  // Admin-uploaded templates (same endpoint the previous landing used).
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ templates: Array<LandingTemplate & { layoutKey: string }> }>("/landing-templates")
      .then((res) => {
        if (cancelled) return;
        setRemote(
          (res.templates || []).map((item) => ({
            ...item,
            layoutKey: item.layoutKey as LayoutKey,
            source: "admin" as const,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setRemote([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nav glass gets denser after scrolling.
  useEffect(() => {
    // Rides the shared once-per-frame scroll bus (BUG-1319: one scroll listener for the page).
    const frame = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    const off = onScrollFrame((y) => setScrolled(y > 24));
    return () => {
      cancelAnimationFrame(frame);
      off();
    };
  }, []);

  // Smooth anchor scrolling (motion allowed only).
  useEffect(() => {
    if (reduced) return;
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";
    return () => {
      html.style.scrollBehavior = previous;
    };
  }, [reduced]);

  // Lock the page while the menu or modal is open.
  useEffect(() => {
    if (!menuOpen && preview === null) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous;
    };
  }, [menuOpen, preview]);

  // Mobile menu: Escape, outside tap and desktop resize close it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 900) setMenuOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const nav = navRef.current;
      if (nav && event.target instanceof Node && !nav.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  // Preview modal: focus first button; Escape closes through the same path as X / Close / backdrop.
  useEffect(() => {
    if (!preview) return;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePreviewRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  // Drop a pending click-swallower if the page unmounts.
  useEffect(() => () => swallowOff.current?.(), []);

  const cards = useMemo(() => {
    const staticMapped: Card[] = LANDING_TEMPLATES.map((item) => ({
      ...item,
      source: "static" as const,
      hasPhoto: item.hasPhoto ?? (item.id !== "classic-serif" && item.id !== "precision-line"),
      columns:
        item.columns ??
        (item.layoutKey === "classic" || item.layoutKey === "timeline" || item.layoutKey === "single-column" || item.layoutKey === "elegant"
          ? "single"
          : "double"),
      category: categoryOf(item.layoutKey, item.department),
    }));
    const remoteMapped: Card[] = remote.map((item) => ({
      ...item,
      source: "admin",
      category: categoryOf(item.layoutKey, item.department),
    }));
    return applyTemplateSettings([...remoteMapped, ...staticMapped], tplSettings);
  }, [remote, tplSettings]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(cards.map((item) => item.category)))], [cards]);
  const templates = useMemo(
    () =>
      cards.filter((item) => {
        if (photo === "photo" && item.hasPhoto === false) return false;
        if (photo === "none" && item.hasPhoto !== false) return false;
        if (columns === "single" && item.columns !== "single") return false;
        if (columns === "double" && item.columns !== "double") return false;
        if (category !== "All" && item.category !== category) return false;
        return true;
      }),
    [cards, photo, columns, category]
  );
  const current = templates.length === 0 ? 0 : Math.min(active, templates.length - 1);
  const activeTemplate = templates[current] ?? null;

  async function selectTemplate(tpl: LandingTemplate) {
    setError(null);
    setBusyId(tpl.id);
    try {
      sessionStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify(tpl));
      if (!getToken()) {
        router.push(`/login?next=template&tpl=${encodeURIComponent(tpl.id)}`);
        return;
      }
      const resume = await createResumeFromLandingTemplate(tpl);
      sessionStorage.removeItem(PENDING_TEMPLATE_KEY);
      router.push(`/user/editor/${resume.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open template");
      setBusyId(null);
    }
  }

  function go(delta: number) {
    if (templates.length === 0) return;
    setActive((current + delta + templates.length) % templates.length);
  }

  function openPreview(tpl: Card, trigger: HTMLElement) {
    // BUG-1315: a click-swallower left by a fast backdrop close must never block the reopened modal.
    swallowOff.current?.();
    previewTrigger.current = trigger;
    previewOpenRef.current = true;
    setPreview(tpl);
  }

  /** BUG-1315: one close path for Esc, X, Close and backdrop. Idempotent; focus goes back to the trigger. */
  function closePreview() {
    if (!previewOpenRef.current) return;
    previewOpenRef.current = false;
    setPreview(null);
    const trigger = previewTrigger.current;
    const restore = () => {
      const target =
        trigger && trigger.isConnected && !(trigger as HTMLButtonElement).disabled
          ? trigger
          : document.querySelector<HTMLElement>('[aria-roledescription="carousel"]');
      target?.focus({ preventScroll: true });
    };
    restore();
    // Again after React has removed the portal (and the scroll lock), in case focus moved meanwhile.
    requestAnimationFrame(restore);
  }

  // Esc handler (effect above) always calls the latest close function.
  useEffect(() => {
    closePreviewRef.current = closePreview;
  });

  function onCarouselKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, templates.length - 1));
    }
  }

  function onSwipeStart(event: ReactPointerEvent<HTMLDivElement>) {
    swipeRef.current = { x: event.clientX, moved: false };
  }

  function onSwipeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeRef.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 44) {
      start.moved = true;
      go(dx < 0 ? 1 : -1);
      // Swallow the click that follows this pointerup, then reset.
      window.setTimeout(() => {
        swipeRef.current = null;
      }, 0);
    } else {
      swipeRef.current = null;
    }
  }

  function onCardClick(index: number, tpl: Card, event: ReactMouseEvent<HTMLButtonElement>) {
    if (swipeRef.current?.moved) return;
    if (index !== current) setActive(index);
    else openPreview(tpl, event.currentTarget);
  }

  // Backdrop (BUG-1315 / BUG-1321). Chromium's touch adjustment re-targets taps that land a few px
  // outside the dialog edge onto the dialog itself (the dialog is a scroller), so "target is the
  // backdrop" alone misses them. On pointerdown (raw, unadjusted coordinates) we close when the target
  // IS the backdrop or the tap point lies outside the dialog's visible box. The follow-up adjusted
  // mousedown/click are swallowed so they can't move focus (to the Skip link / body) or hit the page.
  function tapOutsideDialog(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) return true;
    const dialog = dialogRef.current;
    if (!dialog) return true;
    const r = dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  }
  function onBackdropDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!tapOutsideDialog(event)) return;
    event.preventDefault();
    if (!previewOpenRef.current) return;
    swallowOff.current?.();
    // Swallow only THIS tap's follow-up mousedown and click (once each), so a quick re-tap on PREVIEW still works.
    const swallowDown = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      document.removeEventListener("mousedown", swallowDown, true);
    };
    const swallowClick = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      swallowOff.current?.();
    };
    document.addEventListener("mousedown", swallowDown, true);
    document.addEventListener("click", swallowClick, true);
    const timer = window.setTimeout(() => swallowOff.current?.(), 450);
    swallowOff.current = () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", swallowDown, true);
      document.removeEventListener("click", swallowClick, true);
      swallowOff.current = null;
    };
    closePreview();
  }
  function onBackdropMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) event.preventDefault();
  }
  function onBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    // Mouse/keyboard path (pointerdown already closed touch taps). Only a click ON the backdrop closes.
    if (event.target === event.currentTarget) closePreview();
  }

  function onDialogKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    // BUG-108: keep Tab focus inside the dialog.
    if (event.key !== "Tab") return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const closeMenu = () => setMenuOpen(false);
  const priceUnit = billing === "monthly" ? "/ month" : "/ year";
  const atsFound = ATS_KEYWORDS.length;

  return (
    <div ref={rootRef} className={cx(s.root, auroraBody.className, auroraHead.variable)}>
      <a className={s.skip} href="#main">Skip to content</a>
      <div className={s.grain} aria-hidden="true" />

      {/* Nav */}
      <header ref={navRef} className={cx(s.nav, scrolled && s.navScrolled)}>
        <div className={s.navIn}>
          <Link href="/" className={s.brand} onClick={closeMenu}>
            <span className={s.mark} aria-hidden="true">RB</span>ResumeBuilder
          </Link>
          <nav className={s.links} aria-label="Primary">
            <a href="#how">How it works</a>
            <a href="#templates">Templates</a>
            <ToolsMenu />
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <HeaderAccount loginClassName={s.login} ctaClassName={cx(s.btn, s.btnSm, s.navCta)} />
          <button
            type="button"
            className={s.burger}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="aurora-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
        <div id="aurora-menu" className={cx(s.menu, menuOpen && s.menuOpen)} hidden={!menuOpen}>
          <a href="#how" onClick={closeMenu}>How it works</a>
          <a href="#templates" onClick={closeMenu}>Templates</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#pricing" onClick={closeMenu}>Pricing</a>
          <span className={s.menuLabel}>Tools</span>
          {TOOL_LINKS.filter((tool) => tool.tone !== "c").map((tool) => (
            <Link key={tool.href} href={tool.href} onClick={closeMenu}>
              {tool.title}
              {tool.badge && <em className={s.menuBadge}>{tool.badge}</em>}
            </Link>
          ))}
          <MobilePdfLinks onNavigate={closeMenu} />
          {signedIn ? (
            <Link href="/user/dashboard" className={cx(s.btn, s.btnSm)} onClick={closeMenu}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" onClick={closeMenu}>Log in</Link>
              <Link href="/register" className={cx(s.btn, s.btnSm)} onClick={closeMenu}>Get started</Link>
            </>
          )}
        </div>
      </header>

      <main id="main">
        {/* 1. Hero */}
        <section ref={heroRef} className={s.hero} aria-labelledby="aurora-hero-title">
          <div className={s.gridfloor} aria-hidden="true" />
          <div className={s.wrap}>
            <Sphere at={s.pHeroA} kind="sa" float="f1" depth={0.1} />
            <Torus at={s.pHeroB} float="f2" depth={0.08} />
            <div className={s.heroGrid}>
              <div className={s.heroCopy}>
                <span className={s.eyebrow}>✦ ATS-ready resume studio</span>
                <h1 id="aurora-hero-title">
                  Build a resume that <span className={s.grad}>gets interviews</span>
                </h1>
                <p className={s.lead}>Pick a template, edit it live, polish the wording, and download a PDF that matches the page.</p>
                <div className={s.actions}>
                  <Link href="/register" className={s.btn}>
                    Build my resume <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <a href="#templates" className={s.ghost}>Browse templates</a>
                </div>
                <ul className={s.points}>
                  <li><span className={s.tick} aria-hidden="true"><Check size={12} /></span>Free PDF download</li>
                  <li><span className={s.tick} aria-hidden="true"><Check size={12} /></span>A4 &amp; US Letter</li>
                  <li><span className={s.tick} aria-hidden="true"><Check size={12} /></span>AI waits for your OK</li>
                </ul>
              </div>

              <div className={s.stage} aria-hidden="true">
                <div className={s.podglow} />
                <div className={s.sheetWrap}>
                  <div className={cx(s.sheet3d, s.f2)}>
                    <div className={s.back} />
                    <div className={s.sheet}>
                      <div className={s.shHead}>
                        <span className={s.av} />
                        <div><b>Alex Morgan</b><small>Senior Product Designer</small></div>
                      </div>
                      <div className={s.shBody}>
                        <div>
                          <span className={cx(s.ln, s.t)} /><span className={s.ln} /><span className={cx(s.ln, s.w8)} /><span className={cx(s.ln, s.w6)} /><span className={s.ln} /><span className={cx(s.ln, s.w7)} />
                          <span className={cx(s.ln, s.t, s.gap)} /><span className={cx(s.ln, s.w8)} /><span className={s.ln} /><span className={cx(s.ln, s.w6)} /><span className={cx(s.ln, s.w7)} /><span className={cx(s.ln, s.w5)} />
                        </div>
                        <div>
                          <span className={cx(s.ln, s.t)} /><div className={s.pills}><i /><i /><i /><i /><i /></div><span className={cx(s.ln, s.w8)} /><span className={cx(s.ln, s.w5)} />
                          <span className={cx(s.ln, s.t, s.gap)} /><div className={s.pills}><i /><i /><i /></div><span className={cx(s.ln, s.w7)} /><span className={cx(s.ln, s.w5)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={cx(s.pod, s.heroPod)} />
                <Image className={s.heroChar} src="/auth/man-shadow.webp" alt="" width={540} height={1069} priority sizes="(max-width: 767px) 180px, 260px" />
                <div className={s.heroBadges}>
                <div className={cx(s.chip, s.chipA, s.f1)}><span className={cx(s.dot, s.dGreen)}>✓</span><div>ATS score 92<small>Sample score</small></div></div>
                <div className={cx(s.chip, s.chipB, s.f3)}><span className={cx(s.dot, s.dViolet)}>✦</span><div>AI polish<small>You accept every change</small></div></div>
                <div className={cx(s.chip, s.chipC, s.f2)}><span className={cx(s.dot, s.dBlue)}>⤓</span><div>PDF ready<small>A4 · US Letter</small></div></div>
                </div>
                <Sphere at={s.pHeroC} kind="sb" float="f3" depth={0.04} />
                <Sphere at={s.pHeroD} kind="sg" float="f1" depth={0.03} />
                <Cube at={s.pHeroE} float="f2" small depth={0.05} />
              </div>
            </div>
          </div>
        </section>

        {/* 2. How it works */}
        <section id="how" className={s.sec} aria-labelledby="aurora-how-title">
          <div className={s.wrap}>
            <Sphere at={s.pHowA} kind="sc" float="f2" depth={0.08} />
            <div className={s.head} data-reveal>
              <span className={s.kicker}>How it works</span>
              <h2 id="aurora-how-title">From blank page to download in four moves</h2>
            </div>
            <div className={s.howGrid}>
              <ol className={s.steps}>
                {STEPS.map((step, index) => (
                  <li key={step.title} className={cx(s.glass, s.step)} data-reveal data-tilt="10">
                    <span className={s.num} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div className={cx(s.ico, STEP_TONES[index])}>{STEP_ICONS[index]}</div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </li>
                ))}
              </ol>
              <div className={s.howChar} data-reveal aria-hidden="true">
                <div className={s.bubble}>“Type right on the page. It saves as you write.”</div>
                <Sphere at={s.pHowB} kind="sb" float="f1" depth={0.03} />
                <Torus at={s.pHowC} float="f2" depth={0.04} />
                <div className={cx(s.pod, s.howPod)} />
                <Image className={s.howImg} src="/auth/boy-shadow.webp" alt="" width={689} height={886} sizes="240px" />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Templates */}
        <section id="templates" className={s.sec} aria-labelledby="aurora-tpl-title">
          <div className={s.wrap}>
            <div className={s.head} data-reveal>
              <span className={s.kicker}>Templates</span>
              <h2 id="aurora-tpl-title">Choose your template</h2>
              <p>Spin through the designs, preview one up close, then open it in the editor.</p>
            </div>

            {error && <p className={s.error} role="alert">{error}</p>}

            <div className={s.tplBar} role="group" aria-label="Template category">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  className={cx(s.tab, category === item && s.on)}
                  onClick={() => {
                    setCategory(item);
                    setActive(0);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className={s.filters}>
              <div className={s.filter}>
                <span id="aurora-filter-photo">Photo</span>
                <div className={s.seg} role="group" aria-labelledby="aurora-filter-photo">
                  {PHOTO_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={photo === id}
                      className={cx(photo === id && s.on)}
                      onClick={() => {
                        setPhoto(id);
                        setActive(0);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.filter}>
                <span id="aurora-filter-columns">Columns</span>
                <div className={s.seg} role="group" aria-labelledby="aurora-filter-columns">
                  {COLUMN_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={columns === id}
                      className={cx(columns === id && s.on)}
                      onClick={() => {
                        setColumns(id);
                        setActive(0);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {templates.length === 0 ? (
              <div className={cx(s.glass, s.empty)} role="status">
                <LayoutTemplate size={28} aria-hidden="true" />
                <h3>No templates match these filters</h3>
                <p>Try another photo, column, or category option.</p>
                <button
                  type="button"
                  className={s.ghost}
                  onClick={() => {
                    setCategory("All");
                    setPhoto("all");
                    setColumns("all");
                    setActive(0);
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div
                  className={s.flow}
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Resume templates. Use left and right arrow keys to browse."
                  tabIndex={0}
                  onKeyDown={onCarouselKey}
                  onPointerDown={onSwipeStart}
                  onPointerUp={onSwipeEnd}
                >
                  <div className={s.floor} aria-hidden="true" />
                  {templates.map((tpl, index) => {
                    const offset = Math.max(-3, Math.min(3, index - current));
                    const hidden = Math.abs(index - current) > 2;
                    return (
                      <button
                        key={`${tpl.source}-${tpl.id}`}
                        type="button"
                        className={s.tc}
                        data-o={offset}
                        aria-hidden={hidden || undefined}
                        tabIndex={index === current ? 0 : -1}
                        disabled={busyId !== null}
                        aria-label={index === current ? `Preview ${tpl.name}` : `Show ${tpl.name}`}
                        onClick={(event) => onCardClick(index, tpl, event)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          {...cardImage(tpl.image)}
                          alt=""
                          width={560}
                          height={792}
                          loading={index === current ? "eager" : "lazy"}
                          decoding="async"
                          draggable={false}
                        />
                      </button>
                    );
                  })}
                  <Image className={s.tplChar} src="/landing/woman-shadow.webp" alt="" width={474} height={1081} sizes="(max-width: 767px) 110px, 180px" aria-hidden="true" />
                  <Sphere at={s.pTplA} kind="sa" float="f1" depth={0.06} />
                  <Cube at={s.pTplB} float="f3" small depth={0.05} />
                </div>

                <div className={s.tplInfo} aria-live="polite">
                  <div className={s.ctrl}>
                    <button type="button" className={s.round} aria-label="Previous template" onClick={() => go(-1)}>
                      <ChevronLeft size={20} aria-hidden="true" />
                    </button>
                    <div className={s.dots} aria-hidden="true">
                      {templates.map((tpl, index) => (
                        <i key={`${tpl.source}-${tpl.id}`} className={cx(index === current && s.on)} />
                      ))}
                    </div>
                    <button type="button" className={s.round} aria-label="Next template" onClick={() => go(1)}>
                      <ChevronRight size={20} aria-hidden="true" />
                    </button>
                  </div>
                  {activeTemplate && (
                    <>
                      <p className={s.tplCount}>{current + 1} / {templates.length}</p>
                      <h3>{activeTemplate.name}</h3>
                      <p>{activeTemplate.category} · {activeTemplate.columns === "single" ? "Single column" : "Two columns"}</p>
                      <div className={cx(s.actions, s.center)}>
                        <button
                          type="button"
                          className={s.ghost}
                          disabled={busyId !== null}
                          onClick={(event) => openPreview(activeTemplate, event.currentTarget)}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          className={s.btn}
                          disabled={busyId !== null}
                          onClick={() => void selectTemplate(activeTemplate)}
                        >
                          {busyId === activeTemplate.id ? "Opening…" : "Use this template"} <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* 4. Features */}
        <section id="features" className={s.sec} aria-labelledby="aurora-feat-title">
          <div className={s.wrap}>
            <Sphere at={s.pFeatA} kind="sb" float="f3" depth={0.1} />
            <Torus at={s.pFeatB} float="f1" depth={0.08} />
            <div className={s.head} data-reveal>
              <span className={s.kicker}>Features</span>
              <h2 id="aurora-feat-title">Check it before you send it</h2>
              <p>Match the job description, tighten the wording, and keep every change under your control.</p>
            </div>
            <div className={s.feat}>
              <article className={cx(s.glass, s.fcard)} data-reveal data-tilt="5">
                <h3>ATS score</h3>
                <p>Paste the job description and see which real keywords your resume already covers.</p>
                <div className={s.ring} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ATS_SAMPLE} aria-label="Sample ATS score">
                  <b>{ATS_SAMPLE}</b><small>ATS score</small>
                </div>
                <ul className={s.kw} aria-label="Sample keyword matches">
                  {ATS_KEYWORDS.slice(0, atsFound).map((word) => (
                    <li key={word}><Check size={12} aria-hidden="true" /> {word}</li>
                  ))}
                </ul>
                <small className={s.note}>Sample score shown for illustration.</small>
              </article>
              <article className={cx(s.glass, s.fcard)} data-reveal data-tilt="5">
                <h3>AI improve</h3>
                <p>Rewrite a line shorter, longer, clearer, or with cleaner grammar. You decide what stays.</p>
                <div className={s.ba}>
                  <p className={s.before}><small>Before</small>{AI_BEFORE}</p>
                  <p className={s.after}><small>After</small>{AI_AFTER}</p>
                </div>
                <div className={s.acts} aria-hidden="true"><span className={s.ok}>Accept</span><span>Reject</span><span>Retry</span></div>
                <Sphere at={s.pFeatC} kind="sb" float="f2" depth={0.03} />
                <Pill at={s.pFeatD} float="f1" depth={0.03} />
              </article>
            </div>
            <dl className={s.stats}>
              <div className={cx(s.glass, s.stat)} data-reveal data-tilt="8"><dt>Templates to start from</dt><dd>{cards.length}</dd></div>
              <div className={cx(s.glass, s.stat)} data-reveal data-tilt="8"><dt>AI writing actions</dt><dd>4</dd></div>
              <div className={cx(s.glass, s.stat)} data-reveal data-tilt="8"><dt>Page sizes: A4 &amp; US Letter</dt><dd>2</dd></div>
              <div className={cx(s.glass, s.stat)} data-reveal data-tilt="8"><dt>To create and download a PDF</dt><dd>$0</dd></div>
            </dl>
          </div>
        </section>

        {/* 5. Pricing */}
        <section id="pricing" className={s.sec} aria-labelledby="aurora-price-title">
          <div className={s.wrap}>
            <Sphere at={s.pPriceA} kind="sg" float="f1" depth={0.1} />
            <Cube at={s.pPriceB} float="f2" depth={0.08} />
            <div className={s.head} data-reveal>
              <span className={s.kicker}>Pricing</span>
              <h2 id="aurora-price-title">Start free. Upgrade when you need more.</h2>
            </div>
            <div className={s.toggle}>
              <div role="radiogroup" aria-label="Billing period">
                <button type="button" role="radio" aria-checked={billing === "monthly"} className={cx(billing === "monthly" && s.on)} onClick={() => setBilling("monthly")}>Monthly</button>
                <button type="button" role="radio" aria-checked={billing === "yearly"} className={cx(billing === "yearly" && s.on)} onClick={() => setBilling("yearly")}>Yearly</button>
              </div>
            </div>
            <div className={s.prices}>
              <article className={cx(s.glass, s.price)} data-reveal data-tilt="6">
                <h3>Free</h3>
                <p className={s.amt}>$0<small>{priceUnit}</small></p>
                <ul>
                  <li><span className={s.tick} aria-hidden="true"><Check size={12} /></span>Resume editor and templates</li>
                  <li><span className={s.tick} aria-hidden="true"><Check size={12} /></span>PDF download</li>
                  <li><span className={s.tick} aria-hidden="true"><Check size={12} /></span>ATS check</li>
                </ul>
                <Link href="/register" className={cx(s.ghost, s.block)}>Create free account</Link>
              </article>
              <article className={cx(s.glass, s.price, s.pro)} data-reveal data-tilt="6">
                <span className={s.badge}>Coming soon</span>
                <h3>Pro</h3>
                <p className={s.amt}>Soon<small>{billing === "monthly" ? "monthly plan" : "yearly plan"}</small></p>
                <ul>
                  <li><span className={s.tick} aria-hidden="true"><Check size={12} /></span>Unlimited resumes</li>
                  <li><span className={s.tick} aria-hidden="true"><Check size={12} /></span>DOCX export</li>
                  <li><span className={s.tick} aria-hidden="true"><Check size={12} /></span>Share links with expiry</li>
                </ul>
                <Link href="/register" className={cx(s.btn, s.btnLight, s.block)}>
                  Start free today <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            </div>
            <p className={s.pnote}>Create a free account and download a PDF today. Pro billing opens later.</p>
          </div>
        </section>

        {/* 6. FAQ */}
        <section id="faq" className={cx(s.sec, s.secFaq)} aria-labelledby="aurora-faq-title">
          <div className={s.wrap}>
            <Sphere at={s.pFaqA} kind="sc" float="f2" depth={0.08} />
            <Pill at={s.pFaqB} float="f3" depth={0.06} />
            <div className={s.head} data-reveal>
              <span className={s.kicker}>FAQ</span>
              <h2 id="aurora-faq-title">Questions</h2>
            </div>
            <div className={s.faq}>
              {FAQS.map(([question, answer], index) => {
                const open = openFaq === index;
                const btnId = `${faqBase}-q${index}`;
                const panelId = `${faqBase}-a${index}`;
                return (
                  <div key={question} className={cx(s.glass, s.q, open && s.qOpen)} data-reveal>
                    <h3>
                      <button
                        id={btnId}
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq(open ? -1 : index)}
                      >
                        <span>{question}</span>
                        <i aria-hidden="true">{open ? <Minus size={16} /> : <Plus size={16} />}</i>
                      </button>
                    </h3>
                    <div id={panelId} role="region" aria-labelledby={btnId} className={s.answer} hidden={!open}>
                      <p>{answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7. Final CTA */}
        <section className={cx(s.sec, s.secFinal)} aria-labelledby="aurora-final-title">
          <div className={s.final} data-reveal>
            <Sphere at={s.pFinA} kind="sg" float="f1" depth={0.04} />
            <Torus at={s.pFinB} float="f2" depth={0.05} />
            <Sphere at={s.pFinC} kind="sa" float="f3" depth={0.03} />
            <div className={s.finalCopy}>
              <h2 id="aurora-final-title">Your next resume can start now</h2>
              <p>Free account. No document to import. Pick a template and edit on the page.</p>
              <div className={s.actions}>
                <Link href="/register" className={cx(s.btn, s.btnLight)}>
                  Create free account <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <a href="#templates" className={s.ghost}>Browse templates</a>
              </div>
            </div>
            <div className={cx(s.podglow, s.finalGlow)} aria-hidden="true" />
            <Image className={cx(s.jump, s.f1)} src="/landing/jump-shadow.webp" alt="" width={669} height={1017} sizes="(max-width: 767px) 200px, 310px" aria-hidden="true" />
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.wrap}>
          <div className={s.foot}>
            <Link href="/" className={s.brand}>
              <span className={s.mark} aria-hidden="true">RB</span>ResumeBuilder
            </Link>
            <nav aria-label="Legal">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/contact">Contact</Link>
              <CookieSettingsLink />
            </nav>
          </div>
        </div>
      </footer>

      {preview && typeof document !== "undefined" && createPortal(
        <div className={cx(s.modalBack, auroraBody.className, auroraHead.variable)} role="presentation" onPointerDown={onBackdropDown} onMouseDown={onBackdropMouseDown} onClick={onBackdropClick}>
          <div
            ref={dialogRef}
            className={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="aurora-preview-title"
            aria-describedby="aurora-preview-desc"
            tabIndex={-1}
            onKeyDown={onDialogKey}
          >
            <button type="button" className={s.modalX} aria-label="Close preview" onClick={closePreview}>
              <X size={18} aria-hidden="true" />
            </button>
            <div className={s.modalImg}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc(preview.image)} alt={`${preview.name} template preview`} />
            </div>
            <div className={s.modalBody}>
              <span className={s.kicker}>{preview.category}</span>
              <h3 id="aurora-preview-title">{preview.name}</h3>
              <p id="aurora-preview-desc">{preview.blurb}</p>
              <div className={s.actions}>
                <button type="button" className={s.ghost} onClick={closePreview}>Close</button>
                <button
                  type="button"
                  className={s.btn}
                  disabled={busyId !== null}
                  onClick={() => {
                    const chosen = preview;
                    previewOpenRef.current = false;
                    setPreview(null);
                    void selectTemplate(chosen);
                  }}
                >
                  {busyId === preview.id ? "Opening…" : "Use this template"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
