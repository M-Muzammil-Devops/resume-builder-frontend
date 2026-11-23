/**
 * One photo-slot model for every template and renderer (canvas, preview, print/[id] PDF,
 * share page and the HTML export). A template has exactly ONE header slot: the photo when
 * uploaded, otherwise its monogram (if it has one), otherwise an "Add photo" placeholder while
 * editing. The header "Photo" toggle shows or hides that same slot.
 */
export type PhotoStyle = "circle" | "rounded" | "square" | "portrait" | "rounded-portrait";

export type PhotoSlotInput = {
  /** Header setting "Photo" (merged with defaults). */
  photoOn: boolean;
  /** Already-sanitised image URL ("" / undefined when none). */
  photoUrl?: string | null;
  photoStyle?: PhotoStyle | string | null;
  headerStyle?: string | null;
  photoPosition?: string | null;
  /** Template draws initials in the slot when there is no photo (Emerald Numbered). */
  monogram?: boolean;
  fullName?: string | null;
  /** Editor: an empty slot shows the "Add photo" placeholder. */
  editing?: boolean;
};

export type PhotoSlotSpec = {
  kind: "photo" | "monogram" | "placeholder" | "none";
  position: "left" | "right" | "top";
  width: number;
  height: number;
  /** CSS border-radius value. */
  radius: string;
  initials: string;
  /** Font size that keeps the initials on one line inside the slot. */
  initialsFontSize: number;
};

/** "Marcus Miller" -> "MM"; markup and extra words ignored; at most two letters. */
export function initialsOf(fullName: string | null | undefined): string {
  const words = String(fullName || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((w) => (w.match(/[\p{L}\p{N}]/u)?.[0] || "").toUpperCase()).join("");
}

export function photoRadius(style: string | null | undefined): string {
  switch (style) {
    case "square":
    case "portrait":
      return "6px";
    case "rounded":
      return "16px";
    case "rounded-portrait":
      return "12px";
    default:
      return "50%";
  }
}

/** Same-origin sample headshots that ship with landing templates (public/templates/photos). */
export const SAMPLE_PHOTO_PREFIX = "/templates/photos/";
export const SAMPLE_PHOTO_PATTERN = /^\/templates\/photos\/[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/;

/** True for a template's sample headshot (not a photo the user uploaded). */
export function isSamplePhoto(url: unknown): boolean {
  return typeof url === "string" && SAMPLE_PHOTO_PATTERN.test(url.trim());
}

export function resolvePhotoSlot(input: PhotoSlotInput): PhotoSlotSpec {
  const style = input.photoStyle || "circle";
  const portrait = style === "portrait" || style === "rounded-portrait";
  const monogram = Boolean(input.monogram);
  const width = portrait ? (monogram ? 60 : 78) : monogram ? 72 : 88;
  const height = portrait ? (monogram ? 80 : 104) : width;
  const initials = initialsOf(input.fullName);
  const position: PhotoSlotSpec["position"] =
    input.headerStyle === "centered" ? "top" : input.photoPosition === "right" ? "right" : input.photoPosition === "left" ? "left" : "left";
  const url = typeof input.photoUrl === "string" ? input.photoUrl.trim() : "";
  let kind: PhotoSlotSpec["kind"] = "none";
  if (input.photoOn) {
    if (url) kind = "photo";
    else if (monogram && initials) kind = "monogram";
    else if (input.editing) kind = "placeholder";
  }
  // Two letters take ~1.3em with a little tracking: keep them well inside the slot.
  const initialsFontSize = Math.round(Math.min(width, height) * (initials.length > 1 ? 0.36 : 0.46));
  return { kind, position, width, height, radius: photoRadius(style), initials, initialsFontSize };
}
