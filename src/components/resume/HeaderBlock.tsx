"use client";

import { emailHref, phoneHref } from "@/lib/linkHref";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AtSign,
  CalendarDays,
  Camera,
  CloudUpload,
  EyeOff,
  Flag,
  Link2,
  MapPin,
  Phone,
  Settings,
  Star,
  User,
} from "lucide-react";
import clsx from "clsx";
import type { HeaderSection, HeaderSettings } from "@/shared";
import { DEFAULT_HEADER_SETTINGS } from "@/shared";
import { EditableText } from "@/components/resume/EditableText";
import { ContactLinkField } from "@/components/resume/ContactLinkField";
import { PhotoUploadModal } from "@/components/resume/PhotoUploadModal";
import { LocationAutocomplete } from "@/components/resume/LocationAutocomplete";
import { useEditorStore } from "@/store/editorStore";

function mergeSettings(partial?: Partial<HeaderSettings>): HeaderSettings {
  return { ...DEFAULT_HEADER_SETTINGS, ...partial };
}

const TOGGLE_ROWS: { key: keyof HeaderSettings; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "phone", label: "Phone" },
  { key: "link", label: "Link" },
  { key: "email", label: "Email" },
  { key: "location", label: "Location" },
  { key: "extraLink", label: "Extra Link" },
  { key: "extraField", label: "Extra Field" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "nationality", label: "Nationality" },
  { key: "uppercaseName", label: "Uppercase name" },
  { key: "photo", label: "Photo" },
];

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label="Toggle"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={clsx(
        "relative h-[22px] w-[40px] shrink-0 rounded-full transition",
        on ? "bg-[#5aaa7a]" : "bg-[#cfd4db]"
      )}
    >
      <span
        className={clsx(
          "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition",
          on ? "left-[20px]" : "left-[2px]"
        )}
      />
    </button>
  );
}

function PhotoBox({
  header,
  settings,
  photoRadius,
  readOnly,
  selected,
  onUpload,
  onHide,
}: {
  header: HeaderSection;
  settings: HeaderSettings;
  photoRadius: string;
  readOnly?: boolean;
  selected: boolean;
  onUpload: () => void;
  onHide: () => void;
}) {
  if (readOnly && !header.photoUrl) return null;

  const portrait =
    settings.photoStyle === "portrait" ||
    settings.photoStyle === "rounded-portrait";

  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden bg-[#d5d8dd] transition-[border-radius,width,height] duration-200",
        portrait ? "h-[104px] w-[78px]" : "h-[88px] w-[88px]",
        !header.photoUrl && "rb-photo-empty",
        photoRadius
      )}
      style={{ boxShadow: `0 0 0 2px ${settings.photoAccent}33` }}
      onClick={(e) => e.stopPropagation()}
    >
      {header.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={header.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <User size={34} className="text-[#a8b0bb]" strokeWidth={1.2} />
          {!readOnly && (
            <span className="px-1 text-center text-[10px] font-semibold leading-tight text-[#4b5563]">
              Add photo
            </span>
          )}
        </div>
      )}

      {!readOnly && selected && (
        <>
          <button
            type="button"
            title="Upload photo"
            aria-label="Upload photo"
            onClick={onUpload}
            className="rb-toolbar-btn-primary absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-[#5aaa7a] text-white shadow"
          >
            <CloudUpload size={14} />
          </button>
          <button
            type="button"
            title="Hide photo"
            aria-label="Hide photo"
            onClick={onHide}
            className="rb-toolbar-btn-danger absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-md bg-[#e35d5d] text-white shadow"
          >
            <EyeOff size={14} />
          </button>
        </>
      )}
    </div>
  );
}

/** BUG-1402: same limits as the API (backend HEADER_LIMITS), so typing can never hit a 400. */
const HEADER_MAX = { fullName: 200, title: 200, email: 200, phone: 50, location: 200, linkedin: 200, extraLink: 200, extraField: 200 } as const;

