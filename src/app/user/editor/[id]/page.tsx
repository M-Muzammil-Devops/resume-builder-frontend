"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  applyPresetStructure,
  buildTemplateDesign,
  resolveLandingPreset,
  type ResumeDocument,
} from "@/shared";
import { EditorShell } from "@/components/editor/EditorShell";
import { SplashLoader } from "@/components/editor/SplashLoader";
import { ApiError, apiFetch } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";

/** Older resumes may lack chrome fields — fill from landing preset without wiping text. */
function hydrateTemplateChrome(doc: ResumeDocument): ResumeDocument {
  const needsChrome = !doc.design.photoPosition || !doc.design.sectionHeadingStyle;
  const needsInk = !doc.design.inkColor;
  if (!needsChrome && !needsInk) return doc;

  const preset =
    resolveLandingPreset(doc.templateId) || resolveLandingPreset(doc.layoutKey);

  if (needsChrome && preset) {
    return {
      ...doc,
      design: {
        ...buildTemplateDesign(preset.id),
        accentColor: doc.design.accentColor || preset.accentColor,
        inkColor: doc.design.inkColor || preset.inkColor || "#343334",
        fontFamily: doc.design.fontFamily || preset.fontFamily,
      },
      content: applyPresetStructure(doc.content, preset),
    };
  }

  if (needsInk) {
    return {
      ...doc,
      design: {
        ...doc.design,
        inkColor: preset?.inkColor || "#343334",
      },
    };
  }

  return doc;
}

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const setDocument = useEditorStore((s) => s.setDocument);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ resume: ResumeDocument }>(`/resumes/${id}`);
        if (!cancelled) setDocument(hydrateTemplateChrome(res.resume));
      } catch (err) {
        if (!cancelled) {
          setDocument(null);
          if (err instanceof ApiError && err.status === 401) {
            window.location.assign(`/login?next=${encodeURIComponent(`/user/editor/${id}`)}`);
            return;
          }
          // BUG-600: never fall back to the sample document; say why it cannot open.
          setError(
            err instanceof ApiError && (err.status === 404 || err.status === 403)
              ? "This resume does not exist, or it belongs to another account."
              : err instanceof Error
                ? err.message
                : "Failed to load resume"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, setDocument]);

  if (!mounted || !id || loading) {
    return <SplashLoader label="Loading editor…" />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <h1 className="text-lg font-semibold text-slate-800">This resume could not be opened</h1>
        <p className="max-w-md text-sm text-slate-500">{error}</p>
        <Link href="/user/dashboard" className="text-sm font-semibold text-teal-700">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <EditorShell documentId={id} />;
}
