"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FileDown,
  LayoutTemplate,
  Menu,
  PenLine,
  RotateCcw,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import type Lenis from "lenis";
import {
  LANDING_TEMPLATES,
  PENDING_TEMPLATE_KEY,
  type LandingTemplate,
} from "@/lib/landingTemplates";
import { createResumeFromLandingTemplate } from "@/lib/continueAfterAuth";
import { apiFetch, getToken } from "@/lib/api";
import type { LayoutKey } from "@/shared";
import { ParticleField } from "./ParticleField";
import { landingBody, landingDisplay } from "./fonts";
import "./landing.css";

type Card = LandingTemplate & { source: "static" | "admin"; category: string };
type Billing = "monthly" | "yearly";
type PhotoFilter = "all" | "photo" | "none";
type ColumnFilter = "all" | "single" | "double";

const PHOTO_OPTIONS: Array<[PhotoFilter, string]> = [["all", "All"], ["photo", "Photo"], ["none", "No Photo"]];
const COLUMN_OPTIONS: Array<[ColumnFilter, string]> = [["all", "All"], ["single", "Single"], ["double", "Double"]];
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

const FAQS = [
  ["Is the free account enough to download a resume?", "Yes. You can create a resume, edit it, and download a PDF without a paid plan."],
  ["Will the preview match the PDF?", "The PDF is rendered from the same resume page you edit, including A4 and US Letter."],
  ["Does the AI rewrite my text by itself?", "No. Shorter, longer, improve, and grammar suggestions wait for Accept, Reject, or Retry."],
  ["Can I use it on a phone?", "Yes. The editor tools stay reachable on a small screen."],
] as const;

const STEPS = [
  { title: "Choose a template", body: "Flip through designs, preview one up close, and open the one that fits your role.", Icon: LayoutTemplate },
  { title: "Edit live", body: "Type on the page. Saving starts as you write, and the layout stays put.", Icon: PenLine },
  { title: "AI polish", body: "Ask for shorter, longer, clearer, or cleaner grammar. Nothing changes until you accept it.", Icon: WandSparkles },
  { title: "Download PDF", body: "Download a PDF on the free plan in A4 or US Letter. Links stay clickable in the PDF.", Icon: FileDown },
] as const;

const AI_BEFORE = "Helped the team with deployments and stuff.";
const AI_AFTER = "Cut release time by 30% by automating the deployment pipeline.";
const ATS_SAMPLE = 92;
const ATS_KEYWORDS = ["CI/CD", "Node.js", "Docker", "Kubernetes", "Terraform"];
const HEADLINE = ["Build", "a", "resume", "that", "gets", "interviews"];

function categoryOf(layoutKey: string, department?: string) {
  if (department && department !== "Custom") return department;
  if (layoutKey === "classic" || layoutKey === "elegant" || layoutKey === "timeline") return "Traditional";
  if (layoutKey === "stylish" || layoutKey === "polished" || layoutKey === "ivy-league" || layoutKey === "single-column") return "Leadership";
  return "Modern";
}

function subscribeReduced(callback: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false
  );
}

function prefersReduced() {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_QUERY).matches;
}

/** Calls `onEnter` once when the element scrolls into view. */
function useInView<T extends HTMLElement>(onEnter: () => void, threshold = 0.4) {
  const ref = useRef<T>(null);
  const callback = useRef(onEnter);
  useEffect(() => {
    callback.current = onEnter;
  });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          callback.current();
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return ref;
}

