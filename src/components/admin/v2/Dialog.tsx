"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { cx } from "./format";
import s from "./AdminV2.module.css";

export type DialogChoice = { id: string; label: string; tone?: "danger" | "primary"; /** User must type this text first. */ confirmText?: string };

/** Centered confirm dialog. Choices are buttons; a choice with confirmText is enabled once that text is typed. */
export function ConfirmDialog({
  title,
  children,
  choices,
  busy,
  onChoose,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  choices: DialogChoice[];
  busy?: boolean;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEscapeClose(onClose, !busy);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("input, button:not([data-close])")?.focus();
  }, []);
  const gate = choices.find((c) => c.confirmText)?.confirmText;
  return (
    <div className={s.modalBack} role="presentation" onClick={() => !busy && onClose()}>
      <div ref={box} className={s.modal} role="alertdialog" aria-modal="true" aria-labelledby="v2-dialog-title" onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <span className={s.modalIco} aria-hidden="true"><AlertTriangle size={16} /></span>
          <h3 id="v2-dialog-title">{title}</h3>
          <button type="button" data-close className={s.icoBtn} onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        <div className={s.modalBody}>{children}</div>
        {gate && (
          <div className={s.fl}>
            <label htmlFor="v2-dialog-confirm">Type <b className={s.code}>{gate}</b> to enable permanent delete</label>
            <input id="v2-dialog-confirm" className={s.input} value={typed} autoComplete="off" spellCheck={false} onChange={(e) => setTyped(e.target.value)} />
          </div>
        )}
        <div className={s.modalActs}>
          <button type="button" className={s.btn} onClick={onClose} disabled={busy}>Cancel</button>
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cx(s.btn, c.tone === "primary" && s.primary, c.tone === "danger" && s.dangerFill)}
              disabled={busy || (c.confirmText ? typed.trim() !== c.confirmText : false)}
              onClick={() => onChoose(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export type ToastMsg = { kind: "ok" | "err"; text: string } | null;

/** Small toast at the bottom-right (bottom-center on phones); hides itself after 4 s. */
export function Toast({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div className={cx(s.toast, msg.kind === "ok" ? s.toastOk : s.toastErr)} role={msg.kind === "ok" ? "status" : "alert"} aria-live="polite">
      {msg.kind === "ok" ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
      <span>{msg.text}</span>
      <button type="button" className={s.toastX} onClick={onDone} aria-label="Dismiss"><X size={14} /></button>
    </div>
  );
}
