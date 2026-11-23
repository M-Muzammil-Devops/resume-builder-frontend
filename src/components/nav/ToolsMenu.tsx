"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, AudioLines, ChevronDown } from "lucide-react";
import { PDF_EDITOR, PDF_TOOL_GROUPS, TOOL_LINKS } from "./tools";
import { PdfIcon } from "./PdfIcon";
import s from "./ToolsMenu.module.css";

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

/** Accessible "Tools" dropdown: button + menu, Escape / outside click close, arrow keys move. */
export function ToolsMenu({ className }: { className?: string }) {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<Array<HTMLAnchorElement | null>>([]);
  const onTool = pathname === "/tools" || pathname?.startsWith("/tools/");
  const audioTools = TOOL_LINKS.filter((tool) => tool.tone !== "c");
  // PDF section: the editor plus one entry per group (each group opens its block on /tools).
  const pdfLinks = [
    { href: `/tools/pdf/${PDF_EDITOR.slug}`, title: PDF_EDITOR.title, icon: PDF_EDITOR.icon },
    ...PDF_TOOL_GROUPS.map((g) => ({ href: `/tools#${g.id}`, title: g.title, icon: g.tools[0].icon })),
  ];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function focusItem(index: number) {
    const items = itemsRef.current.filter(Boolean) as HTMLAnchorElement[];
    if (!items.length) return;
    items[(index + items.length) % items.length].focus();
  }

  function onButtonKey(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const last = event.key === "ArrowUp";
      requestAnimationFrame(() => focusItem(last ? -1 : 0));
    }
  }

  function onMenuKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = itemsRef.current.filter(Boolean) as HTMLAnchorElement[];
    const index = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(-1);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cx(s.tools, className)}>
      <button
        ref={buttonRef}
        type="button"
        className={cx(s.btn, (open || onTool) && s.on)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKey}
      >
        Tools <ChevronDown size={14} aria-hidden="true" className={cx(s.chev, open && s.chevOpen)} />
      </button>
      <div id={menuId} role="menu" aria-label="Tools" className={cx(s.dd, open && s.ddOpen)} hidden={!open} onKeyDown={onMenuKey}>
        <p className={s.sec}>Audio</p>
        {audioTools.map((tool, i) => (
          <Link
            key={tool.href}
            ref={(el) => {
              itemsRef.current[i] = el;
            }}
            href={tool.href}
            role="menuitem"
            className={cx(s.item, pathname === tool.href && s.cur)}
            aria-current={pathname === tool.href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <span className={cx(s.ico, s.icA)} aria-hidden="true">
              <AudioLines size={18} />
            </span>
            <span>
              <b>
                {tool.title} {tool.badge && <em>{tool.badge}</em>}
              </b>
              <small>{tool.blurb}</small>
            </span>
          </Link>
        ))}
        <p className={s.sec}>
          PDF tools <span className={s.soon}>Coming soon</span>
        </p>
        <div className={s.pdfGrid}>
          {pdfLinks.map((link, j) => (
            <Link
              key={link.href}
              ref={(el) => {
                itemsRef.current[audioTools.length + j] = el;
              }}
              href={link.href}
              role="menuitem"
              className={cx(s.mini, pathname === link.href && s.cur)}
              onClick={() => setOpen(false)}
            >
              <span className={cx(s.miniIco)} aria-hidden="true">
                <PdfIcon name={link.icon} size={15} />
              </span>
              {link.title}
            </Link>
          ))}
        </div>
        <Link
          ref={(el) => {
            itemsRef.current[audioTools.length + pdfLinks.length] = el;
          }}
          href="/tools"
          role="menuitem"
          className={cx(s.all, pathname === "/tools" && s.cur)}
          onClick={() => setOpen(false)}
        >
          Browse all tools <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
