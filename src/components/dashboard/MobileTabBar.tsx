"use client";

import { FileText, Home, Plus, User, Wrench } from "lucide-react";
import Link from "next/link";
import { cx } from "./format";
import type { NavKey } from "./DashboardSidebar";
import s from "./Dashboard.module.css";

export function MobileTabBar({ active, busy, onSection, onCreate }: { active: NavKey; busy: boolean; onSection: (k: NavKey) => void; onCreate: () => void }) {
  return (
    <nav className={s.tabbar} aria-label="Dashboard tabs">
      <button type="button" className={cx(s.tab, active === "dashboard" && s.tabOn)} aria-current={active === "dashboard" ? "page" : undefined} onClick={() => onSection("dashboard")}>
        <Home size={19} aria-hidden="true" />
        Home
      </button>
      <button type="button" className={cx(s.tab, active === "resumes" && s.tabOn)} aria-current={active === "resumes" ? "page" : undefined} onClick={() => onSection("resumes")}>
        <FileText size={19} aria-hidden="true" />
        Resumes
      </button>
      <button type="button" className={s.fab} aria-label="New resume" disabled={busy} onClick={onCreate}>
        <Plus size={22} aria-hidden="true" />
      </button>
      <Link href="/tools" className={s.tab}>
        <Wrench size={19} aria-hidden="true" />
        Tools
      </Link>
      <Link href="/user/settings" className={s.tab}>
        <User size={19} aria-hidden="true" />
        Account
      </Link>
    </nav>
  );
}
