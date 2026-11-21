"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import clsx from "clsx";
import { isPlaceholder } from "@/lib/placeholders";
import { endBeforeStart, placePopover } from "@/lib/phase4Logic";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseYm(value: string): { year: number; month: number } | null {
  if (!value || value.toLowerCase() === "present") return null;
  const m = value.match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!m) return null;
  return { year: Number(m[1]), month: m[2] ? Number(m[2]) : 1 };
}

function formatYm(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  accent = "#4d9d92",
  onOpenChange,
  readOnly = false,
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  accent?: string;
  onOpenChange?: (open: boolean) => void;
  readOnly?: boolean;
}) {
  const [tab, setTab] = useState<"from" | "to">("to");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const start = parseYm(startDate);
  const end = parseYm(endDate);
  const isPresent = endDate.toLowerCase() === "present";
  const activeYear = (tab === "from" ? start?.year : end?.year) || new Date().getFullYear();
  const [decadeStart, setDecadeStart] = useState(Math.floor(activeYear / 10) * 10 - 1);

  const years = useMemo(
    () => Array.from({ length: 12 }, (_, i) => decadeStart + i),
    [decadeStart]
  );

  const label = startDate || endDate ? `${startDate || "Start"} – ${endDate || "End"}` : "Add dates";
  const rangeInvalid = endBeforeStart(startDate, endDate);
  const popRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const selectedYear = tab === "from" ? start?.year : end?.year;
  const selectedMonth = tab === "from" ? start?.month : end?.month;

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const place = useCallback(() => {
    const anchor = ref.current?.getBoundingClientRect();
    if (!anchor) return;
    const height = popRef.current?.scrollHeight || 340;
    const next = placePopover(
      { top: anchor.top, bottom: anchor.bottom, left: anchor.left },
      { width: 270, height },
      { width: window.innerWidth, height: window.innerHeight }
    );
    setBox((prev) =>
      prev &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.maxHeight === next.maxHeight
        ? prev
        : next
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, tab, isPresent, place]);

  useEffect(() => {
    if (!open) return;
    document.body.setAttribute("data-rb-date-popover", "open");
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.body.removeAttribute("data-rb-date-popover");
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, place]);

  function pickYear(year: number) {
    if (tab === "from") onChange(formatYm(year, start?.month || 1), endDate);
    else onChange(startDate, formatYm(year, end?.month || 1));
  }

  function pickMonth(month: number) {
    const year = (tab === "from" ? start?.year : end?.year) || new Date().getFullYear();
    if (tab === "from") onChange(formatYm(year, month), endDate);
    else onChange(startDate, formatYm(year, month));
  }

  if (readOnly && isPlaceholder(startDate) && isPlaceholder(endDate)) return null;

  return (
    <div
      className={clsx("relative inline-flex max-w-full flex-col items-start", open && "z-[120]")}
      ref={ref}
      onClick={(e) => e.stopPropagation()}
    >
      {readOnly ? (
        <span className="text-[10px] text-slate-500">
          {[startDate, endDate].filter((part) => part && !isPlaceholder(part)).join(" – ")}
        </span>
      ) : (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded px-0.5 text-left text-[10px] text-slate-500 hover:bg-slate-50"
      >
        {label}
      </button>
      )}
      {rangeInvalid && !readOnly && (
        <p role="status" className="mt-0.5 max-w-[180px] text-[10px] font-semibold leading-snug text-amber-700">
          End date is before the start date.
        </p>
      )}
      {open && createPortal(
        <div
          ref={popRef}
          className="w-[270px] overflow-y-auto rounded-xl border border-[#e4e7ec] bg-white p-2.5 shadow-[0_16px_48px_rgba(30,35,42,0.22)] ring-1 ring-black/5"
          style={{
            position: "fixed",
            top: box?.top ?? -9999,
            left: box?.left ?? 8,
            zIndex: 1000,
            maxHeight: box?.maxHeight ?? 340,
            visibility: box ? "visible" : "hidden",
          }}
        >
          <div className="sticky top-0 z-[1] mb-2 grid grid-cols-2 gap-1 border-b border-[#eceef1] bg-white">
            {(["from", "to"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={clsx(
                  "py-2 text-xs font-semibold capitalize",
                  tab === t ? "border-b-2" : "text-slate-400"
                )}
                style={tab === t ? { color: accent, borderColor: accent } : undefined}
              >
                {t === "from" ? "From" : "To"}
              </button>
            ))}
          </div>

          {tab === "to" && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-[#f1f3f5] px-3 py-2">
              <span className="text-[12px] font-medium text-[#3a414a]">Present</span>
              <button
                type="button"
                role="switch"
                aria-checked={isPresent}
                onClick={() => onChange(startDate, isPresent ? formatYm(new Date().getFullYear(), 1) : "Present")}
                className={clsx(
                  "relative h-5 w-9 rounded-full transition",
                  isPresent ? "bg-[#5aaa7a]" : "bg-[#cfd4db]"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                    isPresent ? "left-4" : "left-0.5"
                  )}
                />
              </button>
            </div>
          )}

          {!isPresent || tab === "from" ? (
            <>
              <div className="mb-2 flex items-center justify-between px-1">
                <button type="button" onClick={() => setDecadeStart((d) => d - 12)} className="p-1 text-slate-400">
                  <ChevronLeft size={14} />
                </button>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  <Pencil size={10} /> Year
                </span>
                <button type="button" onClick={() => setDecadeStart((d) => d + 12)} className="p-1 text-slate-400">
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="mb-2 grid grid-cols-3 gap-1">
                {years.slice(0, 3).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => pickYear(y)}
                    className="rounded-full px-1 py-1.5 text-[12px]"
                    style={
                      selectedYear === y
                        ? { color: accent, boxShadow: `inset 0 0 0 1.5px ${accent}` }
                        : { color: "#475569" }
                    }
                  >
                    {y}
                  </button>
                ))}
              </div>
              <div className="mb-1 border-t border-slate-100 pt-2 text-center text-[10px] font-semibold text-slate-400">
                Month
              </div>
              <div className="grid grid-cols-4 gap-1">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pickMonth(i + 1)}
                    className="rounded-full px-1 py-1.5 text-[11px]"
                    style={
                      selectedMonth === i + 1
                        ? { color: accent, boxShadow: `inset 0 0 0 1.5px ${accent}` }
                        : { color: "#475569" }
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>,
        document.body
      )}
    </div>
  );
}
