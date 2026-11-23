/** Audio tool limits + progress copy (no imports, so it is unit-testable). */
/** Defaults shown before /audio/capabilities answers (the API's AUDIO_MAX_MB / AUDIO_MAX_SECONDS win). */
export const AUDIO_MAX_MB = 100;
export const AUDIO_MAX_SECONDS = 20 * 60;

/** Drop-zone copy, e.g. "up to 100 MB · 20 min". */
export function limitsLabel(maxBytes: number, maxSeconds: number): string {
  return `up to ${Math.round(maxBytes / 1024 / 1024)} MB · ${Math.round(maxSeconds / 60)} min`;
}

/** Status line while cleaning: "Part 3 of 19 · about 40 s left". */
export function progressHint(job: { status: string; chunks?: { done: number; total: number } | null; etaSeconds: number | null } | null): string {
  const parts: string[] = [];
  if (job?.status === "denoising" && job.chunks && job.chunks.total > 1) parts.push(`Part ${Math.min(job.chunks.done + 1, job.chunks.total)} of ${job.chunks.total}`);
  if (job?.etaSeconds) parts.push(job.etaSeconds >= 90 ? `~${Math.round(job.etaSeconds / 60)} min left` : `~${job.etaSeconds}s left`);
  return parts.join(" · ") || "Working…";
}


export type CleanMode = "noise" | "conversation" | "voice";

/**
 * BUG-1340/1343: most any sound is turned down, in dB. Same table as dfAttenLimit() in the API
 * (resume-builder-backend/src/lib/audio/media.ts): 0 → 6, 50 → 12, 80 → 15, 100 → 18 dB;
 * Keep all voices: 8 → 12 dB.
 */
export function maxReductionDb(strength: number, mode: CleanMode = "noise"): number {
  const s = Math.max(0, Math.min(100, Math.round(Number(strength) || 0)));
  if (mode === "conversation") return Math.round((8 + s * 0.04) * 10) / 10;
  const db = s <= 50 ? 6 + s * 0.12 : s <= 80 ? 12 + (s - 50) * 0.1 : 15 + (s - 80) * 0.15;
  return Math.round(db * 10) / 10;
}
