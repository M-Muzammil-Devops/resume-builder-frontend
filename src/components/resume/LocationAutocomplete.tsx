"use client";

import { useContext, useEffect, useId, useRef, useState } from "react";
import { ReadOnlyCtx } from "./readOnlyContext";
import { isPlaceholder } from "@/lib/placeholders";
import clsx from "clsx";
import { searchLocationsLive, searchLocationsLocal } from "@/lib/locations";

type Props = {
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (location: string) => void;
  onOpenChange?: (open: boolean) => void;
};

export function LocationAutocomplete({
  value,
  placeholder = "Location",
  className,
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
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!focused) setQuery(value);
  }, [value, focused]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setResults(searchLocationsLocal(q, 8));
    setLoading(true);
    const id = ++seq.current;
    const t = window.setTimeout(async () => {
      try {
        const live = await searchLocationsLive(q);
        if (seq.current !== id) return;
        setResults(live);
      } catch {
        if (seq.current === id) setResults(searchLocationsLocal(q, 8));
      } finally {
        if (seq.current === id) setLoading(false);
      }
    }, 240);

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

  function applyPick(loc: string) {
    setQuery(loc);
    onChange(loc);
    setOpen(false);
    setFocused(false);
  }

  // BUG-027/409: read-only views (print/PDF, share) never show the input or its placeholder.
  if (readOnly) {
    return isPlaceholder(value) ? null : <span className={className || "text-[10px]"}>{value}</span>;
  }
  return (
    <div
      ref={rootRef}
      className={clsx("relative min-w-0", showMenu && "z-[80]")}
    >
      <input
        maxLength={200}
        value={query}
        placeholder={placeholder}
        aria-label={placeholder || "Location"}
        aria-autocomplete="list"
        aria-controls={listId}
        role="combobox"
        aria-expanded={showMenu}
        className={clsx(
          "w-full min-w-[72px] bg-transparent outline-none placeholder:text-[#b0b7c0]",
          className || "text-[10px]"
        )}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
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
          className="absolute left-0 top-full z-[90] mt-1 max-h-56 w-[240px] overflow-y-auto rounded-lg border border-[#e4e7ec] bg-white py-1 shadow-[0_12px_40px_rgba(30,35,42,0.18)] ring-1 ring-black/5"
        >
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-[11px] text-[#8b939e]">
              Searching locations…
            </li>
          )}
          {results.map((loc, i) => (
            <li key={loc}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyPick(loc)}
                className={clsx(
                  "flex w-full items-center px-3 py-1.5 text-left text-[12px] text-[#1f2430]",
                  i === active ? "bg-[#f1f3f5]" : "hover:bg-[#f7f8fa]",
                  i > 0 && "border-t border-[#eceef1]"
                )}
              >
                {loc}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
