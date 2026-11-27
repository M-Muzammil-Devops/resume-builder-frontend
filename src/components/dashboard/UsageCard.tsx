"use client";

import { Sparkles } from "lucide-react";
import type { DashUsage } from "./types";
import { cx, shortDate, usagePct } from "./format";
import s from "./Dashboard.module.css";

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const pct = usagePct(used, limit);
  const near = limit > 0 && pct >= 80;
  const u = unit ? ` ${unit}` : "";
  const text = limit > 0 ? `${used} of ${limit}${u}` : `${used}${u} · Unlimited`;
  return (
    <div className={s.meter}>
      <div className={s.meterT}>
        {label} <span>{text}</span>
      </div>
      <div
        className={s.bar}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit > 0 ? limit : undefined}
        aria-valuenow={used}
        aria-valuetext={text}
      >
        <i className={cx(near && s.barWarn, !limit && s.barInf)} style={{ width: limit > 0 ? `${Math.max(pct, used > 0 ? 3 : 0)}%` : "100%" }} />
      </div>
    </div>
  );
}

export function UsageCard({ usage, onPlans }: { usage: DashUsage; onPlans: () => void }) {
  const free = usage.plan === "FREE";
  return (
    <section id="plan" className={cx(s.card, s.usage, s.sec)} style={{ marginBottom: 0 }} aria-labelledby="dash-usage">
      <div className={s.ttl}>
        <h3 id="dash-usage">Plan &amp; usage</h3>
        <span className={cx(s.pill, free ? s.bl : s.g)}>
          {usage.plan === "ADMIN" ? "ADMIN" : usage.plan} · resets {shortDate(usage.resetsAt)}
        </span>
      </div>
      <Meter label="PDF exports" used={usage.pdfExportsUsed} limit={usage.pdfExportsLimit} />
      <Meter label="Noise Remover" used={usage.audioMinutesUsed} limit={usage.audioMinutesLimit} unit="min" />
      <Meter label="Resumes" used={usage.resumesUsed} limit={usage.resumesLimit} />
      <div className={s.upg}>
        <Sparkles size={17} aria-hidden="true" color="#a78bfa" />
        <span>{free ? <><b>Pro</b> raises your limits</> : <><b>{usage.plan === "ADMIN" ? "Admin" : "Pro"}</b> plan is active</>}</span>
        <button type="button" className={cx(s.btn, s.primary, s.sm)} onClick={onPlans}>
          See plans
        </button>
      </div>
    </section>
  );
}
