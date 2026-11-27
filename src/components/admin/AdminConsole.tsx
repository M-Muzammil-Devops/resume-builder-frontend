"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CreditCard,
  Cookie,
  FileText,
  FileUp,
  Globe2,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { ApiError, apiFetch, getRefreshToken, getToken, logoutSession, refreshAdminCookie } from "@/lib/api";
import { ADMIN_LOGIN_PATH, USER_HOME_PATH } from "@/lib/adminSession";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { UsersActivityPanel } from "./UsersActivityPanel";
import { PdfControlPanel } from "./PdfControlPanel";
import { OverviewPanel } from "./v2/OverviewPanel";
import { UsersPanel } from "./v2/UsersPanel";
import { BillingPanel } from "./v2/BillingPanel";
import { TeamPanel } from "./v2/TeamPanel";
import { HealthPanel } from "./v2/HealthPanel";
import { AuditPanel, ConsentsPanel, LeadsPanel, PagesPanel } from "./v2/ListPanels";
import { UploadsPanel } from "./v2/UploadsPanel";
import type { AdminAccess, AdminMe, Health, Overview, Range } from "./v2/types";
import { RANGE_LABEL } from "./v2/types";
import { cx, initials } from "./v2/format";
import s from "./v2/AdminV2.module.css";

export type AdminTab =
  | "overview"
  | "users"
  | "activity"
  | "leads"
  | "pdf"
  | "templates"
  | "pages"
  | "billing"
  | "team"
  | "health"
  | "consents"
  | "audit";
type Tab = AdminTab;

/** BUG-1220: each tab has its own URL. */
export const TAB_PATH: Record<Tab, string> = {
  overview: "/admin",
  users: "/admin/users",
  activity: "/admin/activity",
  leads: "/admin/leads",
  pdf: "/admin/pdf",
  templates: "/admin/templates",
  pages: "/admin/pages",
  billing: "/admin/billing",
  team: "/admin/team",
  health: "/admin/health",
  consents: "/admin/consents",
  audit: "/admin/audit",
};

type NavItem = { id: Tab; label: string; Icon: typeof Activity; need?: "canBilling" | "canSystem" };
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "General",
    items: [
      { id: "overview", label: "Overview", Icon: LayoutDashboard },
      { id: "users", label: "Users", Icon: Users },
      { id: "activity", label: "Users & Activity", Icon: Activity },
      { id: "leads", label: "Leads", Icon: Mail },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "pdf", label: "PDF & Templates", Icon: FileText },
      { id: "templates", label: "Uploads", Icon: FileUp },
      { id: "pages", label: "Website Pages", Icon: Globe2 },
    ],
  },
  {
    label: "Business",
    items: [
      { id: "billing", label: "Billing & Invoices", Icon: CreditCard, need: "canBilling" },
      { id: "team", label: "Manage Team", Icon: ShieldCheck, need: "canSystem" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "health", label: "System Health", Icon: HeartPulse, need: "canSystem" },
      { id: "consents", label: "Cookie Consents", Icon: Cookie, need: "canSystem" },
      { id: "audit", label: "Audit Log", Icon: ScrollText, need: "canSystem" },
    ],
  },
];

const HEADING: Record<Tab, [string, string]> = {
  overview: ["Overview", "Users, traffic, billing and system at a glance"],
  users: ["Users", "Accounts, plans and status"],
  activity: ["Users & Activity", "Every sign-in with location, device and time"],
  leads: ["Leads", "Contact-form messages and new sign-ups"],
  pdf: ["PDF & Templates", "Built-in templates, user resumes, export settings"],
  templates: ["Uploads", "Templates uploaded as PDF + preview"],
  pages: ["Website Pages", "Every public page and its views"],
  billing: ["Billing & Invoices", "Revenue, balances and invoices"],
  team: ["Manage Team", "Team access and permissions"],
  health: ["System Health", "Backend, database, cache, disk, memory and email"],
  consents: ["Cookie Consents", "Cookie banner choices"],
  audit: ["Audit Log", "Every admin action"],
};

const RANGED: Tab[] = ["overview", "leads", "pages"];

function tabFromPath(path: string): Tab {
  const clean = path.replace(/\/+$/, "") || "/admin";
  return (Object.keys(TAB_PATH) as Tab[]).find((t) => TAB_PATH[t] === clean) || "overview";
}

function allowedTab(tab: Tab, access: AdminAccess | null): boolean {
  const item = GROUPS.flatMap((g) => g.items).find((i) => i.id === tab);
  if (!item?.need) return true;
  return Boolean(access?.[item.need]);
}

