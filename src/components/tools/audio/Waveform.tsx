"use client";

import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef } from "react";

type Props = {
  peaks: number[];
  progress: number;
  tone: "noisy" | "clean";
  label: string;
  onSeek?: (fraction: number) => void;
  className?: string;
};

/** Canvas waveform from server-computed peaks (no audio decoding in the browser). Click / arrows seek. */
export function Waveform({ peaks, progress, tone, label, onSeek, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bars = Math.max(24, Math.min(peaks.length || 64, Math.floor(w / 6)));
      const gap = 3;
      const bw = Math.max(2, (w - gap * (bars - 1)) / bars);
      const max = Math.max(0.05, ...peaks);
      const played = progress * bars;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      if (tone === "noisy") {
        grad.addColorStop(0, "rgba(253,164,175,0.9)");
        grad.addColorStop(1, "rgba(225,29,72,0.9)");
      } else {
        grad.addColorStop(0, "#7dd3fc");
        grad.addColorStop(1, "#6366f1");
      }
      for (let i = 0; i < bars; i++) {
        const src = peaks.length ? peaks[Math.min(peaks.length - 1, Math.floor((i / bars) * peaks.length))] : 0.1;
        const v = Math.max(0.05, Math.min(1, src / max));
        const bh = Math.max(3, v * h * 0.95);
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        const isPlayed = i < played;
        ctx.fillStyle = tone === "noisy" ? grad : isPlayed ? grad : "rgba(125,211,252,0.38)";
        ctx.globalAlpha = tone === "noisy" && !isPlayed && progress > 0 ? 0.55 : 1;
        const r = Math.min(bw / 2, 3);
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bh, r);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [peaks, progress, tone]);

  function seekAt(clientX: number) {
    const canvas = ref.current;
    if (!canvas || !onSeek) return;
    const rect = canvas.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  }

  function onKey(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    if (!onSeek) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      onSeek(Math.max(0, Math.min(1, progress + (event.key === "ArrowRight" ? 0.05 : -0.05))));
    }
  }

  return (
    <canvas
      ref={ref}
      className={className}
      role="slider"
      tabIndex={onSeek ? 0 : -1}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      onClick={(e) => seekAt(e.clientX)}
      onKeyDown={onKey}
    />
  );
}
