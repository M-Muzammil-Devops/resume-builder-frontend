"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Cookie, ShieldCheck, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import {
  ALL_OFF,
  ALL_ON,
  CONSENT_CATEGORIES,
  CONSENT_EVENT,
  CONSENT_VERSION,
  OPEN_SETTINGS_EVENT,
  clearAnalyticsCookies,
  gaMeasurementId,
  readConsent,
  writeConsent,
  type ConsentChoices,
  type ConsentRecord,
} from "@/lib/consent";
import s from "./CookieConsent.module.css";

/** Pages rendered for Puppeteer (PDF export, template thumbnails) never show the banner. */
const SILENT_PATHS = [/^\/print(\/|$)/, /^\/template-preview(\/|$)/];

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } & Record<string, unknown>;

/** Loads GA4 once, only after analytics consent, only when NEXT_PUBLIC_GA_ID is set. */
function loadGa(id: string) {
  const w = window as unknown as GtagWindow;
  w[`ga-disable-${id}`] = false;
  if (document.querySelector("script[data-rb-ga]")) return;
  w.dataLayer = w.dataLayer || [];
  // gtag must push the `arguments` object itself (that is what gtag.js expects).
  w.gtag = function gtag() {
    w.dataLayer!.push(arguments);
  };
  w.gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
  w.gtag("js", new Date());
  w.gtag("config", id, { send_page_view: false, anonymize_ip: true });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.setAttribute("data-rb-ga", "");
  document.head.appendChild(script);
}

function stopGa(id: string) {
  const w = window as unknown as GtagWindow;
  w[`ga-disable-${id}`] = true;
  clearAnalyticsCookies();
}

export function CookieConsent() {
  const pathname = usePathname() || "/";
  const silent = SILENT_PATHS.some((re) => re.test(pathname));
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [checked, setChecked] = useState(false);
  const [modal, setModal] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>(ALL_OFF);
  const lastTracked = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Read the cookie after mount (no SSR mismatch).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setConsent(readConsent());
      setChecked(true);
    });
    const onChange = () => setConsent(readConsent());
    const onOpen = () => {
      const rec = readConsent();
      setDraft(rec ? { preferences: rec.preferences, analytics: rec.analytics, marketing: rec.marketing } : ALL_OFF);
      setModal(true);
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
    };
  }, []);

  // Analytics: GA4 + our own page views, only with analytics consent.
  useEffect(() => {
    const ga = gaMeasurementId();
    if (!consent?.analytics) {
      if (ga && consent) stopGa(ga);
      return;
    }
    if (silent) return;
    if (ga) loadGa(ga);
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    const w = window as unknown as GtagWindow;
    if (ga && w.gtag) w.gtag("event", "page_view", { page_path: pathname, page_location: `${location.origin}${pathname}` });
    void apiFetch("/analytics/pageview", {
      method: "POST",
      body: JSON.stringify({ path: pathname, referrer: document.referrer || undefined }),
    }).catch(() => undefined);
  }, [consent, pathname, silent]);

  const save = useCallback((choices: ConsentChoices) => {
    const rec = writeConsent(choices);
    setConsent(rec);
    setModal(false);
    // Audit trail (anonymous id, choices, time). Fire-and-forget.
    void apiFetch("/consent", {
      method: "POST",
      body: JSON.stringify({ anonId: rec.anonId, version: CONSENT_VERSION, choices }),
    }).catch(() => undefined);
  }, []);

  const closeModal = useCallback(() => setModal(false), []);
  useEscapeClose(closeModal, modal);

  useEffect(() => {
    if (modal) dialogRef.current?.querySelector<HTMLElement>("button, input")?.focus();
  }, [modal]);

  function openCustomize() {
    setDraft(consent ? { preferences: consent.preferences, analytics: consent.analytics, marketing: consent.marketing } : ALL_OFF);
    setModal(true);
  }

  if (silent || !checked) return null;
  const showBanner = !consent && !modal;

  return (
    <>
      {showBanner && (
        <section className={s.banner} role="region" aria-label="Cookie consent">
          <div className={s.bannerHead}>
            <span className={s.badge} aria-hidden="true">
              <Cookie size={18} />
            </span>
            <h2 className={s.title}>We value your privacy</h2>
          </div>
          <p className={s.text}>
            We use essential cookies to keep you signed in and secure. With your OK we also remember your preferences and
            measure how the site is used. You can change this any time in{" "}
            <button type="button" className={s.inlineLink} onClick={openCustomize}>Cookie settings</button>. See our{" "}
            <a href="/privacy" className={s.inlineLink}>Privacy policy</a>.
          </p>
          <div className={s.actions}>
            <button type="button" className={s.ghost} onClick={openCustomize}>Customize</button>
            <button type="button" className={s.secondary} onClick={() => save(ALL_OFF)}>Reject non-essential</button>
            <button type="button" className={s.primary} onClick={() => save(ALL_ON)}>Accept all</button>
          </div>
        </section>
      )}

      {modal && (
        <div className={s.backdrop} role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}>
          <div className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="rb-cookie-title" ref={dialogRef}>
            <header className={s.dialogHead}>
              <span className={s.badge} aria-hidden="true">
                <ShieldCheck size={18} />
              </span>
              <div>
                <h2 id="rb-cookie-title" className={s.title}>Cookie settings</h2>
                <p className={s.sub}>Choose what we may store on this device. Essential cookies are always on.</p>
              </div>
              <button type="button" className={s.close} onClick={closeModal} aria-label="Close cookie settings">
                <X size={18} />
              </button>
            </header>
            <ul className={s.list}>
              {CONSENT_CATEGORIES.map((cat) => {
                const on = cat.id === "essential" ? true : draft[cat.id as keyof ConsentChoices];
                return (
                  <li key={cat.id} className={s.row}>
                    <div className={s.rowText}>
                      <span className={s.rowTitle}>
                        {cat.title}
                        {cat.locked && <span className={s.pill}>Always on</span>}
                      </span>
                      <span className={s.rowBody}>{cat.body}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={cat.title}
                      disabled={cat.locked}
                      className={`${s.switch} ${on ? s.switchOn : ""}`}
                      onClick={() => {
                        if (cat.locked) return;
                        const key = cat.id as keyof ConsentChoices;
                        setDraft((d) => ({ ...d, [key]: !d[key] }));
                      }}
                    >
                      <span className={s.knob} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <footer className={s.dialogActions}>
              <button type="button" className={s.secondary} onClick={() => save(ALL_OFF)}>Reject non-essential</button>
              <button type="button" className={s.secondary} onClick={() => save(draft)}>Save choices</button>
              <button type="button" className={s.primary} onClick={() => save(ALL_ON)}>Accept all</button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
