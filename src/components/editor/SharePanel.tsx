"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Info, X } from "lucide-react";
import clsx from "clsx";
import { apiFetch } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={clsx(
        "relative h-[24px] w-[44px] shrink-0 rounded-full transition",
        on ? "bg-[#5aaa7a]" : "bg-[#d5d8dd]"
      )}
    >
      <span
        className={clsx(
          "absolute top-[2px] h-5 w-5 rounded-full bg-white shadow transition",
          on ? "left-[22px]" : "left-[2px]"
        )}
      />
    </button>
  );
}

export function SharePanel({ documentId }: { documentId: string }) {
  const setActivePanel = useEditorStore((s) => s.setActivePanel);
  const [shareOn, setShareOn] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [commentsOn, setCommentsOn] = useState(false);
  const [copied, setCopied] = useState<"share" | "comments" | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  function daysFromExpiry(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
    if (days >= 20) return 30;
    if (days >= 1) return 7;
    return null;
  }

  useEffect(() => {
    let cancel = false;
    apiFetch<{ resume: { shareEnabled?: boolean; shareToken?: string | null; shareExpiresAt?: string | null } }>(
      `/resumes/${documentId}`
    )
      .then((res) => {
        if (cancel) return;
        setShareOn(Boolean(res.resume.shareEnabled));
        setShareToken(res.resume.shareToken || null);
        setExpiresInDays(daysFromExpiry(res.resume.shareExpiresAt));
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [documentId]);

  async function toggleShare() {
    const next = !shareOn;
    setShareOn(next);
    setShareError(null);
    try {
      const res = await apiFetch<{ resume: { shareToken?: string | null } }>(`/resumes/${documentId}/share`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: next, expiresInDays }),
      });
      setShareToken(res.resume.shareToken || null);
    } catch (err) {
      setShareOn(!next);
      setShareError(err instanceof Error ? err.message : "Could not update sharing");
    }
  }

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = window.location.origin;
    return `${base}/r/${shareToken || ""}`;
  }, [shareToken]);

  const commentsUrl = useMemo(() => `${shareUrl}?comments=1`, [shareUrl]);

  async function copy(kind: "share" | "comments", url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      alert(url);
    }
  }

  return (
    <aside className="rb-slide-left flex h-full w-full shrink-0 flex-col bg-white">
      <div className="relative flex items-center justify-center border-b border-[#eceef1] px-4 py-3.5">
        <h2 className="text-[15px] font-semibold text-[#3a414a]">Share</h2>
        <button
          type="button"
          aria-label="Close share panel"
          onClick={() => setActivePanel(null)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9aa3ad] hover:bg-[#f1f3f5]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="rb-scroll flex-1 space-y-0 overflow-y-auto">
        <section className="border-b border-[#eceef1] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-[#3a414a]">Share Link</div>
              {!shareOn && (
                <p className="mt-1 text-[12px] leading-relaxed text-[#8b939e]">
                  Create a public link to your Resume you can share with your friends and colleagues
                </p>
              )}
            </div>
            <Toggle on={shareOn} onChange={() => void toggleShare()} />
          </div>
          {shareOn && (
            <div className="rb-fade-in mt-3 flex items-center gap-2 rounded-lg border border-[#e4e7ec] px-3 py-2">
              <input
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 truncate bg-transparent text-[12px] text-[#4b5563] outline-none"
              />
              <button
                type="button"
                aria-label="Copy share link"
                title="Copy"
                onClick={() => void copy("share", shareUrl)}
                className="shrink-0 text-[#6b5b95] hover:text-[#5a4c82]"
              >
                <Copy size={16} />
              </button>
            </div>
          )}
          {shareOn && (
            <label className="mt-3 block text-[12px] text-[#6b7280]">
              Link expiry
              <select
                className="mt-1 w-full rounded-lg border border-[#e4e7ec] px-2 py-1.5 text-[12px]"
                value={expiresInDays ?? ""}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : null;
                  setExpiresInDays(value);
                  void apiFetch<{ resume: { shareToken?: string | null } }>(`/resumes/${documentId}/share`, {
                    method: "PATCH",
                    body: JSON.stringify({ enabled: true, expiresInDays: value }),
                  }).then((res) => setShareToken(res.resume.shareToken || shareToken));
                }}
              >
                <option value="">Never</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
              </select>
            </label>
          )}
          {shareError && <p className="mt-1 text-[11px] text-red-600">{shareError}</p>}
          {copied === "share" && (
            <p className="mt-1 text-[11px] text-[#5aaa7a]">Link copied</p>
          )}
        </section>

        <section className="border-b border-[#eceef1] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-[#3a414a]">Get comments from friends</div>
              {!commentsOn && (
                <p className="mt-1 text-[12px] leading-relaxed text-[#8b939e]">
                  Ask friends to make sure all your achievements stand out and everything makes sense.
                </p>
              )}
            </div>
            <Toggle on={commentsOn} onChange={() => setCommentsOn((v) => !v)} />
          </div>
          {commentsOn && (
            <div className="rb-fade-in mt-3 space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-[#e4e7ec] px-3 py-2">
                <input
                  readOnly
                  value={commentsUrl}
                  className="min-w-0 flex-1 truncate bg-transparent text-[12px] text-[#4b5563] outline-none"
                />
                <button
                  type="button"
                  aria-label="Copy comments link"
                  title="Copy"
                  onClick={() => void copy("comments", commentsUrl)}
                  className="shrink-0 text-[#6b5b95] hover:text-[#5a4c82]"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-[12px] leading-relaxed text-[#8b939e]">
                Your resume is visible only to people who have this link and isn&apos;t publicly visible.
                Comments are not visible to anyone other than you.
              </p>
            </div>
          )}
        </section>

        {commentsOn && (
          <div className="px-5 py-4">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-[#f1f3f5] px-3 py-4 text-[13px] font-medium text-[#6b7280]">
              <Info size={16} />
              No comments yet
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
