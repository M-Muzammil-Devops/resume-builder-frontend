"use client";

import { apiFetch, getApiUrl, getToken } from "@/lib/api";

/** Authenticated binary download (CSV / PDF) for the admin panels. Refreshes the session once on 401. */
export async function adminBlob(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const go = () =>
    fetch(`${getApiUrl()}${path}`, { headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {}, cache: "no-store" });
  let res = await go();
  if (res.status === 401) {
    await apiFetch("/admin/me").catch(() => undefined);
    res = await go();
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // not JSON
    }
    throw new Error(message);
  }
  const cd = res.headers.get("content-disposition") || "";
  const m = /filename="([^"]+)"/.exec(cd);
  return { blob: await res.blob(), filename: m ? m[1] : null };
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Opens a PDF blob in a new tab (top-level blob: navigation; not an iframe, so the CSP stays strict). */
export function openBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) saveBlob(blob, "resume.pdf");
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function flagOf(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * QA run3 WARN: the From/To pickers meant UTC days. A picked day now means the admin's own local day
 * (Asia/Karachi for the owner): it is sent as the exact UTC instant of local 00:00 / 23:59:59.999.
 */
export function localDayBound(day: string, end: boolean): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  const d = new Date(`${day}T${end ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(d.getTime()) ? day : d.toISOString();
}
