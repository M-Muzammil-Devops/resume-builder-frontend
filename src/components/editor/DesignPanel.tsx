"use client";

import { useEffect, useState } from "react";
import { COLOR_PAIRS, DEFAULT_DESIGN, FONT_OPTIONS, type ColumnLayout } from "@/shared";
import { Check, X } from "lucide-react";
import clsx from "clsx";
import { useEditorStore } from "@/store/editorStore";
import {
  contrastRatioOnWhite,
  designSliderReadout,
  failsWcagAaOnWhite,
  normalizeHex,
} from "@/lib/phase4Logic";

import { fontStack } from "@/lib/fontStack";
const LAYOUTS: { id: ColumnLayout; label: string }[] = [
  { id: "single", label: "Single" },
  { id: "wide-left", label: "Wide left" },
  { id: "equal", label: "Equal" },
  { id: "wide-right", label: "Wide right" },
];

const BACKGROUNDS = [
  { id: "white", label: "White" },
  { id: "soft-gray", label: "Soft gray" },
  { id: "mint", label: "Mint" },
  { id: "warm", label: "Warm" },
];

function ColorUsageGuide({ ink, accent }: { ink: string; accent: string }) {
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 text-[10px] leading-snug text-slate-600">
      <div className="text-[11px] font-semibold text-slate-700">Where colors apply</div>
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
          style={{ background: ink }}
        />
        <span>
          <strong className="text-slate-800">Primary</strong> — name, section titles
          (SUMMARY / EXPERIENCE), underlines, job titles, degree, achievement titles, body
        </span>
      </div>
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
          style={{ background: accent }}
        />
        <span>
          <strong className="text-slate-800">Secondary</strong> — role under name, contact
          icons, company &amp; school names, language bars, achievement icons
        </span>
      </div>
    </div>
  );
}

