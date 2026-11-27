"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { ApiError, apiFetch, getApiUrl, getToken } from "@/lib/api";
import { UserWorkspace } from "@/components/dashboard/UserDashboardShell";
import { cx } from "@/components/dashboard/format";
import s from "@/components/dashboard/Dashboard.module.css";
import w from "@/components/dashboard/Workspace.module.css";

type CoverLetter = { id: string; title: string; body: string; resumeId: string | null; updatedAt: string };

/** BUG-315: open, edit, download and delete one cover letter. Edits autosave. */
function CoverLetterView() {
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
      router.replace(`/login?next=${encodeURIComponent(`/user/cover-letters/${id}`)}`);
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
          router.replace(`/login?next=${encodeURIComponent(`/user/cover-letters/${id}`)}`);
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
    router.push("/user/dashboard#cover-letters");
  }

  return (
    <>
      <div className={w.row}>
        <Link href="/user/dashboard#cover-letters" className={cx(s.btn, s.sm)}>
          <ArrowLeft size={14} aria-hidden="true" /> Cover letters
        </Link>
      </div>
      {error && (
        <p role="alert" className={cx(w.msg, w.msgErr)}>
          {error}
        </p>
      )}
      {letter ? (
        <section className={cx(w.panel, w.stack)} aria-label="Cover letter">
          <div className={w.row}>
            <input
              aria-label="Cover letter title"
              value={title}
              maxLength={120}
              onChange={(e) => {
                setTitle(e.target.value);
                scheduleSave(e.target.value, body);
              }}
              className={w.input}
              style={{ flex: "1 1 240px", width: "auto", fontSize: 17, fontWeight: 700 }}
            />
            <span role="status" className={w.muted}>
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
            className={w.textarea}
          />
          <div className={w.row}>
            <button type="button" className={s.btn} onClick={() => void download("docx")}>
              <Download size={14} aria-hidden="true" /> Download DOCX
            </button>
            <button type="button" className={s.btn} onClick={() => void download("txt")}>
              <Download size={14} aria-hidden="true" /> Download TXT
            </button>
            <button type="button" className={cx(s.btn, s.danger)} style={{ marginLeft: "auto" }} onClick={() => void remove()}>
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
          </div>
        </section>
      ) : (
        !error && <div className={s.skel} style={{ height: 420 }} aria-busy="true" aria-label="Loading cover letter" />
      )}
    </>
  );
}

export default function CoverLetterPage() {
  return (
    <UserWorkspace active="cover-letters">
      <CoverLetterView />
    </UserWorkspace>
  );
}
