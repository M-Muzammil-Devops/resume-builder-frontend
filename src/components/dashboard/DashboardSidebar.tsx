"use client";

import Link from "next/link";
import {
  AudioLines,
  Briefcase,
  CreditCard,
  FileText,
  FileType2,
  SquareKanban,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Send,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./format";
import s from "./Dashboard.module.css";

/** In-page sections of /user/dashboard (the dashboard shows the user's resumes; templates have their own page). */
export type SectionKey = "dashboard" | "resumes" | "plan";
/** Workspace pages that open inside the same User Dashboard shell. */
export type RouteKey = "cover-letters" | "templates" | "jobs" | "tracker" | "auto-apply" | "noise-remover" | "pdf-tools" | "settings";
export type NavKey = SectionKey | RouteKey;

export const SECTION_KEYS: SectionKey[] = ["dashboard", "resumes", "plan"];
export const isSectionKey = (k: string): k is SectionKey => (SECTION_KEYS as string[]).includes(k);

export type NavItem = {
  key: NavKey;
  label: string;
  icon: LucideIcon;
  /** Route for workspace pages; sections live on /user/dashboard. */
  href?: string;
  badge?: { text: string; tone: "gr" | "bl" };
};

export type NavGroup = { label?: string; items: NavItem[] };

export type NavCounts = { resumes: number; templates: number; letters: number };

/** Link for a section when the user is not on the dashboard page. */
export const sectionHref = (key: SectionKey) => (key === "dashboard" ? "/user/dashboard" : `/user/dashboard#${key}`);

export function navGroups(counts: NavCounts): NavGroup[] {
  return [
    {
      items: [
        { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { key: "resumes", label: "Resumes", icon: FileText, badge: counts.resumes ? { text: String(counts.resumes), tone: "gr" } : undefined },
        { key: "cover-letters", label: "Cover Letters", icon: Mail, href: "/user/cover-letters", badge: counts.letters ? { text: String(counts.letters), tone: "gr" } : undefined },
        { key: "templates", label: "Templates", icon: LayoutTemplate, href: "/user/templates", badge: { text: String(counts.templates), tone: "bl" } },
      ],
    },
    {
      label: "Jobs & Auto Apply",
      items: [
        { key: "jobs", label: "Jobs", icon: Briefcase, href: "/user/jobs" },
        { key: "tracker", label: "Tracker", icon: SquareKanban, href: "/user/tracker" },
        { key: "auto-apply", label: "Auto Apply", icon: Send, href: "/user/auto-apply" },
      ],
    },
    {
      label: "Tools",
      items: [
        { key: "noise-remover", label: "Noise Remover", icon: AudioLines, href: "/user/noise-remover" },
        { key: "pdf-tools", label: "PDF Tools", icon: FileType2, href: "/user/pdf-tools", badge: { text: "SOON", tone: "gr" } },
      ],
    },
    {
      label: "Account",
      items: [
        { key: "plan", label: "Plan & Billing", icon: CreditCard },
        { key: "settings", label: "Settings", icon: Settings, href: "/user/settings" },
      ],
    },
  ];
}

/**
 * One nav entry. Sections scroll in place on the dashboard (onSection given);
 * everywhere else they link back to /user/dashboard#section. Routes are always links.
 */
export function NavEntry({
  item,
  active,
  onSection,
  onNavigate,
  className,
  activeClassName,
  showText = true,
}: {
  item: NavItem;
  active: NavKey;
  onSection?: (key: SectionKey) => void;
  onNavigate?: () => void;
  className: string;
  activeClassName: string;
  showText?: boolean;
}) {
  const Icon = item.icon;
  const on = item.key === active;
  const body = (
    <>
      <Icon size={17} aria-hidden="true" />
      {showText && <span className={s.navTxt}>{item.label}</span>}
      {showText && item.badge && <em className={cx(s.pill, s[item.badge.tone], s.navBadge)}>{item.badge.text}</em>}
    </>
  );
  const cls = cx(className, on && activeClassName);
  if (!item.href && onSection && isSectionKey(item.key)) {
    const key = item.key;
    return (
      <button
        type="button"
        className={cls}
        aria-current={on ? "page" : undefined}
        title={item.label}
        onClick={() => {
          onNavigate?.();
          onSection(key);
        }}
      >
        {body}
      </button>
    );
  }
  const href = item.href ?? sectionHref(item.key as SectionKey);
  return (
    <Link href={href} className={cls} aria-current={on ? "page" : undefined} title={item.label} onClick={onNavigate}>
      {body}
    </Link>
  );
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
  counts: NavCounts;
  /** True only once the summary has loaded and the plan is Free. */
  showUpgrade: boolean;
  /** Given on /user/dashboard only: sections scroll in place. */
  onSection?: (key: SectionKey) => void;
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
            {group.items.map((item) => (
              <NavEntry key={item.key} item={item} active={active} onSection={onSection} className={s.navItem} activeClassName={s.navOn} />
            ))}
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
