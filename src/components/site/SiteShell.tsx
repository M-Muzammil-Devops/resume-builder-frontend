"use client";

import Link from "next/link";
import localFont from "next/font/local";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { getToken } from "@/lib/api";
import { ToolsMenu } from "@/components/nav/ToolsMenu";
import { TOOL_LINKS } from "@/components/nav/tools";
import { MobilePdfLinks } from "@/components/nav/MobilePdfLinks";
import { HeaderAccount } from "@/components/nav/HeaderAccount";
import s from "./SiteShell.module.css";

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

// Same font files as the landing page and the audio tool (identical URLs, so the browser reuses its cache).
const auroraBody = localFont({
  src: [
    { path: "../../../public/fonts/Raleway-Regular.woff", weight: "400", style: "normal" },
    { path: "../../../public/fonts/Raleway-Bold.woff", weight: "700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
});
const auroraHead = localFont({
  src: [{ path: "../../../public/fonts/Montserrat-Bold.woff", weight: "700", style: "normal" }],
  variable: "--font-aurora-head",
  display: "swap",
  adjustFontFallback: "Arial",
});

/**
 * Shared Midnight Aurora frame for the public pages (/tools, /tools/pdf/*, /privacy, /terms, /contact):
 * glass header with the Tools menu, a centred 1124px column and the legal footer. CSP-safe (classes only).
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

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
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <div className={cx(s.root, auroraBody.className, auroraHead.variable)}>
      <a className={s.skip} href="#main">Skip to content</a>
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
          {/* QA run3 (7b): same Day/Night toggle + user menu as the landing page and the tool pages. */}
          <HeaderAccount loginClassName={s.login} ctaClassName={cx(s.btn, s.btnSm, s.navCta)} loginHref={loginHref} />
          <button
            type="button"
            className={s.burger}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
        <div id="site-menu" className={cx(s.menu, menuOpen && s.menuOpen)} hidden={!menuOpen}>
          <Link href="/#templates" onClick={close}>Templates</Link>
          <span className={s.menuLabel}>Tools</span>
          {TOOL_LINKS.filter((t) => t.tone !== "c").map((t) => (
            <Link key={t.href} href={t.href} onClick={close} aria-current={t.href === pathname ? "page" : undefined}>
              {t.title}
              {t.badge && <em className={s.menuBadge}>{t.badge}</em>}
            </Link>
          ))}
          <MobilePdfLinks onNavigate={close} pathname={pathname} />
          <Link href="/#pricing" onClick={close}>Pricing</Link>
          {signedIn ? (
            <Link href="/user/dashboard" className={cx(s.btn, s.btnSm)} onClick={close}>Dashboard</Link>
          ) : (
            <>
              <Link href={loginHref} onClick={close}>Log in</Link>
              <Link href="/register" className={cx(s.btn, s.btnSm)} onClick={close}>Get started</Link>
            </>
          )}
        </div>
      </header>

      <main id="main" className={s.main}>
        {children}
      </main>

      <footer className={s.footer}>
        <div className={s.wrap}>
          <div className={s.foot}>
            <Link href="/" className={s.brand}>
              <span className={s.mark} aria-hidden="true">RB</span>ResumeBuilder
            </Link>
            <span className={s.copy}>© {new Date().getFullYear()} ResumeBuilder</span>
            <nav aria-label="Legal">
              <Link href="/privacy" aria-current={pathname === "/privacy" ? "page" : undefined}>Privacy</Link>
              <Link href="/terms" aria-current={pathname === "/terms" ? "page" : undefined}>Terms</Link>
              <Link href="/contact" aria-current={pathname === "/contact" ? "page" : undefined}>Contact</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
