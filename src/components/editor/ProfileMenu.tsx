"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Globe, User } from "lucide-react";
import clsx from "clsx";
import { apiFetch, logoutSession } from "@/lib/api";

const ITEMS = [
  { label: "Settings", href: "/user/settings" },
  { label: "Account", href: "/user/settings" },
  { label: "Help Center", href: "/" },
  { label: "Contact Us", href: "/" },
] as const;

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  const [name, setName] = useState("Account");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<{ user: { name: string | null; email: string } | null }>("/auth/me")
      .then((res) => setName(res.user?.name || res.user?.email || "Account"))
      .catch(() => setName("Account"));
  }, []);

  useEffect(() => {
    if (!upgrade) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUpgrade(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [upgrade]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setUpgrade(true);
        }}
        className="rounded-lg bg-[#2f6f4b] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#255a3c] hover:shadow"
      >
        Upgrade
      </button>
      <button
        type="button"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex items-center gap-1 rounded-full border border-[#e4e7ec] bg-white px-2 py-1 text-[#5a6470] shadow-sm transition hover:bg-[#f5f6f8]",
          open && "ring-2 ring-[var(--rb-teal)]/30"
        )}
      >
        <User size={16} />
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="rb-pop absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[#e4e7ec] bg-white shadow-xl">
          <p className="truncate border-b border-[#f0f1f3] px-4 py-2.5 text-[12px] font-semibold text-[#5a6470]">{name}</p>
          {ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-[#f0f1f3] px-4 py-2.5 text-[13px] text-[#3a414a] transition hover:bg-[#f5f6f8]"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-[#f0f1f3] px-4 py-2.5 text-left text-[13px] text-[#3a414a] hover:bg-[#f5f6f8]"
          >
            Language
            <Globe size={14} className="text-[#8b939e]" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void logoutSession().finally(() => window.location.assign("/login"));
            }}
            className="block w-full px-4 py-2.5 text-left text-[13px] text-[#3a414a] hover:bg-[#f5f6f8]"
          >
            Log Out
          </button>
        </div>
      )}
      {upgrade && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={() => setUpgrade(false)} onKeyDown={(event) => { if (event.key === "Escape") setUpgrade(false); }}>
          <div role="dialog" aria-labelledby="upgrade-title" className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 id="upgrade-title" className="text-lg font-bold">Upgrade ResumeBuilder</h2>
            <p className="mt-2 text-sm text-slate-500">Pro adds DOCX export, custom domains, and unlimited resumes. Billing is not live on this staging server yet.</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Free — 1 resume, PDF export</li>
              <li>Pro — unlimited resumes, DOCX, share expiry</li>
            </ul>
            <button type="button" className="auth-submit mt-5" onClick={() => setUpgrade(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