export function HeaderBlock({
  header,
  accent,
  ink = "#343334",
  readOnly,
  headerStyle = "default",
  contentPad = 30,
  photoPosition = "right",
  titlePlacement = "below",
  contactLayout = "row",
}: {
  header: HeaderSection;
  accent: string;
  ink?: string;
  readOnly?: boolean;
  headerStyle?: "default" | "banner" | "centered";
  contentPad?: number;
  photoPosition?: "left" | "right";
  titlePlacement?: "below" | "beside";
  contactLayout?: "row" | "grid";
}) {
  const updateSection = useEditorStore((s) => s.updateSection);
  const selectedSectionId = useEditorStore((s) => s.selectedSectionId);
  const selected = !readOnly && selectedSectionId === header.id;
  const settings = mergeSettings(header.settings);
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  function patchSettings(patch: Partial<HeaderSettings>) {
    updateSection(header.id, (s) => {
      if (s.type !== "header") return s;
      return {
        ...s,
        settings: { ...mergeSettings(s.settings), ...patch },
      };
    });
  }

  function toggle(key: keyof HeaderSettings) {
    const cur = settings[key];
    if (typeof cur === "boolean") patchSettings({ [key]: !cur });
  }

  const photoRadius =
    settings.photoStyle === "square" || settings.photoStyle === "portrait"
      ? "rounded-md"
      : settings.photoStyle === "rounded"
        ? "rounded-2xl"
        : settings.photoStyle === "rounded-portrait"
          ? "rounded-xl"
          : "rounded-full";

  const contactItems: {
    key: "phone" | "email" | "linkedin" | "location" | "extraLink" | "extraField" | "dateOfBirth" | "nationality";
    show: boolean;
    icon: ReactNode;
    value: string;
    placeholder: string;
    underline?: boolean;
  }[] = [
    {
      key: "phone",
      show: settings.phone,
      icon: <Phone size={12} strokeWidth={2} />,
      value: header.contact.phone ?? "",
      placeholder: "Phone",
    },
    {
      key: "email",
      show: settings.email,
      icon: <AtSign size={12} strokeWidth={2} />,
      value: header.contact.email ?? "",
      placeholder: "Email",
    },
    {
      key: "linkedin",
      show: settings.link,
      icon: <Link2 size={12} strokeWidth={2} />,
      value: header.contact.linkedin ?? "",
      placeholder: "Link",
      underline: true,
    },
    {
      key: "extraLink",
      show: settings.extraLink,
      icon: <Link2 size={12} strokeWidth={2} />,
      value: header.contact.extraLink ?? "",
      placeholder: "Extra Link",
      underline: true,
    },
    {
      key: "location",
      show: settings.location,
      icon: <MapPin size={12} strokeWidth={2} />,
      value: header.contact.location ?? "",
      placeholder: "Location",
    },
    {
      key: "extraField",
      show: settings.extraField,
      icon: <Star size={12} strokeWidth={2} />,
      value: header.contact.extraField ?? "",
      placeholder: "Extra Field",
    },
    {
      key: "dateOfBirth",
      show: settings.dateOfBirth,
      icon: <CalendarDays size={12} strokeWidth={2} />,
      value: header.contact.dateOfBirth ?? "",
      placeholder: "Date of Birth",
    },
    {
      key: "nationality",
      show: settings.nationality,
      icon: <Flag size={12} strokeWidth={2} />,
      value: header.contact.nationality ?? "",
      placeholder: "Nationality",
    },
  ];

  return (
    <>
      <div
        data-section-id={header.id}
        data-selected={selected || undefined}
        className={clsx(
          "rb-section-hit group/header relative mb-5 overflow-visible rounded-md",
          selected && "z-[2]",
          selected && headerStyle !== "banner" && "px-2 pb-2 pt-1"
        )}
        onClick={(e) => {
          if (readOnly) return;
          e.stopPropagation();
          useEditorStore.setState({
            selectedSectionId: header.id,
            selectedItemId: null,
          });
        }}
      >
        {selected && (
          <div
            className="pointer-events-none absolute -left-3 top-1/2 z-40 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[6px] bg-[#6b5b95] text-white shadow-md"
            aria-hidden
          >
            <User size={11} strokeWidth={2.2} />
          </div>
        )}

        {/* Floating camera + settings toolbar */}
        {!readOnly && selected && (
          <div
            ref={menuRef}
            className="rb-toolbar absolute -top-9 left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-[#e4e7ec] bg-white px-0.5 py-0.5 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title="Photo"
              aria-label="Photo"
              onClick={() => setPhotoOpen(true)}
              className="rb-toolbar-btn p-1.5 text-[#4b5563] hover:text-[var(--rb-teal-dark)]"
            >
              <Camera size={16} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              title="Settings"
              aria-label="Header settings"
              onClick={() => setMenuOpen((o) => !o)}
              className={clsx(
                "rb-toolbar-btn p-1.5",
                menuOpen ? "text-[var(--rb-teal)]" : "text-[#4b5563] hover:text-[var(--rb-teal-dark)]"
              )}
            >
              <Settings size={16} strokeWidth={1.75} />
            </button>

            {menuOpen && (
              <div className="absolute left-1/2 top-full z-40 mt-2 w-[220px] -translate-x-1/2 rounded-xl border border-[#e4e7ec] bg-white p-2.5 shadow-xl">
                <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#8b939e]">
                  Settings
                </div>
                <div className="space-y-0.5">
                  {TOGGLE_ROWS.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 hover:bg-[#f5f6f8]"
                    >
                      <span className="text-[13px] text-[#3a414a]">{row.label}</span>
                      <Toggle
                        on={Boolean(settings[row.key])}
                        onChange={() => toggle(row.key)}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 border-t border-[#eceef1] pt-2">
                  <div className="mb-2 px-1 text-[12px] font-medium text-[#3a414a]">
                    Photo Style
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    {["#4d9d92", "#c5c9d0"].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => patchSettings({ photoAccent: color })}
                        className={clsx(
                          "h-6 w-6 rounded-full border-2",
                          settings.photoAccent === color
                            ? "border-[#3a414a]"
                            : "border-transparent"
                        )}
                        style={{ background: color }}
                        aria-label={`Photo accent ${color}`}
                      />
                    ))}
                    {(
                      [
                        ["circle", "rounded-full"],
                        ["rounded", "rounded-xl"],
                        ["square", "rounded-md"],
                      ] as const
                    ).map(([style, radius]) => (
                      <button
                        key={style}
                        type="button"
                        title={style}
                        onClick={() => patchSettings({ photoStyle: style })}
                        className={clsx(
                          "flex h-7 w-7 items-center justify-center border bg-[#e8eaee]",
                          radius,
                          settings.photoStyle === style
                            ? "border-[var(--rb-teal)] ring-1 ring-[var(--rb-teal)]/40"
                            : "border-transparent"
                        )}
                      >
                        <User size={14} className="text-[#8b939e]" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className={clsx(
            "flex items-start gap-3 pb-2",
            headerStyle === "banner" && "mb-2 text-white",
            headerStyle === "centered" && "flex-col items-center border-b pb-3 text-center",
            headerStyle === "default" && "border-b-2",
            photoPosition === "left" && headerStyle !== "centered" && "flex-row"
          )}
          style={
            headerStyle === "banner"
              ? {
                  background: accent,
                  borderColor: "transparent",
                  padding: `${Math.max(14, contentPad * 0.7)}px ${contentPad}px ${Math.max(12, contentPad * 0.55)}px`,
                }
              : headerStyle === "centered"
                ? { borderColor: `${ink}55` }
                : { borderColor: ink }
          }
        >
          {settings.photo && photoPosition === "left" && headerStyle !== "centered" && (
            <PhotoBox
              header={header}
              settings={settings}
              photoRadius={photoRadius}
              readOnly={readOnly}
              selected={selected}
              onUpload={() => setPhotoOpen(true)}
              onHide={() => patchSettings({ photo: false })}
            />
          )}

          <div
            className={clsx(
              "min-w-0 flex-1",
              headerStyle === "centered" && "flex w-full flex-col items-center"
            )}
          >
            <div
              className={clsx(
                titlePlacement === "beside" && settings.title
                  ? "flex flex-wrap items-baseline gap-x-3 gap-y-0.5"
                  : "block"
              )}
            >
              <EditableText
                tag="h1"
                placeholder="YOUR NAME"
                value={header.fullName}
                maxLength={HEADER_MAX.fullName}
                ariaLabel="Full name"
                onChange={(fullName) =>
                  updateSection(header.id, (s) =>
                    s.type === "header" ? { ...s, fullName } : s
                  )
                }
                className={clsx(
                  "text-[24px] font-bold tracking-[0.04em] leading-tight",
                  settings.uppercaseName && "uppercase",
                  headerStyle === "banner" ? "text-white" : undefined
                )}
                style={headerStyle === "banner" ? undefined : { color: ink }}
              />
              {settings.title && titlePlacement === "beside" && (
                <EditableText
                  value={header.title}
                  maxLength={HEADER_MAX.title}
                ariaLabel="Job title"
                  onChange={(title) =>
                    updateSection(header.id, (s) =>
                      s.type === "header" ? { ...s, title } : s
                    )
                  }
                  className={clsx(
                    "text-[13px] font-normal italic",
                    headerStyle === "banner" && "text-white/90"
                  )}
                  style={headerStyle === "banner" ? undefined : { color: accent }}
                />
              )}
            </div>
            {settings.title && titlePlacement !== "beside" && (
              <EditableText
                value={header.title}
                maxLength={HEADER_MAX.title}
                ariaLabel="Job title"
                onChange={(title) =>
                  updateSection(header.id, (s) =>
                    s.type === "header" ? { ...s, title } : s
                  )
                }
                className={clsx(
                  "mt-0.5 text-[13px] font-medium",
                  headerStyle === "banner" && "text-white/90"
                )}
                style={headerStyle === "banner" ? undefined : { color: accent }}
              />
            )}
            <div
              className={clsx(
                "rb-contact-row mt-2 text-[11px]",
                contactLayout === "grid"
                  ? "grid w-full max-w-xl grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3"
                  : "flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1",
                headerStyle === "centered" && contactLayout !== "grid" && "justify-center",
                headerStyle === "banner" ? "text-white/90" : "text-[#5a6470]"
              )}
            >
              {contactItems
                .filter((c) => c.show && (!readOnly || c.value.trim() !== ""))
                .map((c) => {
                  const isLink = c.key === "linkedin" || c.key === "extraLink";
                  const hrefKey = c.key === "linkedin" ? "linkedinHref" : "extraLinkHref";
                  return (
                    <span
                      key={c.key}
                      className="rb-contact-cell relative inline-flex max-w-full items-center gap-1"
                    >
                      <span
                        className="shrink-0"
                        style={{
                          color: headerStyle === "banner" ? "rgba(255,255,255,0.92)" : accent,
                        }}
                      >
                        {c.icon}
                      </span>
                      {isLink ? (
                        <ContactLinkField
                          label={c.value}
                          href={
                            c.key === "linkedin"
                              ? header.contact.linkedinHref
                              : header.contact.extraLinkHref
                          }
                          placeholder={c.placeholder}
                          onLabelChange={(next) =>
                            updateSection(header.id, (s) =>
                              s.type === "header"
                                ? { ...s, contact: { ...s.contact, [c.key]: next } }
                                : s
                            )
                          }
                          onHrefChange={(next) =>
                            updateSection(header.id, (s) =>
                              s.type === "header"
                                ? { ...s, contact: { ...s.contact, [hrefKey]: next } }
                                : s
                            )
                          }
                          onClearHref={() =>
                            updateSection(header.id, (s) =>
                              s.type === "header"
                                ? {
                                    ...s,
                                    contact: { ...s.contact, [hrefKey]: "" },
                                  }
                                : s
                            )
                          }
                          readOnly={readOnly}
                        />
                      ) : readOnly && c.key === "email" && emailHref(c.value) ? (
                        <a href={emailHref(c.value)} className="underline">
                          {c.value}
                        </a>
                      ) : readOnly && c.key === "phone" && phoneHref(c.value) ? (
                        <a href={phoneHref(c.value)} className="underline">
                          {c.value}
                        </a>
                      ) : c.key === "location" ? (
                        <LocationAutocomplete
                          value={c.value}
                          placeholder={c.placeholder}
                          className="min-w-[80px] max-w-[160px] text-[11px]"
                          onChange={(next) =>
                            updateSection(header.id, (s) =>
                              s.type === "header"
                                ? { ...s, contact: { ...s.contact, location: next } }
                                : s
                            )
                          }
                        />
                      ) : (
                        <span className="inline-flex min-w-0 flex-col">
                        <EditableText
                          value={c.value}
                          maxLength={HEADER_MAX[c.key as keyof typeof HEADER_MAX] ?? 200}
                          onChange={(next) =>
                            updateSection(header.id, (s) =>
                              s.type === "header"
                                ? { ...s, contact: { ...s.contact, [c.key]: next } }
                                : s
                            )
                          }
                          rich={false}
                          className={clsx(
                            "rb-contact-field",
                            headerStyle === "banner" ? "text-white/90" : "text-[#5a6470]"
                          )}
                          placeholder={c.placeholder}
                        />
                        {c.key === "email" &&
                          c.value.trim() &&
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value.trim()) && (
                            <span className="text-[10px] font-semibold text-rose-600">Enter a valid email</span>
                          )}
                        </span>
                      )}
                    </span>
                  );
                })}
            </div>
          </div>

          {settings.photo && (photoPosition !== "left" || headerStyle === "centered") && (
            <PhotoBox
              header={header}
              settings={settings}
              photoRadius={photoRadius}
              readOnly={readOnly}
              selected={selected}
              onUpload={() => setPhotoOpen(true)}
              onHide={() => patchSettings({ photo: false })}
            />
          )}
        </div>
      </div>

      {photoOpen && (
        <PhotoUploadModal
          currentUrl={header.photoUrl}
          currentStyle={settings.photoStyle}
          onClose={() => setPhotoOpen(false)}
          onSave={(url, style) => {
            const cleared = url == null || url === "";
            updateSection(header.id, (s) =>
              s.type === "header"
                ? {
                    ...s,
                    photoUrl: cleared ? "" : url,
                    settings: {
                      ...mergeSettings(s.settings),
                      photo: true,
                      photoStyle: style,
                    },
                  }
                : s
            );
            if (!cleared) setPhotoOpen(false);
          }}
        />
      )}
    </>
  );
}
