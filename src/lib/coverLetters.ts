import { apiFetch, getApiUrl, getToken } from "@/lib/api";

export type LetterTone = "professional" | "concise" | "enthusiastic";
export const LETTER_TONES: Array<{ id: LetterTone; label: string; hint: string }> = [
  { id: "professional", label: "Professional", hint: "Polished and formal" },
  { id: "concise", label: "Concise", hint: "Short and to the point" },
  { id: "enthusiastic", label: "Enthusiastic", hint: "Warm and energetic" },
];

export type LetterResume = { id: string; title: string; isComplete: boolean; updatedAt?: string };

export type CoverLetter = {
  id: string;
  title: string;
  body: string;
  resumeId: string | null;
  tone: LetterTone;
  targetRole: string | null;
  targetCompany: string | null;
  jobDescription?: string | null;
  source: "ai" | "template" | null;
  generatedAt: string | null;
  resumeUpdatedAfter: boolean;
  createdAt?: string;
  updatedAt: string;
  resume?: LetterResume | null;
};

export type GenerateBody = {
  resumeId: string;
  tone: LetterTone;
  targetRole?: string;
  targetCompany?: string;
  jobDescription?: string;
  finalize?: boolean;
};

export function generateLetter(body: GenerateBody) {
  return apiFetch<{ coverLetter: CoverLetter; source: "ai" | "template" }>("/cover-letters/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function regenerateLetter(id: string, body: { tone?: LetterTone; targetRole?: string | null; targetCompany?: string | null; jobDescription?: string | null }) {
  return apiFetch<{ coverLetter: CoverLetter; source: "ai" | "template" }>(`/cover-letters/${id}/regenerate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function fileNameFrom(res: Response, fallback: string): string {
  const cd = res.headers.get("content-disposition") || "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="([^"]+)"/i.exec(cd);
  return plain ? plain[1] : fallback;
}

/** Downloads a letter as PDF, DOCX or TXT (the server renders the business-letter layout). */
export async function downloadLetter(id: string, format: "pdf" | "docx" | "txt", title: string): Promise<void> {
  const get = () =>
    fetch(`${getApiUrl()}/cover-letters/${encodeURIComponent(id)}/download?format=${format}`, {
      headers: { Authorization: `Bearer ${getToken() || ""}` },
      cache: "no-store",
    });
  let res = await get();
  if (res.status === 401) {
    // apiFetch refreshes an expired session; then try once more.
    await apiFetch(`/cover-letters/${encodeURIComponent(id)}`).catch(() => undefined);
    res = await get();
  }
  if (!res.ok) throw new Error(format === "pdf" ? "Could not create the PDF. Please try again." : "Download failed. Please try again.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileNameFrom(res, `${(title || "Cover Letter").replace(/[^\w\s.-]/g, "").trim() || "Cover Letter"}.${format}`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Senior PM | Strategy" -> "Senior PM" (pre-fills Target Job Title). */
export function roleFromHeadline(headline: string | null | undefined): string {
  return (headline || "").split(/\s+[|•·]\s+|\s+[-–—]\s+/)[0].replace(/[\s.,;:]+$/, "").trim();
}
