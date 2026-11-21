"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpDown,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import type { SectionSettings, SectionType } from "@/shared";
import { defaultSectionSettings } from "@/shared";
import { sectionItemIds, selectAddedItem } from "@/lib/selectAddedItem";
import { useEditorStore } from "@/store/editorStore";

/**
 * Section-head toolbar (click section title / empty section area).
 * Gear shows ONLY "Uppercase Titles" — field toggles live on EntryToolbar.
 */
export function SectionToolbar({
  sectionId,
  sectionType,
  settings,
  canAddItem,
  variant = "full",
}: {
  sectionId: string;
  sectionType: SectionType;
  settings?: SectionSettings;
  canAddItem: boolean;
  onIconPick?: (icon: string) => void;
  selectedIcon?: string;
  variant?: "full" | "summary";
}) {
  const removeSection = useEditorStore((s) => s.removeSection);
  const setModal = useEditorStore((s) => s.setModal);
  const addItem = useEditorStore((s) => s.addItem);
  const updateSection = useEditorStore((s) => s.updateSection);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = { ...defaultSectionSettings(sectionType), ...settings };
  const isSkills = sectionType === "skills";
  const isSummary = variant === "summary";
  const uppercaseOn = current.uppercaseTitles !== false;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggleUppercase() {
    updateSection(sectionId, (s) => {
      const base = defaultSectionSettings(s.type);
      const prev =
        "settings" in s && s.settings ? { ...base, ...s.settings } : base;
      const nextOn = !(prev.uppercaseTitles !== false);
      return {
        ...s,
        settings: { ...prev, uppercaseTitles: nextOn },
      } as typeof s;
    });
  }

  function addSkillGroup() {
    updateSection(sectionId, (s) => {
      if (s.type !== "skills") return s;
      return {
        ...s,
        categories: [
          ...s.categories,
          {
            id: `cat_${Math.random().toString(36).slice(2, 8)}`,
            name: "Group",
            skills: ["Your skill"],
          },
        ],
      };
    });
  }

  return (
    <div
      ref={ref}
      className="rb-toolbar absolute -top-9 left-1/2 z-50 flex -translate-x-1/2 items-center gap-px rounded-lg border border-[#e4e7ec] bg-white px-0.5 py-0.5 shadow-md"
      onClick={(e) => e.stopPropagation()}
    >
      {(canAddItem || isSummary) && (
        <button
          type="button"
          onClick={() => {
            if (isSummary) setModal("addSection");
            else {
              const before = sectionItemIds(sectionId);
              addItem(sectionId);
              selectAddedItem(sectionId, before);
            }
          }}
          className="rb-toolbar-btn-primary inline-flex cursor-pointer items-center gap-0.5 rounded-md bg-[#5aaa7a] px-1.5 py-1 text-[10px] font-semibold text-white"
        >
          <Plus size={10} /> {isSkills ? "Skill" : "Entry"}
        </button>
      )}
      {isSkills && !isSummary && (
        <button
          type="button"
          onClick={addSkillGroup}
          className="rb-toolbar-btn-primary inline-flex cursor-pointer items-center gap-0.5 rounded-md bg-[#6b5b95] px-1.5 py-1 text-[10px] font-semibold text-white"
        >
          <Plus size={10} /> Group
        </button>
      )}
      <button
        type="button"
        title="Delete section"
        aria-label="Delete section"
        onClick={() => {
          if (confirm("Remove this section?")) removeSection(sectionId);
        }}
        className="rb-toolbar-btn rounded p-1 text-[#5a6470] hover:text-rose-500"
      >
        <Trash2 size={12} />
      </button>
      {!isSummary && (
        <button
          type="button"
          title="Move section"
          aria-label="Move section"
          onClick={() => setModal("rearrange")}
          className="rb-toolbar-btn rounded p-1 text-[#5a6470] hover:text-[var(--rb-teal-dark)]"
        >
          <ArrowUpDown size={12} />
        </button>
      )}
      {!isSummary && (
        <button
          type="button"
          title="Section settings"
          aria-label="Section settings"
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            "rb-toolbar-btn rounded p-1",
            open ? "text-[var(--rb-teal)]" : "text-[#5a6470] hover:text-[var(--rb-teal-dark)]"
          )}
        >
          <Settings size={12} />
        </button>
      )}

      {open && !isSummary && (
        <div className="rb-pop absolute left-1/2 top-full z-40 mt-2 w-52 -translate-x-1/2 rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-xl">
          <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#e4e7ec] bg-white" />
          <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[#f5f6f8]">
            <span className="text-[13px] text-[#3a414a]">Uppercase Titles</span>
            <button
              type="button"
              role="switch"
              aria-checked={uppercaseOn}
              onClick={toggleUppercase}
              className={clsx(
                "relative h-5 w-9 rounded-full transition",
                uppercaseOn ? "bg-[#5aaa7a]" : "bg-[#cfd4db]"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                  uppercaseOn ? "left-4" : "left-0.5"
                )}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
