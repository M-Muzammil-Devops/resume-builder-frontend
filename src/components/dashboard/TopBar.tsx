"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, FileText, LayoutDashboard, LayoutTemplate, LogOut, Moon, Search, Settings, ShieldCheck, Sun, Wrench, X } from "lucide-react";
import { THEME_EVENT, applyTheme, currentTheme, type Theme } from "@/lib/theme";
import type { LandingTemplate } from "@/lib/landingTemplates";
import type { DashResume } from "./types";
import { cx, initials, templateName } from "./format";
import s from "./Dashboard.module.css";

export type Alert = { id: string; title: string; detail: string; tone: "warn" | "info" | "ok"; action?: () => void };

type Hit =
  | { kind: "resume"; id: string; label: string; sub: string; resume: DashResume }
  | { kind: "template"; id: string; label: string; sub: string; template: LandingTemplate }
  | { kind: "tool"; id: string; label: string; sub: string; href: string };

const TOOLS = [
  { id: "noise", label: "Noise Remover", sub: "Clean interview audio", href: "/tools/audio-noise-remover" },
  { id: "pdf", label: "PDF Tools", sub: "25 tools · coming soon", href: "/tools#pdf" },
  { id: "jobs", label: "Jobs & Tracker", sub: "Find and track applications", href: "/user/jobs" },
  { id: "settings", label: "Settings", sub: "Profile, password, account", href: "/user/settings" },
];

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function TopBar({
  user,
  query,
  onQuery,
  resumes,
  templates,
  alerts,
  onOpenResume,
  onPickTemplate,
  onSignOut,
}: {
  user: { name: string | null; email: string; role: string } | null;
  query: string;
  onQuery: (q: string) => void;
  resumes: DashResume[];
  templates: LandingTemplate[];
  alerts: Alert[];
  onOpenResume: (r: DashResume) => void;
  onPickTemplate: (t: LandingTemplate) => void;
  onSignOut: () => void;
}) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [focus, setFocus] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useOutside(focus || mobileSearch, () => {
    setFocus(false);
    setMobileSearch(false);
  });
  const bellRef = useOutside(bell, () => setBell(false));
  const menuRef = useOutside(menu, () => setMenu(false));

  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    const frame = requestAnimationFrame(sync);
    window.addEventListener(THEME_EVENT, sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(THEME_EVENT, sync);
    };
  }, []);

  // Ctrl+K / ⌘K focuses the quick search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.matchMedia("(max-width: 768px)").matches) setMobileSearch(true);
        setFocus(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const match = (...v: string[]) => v.some((x) => x.toLowerCase().includes(q));
    return [
      ...resumes
        .filter((r) => match(r.title, templateName(r.templateId)))
        .slice(0, 5)
        .map((r) => ({ kind: "resume" as const, id: r.id, label: r.title, sub: `${templateName(r.templateId)} · ${r.score}% ready`, resume: r })),
      ...templates
        .filter((t) => match(t.name, t.blurb))
        .slice(0, 4)
        .map((t) => ({ kind: "template" as const, id: t.id, label: t.name, sub: t.blurb, template: t })),
      ...TOOLS.filter((t) => match(t.label, t.sub)).map((t) => ({ kind: "tool" as const, ...t })),
    ];
  }, [query, resumes, templates]);

  function choose(hit: Hit) {
    setFocus(false);
    setMobileSearch(false);
    if (hit.kind === "resume") onOpenResume(hit.resume);
    else if (hit.kind === "template") onPickTemplate(hit.template);
    else window.location.assign(hit.href);
  }

  const light = theme === "light";
  const showResults = (focus || mobileSearch) && query.trim().length > 0;
  const display = user ? user.name?.trim() || user.email.split("@")[0] : "";
  const warnCount = alerts.filter((a) => a.tone !== "ok").length;

  return (
    <div className={s.top}>
      <Link href="/user/dashboard" className={s.mbrand} aria-label="ResumeBuilder dashboard">
        <span className={s.mark} aria-hidden="true">RB</span>
        <span className={s.mbrandTxt}>ResumeBuilder</span>
      </Link>
      <div ref={searchRef} className={cx(s.search, mobileSearch && s.searchOpen)}>
        <div className={s.searchBox}>
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            enterKeyHint="search"
            value={query}
            placeholder="Search resumes, templates, tools…"
            aria-label="Search resumes, templates and tools"
            aria-expanded={showResults}
            aria-controls="dash-search-results"
            role="combobox"
            aria-autocomplete="list"
            onFocus={() => setFocus(true)}
            onChange={(e) => {
              onQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, Math.max(hits.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter" && hits[cursor]) {
                e.preventDefault();
                choose(hits[cursor]);
              } else if (e.key === "Escape") {
                setFocus(false);
                setMobileSearch(false);
                inputRef.current?.blur();
              }
            }}
          />
          {query ? (
            <button type="button" className={s.link} aria-label="Clear search" onClick={() => onQuery("")}>
              <X size={15} aria-hidden="true" />
            </button>
          ) : mobileSearch ? (
            <button
              type="button"
              className={s.link}
              aria-label="Close search"
              onClick={() => {
                setMobileSearch(false);
                setFocus(false);
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : (
            <kbd className={s.kbd}>Ctrl K</kbd>
          )}
        </div>
        {showResults && (
          <div id="dash-search-results" className={cx(s.pop, s.results)} role="listbox" aria-label="Search results">
            {hits.length === 0 ? (
              <div className={s.popEmpty}>Nothing matches “{query.trim()}”.</div>
            ) : (
              (["resume", "template", "tool"] as const).map((kind) => {
                const group = hits.filter((h) => h.kind === kind);
                if (!group.length) return null;
                return (
                  <div key={kind}>
                    <div className={s.resGroup}>{kind === "resume" ? "Resumes" : kind === "template" ? "Templates" : "Tools"}</div>
                    {group.map((h) => {
                      const i = hits.indexOf(h);
                      const Icon = kind === "resume" ? FileText : kind === "template" ? LayoutTemplate : Wrench;
                      return (
                        <button
                          key={`${kind}-${h.id}`}
                          type="button"
                          role="option"
                          aria-selected={i === cursor}
                          className={cx(s.popItem, i === cursor && s.resOn)}
                          onMouseEnter={() => setCursor(i)}
                          onClick={() => choose(h)}
                        >
                          <Icon size={16} aria-hidden="true" />
                          <span>
                            {h.label}
                            <small>{h.sub}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      <div className={s.topRight}>
        <button
          type="button"
          className={cx(s.icoBtn, s.searchBtn)}
          aria-label="Search"
          onClick={() => {
            setMobileSearch(true);
            setFocus(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <Search size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={s.icoBtn}
          aria-pressed={light}
          aria-label={light ? "Switch to night mode" : "Switch to day mode"}
          title={light ? "Night mode" : "Day mode"}
          onClick={() => applyTheme(light ? "dark" : "light", { animate: true })}
        >
          {light ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        </button>
        <div ref={bellRef} className={s.popWrap}>
          <button
            type="button"
            className={s.icoBtn}
            aria-label={warnCount ? `Alerts (${warnCount} new)` : "Alerts"}
            aria-expanded={bell}
            aria-haspopup="dialog"
            onClick={() => setBell((v) => !v)}
          >
            <Bell size={18} aria-hidden="true" />
            {warnCount > 0 && <span className={s.dot} aria-hidden="true" />}
          </button>
          {bell && (
            <div className={s.pop} role="dialog" aria-label="Alerts">
              <div className={s.popHead}>
                <b>Alerts</b>
                <small>{alerts.length ? "Based on your account and plan" : "You are all caught up"}</small>
              </div>
              {alerts.length === 0 ? (
                <div className={s.popEmpty}>No alerts right now.</div>
              ) : (
                alerts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={s.popItem}
                    onClick={() => {
                      setBell(false);
                      a.action?.();
                    }}
                  >
                    <span className={cx(s.pill, a.tone === "warn" ? s.a : a.tone === "ok" ? s.g : s.bl)} aria-hidden="true">
                      {a.tone === "warn" ? "!" : a.tone === "ok" ? "✓" : "i"}
                    </span>
                    <span>
                      {a.title}
                      <small>{a.detail}</small>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {user ? (
          <div ref={menuRef} className={s.popWrap}>
            <button
              type="button"
              className={s.me}
              aria-haspopup="menu"
              aria-expanded={menu}
              aria-label={`Account menu for ${display}`}
              onClick={() => setMenu((v) => !v)}
            >
              <span className={s.av} aria-hidden="true">{initials(user.name, user.email)}</span>
              <span className={s.meTxt}>
                <b>{display}</b>
                <small>{user.email}</small>
              </span>
            </button>
            {menu && (
              <div className={s.pop} role="menu" aria-label="Account">
                <div className={s.popHead}>
                  <b>{display}</b>
                  <small>{user.email}</small>
                </div>
                {user.role === "admin" && (
                  <Link href="/admin" role="menuitem" className={s.popItem} onClick={() => setMenu(false)}>
                    <ShieldCheck size={16} aria-hidden="true" /> Admin console
                  </Link>
                )}
                <Link href="/user/dashboard" role="menuitem" className={s.popItem} onClick={() => setMenu(false)}>
                  <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
                </Link>
                <Link href="/user/settings" role="menuitem" className={s.popItem} onClick={() => setMenu(false)}>
                  <Settings size={16} aria-hidden="true" /> Settings
                </Link>
                <button type="button" role="menuitem" className={cx(s.popItem, s.danger)} onClick={onSignOut}>
                  <LogOut size={16} aria-hidden="true" /> Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <span className={s.icoBtn} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
