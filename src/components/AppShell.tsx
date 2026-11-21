"use client";

import { ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";

type Props = {
  children: ReactNode;
  mainClassName?: string;
};

export function AppShell({ children, mainClassName }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <button type="button" className="app-menu-btn" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="app-sidebar" onClick={() => setMenuOpen((open) => !open)}>
          Menu
        </button>
        <div className="app-main-inner">{children}</div>
      </div>
    </div>
  );
}
