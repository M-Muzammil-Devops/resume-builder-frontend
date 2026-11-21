"use client";

import { useContext, useEffect, useId, useRef, useState } from "react";
import { ReadOnlyCtx } from "./readOnlyContext";
import { isPlaceholder } from "@/lib/placeholders";
import clsx from "clsx";
import {
  companyLogoUrl,
  searchCompaniesLive,
  searchCompaniesLocal,
  type CompanySuggestion,
} from "@/lib/companies";
import { CompanyLogo } from "@/components/resume/CompanyLogo";

type Props = {
  value: string;
  accent?: string;
  placeholder?: string;
  onChange: (
    company: string,
    meta?: { logoUrl?: string; website?: string; domain?: string }
  ) => void;
  /** Raise parent stacking when dropdown is open (prevents resume text bleed-through) */
  onOpenChange?: (open: boolean) => void;
};

export function CompanyAutocomplete({
  value,
  accent = "#4a8f86",
  placeholder = "Company Name",
  onChange,
  onOpenChange,
}: Props) {
  const readOnly = useContext(ReadOnlyCtx);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompanySuggestion[]>([]);

  useEffect(() => {
    if (!focused) setQuery(value);
  }, [value, focused]);

  // Debounced live search (Enhancv-style Clearbit autocomplete)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Instant local matches while network loads
    setResults(searchCompaniesLocal(q, 8));
    setLoading(true);
    const id = ++seq.current;
    const t = window.setTimeout(async () => {
      try {
        const live = await searchCompaniesLive(q);
        if (seq.current !== id) return;
        setResults(live);
      } catch {
        if (seq.current === id) setResults(searchCompaniesLocal(q, 8));
      } finally {
        if (seq.current === id) setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setActive(0);
  }, [results]);

  const showMenu = open && query.trim().length >= 2 && (results.length > 0 || loading);

  useEffect(() => {
    onOpenChange?.(showMenu);
  }, [showMenu, onOpenChange]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function applyPick(c: CompanySuggestion) {
    const logo = c.logo || companyLogoUrl(c.domain);
    setQuery(c.name);
    onChange(c.name, {
      logoUrl: logo,
      website: `https://${c.domain}`,
      domain: c.domain,
    });
    setOpen(false);
    setFocused(false);
  }

  // BUG-027/409: read-only views (print/PDF, share) never show the input or its placeholder.
  if (readOnly) {
    return isPlaceholder(value) ? null : <span className="text-[12px] font-medium" style={{ color: accent }}>{value}</span>;
  }
  return (
    <div
      ref={rootRef}
      className={clsx("relative min-w-0 flex-1", showMenu && "z-[80]")}
    >
      <input
        value={query}
        placeholder={placeholder}
        aria-label={placeholder || "Company name"}
        aria-autocomplete="list"
        aria-controls={listId}
        role="combobox"
        aria-expanded={open && results.length > 0}
        className="w-full min-w-[100px] bg-transparent text-[12px] font-medium outline-none placeholder:text-[#b0b7c0]"
        style={{ color: accent }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          // Typing updates name only — logo applies when a suggestion is picked
          onChange(next);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          if (query !== value) onChange(query);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            return;
          }
          if (!open || results.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            applyPick(results[active]);
          }
        }}
      />
      {showMenu && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-[90] mt-1 max-h-56 w-[260px] overflow-y-auto rounded-lg border border-[#e4e7ec] bg-white py-1 shadow-[0_12px_40px_rgba(30,35,42,0.18)] ring-1 ring-black/5 [background-color:#fff]"
        >
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-[11px] text-[#8b939e]">Searching companies…</li>
          )}
          {results.map((c, i) => (
            <li key={`${c.domain}-${c.name}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyPick(c)}
                className={clsx(
                  "flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-[12px] text-[#1f2430]",
                  i === active ? "bg-[#f1f3f5]" : "hover:bg-[#f7f8fa]"
                )}
              >
                <CompanyLogo
                  name={c.name}
                  logoUrl={c.logo}
                  domain={c.domain}
                  size={28}
                />
                <span className="min-w-0 truncate">
                  <span className="font-medium">{c.name}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#9aa3ad]">
                    {c.domain}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