export default function AdminConsole({ initialTab = "overview" }: { initialTab?: Tab }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [range, setRange] = useState<Range>("7d");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  useEscapeClose(() => setDrawer(false), drawer);

  const access = me?.access ?? null;

  function selectTab(next: Tab) {
    setTab(next);
    setDrawer(false);
    if (window.location.pathname !== TAB_PATH[next]) window.history.pushState(null, "", TAB_PATH[next]);
    window.scrollTo({ top: 0 });
  }

  useEffect(() => {
    const onPop = () => setTab(tabFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getToken() && !getRefreshToken()) {
        window.location.replace(ADMIN_LOGIN_PATH);
        return;
      }
      try {
        const res = await apiFetch<AdminMe>("/admin/me");
        if (!alive) return;
        setMe(res);
        void refreshAdminCookie();
        setReady(true);
      } catch (err) {
        window.location.replace(err instanceof ApiError && err.status === 403 ? USER_HOME_PATH : `${ADMIN_LOGIN_PATH}?reason=session`);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadOverview = useCallback(async (r: Range) => {
    try {
      setOverview(await apiFetch<Overview>(`/admin/overview?range=${r}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the dashboard");
    }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthBusy(true);
    try {
      setHealth(await apiFetch<Health>("/admin/health"));
    } catch {
      setHealth(null);
    } finally {
      setHealthBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || tab !== "overview") return;
    void loadOverview(range);
    const t = window.setInterval(() => void loadOverview(range), 60_000);
    return () => window.clearInterval(t);
  }, [ready, tab, range, loadOverview]);

  useEffect(() => {
    if (!ready || !access?.canSystem || (tab !== "overview" && tab !== "health")) return;
    void loadHealth();
    const t = window.setInterval(() => void loadHealth(), 60_000);
    return () => window.clearInterval(t);
  }, [ready, tab, access?.canSystem, loadHealth]);

  async function refreshAll() {
    setRefreshing(true);
    await Promise.all([tab === "overview" ? loadOverview(range) : Promise.resolve(), access?.canSystem ? loadHealth() : Promise.resolve()]);
    setRefreshing(false);
  }

  function signOut() {
    void logoutSession().finally(() => window.location.assign(ADMIN_LOGIN_PATH));
  }

  if (!ready || !me) {
    return <div className={s.root}><div className={s.skel} style={{ gridColumn: "1 / -1", minHeight: "100vh" }}>Loading admin…</div></div>;
  }

  const active: Tab = allowedTab(tab, access) ? tab : "overview";
  const [title, subtitle] = HEADING[active];
  const roleLabel = access?.source === "owner" ? "Owner · Super Admin" : (access?.role || "").replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  const nav = (
    <>
      <div className={s.brand}>
        <span className={s.mark} aria-hidden="true">RB</span>
        <span className={s.brandText}>
          ResumeBuilder
          <small>Admin console</small>
        </span>
      </div>
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.need || access?.[i.need]);
        if (!items.length) return null;
        return (
          <div key={g.label} role="group" aria-label={g.label}>
            <div className={s.group}>{g.label}</div>
            {items.map(({ id, label, Icon }) => (
              <a
                key={id}
                href={TAB_PATH[id]}
                title={label}
                aria-current={active === id ? "page" : undefined}
                className={cx(s.nav, active === id && s.navOn)}
                onClick={(e) => {
                  e.preventDefault();
                  selectTab(id);
                }}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
                {id === "health" && health && [health.postgres, health.redis, health.disk, health.ram, health.smtp].some((x) => x.status === "warn" || x.status === "down") && (
                  <em className={s.navBadge}>!</em>
                )}
              </a>
            ))}
          </div>
        );
      })}
      <div className={s.me}>
        <span className={s.av} aria-hidden="true">{initials(me.user.name, me.user.email)}</span>
        <div className={s.meText}>
          <b>{me.user.name || me.user.email.split("@")[0]}</b>
          <small>{roleLabel}</small>
        </div>
      </div>
      <button type="button" className={cx(s.nav, s.signOut)} onClick={signOut} title="Sign out">
        <LogOut size={17} aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </>
  );

  return (
    <div className={s.root}>
      <aside id="admin-drawer" className={cx(s.side, drawer && s.sideOpen)} aria-label="Admin sections">
        {nav}
      </aside>
      {drawer && <button type="button" className={s.scrim} aria-label="Close menu" onClick={() => setDrawer(false)} />}

      <div className={s.col}>
        <header className={s.mob}>
          <button type="button" className={s.icoBtn} aria-label={drawer ? "Close menu" : "Open menu"} aria-expanded={drawer} aria-controls="admin-drawer" onClick={() => setDrawer((v) => !v)}>
            {drawer ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className={s.mark} aria-hidden="true">RB</span>
          <span className={s.mobTitle}>{title}</span>
          <ThemeToggle />
        </header>

        <main className={s.main} id="main">
          <div className={s.inner}>
            <div className={s.top}>
              <div className={s.topText}>
                {active === "overview" ? (
                  <>
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                  </>
                ) : (
                  <p>
                    Admin / <b>{title}</b> · {subtitle}
                  </p>
                )}
              </div>
              <div className={s.topTools}>
                {RANGED.includes(active) && (
                  <div className={s.seg} role="group" aria-label="Date range">
                    {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
                      <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
                        {RANGE_LABEL[r]}
                      </button>
                    ))}
                  </div>
                )}
                {active === "overview" && (
                  <button type="button" className={s.icoBtn} onClick={() => void refreshAll()} aria-label="Refresh" title="Refresh" disabled={refreshing}>
                    <RefreshCw size={16} />
                  </button>
                )}
                <span className={s.deskOnly}><ThemeToggle /></span>
              </div>
            </div>

            {error && active === "overview" && <div className={s.error} role="alert">{error}</div>}

            {active === "overview" && <OverviewPanel data={overview} range={range} health={access?.canSystem ? health : null} onOpen={(t) => selectTab(t as Tab)} />}
            {active === "users" && <UsersPanel access={access} onChanged={() => setOverview(null)} />}
            {active === "activity" && <div className={s.legacy}><UsersActivityPanel /></div>}
            {active === "leads" && <LeadsPanel range={range} />}
            {active === "pdf" && <div className={s.legacy}><PdfControlPanel /></div>}
            {active === "templates" && <UploadsPanel access={access} />}
            {active === "pages" && <PagesPanel range={range} />}
            {active === "billing" && <BillingPanel />}
            {active === "team" && <TeamPanel access={access} meEmail={me.user.email} />}
            {active === "health" && <HealthPanel health={health} busy={healthBusy} onRefresh={() => void loadHealth()} />}
            {active === "consents" && <ConsentsPanel />}
            {active === "audit" && <AuditPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}
