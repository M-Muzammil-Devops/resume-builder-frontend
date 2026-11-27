"use client";

import Link from "next/link";
import { AudioLines, FileType2, Mail, Plus, Sparkles, Briefcase } from "lucide-react";
import type { CoverLetterRow } from "./types";
import { cx, timeAgo } from "./format";
import s from "./Dashboard.module.css";

const TOOLS = [
  { href: "/user/noise-remover", label: "Noise Remover", sub: "Clean interview audio", icon: AudioLines, bg: "linear-gradient(135deg,#22d3ee,#3b82f6)" },
  { href: "/user/pdf-tools", label: "PDF Tools", sub: "25+ tools · coming soon", icon: FileType2, bg: "linear-gradient(135deg,#f59e0b,#f43f5e)" },
  { href: "/user/jobs", label: "Jobs", sub: "Search and shortlist roles", icon: Briefcase, bg: "linear-gradient(135deg,#22c55e,#14b8a6)" },
  { href: "/user/tracker", label: "Tracker", sub: "Your applications", icon: Sparkles, bg: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
];

export function ToolsCard() {
  return (
    <section className={cx(s.card, s.pad)} aria-labelledby="dash-tools">
      <div className={s.ttl}>
        <h3 id="dash-tools">Tools</h3>
        <Link className={s.link} href="/user/auto-apply">
          Auto Apply →
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
          <p>Generate one in seconds from a finalized resume, then download PDF or DOCX.</p>
          <button type="button" className={cx(s.btn, s.primary, s.sm)} onClick={onNew} disabled={busy}>
            <Plus size={14} aria-hidden="true" />
            Generate cover letter
          </button>
        </div>
      ) : (
        <ul className={s.letters} style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {letters.slice(0, 4).map((l) => (
            <li key={l.id} className={s.it}>
              <span className={s.fi} style={{ background: "rgba(139,92,246,.16)", color: "#a78bfa" }} aria-hidden="true">
                <Mail size={17} />
              </span>
              <Link href={`/user/cover-letters?id=${encodeURIComponent(l.id)}`} className={s.itTxt}>
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
