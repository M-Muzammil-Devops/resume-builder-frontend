"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { initialsOf, signOut, type CurrentUser } from "@/hooks/useCurrentUser";
import s from "./UserMenu.module.css";

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

/** Avatar (initials) button with name, email, Dashboard, Settings and Log out. */
export function UserMenu({ user, className, align = "right" }: { user: CurrentUser; className?: string; align?: "right" | "left" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const display = user.name?.trim() || user.email.split("@")[0];

  async function onLogout() {
    setBusy(true);
    await signOut();
    window.location.assign("/login");
  }

  return (
    <div ref={rootRef} className={cx(s.root, className)}>
      <button
        ref={buttonRef}
        type="button"
        className={cx(s.trigger, open && s.triggerOn)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${display}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={s.avatar} aria-hidden="true">{initialsOf(user)}</span>
        <ChevronDown size={14} aria-hidden="true" className={cx(s.chev, open && s.chevOpen)} />
      </button>
      <div id={menuId} role="menu" aria-label="Account" className={cx(s.menu, align === "left" && s.menuLeft, open && s.menuOpen)} hidden={!open}>
        <div className={s.who}>
          <span className={cx(s.avatar, s.avatarLg)} aria-hidden="true">{initialsOf(user)}</span>
          <span className={s.whoText}>
            <b>{display}</b>
            <small>{user.email}</small>
          </span>
        </div>
        <Link href="/user/dashboard" role="menuitem" className={s.item} onClick={() => setOpen(false)}>
          <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
        </Link>
        <Link href="/user/settings" role="menuitem" className={s.item} onClick={() => setOpen(false)}>
          <Settings size={16} aria-hidden="true" /> Settings
        </Link>
        <button type="button" role="menuitem" className={cx(s.item, s.logout)} onClick={() => void onLogout()} disabled={busy}>
          <LogOut size={16} aria-hidden="true" /> {busy ? "Logging out…" : "Log out"}
        </button>
      </div>
    </div>
  );
}
