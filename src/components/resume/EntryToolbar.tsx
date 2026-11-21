"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
  Trash2,
  Type,
} from "lucide-react";
import clsx from "clsx";
import type { SectionSettings, SectionType } from "@/shared";
import { defaultSectionSettings } from "@/shared";
import { IconGlyph, IconPicker } from "@/components/resume/IconPicker";
import { requestTypographyFormat } from "@/lib/typography";
import { sectionItemIds, selectAddedItem } from "@/lib/selectAddedItem";
import { useEditorStore } from "@/store/editorStore";

const LABELS: Partial<Record<keyof SectionSettings, string>> = {
  title: "Title",
  subtitle: "Company Name",
  institution: "Institution",
  location: "Location",
  datePeriod: "Date Period",
  bullets: "Bullets",
  description: "Description",
  gpa: "GPA",
  link: "Link",
  logo: "Company Logo",
  groupName: "Group Name",
  skillBorder: "Skill Border",
  icons: "Icons",
  username: "Username",
};

function settingsKeysFor(type: SectionType): (keyof SectionSettings)[] {
  switch (type) {
    case "education":
      return ["title", "institution", "location", "datePeriod", "bullets", "gpa", "logo"];
    case "experience":
      return [
        "title",
        "subtitle",
        "description",
        "bullets",
        "location",
        "datePeriod",
        "link",
        "logo",
      ];
    case "projects":
      return ["title", "description", "bullets", "location", "datePeriod", "link"];
    case "volunteering":
    case "custom":
      return ["title", "subtitle", "location", "datePeriod", "description", "link"];
    case "certifications":
      return ["title", "subtitle", "datePeriod", "link"];
    case "achievements":
    case "strengths":
      return ["title", "description", "icons"];
    case "awards":
      return ["title", "subtitle", "datePeriod", "icons"];
    case "interests":
      return ["description", "icons"];
    case "online":
      return ["icons", "username"];
    case "languages":
      return ["title", "subtitle", "description"];
    case "skills":
      return ["groupName", "skillBorder"];
    default:
      return ["title", "description"];
  }
}

function labelFor(type: SectionType, key: keyof SectionSettings): string {
  if (type === "certifications") {
    if (key === "title") return "Name";
    if (key === "subtitle") return "Issuer";
  }
  if (type === "languages") {
    if (key === "title") return "Language";
    if (key === "subtitle") return "Level";
    if (key === "description") return "Proficiency bar";
  }
  if (type === "education") {
    if (key === "title") return "Degree";
    if (key === "logo") return "Institution Logo";
  }
  if (type === "awards") {
    if (key === "title") return "Award Name";
    if (key === "subtitle") return "Issuer";
    if (key === "datePeriod") return "Date";
  }
  if (type === "experience" && key === "title") return "Title";
  if (type === "experience" && key === "subtitle") return "Company Name";
  if (type === "experience" && key === "logo") return "Company Logo";
  return LABELS[key] ?? key;
}

