"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { EditableText } from "@/components/resume/EditableText";
import { LinkEditPopover } from "@/components/resume/LinkEditPopover";
import { contactLinkHref, linkHrefFromText, looksLikeUrl } from "@/lib/linkHref";

type Props = {
  label: string;
  href?: string;
  placeholder: string;
  onLabelChange: (label: string) => void;
  onHrefChange: (href: string) => void;
  onClearHref: () => void;
  readOnly?: boolean;
};

function normalizeHref(raw: string) {
  return linkHrefFromText(raw);
}

/** Plain editable label; link URL popover appears only when text is selected. */
export function ContactLinkField({
  label,
  href,
  placeholder,
  onLabelChange,
  onHrefChange,
  onClearHref,
  readOnly = false,
}: Props) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftHref, setDraftHref] = useState("https://");

  useEffect(() => {
    function onSelectionChange() {
      if (popoverOpen) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !wrapRef.current) {
        setPopoverOpen(false);
        return;
      }
      const node = sel.anchorNode;
      if (node && wrapRef.current.contains(node) && sel.toString().trim()) {
        const typed = looksLikeUrl(label) ? linkHrefFromText(label) : "";
        setDraftHref(typed || (href && !/^https?:\/\/linkedin\.com\/?$/i.test(href) ? linkHrefFromText(href) : "https://"));
        setPopoverOpen(true);
      } else {
        setPopoverOpen(false);
      }
    }

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [popoverOpen, href]);

  if (readOnly) {
    // BUG-1100: no href at all when the target is empty or unsafe (an empty href would
    // resolve to the page URL). BUG-400: typed URL text is the link target.
    const target = contactLinkHref(label, href);
    if (!label.trim()) return null;
    return target ? (
      <a href={target} className="underline decoration-[#9aa3ad] underline-offset-2">
        {label}
      </a>
    ) : (
      <span>{label}</span>
    );
  }

  return (
    <span ref={wrapRef} className="relative inline-flex min-w-0 max-w-[14rem]">
      <EditableText
        value={label}
        onChange={(next) => {
          onLabelChange(next);
          if (looksLikeUrl(next)) onHrefChange(linkHrefFromText(next));
        }}
        rich={false}
        placeholder={placeholder}
        tag="span"
        className={clsx(
          "rb-contact-field text-inherit",
          href && label ? "underline decoration-[#9aa3ad] underline-offset-2" : ""
        )}
      />
      {popoverOpen && (
        <LinkEditPopover
          className="absolute left-0 top-full z-50 mt-1"
          value={draftHref}
          onChange={setDraftHref}
          onClose={() => {
            onHrefChange(normalizeHref(draftHref));
            setPopoverOpen(false);
            window.getSelection()?.removeAllRanges();
          }}
          onClear={() => {
            onClearHref();
            setDraftHref("https://");
            setPopoverOpen(false);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}
    </span>
  );
}
