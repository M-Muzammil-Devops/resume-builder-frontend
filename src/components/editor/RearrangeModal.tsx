"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  AlertTriangle,
  ArrowDown,
  Columns2,
  Rows3,
  ArrowLeftRight,
  ArrowUp,
  GripVertical,
  Lock,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { buildPageMap, freePercent, sharePercent, type PageMap, type PageSegment } from "@/lib/pageMap";
import { isLetterPage, isSingleColumnLayout, resolveColumns } from "@/shared";
import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import {
  applyDraft,
  draftFrom,
  finishRearrange,
  layoutDraft,
  presetFor,
  resetDraft,
  type CloseAction,
  type RearrangeDraft,
} from "@/lib/rearrangeDraft";
import { useEditorStore } from "@/store/editorStore";

const TEAL = "#00788a";
const SHEET_GAP = 36;
type Col = "left" | "right";
type DropTarget =
  | { kind: "seg"; sid: string; page: number; after: boolean }
  | { kind: "zone"; col: Col; page: number };

type Measured = { map: PageMap; live: boolean };

function prettyLabel(raw: string) {
  let t = raw.replace(/[_-]+/g, " ").trim();
  // Templates often store headings in caps ("KEY ACHIEVEMENTS"); show them as "Key achievements".
  if (t && t === t.toUpperCase()) t = t.toLowerCase();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Section";
}

function columnShare(layout: string, single: boolean): { left: number; right: number } {
  if (single) return { left: 100, right: 0 };
  if (layout === "wide-left") return { left: 62, right: 38 };
  if (layout === "wide-right") return { left: 38, right: 62 };
  return { left: 50, right: 50 };
}

/**
 * BUG-1291: measure a hidden, read-only (print-equivalent) render of the draft — no edit hints,
 * same page size, margins and pagination (separatePages) the canvas and print view use.
 */
function measurePrintLayout(root: HTMLElement | null, pad: number, letter: boolean): Measured | null {
  const page = root?.querySelector<HTMLElement>(".resume-page");
  if (!page) return null;
  const rect = page.getBoundingClientRect();
  const scale = page.offsetHeight ? rect.height / page.offsetHeight : 0;
  if (!scale || !Number.isFinite(scale)) return null;
  const pagePx = parseFloat(getComputedStyle(page).minHeight) || (letter ? 1056 : 1123);
  const items = [...page.querySelectorAll<HTMLElement>(".rb-section-hit[data-section-id], .rb-section-hit[data-rb-sid]")]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.dataset.sectionId || el.dataset.rbSid || "",
        top: (r.top - rect.top) / scale,
        height: r.height / scale,
      };
    })
    .filter((m) => m.id && m.height > 0);
  if (!items.length) return null;
  const sheets = page.parentElement?.querySelectorAll(".resume-sheet").length || 1;
  return { map: buildPageMap(items, { pagePx, gap: SHEET_GAP, pad }, sheets), live: true };
}

/** Fallback when the canvas isn't measurable (e.g. hidden on a narrow screen). */
function estimate(ids: string[][], headerId: string | undefined): Measured {
  const segments: PageSegment[] = [];
  const base = headerId ? 0.12 : 0;
  if (headerId) {
    segments.push({ id: headerId, page: 0, offset: 0, fraction: 0.1, continuedFromPrev: false, continuesOnNext: false });
  }
  let used = base;
  for (const col of ids) {
    let y = base;
    for (const id of col) {
      segments.push({ id, page: 0, offset: y, fraction: 0.1, continuedFromPrev: false, continuesOnNext: false });
      y += 0.11;
    }
    used = Math.max(used, y);
  }
  return { map: { pages: 1, segments, used: [Math.min(1, used)] }, live: false };
}

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const seg = hits.filter((h) => String(h.id).startsWith("seg|"));
  if (seg.length) return seg;
  if (hits.length) return hits;
  return rectIntersection(args);
};

