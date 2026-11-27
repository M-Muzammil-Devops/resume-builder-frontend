"use client";

import { useEffect, useId, useMemo, useState } from "react";
import s from "./AdminV2.module.css";
import { cx, flag, num } from "./format";

/* ---------- Line chart: daily traffic (area) + sign-ups (line) ---------- */
export function TrendChart({ points }: { points: { date: string; signups: number; visits: number }[] }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 230;
  const L = 34;
  const R = 10;
  const T = 12;
  const B = 26;
  const n = Math.max(points.length, 1);
  const maxV = Math.max(4, ...points.map((p) => p.visits));
  const maxS = Math.max(2, ...points.map((p) => p.signups));
  const x = (i: number) => (n === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const yV = (v: number) => T + (H - T - B) * (1 - v / maxV);
  const yS = (v: number) => T + (H - T - B) * (1 - v / maxS);
  const visitPath = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yV(p.visits).toFixed(1)}`).join("");
  const signPath = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yS(p.signups).toFixed(1)}`).join("");
  const area = points.length ? `${visitPath}L${x(points.length - 1).toFixed(1)},${H - B}L${x(0).toFixed(1)},${H - B}Z` : "";
  const step = Math.max(1, Math.ceil(n / 7));
  const ticks = [0, 0.5, 1].map((f) => Math.round(maxV * f));
  const h = hover !== null ? points[hover] : null;
  return (
    <div>
      <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily sign-ups and traffic" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity="0.45" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`l${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className={s.gridLine} x1={L} x2={W - R} y1={yV(t)} y2={yV(t)} />
            <text x={L - 6} y={yV(t) + 4} textAnchor="end">{num(t)}</text>
          </g>
        ))}
        {area && <path d={area} fill={`url(#a${id})`} />}
        {visitPath && <path d={visitPath} fill="none" stroke={`url(#l${id})`} strokeWidth="2.4" strokeLinejoin="round" />}
        {signPath && <path d={signPath} fill="none" stroke="#f472b6" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />}
        {points.map((p, i) =>
          i % step === 0 || i === n - 1 ? (
            <text key={p.date} x={x(i)} y={H - 6} textAnchor="middle">{p.date.slice(5)}</text>
          ) : null
        )}
        {points.map((p, i) => (
          <rect
            key={`h${p.date}`}
            x={x(i) - (W - L - R) / n / 2}
            y={T}
            width={(W - L - R) / n}
            height={H - T - B}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
          />
        ))}
        {h && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#a78bfa" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={yV(h.visits)} r="4.5" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
            <circle cx={x(hover)} cy={yS(h.signups)} r="4" fill="#f472b6" stroke="#fff" strokeWidth="1.5" />
          </g>
        )}
      </svg>
      <div className={s.legend} aria-live="polite">
        {h ? (
          <span>
            <b>{h.date}</b> · {num(h.visits)} visits · {num(h.signups)} sign-ups
          </span>
        ) : (
          <span className={s.mute}>Hover or tap a day for its numbers</span>
        )}
      </div>
    </div>
  );
}

/* ---------- Bar chart: 24-hour traffic (PKT), peak hours highlighted ---------- */
export function HoursChart({ hours, peakFrom, quietFrom }: { hours: { hour: number; label: string; count: number }[]; peakFrom: number; quietFrom: number }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 480;
  const H = 190;
  const B = 22;
  const max = Math.max(1, ...hours.map((h) => h.count));
  const bw = W / 24;
  const inWin = (h: number, from: number) => h === from || h === (from + 1) % 24;
  const total = hours.reduce((a, b) => a + b.count, 0);
  return (
    <div>
      <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Traffic by hour of day, Pakistan time">
        <defs>
          <linearGradient id={`p${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f472b6" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {hours.map((h) => {
          const bh = total ? Math.max(3, ((H - B - 8) * h.count) / max) : 3;
          const peak = total > 0 && inWin(h.hour, peakFrom);
          const quiet = total > 0 && inWin(h.hour, quietFrom);
          return (
            <rect
              key={h.hour}
              className={s.barHover}
              x={h.hour * bw + 2}
              y={H - B - bh}
              width={bw - 4}
              height={bh}
              rx="3"
              fill={peak ? `url(#p${id})` : quiet ? "rgba(127,140,190,.35)" : "rgba(59,130,246,.75)"}
              onMouseEnter={() => setHover(h.hour)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(h.hour)}
            >
              <title>{`${h.label}: ${h.count}`}</title>
            </rect>
          );
        })}
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={h * bw + bw / 2} y={H - 6} textAnchor="middle">
            {hours[h]?.label.replace(" ", "")}
          </text>
        ))}
      </svg>
      <div className={s.legend} aria-live="polite">
        <span><i className={s.dot} style={{ background: "linear-gradient(#f472b6,#8b5cf6)" }} />Peak</span>
        <span><i className={s.dot} style={{ background: "#3b82f6" }} />Normal</span>
        <span><i className={s.dot} style={{ background: "rgba(127,140,190,.5)" }} />Quiet</span>
        {hover !== null && <span><b>{hours[hover]?.label}</b> · {num(hours[hover]?.count)} visits</span>}
      </div>
    </div>
  );
}

