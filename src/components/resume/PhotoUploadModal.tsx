"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Image as ImageIcon,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { fittedSize } from "@/lib/phase4Logic";
import type { HeaderSettings } from "@/shared";

type PhotoStyle = HeaderSettings["photoStyle"];

type Props = {
  currentUrl?: string;
  currentStyle?: PhotoStyle;
  onClose: () => void;
  onSave: (dataUrl: string | undefined, style: PhotoStyle) => void;
};

type ShapeOpt = {
  id: PhotoStyle;
  label: string;
  /** Crop box aspect width / height */
  aspect: number;
};

const SHAPES: ShapeOpt[] = [
  { id: "circle", label: "Circle", aspect: 1 },
  { id: "square", label: "Square", aspect: 1 },
  { id: "rounded", label: "Rounded square", aspect: 1 },
  { id: "portrait", label: "Portrait", aspect: 3 / 4 },
  { id: "rounded-portrait", label: "Rounded portrait", aspect: 3 / 4 },
];

const VIEW_W = 420;
const VIEW_H = 280;
const OUT = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function cropSize(aspect: number, viewW: number, viewH: number) {
  const maxW = Math.max(80, viewW - 48);
  const maxH = Math.max(80, viewH - 36);
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { w, h, left: (viewW - w) / 2, top: (viewH - h) / 2 };
}

async function compressImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const fitted = fittedSize(bitmap.width, bitmap.height, 1600);
    const large =
      fitted.width !== bitmap.width || fitted.height !== bitmap.height || file.size > 1_500_000;
    if (!large) return URL.createObjectURL(file);
    const canvas = document.createElement("canvas");
    canvas.width = fitted.width;
    canvas.height = fitted.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read image.");
    ctx.drawImage(bitmap, 0, 0, fitted.width, fitted.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.82);
    });
    if (!blob) throw new Error("Could not read image.");
    return URL.createObjectURL(blob);
  } finally {
    bitmap.close?.();
  }
}

function coverScale(nw: number, nh: number, cropW: number, cropH: number) {
  return Math.max(cropW / nw, cropH / nh);
}

function clampOffset(
  ox: number,
  oy: number,
  nw: number,
  nh: number,
  zoom: number,
  cropW: number,
  cropH: number
) {
  const scale = coverScale(nw, nh, cropW, cropH) * zoom;
  const w = nw * scale;
  const h = nh * scale;
  const maxX = Math.max(0, (w - cropW) / 2);
  const maxY = Math.max(0, (h - cropH) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, ox)),
    y: Math.min(maxY, Math.max(-maxY, oy)),
  };
}

function maskRadius(style: PhotoStyle, cropW: number, cropH: number): string {
  switch (style) {
    case "circle":
      return "9999px";
    case "rounded":
      return "18%";
    case "rounded-portrait":
      return `${Math.round(Math.min(cropW, cropH) * 0.12)}px`;
    case "square":
    case "portrait":
    default:
      return "0px";
  }
}

