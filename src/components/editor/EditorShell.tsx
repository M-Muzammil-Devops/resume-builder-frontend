"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import {
  CheckCircle2,
  Download,
  Eye,
  LayoutTemplate,
  Link2,
  ListOrdered,
  Minus,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { ResumeCanvas } from "@/components/resume/ResumeCanvas";
import { TextFormatToolbar } from "@/components/resume/TextFormatToolbar";
import { ImproveTextPanel } from "@/components/editor/ImproveTextPanel";
import { AtsModal } from "@/components/editor/AtsModal";
import { RearrangeModal } from "@/components/editor/RearrangeModal";
import { TemplatesPanel } from "@/components/editor/TemplatesPanel";
import { DesignPanel } from "@/components/editor/DesignPanel";
import { AddSectionModal } from "@/components/editor/AddSectionModal";
import { PreviewModal } from "@/components/editor/PreviewModal";
import { SharePanel } from "@/components/editor/SharePanel";
import { DownloadModal } from "@/components/editor/DownloadModal";
import { ProfileMenu } from "@/components/editor/ProfileMenu";
import { GenerateLetterDialog } from "@/components/coverLetters/GenerateLetterDialog";
import { roleFromHeadline } from "@/lib/coverLetters";
import { Mail } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { fallbackResumeTitle, useEditorStore } from "@/store/editorStore";
import type { ResumeDocument } from "@/shared";

type Props = {
  documentId: string;
};

function sameResume(a: ResumeDocument, b: ResumeDocument) {
  return JSON.stringify({ ...a, updatedAt: "" }) === JSON.stringify({ ...b, updatedAt: "" });
}

