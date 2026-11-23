"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { AudioLines, ChevronDown, Mic } from "lucide-react";
import { TOOL_LINKS } from "./tools";
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
  const onTool = pathname?.startsWith("/tools/");

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
        {TOOL_LINKS.map((tool, i) => (
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
            <span className={cx(s.ico, tool.tone === "a" ? s.icA : s.icB)} aria-hidden="true">
              {tool.tone === "a" ? <AudioLines size={18} /> : <Mic size={18} />}
            </span>
            <span>
              <b>
                {tool.title} {tool.badge && <em>{tool.badge}</em>}
              </b>
              <small>{tool.blurb}</small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
