"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import type { DashUsage } from "./types";
import { cx } from "./format";
import s from "./Dashboard.module.css";

function Modal({ title, onClose, busy, children, id }: { title: string; onClose: () => void; busy?: boolean; children: React.ReactNode; id: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEscapeClose(onClose, !busy);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("input, button[data-primary], button")?.focus();
    return () => prev?.focus?.();
  }, []);
  return (
    <div className={s.modalBack} role="presentation" onClick={() => !busy && onClose()}>
      <div ref={box} className={s.modal} role="dialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
        <h3 id={id}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function RenameDialog({ initial, busy, onSave, onClose }: { initial: string; busy: boolean; onSave: (title: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(initial);
  const clean = value.trim().slice(0, 100);
  return (
    <Modal title="Rename resume" onClose={onClose} busy={busy} id="dash-rename-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (clean) onSave(clean);
        }}
      >
        <label className={s.srOnly} htmlFor="dash-rename-input">
          Resume name
        </label>
        <input id="dash-rename-input" className={s.input} value={value} maxLength={100} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
        <div className={s.modalActs}>
          <button type="button" className={s.btn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" data-primary className={cx(s.btn, s.primary)} disabled={busy || !clean || clean === initial}>
            {busy ? "Saving…" : "Save name"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteDialog({ title, busy, onConfirm, onClose }: { title: string; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title="Delete this resume?" onClose={onClose} busy={busy} id="dash-delete-title">
      <p>
        “{title}” will be deleted for good. Its cover letter (if any) is kept. This cannot be undone.
      </p>
      <div className={s.modalActs}>
        <button type="button" className={s.btn} onClick={onClose} disabled={busy} data-primary>
          Cancel
        </button>
        <button type="button" className={cx(s.btn, s.dangerFill)} onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete resume"}
        </button>
      </div>
    </Modal>
  );
}

const lim = (n: number, unit = "") => (n > 0 ? `${n}${unit}` : "Unlimited");

export function PlansDialog({ usage, onClose }: { usage: DashUsage; onClose: () => void }) {
  return (
    <Modal title="Plans" onClose={onClose} id="dash-plans-title">
      <p>Your current plan: <b>{usage.plan === "ADMIN" ? "Admin (no limits)" : usage.plan === "PRO" ? "Pro" : "Free"}</b>. Limits reset on the 1st of every month.</p>
      <div className={s.plans}>
        <div className={s.planCol}>
          <b>Free</b>
          <ul>
            <li>{usage.plan === "FREE" ? lim(usage.resumesLimit) : "Limited"} resumes</li>
            <li>{usage.plan === "FREE" ? lim(usage.pdfExportsLimit) : "Limited"} PDF exports / month</li>
            <li>{usage.plan === "FREE" ? lim(usage.audioMinutesLimit, " min") : "Limited"} Noise Remover / month</li>
          </ul>
        </div>
        <div className={cx(s.planCol, s.planPro)}>
          <b>Pro</b>
          <ul>
            <li>More resumes</li>
            <li>More PDF exports, no watermark</li>
            <li>More Noise Remover minutes</li>
          </ul>
        </div>
      </div>
      <div className={s.modalActs}>
        <button type="button" className={s.btn} onClick={onClose}>
          Close
        </button>
        {usage.plan === "FREE" && (
          <Link href="/contact" className={cx(s.btn, s.primary)}>
            Ask about Pro
          </Link>
        )}
      </div>
    </Modal>
  );
}
