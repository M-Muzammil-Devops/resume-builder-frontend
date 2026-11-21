"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ApiError, apiFetch, getApiUrl, getToken } from "@/lib/api";

type CoverLetter = { id: string; title: string; body: string; resumeId: string | null; updatedAt: string };

/** BUG-315: open, edit, download and delete one cover letter. Edits autosave. */
export default function CoverLetterPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=${encodeURIComponent(`/cover-letters/${id}`)}`);
      return;
    }
    apiFetch<{ coverLetter: CoverLetter }>(`/cover-letters/${id}`)
      .then((res) => {
        setLetter(res.coverLetter);
        setTitle(res.coverLetter.title);
        setBody(res.coverLetter.body);
        loaded.current = true;
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError && err.status === 404 ? "This cover letter does not exist." : "Could not load the cover letter.");
      });
  }, [id, router]);

  const saveTimer = useRef<number | null>(null);

  function scheduleSave(nextTitle: string, nextBody: string) {
    if (!loaded.current) return;
    setStatus("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      apiFetch<{ coverLetter: CoverLetter }>(`/cover-letters/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title: nextTitle, body: nextBody }),
      })
        .then((res) => {
          setLetter(res.coverLetter);
          setStatus("saved");
        })
        .catch(() => setStatus("error"));
    }, 600);
  }

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    []
  );

  async function download(format: "txt" | "docx") {
    const res = await fetch(`${getApiUrl()}/cover-letters/${id}/download?format=${format}`, {
      headers: { Authorization: `Bearer ${getToken() || ""}` },
    });
    if (!res.ok) {
      setError("Download failed. Please try again.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "Cover Letter").replace(/[^\w\s.-]/g, "").trim() || "Cover Letter"}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove() {
    if (!window.confirm("Delete this cover letter? This cannot be undone.")) return;
    await apiFetch(`/cover-letters/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl p-6">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
          <ArrowLeft size={14} aria-hidden="true" /> Dashboard
        </Link>
        {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
        {letter && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Cover letter title"
                value={title}
                maxLength={120}
                onChange={(e) => {
                  setTitle(e.target.value);
                  scheduleSave(e.target.value, body);
                }}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg font-semibold text-slate-900"
              />
              <span role="status" className="text-xs text-slate-500">
                {status === "saving" ? "Saving…" : status === "saved" ? "All changes saved" : status === "error" ? "Save failed" : ""}
              </span>
            </div>
            <textarea
              aria-label="Cover letter text"
              value={body}
              maxLength={10000}
              onChange={(e) => {
                setBody(e.target.value);
                scheduleSave(title, e.target.value);
              }}
              rows={20}
              placeholder="Dear Hiring Manager,"
              className="w-full rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-app-secondary" onClick={() => void download("docx")}>
                <Download size={14} aria-hidden="true" /> Download DOCX
              </button>
              <button type="button" className="btn-app-secondary" onClick={() => void download("txt")}>
                <Download size={14} aria-hidden="true" /> Download TXT
              </button>
              <button type="button" className="btn-app-secondary ml-auto text-red-600" onClick={() => void remove()}>
                <Trash2 size={14} aria-hidden="true" /> Delete
              </button>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
