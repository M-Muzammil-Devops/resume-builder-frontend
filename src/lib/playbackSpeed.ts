/** Playback speed for the audio tool players (result compare + Example demo). Pure helpers, unit-tested. */
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];
export const DEFAULT_SPEED: Speed = 1;

/** "0.75×", "1×", "1.25×", "1.5×", "2×" */
export function speedLabel(rate: number): string {
  return `${rate}×`;
}

/** Next speed for arrow keys / Home / End, clamped (no wrap-around). */
export function stepSpeed(current: number, key: string): Speed {
  const i = Math.max(0, SPEEDS.indexOf(current as Speed));
  if (key === "Home") return SPEEDS[0];
  if (key === "End") return SPEEDS[SPEEDS.length - 1];
  const up = key === "ArrowRight" || key === "ArrowUp";
  const down = key === "ArrowLeft" || key === "ArrowDown";
  const j = up ? Math.min(SPEEDS.length - 1, i + 1) : down ? Math.max(0, i - 1) : i;
  return SPEEDS[j];
}

type PitchMedia = {
  playbackRate: number;
  defaultPlaybackRate: number;
  preservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
  mozPreservesPitch?: boolean;
};

/**
 * Applies a speed to a media element and keeps the voice pitch natural.
 * defaultPlaybackRate is set too, so a new `src` / `load()` keeps the speed.
 */
export function applySpeed(el: PitchMedia | null | undefined, rate: number): void {
  if (!el) return;
  el.preservesPitch = true;
  el.webkitPreservesPitch = true;
  el.mozPreservesPitch = true;
  el.defaultPlaybackRate = rate;
  if (el.playbackRate !== rate) el.playbackRate = rate;
}

/**
 * Drop zone click rule: any click opens the file picker, except clicks on (or inside) an element
 * marked `data-no-pick` (the remove button, login links, the hidden input itself).
 */
export function shouldOpenPicker(target: { closest?: (sel: string) => unknown } | null, busy: boolean): boolean {
  if (busy || !target) return false;
  if (typeof target.closest === "function" && target.closest("[data-no-pick]")) return false;
  return true;
}
