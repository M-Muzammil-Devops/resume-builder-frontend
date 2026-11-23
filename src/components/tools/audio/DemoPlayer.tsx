"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatTime } from "@/lib/audioApi";
import { DEFAULT_SPEED, applySpeed, type Speed } from "@/lib/playbackSpeed";
import { SpeedControl } from "./SpeedControl";
import { Waveform } from "./Waveform";
import { DEMO_PEAKS, DEMO_SECONDS } from "./demoPeaks";
import s from "./AudioTool.module.css";

type Clip = "before" | "after";
const CLIPS: Clip[] = ["before", "after"];

/**
 * Before/After example in the empty result panel. Two tiny static clips (Opus/WebM with an MP3
 * fallback, ~60–75 KB each) that load only on first play (preload="none"). One clip plays at a
 * time; switching keeps the playback position. Same-origin files, so media-src 'self' is enough.
 */
export function DemoPlayer() {
  const els = useRef<Record<Clip, HTMLAudioElement | null>>({ before: null, after: null });
  const [active, setActive] = useState<Clip>("before");
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState<Speed>(DEFAULT_SPEED);
  const speedRef = useRef<Speed>(DEFAULT_SPEED);

  // Same speed for both clips: it survives Before/After switches and changes live while playing.
  useEffect(() => {
    speedRef.current = speed;
    CLIPS.forEach((c) => applySpeed(els.current[c], speed));
  }, [speed]);

  useEffect(() => {
    const current = els.current;
    return () => CLIPS.forEach((c) => current[c]?.pause());
  }, []);

  /** Run `fn` once metadata is known; starts the (lazy, preload="none") download if needed. */
  function whenReady(el: HTMLAudioElement, fn: () => void) {
    if (el.readyState >= 1) return fn();
    el.addEventListener("loadedmetadata", fn, { once: true });
    if (el.dataset.loading !== "1") {
      el.dataset.loading = "1";
      el.preload = "auto";
      el.load();
    }
  }

  async function playEl(el: HTMLAudioElement) {
    setLoading(el.readyState < 3);
    try {
      await el.play();
    } catch {
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const el = els.current[active];
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    if (el.ended || (el.duration && el.currentTime >= el.duration - 0.05)) el.currentTime = 0;
    el.dataset.loading = "1";
    void playEl(el);
  }

  function switchTo(clip: Clip) {
    if (clip === active) return;
    const from = els.current[active];
    const to = els.current[clip];
    const wasPlaying = !!from && !from.paused;
    const at = from?.currentTime ?? time;
    from?.pause();
    setActive(clip);
    if (!to) return;
    if (!wasPlaying && at === 0) return;
    if (to.readyState < 1) setLoading(wasPlaying);
    whenReady(to, () => {
      to.currentTime = Math.min(at, (to.duration || DEMO_SECONDS) - 0.05);
      if (wasPlaying) void playEl(to);
      else setLoading(false);
    });
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = active === "before" ? "after" : "before";
    switchTo(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-clip="${next}"]`)?.focus();
  }

  function seek(fraction: number) {
    const el = els.current[active];
    if (!el) return;
    const at = fraction * DEMO_SECONDS;
    setTime(at);
    whenReady(el, () => (el.currentTime = Math.min(at, (el.duration || DEMO_SECONDS) - 0.05)));
  }

  const after = active === "after";
  return (
    <section className={s.demo} aria-label="Example: before and after">
      <div className={s.demoHead}>
        <span className={s.demoTag}>Example</span>
        <span className={s.demoTitle}>Street noise, 10 s</span>
      </div>
      <div className={s.demoRow}>
        <button
          type="button"
          className={cx(s.play, after && s.pl2)}
          aria-label={`${playing ? "Pause" : "Play"} example, ${after ? "after cleaning" : "before cleaning"}`}
          onClick={toggle}
        >
          {loading ? <span className={s.spin} aria-hidden="true" /> : playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <div className={s.demoMain}>
          <div className={s.demoCtl}>
            <div className={s.ab} role="radiogroup" aria-label="Example version" onKeyDown={onKey}>
              {CLIPS.map((clip) => (
                <button
                  key={clip}
                  type="button"
                  role="radio"
                  data-clip={clip}
                  aria-checked={active === clip}
                  tabIndex={active === clip ? 0 : -1}
                  className={cx(active === clip && s.on)}
                  onClick={() => switchTo(clip)}
                >
                  {clip === "before" ? "Before" : "After"}
                </button>
              ))}
            </div>
            <SpeedControl value={speed} onChange={setSpeed} label="Example playback speed" />
          </div>
          <Waveform
            className={s.demoBars}
            peaks={DEMO_PEAKS[active]}
            tone={after ? "clean" : "noisy"}
            progress={Math.min(1, time / DEMO_SECONDS)}
            label={`Example ${after ? "after" : "before"} waveform, seek`}
            onSeek={seek}
          />
        </div>
        <span className={s.time}>
          {formatTime(time)} / {formatTime(DEMO_SECONDS)}
        </span>
      </div>
      {CLIPS.map((clip) => (
        <audio
          key={clip}
          ref={(el) => {
            els.current[clip] = el;
            applySpeed(el, speedRef.current);
          }}
          preload="none"
          onLoadedMetadata={(e) => applySpeed(e.currentTarget, speedRef.current)}
          onPlay={(e) => {
            applySpeed(e.currentTarget, speedRef.current);
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            if (clip === active) setTime(e.currentTarget.currentTime);
          }}
        >
          <source src={`/tools/demo/${clip}.webm`} type="audio/webm; codecs=opus" />
          <source src={`/tools/demo/${clip}.mp3`} type="audio/mpeg" />
        </audio>
      ))}
    </section>
  );
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
