"use client";

import { Activity, AlertTriangle, CreditCard, FileDown, FileText, Globe2, Mail, UserPlus, Users } from "lucide-react";
import type { Health, Overview, Range } from "./types";
import { RANGE_LONG } from "./types";
import { Donut, HoursChart, TrendChart, WorldMap, MAP_SCALE } from "./charts";
import { HealthList } from "./HealthPanel";
import { ago, cx, flag, num, pct } from "./format";
import s from "./AdminV2.module.css";

const DEVICE_COLOR = { desktop: "#3b82f6", mobile: "#8b5cf6", tablet: "#22d3ee", other: "#64748b" } as const;
const DEVICE_LABEL = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", other: "Other" } as const;

function Kpi({ icon, color, label, value, sub, hint, wide, children }: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  hint?: React.ReactNode;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cx(s.card, s.k, wide && s.wide)}>
      <div className={s.kl}>
        <i className={s.ki} style={{ background: color }} aria-hidden="true">{icon}</i>
        <span>{label}</span>
      </div>
      {value !== undefined && (
        <div className={s.kv}>
          {value} {sub && <small>{sub}</small>}
        </div>
      )}
      {hint && <div className={s.kd}>{hint}</div>}
      {children}
    </div>
  );
}

export function OverviewPanel({ data, range, health, onOpen }: { data: Overview | null; range: Range; health: Health | null; onOpen: (tab: string) => void }) {
  if (!data) return <div className={cx(s.card, s.skel)}>Loading dashboard…</div>;
  const k = data.kpis;
  const planTotal = k.billingPlanSplit.free + k.billingPlanSplit.pro;
  const proShare = planTotal ? k.billingPlanSplit.pro / planTotal : 0;
  const devTotal = data.devices.reduce((a, b) => a + b.count, 0);
  const geo = [...data.geography].sort((a, b) => b.visits - a.visits);
  const maxPage = Math.max(1, ...data.topPages.map((p) => p.views));
  const maxDay = Math.max(1, ...data.peakHours.weekdays.map((d) => d.count));
  const totals = data.dailyTrend.reduce((a, p) => ({ v: a.v + p.visits, s: a.s + p.signups }), { v: 0, s: 0 });
  const long = RANGE_LONG[range];

  return (
    <>
      <div className={s.sh}>
        <div>
          <h2>Users &amp; traffic</h2>
          <p>Numbers for the {long} · times in Pakistan time (PKT)</p>
        </div>
      </div>
      <div className={s.kpis}>
        <Kpi icon={<Users size={14} />} color="linear-gradient(135deg,#3b82f6,#8b5cf6)" label="Total users" value={num(k.totalUsers)}
          hint={<span className={s.up}>+{num(k.newUsers.period)} in {long}</span>} />
        <Kpi icon={<UserPlus size={14} />} color="linear-gradient(135deg,#22c55e,#16a34a)" label="New users" value={num(k.newUsers.today)} sub="today"
          hint={`${num(k.newUsers.period)} in ${long}`} />
        <Kpi icon={<Activity size={14} />} color="linear-gradient(135deg,#f59e0b,#f97316)" label="Active users" value={num(k.activeUsers.dau)} sub="DAU"
          hint={`${num(k.activeUsers.mau)} MAU · ${num(k.activeUsers.returning)} returning`} />
        <Kpi icon={<Globe2 size={14} />} color="linear-gradient(135deg,#22d3ee,#0ea5e9)" label="Website pages" value={num(k.totalWebsitePages.total)}
          hint={`${num(k.totalWebsitePages.views)} views · ${num(k.totalWebsitePages.tracked)} pages visited`} />
        <Kpi icon={<Mail size={14} />} color="linear-gradient(135deg,#ec4899,#a855f7)" label="Leads" value={num(k.leadsCount.total)}
          hint={`${num(k.leadsCount.contact)} contact · ${num(k.leadsCount.signups)} sign-ups`} />
        <Kpi icon={<CreditCard size={14} />} color="linear-gradient(135deg,#8b5cf6,#6366f1)" label="Billing plans" wide>
          <div className={s.split} role="img" aria-label={`Free ${k.billingPlanSplit.free}, Pro ${k.billingPlanSplit.pro}`}>
            <i style={{ width: `${planTotal ? 100 - proShare * 100 : 100}%`, background: "#3b82f6" }} />
            <i style={{ width: `${proShare * 100}%`, background: "linear-gradient(90deg,#a855f7,#f472b6)" }} />
          </div>
          <div className={s.sl}>
            <span><i className={s.dot} style={{ background: "#3b82f6" }} />Free <b>{num(k.billingPlanSplit.free)}</b></span>
            <span><i className={s.dot} style={{ background: "#a855f7" }} />Pro <b>{num(k.billingPlanSplit.pro)}</b></span>
            <span className={s.mute}>{pct(proShare)} on Pro</span>
          </div>
        </Kpi>
        <Kpi icon={<FileText size={14} />} color="linear-gradient(135deg,#0ea5e9,#3b82f6)" label="Resumes" value={num(k.resumesCount.total)}
          hint={`+${num(k.resumesCount.period)} in ${long}`} />
        <Kpi icon={<FileDown size={14} />} color="linear-gradient(135deg,#14b8a6,#22c55e)" label="PDF exports" value={num(k.pdfExportsCount.period)}
          hint={`${num(k.pdfExportsCount.total)} all time · ${num(k.audioJobsCount.period)} audio jobs`} />
        <Kpi icon={<AlertTriangle size={14} />} color="linear-gradient(135deg,#f43f5e,#f97316)" label="Error rate" value={pct(k.errorRate.rate, 2)}
          hint={<span className={k.errorRate.rate > 0.02 ? s.dn : s.up}>{num(k.errorRate.errors)} errors / {num(k.errorRate.requests)} requests</span>} />
      </div>

      <div className={cx(s.grid, s.gA)}>
        <section className={cx(s.card, s.pad)} aria-labelledby="ov-trend">
          <div className={s.ttl}>
            <div>
              <h3 id="ov-trend">Daily sign-ups &amp; traffic</h3>
              <small>Line chart · {long}</small>
            </div>
            <div className={s.legend}>
              <span><i className={s.dot} style={{ background: "#3b82f6" }} />Traffic</span>
              <span><i className={s.dot} style={{ background: "#f472b6" }} />Sign-ups</span>
            </div>
          </div>
          <TrendChart points={data.dailyTrend} />
          <div className={s.stat3}>
            <div><small>Visits</small><b>{num(totals.v)}</b></div>
            <div><small>Sign-ups</small><b>{num(totals.s)}</b></div>
            <div><small>Conversion</small><b>{totals.v ? pct(totals.s / totals.v) : "—"}</b></div>
          </div>
        </section>

        <section className={cx(s.card, s.pad)} aria-labelledby="ov-dev">
          <div className={s.ttl}>
            <div>
              <h3 id="ov-dev">Devices &amp; plans</h3>
              <small>Pie charts</small>
            </div>
          </div>
          <div className={s.dons}>
            <div className={s.don}>
              <h4>Devices</h4>
              <Donut
                items={data.devices.filter((d) => d.count > 0).map((d) => ({ label: DEVICE_LABEL[d.device], value: d.count, color: DEVICE_COLOR[d.device] }))}
                center={num(devTotal)}
                sub="sessions"
              />
              <div className={s.dl}>
                {data.devices.filter((d) => d.device !== "other" || d.count > 0).map((d) => (
                  <div key={d.device}>
                    <i style={{ background: DEVICE_COLOR[d.device] }} />
                    {DEVICE_LABEL[d.device]}
                    <b>{devTotal ? pct(d.count / devTotal, 0) : "0%"}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className={s.don}>
              <h4>Free vs Pro</h4>
              <Donut
                items={[
                  { label: "Free", value: k.billingPlanSplit.free, color: "#3b82f6" },
                  { label: "Pro", value: k.billingPlanSplit.pro, color: "#a855f7" },
                ]}
                center={pct(proShare, 0)}
                sub="on Pro"
              />
              <div className={s.dl}>
                <div><i style={{ background: "#3b82f6" }} />Free<b>{num(k.billingPlanSplit.free)}</b></div>
                <div><i style={{ background: "#a855f7" }} />Pro<b>{num(k.billingPlanSplit.pro)}</b></div>
                <div><i style={{ background: "#64748b" }} />Total<b>{num(planTotal)}</b></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className={cx(s.grid, s.gB)}>
        <section className={cx(s.card, s.pad)} aria-labelledby="ov-geo">
          <div className={s.ttl}>
            <div>
              <h3 id="ov-geo">Where users come from</h3>
              <small>Geography map · sign-ins by country · {long}</small>
            </div>
            <button type="button" className={s.link} onClick={() => onOpen("activity")}>Users &amp; Activity →</button>
          </div>
          <WorldMap data={data.geography} />
          <div className={s.mleg}>
            <span>Low</span>
            <span className={s.sc}>{MAP_SCALE.map((c) => <i key={c} style={{ background: c }} />)}</span>
            <span>High</span>
          </div>
          {geo.length === 0 ? (
            <p className={s.empty}>No location data in this range yet.</p>
          ) : (
            <div className={s.ctry}>
              {geo.slice(0, 6).map((g) => (
                <div key={`${g.code}${g.country}`}>
                  <span>{flag(g.code)} {g.country}</span>
                  <b>{num(g.users)}</b>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={cx(s.card, s.pad)} aria-labelledby="ov-peak">
          <div className={s.ttl}>
            <div>
              <h3 id="ov-peak">Peak hours traffic</h3>
              <small>Bar chart · visits by hour (PKT)</small>
            </div>
          </div>
          {data.peakHours.total === 0 ? (
            <p className={s.empty}>No traffic recorded in this range yet.</p>
          ) : (
            <>
              <HoursChart hours={data.peakHours.hours} peakFrom={data.peakHours.peak.from} quietFrom={data.peakHours.quiet.from} />
              <div className={s.pkinfo}>
                <div>
                  <span className={s.pdot} style={{ background: "#f472b6" }} />
                  <div><b>{data.peakHours.peak.label}</b><small>Busiest · {pct(data.peakHours.peak.share, 0)} of traffic</small></div>
                </div>
                <div>
                  <span className={s.pdot} style={{ background: "#64748b" }} />
                  <div><b>{data.peakHours.quiet.label}</b><small>Quietest · {pct(data.peakHours.quiet.share, 0)} of traffic</small></div>
                </div>
              </div>
            </>
          )}
          <div className={s.days}>
            <div className={s.dt}>
              <b>Busiest days</b>
              <small>{data.peakHours.busiestDay ? `${data.peakHours.busiestDay} leads` : "No data yet"}</small>
            </div>
            <div className={s.dg}>
              {data.peakHours.weekdays.map((d) => (
                <div key={d.day} title={`${d.day}: ${d.count}`}>
                  <span className={d.day === data.peakHours.busiestDay ? s.dTop : undefined} style={{ height: `${Math.max(3, (d.count / maxDay) * 60)}px` }} />
                  <small>{d.day}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className={cx(s.grid, s.g3)}>
        <section className={cx(s.card, s.pad)} aria-labelledby="ov-pages">
          <div className={s.ttl}>
            <div><h3 id="ov-pages">Top pages</h3><small>Page views · {long}</small></div>
            <button type="button" className={s.link} onClick={() => onOpen("pages")}>All pages →</button>
          </div>
          {data.topPages.length === 0 ? (
            <p className={s.empty}>No page views yet (only visitors who allow analytics cookies are counted).</p>
          ) : (
            data.topPages.map((p) => (
              <div key={p.path} className={s.it}>
                <div className={s.itMain}>
                  <b>{p.path}</b>
                  <div className={s.pgbar}><i style={{ width: `${(p.views / maxPage) * 100}%` }} /></div>
                </div>
                <div className={s.itR}>{num(p.views)}</div>
              </div>
            ))
          )}
        </section>

        <section className={cx(s.card, s.pad)} aria-labelledby="ov-health">
          <div className={s.ttl}>
            <div><h3 id="ov-health">System health</h3><small>Live checks</small></div>
            <button type="button" className={s.link} onClick={() => onOpen("health")}>Details →</button>
          </div>
          <HealthList health={health} compact />
        </section>

        <section className={cx(s.card, s.pad)} aria-labelledby="ov-leads">
          <div className={s.ttl}>
            <div><h3 id="ov-leads">Latest leads</h3><small>Contact form &amp; sign-ups</small></div>
            <button type="button" className={s.link} onClick={() => onOpen("leads")}>All leads →</button>
          </div>
          {data.latestLeads.length === 0 ? (
            <p className={s.empty}>No leads in this range yet.</p>
          ) : (
            data.latestLeads.map((l) => (
              <div key={l.id} className={s.it}>
                <span className={cx(s.fi)} style={{ background: l.type === "contact" ? "linear-gradient(135deg,#ec4899,#a855f7)" : "linear-gradient(135deg,#22c55e,#16a34a)" }} aria-hidden="true">
                  {l.type === "contact" ? <Mail size={15} /> : <UserPlus size={15} />}
                </span>
                <div className={s.itMain}>
                  <b>{l.name}</b>
                  <small>{l.email}</small>
                </div>
                <div className={s.itR}><span className={s.mute}>{ago(l.createdAt)}</span></div>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