function CustomColorPicker({
  ink,
  accent,
  onInk,
  onAccent,
}: {
  ink: string;
  accent: string;
  onInk: (v: string) => void;
  onAccent: (v: string) => void;
}) {
  const [tab, setTab] = useState<"primary" | "secondary">("primary");
  const value = tab === "primary" ? ink : accent;
  const setValue = tab === "primary" ? onInk : onAccent;
  const [draft, setDraft] = useState(value.toUpperCase());
  const [hexError, setHexError] = useState<string | null>(null);
  useEffect(() => setDraft(value.toUpperCase()), [value]);
  const activeRatio = contrastRatioOnWhite(value);
  const activeFails = failsWcagAaOnWhite(value);

  function applyDraft(raw: string) {
    const hex = normalizeHex(raw);
    if (!hex) {
      setHexError("Use a color like #0A0A0A or #0A0");
      return;
    }
    setHexError(null);
    setValue(hex);
    setDraft(hex);
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 p-2.5">
      <div className="mb-2 text-[11px] font-semibold text-slate-600">Custom color</div>
      <div className="mb-2 flex rounded-lg bg-slate-100 p-0.5">
        <button
          type="button"
          onClick={() => setTab("primary")}
          className={clsx(
            "flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition",
            tab === "primary" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"
          )}
        >
          Primary
        </button>
        <button
          type="button"
          onClick={() => setTab("secondary")}
          className={clsx(
            "flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition",
            tab === "secondary" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"
          )}
        >
          Secondary
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Pick color"
          value={(normalizeHex(value) ?? "#343334").toLowerCase()}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-slate-200"
        />
        <input
          type="text"
          value={draft}
          aria-label="Hex color"
          maxLength={7}
          onChange={(e) => {
            setHexError(null);
            setDraft(e.target.value.toUpperCase().slice(0, 7));
          }}
          onBlur={() => applyDraft(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyDraft(draft);
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 font-mono text-[12px] uppercase outline-none focus:border-teal-500"
          spellCheck={false}
        />
      </div>
      {hexError && (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-600">
          {hexError}
        </p>
      )}
      {activeFails && activeRatio != null && (
        <p
          role="alert"
          className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold leading-snug text-amber-900"
        >
          {tab === "primary" ? "Primary" : "Secondary"} contrast {activeRatio.toFixed(1)}:1 on white is below WCAG AA (4.5:1). Text may be hard to read.
        </p>
      )}
    </div>
  );
}

export function DesignPanel() {
  const document = useEditorStore((s) => s.document);
  const updateDesign = useEditorStore((s) => s.updateDesign);
  const setActivePanel = useEditorStore((s) => s.setActivePanel);

  if (!document) return null;
  const d = document.design;
  const ink = d.inkColor || "#343334";

  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-white">
      <div className="relative flex items-center justify-center border-b border-[#eceef1] px-4 py-3.5">
        <div className="text-[15px] font-semibold text-[#3a414a]">Design & Font</div>
        <button
          type="button"
          aria-label="Close design panel"
          onClick={() => setActivePanel(null)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9aa3ad] hover:bg-[#f1f3f5] hover:text-[#4b5563]"
        >
          <X size={18} />
        </button>
      </div>
      <div className="rb-scroll flex-1 space-y-6 overflow-y-auto p-4 text-sm">
        <section>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Colors
          </h3>
          <p className="mb-2.5 text-[11px] leading-snug text-slate-500">
            Outer = Primary · Inner = Secondary
          </p>
          <div className="grid grid-cols-5 gap-2.5">
            {COLOR_PAIRS.map((pair) => {
              const selected =
                d.accentColor.toLowerCase() === pair.accent.toLowerCase() &&
                ink.toLowerCase() === pair.ink.toLowerCase();
              return (
                <button
                  key={pair.id}
                  type="button"
                  title={pair.label}
                  onClick={() =>
                    updateDesign({ accentColor: pair.accent, inkColor: pair.ink })
                  }
                  className={clsx(
                    "relative mx-auto flex h-10 w-10 items-center justify-center rounded-full transition",
                    selected
                      ? "ring-2 ring-slate-900 ring-offset-2"
                      : "hover:scale-105"
                  )}
                  aria-label={pair.label}
                  aria-pressed={selected}
                >
                  {/* Half/half pair: Primary (ink) | Secondary (accent) */}
                  <span
                    className="absolute inset-0 overflow-hidden rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${pair.ink} 50%, ${pair.accent} 50%)`,
                    }}
                  />
                  {selected && (
                    <Check
                      size={14}
                      strokeWidth={3}
                      className="relative z-[1] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.65)]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <ColorUsageGuide ink={ink} accent={d.accentColor} />

          <CustomColorPicker
            ink={ink}
            accent={d.accentColor}
            onInk={(inkColor) => updateDesign({ inkColor })}
            onAccent={(accentColor) => updateDesign({ accentColor })}
          />
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-slate-800">Font</h3>
          <div className="grid grid-cols-2 gap-2">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => updateDesign({ fontFamily: font.id })}
                className={clsx(
                  "rounded-lg border px-2 py-2 text-left",
                  d.fontFamily === font.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-200 hover:border-teal-300"
                )}
                style={{ fontFamily: fontStack(font.id) }}
              >
                <div className="text-xs font-semibold">{font.label}</div>
                {"note" in font && font.note && (
                  <div className="text-[10px] text-slate-400">{font.note}</div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Spacing</h3>
            <button
              type="button"
              className="text-xs font-semibold text-teal-700"
              onClick={() =>
                updateDesign({
                  fontSize: DEFAULT_DESIGN.fontSize,
                  lineHeight: DEFAULT_DESIGN.lineHeight,
                  pageMargins: DEFAULT_DESIGN.pageMargins,
                  sectionSpacing: DEFAULT_DESIGN.sectionSpacing,
                })
              }
            >
              Reset
            </button>
          </div>
          {(
            [
              ["fontSize", "Font size", d.fontSize, designSliderReadout("fontSize", d.fontSize)],
              ["lineHeight", "Line height", d.lineHeight, designSliderReadout("lineHeight", d.lineHeight)],
              ["pageMargins", "Page margins", d.pageMargins, designSliderReadout("pageMargins", d.pageMargins)],
              ["sectionSpacing", "Section spacing", d.sectionSpacing, designSliderReadout("sectionSpacing", d.sectionSpacing)],
            ] as const
          ).map(([key, label, value, unit]) => (
            <label key={key} className="block">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>{label}</span>
                <span>{unit}</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                value={value}
                aria-label={label}
                onChange={(e) => updateDesign({ [key]: Number(e.target.value) })}
                className="w-full accent-teal-600"
              />
            </label>
          ))}
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-slate-800">Column layout</h3>
          <div className="grid grid-cols-2 gap-2">
            {LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                onClick={() => updateDesign({ columnLayout: layout.id })}
                className={clsx(
                  "rounded-lg border px-3 py-2 text-xs font-semibold",
                  d.columnLayout === layout.id
                    ? "border-teal-500 bg-teal-50 text-teal-800"
                    : "border-slate-200 text-slate-600"
                )}
              >
                {layout.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-slate-800">Background</h3>
          <div className="grid grid-cols-2 gap-2">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => updateDesign({ background: bg.id })}
                className={clsx(
                  "rounded-lg border px-3 py-2 text-xs font-semibold",
                  d.background === bg.id
                    ? "border-teal-500 bg-teal-50 text-teal-800"
                    : "border-slate-200 text-slate-600"
                )}
              >
                {bg.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-slate-800">Page size</h3>
          <div className="flex gap-2">
            {(["A4", "US Letter"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updateDesign({ pageSize: size })}
                className={clsx(
                  "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold",
                  d.pageSize === size
                    ? "border-teal-500 bg-teal-50 text-teal-800"
                    : "border-slate-200 text-slate-600"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </section>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3">
          <div>
            <div className="font-semibold text-slate-800">Show branding</div>
            <div className="text-xs text-slate-500">“Made with ResumeBuilder” footer</div>
          </div>
          <input
            type="checkbox"
            checked={d.showBranding}
            onChange={(e) => updateDesign({ showBranding: e.target.checked })}
            className="h-4 w-4 accent-teal-600"
          />
        </label>
      </div>
    </aside>
  );
}
