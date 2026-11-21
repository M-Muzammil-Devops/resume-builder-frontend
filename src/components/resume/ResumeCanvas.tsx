"use client";

import { PAPER_COLORS } from "@/lib/paper";
import { FieldSectionCtx } from "./fieldContext";
import { fontScale } from "@/lib/designScale";
import { linkHrefFromText } from "@/lib/linkHref";
import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  Award,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  FilePlus2,
  GraduationCap,
  Lightbulb,
  Link2,
  MapPin,
  Plus,
  Trash2,
  User,
  Globe2,
  Sparkles,
  FolderKanban,
  Heart,
} from "lucide-react";
import type {
  HeaderSection,
  ResumeDesign,
  ResumeSection,
  SectionSettings,
  SectionType,
} from "@/shared";
import { defaultSectionSettings } from "@/shared";
import { EditableText } from "@/components/resume/EditableText";
import { LocationAutocomplete } from "@/components/resume/LocationAutocomplete";
import { DateRangePicker } from "@/components/resume/DateRangePicker";
import { clearSkillFocus, markSkillFocus, skillShouldFocus } from "@/lib/focusQueue";
import { isPlaceholder, sectionIsEmpty } from "@/lib/placeholders";
import { isBlankText, jobOverlaps, textDirection } from "@/lib/phase4Logic";
import { sectionItemIds, selectAddedItem } from "@/lib/selectAddedItem";
import { SectionToolbar } from "@/components/resume/SectionToolbar";
import { EntryToolbar } from "@/components/resume/EntryToolbar";
import { HeaderBlock } from "@/components/resume/HeaderBlock";
import { IconGlyph, defaultIconForSection, suggestIconFromText } from "@/components/resume/IconPicker";
import { LinkEditPopover } from "@/components/resume/LinkEditPopover";
import { CompanyAutocomplete } from "@/components/resume/CompanyAutocomplete";
import { CompanyLogo } from "@/components/resume/CompanyLogo";
import { useEditorStore } from "@/store/editorStore";
import { useDocumentCss } from "@/hooks/useDocumentCss";

import { ReadOnlyCtx } from "./readOnlyContext";

const PAPER_BG = PAPER_COLORS;

const SECTION_ICONS: Partial<Record<SectionType, typeof User>> = {
  summary: User,
  skills: Lightbulb,
  languages: Globe2,
  certifications: Award,
  experience: Briefcase,
  education: GraduationCap,
  achievements: Sparkles,
  projects: FolderKanban,
  interests: Heart,
};

function SectionHeading({
  value,
  onChange,
  accent,
  ink,
  sectionType,
  headingStyle = "underline",
  uppercaseTitles = true,
}: {
  value: string;
  onChange: (next: string) => void;
  accent: string;
  ink: string;
  sectionType?: SectionType;
  headingStyle?: NonNullable<ResumeDesign["sectionHeadingStyle"]>;
  uppercaseTitles?: boolean;
}) {
  const Icon = sectionType ? SECTION_ICONS[sectionType] : undefined;

  if (headingStyle === "icon-line") {
    return (
      <div className="mb-1.5">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={14} strokeWidth={2} style={{ color: accent }} />}
          <EditableText
            tag="h2"
            value={value}
            onChange={onChange}
            className={clsx(
              "text-[12px] font-semibold",
              uppercaseTitles !== false && "uppercase"
            )}
            style={{ color: accent }}
          />
        </div>
        <div className="mt-1 h-px w-full" style={{ background: accent }} />
      </div>
    );
  }

  // Default: ink for titles + underlines; accent used elsewhere on the page
  return (
    <EditableText
      tag="h2"
      value={value}
      onChange={onChange}
      className={clsx(
        "mb-1.5 border-b pb-0.5 text-[11px] font-bold tracking-[0.14em]",
        uppercaseTitles !== false && "uppercase"
      )}
      style={{ color: ink, borderColor: ink }}
    />
  );
}

function ImproveField({
  sectionId,
  fieldPath,
  className,
  children,
}: {
  sectionId: string;
  fieldPath: string;
  className?: string;
  children: ReactNode;
}) {
  const improveFocus = useEditorStore((s) => s.improveFocus);
  const active =
    improveFocus?.sectionId === sectionId && improveFocus.fieldPath === fieldPath;

  return (
    <div
      data-field-path={`${sectionId}:${fieldPath}`}
      className={clsx(
        "rounded-sm transition duration-300",
        active && "bg-[#fff6d8] ring-2 ring-[#e6b800] shadow-[0_0_0_3px_rgba(230,184,0,0.18)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function getSettings(section: ResumeSection): SectionSettings {
  const base = defaultSectionSettings(section.type);
  if ("settings" in section && section.settings) {
    return { ...base, ...section.settings };
  }
  return base;
}

/** "SUMMARY" → "Summary", "KEY ACHIEVEMENTS" → "Key Achievements" */
function formatSectionAddLabel(title: string): string {
  const raw = (title || "Entry").trim();
  if (!raw) return "Entry";
  return raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Bottom pills: New Section + dynamic "+ {Section}" (Enhancv) */
function SelectionBottomBar({
  sectionTitle,
  canAddItem,
  onAddItem,
}: {
  sectionTitle: string;
  canAddItem: boolean;
  onAddItem: () => void;
}) {
  const setModal = useEditorStore((s) => s.setModal);
  const label = formatSectionAddLabel(sectionTitle);

  return (
    <div className="rb-selection-bottom absolute -bottom-3 left-1/2 z-[40] flex -translate-x-1/2 items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setModal("addSection");
        }}
        className="rb-selection-bottom-btn"
      >
        <FilePlus2 size={12} strokeWidth={2.25} />
        New Section
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (canAddItem) onAddItem();
          else setModal("addSection");
        }}
        className="rb-selection-bottom-btn"
      >
        <Plus size={12} strokeWidth={2.25} />
        {label}
      </button>
    </div>
  );
}

function SectionChrome({
  section,
  children,
  canAddItem,
  toolbarVariant = "full",
}: {
  section: ResumeSection;
  children: React.ReactNode;
  canAddItem: boolean;
  toolbarVariant?: "full" | "summary";
}) {
  const readOnly = useContext(ReadOnlyCtx);
  const selectedSectionId = useEditorStore((s) => s.selectedSectionId);
  const selectedItemId = useEditorStore((s) => s.selectedItemId);
  const addItem = useEditorStore((s) => s.addItem);
  // Section-head highlight only when no entry is selected
  const selected =
    !readOnly && selectedSectionId === section.id && !selectedItemId;
  // Bottom add pills: section head OR any entry in this section
  const showBottomAdd = !readOnly && selectedSectionId === section.id;
  const settings = getSettings(section);
  const sectionTitle =
    "title" in section && typeof section.title === "string"
      ? section.title
      : section.type;

  if (readOnly) {
    return <div className="rb-section-hit relative">{children}</div>;
  }

  return (
    <FieldSectionCtx.Provider value={sectionTitle ? `${sectionTitle} section` : ""}>
    <div
      data-section-id={section.id}
      data-selected={selected || undefined}
      className={clsx(
        "rb-section-hit relative overflow-visible rounded-md",
        selected && "z-[2]",
        showBottomAdd && !selected && "z-[1]"
      )}
      onClick={(e) => {
        e.stopPropagation();
        useEditorStore.setState({
          selectedSectionId: section.id,
          selectedItemId: null,
        });
      }}
    >
      {section.type !== "header" && selected && (
        <SectionToolbar
          sectionId={section.id}
          sectionType={section.type}
          settings={settings}
          canAddItem={canAddItem}
          variant={toolbarVariant}
        />
      )}
      {children}
      {showBottomAdd && (
        <SelectionBottomBar
          sectionTitle={sectionTitle}
          canAddItem={canAddItem}
          onAddItem={() => {
            const before = sectionItemIds(section.id);
            addItem(section.id);
            selectAddedItem(section.id, before);
          }}
        />
      )}
    </div>
    </FieldSectionCtx.Provider>
  );
}

