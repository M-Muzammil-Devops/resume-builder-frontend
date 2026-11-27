"use client";

import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, AudioLines, Check, Clock3, Download, FileAudio, Lock, Menu, Mic, Sparkles, X } from "lucide-react";
import { getToken } from "@/lib/api";
import { ToolsMenu } from "@/components/nav/ToolsMenu";
import { HeaderAccount } from "@/components/nav/HeaderAccount";
import { TOOL_LINKS } from "@/components/nav/tools";
import { MobilePdfLinks } from "@/components/nav/MobilePdfLinks";
import { DemoPlayer } from "./DemoPlayer";
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
  lead: "Café chatter, fan hum, traffic, echo — our AI removes it and keeps the voice clear. Hear the example below, then clean your own recordings in your dashboard.",
  chipA: ["Noise −40 dB", "Background removed"] as const,
  chipB: ["Voice kept natural", "AI speech model"] as const,
};
const TOOL_PATH = "/tools/audio-noise-remover";
/** The interactive tool lives only in the signed-in User Dashboard. */
const DASHBOARD_TOOL = "/user/noise-remover";
const LOGIN_TO_TOOL = `/login?next=${encodeURIComponent(DASHBOARD_TOOL)}`;

const FEATURES = [
  { icon: Sparkles, title: "AI speech model", text: "Separates the voice from background noise instead of just cutting frequencies, so speech stays natural." },
  { icon: FileAudio, title: "Any audio or video", text: "MP3, WAV, M4A, OGG, FLAC, MP4, MOV and more. For video files the audio track is extracted and cleaned." },
  { icon: Mic, title: "Two cleaning modes", text: "Remove noise for a single voice, or All voices for calls and meetings. Then set the strength — 80% suits most recordings." },
  { icon: AudioLines, title: "Before / After compare", text: "Listen to both versions side by side with waveforms and playback speed before you download." },
  { icon: Download, title: "Download in seconds", text: "Keep the original format or get MP3, WAV or FLAC, ready for interviews, podcasts or video calls." },
  { icon: Lock, title: "Private by design", text: "Files are processed on our server, never shared, and deleted automatically after 1 hour." },
] as const;

const FAQS = [
  { q: "How do I clean my own audio?", a: "Sign in and open Noise Remover in your dashboard. Upload a recording, choose a mode and strength, then compare Before / After and download the clean file." },
  { q: "Which file formats are supported?", a: "Almost every audio format (MP3, WAV, M4A, AAC, OGG, OPUS, FLAC, WEBM, WMA, AIFF and more) and common video files such as MP4, MOV and MKV." },
  { q: "Is it free?", a: "Yes. The Free plan includes monthly Noise Remover minutes. Pro gives you more minutes every month." },
  { q: "What happens to my files?", a: "Uploads and results are used only to clean your audio. They are never shared and are deleted automatically after 1 hour." },
  { q: "Will my voice sound robotic?", a: "No. The AI speech model keeps the natural tone of the voice. Lower the strength if you want an even softer clean-up." },
] as const;

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
  const ctaHref = signedIn ? DASHBOARD_TOOL : LOGIN_TO_TOOL;
  const ctaLabel = signedIn ? "Open Noise Remover in Dashboard" : "Sign in to clean your audio";

  return (
    <div className={cx(s.root, auroraBody.className, auroraHead.variable)}>
      <a className={s.skip} href="#demo">Skip to the example</a>
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
                <div className={s.heroCtas}>
                  <Link href={ctaHref} className={s.btn} data-cta="noise-dashboard">
                    {ctaLabel}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <a href="#demo" className={s.ghost}>Hear the example</a>
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

        <section id="demo" className={s.tool} aria-labelledby="demo-title">
          <div className={s.wrap}>
            <div className={cx(s.glass, s.show)}>
              <div className={s.showTxt}>
                <span className={s.kicker}>Hear the difference</span>
                <h2 id="demo-title" className={s.rtitle}>A noisy street recording, before and after</h2>
                <p className={s.showLead}>Press play, then switch between Before and After. This is a built-in example — your own files are cleaned inside your dashboard.</p>
                <ol className={s.how}>
                  <li><b>1</b>{signedIn ? "Open Noise Remover in your dashboard." : "Sign in or create a free account."}</li>
                  <li><b>2</b>Upload a recording and pick a mode and strength.</li>
                  <li><b>3</b>Compare Before / After, then download.</li>
                </ol>
                <Link href={ctaHref} className={cx(s.btn, s.wide)}>
                  {ctaLabel}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <div className={s.showDemo}>
                <DemoPlayer />
                <p className={s.showNote}>
                  <Clock3 size={14} aria-hidden="true" /> Cleaning a 1-minute recording usually takes a few seconds.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={s.tool} aria-labelledby="features-title">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker}>Why it works</span>
              <h2 id="features-title">Clean, natural voice in every recording</h2>
            </div>
            <ul className={s.feats}>
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className={cx(s.glass, s.feat)}>
                  <span className={s.featIco} aria-hidden="true"><Icon size={20} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={s.tool} aria-labelledby="faq-title">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker}>FAQ</span>
              <h2 id="faq-title">Questions about the Noise Remover</h2>
            </div>
            <div className={s.faq}>
              {FAQS.map((f, i) => (
                <details key={f.q} className={cx(s.glass, s.faqItem)} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
            <div className={cx(s.glass, s.ctaBand)}>
              <div>
                <h2>Ready to clean your audio?</h2>
                <p>{signedIn ? "Your Noise Remover is waiting in your dashboard." : "Sign in to upload your own recordings — it only takes a minute."}</p>
              </div>
              <Link href={ctaHref} className={s.btn}>
                {ctaLabel}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
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
