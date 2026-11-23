"use client";

import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { useEffect, useRef, useState } from "react";
import { Check, Menu, X } from "lucide-react";
import { getToken } from "@/lib/api";
import { ToolsMenu } from "@/components/nav/ToolsMenu";
import { HeaderAccount } from "@/components/nav/HeaderAccount";
import { TOOL_LINKS } from "@/components/nav/tools";
import { MobilePdfLinks } from "@/components/nav/MobilePdfLinks";
import { AudioCleaner } from "./AudioCleaner";
import s from "./AudioTool.module.css";

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

// Same font files as the landing page (identical URLs, so the browser reuses its cache).
const auroraBody = localFont({
  src: [
    { path: "../../../../public/fonts/Raleway-Regular.woff", weight: "400", style: "normal" },
    { path: "../../../../public/fonts/Raleway-Bold.woff", weight: "700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
});
const auroraHead = localFont({
  src: [{ path: "../../../../public/fonts/Montserrat-Bold.woff", weight: "700", style: "normal" }],
  variable: "--font-aurora-head",
  display: "swap",
  adjustFontFallback: "Arial",
});

const FORMATS = ["MP3", "WAV", "M4A", "AAC", "OGG", "OPUS", "FLAC", "WEBM", "WMA", "AIFF", "AMR", "AC3", "CAF", "MP4", "MOV", "MKV"];

// Remove Background Noise is the only audio tool (the AI Voice Cleaner page was retired).
const COPY = {
  eyebrow: "✦ Tools · AI audio studio",
  title: ["Remove background noise from ", "any audio"] as const,
  lead: "Upload a noisy recording — café chatter, fan hum, traffic, echo — and get back a clean, clear voice in seconds.",
  chipA: ["Noise −40 dB", "Background removed"] as const,
  chipB: ["Voice kept natural", "AI speech model"] as const,
};
const TOOL_PATH = "/tools/audio-noise-remover";

export function AudioToolPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const toolPath = TOOL_PATH;
  const copy = COPY;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSignedIn(Boolean(getToken())));
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (navRef.current && e.target instanceof Node && !navRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <div className={cx(s.root, auroraBody.className, auroraHead.variable)}>
      <a className={s.skip} href="#tool">Skip to the tool</a>
      <div className={s.grain} aria-hidden="true" />

      <header ref={navRef} className={cx(s.nav, scrolled && s.navScrolled)}>
        <div className={s.navIn}>
          <Link href="/" className={s.brand} onClick={close}>
            <span className={s.mark} aria-hidden="true">RB</span>ResumeBuilder
          </Link>
          <nav className={s.links} aria-label="Primary">
            <Link href="/#templates">Templates</Link>
            <ToolsMenu />
            <Link href="/#pricing">Pricing</Link>
          </nav>
          <HeaderAccount
            loginClassName={s.login}
            ctaClassName={cx(s.btn, s.btnSm, s.navCta)}
            loginHref={`/login?next=${encodeURIComponent(toolPath)}`}
          />
          <button
            type="button"
            className={s.burger}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="tool-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
        <div id="tool-menu" className={cx(s.menu, menuOpen && s.menuOpen)} hidden={!menuOpen}>
          <Link href="/#templates" onClick={close}>Templates</Link>
          <span className={s.menuLabel}>Tools</span>
          {TOOL_LINKS.filter((t) => t.tone !== "c").map((t) => (
            <Link key={t.href} href={t.href} onClick={close} aria-current={t.href === toolPath ? "page" : undefined}>
              {t.title}
              {t.badge && <em className={s.menuBadge}>{t.badge}</em>}
            </Link>
          ))}
          <MobilePdfLinks onNavigate={close} />
          <Link href="/#pricing" onClick={close}>Pricing</Link>
          {signedIn ? (
            <Link href="/user/dashboard" className={cx(s.btn, s.btnSm)} onClick={close}>Dashboard</Link>
          ) : (
            <>
              <Link href={`/login?next=${encodeURIComponent(toolPath)}`} onClick={close}>Log in</Link>
              <Link href="/register" className={cx(s.btn, s.btnSm)} onClick={close}>Get started</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className={s.hero} aria-labelledby="tool-title">
          <div className={s.gridfloor} aria-hidden="true" />
          <div className={s.wrap}>
            <div className={cx(s.sph, s.sphA, s.f1)} aria-hidden="true" />
            <div className={s.heroGrid}>
              <div>
                <span className={s.eyebrow}>{copy.eyebrow}</span>
                <h1 id="tool-title">
                  {copy.title[0]}
                  <span className={s.grad}>{copy.title[1]}</span>
                </h1>
                <p className={s.lead}>{copy.lead}</p>
                <div className={s.formats}>
                  <span className={s.fmtLine}>
                    <span className={s.tick} aria-hidden="true"><Check size={12} /></span>
                    All audio formats supported — video too (audio is extracted)
                  </span>
                  <ul className={s.chips} aria-label="Supported formats">
                    {FORMATS.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                    <li className={s.more}>+ more</li>
                  </ul>
                </div>
              </div>
              <div className={s.stage} aria-hidden="true">
                {/* Figure and badges are separate layers: badges sit in the empty space beside the boy (desktop)
                    or in a row under him (< 1100px), so they never cover the character. */}
                <div className={s.figure}>
                  <div className={s.podglow} />
                  <div className={s.pod} />
                  <Image
                    className={cx(s.achar, s.f2)}
                    src="/tools/audio-boy.webp"
                    alt=""
                    width={551}
                    height={640}
                    priority
                    sizes="(max-width: 767px) 216px, 302px"
                  />
                  <div className={cx(s.sph, s.sphB, s.f3)} />
                </div>
                <div className={s.badges}>
                  <div className={cx(s.chip, s.chipA)}>
                    <span className={cx(s.dot, s.dGreen)}>−</span>
                    <div>{copy.chipA[0]}<small>{copy.chipA[1]}</small></div>
                  </div>
                  <div className={cx(s.eq, s.f1)}><i /><i /><i /><i /><i /></div>
                  <div className={cx(s.chip, s.chipB)}>
                    <span className={cx(s.dot, s.dViolet)}>♪</span>
                    <div>{copy.chipB[0]}<small>{copy.chipB[1]}</small></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tool" className={s.tool} aria-label="Audio Noise Remover">
          <div className={s.wrap}>
            <AudioCleaner initialMode="noise" signedIn={signedIn} toolPath={toolPath} />
            <p className={s.privacy}>🔒 Files are processed on our server, never shared, and deleted automatically after 1 hour.</p>
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
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