export function PhotoUploadModal({
  currentUrl,
  currentStyle = "circle",
  onClose,
  onSave,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );

  const [src, setSrc] = useState<string | undefined>(currentUrl);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [style, setStyle] = useState<PhotoStyle>(currentStyle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const askedForFile = useRef(false);
  const [entered, setEntered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState({ w: VIEW_W, h: VIEW_H });
  const [vp, setVp] = useState({ w: VIEW_W + 140, h: 720 });

  useEscapeClose(onClose);

  useEffect(() => {
    setMounted(true);
    const id = requestAnimationFrame(() => setEntered(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const syncVp = () => {
      const vv = window.visualViewport;
      setVp({
        w: Math.max(280, Math.round(vv?.width ?? window.innerWidth)),
        h: Math.max(320, Math.round(vv?.height ?? window.innerHeight)),
      });
    };
    syncVp();
    window.visualViewport?.addEventListener("resize", syncVp);
    window.visualViewport?.addEventListener("scroll", syncVp);
    window.addEventListener("resize", syncVp);
    return () => {
      window.visualViewport?.removeEventListener("resize", syncVp);
      window.visualViewport?.removeEventListener("scroll", syncVp);
      window.removeEventListener("resize", syncVp);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || askedForFile.current) return;
    askedForFile.current = true;
    if (!currentUrl) {
      const t = window.setTimeout(() => inputRef.current?.click(), 280);
      return () => window.clearTimeout(t);
    }
  }, [mounted, currentUrl]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const sync = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setView({ w: r.width, h: r.height });
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted, vp.w, vp.h]);

  const crop = useMemo(() => {
    const opt = SHAPES.find((s) => s.id === style) || SHAPES[0];
    return cropSize(opt.aspect, view.w, view.h);
  }, [style, view.w, view.h]);

  useEffect(() => {
    if (!src) {
      setNatural(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const img = await loadImage(src);
        if (cancelled) return;
        imgElRef.current = img;
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      } catch {
        if (!cancelled) {
          setNatural(null);
          imgElRef.current = null;
          setError("Could not read that image. Try a different file.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  const layout = useMemo(() => {
    if (!natural) return null;
    const scale = coverScale(natural.w, natural.h, crop.w, crop.h) * zoom;
    const w = natural.w * scale;
    const h = natural.h * scale;
    const x = crop.left + (crop.w - w) / 2 + offset.x;
    const y = crop.top + (crop.h - h) / 2 + offset.y;
    return { w, h, x, y, scale };
  }, [natural, zoom, offset, crop]);

  const setZoomClamped = useCallback(
    (z: number) => {
      const next = Math.min(3, Math.max(1, Number(z.toFixed(3))));
      setZoom(next);
      if (natural) {
        setOffset((o) =>
          clampOffset(o.x, o.y, natural.w, natural.h, next, crop.w, crop.h)
        );
      }
    },
    [natural, crop.w, crop.h]
  );

  async function onFile(file: File | null) {
    if (!file) return;
    const allowed = file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
    if (!allowed || /\.svg$/i.test(file.name) || file.size > 8 * 1024 * 1024) {
      setError(file.size > 8 * 1024 * 1024 ? "Image must be 8 MB or smaller." : "Choose a JPEG, PNG, or WebP image. SVG files are blocked.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const prepared = await compressImageFile(file);
      setSrc((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return prepared;
      });
    } catch {
      setError("Could not read that image. Try a smaller file.");
    } finally {
      setBusy(false);
    }
  }

  function removePhoto() {
    setSrc((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return undefined;
    });
    setNatural(null);
    imgElRef.current = null;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
    onSave(undefined, style);
  }

  function accept() {
    const img = imgElRef.current;
    if (!img || !natural || !layout) return;

    const { scale, x, y } = layout;
    const sx = (crop.left - x) / scale;
    const sy = (crop.top - y) / scale;
    const sW = crop.w / scale;
    const sH = crop.h / scale;

    const outW = OUT;
    const outH = Math.round(OUT / (crop.w / crop.h));
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, sx, sy, sW, sH, 0, 0, outW, outH);

    let dataUrl: string;
    try {
      dataUrl = out.toDataURL("image/webp", 0.92);
      if (!dataUrl.startsWith("data:image/webp")) {
        dataUrl = out.toDataURL("image/jpeg", 0.92);
      }
    } catch {
      dataUrl = out.toDataURL("image/jpeg", 0.92);
    }
    onSave(dataUrl, style);
  }

  const radius = maskRadius(style, crop.w, crop.h);

  if (!mounted) return null;

  return createPortal(
    <div
      className={clsx(
        "photo-manage-root",
        entered ? "photo-manage-root-in" : "photo-manage-root-out"
      )}
      style={
        {
          ["--photo-manage-vw"]: `${vp.w}px`,
          ["--photo-manage-vh"]: `${vp.h}px`,
        } as CSSProperties
      }
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={clsx(
          "photo-manage-panel overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(30,35,42,0.28)]",
          entered ? "photo-manage-panel-in" : "photo-manage-panel-out"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-photo-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="photo-manage-head flex shrink-0 items-center justify-between border-b border-[#eceef1] px-5 py-3.5">
          <h3
            id="manage-photo-title"
            className="text-[17px] font-bold text-[#3a2f5c]"
          >
            Manage Photo
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#9aa3ad] transition hover:bg-[#f1f3f5] hover:text-[#4b5563]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="photo-manage-body">
          <div
            className="photo-manage-stage relative mx-auto select-none overflow-hidden rounded-md bg-black"
            ref={stageRef}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              if (!src || !layout) return;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              dragRef.current = {
                x: e.clientX,
                y: e.clientY,
                ox: offset.x,
                oy: offset.y,
              };
            }}
            onPointerMove={(e) => {
              if (!dragRef.current || !natural) return;
              const nx = dragRef.current.ox + (e.clientX - dragRef.current.x);
              const ny = dragRef.current.oy + (e.clientY - dragRef.current.y);
              setOffset(
                clampOffset(nx, ny, natural.w, natural.h, zoom, crop.w, crop.h)
              );
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
          >
            {src && layout ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none transition-[left,top,width,height] duration-150 ease-out"
                style={{
                  width: layout.w,
                  height: layout.h,
                  left: layout.x,
                  top: layout.y,
                }}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-white/80">
                <span className="text-[15px] font-semibold">Add photo</span>
                <span className="text-[12px] text-white/50">
                  {busy ? "Resizing image…" : "JPEG, PNG, or WebP"}
                </span>
              </div>
            )}

            {/* Dim outside crop via large box-shadow */}
            <div
              className="pointer-events-none absolute transition-all duration-200 ease-out"
              style={{
                left: crop.left,
                top: crop.top,
                width: crop.w,
                height: crop.h,
                borderRadius: radius,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              }}
            />
            <div
              className="pointer-events-none absolute border border-white/80 transition-all duration-200 ease-out"
              style={{
                left: crop.left,
                top: crop.top,
                width: crop.w,
                height: crop.h,
                borderRadius: radius,
              }}
            />
          </div>

          <p className="photo-manage-hint text-center text-[12px] text-[#9aa3ad]">
            {src ? "Drag photo to reposition" : "Add photo"}
          </p>
          {natural && (natural.w < 200 || natural.h < 200) && (
            <p role="alert" className="text-center text-[12px] font-semibold text-amber-700">
              Low resolution ({natural.w}×{natural.h}). Use a photo at least 200×200 px.
            </p>
          )}
          {error && (
            <p role="alert" className="text-center text-[12px] font-semibold text-[#d45454]">
              {error}
            </p>
          )}

          <div className="photo-manage-controls flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="photo-manage-opts min-w-0 flex-1">
              <div>
                <div className="mb-2 text-[13px] font-semibold text-[#2c333c]">Zoom</div>
                <div className="flex items-center gap-2.5">
                  <ImageIcon size={14} className="shrink-0 text-[#9aa3ad]" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    disabled={!src}
                    aria-label="Zoom"
                    onChange={(e) => setZoomClamped(Number(e.target.value))}
                    className="photo-zoom-slider w-full"
                  />
                  <ImageIcon size={20} className="shrink-0 text-[#9aa3ad]" />
                </div>
              </div>

              <div>
                <div className="mb-2 text-[13px] font-semibold text-[#2c333c]">Shape</div>
                <div className="flex flex-wrap gap-2.5">
                  {SHAPES.map((s) => {
                    const active = style === s.id;
                    const r =
                      s.id === "circle"
                        ? "9999px"
                        : s.id === "rounded" || s.id === "rounded-portrait"
                          ? "6px"
                          : "2px";
                    const tall = s.aspect < 1;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStyle(s.id);
                          if (natural) {
                            setOffset((o) => {
                              const nextCrop = cropSize(s.aspect, view.w, view.h);
                              return clampOffset(
                                o.x,
                                o.y,
                                natural.w,
                                natural.h,
                                zoom,
                                nextCrop.w,
                                nextCrop.h
                              );
                            });
                          }
                        }}
                        className={clsx(
                          "group flex w-[72px] flex-col items-center gap-1 rounded-md px-1 py-1.5 transition",
                          active ? "bg-[#eef6ff]" : "hover:bg-[#f5f6f8]"
                        )}
                      >
                        <span
                          className={clsx(
                            "flex items-center justify-center border-2 transition",
                            tall ? "h-9 w-7" : "h-8 w-8",
                            active
                              ? "border-[#4b7bec] text-[#6b5b95]"
                              : "border-[#c5cad3] text-[#b0b7c0]"
                          )}
                          style={{
                            borderRadius: r,
                            background:
                              active && s.id === "circle"
                                ? "#c4b5fd"
                                : active
                                  ? "#ddd6fe"
                                  : "transparent",
                          }}
                        />
                        <span
                          className={clsx(
                            "text-center text-[10px] font-medium leading-tight",
                            active ? "text-[#4b7bec]" : "text-[#3a414a]"
                          )}
                        >
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-[168px]">
              <button
                type="button"
                disabled={!src || !layout || busy}
                onClick={accept}
                className="photo-save-btn inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-45"
              >
                <Check size={16} strokeWidth={2.5} />
                Save
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#6b5b95] bg-white px-3 py-2.5 text-sm font-semibold text-[#6b5b95] transition hover:bg-[#f7f5fb] disabled:opacity-60"
              >
                <ImagePlus size={15} />
                Replace Photo
              </button>
              <button
                type="button"
                disabled={!src && !currentUrl}
                onClick={removePhoto}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#f0b4b4] bg-white px-3 py-2.5 text-sm font-semibold text-[#d45454] transition hover:bg-[#fff5f5] disabled:opacity-45"
              >
                <Trash2 size={15} />
                Remove Photo
              </button>
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            void onFile(file);
          }}
        />
      </div>
    </div>,
    document.body
  );
}
