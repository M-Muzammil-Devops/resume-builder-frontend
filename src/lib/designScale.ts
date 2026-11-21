/** Body text size in px for the Font size slider value (matches designSliderReadout). */
export function fontSizePx(level: number | undefined): number {
  const value = Number.isFinite(Number(level)) ? Number(level) : 2;
  return 11 + value * 0.6;
}

/**
 * BUG-504: the sheet's fixed text sizes (text-[11px], text-[12px], ...) are multiplied by this,
 * so the slider changes all resume text in the editor, preview and PDF. Default (2) = 1.
 */
export function fontScale(level: number | undefined): number {
  return Math.round((fontSizePx(level) / fontSizePx(2)) * 1000) / 1000;
}
