"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";
import { AudioCleaner } from "./AudioCleaner";
import s from "./AudioTool.module.css";

/**
 * Noise Remover tool only (upload, mode, clean, preview, download) for the User Dashboard shell.
 * The public /tools/audio-noise-remover page keeps its own hero, header and footer.
 */
export function AudioToolEmbed({ toolPath = "/user/noise-remover" }: { toolPath?: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSignedIn(Boolean(getToken())));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <section className={`${s.root} ${s.embed}`} aria-label="Noise Remover">
      <AudioCleaner initialMode="noise" signedIn={signedIn} toolPath={toolPath} />
      <p className={s.privacy}>🔒 Files are processed on our server, never shared, and deleted automatically after 1 hour.</p>
    </section>
  );
}
