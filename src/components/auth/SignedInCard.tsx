"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { AuroraBrand } from "@/components/auth/AuroraFields";
import { initialsOf, signOut, type CurrentUser } from "@/hooks/useCurrentUser";
import s from "./AuthSlider.module.css";
import m from "./AuthSso.module.css";

/** /login and /register for someone who is already signed in. */
export function SignedInCard({ user }: { user: CurrentUser }) {
  const [busy, setBusy] = useState(false);
  const display = user.name?.trim() || user.email.split("@")[0];

  async function onLogout() {
    setBusy(true);
    await signOut();
    window.location.assign("/login");
  }

  return (
    <section className={m.signedCard} aria-labelledby="signed-title">
      <div className={m.signedBrand}>
        <AuroraBrand />
      </div>
      <span className={m.signedAvatar} aria-hidden="true">
        {initialsOf(user)}
      </span>
      <h1 id="signed-title" className={m.signedName}>
        You&apos;re signed in as {display}
      </h1>
      <p className={m.signedEmail}>{user.email}</p>
      <Link href="/user/dashboard" className={`${s.btn} ${m.signedPrimary}`}>
        <span className={s.btnInner}>
          <LayoutDashboard size={16} aria-hidden="true" /> Go to dashboard
        </span>
      </Link>
      <div className={m.signedActions}>
        <Link href="/user/settings" className={m.ssoBtn}>
          <Settings size={16} aria-hidden="true" /> Settings
        </Link>
        <button type="button" className={m.ssoBtn} onClick={() => void onLogout()} disabled={busy}>
          <LogOut size={16} aria-hidden="true" /> {busy ? "Logging out…" : "Log out"}
        </button>
      </div>
      <p className={`${s.foot} ${m.signedLogout}`}>
        Not you?{" "}
        <button type="button" className={s.linkBtn} onClick={() => void onLogout()} disabled={busy}>
          Sign in with another account
        </button>
      </p>
    </section>
  );
}
