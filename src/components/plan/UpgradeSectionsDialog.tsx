"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Crown, Layers, X } from "lucide-react";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import s from "./UpgradeSectionsDialog.module.css";

/**
 * "Upgrade your plan" popup for the Free-plan section limit on PDF download.
 * Used by the editor Download dialog and the User Dashboard resume cards. Day/Night via html[data-theme].
 */
export function UpgradeSectionsDialog({
  limit,
  count,
  onClose,
  onEditSections,
}: {
  limit: number;
  count: number;
  onClose: () => void;
  /** Shown as "Edit sections" when given (dashboard opens the editor; the editor just closes). */
  onEditSections?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEscapeClose(onClose);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("[data-primary]")?.focus();
    return () => prev?.focus?.();
  }, []);
  const extra = Math.max(0, count - limit);
  return (
    <div className={s.back} role="presentation" onClick={onClose}>
      <div
        ref={box}
        className={s.box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-sections-title"
        aria-describedby="upgrade-sections-desc"
        onClick={(e) => e.stopPropagation()}
        data-testid="upgrade-sections-dialog"
      >
        <button type="button" className={s.x} aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <div className={s.badge} aria-hidden="true">
          <Crown size={22} />
        </div>
        <h2 id="upgrade-sections-title" className={s.title}>
          Upgrade your plan
        </h2>
        <p id="upgrade-sections-desc" className={s.text}>
          Your Free plan allows up to <b>{limit}</b> section{limit === 1 ? "" : "s"} for PDF download (your resume currently has{" "}
          <b>{count}</b> section{count === 1 ? "" : "s"}).
        </p>
        <div className={s.meter} aria-hidden="true">
          <div className={s.meterBar} style={{ width: `${Math.min(100, Math.round((limit / Math.max(count, 1)) * 100))}%` }} />
        </div>
        <ul className={s.list}>
          <li>
            <Layers size={15} aria-hidden="true" />
            <span>
              Remove {extra} section{extra === 1 ? "" : "s"} to download on Free. Personal info at the top is not counted; empty sections are.
            </span>
          </li>
          <li>
            <Crown size={15} aria-hidden="true" />
            <span>Pro has no section limit, more PDF downloads and no watermark.</span>
          </li>
        </ul>
        <div className={s.acts}>
          {onEditSections ? (
            <button type="button" className={s.btn} onClick={onEditSections}>
              Edit sections
            </button>
          ) : (
            <button type="button" className={s.btn} onClick={onClose}>
              Close
            </button>
          )}
          <Link href="/contact" className={`${s.btn} ${s.primary}`} data-primary>
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Reads a SECTION_LIMIT block from an API error body (HTTP 402), else null. */
export function sectionLimitFromBody(body: unknown): { limit: number; count: number } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.code !== "SECTION_LIMIT" && o.error !== "SECTION_LIMIT") return null;
  const limit = Number(o.limit);
  const count = Number(o.count);
  if (!Number.isFinite(limit) || !Number.isFinite(count)) return null;
  return { limit, count };
}
