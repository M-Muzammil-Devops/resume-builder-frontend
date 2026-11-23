"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type DragEvent, type KeyboardEvent, type MouseEvent, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Download, Film, Music, Pause, Play, RotateCcw, Upload, X } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  AUDIO_JOB_KEY,
  ENGINE_LABEL,
  audioErrorText,
  cancelJob,
  downloadPath,
  fetchBlob,
  formatBytes,
  AUDIO_MAX_MB,
  AUDIO_MAX_SECONDS,
  formatTime,
  getCapabilities,
  limitsLabel,
  previewSrc,
  progressHint,
  getJob,
  getActiveJob,
  activeJobIdFrom,
  uploadAudio,
  type AudioJob,
  type AudioMode,
  type AudioOutput,
} from "@/lib/audioApi";
import { maxReductionDb } from "@/lib/audioLimits";
import { DEFAULT_SPEED, applySpeed, shouldOpenPicker, type Speed } from "@/lib/playbackSpeed";
import { DemoPlayer } from "./DemoPlayer";
import { SpeedControl } from "./SpeedControl";
import { Waveform } from "./Waveform";
import s from "./AudioTool.module.css";

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");
const PLAYLIST_EXT = /\.(m3u8?|pls|xspf|asx|wpl|cue|ffconcat|sdp|txt)$/i;
const MAX_BYTES_DEFAULT = AUDIO_MAX_MB * 1024 * 1024;
const STRENGTH_CLASS = (v: number) => s[`p${Math.round(v / 5) * 5}`];
const TERMINAL = new Set(["done", "failed", "canceled"]);

type Phase = "idle" | "uploading" | "processing" | "done" | "failed";

function extOf(name: string) {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(name);
  return m ? m[1].toUpperCase() : "";
}

