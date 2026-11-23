"use client";

import { openCookieSettings } from "@/lib/consent";
import s from "./CookieConsent.module.css";

/** Footer link that reopens the cookie preferences modal. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={`${s.footerLink} ${className || ""}`} onClick={openCookieSettings}>
      Cookie settings
    </button>
  );
}
