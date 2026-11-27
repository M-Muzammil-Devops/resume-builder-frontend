"use client";

import { RefreshCw } from "lucide-react";
import type { Health, HealthStatus } from "./types";
import { cx, num, pct, pkt, uptime } from "./format";
import s from "./AdminV2.module.css";

const DOT: Record<HealthStatus, string> = { ok: "", warn: s.hsW, down: s.hsD, off: s.hsO, unknown: s.hsO };
const PILL: Record<HealthStatus, [string, string]> = {
  ok: [s.pG, "Healthy"],
  warn: [s.pA, "Check"],
  down: [s.pR, "Down"],
  off: [s.pN, "Off"],
  unknown: [s.pN, "Unknown"],
};

function rows(h: Health) {
  return [
    { key: "backend", name: "Backend API", status: h.backend.status, detail: `Up ${uptime(h.backend.uptimeSeconds)} · ${h.backend.node} · ${num(h.backend.rssMb)} MB`, value: "OK", bar: null as number | null },
    { key: "pg", name: "Postgres", status: h.postgres.status, detail: "Database query", value: h.postgres.latencyMs !== null ? `${h.postgres.latencyMs} ms` : "—", bar: null },
    { key: "redis", name: "Redis", status: h.redis.status, detail: h.redis.status === "ok" ? "Cache ping" : h.redis.reason || "Not connected", value: h.redis.latencyMs !== null ? `${h.redis.latencyMs} ms` : "—", bar: null },
    { key: "disk", name: "Disk", status: h.disk.status, detail: h.disk.usedGb !== null ? `${h.disk.usedGb} / ${h.disk.totalGb} GB used` : "Unavailable", value: h.disk.pct !== null ? pct(h.disk.pct, 0) : "—", bar: h.disk.pct },
    { key: "ram", name: "RAM", status: h.ram.status, detail: `${num(h.ram.usedMb)} / ${num(h.ram.totalMb)} MB used`, value: pct(h.ram.pct, 0), bar: h.ram.pct },
    {
      key: "smtp",
      name: "SMTP email",
      status: h.smtp.status,
      detail: !h.smtp.configured ? "Not configured" : h.smtp.status === "ok" ? `${h.smtp.host} · login OK` : `${h.smtp.host} · ${h.smtp.error || "login failed"}`,
      value: PILL[h.smtp.status][1],
      bar: null,
    },
  ];
}

export function HealthList({ health, compact }: { health: Health | null; compact?: boolean }) {
  if (!health) return <div className={s.skel}>Checking…</div>;
  return (
    <div>
      {rows(health).map((r) => (
        <div key={r.key} className={s.it}>
          <span className={cx(s.hs, DOT[r.status])} aria-hidden="true" />
          <div className={s.itMain}>
            <b>{r.name}</b>
            <small title={r.detail}>{r.detail}</small>
          </div>
          <div className={s.itR}>
            {compact ? r.value : <span className={cx(s.pill, PILL[r.status][0])}>{r.value}</span>}
            {r.bar !== null && <div className={s.mini}><i style={{ width: `${Math.min(100, r.bar * 100)}%` }} /></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HealthPanel({ health, onRefresh, busy }: { health: Health | null; onRefresh: () => void; busy: boolean }) {
  const all = health ? rows(health) : [];
  const bad = all.filter((r) => r.status === "down").length;
  const warn = all.filter((r) => r.status === "warn").length;
  return (
    <>
      <div className={s.sh}>
        <div>
          <h2>System health</h2>
          <p>{health ? `Checked ${pkt(health.checkedAt)}` : "Running live checks…"}</p>
        </div>
        <button type="button" className={s.btn} onClick={onRefresh} disabled={busy}>
          <RefreshCw size={14} aria-hidden="true" /> {busy ? "Checking…" : "Re-check"}
        </button>
      </div>
      {health && (
        <div className={s.notice} role="status">
          {bad ? `${bad} service${bad > 1 ? "s are" : " is"} down.` : warn ? `${warn} item${warn > 1 ? "s need" : " needs"} attention.` : "All services are healthy."}
        </div>
      )}
      <section className={cx(s.card, s.pad)}>
        <HealthList health={health} />
      </section>
    </>
  );
}