/** Animates a number from 0 to `to` with an ease-out curve. */
function animateNumber(to: number, duration: number, onFrame: (value: number | null) => void) {
  const start = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    onFrame(Math.round(to * (1 - (1 - progress) ** 3)));
    if (progress < 1) frame = requestAnimationFrame(tick);
    else onFrame(null);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

function CountUp({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState<number | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const ref = useInView<HTMLSpanElement>(() => {
    if (prefersReduced() || to === 0) return;
    stopRef.current = animateNumber(to, 1400, setValue);
  }, 0.6);
  useEffect(() => () => stopRef.current(), []);
  return (
    <span ref={ref}>
      {/* BUG-1105: aria-label is not allowed on a plain span; screen readers read this text. */}
      <span className="rbx-sr">{`${prefix}${to}${suffix}`}</span>
      <span aria-hidden="true">{prefix}{value ?? to}{suffix}</span>
    </span>
  );
}

/** Wraps a CTA so it drifts toward the pointer (mouse only, motion allowed). */
function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const onMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "mouse" || prefersReduced()) return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
  };
  const onLeave = (event: ReactPointerEvent<HTMLSpanElement>) => {
    event.currentTarget.style.transform = "";
  };
  return (
    <span className="rbx-magnetic" onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </span>
  );
}