/** Per-entry hover / select + faint dotted divider (Enhancv-style) */
function EntryChrome({
  sectionId,
  itemId,
  sectionType,
  settings,
  isLast,
  selectedIcon,
  onIconPick,
  iconVariant,
  children,
}: {
  sectionId: string;
  itemId: string;
  sectionType: SectionType;
  settings?: SectionSettings;
  isLast: boolean;
  selectedIcon?: string;
  onIconPick?: (icon: string) => void;
  iconVariant?: "general" | "social";
  children: React.ReactNode;
}) {
  const readOnly = useContext(ReadOnlyCtx);
  const selectedItemId = useEditorStore((s) => s.selectedItemId);
  const selected = !readOnly && selectedItemId === itemId;

  if (readOnly) {
    return (
      <div className={clsx("rb-entry", isLast && "rb-entry-last")}>{children}</div>
    );
  }

  return (
    <div
      data-entry-id={itemId}
      className={clsx(
        "rb-entry",
        isLast && "rb-entry-last",
        selected && "rb-entry-selected"
      )}
      onClick={(e) => {
        e.stopPropagation();
        useEditorStore.setState({
          selectedSectionId: sectionId,
          selectedItemId: itemId,
        });
      }}
    >
      {selected && (
        <EntryToolbar
          sectionId={sectionId}
          itemId={itemId}
          sectionType={sectionType}
          settings={settings}
          selectedIcon={selectedIcon}
          onIconPick={onIconPick}
          iconVariant={iconVariant}
        />
      )}
      {children}
    </div>
  );
}

function MetaDateLocation({
  startDate,
  endDate,
  location,
  showDate,
  showLocation,
  accent,
  onDateChange,
  onLocationChange,
  onDateOpenChange,
}: {
  startDate: string;
  endDate: string;
  location: string;
  showDate: boolean;
  showLocation: boolean;
  accent: string;
  onDateChange: (start: string, end: string) => void;
  onLocationChange: (location: string) => void;
  onDateOpenChange?: (open: boolean) => void;
}) {
  const readOnly = useContext(ReadOnlyCtx);
  const showLoc = showLocation && !(readOnly && isPlaceholder(location));
  const datesEmpty = isPlaceholder(startDate) && isPlaceholder(endDate);
  const showDateRow = showDate && !(readOnly && datesEmpty);
  if (!showDateRow && !showLoc) return null;
  return (
    <div className="relative z-[5] flex flex-nowrap items-center gap-x-2 text-[10px] text-slate-500">
      {showDateRow && (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
          <CalendarDays size={10} className="shrink-0 opacity-70" />
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={onDateChange}
            accent={accent}
            onOpenChange={onDateOpenChange}
            readOnly={readOnly}
          />
        </span>
      )}
      {showLoc && (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
          <MapPin size={10} className="shrink-0 opacity-70" />
          <LocationAutocomplete
            value={location === "Location" ? "" : location}
            onChange={onLocationChange}
            placeholder="Location"
            className="min-w-[72px] max-w-[140px]"
          />
        </span>
      )}
    </div>
  );
}

