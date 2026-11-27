"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, FileText, Home, LogOut, Menu, Plus, X } from "lucide-react";
import { cx } from "./format";
import { NavEntry, navGroups, sectionHref, type NavCounts, type NavKey, type SectionKey } from "./DashboardSidebar";
import s from "./Dashboard.module.css";

const JOB_KEYS: NavKey[] = ["jobs", "tracker", "auto-apply"];

/**
 * Bottom tab bar (≤ 768px): Home, Resumes, New resume, Jobs and a Menu sheet with every
 * workspace page, so the whole sidebar is reachable on phones without leaving the dashboard.
 */
export function MobileTabBar({
  active,
  busy,
  counts,
  onSection,
  onCreate,
  onSignOut,
}: {
  active: NavKey;
  busy: boolean;
  counts: NavCounts;
  onSection?: (k: SectionKey) => void;
  onCreate: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const tab = (key: SectionKey, label: string, Icon: typeof Home) => {
    const on = active === key;
    return onSection ? (
      <button type="button" className={cx(s.tab, on && s.tabOn)} aria-current={on ? "page" : undefined} onClick={() => onSection(key)}>
        <Icon size={19} aria-hidden="true" />
        {label}
      </button>
    ) : (
      <Link href={sectionHref(key)} className={cx(s.tab, on && s.tabOn)} aria-current={on ? "page" : undefined}>
        <Icon size={19} aria-hidden="true" />
        {label}
      </Link>
    );
  };
  const jobsOn = JOB_KEYS.includes(active);
  const menuOn = !jobsOn && !["dashboard", "resumes"].includes(active);

  return (
    <>
      <nav className={s.tabbar} aria-label="Dashboard tabs">
        {tab("dashboard", "Home", Home)}
        {tab("resumes", "Resumes", FileText)}
        <button type="button" className={s.fab} aria-label="New resume" disabled={busy} onClick={onCreate}>
          <Plus size={22} aria-hidden="true" />
        </button>
        <Link href="/user/jobs" className={cx(s.tab, jobsOn && s.tabOn)} aria-current={active === "jobs" ? "page" : undefined}>
          <Briefcase size={19} aria-hidden="true" />
          Jobs
        </Link>
        <button
          type="button"
          className={cx(s.tab, (menuOn || open) && s.tabOn)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="dash-mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu size={19} aria-hidden="true" />
          Menu
        </button>
      </nav>
      {open && (
        <div className={s.sheetBack} role="presentation" onClick={() => setOpen(false)}>
          <div id="dash-mobile-menu" className={s.sheet} role="dialog" aria-modal="true" aria-label="Dashboard menu" onClick={(e) => e.stopPropagation()}>
            <div className={s.sheetHead}>
              <b>Menu</b>
              <button type="button" className={s.icoBtn} aria-label="Close menu" onClick={() => setOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {navGroups(counts).map((group, gi) => (
              <div key={group.label ?? gi} role="group" aria-label={group.label ?? "Main"} className={s.sheetGroup}>
                {group.label && <div className={s.navLbl}>{group.label}</div>}
                <div className={s.sheetGrid}>
                  {group.items.map((item) => (
                    <NavEntry
                      key={item.key}
                      item={item}
                      active={active}
                      onSection={onSection}
                      onNavigate={() => setOpen(false)}
                      className={s.sheetItem}
                      activeClassName={s.navOn}
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              className={cx(s.sheetItem, s.sheetOut)}
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
            >
              <LogOut size={17} aria-hidden="true" />
              <span className={s.navTxt}>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
