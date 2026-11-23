import { apiFetch, ApiError, getApiUrl, getToken } from "@/lib/api";

export type AudioMode = "noise" | "conversation";
export type AudioOutput = "same" | "mp3" | "wav" | "flac";
export type AudioStatus = "queued" | "probing" | "denoising" | "encoding" | "done" | "failed" | "canceled";

export { AUDIO_MAX_MB, AUDIO_MAX_SECONDS, limitsLabel, progressHint } from "./audioLimits";
import { AUDIO_MAX_MB, AUDIO_MAX_SECONDS } from "./audioLimits";

export type AudioCapabilities = {
  ready: boolean;
  engine: "deepfilternet" | "rnnoise" | "afftdn";
  limits: { maxBytes: number; maxMb: number; maxSeconds: number; uploadsPerHour: number; retentionMinutes: number };
};

export type AudioJob = {
  id: string;
  status: AudioStatus;
  progress: number;
  step: string;
  position: number;
  mode: AudioMode;
  strength: number;
  output: AudioOutput;
  outputFormat: string;
  etaSeconds: number | null;
  /** Long files are cleaned in ~60 s parts; null for short files and the ffmpeg engines. */
  chunks?: { done: number; total: number } | null;
  input: { name: string; codec: string; container: string; duration: number | null; sizeBytes: number; channels: number; sampleRate: number; hasVideo: boolean };
  result?: {
    format: string;
    ext: string;
    sizeBytes: number;
    duration: number | null;
    engine: "deepfilternet" | "rnnoise" | "afftdn";
    noiseFloorBeforeDb: number | null;
    noiseFloorAfterDb: number | null;
    lufs: number | null;
    fallbackNote: string | null;
    processingMs: number;
    peaks: { original: number[]; clean: number[] };
    maxReductionDb?: number | null;
  };
  error?: { code: string; message: string };
  /** BUG-1341: short-lived signed preview links (paths under the API root), present when done. */
  previews?: { original: string; clean: string; expiresAt: number; ttlSeconds: number } | null;
};

/** Absolute (same-origin) URL for a signed preview path, for <audio src>. */
export function previewSrc(path: string): string {
  return `/rb-api${path}`;
}

export const AUDIO_JOB_KEY = "rb_audio_job";

/** Friendly copy per API error code / status. */
export function audioErrorText(status: number, code?: string, fallback?: string, limits = { maxMb: AUDIO_MAX_MB, maxSeconds: AUDIO_MAX_SECONDS }): string {
  const mins = Math.round(limits.maxSeconds / 60);
  if (status === 401) return "Your session ended. Please log in again.";
  if (code === "FILE_TOO_LARGE" || status === 413) return `This file is over ${limits.maxMb} MB. Try a shorter clip or a compressed format like MP3.`;
  // The API sends the detected length, e.g. "This recording is 21:40 long. The limit is 20 minutes."
  if (code === "BAD_STRENGTH") return "Strength must be a whole number from 0 to 100.";
  if (code === "TOO_MANY_INVALID") return "Too many files were rejected this hour. Please try again later.";
  if (code === "TOO_LONG") return fallback && /\d+:\d{2} long/.test(fallback) ? `${fallback} Trim it and try again.` : `This recording is longer than ${mins} minutes. Trim it and try again.`;
  if (code === "NO_AUDIO_STREAM") return "This file has no audio track.";
  if (code === "JOB_IN_PROGRESS" || status === 409) return "Your earlier file is still processing. Wait for it to finish or cancel it.";
  // Round 27: the API says how long to wait ("... Try again in ~N min.").
  if (code === "RATE_LIMITED" || status === 429) return fallback && /try again in ~\d+ min/i.test(fallback) ? fallback : "You've reached the hourly file limit. Please try again a bit later.";
  if (code === "UNSUPPORTED_FILE" || code === "UNSUPPORTED_FORMAT" || status === 415) return fallback || "This file type isn't supported. Upload an audio or video file.";
  if (code === "UNREADABLE_MEDIA" || status === 422) return fallback || "We couldn't read this file. It may be damaged.";
  if (status === 503) return fallback || "The audio tool is busy right now. Please try again in a minute.";
  if (status === 0) return "Upload failed. Check your connection and try again.";
  return fallback || "Something went wrong. Please try again.";
}

export function getCapabilities() {
  return apiFetch<AudioCapabilities>("/audio/capabilities");
}

export function getJob(id: string) {
  return apiFetch<AudioJob>(`/audio/jobs/${encodeURIComponent(id)}`);
}

/** Round 26: the signed-in user's queued / processing job (any tab), or null. */
export function getActiveJob() {
  return apiFetch<{ job: AudioJob | null }>("/audio/jobs/active");
}

/** The active job id from a 409 JOB_IN_PROGRESS upload error, if the API sent it. */
export function activeJobIdFrom(err: unknown): string | null {
  const body = err && typeof err === "object" && "body" in err ? (err as { body?: unknown }).body : null;
  const id = body && typeof body === "object" && "activeJobId" in body ? String((body as { activeJobId?: unknown }).activeJobId ?? "") : "";
  return /^[0-9a-f-]{36}$/.test(id) ? id : null;
}

export function cancelJob(id: string) {
  return apiFetch<{ ok: true }>(`/audio/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** XHR upload so we can show upload progress. Resolves with the queued job. */
export function uploadAudio(
  file: File,
  opts: { mode: AudioMode; strength: number; output: AudioOutput },
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<AudioJob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getApiUrl()}/audio/denoise`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      const body = (xhr.response || {}) as { job?: AudioJob; error?: string; code?: string };
      if (xhr.status === 202 && body.job) resolve(body.job);
      else reject(new ApiError(audioErrorText(xhr.status, body.code, body.error), xhr.status, body));
    };
    xhr.onerror = () => reject(new ApiError(audioErrorText(0), 0));
    xhr.onabort = () => reject(new ApiError("Upload canceled", -1));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    const form = new FormData();
    // Fields first so the API reads them before the file stream.
    form.append("mode", opts.mode);
    // API scale: whole number 0..100 (anything else is a 400).
    form.append("strength", String(Math.max(0, Math.min(100, Math.round(Number(opts.strength) || 0)))));
    form.append("output", opts.output);
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

/** Authenticated GET → Blob (previews and the download). */
export async function fetchBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${getApiUrl()}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal, cache: "no-store" });
  if (!res.ok) {
    let code: string | undefined;
    let error: string | undefined;
    try {
      const j = (await res.json()) as { code?: string; error?: string };
      code = j.code;
      error = j.error;
    } catch {
      /* not json */
    }
    throw new ApiError(error || `Request failed (${res.status})`, res.status, { code });
  }
  return res.blob();
}

export function previewPath(id: string, which: "original" | "clean") {
  return `/audio/jobs/${encodeURIComponent(id)}/preview?which=${which}`;
}

export function downloadPath(id: string) {
  return `/audio/jobs/${encodeURIComponent(id)}/download`;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 KB";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatTime(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "–:––";
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const ENGINE_LABEL: Record<string, string> = { deepfilternet: "DeepFilterNet AI", rnnoise: "RNNoise AI", afftdn: "Spectral denoise" };
