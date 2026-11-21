"use client";

import { Trash2 } from "lucide-react";
import clsx from "clsx";

export function LinkEditPopover({
  value,
  onChange,
  onClose,
  onClear,
  placeholder = "Link...",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "z-40 w-[220px] rounded-lg border border-[#e4e7ec] bg-white p-2 shadow-[0_12px_32px_rgba(30,35,42,0.16)]",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        aria-label="Link URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onClose();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onClear();
          }
        }}
        placeholder={placeholder}
        className="mb-2 w-full rounded-md border border-[#d5d8dd] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--rb-teal)] focus:ring-1 focus:ring-[var(--rb-teal)]/40"
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="rb-toolbar-btn-primary h-8 min-w-[44px] rounded-md bg-[#5aaa7a] px-3 text-[12px] font-semibold text-white hover:bg-[#4d966b]"
        >
          Ok
        </button>
        <button
          type="button"
          title="Remove link"
          aria-label="Remove link"
          onClick={onClear}
          className="rb-toolbar-btn-danger flex h-8 w-8 items-center justify-center rounded-md bg-[#e35d5d] text-white hover:bg-[#d14e4e]"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
