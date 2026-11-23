"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PDF_EDITOR, PDF_TOOL_GROUPS } from "./tools";
import { PdfIcon } from "./PdfIcon";
import s from "./MobilePdfLinks.module.css";

/**
 * PDF block for the phone/tablet burger menus (landing, tool pages, public pages): the same entries as the
 * desktop Tools dropdown (editor + one link per group) as a compact 2-column grid. QA run3 WARN: the mobile
 * menu used to show a single "PDF Tools · Soon" link. CSP-safe (classes only).
 */
export function MobilePdfLinks({ onNavigate, pathname }: { onNavigate?: () => void; pathname?: string }) {
  const editorHref = `/tools/pdf/${PDF_EDITOR.slug}`;
  return (
    <div className={s.block}>
      <div className={s.head}>
        <span>PDF tools</span>
        <em className={s.soon}>Soon</em>
      </div>
      <div className={s.grid}>
        <Link href={editorHref} className={s.link} onClick={onNavigate} aria-current={pathname === editorHref ? "page" : undefined}>
          <span className={s.ico} aria-hidden="true"><PdfIcon name={PDF_EDITOR.icon} size={14} /></span>
          <span className={s.text}>{PDF_EDITOR.title}</span>
        </Link>
        {PDF_TOOL_GROUPS.map((g) => (
          <Link key={g.id} href={`/tools#${g.id}`} className={s.link} onClick={onNavigate}>
            <span className={s.ico} aria-hidden="true"><PdfIcon name={g.tools[0].icon} size={14} /></span>
            <span className={s.text}>{g.title}</span>
          </Link>
        ))}
        <Link href="/tools" className={`${s.link} ${s.all}`} onClick={onNavigate} aria-current={pathname === "/tools" ? "page" : undefined}>
          <span className={s.text}>All tools</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
