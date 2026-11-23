"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_EVENT, applyTheme, currentTheme, type Theme } from "@/lib/theme";
import s from "./ThemeToggle.module.css";

/** Sun/moon button. The icon cross-fades and rotates; the page colours transition briefly. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    const frame = requestAnimationFrame(sync);
    window.addEventListener(THEME_EVENT, sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(THEME_EVENT, sync);
    };
  }, []);

  const light = theme === "light";
  const label = light ? "Switch to night mode" : "Switch to day mode";
  return (
    <button
      type="button"
      className={[s.toggle, light ? s.isLight : "", className].filter(Boolean).join(" ")}
      aria-label={label}
      title={label}
      aria-pressed={light}
      onClick={() => applyTheme(light ? "dark" : "light", { animate: true })}
    >
      <Sun size={18} aria-hidden="true" className={`${s.icon} ${s.sun}`} />
      <Moon size={18} aria-hidden="true" className={`${s.icon} ${s.moon}`} />
    </button>
  );
}
