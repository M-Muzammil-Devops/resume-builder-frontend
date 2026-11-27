"use client";

import Link from "next/link";
import {
  Briefcase,
  CreditCard,
  Download,
  FileText,
  FileType2,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Settings,
  AudioLines,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./format";
import s from "./Dashboard.module.css";

export type NavKey = "dashboard" | "resumes" | "cover-letters" | "templates" | "downloads" | "plan";

type Item = {
  label: string;
  icon: LucideIcon;
  /** In-page section of the dashboard, or a route. */
  section?: NavKey;
  href?: string;
  badge?: { text: string; tone: "gr" | "bl" };
};

type Group = { label?: string; items: Item[] };

export function navGroups(counts: { resumes: number; templates: number; letters: number }): Group[] {
  return [
    {
      items: [
        { label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
        { label: "Resumes", icon: FileText, section: "resumes", badge: counts.resumes ? { text: String(counts.resumes), tone: "gr" } : undefined },
        { label: "Cover Letters", icon: Mail, section: "cover-letters", badge: counts.letters ? { text: String(counts.letters), tone: "gr" } : undefined },
        { label: "Templates", icon: LayoutTemplate, section: "templates", badge: { text: String(counts.templates), tone: "bl" } },
      ],
    },
    {
      label: "Tools",
      items: [
        { label: "Noise Remover", icon: AudioLines, href: "/tools/audio-noise-remover" },
        { label: "PDF Tools", icon: FileType2, href: "/tools#pdf", badge: { text: "SOON", tone: "gr" } },
        { label: "Jobs & Tracker", icon: Briefcase, href: "/user/jobs" },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Downloads", icon: Download, section: "downloads" },
        { label: "Plan & Billing", icon: CreditCard, section: "plan" },
        { label: "Settings", icon: Settings, href: "/user/settings" },
      ],
    },
  ];
}

export function DashboardSidebar({
  active,
  counts,
  showUpgrade,
  onSection,
  onUpgrade,
  onSignOut,
}: {
  active: NavKey;
  counts: { resumes: number; templates: number; letters: number };
  /** True only once the summary has loaded and the plan is Free. */
  showUpgrade: boolean;
  onSection: (key: NavKey) => void;
  onUpgrade: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside className={s.side} aria-label="Dashboard navigation">
      <Link href="/user/dashboard" className={s.brand} aria-label="ResumeBuilder dashboard">
        <span className={s.mark} aria-hidden="true">RB</span>
        <span>ResumeBuilder</span>
      </Link>
      <nav className={s.nav}>
        {navGroups(counts).map((group, gi) => (
          <div key={group.label ?? gi} role="group" aria-label={group.label ?? "Main"}>
            {group.label && <div className={s.navLbl}>{group.label}</div>}
            {gi > 0 && <span className={s.navGap} aria-hidden="true" />}
            {group.items.map((item) => {
              const Icon = item.icon;
              const on = item.section === active;
              const body = (
                <>
                  <Icon size={17} aria-hidden="true" />
                  <span className={s.navTxt}>{item.label}</span>
                  {item.badge && <em className={cx(s.pill, s[item.badge.tone], s.navBadge)}>{item.badge.text}</em>}
                </>
              );
              return item.href ? (
                <Link key={item.label} href={item.href} className={s.navItem} title={item.label}>
                  {body}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className={cx(s.navItem, on && s.navOn)}
                  aria-current={on ? "page" : undefined}
                  title={item.label}
                  onClick={() => onSection(item.section!)}
                >
                  {body}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      {showUpgrade && (
        <div className={s.planbox}>
          <span className={cx(s.pill, s.bl)}>FREE PLAN</span>
          <p>More resumes, more PDF exports and more Noise Remover minutes with Pro.</p>
          <button type="button" className={cx(s.btn, s.primary, s.sm)} style={{ width: "100%" }} onClick={onUpgrade}>
            Upgrade to Pro
          </button>
        </div>
      )}
      <button type="button" className={cx(s.navItem, s.signout, !showUpgrade && s.planGapless)} title="Sign out" onClick={onSignOut}>
        <LogOut size={17} aria-hidden="true" />
        <span className={s.navTxt}>Sign out</span>
      </button>
    </aside>
  );
}
