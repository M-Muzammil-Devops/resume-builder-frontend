"use client";

import { ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/nav/UserMenu";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import s from "./AppShell.module.css";

type Props = {
  children: ReactNode;
  mainClassName?: string;
};

export function AppShell({ children, mainClassName }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useCurrentUser();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      {menuOpen && (
        <button type="button" className="app-sidebar-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      )}
      <div className={menuOpen ? "app-sidebar-slot open" : "app-sidebar-slot"} id="app-sidebar">
        <AppSidebar onNavigate={() => setMenuOpen(false)} />
      </div>
      <div className={["app-main", mainClassName].filter(Boolean).join(" ")}>
        {/* Top bar: mobile menu button (left), Day/Night toggle + account menu (right). */}
        <div className={s.topbar}>
          <button type="button" className="app-menu-btn" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="app-sidebar" onClick={() => setMenuOpen((open) => !open)}>
            Menu
          </button>
          <div className={s.right}>
            <ThemeToggle />
            {user ? <UserMenu user={user} /> : <span className={s.slot} aria-hidden="true" />}
          </div>
        </div>
        <div className="app-main-inner">{children}</div>
      </div>
    </div>
  );
}
