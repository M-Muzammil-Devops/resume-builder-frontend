"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { flattenResumeText } from "@/lib/atsEngine";
import { scrubPlaceholders, withProvenance } from "@/lib/placeholders";
import { resumeToDocxBlob } from "@/lib/resumeDocx";
import { getApiUrl, getToken } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import { useEscapeClose } from "@/hooks/useEscapeClose";

function sanitizeFileName(raw: string) {
  return raw.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim() || "Resume";
}

export function DownloadModal({ documentId }: { documentId: string }) {
  const document = useEditorStore((s) => s.document);
  const setModal = useEditorStore((s) => s.setModal);
  useEscapeClose(() => setModal(null));
  const [fileName, setFileName] = useState(
    () => sanitizeFileName(document?.title || "Resume")
  );
  const [busy, setBusy] = useState<"pdf" | "txt" | "docx" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    if (!document) return;
    const name = sanitizeFileName(fileName);
    setBusy("pdf");
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Please sign in again, then retry download.");
      }

      // Send live editor document so PDF matches what you see (WYSIWYG)
      const res = await fetch(`${getApiUrl()}/export/${documentId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: name,
          title: document.title,
          content: document.content,
          design: document.design,
          layoutKey: document.layoutKey,
        }),
      });
      const type = res.headers.get("content-type") || "";
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          (data && (data.message || data.error)) || `Export failed (${res.status})`
        );
      }
      if (!type.includes("application/pdf")) {
        throw new Error("Server did not return a PDF. Is the API up to date?");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${name}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadDocx() {
    if (!document) return;
    const name = sanitizeFileName(fileName);
    setBusy("docx");
    setError(null);
    try {
      const blob = await withProvenance(document.content, () => resumeToDocxBlob(scrubPlaceholders(document)));
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${name}.docx`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "DOCX export failed.");
    } finally {
      setBusy(null);
    }
  }

  function downloadTxt() {
    if (!document) return;
    const name = sanitizeFileName(fileName);
    setBusy("txt");
    const text = withProvenance(document.content, () => flattenResumeText(scrubPlaceholders(document)));
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${name}.txt`;
    window.document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setBusy(null);
    setModal(null);
  }

  function sendEmail() {
    setBusy("email");
    const name = sanitizeFileName(fileName);
    const subject = encodeURIComponent(`${name} resume`);
    const body = encodeURIComponent(
      document
        ? `Hi,\n\nPlease find my resume summary:\n\n${flattenResumeText(document).slice(0, 1200)}\n\n— Sent from ResumeBuilder`
        : "Resume"
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setBusy(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2438]/55 p-4 backdrop-blur-[1px]">
      <div className="rb-pop w-full max-w-[440px] rounded-xl bg-white p-6 shadow-2xl">
        <div className="relative mb-1">
          <h2 className="text-lg font-bold text-[#3a414a]">Download Your Resume</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setModal(null)}
            className="absolute -right-1 -top-1 rounded-md p-1 text-[#9aa3ad] hover:bg-[#f1f3f5]"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-[#8b939e]">
          Please select the file format you&apos;d like to download:
        </p>

        <label className="mb-1 block text-[12px] font-medium text-[#6b7280]">File name</label>
        <div className="mb-1 flex items-center gap-2">
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value.replace(/[^\w\s-]/g, ""))}
            className="flex-1 rounded-lg border border-[#d5d8dd] px-3 py-2.5 text-sm outline-none ring-[var(--rb-teal)] focus:ring-2"
          />
          <span className="text-sm font-medium text-[#6b7280]">.pdf</span>
        </div>
        <p className="mb-5 text-[11px] text-[#9aa3ad]">
          Letters, numbers and spaces are allowed. Special characters are removed automatically.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void downloadPdf()}
            className="rounded-lg bg-[#5aaa7a] px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#4d966b] disabled:opacity-60"
          >
            {busy === "pdf" ? "Preparing…" : "Download as PDF"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={sendEmail}
            className="rounded-lg border border-[#3a414a] bg-white px-3 py-3 text-sm font-semibold text-[#3a414a] hover:bg-[#f5f6f8] disabled:opacity-60"
          >
            Send PDF to Your Email
          </button>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void downloadDocx()}
            className="text-sm font-semibold text-[#6b5b95] hover:underline disabled:opacity-60"
          >
            {busy === "docx" ? "Preparing…" : "Download as DOCX"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={downloadTxt}
            className="text-sm font-semibold text-[#6b5b95] hover:underline"
          >
            Download as TXT
          </button>
        </div>
      </div>
    </div>
  );
}
