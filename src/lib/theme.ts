/** Day/Night theme. public/theme-init.js sets <html data-theme> before paint; this keeps it in sync. */
export type Theme = "light" | "dark";
export const THEME_KEY = "rb_theme";
export const THEME_EVENT = "rb-theme-change";

export function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme, opts: { animate?: boolean } = {}) {
  const root = document.documentElement;
  if (opts.animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("rb-theme-anim");
    window.setTimeout(() => root.classList.remove("rb-theme-anim"), 450);
  }
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}
