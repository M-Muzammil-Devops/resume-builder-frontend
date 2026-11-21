"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  Underline,
} from "lucide-react";
import clsx from "clsx";
import { hasResumeTextSelection } from "@/lib/typography";
import { LinkEditPopover } from "@/components/resume/LinkEditPopover";

type Pos = { top: number; left: number };

function run(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function currentLinkHref(): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "https://";
  let node: Node | null = sel.anchorNode;
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "A") {
      return (node as HTMLAnchorElement).getAttribute("href") || "https://";
    }
    node = node.parentNode;
  }
  return "https://";
}

export function TextFormatToolbar() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [visible, setVisible] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("https://");
  const savedRange = useRef<Range | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function update() {
      // Keep link popover open even if selection collapses while typing URL
      if (linkOpen) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !sel.toString().trim()) {
        setVisible(false);
        return;
      }
      if (!hasResumeTextSelection()) {
        setVisible(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        setVisible(false);
        return;
      }
      setPos({
        top: Math.max(8, rect.top - 48),
        left: rect.left + rect.width / 2,
      });
      setVisible(true);
    }

    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [linkOpen]);

  useEffect(() => {
    if (!linkOpen) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setLinkOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [linkOpen]);

  function restoreSelection() {
    const range = savedRange.current;
    if (!range) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function openLinkPopover() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
    setLinkValue(currentLinkHref());
    setLinkOpen(true);
  }

  function applyLink() {
    restoreSelection();
    const url = linkValue.trim();
    if (url) {
      run("createLink", url);
      // Open in new tab by default
      const sel = window.getSelection();
      const a = sel?.anchorNode?.parentElement?.closest("a");
      if (a) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    }
    setLinkOpen(false);
  }

  function removeLink() {
    restoreSelection();
    run("unlink");
    setLinkOpen(false);
  }

  if (!visible || !pos) return null;

  const btn =
    "flex h-8 w-8 items-center justify-center rounded-md text-[#3a414a] transition hover:bg-[#eef1f4]";

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto fixed z-[200] -translate-x-1/2"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => {
        // Don't clear selection when interacting with toolbar / link popover
        if ((e.target as HTMLElement).tagName !== "INPUT") {
          e.preventDefault();
        }
        e.stopPropagation();
      }}
    >
      <div className="flex items-center gap-0.5 rounded-full border border-[#e4e7ec] bg-white px-1.5 py-1 shadow-[0_8px_28px_rgba(30,35,42,0.16)]">
        <button type="button" title="Bold" aria-label="Bold" className={btn} onClick={() => run("bold")}>
          <Bold size={14} strokeWidth={2.4} />
        </button>
        <button type="button" title="Underline" aria-label="Underline" className={btn} onClick={() => run("underline")}>
          <Underline size={14} strokeWidth={2.4} />
        </button>
        <button type="button" title="Italic" aria-label="Italic" className={btn} onClick={() => run("italic")}>
          <Italic size={14} strokeWidth={2.4} />
        </button>
        <span className="mx-0.5 h-4 w-px bg-[#e4e7ec]" />
        <button type="button" title="Align left" aria-label="Align left" className={btn} onClick={() => run("justifyLeft")}>
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          title="Align center"
          aria-label="Align center"
          className={btn}
          onClick={() => run("justifyCenter")}
        >
          <AlignCenter size={14} />
        </button>
        <button type="button" title="Align right" aria-label="Align right" className={btn} onClick={() => run("justifyRight")}>
          <AlignRight size={14} />
        </button>
        <span className="mx-0.5 h-4 w-px bg-[#e4e7ec]" />
        <button
          type="button"
          title="Link"
          aria-label="Link"
          className={clsx(btn, linkOpen && "bg-[#eef6f4] text-[var(--rb-teal-dark)]")}
          onClick={openLinkPopover}
        >
          <Link2 size={14} />
        </button>
      </div>

      {linkOpen && (
        <div className="absolute left-1/2 top-full z-[210] mt-2 -translate-x-1/2">
          <LinkEditPopover
            value={linkValue}
            onChange={setLinkValue}
            onClose={applyLink}
            onClear={removeLink}
            placeholder="Link..."
          />
        </div>
      )}
    </div>
  );
}