/** Per-entry / sub-section toolbar — gear shows field visibility settings. */
export function EntryToolbar({
  sectionId,
  itemId,
  sectionType,
  settings,
  onIconPick,
  selectedIcon,
  iconVariant = "general",
}: {
  sectionId: string;
  itemId: string;
  sectionType: SectionType;
  settings?: SectionSettings;
  onIconPick?: (icon: string) => void;
  selectedIcon?: string;
  iconVariant?: "general" | "social";
}) {
  const addItem = useEditorStore((s) => s.addItem);
  const removeItem = useEditorStore((s) => s.removeItem);
  const moveItem = useEditorStore((s) => s.moveItem);
  const updateSection = useEditorStore((s) => s.updateSection);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = { ...defaultSectionSettings(sectionType), ...settings };
  const keys = settingsKeysFor(sectionType);
  const isSkills = sectionType === "skills";
  const isOnline = sectionType === "online";
  const isLanguages = sectionType === "languages";
  const showIconPicker =
    Boolean(onIconPick) &&
    (sectionType === "achievements" ||
      sectionType === "strengths" ||
      sectionType === "awards" ||
      sectionType === "online" ||
      sectionType === "interests");


  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setIconsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function patchSettings(patch: Partial<SectionSettings>) {
    updateSection(sectionId, (s) => {
      const base = defaultSectionSettings(s.type);
      const prev =
        "settings" in s && s.settings ? { ...base, ...s.settings } : base;
      return { ...s, settings: { ...prev, ...patch } } as typeof s;
    });
  }

  function toggle(key: keyof SectionSettings) {
    updateSection(sectionId, (s) => {
      const base = defaultSectionSettings(s.type);
      const prev =
        "settings" in s && s.settings ? { ...base, ...s.settings } : base;
      const nextVal = !prev[key];
      const next = { ...prev, [key]: nextVal };
      if (s.type === "education" && key === "gpa" && nextVal) {
        return {
          ...s,
          settings: next,
          items: s.items.map((it) => ({ ...it, gpa: it.gpa ?? "" })),
        };
      }
      return { ...s, settings: next } as typeof s;
    });
  }

  function addSkillGroup() {
    const id = `sk_${Math.random().toString(36).slice(2, 9)}`;
    updateSection(sectionId, (s) => {
      if (s.type !== "skills") return s;
      return {
        ...s,
        categories: [
          ...s.categories,
          {
            id,
            name: "Group",
            skills: ["Your skill"],
          },
        ],
      };
    });
    useEditorStore.setState({
      selectedSectionId: sectionId,
      selectedItemId: id,
    });
  }

  const skillsLayout = current.skillsLayout || "tags";
  const skillBorderOn = current.skillBorder !== false;
  const groupNameOn = current.groupName !== false;
  const langProficiencyOn = current.subtitle !== false;
  const langSliderOn = current.description !== false;
  const langSliderStyle = current.languageSliderStyle || "bars";

  return (
    <div
      ref={ref}
      className="rb-toolbar absolute -top-9 left-1/2 z-50 flex -translate-x-1/2 items-center gap-px rounded-lg border border-[#e4e7ec] bg-white px-0.5 py-0.5 shadow-md"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          const before = sectionItemIds(sectionId);
          addItem(sectionId, isSkills ? itemId : undefined);
          if (!isSkills) selectAddedItem(sectionId, before);
        }}
        className="rb-toolbar-btn-primary inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap rounded-md bg-[#5aaa7a] px-1.5 py-1 text-[10px] font-semibold text-white"
      >
        <Plus size={10} /> {isSkills ? "Skill" : "Entry"}
      </button>
      {isSkills && (
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
        title="Move up"
        aria-label="Move up"
        onClick={() => moveItem(sectionId, itemId, -1)}
        className="rb-toolbar-btn rounded p-1 text-[#5a6470] hover:text-[var(--rb-teal-dark)]"
      >
        <ChevronUp size={12} />
      </button>
      <button
        type="button"
        title="Move down"
        aria-label="Move down"
        onClick={() => moveItem(sectionId, itemId, 1)}
        className="rb-toolbar-btn rounded p-1 text-[#5a6470] hover:text-[var(--rb-teal-dark)]"
      >
        <ChevronDown size={12} />
      </button>
      {!isSkills && !isOnline && !isLanguages && (
        <button
          type="button"
          title="Typography"
          aria-label="Typography"
          onClick={() => requestTypographyFormat()}
          className="rb-toolbar-btn rounded p-1 text-[#5a6470] hover:text-[var(--rb-teal)]"
        >
          <Type size={12} />
        </button>
      )}
      {!isSkills && !isOnline && !isLanguages && keys.includes("datePeriod") && (
        <button
          type="button"
          title="Date fields"
          aria-label="Date fields"
          onClick={() => toggle("datePeriod")}
          className="rb-toolbar-btn rounded p-1 text-[#5a6470] hover:text-[var(--rb-teal)]"
        >
          <CalendarDays size={12} />
        </button>
      )}
      {showIconPicker && (
        <div className="relative">
          <button
            type="button"
            title="Icons"
            aria-label="Icons"
            onClick={() => {
              setIconsOpen((v) => !v);
              setOpen(false);
            }}
            className={clsx(
              "rb-toolbar-btn flex h-7 w-7 items-center justify-center rounded-md",
              iconsOpen
                ? "bg-[#e8f3ec] text-[#5aaa7a]"
                : "text-[var(--rb-teal)] hover:bg-[#e8f3ec]"
            )}
          >
            <IconGlyph id={selectedIcon || (isOnline ? "globe" : "diamond")} size={14} />
          </button>
          {iconsOpen && onIconPick && (
            <IconPicker
              value={selectedIcon}
              onChange={onIconPick}
              onClose={() => setIconsOpen(false)}
              variant={iconVariant}
            />
          )}
        </div>
      )}
      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rb-delete-entry-title"
          className="absolute left-1/2 top-full z-[80] mt-2 w-56 -translate-x-1/2 rounded-xl border border-[#e4e7ec] bg-white p-3 shadow-xl"
          onKeyDown={(e) => {
            if (e.key === "Escape") setConfirming(false);
          }}
        >
          <p id="rb-delete-entry-title" className="text-[13px] font-semibold text-[#3a414a]">
            {isSkills ? "Remove this group?" : "Remove this entry?"}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="rounded-md px-2 py-1 text-[12px]" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button
              type="button"
              autoFocus
              className="rounded-md bg-rose-600 px-2 py-1 text-[12px] font-semibold text-white"
              onClick={() => {
                setConfirming(false);
                removeItem(sectionId, itemId);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        title={isSkills ? "Delete group" : "Delete entry"}
        aria-label={isSkills ? "Delete group" : "Delete entry"}
        onClick={() => setConfirming(true)}
        className="rb-toolbar-btn rounded p-1 text-[#5a6470] hover:text-rose-500"
      >
        <Trash2 size={12} />
      </button>
      <button
        type="button"
        title="Entry settings"
        aria-label="Entry settings"
        onClick={() => {
          setOpen((v) => !v);
          setIconsOpen(false);
        }}
        className={clsx(
          "rb-toolbar-btn rounded p-1",
          open ? "text-[var(--rb-teal)]" : "text-[#5a6470] hover:text-[var(--rb-teal-dark)]"
        )}
      >
        <Settings size={12} />
      </button>

      {open && isSkills && (
        <div className="rb-pop absolute left-1/2 top-full z-50 mt-2 w-[220px] -translate-x-1/2 rounded-xl border border-[#e4e7ec] bg-white p-2.5 shadow-xl">
          <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#e4e7ec] bg-white" />

          <div className="flex items-center justify-between rounded-lg px-1.5 py-1.5">
            <span className="text-[13px] text-[#3a414a]">Group Name</span>
            <button
              type="button"
              role="switch"
              aria-checked={groupNameOn}
              onClick={() => patchSettings({ groupName: !groupNameOn })}
              className={clsx(
                "relative h-5 w-9 rounded-full transition",
                groupNameOn ? "bg-[#5aaa7a]" : "bg-[#cfd4db]"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                  groupNameOn ? "left-4" : "left-0.5"
                )}
              />
            </button>
          </div>

          <div className="mt-1 border-t border-[#eceef1] px-1.5 pt-2">
            <div className="mb-1.5 text-[12px] font-semibold text-[#3a414a]">
              Skills Layout
            </div>
            <div className="space-y-1">
              {(
                [
                  ["tags", "Tags"],
                  ["list", "List"],
                  ["bullets", "Bullets"],
                ] as const
              ).map(([value, label]) => {
                const active = skillsLayout === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => patchSettings({ skillsLayout: value })}
                    className="flex w-full items-center gap-2 rounded-lg px-0.5 py-1 text-left hover:bg-[#f5f6f8]"
                  >
                    <span
                      className={clsx(
                        "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-2 transition",
                        active
                          ? "border-[#5aaa7a]"
                          : "border-[#c5cad3]"
                      )}
                    >
                      {active && (
                        <span className="h-2 w-2 rounded-full bg-[#5aaa7a]" />
                      )}
                    </span>
                    <span className="text-[13px] text-[#3a414a]">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-[#eceef1] px-1.5 pt-2.5">
            <span className="text-[13px] text-[#3a414a]">Border style</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="No border"
                aria-label="No border"
                aria-pressed={!skillBorderOn}
                onClick={() => patchSettings({ skillBorder: false })}
                className={clsx(
                  "h-5 w-5 rounded-full border-2 transition",
                  !skillBorderOn
                    ? "border-[#5aaa7a] bg-[#e8f3ec]"
                    : "border-[#c5cad3] bg-[#e8eaee] hover:border-[#9aa3ad]"
                )}
              />
              <button
                type="button"
                title="With border"
                aria-label="With border"
                aria-pressed={skillBorderOn}
                onClick={() => patchSettings({ skillBorder: true })}
                className={clsx(
                  "h-5 w-5 rounded-full border-2 transition",
                  skillBorderOn
                    ? "border-[#5aaa7a] bg-[#5aaa7a]"
                    : "border-[#c5cad3] bg-[#5aaa7a]/70 hover:border-[#9aa3ad]"
                )}
              />
            </div>
          </div>
        </div>
      )}

      {open && isLanguages && (
        <div className="rb-pop absolute left-1/2 top-full z-50 mt-2 w-[220px] -translate-x-1/2 rounded-xl border border-[#e4e7ec] bg-white p-2.5 shadow-xl">
          <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#e4e7ec] bg-white" />

          <div className="flex items-center justify-between rounded-lg px-1.5 py-1.5">
            <span className="text-[13px] text-[#3a414a]">Proficiency</span>
            <button
              type="button"
              role="switch"
              aria-checked={langProficiencyOn}
              onClick={() => patchSettings({ subtitle: !langProficiencyOn })}
              className={clsx(
                "relative h-5 w-9 rounded-full transition",
                langProficiencyOn ? "bg-[#5aaa7a]" : "bg-[#cfd4db]"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                  langProficiencyOn ? "left-4" : "left-0.5"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg px-1.5 py-1.5">
            <span className="text-[13px] text-[#3a414a]">Slider</span>
            <button
              type="button"
              role="switch"
              aria-checked={langSliderOn}
              onClick={() => patchSettings({ description: !langSliderOn })}
              className={clsx(
                "relative h-5 w-9 rounded-full transition",
                langSliderOn ? "bg-[#5aaa7a]" : "bg-[#cfd4db]"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                  langSliderOn ? "left-4" : "left-0.5"
                )}
              />
            </button>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-[#eceef1] px-1.5 pt-2.5">
            <span className="text-[13px] text-[#3a414a]">Slider Style</span>
            <div className="flex items-center gap-1.5">
              {(
                [
                  "bars",
                  "dots",
                  "squares",
                  "line",
                  "pills",
                ] as const
              ).map((style) => {
                const active = langSliderStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    title={style}
                    aria-pressed={active}
                    onClick={() => patchSettings({ languageSliderStyle: style })}
                    className={clsx(
                      "h-3.5 w-3.5 rounded-full border transition",
                      active
                        ? "border-[#5aaa7a] bg-[#5aaa7a]"
                        : "border-[#d0d5dd] bg-[#e8eaee] hover:border-[#9aa3ad]"
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {open && !isSkills && !isLanguages && (
        <div className="rb-pop absolute left-1/2 top-full z-50 mt-2 w-52 -translate-x-1/2 rounded-xl border border-[#e4e7ec] bg-white p-2 shadow-xl">
          <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#e4e7ec] bg-white" />
          {keys.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[#f5f6f8]"
            >
              <span className="text-[13px] text-[#3a414a]">
                {labelFor(sectionType, key)}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={current[key] !== false}
                onClick={() => toggle(key)}
                className={clsx(
                  "relative h-5 w-9 rounded-full transition",
                  current[key] !== false ? "bg-[#5aaa7a]" : "bg-[#cfd4db]"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                    current[key] !== false ? "left-4" : "left-0.5"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