function ExperienceEntry({
  item,
  idx,
  sectionId,
  st,
  accent,
  updateSection,
  entryLayout = "side-meta",
  isLast = false,
  ranges,
}: {
  item: Extract<ResumeSection, { type: "experience" }>["items"][number];
  idx: number;
  sectionId: string;
  st: SectionSettings;
  accent: string;
  updateSection: (id: string, updater: (s: ResumeSection) => ResumeSection) => void;
  entryLayout?: NonNullable<ResumeDesign["entryLayout"]>;
  isLast?: boolean;
  ranges: { id: string; startDate: string; endDate: string }[];
}) {
  const readOnly = useContext(ReadOnlyCtx);
  const selectedItemId = useEditorStore((s) => s.selectedItemId);
  const [linkOpen, setLinkOpen] = useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [focusBullet, setFocusBullet] = useState<number | null>(null);
  const selected = !readOnly && selectedItemId === item.id;
  const raised = companyMenuOpen || dateOpen;
  const ink = useEditorStore((s) => s.document?.design.inkColor) || "#343334";
  const overlaps = !readOnly && jobOverlaps(ranges, item.id);

  const patch = (partial: Partial<typeof item>) =>
    updateSection(sectionId, (s) => {
      if (s.type !== "experience") return s;
      const items = [...s.items];
      items[idx] = { ...items[idx], ...partial };
      return { ...s, items };
    });

  function mutateBullets(fn: (bullets: string[]) => string[]) {
    updateSection(sectionId, (s) => {
      if (s.type !== "experience") return s;
      return {
        ...s,
        items: s.items.map((it) =>
          it.id === item.id ? { ...it, bullets: fn([...(it.bullets ?? [])]) } : it
        ),
      };
    });
  }

  return (
    <div
      data-entry-id={item.id}
      className={clsx(
        "rb-entry rb-fade-in flex gap-2",
        isLast && "rb-entry-last",
        raised ? "z-[70]" : selected ? "z-[3]" : "z-0",
        selected && "rb-entry-selected"
      )}
      onClick={(e) => {
        if (readOnly) return;
        e.stopPropagation();
        useEditorStore.setState({
          selectedSectionId: sectionId,
          selectedItemId: item.id,
        });
      }}
    >
      {selected && (
        <EntryToolbar
          sectionId={sectionId}
          itemId={item.id}
          sectionType="experience"
          settings={st}
        />
      )}
      {st.logo !== false && (
        <CompanyLogo
          className="mt-0.5"
          name={item.company}
          logoUrl={item.logoUrl}
          size={32}
          iconSize={14}
        />
      )}
      <div className="min-w-0 flex-1">
        {entryLayout === "stacked" ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2">
              {st.title !== false && (
                <EditableText
                  value={item.title}
                  placeholder="Role Title"
                  onChange={(title) => patch({ title })}
                  className="text-[13px] font-semibold"
                  style={{ color: ink }}
                />
              )}
              {st.subtitle !== false && (
                <CompanyAutocomplete
                  value={item.company}
                  accent={accent}
                  placeholder="Company Name"
                  onOpenChange={setCompanyMenuOpen}
                  onChange={(company, meta) =>
                    patch({
                      company,
                      ...(meta
                        ? {
                            logoUrl: meta.logoUrl ?? "",
                            ...(meta.website && !item.link ? { link: meta.website } : {}),
                          }
                        : {}),
                    })
                  }
                />
              )}
            </div>
            <div className="mt-0.5">
              <MetaDateLocation
                startDate={item.startDate}
                endDate={item.endDate}
                location={item.location}
                showDate={st.datePeriod !== false}
                showLocation={st.location !== false}
                accent={accent}
                onDateChange={(startDate, endDate) => patch({ startDate, endDate })}
                onLocationChange={(location) => patch({ location })}
                onDateOpenChange={setDateOpen}
              />
            </div>
          </>
        ) : (
          <>
            {st.title !== false && (
              <EditableText
                value={item.title}
                placeholder="Role Title"
                onChange={(title) => patch({ title })}
                className="text-[13px] font-semibold"
                style={{ color: ink }}
              />
            )}
            {/* Company + date + location on ONE row (Enhancv-style) */}
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              {st.subtitle !== false && (
                <CompanyAutocomplete
                  value={item.company}
                  accent={accent}
                  placeholder="Company Name"
                  onOpenChange={setCompanyMenuOpen}
                  onChange={(company, meta) =>
                    patch({
                      company,
                      ...(meta
                        ? {
                            logoUrl: meta.logoUrl ?? "",
                            ...(meta.website && !item.link ? { link: meta.website } : {}),
                          }
                        : {}),
                    })
                  }
                />
              )}
              <div className="relative ml-auto shrink-0">
                <MetaDateLocation
                  startDate={item.startDate}
                  endDate={item.endDate}
                  location={item.location}
                  showDate={st.datePeriod !== false}
                  showLocation={st.location !== false}
                  accent={accent}
                  onDateChange={(startDate, endDate) => patch({ startDate, endDate })}
                  onLocationChange={(location) => patch({ location })}
                  onDateOpenChange={setDateOpen}
                />
              </div>
            </div>
          </>
        )}
        {overlaps && !readOnly && (
          <p role="status" className="rb-editor-only mt-1 text-[10px] font-semibold text-amber-700">
            Overlaps another job.
          </p>
        )}
        {st.link !== false && item.link && readOnly ? (
          <a
            href={linkHrefFromText(item.link) || undefined}
            className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500 underline"
          >
            {item.link.replace(/^https?:\/\//, "")}
          </a>
        ) : null}
        {st.link !== false && !readOnly && (
          <div className="relative mt-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLinkOpen((v) => !v);
              }}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 underline"
            >
              <Link2 size={11} />
              {item.link ? item.link.replace(/^https?:\/\//, "").slice(0, 28) : "URL"}
            </button>
            {linkOpen && (
              <LinkEditPopover
                className="absolute left-0 top-full mt-1"
                value={item.link || "https://"}
                onChange={(link) => patch({ link })}
                onClose={() => setLinkOpen(false)}
                onClear={() => {
                  patch({ link: "" });
                  setLinkOpen(false);
                }}
              />
            )}
          </div>
        )}
        {st.description !== false && (
          <EditableText
            multiline
            value={item.description || ""}
            onChange={(description) => patch({ description })}
            className="mt-1 text-[12px] text-slate-600"
            placeholder="Company Description"
          />
        )}
        {st.bullets !== false && (
          <div className="mt-1">
            <ul className="space-y-1 text-[12px] text-slate-600">
              {(item.bullets ?? []).map((bullet, bIdx) => {
                if (readOnly && isPlaceholder(bullet)) return null;
                const rtl = textDirection(bullet) === "rtl";
                const count = item.bullets?.length ?? 0;
                return (
                  <li
                    key={`${item.id}-${bIdx}`}
                    dir={rtl ? "rtl" : "ltr"}
                    className="flex gap-2"
                  >
                    <span
                      className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "#374151" }}
                      aria-hidden
                    />
                    <ImproveField
                      sectionId={sectionId}
                      fieldPath={`items[${idx}].bullets[${bIdx}]`}
                      className="min-w-0 flex-1"
                    >
                      <EditableText
                        multiline
                        wordingAssist
                        autoFocus={focusBullet === bIdx}
                        onAutoFocused={() => setFocusBullet(null)}
                        value={bullet}
                        onEnter={() => {
                          mutateBullets((bullets) => {
                            const next = [...bullets];
                            next.splice(bIdx + 1, 0, "");
                            return next;
                          });
                          setFocusBullet(bIdx + 1);
                        }}
                        onChange={(next) => {
                          mutateBullets((bullets) => {
                            const copy = [...bullets];
                            copy[bIdx] = next;
                            return copy;
                          });
                        }}
                        onRemoveEmpty={() => {
                          mutateBullets((bullets) => bullets.filter((_, i) => i !== bIdx));
                        }}
                        placeholder="Highlight your accomplishments, using numbers if possible."
                      />
                    </ImproveField>
                    {!readOnly && selected && (
                      <span className="flex shrink-0 items-start gap-0.5 pt-0.5">
                        <button
                          type="button"
                          title="Add bullet"
                          aria-label="Add bullet"
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            mutateBullets((bullets) => {
                              const next = [...bullets];
                              next.splice(bIdx + 1, 0, "");
                              return next;
                            });
                            setFocusBullet(bIdx + 1);
                          }}
                        >
                          <Plus size={11} />
                        </button>
                        <button
                          type="button"
                          title="Move bullet up"
                          aria-label="Move bullet up"
                          disabled={bIdx === 0}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          onClick={(e) => {
                            e.stopPropagation();
                            mutateBullets((bullets) => {
                              if (bIdx <= 0) return bullets;
                              const next = [...bullets];
                              [next[bIdx - 1], next[bIdx]] = [next[bIdx], next[bIdx - 1]];
                              return next;
                            });
                          }}
                        >
                          <ChevronUp size={11} />
                        </button>
                        <button
                          type="button"
                          title="Move bullet down"
                          aria-label="Move bullet down"
                          disabled={bIdx >= count - 1}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          onClick={(e) => {
                            e.stopPropagation();
                            mutateBullets((bullets) => {
                              if (bIdx >= bullets.length - 1) return bullets;
                              const next = [...bullets];
                              [next[bIdx + 1], next[bIdx]] = [next[bIdx], next[bIdx + 1]];
                              return next;
                            });
                          }}
                        >
                          <ChevronDown size={11} />
                        </button>
                        <button
                          type="button"
                          title="Delete bullet"
                          aria-label="Delete bullet"
                          className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            mutateBullets((bullets) => bullets.filter((_, i) => i !== bIdx));
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {!readOnly && selected && (item.bullets ?? []).length === 0 && (
              <button
                type="button"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                onClick={(e) => {
                  e.stopPropagation();
                  mutateBullets(() => [""]);
                  setFocusBullet(0);
                }}
              >
                <Plus size={11} /> Add bullet
              </button>
            )}
          </div>
        )}
        {!readOnly && (item.projects ?? []).length === 0 && (
          <button
            type="button"
            className="rb-editor-only mt-2 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
            onClick={() =>
              patch({
                projects: [{ id: `${item.id}-project`, name: "", description: "" }],
              })
            }
          >
            Add project table
          </button>
        )}
        {(item.projects ?? []).some(
          (row) => !readOnly || !(isPlaceholder(row.name) && isPlaceholder(row.description))
        ) && (
          <table className="mt-2 w-full border-collapse text-[11px]">
            <thead>
              <tr style={{ background: `${accent}22` }}>
                <th className="px-2 py-1 text-left font-semibold" style={{ color: accent }}>
                  Project name
                </th>
                <th className="px-2 py-1 text-left font-semibold" style={{ color: accent }}>
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {(item.projects ?? []).filter((row) => !readOnly || !(isPlaceholder(row.name) && isPlaceholder(row.description))).map((row) => { const rIdx = (item.projects ?? []).indexOf(row); return (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-2 py-1 align-top">
                    <EditableText
                      value={row.name}
                      onChange={(name) => {
                        const projects = [...(item.projects ?? [])];
                        projects[rIdx] = { ...projects[rIdx], name };
                        patch({ projects });
                      }}
                      placeholder="Text"
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <EditableText
                      value={row.description}
                      onChange={(description) => {
                        const projects = [...(item.projects ?? [])];
                        projects[rIdx] = { ...projects[rIdx], description };
                        patch({ projects });
                      }}
                      placeholder="Text"
                    />
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        )}
        {!readOnly && (item.projects ?? []).length > 0 && (
          <button
            type="button"
            className="rb-editor-only mt-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600"
            onClick={() => patch({ projects: [] })}
          >
            Remove project table
          </button>
        )}
      </div>
    </div>
  );
}

function renderBody(
  section: ResumeSection,
  accent: string,
  updateSection: (id: string, updater: (s: ResumeSection) => ResumeSection) => void,
  chrome: {
    headingStyle: NonNullable<ResumeDesign["sectionHeadingStyle"]>;
    entryLayout: NonNullable<ResumeDesign["entryLayout"]>;
    ink: string;
  },
  readOnly = false
) {
  const { ink } = chrome;
  const sectionSettings = getSettings(section);
  const Heading = ({
    value,
    onChange,
    type = section.type,
  }: {
    value: string;
    onChange: (next: string) => void;
    type?: SectionType;
  }) => (
    <SectionHeading
      value={value}
      onChange={onChange}
      accent={accent}
      ink={ink}
      sectionType={type}
      headingStyle={chrome.headingStyle}
      uppercaseTitles={sectionSettings.uppercaseTitles !== false}
    />
  );

  switch (section.type) {
    case "header":
      return null;
    case "summary":
      return (
        <SectionChrome
          section={section}
          canAddItem={false}
          toolbarVariant="summary"
        >
          <Heading
            value={section.title}
            onChange={(title) => updateSection(section.id, (s) => ({ ...s, title }) as ResumeSection)}
          />
          <ImproveField sectionId={section.id} fieldPath="content">
            <EditableText
              multiline
              wordingAssist
              maxLength={2000}
              value={section.content}
              onChange={(content) =>
                updateSection(section.id, (s) =>
                  s.type === "summary" ? { ...s, content } : s
                )
              }
              className="text-[12px] leading-relaxed text-slate-700"
            />
          </ImproveField>
          {!readOnly && (
            <p className="rb-editor-only mt-1 text-right text-[10px] text-slate-400">
              {section.content.replace(/<[^>]+>/g, "").length}/2000 characters
            </p>
          )}
        </SectionChrome>
      );
    case "experience": {
      const st = getSettings(section);
      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) =>
              updateSection(section.id, (s) => (s.type === "experience" ? { ...s, title } : s))
            }
          />
          <div className="rb-entry-list relative overflow-visible pb-0.5 pt-0.5">
            {section.items.map((item, idx) => (
              <ExperienceEntry
                key={item.id}
                item={item}
                idx={idx}
                sectionId={section.id}
                st={st}
                accent={accent}
                updateSection={updateSection}
                entryLayout={chrome.entryLayout}
                isLast={idx === section.items.length - 1}
                ranges={section.items.map((it) => ({
                  id: it.id,
                  startDate: it.startDate,
                  endDate: it.endDate,
                }))}
              />
            ))}
          </div>
        </SectionChrome>
      );
    }
    case "skills": {
      const st = getSettings(section);
      const layout = st.skillsLayout || "tags";
      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) =>
              updateSection(section.id, (s) => (s.type === "skills" ? { ...s, title } : s))
            }
          />
          <div className="rb-entry-list">
            {section.categories.map((cat, idx) => (
              <EntryChrome
                key={cat.id}
                sectionId={section.id}
                itemId={cat.id}
                sectionType="skills"
                settings={st}
                isLast={idx === section.categories.length - 1}
              >
                {st.groupName !== false && (
                  <EditableText
                    value={cat.name}
                    onChange={(name) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "skills") return s;
                        const categories = [...s.categories];
                        categories[idx] = { ...categories[idx], name };
                        return { ...s, categories };
                      })
                    }
                    className="text-[12px] font-semibold"
                    style={{ color: accent }}
                    placeholder="Group"
                  />
                )}
                {layout === "tags" ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {cat.skills.map((skill, sIdx) => {
                      if (isBlankText(skill)) return null;
                      if (readOnly && isPlaceholder(skill)) return null;
                      const label = skill.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
                      return (
                      <span
                        key={`${cat.id}-${sIdx}`}
                        className={clsx(
                          "inline-flex items-center gap-0.5 rounded",
                          st.skillBorder !== false && "border border-slate-200"
                        )}
                      >
                      <EditableText
                        value={skill}
                        autoFocus={skillShouldFocus(cat.id, sIdx)}
                        onAutoFocused={clearSkillFocus}
                        onEnter={() => {
                          updateSection(section.id, (s) => {
                            if (s.type !== "skills") return s;
                            const categories = [...s.categories];
                            const skills = [...categories[idx].skills];
                            skills.splice(sIdx + 1, 0, "");
                            categories[idx] = { ...categories[idx], skills };
                            markSkillFocus(cat.id, sIdx + 1);
                            return { ...s, categories };
                          });
                        }}
                        onChange={(next) =>
                          updateSection(section.id, (s) => {
                            if (s.type !== "skills") return s;
                            const categories = [...s.categories];
                            const skills = [...categories[idx].skills];
                            const parts = next.split(",").map((part) => part.trim());
                            if (parts.length > 1) {
                              const kept = parts.filter(Boolean);
                              skills.splice(sIdx, 1, ...(kept.length ? kept : [""]));
                              markSkillFocus(cat.id, sIdx + Math.max(kept.length - 1, 0));
                            } else if (isBlankText(next)) skills.splice(sIdx, 1);
                            else skills[sIdx] = next;
                            categories[idx] = { ...categories[idx], skills };
                            return { ...s, categories };
                          })
                        }
                        className="px-1.5 py-0.5 text-[11px] text-slate-700"
                        placeholder="Your skill"
                      />
                      {!readOnly && (
                        <button
                          type="button"
                          aria-label={`Remove ${label || "skill"}`}
                          className="rb-editor-only inline-flex h-4 w-4 items-center justify-center rounded-full text-[13px] leading-none text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateSection(section.id, (s) => {
                              if (s.type !== "skills") return s;
                              const categories = [...s.categories];
                              const skills = categories[idx].skills.filter((_, i) => i !== sIdx);
                              categories[idx] = { ...categories[idx], skills };
                              return { ...s, categories };
                            });
                          }}
                        >
                          ×
                        </button>
                      )}
                      </span>
                      );
                    })}
                  </div>
                ) : layout === "bullets" ? (
                  <ul className="mt-1 list-disc pl-4 text-[12px] text-slate-700">
                    {cat.skills.map((skill, sIdx) =>
                      isBlankText(skill) || (readOnly && isPlaceholder(skill)) ? null : (
                      <li key={`${cat.id}-${sIdx}`}>
                        <EditableText
                          value={skill}
                          onChange={(next) =>
                            updateSection(section.id, (s) => {
                              if (s.type !== "skills") return s;
                              const categories = [...s.categories];
                              const skills = [...categories[idx].skills];
                              if (isBlankText(next)) skills.splice(sIdx, 1);
                              else skills[sIdx] = next;
                              categories[idx] = { ...categories[idx], skills };
                              return { ...s, categories };
                            })
                          }
                        />
                      </li>
                      )
                    )}
                  </ul>
                ) : (
                  <EditableText
                    value={cat.skills.join(", ")}
                    onChange={(skills) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "skills") return s;
                        const categories = [...s.categories];
                        categories[idx] = {
                          ...categories[idx],
                          skills: skills
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        };
                        return { ...s, categories };
                      })
                    }
                    className="text-[12px] text-slate-700"
                    placeholder="Your skill"
                  />
                )}
              </EntryChrome>
            ))}
          </div>
        </SectionChrome>
      );
    }
    case "projects": {
      const st = getSettings(section);
      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) =>
              updateSection(section.id, (s) => (s.type === "projects" ? { ...s, title } : s))
            }
          />
          <div className="rb-entry-list">
            {section.items.map((item, idx) => (
              <EntryChrome
                key={item.id}
                sectionId={section.id}
                itemId={item.id}
                sectionType="projects"
                settings={st}
                isLast={idx === section.items.length - 1}
              >
                {st.title !== false && (
                  <EditableText
                    value={item.name}
                    onChange={(name) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "projects") return s;
                        const items = [...s.items];
                        items[idx] = { ...items[idx], name };
                        return { ...s, items };
                      })
                    }
                    className="text-[12px] font-semibold text-slate-900"
                    placeholder="Project Name"
                  />
                )}
                <MetaDateLocation
                  startDate={item.startDate || ""}
                  endDate={item.endDate || ""}
                  location={item.location || ""}
                  showDate={st.datePeriod !== false}
                  showLocation={st.location !== false}
                  accent={accent}
                  onDateChange={(startDate, endDate) =>
                    updateSection(section.id, (s) => {
                      if (s.type !== "projects") return s;
                      const items = [...s.items];
                      items[idx] = { ...items[idx], startDate, endDate };
                      return { ...s, items };
                    })
                  }
                  onLocationChange={(location) =>
                    updateSection(section.id, (s) => {
                      if (s.type !== "projects") return s;
                      const items = [...s.items];
                      items[idx] = { ...items[idx], location };
                      return { ...s, items };
                    })
                  }
                />
                {st.description !== false && (
                  <ImproveField
                    sectionId={section.id}
                    fieldPath={`items[${idx}].description`}
                    className="mt-1"
                  >
                    <EditableText
                      multiline
                      value={item.description}
                      onChange={(description) =>
                        updateSection(section.id, (s) => {
                          if (s.type !== "projects") return s;
                          const items = [...s.items];
                          items[idx] = { ...items[idx], description };
                          return { ...s, items };
                        })
                      }
                      className="text-[12px] text-slate-700"
                      placeholder="Short summary"
                    />
                  </ImproveField>
                )}
              </EntryChrome>
            ))}
          </div>
        </SectionChrome>
      );
    }
    case "achievements":
    case "strengths": {
      const st = getSettings(section);
      const fallbackIcon = defaultIconForSection(section.type);
      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) => updateSection(section.id, (s) => ({ ...s, title }) as ResumeSection)}
          />
          <div className="rb-entry-list">
            {section.items.map((item, idx) => {
              const iconId =
                ("icon" in item && item.icon) || fallbackIcon;
              return (
              <EntryChrome
                key={item.id}
                sectionId={section.id}
                itemId={item.id}
                sectionType={section.type}
                settings={st}
                isLast={idx === section.items.length - 1}
                selectedIcon={iconId}
                onIconPick={(icon) => {
                  updateSection(section.id, (s) => {
                    if (s.type !== "achievements" && s.type !== "strengths") return s;
                    const items = [...s.items];
                    items[idx] = { ...items[idx], icon };
                    return { ...s, items };
                  });
                }}
              >
                <div className="flex gap-2">
                  {st.icons !== false && (
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    <IconGlyph id={iconId} size={13} />
                  </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {st.title !== false && (
                      <EditableText
                        value={"title" in item && item.title ? item.title : item.text}
                        onChange={(title) =>
                          updateSection(section.id, (s) => {
                            if (s.type !== "achievements" && s.type !== "strengths") return s;
                            const items = [...s.items];
                            const suggested = suggestIconFromText(title, "general");
                            items[idx] = {
                              ...items[idx],
                              title,
                              text: title,
                              ...(suggested ? { icon: suggested } : {}),
                            };
                            return { ...s, items };
                          })
                        }
                        className="text-[12px] font-semibold"
                        style={{ color: ink }}
                        placeholder={
                          section.type === "strengths" ? "Your Strength" : "Your Achievement"
                        }
                      />
                    )}
                    {st.description !== false && (
                      <EditableText
                        multiline
                        value={"description" in item && item.description ? item.description : ""}
                        onChange={(description) =>
                          updateSection(section.id, (s) => {
                            if (s.type !== "achievements" && s.type !== "strengths") return s;
                            const items = [...s.items];
                            items[idx] = { ...items[idx], description };
                            return { ...s, items };
                          })
                        }
                        className="text-[11px] text-slate-600"
                        placeholder="Description"
                      />
                    )}
                  </div>
                </div>
              </EntryChrome>
              );
            })}
          </div>
        </SectionChrome>
      );
    }
    case "awards": {
      const st = getSettings(section);
      const fallbackIcon = defaultIconForSection("awards");
      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) =>
              updateSection(section.id, (s) => (s.type === "awards" ? { ...s, title } : s))
            }
          />
          <div className="rb-entry-list">
            {section.items.map((item, idx) => {
              const iconId = item.icon || fallbackIcon;
              return (
                <EntryChrome
                  key={item.id}
                  sectionId={section.id}
                  itemId={item.id}
                  sectionType="awards"
                  settings={st}
                  isLast={idx === section.items.length - 1}
                  selectedIcon={iconId}
                  onIconPick={(icon) => {
                    updateSection(section.id, (s) => {
                      if (s.type !== "awards") return s;
                      const items = [...s.items];
                      items[idx] = { ...items[idx], icon };
                      return { ...s, items };
                    });
                  }}
                >
                  <div className="flex gap-2">
                    {st.icons !== false && (
                      <div
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${accent}18`, color: accent }}
                      >
                        <IconGlyph id={iconId} size={13} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {st.title !== false && (
                        <EditableText
                          value={item.name}
                          onChange={(name) =>
                            updateSection(section.id, (s) => {
                              if (s.type !== "awards") return s;
                              const items = [...s.items];
                              const suggested = suggestIconFromText(name, "general");
                              items[idx] = {
                                ...items[idx],
                                name,
                                ...(suggested ? { icon: suggested } : {}),
                              };
                              return { ...s, items };
                            })
                          }
                          className="text-[12px] font-semibold"
                          style={{ color: ink }}
                          placeholder="Award Name"
                        />
                      )}
                      {st.subtitle !== false && (
                        <EditableText
                          value={item.issuer}
                          onChange={(issuer) =>
                            updateSection(section.id, (s) => {
                              if (s.type !== "awards") return s;
                              const items = [...s.items];
                              items[idx] = { ...items[idx], issuer };
                              return { ...s, items };
                            })
                          }
                          className="text-[11px] text-slate-600"
                          placeholder="Issuer"
                        />
                      )}
                      {st.datePeriod !== false && (
                        <EditableText
                          value={item.date || ""}
                          onChange={(date) =>
                            updateSection(section.id, (s) => {
                              if (s.type !== "awards") return s;
                              const items = [...s.items];
                              items[idx] = { ...items[idx], date };
                              return { ...s, items };
                            })
                          }
                          className="text-[10px] text-slate-500"
                          placeholder="Date"
                        />
                      )}
                    </div>
                  </div>
                </EntryChrome>
              );
            })}
          </div>
        </SectionChrome>
      );
    }
    case "online": {
      const st = getSettings(section);
      const fallbackIcon = defaultIconForSection("online");
      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) =>
              updateSection(section.id, (s) => (s.type === "online" ? { ...s, title } : s))
            }
          />
          <div className="rb-entry-list grid grid-cols-2 gap-x-3">
            {section.items.map((item, idx) => {
              const iconId = item.icon || fallbackIcon;
              return (
                <EntryChrome
                  key={item.id}
                  sectionId={section.id}
                  itemId={item.id}
                  sectionType="online"
                  settings={st}
                  isLast={idx === section.items.length - 1}
                  selectedIcon={iconId}
                  iconVariant="social"
                  onIconPick={(icon) => {
                    updateSection(section.id, (s) => {
                      if (s.type !== "online") return s;
                      const items = [...s.items];
                      items[idx] = { ...items[idx], icon };
                      return { ...s, items };
                    });
                  }}
                >
                  <div className="flex items-start gap-2">
                    {st.icons !== false && (
                      <div
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${accent}18`, color: accent }}
                      >
                        <IconGlyph id={iconId} size={13} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <EditableText
                        value={item.platform}
                        onChange={(platform) =>
                          updateSection(section.id, (s) => {
                            if (s.type !== "online") return s;
                            const items = [...s.items];
                            const suggested = suggestIconFromText(platform, "social");
                            items[idx] = {
                              ...items[idx],
                              platform,
                              ...(suggested ? { icon: suggested } : {}),
                            };
                            return { ...s, items };
                          })
                        }
                        className="text-[12px] font-semibold"
                        style={{ color: ink }}
                        placeholder="Social Network"
                      />
                      {st.username !== false && (
                        <EditableText
                          value={item.username}
                          onChange={(username) =>
                            updateSection(section.id, (s) => {
                              if (s.type !== "online") return s;
                              const items = [...s.items];
                              items[idx] = { ...items[idx], username };
                              return { ...s, items };
                            })
                          }
                          className="text-[11px] text-slate-500"
                          placeholder="Username"
                        />
                      )}
                    </div>
                  </div>
                </EntryChrome>
              );
            })}
          </div>
        </SectionChrome>
      );
    }
    case "certifications": {
      const st = getSettings(section);
      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) =>
              updateSection(section.id, (s) => (s.type === "certifications" ? { ...s, title } : s))
            }
          />
          <div className="rb-entry-list text-[12px]">
            {section.items.map((item, idx) => (
              <EntryChrome
                key={item.id}
                sectionId={section.id}
                itemId={item.id}
                sectionType="certifications"
                settings={st}
                isLast={idx === section.items.length - 1}
              >
                {st.title !== false && (
                  <EditableText
                    value={item.name}
                    onChange={(name) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "certifications") return s;
                        const items = [...s.items];
                        items[idx] = { ...items[idx], name };
                        return { ...s, items };
                      })
                    }
                    className="font-semibold text-slate-900"
                    placeholder="Certification"
                  />
                )}
                {st.subtitle !== false && (
                  <EditableText
                    value={item.issuer}
                    onChange={(issuer) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "certifications") return s;
                        const items = [...s.items];
                        items[idx] = { ...items[idx], issuer };
                        return { ...s, items };
                      })
                    }
                    className="text-slate-600"
                    placeholder="Issuer"
                  />
                )}
                {st.datePeriod !== false && (
                  <EditableText
                    value={item.date || ""}
                    onChange={(date) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "certifications") return s;
                        const items = [...s.items];
                        items[idx] = { ...items[idx], date };
                        return { ...s, items };
                      })
                    }
                    className="text-[11px] text-slate-500"
                    placeholder="Date"
                  />
                )}
                {st.link !== false && readOnly && item.url ? (
                  <a
                    href={linkHrefFromText(item.url) || undefined}
                    className="text-[11px] text-[var(--rb-teal-dark)] underline"
                  >
                    {item.url}
                  </a>
                ) : st.link !== false ? (
                  <EditableText
                    value={item.url || ""}
                    onChange={(url) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "certifications") return s;
                        const items = [...s.items];
                        items[idx] = { ...items[idx], url };
                        return { ...s, items };
                      })
                    }
                    className="text-[11px] text-[var(--rb-teal-dark)] underline"
                    placeholder="Credential URL"
                  />
                ) : null}
              </EntryChrome>
            ))}
          </div>
        </SectionChrome>
      );
    }
    case "education": {
      const st = getSettings(section);
      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) =>
              updateSection(section.id, (s) => (s.type === "education" ? { ...s, title } : s))
            }
          />
          <div className="rb-entry-list text-[12px]">
            {section.items.map((item, idx) => (
              <EntryChrome
                key={item.id}
                sectionId={section.id}
                itemId={item.id}
                sectionType="education"
                settings={st}
                isLast={idx === section.items.length - 1}
              >
                <div className="flex gap-2">
                {st.logo !== false && (
                  <CompanyLogo
                    className="mt-0.5"
                    name={item.school}
                    logoUrl={item.logoUrl}
                    size={32}
                    iconSize={16}
                  />
                )}
                <div className="min-w-0 flex-1">
                {st.title !== false && (
                  <EditableText
                    value={item.degree}
                    onChange={(degree) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "education") return s;
                        const items = [...s.items];
                        items[idx] = { ...items[idx], degree };
                        return { ...s, items };
                      })
                    }
                    className="font-semibold"
                    style={{ color: ink }}
                  />
                )}
                {st.institution !== false && (
                  <EditableText
                    value={item.school}
                    onChange={(school) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "education") return s;
                        const items = [...s.items];
                        items[idx] = { ...items[idx], school };
                        return { ...s, items };
                      })
                    }
                    className="font-medium"
                    style={{ color: accent }}
                  />
                )}
                <MetaDateLocation
                  startDate={item.startDate}
                  endDate={item.endDate}
                  location={item.location}
                  showDate={st.datePeriod !== false}
                  showLocation={st.location !== false}
                  accent={accent}
                  onDateChange={(startDate, endDate) =>
                    updateSection(section.id, (s) => {
                      if (s.type !== "education") return s;
                      const items = [...s.items];
                      items[idx] = { ...items[idx], startDate, endDate };
                      return { ...s, items };
                    })
                  }
                  onLocationChange={(location) =>
                    updateSection(section.id, (s) => {
                      if (s.type !== "education") return s;
                      const items = [...s.items];
                      items[idx] = { ...items[idx], location };
                      return { ...s, items };
                    })
                  }
                />
                {st.gpa && item.gpa !== undefined && (
                  <EditableText
                    value={item.gpa || "GPA"}
                    onChange={(gpa) =>
                      updateSection(section.id, (s) => {
                        if (s.type !== "education") return s;
                        const items = [...s.items];
                        items[idx] = { ...items[idx], gpa };
                        return { ...s, items };
                      })
                    }
                    className="mt-0.5 text-[11px] text-slate-500"
                  />
                )}
                {st.bullets !== false && (item.bullets?.length ?? 0) > 0 && (
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-600">
                    {(item.bullets ?? []).map((b, bIdx) => (
                      <li key={`${item.id}-b-${bIdx}`}>
                        <EditableText
                          value={b}
                          onChange={(next) =>
                            updateSection(section.id, (s) => {
                              if (s.type !== "education") return s;
                              const items = [...s.items];
                              const bullets = [...(items[idx].bullets ?? [])];
                              bullets[bIdx] = next;
                              items[idx] = { ...items[idx], bullets };
                              return { ...s, items };
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
                </div>
                </div>
              </EntryChrome>
            ))}
          </div>
        </SectionChrome>
      );
    }
    case "languages": {
      const st = getSettings(section);
      const sliderStyle = st.languageSliderStyle || "bars";
      const LEVELS = ["Beginner", "Elementary", "Intermediate", "Advanced", "Native"] as const;

      function filledCount(proficiency: number) {
        return Math.max(0, Math.min(5, Math.round(proficiency / 20)));
      }

      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) =>
              updateSection(section.id, (s) => (s.type === "languages" ? { ...s, title } : s))
            }
          />
          <div className="rb-entry-list">
            {section.items.map((item, idx) => {
              const filled = filledCount(item.proficiency);
              return (
                <EntryChrome
                  key={item.id}
                  sectionId={section.id}
                  itemId={item.id}
                  sectionType="languages"
                  settings={st}
                  isLast={idx === section.items.length - 1}
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      {st.title !== false && (
                        <EditableText
                          value={item.name}
                          onChange={(name) =>
                            updateSection(section.id, (s) => {
                              if (s.type !== "languages") return s;
                              const items = [...s.items];
                              items[idx] = { ...items[idx], name };
                              return { ...s, items };
                            })
                          }
                          className="text-[12px] font-semibold"
                          style={{ color: ink }}
                          placeholder="Language"
                        />
                      )}
                      {st.subtitle !== false && (
                        <EditableText
                          value={item.level}
                          onChange={(level) =>
                            updateSection(section.id, (s) => {
                              if (s.type !== "languages") return s;
                              const items = [...s.items];
                              items[idx] = { ...items[idx], level };
                              return { ...s, items };
                            })
                          }
                          className="text-[11px] text-slate-500"
                          placeholder="Proficiency"
                        />
                      )}
                    </div>

                    {st.description !== false && (
                      <div
                        className="flex shrink-0 items-end gap-[3px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {sliderStyle === "line" ? (
                          <button
                            type="button"
                            className="h-1.5 w-[72px] overflow-hidden rounded-full bg-slate-200"
                            title="Set proficiency"
                            aria-label="Set proficiency"
                            onClick={() => {
                              const next = filled >= 5 ? 20 : (filled + 1) * 20;
                              updateSection(section.id, (s) => {
                                if (s.type !== "languages") return s;
                                const items = [...s.items];
                                const step = Math.max(1, Math.min(5, Math.round(next / 20)));
                                items[idx] = {
                                  ...items[idx],
                                  proficiency: step * 20,
                                  level: LEVELS[step - 1],
                                };
                                return { ...s, items };
                              });
                            }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0, item.proficiency))}%`,
                                background: accent,
                              }}
                            />
                          </button>
                        ) : (
                          [1, 2, 3, 4, 5].map((step) => {
                            const on = step <= filled;
                            const common = clsx(
                              "transition",
                              on ? "" : "opacity-40"
                            );
                            return (
                              <button
                                key={step}
                                type="button"
                                title={LEVELS[step - 1]}
                                aria-label={LEVELS[step - 1]}
                                onClick={() =>
                                  updateSection(section.id, (s) => {
                                    if (s.type !== "languages") return s;
                                    const items = [...s.items];
                                    items[idx] = {
                                      ...items[idx],
                                      proficiency: step * 20,
                                      level: LEVELS[step - 1],
                                    };
                                    return { ...s, items };
                                  })
                                }
                                className={common}
                                style={{ color: on ? accent : "#d5d8dd" }}
                              >
                                {sliderStyle === "bars" && (
                                  <span
                                    className="block h-3 w-[4px] rounded-[1px]"
                                    style={{ background: "currentColor" }}
                                  />
                                )}
                                {sliderStyle === "dots" && (
                                  <span
                                    className="block h-2.5 w-2.5 rounded-full"
                                    style={{ background: "currentColor" }}
                                  />
                                )}
                                {sliderStyle === "squares" && (
                                  <span
                                    className="block h-2.5 w-2.5 rounded-[2px]"
                                    style={{ background: "currentColor" }}
                                  />
                                )}
                                {sliderStyle === "pills" && (
                                  <span
                                    className="block h-2 w-3 rounded-full"
                                    style={{ background: "currentColor" }}
                                  />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </EntryChrome>
              );
            })}
          </div>
        </SectionChrome>
      );
    }
    case "philosophy":
      return (
        <SectionChrome section={section} canAddItem={false}>
          <Heading
            value={section.title}
            onChange={(title) =>
              updateSection(section.id, (s) => (s.type === "philosophy" ? { ...s, title } : s))
            }
          />
          <EditableText
            multiline
            value={`“${section.quote}”`}
            onChange={(quote) =>
              updateSection(section.id, (s) =>
                s.type === "philosophy"
                  ? { ...s, quote: quote.replace(/^[“"]|[”"]$/g, "") }
                  : s
              )
            }
            className="text-[12px] italic text-slate-700"
          />
          <EditableText
            value={section.author}
            onChange={(author) =>
              updateSection(section.id, (s) => (s.type === "philosophy" ? { ...s, author } : s))
            }
            className="mt-1 text-[11px] text-slate-500"
          />
        </SectionChrome>
      );
    case "interests":
    case "custom": {
      const st = getSettings(section);
      return (
        <SectionChrome section={section} canAddItem>
          <Heading
            value={section.title}
            onChange={(title) => updateSection(section.id, (s) => ({ ...s, title }) as ResumeSection)}
          />
          <div className="rb-entry-list">
            {section.items.map((item, idx) => {
              const row = item as {
                id: string;
                title?: string;
                description?: string;
                name?: string;
                subtitle?: string;
                startDate?: string;
                endDate?: string;
                location?: string;
                link?: string;
              };
              return (
                <EntryChrome
                  key={row.id}
                  sectionId={section.id}
                  itemId={row.id}
                  sectionType={section.type}
                  settings={st}
                  isLast={idx === section.items.length - 1}
                >
                  {st.title !== false && (
                    <EditableText
                      value={row.title || row.name || ""}
                      onChange={(title) =>
                        updateSection(section.id, (s) => {
                          if (s.type !== "interests" && s.type !== "custom") return s;
                          const items = [...s.items];
                          items[idx] = { ...items[idx], title };
                          return { ...s, items };
                        })
                      }
                      className="text-[12px] font-semibold"
                      style={{ color: accent }}
                      placeholder="Title"
                    />
                  )}
                  {section.type === "custom" && st.subtitle !== false && (
                    <EditableText
                      value={row.subtitle || ""}
                      onChange={(subtitle) =>
                        updateSection(section.id, (s) => {
                          if (s.type !== "custom") return s;
                          const items = [...s.items];
                          items[idx] = { ...items[idx], subtitle };
                          return { ...s, items };
                        })
                      }
                      className="text-[11px] font-medium text-slate-600"
                      placeholder="Subtitle"
                    />
                  )}
                  {section.type === "custom" && (st.datePeriod !== false || st.location !== false) && (
                    <MetaDateLocation
                      startDate={row.startDate || ""}
                      endDate={row.endDate || ""}
                      location={row.location || ""}
                      showDate={st.datePeriod !== false}
                      showLocation={st.location !== false}
                      accent={accent}
                      onDateChange={(startDate, endDate) =>
                        updateSection(section.id, (s) => {
                          if (s.type !== "custom") return s;
                          const items = [...s.items];
                          items[idx] = { ...items[idx], startDate, endDate };
                          return { ...s, items };
                        })
                      }
                      onLocationChange={(location) =>
                        updateSection(section.id, (s) => {
                          if (s.type !== "custom") return s;
                          const items = [...s.items];
                          items[idx] = { ...items[idx], location };
                          return { ...s, items };
                        })
                      }
                    />
                  )}
                  {st.description !== false && (
                    <EditableText
                      multiline
                      value={row.description || ""}
                      onChange={(description) =>
                        updateSection(section.id, (s) => {
                          if (s.type !== "interests" && s.type !== "custom") return s;
                          const items = [...s.items];
                          items[idx] = { ...items[idx], description };
                          return { ...s, items };
                        })
                      }
                      className="text-[11px] text-slate-600"
                      placeholder="Description"
                    />
                  )}
                  {section.type === "custom" && st.link !== false && (
                    <EditableText
                      value={row.link || ""}
                      onChange={(link) =>
                        updateSection(section.id, (s) => {
                          if (s.type !== "custom") return s;
                          const items = [...s.items];
                          items[idx] = { ...items[idx], link };
                          return { ...s, items };
                        })
                      }
                      className="text-[11px] text-[var(--rb-teal-dark)] underline"
                      placeholder="Link"
                    />
                  )}
                </EntryChrome>
              );
            })}
          </div>
        </SectionChrome>
      );
    }
    default: {
      const titled = section as ResumeSection & { title?: string };
      return (
        <SectionChrome section={section} canAddItem={"items" in section}>
          {"title" in titled && typeof titled.title === "string" && (
            <Heading
              value={titled.title}
              onChange={(title) => updateSection(section.id, (s) => ({ ...s, title }) as ResumeSection)}
            />
          )}
          {"items" in section && Array.isArray(section.items) ? (
            <ul className="space-y-2 text-[12px] text-slate-700">
              {section.items.map((item, idx) => {
                const row = item as Record<string, unknown> & { id: string };
                const labelKey = (
                  ["role", "title", "name", "text", "label", "platform"] as const
                ).find((key) => key in row) ?? "title";
                const detailKey = (
                  ["organization", "description", "email", "issuer"] as const
                ).find((key) => key in row);
                const label = String(row[labelKey] ?? "");
                const detail = detailKey ? String(row[detailKey] ?? "") : "";
                if (readOnly && isPlaceholder(label) && isPlaceholder(detail)) return null;
                return (
                  <li key={row.id} className="rb-fade-in">
                    <EntryChrome
                      sectionId={section.id}
                      itemId={row.id}
                      sectionType={section.type}
                      isLast={idx === section.items.length - 1}
                    >
                    <EditableText
                      value={label}
                      onChange={(next) =>
                        updateSection(section.id, (s) => {
                          if (!("items" in s) || !Array.isArray(s.items)) return s;
                          const items = [...s.items] as Array<Record<string, unknown>>;
                          const cur = { ...items[idx] };
                          cur[labelKey] = next;
                          items[idx] = cur;
                          return { ...s, items } as ResumeSection;
                        })
                      }
                      className="font-semibold"
                      style={{ color: accent }}
                    />
                    {detail ? (
                      <EditableText
                        multiline
                        value={detail}
                        onChange={(next) =>
                          updateSection(section.id, (s) => {
                            if (!("items" in s) || !Array.isArray(s.items)) return s;
                            const items = [...s.items] as Array<Record<string, unknown>>;
                            const cur = { ...items[idx] };
                            if (detailKey) cur[detailKey] = next;
                            items[idx] = cur;
                            return { ...s, items } as ResumeSection;
                          })
                        }
                        className="text-[11px] text-slate-600"
                      />
                    ) : null}
                    </EntryChrome>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[12px] text-slate-500">Section content</p>
          )}
        </SectionChrome>
      );
    }
  }
}

function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    y += node.offsetTop;
    const next = node.offsetParent as HTMLElement | null;
    if (!next || !root.contains(next)) break;
    node = next;
  }
  return y;
}

function separatePages(page: HTMLElement, pad: number) {
  page.querySelectorAll<HTMLElement>("[data-page-push]").forEach((el) => {
    el.style.marginTop = "";
    el.removeAttribute("data-page-push");
  });
  const pagePx = parseFloat(getComputedStyle(page).minHeight) || 1123;
  const gap = 36;
  const stride = pagePx + gap;
  const sections = [...page.querySelectorAll<HTMLElement>(".rb-section-hit")];
  let pages = 1;

  const contentEnd = (pageIndex: number) => pageIndex * stride + pagePx - pad;
  const nextStart = (pageIndex: number) => (pageIndex + 1) * stride + pad;

  const pushToNext = (el: HTMLElement, top: number, pageIndex: number) => {
    const current = parseFloat(el.style.marginTop || "0") || 0;
    el.style.marginTop = `${current + (nextStart(pageIndex) - top)}px`;
    el.setAttribute("data-page-push", "1");
  };

  const place = (el: HTMLElement) => {
    const top = offsetWithin(el, page);
    const height = el.offsetHeight;
    if (height <= 0) return;
    const pageIndex = Math.max(0, Math.floor(top / stride));
    const end = contentEnd(pageIndex);
    const start = nextStart(pageIndex);
    pages = Math.max(pages, pageIndex + 1);
    const fitsOnOnePage = height <= pagePx - pad;
    if (fitsOnOnePage && top < end && top + height > end) {
      pushToNext(el, top, pageIndex);
      pages = Math.max(pages, pageIndex + 2);
      return;
    }
    if (top >= end && top < start) {
      pushToNext(el, top, pageIndex);
      pages = Math.max(pages, pageIndex + 2);
    }
  };

  for (const section of sections) {
    const height = section.offsetHeight;
    if (height <= 0) continue;
    if (height > pagePx - pad) {
      place(section);
      for (const entry of section.querySelectorAll<HTMLElement>(":scope .rb-entry")) {
        place(entry);
      }
      continue;
    }
    place(section);
  }

  const used = Math.max(0, page.scrollHeight - pad);
  const byHeight = Math.max(1, Math.ceil(used / stride));
  return Math.max(pages, byHeight);
}

function columnWidth(layout: "single" | "wide-left" | "equal" | "wide-right") {
  switch (layout) {
    case "single":
      return { left: "100%", right: "0%" };
    case "wide-left":
      return { left: "62%", right: "38%" };
    case "wide-right":
      return { left: "38%", right: "62%" };
    default:
      return { left: "50%", right: "50%" };
  }
}

export function ResumeCanvas({
  readOnly = false,
  floatActions,
}: {
  readOnly?: boolean;
  floatActions?: ReactNode;
} = {}) {
  const document = useEditorStore((s) => s.document);
  const updateSection = useEditorStore((s) => s.updateSection);
  const selectedSectionId = useEditorStore((s) => s.selectedSectionId);
  const selectedItemId = useEditorStore((s) => s.selectedItemId);
  const pageRef = useRef<HTMLDivElement>(null);
  const [sheetCount, setSheetCount] = useState(1);
  const pagePad = document
    ? Math.round(48 + (Math.min(8, Math.max(0, document.design.pageMargins)) / 8) * 48)
    : 72;
  const letterPage = document?.design.pageSize === "US Letter";

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !document) return;
    let cancelled = false;
    const apply = () => {
      if (cancelled || !page.isConnected) return;
      const next = separatePages(page, pagePad);
      setSheetCount((count) => (count === next ? count : next));
    };
    apply();
    void window.document.fonts?.ready.then(apply);
    return () => {
      cancelled = true;
    };
  }, [document, pagePad]);

  useDocumentCss(document ? `@media print { @page { size: ${letterPage ? "letter" : "A4"}; margin: ${pagePad}px; } }` : "");

  if (!document) return null;

  const { design, content, layoutKey } = document;
  const accent = design.accentColor;
  const ink = design.inkColor || "#343334";
  const header = content.sections.find((s) => s.type === "header") as HeaderSection | undefined;
  const byId = Object.fromEntries(content.sections.map((s) => [s.id, s]));
  const isSingleColumn =
    layoutKey === "single-column" || design.columnLayout === "single";
  const widths = columnWidth(isSingleColumn ? "single" : design.columnLayout);
  const fontSize = 11 + design.fontSize * 0.6;
  const lineHeight = 1.35 + design.lineHeight * 0.08;
  const gap = 8 + design.sectionSpacing * 3;
  const pad = pagePad;
  const sectionGap = 10 + design.sectionSpacing * 2.5;
  const headerStyle = design.headerStyle || "default";
  const isBanner = headerStyle === "banner";
  const paperBg = PAPER_BG[design.background || "white"] || "#ffffff";
  const focusMode = !readOnly && Boolean(selectedSectionId || selectedItemId);
  const chrome = {
    headingStyle: design.sectionHeadingStyle || "underline",
    entryLayout: design.entryLayout || "side-meta",
    ink,
  } as const;

  const allSectionIds = isSingleColumn
    ? [...content.leftColumnIds, ...content.rightColumnIds]
    : null;

  return (
    <ReadOnlyCtx.Provider value={readOnly}>
    <div
      className="resume-sheet-host relative w-fit shrink-0"
      style={{
        minHeight: letterPage
          ? `calc(${sheetCount} * 11in + ${Math.max(0, sheetCount - 1)} * 36px)`
          : `calc(${sheetCount} * 297mm + ${Math.max(0, sheetCount - 1)} * 36px)`,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0" aria-hidden>
        {Array.from({ length: sheetCount }, (_, index) => (
          <div
            key={index}
            className="resume-sheet"
            style={{
              top: letterPage ? `calc(${index} * (11in + 36px))` : `calc(${index} * (297mm + 36px))`,
              height: letterPage ? "11in" : "297mm",
              background: paperBg,
            }}
          />
        ))}
      </div>
      {!readOnly && floatActions && (
        <div className="pointer-events-none absolute -right-14 top-0 z-20 hidden flex-col gap-2.5 sm:flex">
          {floatActions}
        </div>
      )}
    <div
      ref={pageRef}
      className="resume-page relative z-[1] text-slate-800"
      data-page={design.pageSize === "US Letter" ? "letter" : "a4"}
      data-bg={design.background || "white"}
      data-focus={focusMode ? "true" : undefined}
      style={{
        fontFamily: `"${design.fontFamily}", sans-serif`,
        fontSize: `${fontSize}px`,
        // BUG-504: every text size on the sheet scales with the Font size slider (default 1).
        ["--rb-fs-scale" as string]: String(fontScale(design.fontSize)),
        ["--rb-section-gap" as string]: `${sectionGap}px`,
        lineHeight,
        padding: isBanner ? `0 0 ${pad}px` : `${pad}px`,
        color: ink,
        background: paperBg,
        // Keep body text readable; accents still use design.accentColor
        ["--rb-ink" as string]: ink,
      }}
      onClick={() => {
        if (readOnly) return;
        useEditorStore.setState({ selectedSectionId: null, selectedItemId: null });
      }}
    >
      {header && (
        <HeaderBlock
          header={header}
          accent={accent}
          ink={ink}
          readOnly={readOnly}
          headerStyle={headerStyle}
          contentPad={pad}
          photoPosition={design.photoPosition || "right"}
          titlePlacement={design.titlePlacement || "below"}
          contactLayout={design.contactLayout || "row"}
        />
      )}

      <div style={isBanner ? { paddingLeft: pad, paddingRight: pad } : undefined}>
      {isSingleColumn ? (
        <div className="space-y-0" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {allSectionIds?.map((id) => {
            const section = byId[id];
            if (!section || section.type === "header") return null;
            if (readOnly && sectionIsEmpty(section)) return null;
            return <div key={id}>{renderBody(section, accent, updateSection, chrome, readOnly)}</div>;
          })}
        </div>
      ) : (
        <div className="flex" style={{ gap: `${gap}px` }}>
          <div
            className="space-y-0"
            style={{ width: widths.left, display: "flex", flexDirection: "column", gap: 0 }}
          >
            {content.leftColumnIds.map((id) => {
              const section = byId[id];
              if (!section || section.type === "header") return null;
              if (readOnly && sectionIsEmpty(section)) return null;
              return <div key={id}>{renderBody(section, accent, updateSection, chrome, readOnly)}</div>;
            })}
          </div>
          <div
            className={clsx(
              "space-y-0 pl-3",
              chrome.headingStyle !== "icon-line" && "border-l"
            )}
            style={{
              width: widths.right,
              borderColor: `${accent}33`,
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {content.rightColumnIds.map((id) => {
              const section = byId[id];
              if (!section || section.type === "header") return null;
              if (readOnly && sectionIsEmpty(section)) return null;
              return <div key={id}>{renderBody(section, accent, updateSection, chrome, readOnly)}</div>;
            })}
          </div>
        </div>
      )}

      {design.showBranding && (
        <div className="rb-branding mt-2 text-center text-[10px] text-slate-400">
          Made with ResumeBuilder
        </div>
      )}
      </div>
    </div>
    </div>
    </ReadOnlyCtx.Provider>
  );
}
