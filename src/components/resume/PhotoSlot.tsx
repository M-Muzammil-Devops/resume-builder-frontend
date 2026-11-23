"use client";

import { CloudUpload, EyeOff, Trash2, User } from "lucide-react";
import clsx from "clsx";
import { isSamplePhoto, type PhotoSlotSpec } from "@/shared";

/**
 * The template's single header photo slot (photo, monogram or "Add photo" placeholder).
 * In the editor the whole slot opens the upload dialog; Replace / Remove / Hide sit on it.
 * Read-only renderers (preview, share page, print/[id] PDF) get the same box and position.
 */
export function PhotoSlot({
  spec,
  photoUrl,
  accent,
  ringColor,
  readOnly,
  selected,
  onUpload,
  onRemove,
  onHide,
}: {
  spec: PhotoSlotSpec;
  photoUrl?: string;
  /** Monogram background (template accent). */
  accent: string;
  /** Photo Style colour — ring around the slot. */
  ringColor: string;
  readOnly?: boolean;
  selected?: boolean;
  onUpload?: () => void;
  onRemove?: () => void;
  onHide?: () => void;
}) {
  if (spec.kind === "none") return null;
  const editing = !readOnly;
  const hasPhoto = spec.kind === "photo";
  return (
    <div
      className={clsx(
        "rb-photo-slot group/photo relative shrink-0 overflow-hidden transition-[border-radius,width,height] duration-200",
        spec.kind === "placeholder" && "rb-photo-empty bg-[#d5d8dd]",
        spec.kind === "photo" && "bg-[#d5d8dd]"
      )}
      data-photo-kind={spec.kind}
      data-photo-position={spec.position}
      style={{
        width: spec.width,
        height: spec.height,
        borderRadius: spec.radius,
        boxShadow: `0 0 0 2px ${ringColor}33`,
        ...(spec.kind === "monogram" ? { background: accent } : {}),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : spec.kind === "monogram" ? (
        <span
          className="rb-monogram flex h-full w-full items-center justify-center font-bold text-white"
          style={{
            fontSize: spec.initialsFontSize,
            lineHeight: 1,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            overflowWrap: "normal",
            wordBreak: "keep-all",
          }}
          aria-hidden
        >
          {spec.initials}
        </span>
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <User size={Math.round(spec.width * 0.38)} className="text-[#a8b0bb]" strokeWidth={1.2} />
          <span className="px-1 text-center text-[10px] font-semibold leading-tight text-[#4b5563]">Add photo</span>
        </span>
      )}

      {editing && hasPhoto && isSamplePhoto(photoUrl) && (
        <span
          className="rb-editor-only pointer-events-none absolute inset-x-0 top-1 mx-auto w-fit rounded bg-slate-900/70 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-white"
          title="Sample photo: click to replace it with yours, or remove it"
        >
          Sample
        </span>
      )}
      {editing && onUpload && (
        <button
          type="button"
          onClick={onUpload}
          aria-label={hasPhoto ? "Replace photo" : "Upload photo"}
          title={hasPhoto ? "Replace photo" : "Upload photo"}
          className="rb-editor-only absolute inset-0 cursor-pointer bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00788a]"
        />
      )}
      {editing && (
        <div
          className={clsx(
            "rb-editor-only pointer-events-none absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover/photo:opacity-100 group-focus-within/photo:opacity-100",
            selected && "opacity-100"
          )}
        >
          {onUpload && (
            <button
              type="button"
              title={hasPhoto ? "Replace photo" : "Upload photo"}
              aria-label={hasPhoto ? "Replace photo" : "Upload photo"}
              onClick={onUpload}
              className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-md bg-[#5aaa7a] text-white shadow"
            >
              <CloudUpload size={12} />
            </button>
          )}
          {hasPhoto && onRemove && (
            <button
              type="button"
              title="Remove photo"
              aria-label="Remove photo"
              onClick={onRemove}
              className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-md bg-[#e35d5d] text-white shadow"
            >
              <Trash2 size={12} />
            </button>
          )}
          {onHide && (
            <button
              type="button"
              title="Hide photo"
              aria-label="Hide photo"
              onClick={onHide}
              className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-md bg-slate-700/85 text-white shadow"
            >
              <EyeOff size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