export function AudioCleaner({ initialMode, signedIn, toolPath }: { initialMode: AudioMode; signedIn: boolean | null; toolPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AudioMode>(initialMode);
  const [strength, setStrength] = useState(80);
  const [output, setOutput] = useState<AudioOutput>("same");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [job, setJob] = useState<AudioJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [maxBytes, setMaxBytes] = useState(MAX_BYTES_DEFAULT);
  const [maxSeconds, setMaxSeconds] = useState(AUDIO_MAX_SECONDS);
  const [downloading, setDownloading] = useState(false);
  /** Round 26: we are tracking an EARLIER job (409 on upload, or found on page load), not the picked file. */
  const [earlier, setEarlier] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const uploadAbort = useRef<AbortController | null>(null);
  const pollTimer = useRef<number | null>(null);
  const pollStarted = useRef(0);
  const statusRef = useRef<HTMLParagraphElement>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) window.clearTimeout(pollTimer.current);
    pollTimer.current = null;
  }, []);

  const poll = useCallback(
    (id: string) => {
      stopPolling();
      const tick = async () => {
        try {
          const next = await getJob(id);
          setJob(next);
          if (next.status === "done") {
            setPhase("done");
            return;
          }
          if (TERMINAL.has(next.status)) {
            sessionStorage.removeItem(AUDIO_JOB_KEY);
            setPhase("failed");
            setError(next.error?.message || "We could not clean this file. Please try another file.");
            return;
          }
        } catch (err) {
          if (err instanceof ApiError && (err.status === 404 || err.status === 401)) {
            sessionStorage.removeItem(AUDIO_JOB_KEY);
            setPhase("failed");
            setError(err.status === 401 ? audioErrorText(401) : "This job has expired. Please upload the file again.");
            return;
          }
          // Network hiccup: keep polling.
        }
        const elapsed = Date.now() - pollStarted.current;
        pollTimer.current = window.setTimeout(tick, elapsed < 20_000 ? 1000 : 2000);
      };
      pollStarted.current = Date.now();
      void tick();
    },
    [stopPolling]
  );

  // Limits + resume a job after a reload (same tab).
  useEffect(() => {
    if (!signedIn) return;
    getCapabilities()
      .then((caps) => {
        if (caps?.limits?.maxBytes) setMaxBytes(caps.limits.maxBytes);
        if (caps?.limits?.maxSeconds) setMaxSeconds(caps.limits.maxSeconds);
      })
      .catch(() => undefined);
    const saved = sessionStorage.getItem(AUDIO_JOB_KEY);
    if (saved && /^[0-9a-f-]{36}$/.test(saved)) {
      setPhase("processing");
      poll(saved);
    } else {
      // Round 26: a job started in another tab (or before a restart of this tab) is still running:
      // show it here so it can be followed or canceled instead of a dead-end 409 later.
      getActiveJob()
        .then((res) => {
          const active = res?.job;
          if (!active || sessionStorage.getItem(AUDIO_JOB_KEY)) return;
          sessionStorage.setItem(AUDIO_JOB_KEY, active.id);
          setEarlier(true);
          setJob(active);
          setPhase("processing");
          poll(active.id);
        })
        .catch(() => undefined);
    }
    return stopPolling;
  }, [signedIn, poll, stopPolling]);

  useEffect(() => () => uploadAbort.current?.abort(), []);

  function pick(f: File | null | undefined) {
    if (!f) return;
    setError(null);
    if (PLAYLIST_EXT.test(f.name)) {
      setError("Playlists and text files aren't supported. Upload the audio or video file itself.");
      return;
    }
    if (f.size > maxBytes) {
      setError(audioErrorText(413, undefined, undefined, { maxMb: Math.round(maxBytes / 1024 / 1024), maxSeconds }));
      return;
    }
    if (f.size === 0) {
      setError("This file is empty.");
      return;
    }
    setFile(f);
  }

  function goLogin() {
    router.push(`/login?next=${encodeURIComponent(toolPath)}`);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (phase === "uploading" || phase === "processing") return;
    if (!signedIn) return goLogin();
    pick(event.dataTransfer.files?.[0]);
  }

  function onBrowse() {
    if (!signedIn) return goLogin();
    inputRef.current?.click();
  }

  /** Round24: a click anywhere in the drop zone opens the picker (one handler, so "browse files" can't double-open). */
  function onZoneClick(event: MouseEvent<HTMLDivElement>) {
    if (!shouldOpenPicker(event.target as HTMLElement, phase === "uploading" || phase === "processing")) return;
    onBrowse();
  }

  function onPickKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (event.repeat || phase === "uploading" || phase === "processing") return;
    onBrowse();
  }

  async function start() {
    if (!file || !signedIn) return;
    setError(null);
    setPhase("uploading");
    setUploadPct(0);
    setJob(null);
    // Refreshes an expired access token before the long upload.
    await getCapabilities().catch(() => undefined);
    const ctrl = new AbortController();
    uploadAbort.current = ctrl;
    try {
      const queued = await uploadAudio(file, { mode, strength, output }, setUploadPct, ctrl.signal);
      uploadAbort.current = null;
      sessionStorage.setItem(AUDIO_JOB_KEY, queued.id);
      setJob(queued);
      setPhase("processing");
      poll(queued.id);
    } catch (err) {
      uploadAbort.current = null;
      if (err instanceof ApiError && err.status === -1) {
        setPhase("idle");
        return;
      }
      // Round 26: one file at a time. Show the earlier job's progress (with Cancel) instead of a dead end.
      const activeId = err instanceof ApiError && err.status === 409 ? activeJobIdFrom(err) : null;
      if (activeId) {
        sessionStorage.setItem(AUDIO_JOB_KEY, activeId);
        setEarlier(true);
        setPhase("processing");
        poll(activeId);
        return;
      }
      setPhase("failed");
      setError(err instanceof Error ? err.message : audioErrorText(500));
    }
  }

  async function cancel() {
    if (phase === "uploading") {
      uploadAbort.current?.abort();
      return;
    }
    stopPolling();
    const id = job?.id ?? sessionStorage.getItem(AUDIO_JOB_KEY);
    sessionStorage.removeItem(AUDIO_JOB_KEY);
    setPhase("idle");
    setJob(null);
    setEarlier(false);
    if (id) await cancelJob(id).catch(() => undefined);
  }

  /** Round 26: cancel the earlier job (DELETE), then upload the file that is picked now. */
  async function cancelEarlierAndStart() {
    await cancel();
    if (file) await start();
  }

  async function reset() {
    stopPolling();
    const id = job?.id;
    sessionStorage.removeItem(AUDIO_JOB_KEY);
    setJob(null);
    setPhase("idle");
    setError(null);
    setEarlier(false);
    if (id && job?.status === "done") await cancelJob(id).catch(() => undefined);
  }

  async function download() {
    if (!job?.result) return;
    setDownloading(true);
    try {
      const blob = await fetchBlob(downloadPath(job.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = (job.input.name.replace(/\.[A-Za-z0-9]{1,8}$/, "") || "audio").replace(/[^\w.\- ]/g, "_").slice(0, 80);
      a.href = url;
      a.download = `${base}-clean.${job.result.ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 410 ? "This file has expired. Please process it again." : "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const sameLabel = file ? extOf(file.name) || "file" : job ? job.outputFormat : "";
  const busy = phase === "uploading" || phase === "processing";
  const progress = phase === "uploading" ? Math.round(uploadPct * 100) : job?.progress ?? 0;

  return (
    <div className={s.toolGrid}>
      {/* left: upload + settings */}
      <div className={s.col}>
        <div
          className={cx(s.glass, s.drop, dragging && s.dropOn, busy && s.dropBusy)}
          onClick={onZoneClick}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {/* The whole zone opens the picker; this inner part is its keyboard control (Enter/Space). */}
          <div
            className={s.pick}
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-disabled={busy || undefined}
            aria-label={`Choose an audio or video file, ${limitsLabel(maxBytes, maxSeconds)}. You can also drop a file here.`}
            onKeyDown={onPickKey}
          >
            <div className={s.dropIco} aria-hidden="true">
              <Upload size={26} />
            </div>
            <h2 className={s.dropTitle}>Drop audio or video here</h2>
            <p className={s.dropHint}>
              or <span className={s.linkBtn}>browse files</span> · {limitsLabel(maxBytes, maxSeconds)}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className={s.srOnly}
            tabIndex={-1}
            aria-hidden="true"
            data-no-pick
            accept="audio/*,video/*,.amr,.wma,.ac3,.eac3,.caf,.mka,.aif,.aiff,.opus,.flac,.ape,.wv,.mkv,.3gp"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {file && (
            <div className={s.file}>
              {/* Icon from the server's probe (a real video track), not the browser MIME: audio-only .mp4 reports "video/mp4". */}
              <span className={s.fico} aria-hidden="true">{job?.input?.hasVideo ? <Film size={16} /> : <Music size={16} />}</span>
              <div className={s.fileMeta}>
                <b title={file.name}>{file.name}</b>
                <small>
                  {formatBytes(file.size)}
                  {job?.input?.duration ? ` · ${formatTime(job.input.duration)}` : ""}
                  {job?.input ? ` · ${job.input.codec.toUpperCase()}${job.input.hasVideo ? " · video" : ""}` : ""}
                </small>
              </div>
              {!busy && (
                <button
                  type="button"
                  className={s.x}
                  aria-label="Remove file"
                  data-no-pick
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {signedIn === false && (
            <p className={s.loginNote} data-no-pick>
              <Link href={`/login?next=${encodeURIComponent(toolPath)}`}>Log in</Link> or <Link href="/register">create a free account</Link> to clean your audio.
            </p>
          )}
        </div>

        <div className={cx(s.glass, s.settings)}>
          <span className={s.lbl} id="aud-mode">Mode</span>
          <div className={s.seg3} role="radiogroup" aria-labelledby="aud-mode">
            {(["noise", "conversation", "voice"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={cx(mode === m && s.on)} onClick={() => setMode(m)} disabled={busy}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <p className={s.hint}>{MODE_HINT[mode]}</p>

          <label className={s.lbl} htmlFor="aud-strength">
            Strength <b className={s.val}>{strength}%</b>
            <small className={s.dbHint}>noise down up to {maxReductionDb(strength, mode)} dB</small>
          </label>
          <div className={s.slider}>
            <div className={s.track} aria-hidden="true">
              <div className={cx(s.fillbar, STRENGTH_CLASS(strength))} />
            </div>
            <input
              id="aud-strength"
              type="range"
              min={0}
              max={100}
              step={5}
              value={strength}
              disabled={busy}
              onChange={(e) => setStrength(Number(e.target.value))}
              aria-valuetext={`${strength}%`}
            />
          </div>
          <div className={s.ticks} aria-hidden="true">
            <span>Gentle</span>
            <span>Balanced</span>
            <span>Max</span>
          </div>

          <span className={s.lbl} id="aud-out">Output format</span>
          <div className={s.opts} role="radiogroup" aria-labelledby="aud-out">
            {(["same", "mp3", "wav", "flac"] as const).map((o) => (
              <button key={o} type="button" role="radio" aria-checked={output === o} className={cx(output === o && s.on)} onClick={() => setOutput(o)} disabled={busy}>
                {o === "same" ? `Same as input${sameLabel ? ` (${sameLabel})` : ""}` : o.toUpperCase()}
              </button>
            ))}
          </div>

          {signedIn === false ? (
            <button type="button" className={cx(s.btn, s.wide)} onClick={goLogin}>
              Log in to clean audio <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className={cx(s.btn, s.wide)} onClick={() => void start()} disabled={!file || busy || signedIn === null}>
              {busy ? "Cleaning…" : "Clean my audio"} <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* right: idle / processing / result */}
      <div className={cx(s.glass, s.result)} aria-live="polite">
        {phase === "idle" && <IdleState />}
        {busy && (
          <Processing
            phase={phase}
            job={job}
            mode={mode}
            name={(earlier ? job?.input?.name : file?.name) || job?.input?.name || file?.name || "your file"}
            progress={progress}
            onCancel={() => void cancel()}
            earlier={earlier}
            nextName={earlier && file ? file.name : null}
            onCancelAndStart={() => void cancelEarlierAndStart()}
            statusRef={statusRef}
          />
        )}
        {phase === "done" && job?.result && (
          <Result job={job} onDownload={() => void download()} downloading={downloading} onAgain={() => void reset()} />
        )}
        {phase === "failed" && (
          <div className={s.failBox} role="alert">
            <span className={s.failIco} aria-hidden="true">!</span>
            <h2 className={s.rtitle}>That didn&apos;t work</h2>
            <p className={s.hint}>{error}</p>
            <button type="button" className={s.ghost} onClick={() => void reset()}>
              <RotateCcw size={15} aria-hidden="true" /> Try again
            </button>
          </div>
        )}
        {error && phase !== "failed" && (
          <p className={s.inlineErr} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div className={s.idle}>
      <span className={s.kicker}>Result</span>
      <h2 className={s.rtitle}>Your clean audio appears here</h2>
      <ol className={s.how}>
        <li><b>1</b>Drop a noisy recording — any audio or video format.</li>
        <li><b>2</b>Pick a mode and strength. 80% suits most recordings.</li>
        <li><b>3</b>Compare Before / After, then download.</li>
      </ol>
      {/* Hear the difference before uploading. Only in the empty state: hidden once a job runs or a result shows. */}
      <DemoPlayer />
    </div>
  );
}

function Processing({
  phase,
  job,
  mode,
  name,
  progress,
  onCancel,
  statusRef,
  earlier = false,
  nextName = null,
  onCancelAndStart,
}: {
  phase: Phase;
  job: AudioJob | null;
  mode: AudioMode;
  name: string;
  progress: number;
  onCancel: () => void;
  statusRef: RefObject<HTMLParagraphElement | null>;
  earlier?: boolean;
  nextName?: string | null;
  onCancelAndStart?: () => void;
}) {
  const st = phase === "uploading" ? "uploading" : job?.status || "queued";
  const voice = (job?.mode || mode) === "voice";
  const order = ["uploading", "queued", "probing", "denoising", "enhancing", "encoding", "done"];
  const at = order.indexOf(st);
  const steps = [
    { key: "uploading", label: "Upload" },
    { key: "probing", label: "Analyze format" },
    { key: "denoising", label: job?.chunks && job.chunks.total > 1 && st === "denoising" ? `Remove noise (AI) · Part ${Math.min(job.chunks.done + 1, job.chunks.total)} of ${job.chunks.total}` : "Remove noise (AI)" },
    ...(voice ? [{ key: "enhancing", label: "Loudness & EQ" }] : []),
    { key: "encoding", label: `Encode ${job?.outputFormat || ""}`.trim() },
  ];
  const circumference = 2 * Math.PI * 50;
  const hint =
    st === "uploading"
      ? `Uploading ${progress}%`
      : st === "queued" && job?.position && job.position > 1
        ? `In queue · position ${job.position}`
        : progressHint(job);
  return (
    <div className={s.proc}>
      <div className={s.ringP} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Progress">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="audRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#22d3ee" />
              <stop offset="0.6" stopColor="#6366f1" />
              <stop offset="1" stopColor="#d946ef" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="50" className={s.trk} />
          <circle cx="60" cy="60" r="50" className={s.val} stroke="url(#audRing)" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} />
        </svg>
        <b>{progress}%</b>
      </div>
      <div className={s.psteps}>
        <h2 className={s.rtitle}>{st === "uploading" ? "Uploading your file…" : earlier ? "Your earlier file is still processing" : "Cleaning your audio…"}</h2>
        {earlier && (
          <p className={s.hint}>
            One file is cleaned at a time. Wait for it, or cancel it{nextName ? <> and upload <b className={s.ellip}>{nextName}</b> instead</> : null}.
          </p>
        )}
        <p className={s.hint} ref={statusRef}>
          <span className={s.ellip}>{name}</span> · {hint}
        </p>
        <ol>
          {steps.map((step) => {
            const idx = order.indexOf(step.key);
            const done = at > idx || (step.key === "uploading" && st !== "uploading");
            const now = !done && (st === step.key || (st === "queued" && step.key === "probing"));
            return (
              <li key={step.key} className={cx(done && s.done, now && s.now)}>
                {step.label}
                {done ? <Check size={16} aria-hidden="true" /> : now ? <span className={s.spin} aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ol>
        {earlier && nextName && onCancelAndStart ? (
          <div className={s.earlierActs}>
            <button type="button" className={cx(s.ghost, s.sm2)} onClick={onCancelAndStart}>
              Cancel it &amp; upload new file
            </button>
            <button type="button" className={cx(s.ghost, s.sm2)} onClick={onCancel}>
              Cancel earlier file
            </button>
          </div>
        ) : (
          <button type="button" className={cx(s.ghost, s.sm2)} onClick={onCancel}>
            {earlier ? "Cancel earlier file" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}

const MODE_LABEL: Record<AudioMode, string> = { noise: "Remove noise", conversation: "All voices", voice: "Voice clean" };
const MODE_HINT: Record<AudioMode, string> = {
  noise: "Removes background noise. Your voice stays untouched.",
  conversation: "Keeps every voice, even quiet or far ones (phone calls, meetings). Gentler on noise.",
  voice: "Noise removal + loudness (−16 LUFS) + voice EQ.",
};

type Track = "original" | "clean";

function Result({ job, onDownload, downloading, onAgain }: { job: AudioJob; onDownload: () => void; downloading: boolean; onAgain: () => void }) {
  const r = job.result!;
  const audios = useRef<Record<Track, HTMLAudioElement | null>>({ original: null, clean: null });
  // BUG-1341: the players stream short-lived signed links (Range/206); nothing is downloaded up front.
  const links = useRef(job.previews ?? null);
  const wantPlay = useRef<Record<Track, boolean>>({ original: false, clean: false });
  const recoveredAt = useRef(0);
  const [loading, setLoading] = useState<Track | null>(null);
  const [playing, setPlaying] = useState<Track | null>(null);
  const [active, setActive] = useState<Track>("clean");
  const [time, setTime] = useState<Record<Track, number>>({ original: 0, clean: 0 });
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [speed, setSpeed] = useState<Speed>(DEFAULT_SPEED);
  const speedRef = useRef<Speed>(DEFAULT_SPEED);
  const duration = r.duration || job.input.duration || 0;

  // One speed for both tracks, so it carries over Before/After switches and applies while playing.
  useEffect(() => {
    speedRef.current = speed;
    applySpeed(audios.current.original, speed);
    applySpeed(audios.current.clean, speed);
  }, [speed]);

  /** New signed links (the old ones expired or are missing). */
  const refreshLinks = useCallback(async () => {
    try {
      const fresh = await getJob(job.id);
      if (fresh.previews) links.current = fresh.previews;
      return !!fresh.previews;
    } catch {
      return false;
    }
  }, [job.id]);

  /** Give the element its src once (preload="metadata" → only the header is fetched). */
  const ensureSrc = useCallback(
    async (track: Track) => {
      const el = audios.current[track];
      if (!el) return null;
      if (el.getAttribute("src")) return el;
      if (!links.current || links.current.expiresAt - Date.now() < 30_000) {
        if (!(await refreshLinks())) {
          setLoadErr("Preview could not load. You can still download the file.");
          return null;
        }
      }
      el.src = previewSrc(links.current![track]);
      applySpeed(el, speedRef.current);
      return el;
    },
    [refreshLinks]
  );

  useEffect(() => {
    const els = audios.current;
    void ensureSrc("clean").then(() => ensureSrc("original"));
    return () => {
      for (const t of ["original", "clean"] as Track[]) {
        const el = els[t];
        if (!el) continue;
        el.pause();
        el.removeAttribute("src");
        el.load(); // aborts any download in flight
      }
    };
  }, [ensureSrc]);

  async function toggle(track: Track) {
    const el = audios.current[track];
    if (!el) return;
    // Pause works at any time, also while the preview is still buffering.
    if (!el.paused || wantPlay.current[track]) {
      wantPlay.current[track] = false;
      el.pause();
      setLoading((l) => (l === track ? null : l));
      return;
    }
    const other: Track = track === "clean" ? "original" : "clean";
    wantPlay.current[other] = false;
    audios.current[other]?.pause();
    setActive(track);
    wantPlay.current[track] = true;
    if (!(await ensureSrc(track)) || !wantPlay.current[track]) return;
    if (el.readyState < 3) setLoading(track);
    try {
      await el.play();
    } catch {
      /* paused before it started, autoplay or decode refusal */
    }
  }

  async function switchTo(track: Track) {
    if (track === active) return;
    const from = audios.current[active];
    const to = audios.current[track];
    const wasPlaying = !!from && (!from.paused || wantPlay.current[active]);
    const at = from?.currentTime || 0;
    wantPlay.current[active] = false;
    from?.pause();
    setLoading(null);
    setActive(track);
    if (!to || !(await ensureSrc(track))) return;
    wantPlay.current[track] = wasPlaying;
    const go = () => {
      to.currentTime = Math.min(at, (to.duration || at) - 0.05);
      if (wantPlay.current[track]) {
        if (to.readyState < 3) setLoading(track);
        void to.play().catch(() => undefined);
      }
    };
    if (to.readyState >= 1) go();
    else to.addEventListener("loadedmetadata", go, { once: true });
  }

  function seek(track: Track, fraction: number) {
    const set = (el: HTMLAudioElement) => {
      el.currentTime = fraction * (el.duration || duration);
      setTime((v) => ({ ...v, [track]: el.currentTime }));
    };
    void ensureSrc(track).then((el) => {
      if (!el) return;
      if (el.readyState >= 1) set(el);
      else el.addEventListener("loadedmetadata", () => set(el), { once: true });
    });
  }

  /** A link expired mid-play (or the network dropped): new link, same position, keep playing. */
  async function recover(track: Track) {
    const el = audios.current[track];
    if (!el || !el.getAttribute("src")) return;
    if (Date.now() - recoveredAt.current < 5000) {
      setLoading(null);
      setLoadErr("Preview could not load. You can still download the file.");
      return;
    }
    recoveredAt.current = Date.now();
    const at = el.currentTime;
    if (!(await refreshLinks())) return setLoadErr("Preview could not load. You can still download the file.");
    el.src = previewSrc(links.current![track]);
    applySpeed(el, speedRef.current);
    el.addEventListener(
      "loadedmetadata",
      () => {
        el.currentTime = at;
        if (wantPlay.current[track]) void el.play().catch(() => undefined);
      },
      { once: true }
    );
  }

  const floorDrop =
    r.noiseFloorBeforeDb != null && r.noiseFloorAfterDb != null ? Math.round(r.noiseFloorAfterDb - r.noiseFloorBeforeDb) : null;

  const row = (track: Track) => {
    const clean = track === "clean";
    const t = time[track];
    return (
      <div className={cx(s.wave, clean ? s.after : s.before, active === track && s.waveActive)}>
        <button
          type="button"
          className={cx(s.play, clean && s.pl2)}
          aria-label={`${playing === track ? "Pause" : "Play"} ${clean ? "cleaned" : "original"} audio`}
          onClick={() => void toggle(track)}
          aria-busy={loading === track || undefined}
        >
          {loading === track ? <span className={s.spin} aria-hidden="true" /> : playing === track ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <div className={s.wmeta}>
          <b>{clean ? "After" : "Before"}</b>
          <small>{clean ? `Cleaned · ${MODE_LABEL[job.mode] || "Remove noise"} ${job.strength}%` : "Original · noisy"}</small>
        </div>
        <Waveform
          className={s.bars}
          peaks={clean ? r.peaks?.clean || [] : r.peaks?.original || []}
          tone={clean ? "clean" : "noisy"}
          progress={duration ? Math.min(1, t / duration) : 0}
          label={`${clean ? "After" : "Before"} waveform, seek`}
          onSeek={(f) => seek(track, f)}
        />
        <span className={s.time}>
          {formatTime(t)} / {formatTime(duration)}
        </span>
        <audio
          ref={(el) => {
            audios.current[track] = el;
            applySpeed(el, speedRef.current);
          }}
          preload="metadata"
          onLoadedMetadata={(e) => applySpeed(e.currentTarget, speedRef.current)}
          onPlay={(e) => {
            applySpeed(e.currentTarget, speedRef.current);
            setPlaying(track);
          }}
          onWaiting={() => wantPlay.current[track] && setLoading(track)}
          onPlaying={() => setLoading((l) => (l === track ? null : l))}
          onError={() => void recover(track)}
          onPause={() => {
            setPlaying((p) => (p === track ? null : p));
            setLoading((l) => (l === track ? null : l));
          }}
          onEnded={() => {
            wantPlay.current[track] = false;
            setPlaying((p) => (p === track ? null : p));
          }}
          onTimeUpdate={(e) => {
            const ct = e.currentTarget.currentTime;
            setTime((v) => ({ ...v, [track]: ct }));
          }}
        />
      </div>
    );
  };

  return (
    <div className={s.resultIn}>
      <div className={s.rhead}>
        <div>
          <span className={s.kicker}>Result</span>
          <h2 className={s.rtitle}>Your clean audio is ready</h2>
        </div>
        <span className={s.badgeOk}>✓ Done in {Math.max(1, Math.round(r.processingMs / 1000))} s</span>
      </div>
      {row("original")}
      {row("clean")}
      {loadErr && <p className={s.inlineErr}>{loadErr}</p>}
      <div className={s.stats3}>
        <div>
          <b>{floorDrop != null ? `${floorDrop} dB` : "—"}</b>
          <small title="Background level in the quiet parts (10th percentile of 50 ms windows), before → after">Background noise{r.noiseFloorBeforeDb != null && r.noiseFloorAfterDb != null ? ` · ${Math.round(r.noiseFloorBeforeDb)} → ${Math.round(r.noiseFloorAfterDb)} dB` : ""}</small>
        </div>
        <div>
          <b>{r.lufs != null ? `${r.lufs} LUFS` : "—"}</b>
          <small>Loudness</small>
        </div>
        <div>
          <b>{r.format}</b>
          <small>Output · {formatBytes(r.sizeBytes)}</small>
        </div>
      </div>
      <div className={s.rmeta}>
        <p className={s.engine}>
          Cleaned with {ENGINE_LABEL[r.engine] || r.engine}
          {r.fallbackNote ? ` · ${r.fallbackNote}` : ""}
        </p>
        <SpeedControl value={speed} onChange={setSpeed} />
      </div>
      <div className={s.ractions}>
        <span className={s.ab} role="radiogroup" aria-label="Compare">
          <button type="button" role="radio" aria-checked={active === "original"} className={cx(active === "original" && s.on)} onClick={() => void switchTo("original")}>
            A Before
          </button>
          <button type="button" role="radio" aria-checked={active === "clean"} className={cx(active === "clean" && s.on)} onClick={() => void switchTo("clean")}>
            B After
          </button>
        </span>
        <button type="button" className={s.ghost} onClick={onAgain}>
          Process again
        </button>
        <button type="button" className={s.btn} onClick={onDownload} disabled={downloading}>
          <Download size={16} aria-hidden="true" /> {downloading ? "Preparing…" : `Download ${r.format}`}
        </button>
      </div>
    </div>
  );
}

export default AudioCleaner;
