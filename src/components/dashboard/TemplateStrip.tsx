"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { LandingTemplate } from "@/lib/landingTemplates";
import s from "./Dashboard.module.css";

export function TemplateStrip({
  templates,
  busy,
  onBlank,
  onPick,
}: {
  templates: LandingTemplate[];
  busy: boolean;
  onBlank: () => void;
  onPick: (t: LandingTemplate) => void;
}) {
  return (
    <section id="templates" className={s.sec} aria-labelledby="dash-templates">
      <div className={s.secTtl}>
        <h2 id="dash-templates">
          Start from a template <small>{templates.length} ATS-ready designs</small>
        </h2>
        <Link className={s.link} href="/#templates">
          Browse all →
        </Link>
      </div>
      <div className={s.strip} role="list" aria-label="Templates">
        <div role="listitem" style={{ display: "contents" }}>
          <button type="button" className={s.tpl} disabled={busy} onClick={onBlank} aria-label="Start a blank resume">
            <div className={`${s.tplTh} ${s.blankTh}`}>
              <div>
                <Plus size={28} aria-hidden="true" />
                Blank resume
              </div>
            </div>
            <b>Start blank</b>
            <small>Guided sample layout</small>
          </button>
        </div>
        {templates.map((t) => (
          <div role="listitem" key={t.id} style={{ display: "contents" }}>
            <button type="button" className={s.tpl} disabled={busy} onClick={() => onPick(t)} aria-label={`Use the ${t.name} template`}>
              <div className={s.tplTh}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image} alt="" loading="lazy" decoding="async" width={300} height={400} />
              </div>
              <b>{t.name}</b>
              <small>{t.blurb}</small>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
