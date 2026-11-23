"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  AudioLines,
  Briefcase,
  LayoutDashboard,
  LogOut,
  Rocket,
  Columns3,
  Settings,
} from "lucide-react";
import { logoutSession } from "@/lib/api";

const links = [
  { href: "/user/dashboard", label: "Documents", icon: LayoutDashboard },
  { href: "/user/jobs", label: "Jobs", icon: Briefcase },
  { href: "/user/jobs/tracker", label: "Tracker", icon: Columns3 },
  { href: "/user/jobs/auto-apply", label: "Auto Apply", icon: Rocket },
  { href: "/user/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar flex w-64 shrink-0 flex-col text-slate-200">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/user/dashboard" className="app-sidebar-brand">
          <span className="auth-brand-mark" aria-hidden>
            RB
          </span>
          <div>
            <div className="auth-display text-lg font-bold tracking-tight text-white">
              ResumeBuilder
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">ATS workspace</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const activeHref = links
            .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            .sort((a, b) => b.href.length - a.href.length)[0]?.href;
          const active = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={clsx(
                "app-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                active ? "app-nav-link-active" : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
        <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tools</p>
        <Link
          href="/tools/audio-noise-remover"
          onClick={onNavigate}
          className="app-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <AudioLines size={18} />
          Noise Remover
        </Link>
      </nav>
      <button
        type="button"
        onClick={() => {
          void logoutSession().finally(() => {
            onNavigate?.();
            window.location.assign("/login");
          });
        }}
        className="app-nav-link m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white"
      >
        <LogOut size={18} />
        Sign out
      </button>
    </aside>
  );
}