export function EditorShell({ documentId }: Props) {
  // Named resumeDoc (not `document`) so the DOM global is never shadowed (BUG-917).
  const resumeDoc = useEditorStore((s) => s.document);
  const activePanel = useEditorStore((s) => s.activePanel);
  const modal = useEditorStore((s) => s.modal);
  const setActivePanel = useEditorStore((s) => s.setActivePanel);
  const setModal = useEditorStore((s) => s.setModal);
  const dirty = useEditorStore((s) => s.dirty);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const pastCount = useEditorStore((s) => s.past.length);
  const futureCount = useEditorStore((s) => s.future.length);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);
  const updateTitle = useEditorStore((s) => s.updateTitle);
  const setDocument = useEditorStore((s) => s.setDocument);
  const setSelectedSectionId = useEditorStore((s) => s.setSelectedSectionId);
  const setSelectedItemId = useEditorStore((s) => s.setSelectedItemId);
  const selectedItemId = useEditorStore((s) => s.selectedItemId);
  const canvasZoom = useEditorStore((s) => s.canvasZoom);
  const setCanvasZoom = useEditorStore((s) => s.setCanvasZoom);
  const editorToast = useEditorStore((s) => s.editorToast);
  const setEditorToast = useEditorStore((s) => s.setEditorToast);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersion = useRef(0);
  const inflight = useRef<AbortController | null>(null);
  const pauseAutosave = useRef(false);
  const canvasInnerRef = useRef<HTMLDivElement>(null);
  const [completing, setCompleting] = useState(false);
  const [letterDialog, setLetterDialog] = useState<"finalized" | "open" | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 794, h: 1123 });

  // BUG-1302: layout effects run before the first paint, so zoom, page size and the hint
  // strip are already final when the editor appears (no visible shift).
  useLayoutEffect(() => {
    const width = window.innerWidth;
    if (width <= 480) setCanvasZoom(0.45);
    else if (width <= 820) setCanvasZoom(0.8);
  }, [setCanvasZoom]);

  const closeOverlays = useCallback(() => {
    if (modal) setModal(null);
    else if (activePanel) setActivePanel(null);
    else if (selectedItemId) setSelectedItemId(null);
    else setSelectedSectionId(null);
  }, [
    modal,
    activePanel,
    selectedItemId,
    setModal,
    setActivePanel,
    setSelectedItemId,
    setSelectedSectionId,
  ]);

  useEscapeClose(closeOverlays);

  // Lock page scroll so browser zoom never clips the left sidebar off-screen
  useEffect(() => {
    const html = window.document.documentElement;
    const body = window.document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  // Click empty canvas / chrome (not a section/entry/toolbar) → unselect
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (
        t.closest(
          "[data-section-id], [data-entry-id], .rb-toolbar, .rb-entry-add, .editor-tools-nav, .editor-float-rail, .editor-side-panel, [role='dialog'], .rb-pop"
        )
      ) {
        return;
      }
      const { selectedSectionId, selectedItemId } = useEditorStore.getState();
      if (selectedSectionId || selectedItemId) {
        useEditorStore.setState({ selectedSectionId: null, selectedItemId: null });
      }
    }
    window.document.addEventListener("pointerdown", onPointerDown, true);
    return () => window.document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  useLayoutEffect(() => {
    const el = canvasInnerRef.current;
    if (!el) return;
    const sync = () => {
      setCanvasSize({
        w: Math.max(el.offsetWidth, 1),
        h: Math.max(el.offsetHeight, 1),
      });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [resumeDoc?.id, resumeDoc?.layoutKey, resumeDoc?.design.pageSize, resumeDoc?.design.columnLayout]);

  const saveNow = useCallback(async () => {
    const current = useEditorStore.getState().document;
    if (!current) return;
    const version = ++saveVersion.current;
    const snapshot = current;
    const title = fallbackResumeTitle(snapshot.title);

    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSaveStatus("error");
      setEditorToast("You're offline. Edits stay on this page and save when you reconnect.");
      return;
    }
    setSaveStatus("saving");
    try {
      const res = await apiFetch<{ resume: typeof current }>(`/resumes/${documentId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          templateId: snapshot.templateId,
          layoutKey: snapshot.layoutKey,
          content: snapshot.content,
          design: snapshot.design,
          isComplete: snapshot.isComplete,
        }),
        signal: controller.signal,
      });
      if (version !== saveVersion.current) return;
      const latest = useEditorStore.getState().document;
      if (!latest || !sameResume(latest, snapshot)) return;
      useEditorStore.setState({
        document: {
          ...latest,
          title,
          updatedAt: res.resume.updatedAt,
        },
        dirty: false,
        saveStatus: "saved",
      });
      try {
        localStorage.setItem(`rb-tab:${documentId}`, String(Date.now()));
      } catch {
        /* private mode can block storage */
      }
    } catch (err) {
      if (version !== saveVersion.current) return;
      if (err instanceof Error && err.name === "AbortError") return;
      const latest = useEditorStore.getState().document;
      if (!latest || !sameResume(latest, snapshot)) return;
      setSaveStatus("error");
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setEditorToast("You're offline. Edits stay on this page and save when you reconnect.");
      } else if (err instanceof ApiError && err.status === 401) {
        setEditorToast("Your session expired. Sign in again. The text on this page is still here.");
      }
    }
  }, [documentId, setEditorToast, setSaveStatus]);

  useEffect(() => {
    if (!resumeDoc || !dirty || pauseAutosave.current) return;

    if (timer.current) clearTimeout(timer.current);
    setSaveStatus("saving");
    timer.current = setTimeout(() => {
      void saveNow();
    }, 500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [resumeDoc, dirty, saveNow, setSaveStatus]);

  useEffect(() => {
    function flush() {
      window.dispatchEvent(new Event("rb-flush-fields"));
      if (useEditorStore.getState().dirty) void saveNow();
    }
    function onLeave(event: BeforeUnloadEvent) {
      flush();
      if (!useEditorStore.getState().dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function onHide() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [saveNow]);

  useLayoutEffect(() => {
    try {
      if (!localStorage.getItem("rb-editor-hint")) setShowHint(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function reconnect() {
      if (useEditorStore.getState().dirty) void saveNow();
    }
    function otherTab(event: StorageEvent) {
      if (event.key !== `rb-tab:${documentId}` || !event.newValue) return;
      setEditorToast("This resume changed in another tab. Refresh before more edits so you don't overwrite it.");
    }
    window.addEventListener("online", reconnect);
    window.addEventListener("storage", otherTab);
    return () => {
      window.removeEventListener("online", reconnect);
      window.removeEventListener("storage", otherTab);
    };
  }, [documentId, saveNow, setEditorToast]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.ctrlKey || event.metaKey;
      if (!meta) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [undo, redo]);

  async function markComplete() {
    const existing = useEditorStore.getState().document;
    if (!existing) return;
    if (existing.isComplete) {
      if (!window.confirm("Move this resume back to Draft? Your cover letters stay saved.")) return;
      setCompleting(true);
      try {
        await apiFetch(`/resumes/${documentId}`, {
          method: "PUT",
          body: JSON.stringify({ isComplete: false }),
        });
        useEditorStore.getState().commitDocument({ ...useEditorStore.getState().document!, isComplete: false });
        useEditorStore.getState().markSaved();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not move the resume back to Draft");
      } finally {
        setCompleting(false);
      }
      return;
    }
    pauseAutosave.current = true;
    if (timer.current) clearTimeout(timer.current);
    inflight.current?.abort();
    saveVersion.current += 1;
    setCompleting(true);
    try {
      if (!useEditorStore.getState().document?.title.trim()) {
        useEditorStore.getState().blurTitle();
      }
      const current = useEditorStore.getState().document;
      if (!current) return;
      const preserved = {
        title: current.title,
        templateId: current.templateId,
        layoutKey: current.layoutKey,
        content: current.content,
        design: current.design,
      };
      await apiFetch(`/resumes/${documentId}`, {
        method: "PUT",
        body: JSON.stringify(preserved),
      });
      await apiFetch(`/resumes/${documentId}/complete`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const latest = useEditorStore.getState().document;
      if (!latest) return;
      useEditorStore.getState().commitDocument({
        ...latest,
        isComplete: true,
      });
      const same =
        latest.title === preserved.title &&
        latest.templateId === preserved.templateId &&
        latest.layoutKey === preserved.layoutKey &&
        latest.content === preserved.content &&
        latest.design === preserved.design;
      if (same) useEditorStore.getState().markSaved();
      // Batch 2: finalizing offers an automatic cover letter (optional, "Skip for now").
      setLetterDialog("finalized");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not finalize the resume");
    } finally {
      pauseAutosave.current = false;
      setCompleting(false);
      if (useEditorStore.getState().dirty) void saveNow();
    }
  }

  if (!resumeDoc) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        No resume loaded.
      </div>
    );
  }

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : dirty
            ? "Unsaved changes"
            : "All changes saved";

  const sidePanel =
    activePanel === "improve" ? (
      <ImproveTextPanel />
    ) : activePanel === "templates" ? (
      <TemplatesPanel />
    ) : activePanel === "design" ? (
      <DesignPanel />
    ) : activePanel === "share" ? (
      <SharePanel documentId={documentId} />
    ) : null;

  const frameW = canvasSize.w * canvasZoom;
  const frameH = canvasSize.h * canvasZoom;

  return (
    <div className="editor-shell fixed inset-0 z-0 flex flex-col overflow-hidden bg-[var(--rb-bg)]">
      {/* The print @page rule comes from ResumeCanvas (it always overrode this one). */}
      {/* App chrome */}
      <header className="editor-top z-40 flex h-12 shrink-0 items-center gap-2 border-b border-[#cfd4db] bg-[var(--rb-panel)] px-4">
        <Link href="/user/dashboard" className="text-sm font-bold text-[var(--rb-teal-dark)]">
          ResumeBuilder
        </Link>
        <input
          value={resumeDoc.title}
            aria-label="Resume title"
            maxLength={100}
            onChange={(e) => updateTitle(e.target.value)}
            onBlur={() => useEditorStore.getState().blurTitle()}
            className="min-w-[140px] max-w-[280px] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-[var(--rb-ink)] outline-none hover:border-[#cfd4db] focus:border-[var(--rb-teal)]"
        />
        <span className="editor-title-count text-[10px] text-slate-400">{resumeDoc.title.length}/100</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            aria-label="Undo"
            disabled={pastCount === 0}
            onClick={() => undo()}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            aria-label="Redo"
            disabled={futureCount === 0}
            onClick={() => redo()}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          >
            <Redo2 size={15} />
          </button>
          <span
            className={clsx(
              saveStatus === "error" && "text-red-600",
              saveStatus === "saved" && "text-emerald-700",
              saveStatus !== "error" && "max-[360px]:hidden"
            )}
          >
            {saveLabel}
          </span>
          {saveStatus === "error" && (
            <button
              type="button"
              onClick={() => void saveNow()}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-red-600 hover:bg-red-50"
            >
              <RotateCcw size={12} />
              Retry
            </button>
          )}
          {resumeDoc.isComplete && (
            <button
              type="button"
              onClick={() => setLetterDialog("open")}
              aria-label="Generate cover letter"
              title="Generate a cover letter from this resume"
              className="inline-flex items-center gap-1 rounded-lg border border-[#cfe3df] bg-white px-2.5 py-1.5 font-semibold text-[var(--rb-teal-dark)] hover:bg-[#f3faf8]"
            >
              <Mail size={14} />
              <span className="max-sm:hidden">Cover letter</span>
            </button>
          )}
          <button
            type="button"
            onClick={markComplete}
            disabled={completing}
            aria-label={resumeDoc.isComplete ? "Finalized — move back to draft" : "Finalize resume"}
            title={resumeDoc.isComplete ? "Finalized. Click to move it back to Draft." : "Finalize this resume and create a cover letter"}
            className={clsx(
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold",
              resumeDoc.isComplete
                ? "bg-[#dce8e6] text-[var(--rb-teal-dark)]"
                : "bg-[#0f5f59] text-white hover:bg-[#0b4a45] disabled:opacity-60"
            )}
          >
            <CheckCircle2 size={14} />
            {resumeDoc.isComplete ? (
              <span className="max-sm:hidden">{completing ? "Updating…" : "Finalized"}</span>
            ) : completing ? (
              "Finalizing…"
            ) : (
              <span>
                Finalize<span className="max-[420px]:hidden"> Resume</span>
              </span>
            )}
          </button>
          <ProfileMenu />
        </div>
      </header>

      {/* Workspace: sidebar | (tools above resume + canvas) */}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {sidePanel ? (
          <aside className="editor-side-panel relative z-30 flex h-full w-[300px] shrink-0 flex-col overflow-hidden border-r border-[#e4e7ec] bg-white shadow-[4px_0_24px_rgba(30,35,42,0.06)]">
            {sidePanel}
          </aside>
        ) : null}

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--rb-bg)]">
          {showHint && (
            <div className="flex items-center justify-between gap-3 border-b border-[#d7ebe7] bg-[#f3faf8] px-4 py-2 text-[12px] text-[#24574f]">
              <p>Click any text to edit. Changes save automatically. Use Undo if you need the previous version.</p>
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1 font-semibold hover:bg-white"
                onClick={() => {
                  setShowHint(false);
                  try {
                    localStorage.setItem("rb-editor-hint", "1");
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Got it
              </button>
            </div>
          )}
          {/* Tools — centered over resume column (Enhancv-style), never scales with canvas */}
          <div className="editor-tools-bar z-20 flex shrink-0 items-center justify-center px-3 py-2.5">
            <nav className="editor-tools-nav flex flex-wrap items-center justify-center gap-0.5 rounded-xl border border-[#e2e5ea] bg-[#f4f5f7]/80 px-1.5 py-1 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === "improve" ? null : "improve")}
                className={clsx(
                  "editor-tool-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  activePanel === "improve"
                    ? "bg-[#dce8e6] text-[var(--rb-teal-dark)] ring-1 ring-[#a8c9c4]"
                    : "text-slate-600 hover:bg-white"
                )}
              >
                <Sparkles size={14} />
                Improve Text
              </button>
              <button
                type="button"
                onClick={() => setModal("ats")}
                className="editor-tool-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white"
              >
                <ShieldCheck size={14} />
                ATS Checker
              </button>
              <button
                type="button"
                onClick={() => setModal("rearrange")}
                className="editor-tool-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white"
              >
                <ListOrdered size={14} />
                Rearrange
              </button>
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === "templates" ? null : "templates")}
                className={clsx(
                  "editor-tool-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  activePanel === "templates"
                    ? "bg-[#dce8e6] text-[var(--rb-teal-dark)] ring-1 ring-[#a8c9c4]"
                    : "text-slate-600 hover:bg-white"
                )}
              >
                <LayoutTemplate size={14} />
                Templates
              </button>
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === "design" ? null : "design")}
                className={clsx(
                  "editor-tool-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  activePanel === "design"
                    ? "bg-[#dce8e6] text-[var(--rb-teal-dark)] ring-1 ring-[#a8c9c4]"
                    : "text-slate-600 hover:bg-white"
                )}
              >
                <Palette size={14} />
                Design & Font
              </button>
              <span className="editor-mobile-actions">
                <button type="button" aria-label="Preview resume" onClick={() => setModal("preview")} className="editor-tool-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <Eye size={14} />
                  Preview
                </button>
                <button type="button" aria-label="Download" onClick={() => setModal("download")} className="editor-tool-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <Download size={14} />
                  Download
                </button>
                <button type="button" aria-label="Share link" onClick={() => setActivePanel(activePanel === "share" ? null : "share")} className="editor-tool-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <Link2 size={14} />
                  Share
                </button>
              </span>
            </nav>
          </div>

          {editorToast && (
            <div className="absolute left-1/2 top-14 z-40 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-[#f0d9a8] bg-[#fff6e5] px-3 py-2 text-[13px] font-medium text-[#8a5a12] shadow-md">
              <span>{editorToast}</span>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-[#fde9c3]"
                aria-label="Dismiss notice"
                onClick={() => setEditorToast(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="rb-scroll relative min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <div className="editor-canvas-stage">
              <div
                className="editor-canvas-cluster"
                style={{ width: frameW, height: frameH }}
              >
                <div className="editor-canvas-frame" style={{ width: frameW, height: frameH }}>
                  <div
                    ref={canvasInnerRef}
                    className="editor-canvas-scale origin-top-left"
                    style={{ transform: `scale(${canvasZoom})` }}
                  >
                    <ResumeCanvas />
                  </div>
                </div>

                {/* Float actions stay beside the page (outside scale) */}
                <div className="editor-float-rail">
                  <button
                    type="button"
                    aria-label="Preview resume"
                    title="Preview resume"
                    onClick={() => setModal("preview")}
                    className="rb-float-btn"
                  >
                    <Eye size={18} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    aria-label="Download"
                    title="Download"
                    onClick={() => setModal("download")}
                    className="rb-float-btn"
                  >
                    <Download size={18} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    aria-label="Share link"
                    title="Share link"
                    onClick={() =>
                      setActivePanel(activePanel === "share" ? null : "share")
                    }
                    className="rb-float-btn"
                  >
                    <Link2 size={18} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BUG-411: the zoom pill sits in its own bar under the canvas, never on the sheet. */}
          <div className="flex shrink-0 justify-center border-t border-[#e3e6ea] py-1.5">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#d5d8dd] bg-[#3a414a] px-2 py-1.5 text-white shadow-lg">
              <button
                type="button"
                aria-label="Zoom out"
                title="Zoom out"
                disabled={canvasZoom <= 0.4}
                onClick={() => setCanvasZoom(Number((canvasZoom - 0.1).toFixed(1)))}
                className="rounded-full p-1 hover:bg-white/10 disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <span className="min-w-[3.2rem] text-center text-[12px] font-semibold tabular-nums">
                {Math.round(canvasZoom * 100)}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                title="Zoom in"
                disabled={canvasZoom >= 1.3}
                onClick={() => setCanvasZoom(Number((canvasZoom + 0.1).toFixed(1)))}
                className="rounded-full p-1 hover:bg-white/10 disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                aria-label="Reset zoom"
                title="Reset zoom to 100%"
                onClick={() => setCanvasZoom(1)}
                className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <TextFormatToolbar />

      {modal === "ats" && <AtsModal />}
      {modal === "rearrange" && <RearrangeModal />}
      {modal === "addSection" && <AddSectionModal />}
      {modal === "preview" && <PreviewModal />}
      {modal === "download" && <DownloadModal documentId={documentId} />}
      {letterDialog && (
        <GenerateLetterDialog
          resumes={[{ id: documentId, title: resumeDoc.title || "Resume", isComplete: true }]}
          initialResumeId={documentId}
          defaultRole={roleFromHeadline(
            (resumeDoc.content?.sections?.find((sec) => sec.type === "header") as { title?: string } | undefined)?.title
          )}
          justFinalized={letterDialog === "finalized"}
          showResult
          onClose={() => setLetterDialog(null)}
        />
      )}
    </div>
  );
}
