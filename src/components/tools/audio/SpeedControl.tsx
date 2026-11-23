"use client";

import { type KeyboardEvent, useId } from "react";
import { SPEEDS, speedLabel, stepSpeed, type Speed } from "@/lib/playbackSpeed";
import s from "./AudioTool.module.css";

/**
 * Compact playback-speed pill (0.75× … 2×). A radio group with a roving tab stop:
 * Tab focuses the current speed, ←/→ (↑/↓, Home/End) change it. CSS module only (strict CSP).
 */
export function SpeedControl({ value, onChange, label = "Playback speed" }: { value: Speed; onChange: (v: Speed) => void; label?: string }) {
  const id = useId();
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = stepSpeed(value, event.key);
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-speed="${next}"]`)?.focus();
  }
  return (
    <div className={s.speed}>
      <span className={s.speedLbl} id={id} aria-hidden="true">
        Speed
      </span>
      <div className={s.speedSeg} role="radiogroup" aria-label={label} onKeyDown={onKey}>
        {SPEEDS.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            data-speed={v}
            aria-checked={value === v}
            tabIndex={value === v ? 0 : -1}
            className={value === v ? s.on : undefined}
            onClick={() => onChange(v)}
          >
            {speedLabel(v)}
          </button>
        ))}
      </div>
    </div>
  );
}