function SegmentBox({
  seg,
  label,
  col,
  locked,
  selected,
  dragging,
  indicator,
  onSelect,
  onKey,
  style,
}: {
  seg: PageSegment;
  label: string;
  col: Col | "full";
  locked: boolean;
  selected: boolean;
  dragging: boolean;
  indicator: "before" | "after" | null;
  onSelect: () => void;
  onKey: (e: React.KeyboardEvent) => void;
  style: React.CSSProperties;
}) {
  const dragId = `drag|${seg.id}|${seg.page}`;
  const drag = useDraggable({ id: dragId, disabled: locked, data: { sid: seg.id } });
  const drop = useDroppable({ id: `seg|${seg.id}|${seg.page}`, disabled: locked, data: { sid: seg.id, page: seg.page } });
  const pct = sharePercent(seg.fraction);
  const setRef = (node: HTMLElement | null) => {
    drag.setNodeRef(node);
    drop.setNodeRef(node);
  };
  const where = col === "full" ? "full width" : `${col} column`;
  return (
    <div
      ref={setRef}
      {...(locked ? {} : drag.listeners)}
      onClick={locked ? undefined : onSelect}
      style={{
        ...style,
        ...(seg.continuedFromPrev ? { borderTopStyle: "dashed" as const } : {}),
        ...(seg.continuesOnNext ? { borderBottomStyle: "dashed" as const } : {}),
      }}
      className={`absolute overflow-hidden rounded-[5px] border text-[10px] leading-tight transition-[top,height,left,width,opacity] duration-300 ease-out motion-reduce:transition-none ${
        locked
          ? "border-slate-200 bg-slate-100 text-slate-500"
          : `cursor-grab touch-none border-[#b7dfe4] bg-[#e6f4f6] text-[#0b4f59] hover:border-[#00788a] active:cursor-grabbing ${
              selected ? "ring-2 ring-[#00788a] ring-offset-1" : ""
            }`
      } ${dragging ? "opacity-30" : ""} ${seg.continuedFromPrev ? "rounded-t-none" : ""} ${seg.continuesOnNext ? "rounded-b-none" : ""}`}
    >
      {indicator === "before" && <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[#00788a]" aria-hidden />}
      {indicator === "after" && <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-[#00788a]" aria-hidden />}
      <div className="flex h-full min-h-0 items-start gap-1 px-1 py-[3px]">
        {locked ? (
          <Lock size={10} className="mt-[1px] shrink-0 text-slate-400" aria-hidden />
        ) : (
          <button
            type="button"
            ref={drag.setActivatorNodeRef}
            {...drag.attributes}
            data-grip={seg.id}
            data-grip-page={seg.page}
            onKeyDown={onKey}
            onFocus={onSelect}
            aria-label={`${label}: page ${seg.page + 1}, ${pct}% of page, ${where}. Arrow keys move it.`}
            className="-m-[2px] shrink-0 rounded p-[2px] text-[#00788a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00788a]"
          >
            <GripVertical size={10} aria-hidden />
          </button>
        )}
        <span className="min-w-0 flex-1">
          {seg.continuedFromPrev && <span className="block truncate text-[9px] italic opacity-80">↳ continued</span>}
          <span className="block truncate font-semibold">
            {label} <span className="font-normal opacity-80">· {pct}%</span>
          </span>
        </span>
      </div>
      {seg.continuesOnNext && (
        <span className="pointer-events-none absolute bottom-[2px] right-1 text-[9px] italic opacity-80">continues ↓</span>
      )}
    </div>
  );
}

function ColumnZone({
  col,
  page,
  style,
  empty,
  active,
}: {
  col: Col;
  page: number;
  style: React.CSSProperties;
  empty: boolean;
  active: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `zone|${col}|${page}`, data: { col, page } });
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`absolute rounded-md transition-colors ${
        active ? "bg-[#00788a]/10 outline outline-2 outline-dashed outline-[#00788a]/60" : empty ? "outline outline-1 outline-dashed outline-slate-300" : ""
      }`}
    >
      {empty && (
        <span className="pointer-events-none flex h-full items-center justify-center text-center text-[10px] text-slate-400">
          Drop here
        </span>
      )}
    </div>
  );
}

export function RearrangeModal() {
  const storeDoc = useEditorStore((s) => s.document);
  const commitDocument = useEditorStore((s) => s.commitDocument);
  const setModal = useEditorStore((s) => s.setModal);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // BUG-1292/1293: everything edits this draft; only Save writes to the resume.
  const [draft, setDraft] = useState<RearrangeDraft | null>(() => (storeDoc ? draftFrom(storeDoc) : null));
  const document = useMemo(() => (storeDoc && draft ? applyDraft(storeDoc, draft) : storeDoc), [storeDoc, draft]);
  const measureRef = useRef<HTMLDivElement>(null);

  const [measured, setMeasured] = useState<Measured | null>(null);
  const [activeSid, setActiveSid] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const pendingFocus = useRef<string | null>(null);

  const design = document?.design;
  const letter = isLetterPage(design?.pageSize);
  const pad = design ? Math.round(48 + (Math.min(8, Math.max(0, design.pageMargins)) / 8) * 48) : 72;
  const cols = useMemo(
    () => (document ? resolveColumns(document.content, document.design.columnLayout) : { left: [], right: [] }),
    [document]
  );
  // Same rule the canvas, PDF and exports use — the modal shows exactly what renders.
  const single = !document || isSingleColumnLayout(document.layoutKey, design?.columnLayout, cols.right.length);
  const share = columnShare(design?.columnLayout || "equal", single);
  const header = document?.content.sections.find((s) => s.type === "header");
  const headerId = header?.id;
  const labels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of document?.content.sections ?? []) {
      if (s.type === "header") out[s.id] = "Header";
      else out[s.id] = prettyLabel("title" in s && typeof s.title === "string" && s.title ? s.title : s.type);
    }
    return out;
  }, [document]);

  const colOf = useCallback(
    (sid: string): Col | "full" => {
      if (sid === headerId) return "full";
      if (single) return "left";
      return cols.right.includes(sid) ? "right" : "left";
    },
    [cols, headerId, single]
  );

  // ---- live measurement --------------------------------------------------
  const remeasure = useCallback(() => {
    const next = measurePrintLayout(measureRef.current, pad, letter) ?? estimate(single ? [[...cols.left, ...cols.right]] : [cols.left, cols.right], headerId);
    setMeasured(next);
  }, [pad, letter, single, cols, headerId]);

  useLayoutEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(remeasure);
    });
    const late = window.setTimeout(remeasure, 320);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(late);
    };
  }, [document, remeasure]);

  useEffect(() => {
    const page = measureRef.current?.querySelector<HTMLElement>(".resume-page");
    if (!page || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => remeasure());
    ro.observe(page);
    void window.document.fonts?.ready.then(remeasure);
    return () => ro.disconnect();
  }, [remeasure]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = window.document.querySelector<HTMLElement>(`[data-grip="${CSS.escape(pendingFocus.current)}"]`);
    if (el) {
      el.focus();
      pendingFocus.current = null;
    }
  }, [measured]);

  // ---- ordering helpers --------------------------------------------------
  const firstPage = useCallback(
    (sid: string) => {
      const seg = measured?.map.segments.find((s) => s.id === sid);
      return seg ? seg.page : 0;
    },
    [measured]
  );

  const commit = useCallback(
    (left: string[], right: string[], message: string, focusSid?: string) => {
      setDraft((d) =>
        d ? (single ? { ...d, left: [...left, ...right], right: [] } : { ...d, left: [...left], right: [...right] }) : d
      );
      if (focusSid) pendingFocus.current = focusSid;
      setAnnounce(message);
    },
    [single]
  );

  const lists = useCallback((): { left: string[]; right: string[] } => {
    if (single) return { left: [...cols.left, ...cols.right], right: [] };
    return { left: [...cols.left], right: [...cols.right] };
  }, [cols, single]);

  const moveTo = useCallback(
    (sid: string, t: DropTarget) => {
      const l = lists();
      const fromCol: Col = l.right.includes(sid) ? "right" : "left";
      const before = JSON.stringify(l);
      l[fromCol] = l[fromCol].filter((x) => x !== sid);
      let toCol: Col;
      let index: number;
      if (t.kind === "seg") {
        if (t.sid === sid) return;
        toCol = l.right.includes(t.sid) ? "right" : "left";
        index = l[toCol].indexOf(t.sid) + (t.after ? 1 : 0);
      } else {
        toCol = single ? "left" : t.col;
        index = l[toCol].filter((x) => firstPage(x) <= t.page).length;
      }
      l[toCol].splice(Math.max(0, index), 0, sid);
      if (JSON.stringify(l) === before) return;
      commit(l.left, l.right, `${labels[sid] ?? "Section"} moved${toCol !== fromCol ? ` to the ${toCol} column` : ""}.`);
    },
    [lists, single, firstPage, commit, labels]
  );

  const step = useCallback(
    (sid: string, dir: "up" | "down" | "swap") => {
      const l = lists();
      const col: Col = l.right.includes(sid) ? "right" : "left";
      const arr = l[col];
      const i = arr.indexOf(sid);
      if (i < 0) return;
      if (dir === "swap") {
        if (single) return;
        const other: Col = col === "left" ? "right" : "left";
        l[col] = arr.filter((x) => x !== sid);
        l[other].splice(Math.min(i, l[other].length), 0, sid);
        commit(l.left, l.right, `${labels[sid]} moved to the ${other} column.`, sid);
        return;
      }
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) {
        setAnnounce(`${labels[sid]} is already at the ${dir === "up" ? "top" : "bottom"}.`);
        return;
      }
      [arr[i], arr[j]] = [arr[j], arr[i]];
      commit(l.left, l.right, `${labels[sid]} moved ${dir}.`, sid);
    },
    [lists, single, commit, labels]
  );

  const onKey = (sid: string) => (e: React.KeyboardEvent) => {
    const map: Record<string, "up" | "down" | "swap" | undefined> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: single ? undefined : colOf(sid) === "right" ? "swap" : undefined,
      ArrowRight: single ? undefined : colOf(sid) === "left" ? "swap" : undefined,
    };
    const dir = map[e.key];
    if (e.key.startsWith("Arrow")) e.preventDefault();
    if (dir) step(sid, dir);
  };

  // ---- drag & drop -------------------------------------------------------
  const onDragStart = (e: DragStartEvent) => {
    const sid = (e.active.data.current as { sid?: string } | undefined)?.sid ?? null;
    setActiveSid(sid);
    if (sid) setSelected(sid);
  };
  const onDragMove = (e: DragMoveEvent) => {
    const over = e.over;
    if (!over) return setTarget(null);
    const id = String(over.id);
    if (id.startsWith("seg|")) {
      const [, sid, page] = id.split("|");
      const r = e.active.rect.current.translated;
      const mid = r ? r.top + r.height / 2 : 0;
      const after = mid > over.rect.top + over.rect.height / 2;
      setTarget((t) =>
        t && t.kind === "seg" && t.sid === sid && t.after === after ? t : { kind: "seg", sid, page: Number(page), after }
      );
    } else if (id.startsWith("zone|")) {
      const [, col, page] = id.split("|");
      setTarget((t) =>
        t && t.kind === "zone" && t.col === col && t.page === Number(page) ? t : { kind: "zone", col: col as Col, page: Number(page) }
      );
    }
  };
  const onDragEnd = (_e: DragEndEvent) => {
    if (activeSid && target) moveTo(activeSid, target);
    setActiveSid(null);
    setTarget(null);
  };

  // ---- actions -----------------------------------------------------------
  const finish = useCallback(
    (action: CloseAction) => {
      const next = storeDoc && draft ? finishRearrange(action, storeDoc, draft) : null;
      if (next) commitDocument(next);
      setModal(null);
    },
    [storeDoc, draft, commitDocument, setModal]
  );
  const cancel = useCallback(() => finish("cancel"), [finish]);
  // EditorShell also closes modals on Esc; with a draft that is the same as Cancel (BUG-1292).
  useEscapeClose(useCallback(() => finish("escape"), [finish]));

  const preset = storeDoc ? presetFor(storeDoc) : undefined;
  const reset = () => {
    if (!storeDoc) return;
    const next = resetDraft(storeDoc);
    if (!next) return;
    setDraft(next);
    setAnnounce("Sections and layout reset to the template default. Save to keep it.");
  };

  /** Layout toggle (draft only): Save applies it to canvas, preview, PDF and exports. */
  const setLayout = (next: "single" | "two") => {
    if (!storeDoc || !draft || (next === "single") === single) return;
    setDraft(layoutDraft(storeDoc, draft, next));
    setAnnounce(next === "single" ? "Layout: one column." : "Layout: two columns. Side sections moved to the right column.");
  };

  if (!document) return null;

  const map = measured?.map;
  const pages = map?.pages ?? 1;
  const lastUsed = map ? map.used[pages - 1] : 0;
  const pageRatio = letter ? "8.5 / 11" : "210 / 297";
  const pageWpx = letter ? 816 : 794;
  const padX = (pad / pageWpx) * 100;
  const padY = (pad / (letter ? 1056 : 1123)) * 100;
  const gapPct = single ? 0 : 3;

  const colRect = (col: Col | "full"): { left: string; width: string } => {
    if (col === "full" || single) return { left: "0%", width: "100%" };
    return col === "left"
      ? { left: "0%", width: `${share.left - gapPct / 2}%` }
      : { left: `${share.left + gapPct / 2}%`, width: `${share.right - gapPct / 2}%` };
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-slate-900/50 sm:items-center sm:p-4">
      {/* Print-equivalent render of the draft, used only for measuring pages (BUG-1291). */}
      <div
        ref={measureRef}
        aria-hidden
        className="rb-print-measure pointer-events-none fixed left-[-30000px] top-0 overflow-hidden"
        style={{ visibility: "hidden" }}
        inert
      >
        <ResumeCanvas readOnly documentOverride={document ?? undefined} />
      </div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rearrange-title"
        aria-describedby="rearrange-help"
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="rearrange-title" className="text-base font-semibold text-slate-900 sm:text-lg">
              Rearrange sections
            </h2>
            <p id="rearrange-help" className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Drag a box (or focus it and use the arrow keys) to move it. Box height = space it takes on the page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => finish("close")}
            aria-label="Close without saving"
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00788a]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600 sm:px-6">
          <span className="font-semibold text-slate-800">
            {pages} {pages === 1 ? "page" : "pages"} · {letter ? "US Letter" : "A4"}
          </span>
          <div role="radiogroup" aria-label="Layout" className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
            {([
              ["single", "Single column", Rows3],
              ["two", "Two columns", Columns2],
            ] as const).map(([key, text, Icon]) => {
              const on = (key === "single") === single;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setLayout(key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00788a] ${
                    on ? "text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                  style={on ? { background: TEAL } : undefined}
                >
                  <Icon size={12} aria-hidden /> {text}
                </button>
              );
            })}
          </div>
          {!single && <span>{share.left}/{share.right} split</span>}
          {measured && !measured.live && <span className="text-amber-700">Approximate sizes (open the editor canvas for live sizes)</span>}
        </div>

        {pages > 1 && (
          <div role="status" className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:mx-6">
            <AlertTriangle size={14} className="mt-[1px] shrink-0" aria-hidden />
            <span>
              Content runs onto page {pages} ({Math.round(lastUsed * 100)}% full).
              {lastUsed < 0.35 ? ` Move or shorten sections to fit on ${pages - 1} ${pages - 1 === 1 ? "page" : "pages"}.` : ""}
            </span>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveSid(null);
            setTarget(null);
          }}
        >
          <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center">
              {Array.from({ length: pages }, (_, p) => {
                const segs = (map?.segments ?? []).filter((s) => s.page === p);
                const used = map?.used[p] ?? 0;
                const colsHere: Col[] = single ? ["left"] : ["left", "right"];
                const headerBottom = segs
                  .filter((s) => s.id === headerId)
                  .reduce((m, s) => Math.max(m, s.offset + s.fraction), 0);
                return (
                  <section key={p} aria-label={`Page ${p + 1}`} className="w-full max-w-[300px] shrink-0">
                    <div className="mb-1.5 flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-slate-800">Page {p + 1}</span>
                      <span className={freePercent(used) < 5 ? "font-medium text-amber-700" : "text-slate-500"}>
                        {freePercent(used)}% free
                      </span>
                    </div>
                    <div
                      className="relative w-full rounded-sm bg-white shadow-[0_2px_10px_rgba(15,23,42,0.14)] ring-1 ring-slate-200"
                      style={{ aspectRatio: pageRatio }}
                    >
                      <div
                        className="absolute"
                        style={{ top: `${padY}%`, bottom: `${padY}%`, left: `${padX}%`, right: `${padX}%` }}
                      >
                        {colsHere.map((col) => {
                          const empty = !segs.some((s) => s.id !== headerId && colOf(s.id) === col);
                          const top = p === 0 ? headerBottom : 0;
                          return (
                            <ColumnZone
                              key={col}
                              col={col}
                              page={p}
                              empty={empty}
                              active={Boolean(activeSid && target?.kind === "zone" && target.col === col && target.page === p)}
                              style={{ top: `${top * 100}%`, bottom: 0, ...colRect(col) }}
                            />
                          );
                        })}
                        {segs.map((seg) => {
                          const col = colOf(seg.id);
                          const locked = seg.id === headerId;
                          const isTarget = Boolean(activeSid && target?.kind === "seg" && target.sid === seg.id && target.page === p);
                          return (
                            <SegmentBox
                              key={`${seg.id}|${p}`}
                              seg={seg}
                              label={labels[seg.id] ?? "Section"}
                              col={col}
                              locked={locked}
                              selected={selected === seg.id}
                              dragging={activeSid === seg.id}
                              indicator={isTarget ? (target?.kind === "seg" && target.after ? "after" : "before") : null}
                              onSelect={() => setSelected(seg.id)}
                              onKey={onKey(seg.id)}
                              style={{
                                top: `${seg.offset * 100}%`,
                                height: `${seg.fraction * 100}%`,
                                minHeight: 16,
                                ...colRect(col),
                              }}
                            />
                          );
                        })}
                      </div>
                      {p < pages - 1 && (
                        <div
                          className="pointer-events-none absolute inset-x-2 flex items-center gap-1 text-[9px] uppercase tracking-wide text-rose-500"
                          style={{ bottom: `${Math.max(0.5, padY / 2 - 1.2)}%` }}
                          aria-hidden
                        >
                          <span className="h-px flex-1 border-t border-dashed border-rose-300" />
                          page break
                          <span className="h-px flex-1 border-t border-dashed border-rose-300" />
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
          {(() => {
            const placed = new Set((map?.segments ?? []).map((x) => x.id));
            const unplaced = [...cols.left, ...cols.right].filter((id) => !placed.has(id));
            if (!measured?.live || !unplaced.length) return null;
            return (
              <div className="mx-4 mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 sm:mx-6">
                <span>Empty, not printed:</span>
                {unplaced.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelected(id)}
                    className={`rounded-full border px-2 py-0.5 ${selected === id ? "border-[#00788a] text-[#00788a]" : "border-slate-300"}`}
                  >
                    {labels[id] ?? "Section"}
                  </button>
                ))}
              </div>
            );
          })()}
          <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
            {activeSid ? (
              <div className="rounded-md border border-[#00788a] bg-white px-3 py-1.5 text-xs font-semibold text-[#0b4f59] shadow-xl">
                {labels[activeSid] ?? "Section"}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="border-t border-slate-200 bg-white px-4 py-2.5 sm:px-6">
          {selected && selected !== headerId && labels[selected] ? (
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs" role="toolbar" aria-label={`Move ${labels[selected]}`}>
              <span className="mr-1 font-semibold text-slate-700">{labels[selected]}:</span>
              <button type="button" onClick={() => step(selected, "up")} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 hover:border-[#00788a] hover:text-[#00788a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00788a]">
                <ArrowUp size={12} aria-hidden /> Move up
              </button>
              <button type="button" onClick={() => step(selected, "down")} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 hover:border-[#00788a] hover:text-[#00788a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00788a]">
                <ArrowDown size={12} aria-hidden /> Move down
              </button>
              {!single && (
                <button type="button" onClick={() => step(selected, "swap")} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 hover:border-[#00788a] hover:text-[#00788a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00788a]">
                  <ArrowLeftRight size={12} aria-hidden /> Move to {colOf(selected) === "left" ? "right" : "left"} column
                </button>
              )}
            </div>
          ) : (
            <p className="mb-2 text-xs text-slate-500">Tip: tap a section to see move options. The header stays at the top.</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={!preset}
              title={preset ? "Restore the template's original section order" : "No default order for this template"}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-slate-600 hover:text-[#00788a] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00788a]"
            >
              <RotateCcw size={14} aria-hidden /> Reset to template default
            </button>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00788a]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => finish("save")}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00788a] focus-visible:ring-offset-2"
                style={{ background: TEAL }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>
    </div>
  );
}