/* ---------- Donut ---------- */
export function Donut({ items, center, sub }: { items: { label: string; value: number; color: string }[]; center: string; sub: string }) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const r = 46;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg className={s.donSvg} viewBox="0 0 120 120" role="img" aria-label={`${sub}: ${items.map((i) => `${i.label} ${i.value}`).join(", ")}`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(127,140,190,.18)" strokeWidth="14" />
      {total > 0 &&
        items.map((it) => {
          const len = (it.value / total) * c;
          const el = (
            <circle
              key={it.label}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={it.color}
              strokeWidth="14"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            >
              <title>{`${it.label}: ${it.value}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      <text x="60" y="60" textAnchor="middle">{center}</text>
      <text x="60" y="76" textAnchor="middle" className={s.donSub}>{sub}</text>
    </svg>
  );
}

/* ---------- Geography world map (inline SVG, lazy-loaded paths) ---------- */
type Geo = { code: string | null; country: string; visits: number; users: number };
type WorldData = { WORLD_VIEWBOX: string; WORLD_COUNTRIES: ReadonlyArray<readonly [string, string, string, number, number]> };

const SCALE = ["#38bdf8", "#3b82f6", "#6366f1", "#8b5cf6"];
function shade(v: number, max: number) {
  if (v <= 0) return null;
  const f = v / max;
  return f > 0.66 ? SCALE[3] : f > 0.33 ? SCALE[2] : f > 0.12 ? SCALE[1] : SCALE[0];
}

export function WorldMap({ data }: { data: Geo[] }) {
  const [world, setWorld] = useState<WorldData | null>(null);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void import("./worldMap").then((m) => {
      if (alive) setWorld(m);
    });
    return () => {
      alive = false;
    };
  }, []);
  const byCode = useMemo(() => {
    const m = new Map<string, Geo>();
    for (const g of data) if (g.code) m.set(g.code, g);
    return m;
  }, [data]);
  const max = Math.max(1, ...data.map((d) => d.visits));
  const [vw, vh] = world ? world.WORLD_VIEWBOX.split(" ").slice(2).map(Number) : [960, 440];
  const act = active ? world?.WORLD_COUNTRIES.find((c) => c[0] === active) : null;
  const actGeo = active ? byCode.get(active) : null;
  return (
    <div className={s.mapw} onMouseLeave={() => setActive(null)}>
      {world ? (
        <svg className={s.map} viewBox={world.WORLD_VIEWBOX} role="img" aria-label="Users and visits by country">
          {world.WORLD_COUNTRIES.map(([code, name, d]) => {
            const g = code ? byCode.get(code) : undefined;
            const fill = g ? shade(g.visits, max) : null;
            return fill ? (
              <path
                key={`${code}${name}`}
                d={d}
                fill={fill}
                className={cx(s.landHi, active === code && s.landOn)}
                onMouseEnter={() => setActive(code)}
                onClick={() => setActive(code)}
                tabIndex={0}
                onFocus={() => setActive(code)}
                aria-label={`${name}: ${g?.users} users, ${g?.visits} visits`}
              />
            ) : (
              <path key={`${code}${name}`} d={d} className={s.land} />
            );
          })}
          {world.WORLD_COUNTRIES.map(([code, , , cx0, cy0]) => {
            const g = code ? byCode.get(code) : undefined;
            if (!g) return null;
            const r = 4 + Math.sqrt(g.visits / max) * 9;
            return (
              <g key={`pin${code}`}>
                <circle cx={cx0} cy={cy0} r={r} className={s.pin} />
                <circle cx={cx0} cy={cy0} r={2.4} className={s.pinDot} />
              </g>
            );
          })}
        </svg>
      ) : (
        <div className={s.skel}>Loading map…</div>
      )}
      {act && actGeo && (
        <div className={s.tip} style={{ left: `${(act[3] / vw) * 100}%`, top: `${(act[4] / vh) * 100}%` }} role="status">
          <b>{flag(actGeo.code)} {actGeo.country}</b>
          <small>{num(actGeo.users)} users · {num(actGeo.visits)} visits</small>
        </div>
      )}
    </div>
  );
}

export const MAP_SCALE = SCALE;