function AtsMeter() {
  const [value, setValue] = useState<number | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const ref = useInView<HTMLDivElement>(() => {
    if (prefersReduced()) return;
    setValue(0);
    stopRef.current = animateNumber(ATS_SAMPLE, 1600, setValue);
  }, 0.5);
  useEffect(() => () => stopRef.current(), []);
  const score = value ?? ATS_SAMPLE;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const found = Math.round((score / ATS_SAMPLE) * (ATS_KEYWORDS.length - 1));
  return (
    <div ref={ref} className="rbx-ats">
      <div
        className="rbx-ats-ring"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label="Sample ATS score"
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="rbx-ats-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7C5CFF" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={radius} className="rbx-ats-track" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            className="rbx-ats-value"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - score / 100)}
          />
        </svg>
        <div className="rbx-ats-number">
          <strong>{score}</strong>
          <span>/ 100</span>
        </div>
      </div>
      <ul className="rbx-ats-keys" aria-label="Sample keyword matches">
        {ATS_KEYWORDS.map((word, index) => (
          <li key={word} className={index < found ? "is-hit" : ""}>
            {index < found ? <Check size={12} aria-hidden="true" /> : <span className="rbx-dot" aria-hidden="true" />}
            {word}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypingDemo() {
  const [typed, setTyped] = useState(AI_AFTER.length);
  const [run, setRun] = useState(0);
  const start = () => {
    if (prefersReduced()) {
      setTyped(AI_AFTER.length);
      return;
    }
    setTyped(0);
    setRun((value) => value + 1);
  };
  const ref = useInView<HTMLDivElement>(start, 0.5);

  useEffect(() => {
    if (run === 0) return;
    const timer = window.setInterval(() => {
      setTyped((count) => {
        if (count >= AI_AFTER.length) {
          window.clearInterval(timer);
          return count;
        }
        return count + 1;
      });
    }, 32);
    return () => window.clearInterval(timer);
  }, [run]);

  const done = typed >= AI_AFTER.length;
  return (
    <div ref={ref} className="rbx-ai">
      <div className="rbx-ai-actions" aria-hidden="true">
        <span>Shorter</span>
        <span>Longer</span>
        <span className="is-on"><WandSparkles size={12} /> Improve</span>
        <span>Grammar</span>
      </div>
      <p className="rbx-ai-before"><span className="rbx-ai-tag">Before</span>{AI_BEFORE}</p>
      <p className="rbx-ai-after">
        <span className="rbx-sr">{`After: ${AI_AFTER}`}</span>
        <span className="rbx-ai-tag is-gold" aria-hidden="true">After</span>
        <span aria-hidden="true">{AI_AFTER.slice(0, typed)}</span>
        <span className={done ? "rbx-caret is-idle" : "rbx-caret"} aria-hidden="true" />
      </p>
      <div className="rbx-ai-foot">
        <div className={done ? "rbx-ai-review is-on" : "rbx-ai-review"} aria-hidden="true">
          <span className="is-accept"><Check size={12} /> Accept</span>
          <span>Reject</span>
          <span>Retry</span>
        </div>
        <button type="button" className="rbx-link-btn" onClick={start}>
          <RotateCcw size={14} aria-hidden="true" /> Replay demo
        </button>
      </div>
    </div>
  );
}

/** BUG-1300: cards use small WebP thumbnails; the preview modal keeps the full-size PNG. */
function previewSrc(image: string) {
  return /^\/templates\/[\w-]+\.webp$/.test(image) ? image.replace(/\.webp$/, ".png") : image;
}

export function LandingExperience() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const faqBase = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const previewTrigger = useRef<HTMLElement | null>(null);
  const swipeRef = useRef<{ x: number; moved: boolean } | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remote, setRemote] = useState<LandingTemplate[]>([]);
  const [category, setCategory] = useState("All");
  const [photo, setPhoto] = useState<PhotoFilter>("all");
  const [columns, setColumns] = useState<ColumnFilter>("all");
  const [active, setActive] = useState(0);
  const [preview, setPreview] = useState<Card | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billing, setBilling] = useState<Billing>("monthly");
  const [openFaq, setOpenFaq] = useState(0);

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

  // Nav glass state.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Lenis smooth scroll, scroll reveals and the pinned "How it works" timeline.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("rbx-js");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    root.querySelectorAll("[data-reveal]").forEach((node) => io.observe(node));

    let stopped = false;
    let cleanup = () => {};
    void (async () => {
      const [{ default: LenisCtor }, { default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (stopped) return;
      gsap.registerPlugin(ScrollTrigger);

      let lenis: Lenis | null = null;
      let ticker: ((time: number) => void) | null = null;
      if (!prefersReduced()) {
        lenis = new LenisCtor({ lerp: 0.1, smoothWheel: true, anchors: { offset: -84 } });
        lenisRef.current = lenis;
        lenis.on("scroll", ScrollTrigger.update);
        const instance = lenis;
        ticker = (time: number) => instance.raf(time * 1000);
        gsap.ticker.add(ticker);
        gsap.ticker.lagSmoothing(0);
      }

      const mm = gsap.matchMedia();
      mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        const stage = howRef.current;
        if (!stage) return;
        const steps = Array.from(stage.querySelectorAll<HTMLElement>(".rbx-step"));
        stage.classList.add("is-pinned");
        let current = -1;
        const paint = (progress: number) => {
          stage.style.setProperty("--p", progress.toFixed(4));
          const index = Math.min(steps.length - 1, Math.floor(progress * steps.length * 0.999 + 0.0001));
          if (index === current) return;
          current = index;
          steps.forEach((step, i) => {
            step.classList.toggle("is-on", i <= index);
            step.classList.toggle("is-current", i === index);
          });
        };
        paint(0);
        const trigger = ScrollTrigger.create({
          trigger: stage,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 2.2)}`,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => paint(self.progress),
        });
        return () => {
          trigger.kill();
          stage.classList.remove("is-pinned");
          stage.style.removeProperty("--p");
          steps.forEach((step) => step.classList.remove("is-on", "is-current"));
        };
      });

      const refresh = () => ScrollTrigger.refresh();
      void document.fonts?.ready.then(() => {
        if (!stopped) refresh();
      });
      window.addEventListener("load", refresh);

      cleanup = () => {
        window.removeEventListener("load", refresh);
        mm.revert();
        if (ticker) gsap.ticker.remove(ticker);
        lenis?.destroy();
        lenisRef.current = null;
      };
    })();

    return () => {
      stopped = true;
      io.disconnect();
      cleanup();
      root.classList.remove("rbx-js");
    };
  }, []);

  // Hero: 3D card follows the pointer; depth layers drift with it.
  useEffect(() => {
    const hero = heroRef.current;
    const card = cardRef.current;
    if (!hero || !card) return;
    if (reduced) {
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
      hero.style.removeProperty("--mx");
      hero.style.removeProperty("--my");
      return;
    }
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let frame = 0;
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      card.style.setProperty("--ry", `${(cx * 24).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${(-cy * 18).toFixed(2)}deg`);
      hero.style.setProperty("--mx", cx.toFixed(3));
      hero.style.setProperty("--my", cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) frame = requestAnimationFrame(loop);
      else frame = 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = hero.getBoundingClientRect();
      tx = (event.clientX - rect.left) / rect.width - 0.5;
      ty = (event.clientY - rect.top) / rect.height - 0.5;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  // Pause smooth scroll and lock the page while the menu or modal is open.
  useEffect(() => {
    const locked = menuOpen || preview !== null;
    if (!locked) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    lenisRef.current?.stop();
    return () => {
      html.style.overflow = previous;
      lenisRef.current?.start();
    };
  }, [menuOpen, preview]);

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 900) setMenuOpen(false);
    };
    // A tap or click outside the header closes the menu (aria-expanded follows).
    const onPointer = (event: PointerEvent) => {
      const nav = document.querySelector(".rbx-nav");
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

  // Preview modal: focus, focus trap, Escape to close, restore focus.
  useEffect(() => {
    if (!preview) return;
    const dialog = document.querySelector<HTMLElement>(".rbx-modal");
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const trigger = previewTrigger.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      trigger?.focus({ preventScroll: true });
    };
  }, [preview]);

  const cards = useMemo(() => {
    const staticMapped: Card[] = LANDING_TEMPLATES.map((item) => ({
      ...item,
      source: "static" as const,
      hasPhoto: item.id !== "classic-serif" && item.id !== "precision-line",
      columns:
        item.layoutKey === "classic" || item.layoutKey === "timeline" || item.layoutKey === "single-column" || item.layoutKey === "elegant"
          ? "single"
          : "double",
      category: categoryOf(item.layoutKey),
    }));
    const remoteMapped: Card[] = remote.map((item) => ({
      ...item,
      source: "admin",
      category: categoryOf(item.layoutKey, item.department),
    }));
    return [...remoteMapped, ...staticMapped];
  }, [remote]);

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
    previewTrigger.current = trigger;
    setPreview(tpl);
  }

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

  const closeMenu = () => setMenuOpen(false);
  const priceUnit = billing === "monthly" ? "/ month" : "/ year";

  return (
    <div ref={rootRef} className={`rbx ${landingDisplay.variable} ${landingBody.variable}`}>
      <a className="rbx-skip" href="#main">Skip to content</a>

      <header className={scrolled || menuOpen ? "rbx-nav is-solid" : "rbx-nav"}>
        <div className="rbx-nav-inner">
          <Link href="/" className="rbx-brand" onClick={closeMenu}>
            <span className="rbx-brand-mark" aria-hidden="true">RB</span>
            <span>ResumeBuilder</span>
          </Link>
          <button
            type="button"
            className="rbx-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="rbx-nav-links"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          <nav id="rbx-nav-links" className={menuOpen ? "rbx-nav-links is-open" : "rbx-nav-links"} aria-label="Primary">
            <a href="#how" onClick={closeMenu}>How it works</a>
            <a href="#templates" onClick={closeMenu}>Templates</a>
            <a href="#pricing" onClick={closeMenu}>Pricing</a>
            <Link href="/login" onClick={closeMenu}>Log in</Link>
            <Link href="/register" className="rbx-btn rbx-btn-gold rbx-btn-sm" onClick={closeMenu}>Get started</Link>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {/* 1. Hero */}
        <section ref={heroRef} className="rbx-hero" aria-labelledby="rbx-hero-title">
          <ParticleField />
          <div className="rbx-hero-depth" aria-hidden="true">
            <span className="rbx-orb rbx-orb-violet" />
            <span className="rbx-orb rbx-orb-cyan" />
            <span className="rbx-orb rbx-orb-gold" />
            <span className="rbx-floor" />
          </div>
          <div className="rbx-container rbx-hero-grid">
            <div className="rbx-hero-copy">
              <p className="rbx-eyebrow"><Sparkles size={14} aria-hidden="true" /> ATS-ready resume studio</p>
              <h1 id="rbx-hero-title" className="rbx-title" aria-label={HEADLINE.join(" ")}>
                {HEADLINE.map((word, index) => (
                  <span
                    key={word}
                    aria-hidden="true"
                    className={index >= 4 ? "rbx-word rbx-gradient-text" : "rbx-word"}
                    style={{ "--i": index } as CSSVars}
                  >
                    {word}
                  </span>
                ))}
              </h1>
              <p className="rbx-lead rbx-fade-in">
                Pick a template, edit it live, polish the wording, and download a PDF that matches the page.
              </p>
              <div className="rbx-actions rbx-fade-in">
                <Magnetic>
                  <Link href="/register" className="rbx-btn rbx-btn-gold">
                    Build my resume <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <a href="#templates" className="rbx-btn rbx-btn-ghost">Browse templates</a>
                </Magnetic>
              </div>
              <ul className="rbx-hero-points rbx-fade-in">
                <li><Check size={14} aria-hidden="true" /> Free PDF download</li>
                <li><Check size={14} aria-hidden="true" /> A4 &amp; US Letter</li>
                <li><Check size={14} aria-hidden="true" /> AI waits for your OK</li>
              </ul>
            </div>

            <div className="rbx-hero-visual" aria-hidden="true">
              <div className="rbx-float">
                <div ref={cardRef} className="rbx-card3d">
                  <div className="rbx-sheet-back" />
                  <div className="rbx-sheet">
                    <div className="rbx-sheet-head">
                      <span className="rbx-avatar" />
                      <div>
                        <b>Alex Morgan</b>
                        <small>Senior Product Designer</small>
                      </div>
                    </div>
                    <div className="rbx-sheet-body">
                      <div className="rbx-sheet-col">
                        <i className="rbx-label">Experience</i>
                        <span className="rbx-ln" />
                        <span className="rbx-ln w80" />
                        <span className="rbx-ln w60" />
                        <i className="rbx-label">Projects</i>
                        <span className="rbx-ln" />
                        <span className="rbx-ln w70" />
                        <span className="rbx-ln w80" />
                        <i className="rbx-label">Achievements</i>
                        <span className="rbx-ln" />
                        <span className="rbx-ln w60" />
                        <span className="rbx-ln w70" />
                      </div>
                      <div className="rbx-sheet-col">
                        <i className="rbx-label">Skills</i>
                        <div className="rbx-pills"><em /><em /><em /><em /></div>
                        <i className="rbx-label">Education</i>
                        <span className="rbx-ln w80" />
                        <span className="rbx-ln w50" />
                        <i className="rbx-label">Languages</i>
                        <div className="rbx-pills"><em /><em /></div>
                        <i className="rbx-label">Certifications</i>
                        <span className="rbx-ln w70" />
                        <span className="rbx-ln w50" />
                      </div>
                    </div>
                  </div>
                  <div className="rbx-chip rbx-chip-a"><Check size={14} /> ATS score {ATS_SAMPLE}</div>
                  <div className="rbx-chip rbx-chip-b"><WandSparkles size={14} /> AI polish</div>
                  <div className="rbx-chip rbx-chip-c"><FileDown size={14} /> PDF ready</div>
                </div>
              </div>
            </div>
          </div>
          <a href="#how" className="rbx-scroll-cue" aria-label="Scroll to How it works"><span /></a>
        </section>

        {/* 2. How it works (pinned timeline on desktop) */}
        <section id="how" className="rbx-how" aria-labelledby="rbx-how-title">
          <div ref={howRef} className="rbx-how-stage">
            <div className="rbx-container">
              <div className="rbx-head" data-reveal>
                <p className="rbx-kicker">How it works</p>
                <h2 id="rbx-how-title" className="rbx-h2">From blank page to download in four moves</h2>
              </div>
              <div className="rbx-rail" aria-hidden="true"><span className="rbx-rail-fill" /></div>
              <ol className="rbx-steps">
                {STEPS.map(({ title, body, Icon }, index) => (
                  <li key={title} className="rbx-step rbx-glass">
                    <span className="rbx-step-num">{String(index + 1).padStart(2, "0")}</span>
                    <span className="rbx-step-icon"><Icon size={22} aria-hidden="true" /></span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 3. Templates carousel */}
        <section id="templates" className="rbx-section rbx-templates" aria-labelledby="rbx-tpl-title">
          <div className="rbx-container">
            <div className="rbx-head rbx-head-center" data-reveal>
              <p className="rbx-kicker">Templates</p>
              <h2 id="rbx-tpl-title" className="rbx-h2">Choose your template</h2>
              <p className="rbx-sub">Spin through the designs, preview one up close, then open it in the editor.</p>
            </div>
            {error && <p className="rbx-error" role="alert">{error}</p>}
            <div className="rbx-cats" role="group" aria-label="Template category">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  className={category === item ? "is-on" : ""}
                  onClick={() => {
                    setCategory(item);
                    setActive(0);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="rbx-filters">
              <div className="rbx-filter">
                <span className="rbx-filter-label" id="rbx-filter-photo">Photo</span>
                <div className="rbx-seg" role="group" aria-labelledby="rbx-filter-photo" data-count={PHOTO_OPTIONS.length} style={{ "--idx": PHOTO_OPTIONS.findIndex(([id]) => id === photo) } as CSSVars}>
                  <span className="rbx-seg-thumb" aria-hidden="true" />
                  {PHOTO_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={photo === id}
                      className={photo === id ? "is-on" : ""}
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
              <div className="rbx-filter">
                <span className="rbx-filter-label" id="rbx-filter-columns">Columns</span>
                <div className="rbx-seg" role="group" aria-labelledby="rbx-filter-columns" data-count={COLUMN_OPTIONS.length} style={{ "--idx": COLUMN_OPTIONS.findIndex(([id]) => id === columns) } as CSSVars}>
                  <span className="rbx-seg-thumb" aria-hidden="true" />
                  {COLUMN_OPTIONS.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={columns === id}
                      className={columns === id ? "is-on" : ""}
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
              <div className="rbx-empty rbx-glass" role="status">
                <LayoutTemplate size={28} aria-hidden="true" />
                <h3>No templates match these filters</h3>
                <p>Try another photo, column, or category option.</p>
                <button
                  type="button"
                  className="rbx-btn rbx-btn-ghost rbx-btn-sm"
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
                  className="rbx-carousel"
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Resume templates. Use left and right arrow keys to browse."
                  tabIndex={0}
                  onKeyDown={onCarouselKey}
                  onPointerDown={onSwipeStart}
                  onPointerUp={onSwipeEnd}
                >
                  <div className="rbx-carousel-stage">
                    {templates.map((tpl, index) => {
                      const offset = index - current;
                      const distance = Math.abs(offset);
                      const hidden = distance > 3;
                      return (
                        <button
                          key={`${tpl.source}-${tpl.id}`}
                          type="button"
                          className={offset === 0 ? "rbx-tcard is-active" : "rbx-tcard"}
                          style={{ "--o": offset, "--d": distance, zIndex: 20 - distance } as CSSVars}
                          data-dist={distance}
                          aria-hidden={hidden || undefined}
                          tabIndex={offset === 0 ? 0 : -1}
                          disabled={busyId !== null}
                          aria-label={offset === 0 ? `Preview ${tpl.name}` : `Show ${tpl.name}`}
                          onClick={(event) => onCardClick(index, tpl, event)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={tpl.image} alt="" width={560} height={792} loading={distance === 0 ? "eager" : "lazy"} fetchPriority={distance === 0 ? "high" : "low"} decoding="async" draggable={false} />
                          <span className="rbx-tcard-shine" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rbx-carousel-controls">
                  <button type="button" className="rbx-round" aria-label="Previous template" onClick={() => go(-1)}>
                    <ChevronLeft size={20} aria-hidden="true" />
                  </button>
                  <div className="rbx-dots" aria-hidden="true">
                    {templates.map((tpl, index) => (
                      <span key={`${tpl.source}-${tpl.id}`} className={index === current ? "is-on" : ""} />
                    ))}
                  </div>
                  <button type="button" className="rbx-round" aria-label="Next template" onClick={() => go(1)}>
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                </div>

                {activeTemplate && (
                  <div className="rbx-tpl-info" aria-live="polite">
                    <p className="rbx-tpl-count">{current + 1} / {templates.length} · {activeTemplate.category}</p>
                    <h3>{activeTemplate.name}</h3>
                    <p>{activeTemplate.blurb}</p>
                    <div className="rbx-actions rbx-actions-center">
                      <button
                        type="button"
                        className="rbx-btn rbx-btn-ghost"
                        disabled={busyId !== null}
                        onClick={(event) => openPreview(activeTemplate, event.currentTarget)}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="rbx-btn rbx-btn-gold"
                        disabled={busyId !== null}
                        onClick={() => void selectTemplate(activeTemplate)}
                      >
                        {busyId === activeTemplate.id ? "Opening…" : "Use this template"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* 4. Features */}
        <section id="features" className="rbx-section" aria-labelledby="rbx-feat-title">
          <div className="rbx-container">
            <div className="rbx-head rbx-head-center" data-reveal>
              <p className="rbx-kicker">Features</p>
              <h2 id="rbx-feat-title" className="rbx-h2">Check it before you send it</h2>
              <p className="rbx-sub">Match the job description, tighten the wording, and keep every change under your control.</p>
            </div>
            <div className="rbx-feature-grid">
              <article className="rbx-glass rbx-feature" data-reveal>
                <h3>ATS score</h3>
                <p>Paste the job description and see which real keywords your resume already covers.</p>
                <AtsMeter />
                <small className="rbx-note">Sample score shown for illustration.</small>
              </article>
              <article className="rbx-glass rbx-feature" data-reveal>
                <h3>AI improve</h3>
                <p>Rewrite a line shorter, longer, clearer, or with cleaner grammar. You decide what stays.</p>
                <TypingDemo />
              </article>
            </div>
            <dl className="rbx-stats">
              <div className="rbx-glass rbx-stat" data-reveal>
                <dt>Templates to start from</dt>
                <dd><CountUp to={cards.length} /></dd>
              </div>
              <div className="rbx-glass rbx-stat" data-reveal>
                <dt>AI writing actions</dt>
                <dd><CountUp to={4} /></dd>
              </div>
              <div className="rbx-glass rbx-stat" data-reveal>
                <dt>Page sizes: A4 &amp; US Letter</dt>
                <dd><CountUp to={2} /></dd>
              </div>
              <div className="rbx-glass rbx-stat" data-reveal>
                <dt>To create and download a PDF</dt>
                <dd><CountUp to={0} prefix="$" /></dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 5. Pricing */}
        <section id="pricing" className="rbx-section" aria-labelledby="rbx-price-title">
          <div className="rbx-container">
            <div className="rbx-head rbx-head-center" data-reveal>
              <p className="rbx-kicker">Pricing</p>
              <h2 id="rbx-price-title" className="rbx-h2">Start free. Upgrade when you need more.</h2>
            </div>
            <div className="rbx-billing" role="radiogroup" aria-label="Billing period" data-pos={billing}>
              <span className="rbx-billing-thumb" aria-hidden="true" />
              <button type="button" role="radio" aria-checked={billing === "monthly"} onClick={() => setBilling("monthly")}>Monthly</button>
              <button type="button" role="radio" aria-checked={billing === "yearly"} onClick={() => setBilling("yearly")}>Yearly</button>
            </div>
            <div className="rbx-price-grid">
              <article className="rbx-glass rbx-price" data-reveal>
                <h3>Free</h3>
                <p className="rbx-price-amount">
                  <strong key={`free-${billing}`} className="rbx-flip">$0</strong>
                  <span key={`unit-${billing}`} className="rbx-flip">{priceUnit}</span>
                </p>
                <ul>
                  <li><Check size={16} aria-hidden="true" /> Resume editor and templates</li>
                  <li><Check size={16} aria-hidden="true" /> PDF download</li>
                  <li><Check size={16} aria-hidden="true" /> ATS check</li>
                </ul>
                <Link href="/register" className="rbx-btn rbx-btn-ghost rbx-btn-block">Create free account</Link>
              </article>
              <article className="rbx-price rbx-price-pro" data-reveal>
                <div className="rbx-price-pro-inner">
                  <span className="rbx-badge">Coming soon</span>
                  <h3>Pro</h3>
                  <p className="rbx-price-amount">
                    <strong key={`pro-${billing}`} className="rbx-flip">Soon</strong>
                    <span key={`prounit-${billing}`} className="rbx-flip">{billing === "monthly" ? "monthly plan" : "yearly plan"}</span>
                  </p>
                  <ul>
                    <li><Check size={16} aria-hidden="true" /> Unlimited resumes</li>
                    <li><Check size={16} aria-hidden="true" /> DOCX export</li>
                    <li><Check size={16} aria-hidden="true" /> Share links with expiry</li>
                  </ul>
                  <Link href="/register" className="rbx-btn rbx-btn-gold rbx-btn-block">Start free today</Link>
                </div>
              </article>
            </div>
            <p className="rbx-price-note">Create a free account and download a PDF today. Pro billing opens later.</p>
          </div>
        </section>

        {/* 6. FAQ */}
        <section id="faq" className="rbx-section" aria-labelledby="rbx-faq-title">
          <div className="rbx-container rbx-narrow">
            <div className="rbx-head rbx-head-center" data-reveal>
              <p className="rbx-kicker">FAQ</p>
              <h2 id="rbx-faq-title" className="rbx-h2">Questions</h2>
            </div>
            <div className="rbx-faq">
              {FAQS.map(([question, answer], index) => {
                const open = openFaq === index;
                const buttonId = `${faqBase}-q${index}`;
                const panelId = `${faqBase}-a${index}`;
                return (
                  <div key={question} className={open ? "rbx-faq-item rbx-glass is-open" : "rbx-faq-item rbx-glass"}>
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq(open ? -1 : index)}
                      >
                        <span>{question}</span>
                        <span className="rbx-faq-icon" aria-hidden="true" />
                      </button>
                    </h3>
                    <div id={panelId} role="region" aria-labelledby={buttonId} className="rbx-faq-panel" inert={!open}>
                      <div><p>{answer}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7. Final CTA */}
        <section className="rbx-section rbx-final" aria-labelledby="rbx-final-title">
          <div className="rbx-container">
            <div className="rbx-final-card" data-reveal>
              <h2 id="rbx-final-title" className="rbx-h2">Your next resume can start now</h2>
              <p className="rbx-sub">Free account. No document to import. Pick a template and edit on the page.</p>
              <div className="rbx-actions rbx-actions-center">
                <Magnetic>
                  <Link href="/register" className="rbx-btn rbx-btn-gold">
                    Create free account <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <a href="#templates" className="rbx-btn rbx-btn-ghost">Browse templates</a>
                </Magnetic>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="rbx-footer">
        <div className="rbx-container rbx-footer-inner">
          <Link href="/" className="rbx-brand">
            <span className="rbx-brand-mark" aria-hidden="true">RB</span>
            <span>ResumeBuilder</span>
          </Link>
          <nav aria-label="Footer" className="rbx-footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>

      {preview && (
        <div className="rbx-modal-back" role="presentation" onClick={() => setPreview(null)}>
          <div
            className="rbx-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rbx-preview-title"
            aria-describedby="rbx-preview-desc"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              // BUG-108: keep Tab focus inside the dialog; Esc closes it.
              if (event.key === "Escape") {
                setPreview(null);
                return;
              }
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
            }}
          >
            <button type="button" className="rbx-modal-x" aria-label="Close preview" onClick={() => setPreview(null)}>
              <X size={18} aria-hidden="true" />
            </button>
            <div className="rbx-modal-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc(preview.image)} alt={`${preview.name} template preview`} />
            </div>
            <div className="rbx-modal-body">
              <p className="rbx-kicker">{preview.category}</p>
              <h3 id="rbx-preview-title">{preview.name}</h3>
              <p id="rbx-preview-desc">{preview.blurb}</p>
              <div className="rbx-actions">
                <button type="button" className="rbx-btn rbx-btn-ghost" onClick={() => setPreview(null)}>Close</button>
                <button
                  type="button"
                  className="rbx-btn rbx-btn-gold"
                  disabled={busyId !== null}
                  onClick={() => {
                    const chosen = preview;
                    setPreview(null);
                    void selectTemplate(chosen);
                  }}
                >
                  {busyId === preview.id ? "Opening…" : "Use this template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
