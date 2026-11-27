"use client";

import Link from "next/link";
import { AudioLines, Download, FileText, FileType2, Mail, Plus, Sparkles, Briefcase } from "lucide-react";
import type { CoverLetterRow, DashDownload } from "./types";
import { cx, timeAgo } from "./format";
import s from "./Dashboard.module.css";

const TOOLS = [
  { href: "/tools/audio-noise-remover", label: "Noise Remover", sub: "Clean interview audio", icon: AudioLines, bg: "linear-gradient(135deg,#22d3ee,#3b82f6)" },
  { href: "/tools#pdf", label: "PDF Tools", sub: "25 tools · coming soon", icon: FileType2, bg: "linear-gradient(135deg,#f59e0b,#f43f5e)" },
  { href: "/user/jobs", label: "Jobs", sub: "Search and track roles", icon: Briefcase, bg: "linear-gradient(135deg,#22c55e,#14b8a6)" },
  { href: "/user/jobs/tracker", label: "Tracker", sub: "Your applications", icon: Sparkles, bg: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
];

export function ToolsCard() {
  return (
    <section className={cx(s.card, s.pad)} aria-labelledby="dash-tools">
      <div className={s.ttl}>
        <h3 id="dash-tools">Tools</h3>
        <Link className={s.link} href="/tools">
          All tools →
        </Link>
      </div>
      <div className={s.tl}>
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} href={t.href} className={s.tool}>
              <span className={s.ti} style={{ background: t.bg }} aria-hidden="true">
                <Icon size={18} />
              </span>
              <span>
                <b>{t.label}</b>
                <small>{t.sub}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function DownloadsCard({ downloads, pdfId, onDownload }: { downloads: DashDownload[]; pdfId: string | null; onDownload: (d: DashDownload) => void }) {
  return (
    <section id="downloads" className={cx(s.card, s.pad, s.sec)} style={{ marginBottom: 0 }} aria-labelledby="dash-downloads">
      <div className={s.ttl}>
        <h3 id="dash-downloads">Recent downloads</h3>
        {downloads.length > 0 && <span className={cx(s.pill, s.gr)}>{downloads.length} latest</span>}
      </div>
      {downloads.length === 0 ? (
        <div className={s.empty}>
          <div className={s.art} aria-hidden="true">
            <Download size={34} />
          </div>
          <h4>No downloads yet</h4>
          <p>Your PDF exports and cleaned audio files will show up here.</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {downloads.map((d) => {
            const audio = d.kind === "audio";
            const name = audio ? d.title : `${d.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "Resume"}.${d.format}`;
            const sub = audio
              ? `Noise Remover${d.durationSec ? ` · ${Math.max(1, Math.round(d.durationSec / 60))} min` : ""} · ${timeAgo(d.createdAt)}`
              : `${d.pageSize || d.format.toUpperCase()} · ${timeAgo(d.createdAt)}`;
            return (
              <li key={d.id} className={s.it}>
                <span className={cx(s.fi, audio && s.fiAudio)} aria-hidden="true">
                  {audio ? <AudioLines size={17} /> : <FileText size={17} />}
                </span>
                <span className={s.itTxt}>
                  <b title={name}>{name}</b>
                  <small>{sub}</small>
                </span>
                {audio ? (
                  <Link href="/tools/audio-noise-remover" className={cx(s.btn, s.sm)} aria-label="Open Noise Remover">
                    Open
                  </Link>
                ) : d.resumeId ? (
                  <button
                    type="button"
                    className={cx(s.btn, s.sm, s.ic)}
                    aria-label={`Download ${name} again`}
                    disabled={pdfId === d.resumeId}
                    onClick={() => onDownload(d)}
                  >
                    <Download size={14} aria-hidden="true" />
                  </button>
                ) : (
                  <span className={cx(s.pill, s.gr)}>Deleted</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function CoverLettersCard({ letters, busy, onNew }: { letters: CoverLetterRow[]; busy: boolean; onNew: () => void }) {
  return (
    <section id="cover-letters" className={cx(s.card, s.pad, s.sec)} style={{ marginBottom: 0 }} aria-labelledby="dash-letters">
      <div className={s.ttl}>
        <h3 id="dash-letters">Cover letters</h3>
        {letters.length > 0 ? (
          <button type="button" className={s.link} onClick={onNew} disabled={busy}>
            + New
          </button>
        ) : (
          <span className={cx(s.pill, s.gr)}>EMPTY</span>
        )}
      </div>
      {letters.length === 0 ? (
        <div className={s.empty}>
          <div className={s.art} aria-hidden="true">
            <Mail size={34} />
          </div>
          <h4>No cover letters yet</h4>
          <p>Write one in minutes. It uses the details from your resume.</p>
          <button type="button" className={cx(s.btn, s.primary, s.sm)} onClick={onNew} disabled={busy}>
            <Plus size={14} aria-hidden="true" />
            Write a cover letter
          </button>
        </div>
      ) : (
        <ul className={s.letters} style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {letters.slice(0, 4).map((l) => (
            <li key={l.id} className={s.it}>
              <span className={s.fi} style={{ background: "rgba(139,92,246,.16)", color: "#a78bfa" }} aria-hidden="true">
                <Mail size={17} />
              </span>
              <Link href={`/user/cover-letters/${l.id}`} className={s.itTxt}>
                <b title={l.title}>{l.title}</b>
                <small>{l.updatedAt ? `Edited ${timeAgo(l.updatedAt)}` : "Draft"}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
