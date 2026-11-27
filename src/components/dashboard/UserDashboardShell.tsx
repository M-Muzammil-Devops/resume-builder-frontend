"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, apiFetch, clearToken, getToken } from "@/lib/api";
import { signOut } from "@/hooks/useCurrentUser";
import { createResumeFromLandingTemplate } from "@/lib/continueAfterAuth";
import { LANDING_TEMPLATES, type LandingTemplate } from "@/lib/landingTemplates";
import { DashboardSidebar, type NavCounts, type NavKey, type SectionKey } from "./DashboardSidebar";
import { MobileTabBar } from "./MobileTabBar";
import { TopBar, type Alert } from "./TopBar";
import { PlansDialog } from "./Modals";
import { buildAlerts } from "./alerts";
import { createStarterResume, friendlyError } from "./actions";
import { cx } from "./format";
import type { DashResume, DashSummary } from "./types";
import s from "./Dashboard.module.css";
import w from "./Workspace.module.css";

export type ShellUser = { name: string | null; email: string; role: string } | null;

/**
 * User Dashboard v2 shell: blue-purple sidebar (≥ 1280px), icon rail (769–1279px),
 * bottom tab bar + menu sheet (≤ 768px) and the top bar. Every signed-in workspace page renders inside it.
 */
export function UserDashboardShell({
  active,
  counts,
  showUpgrade,
  user,
  resumes,
  alerts,
  creating,
  onSection,
  onUpgrade,
  onSignOut,
  onCreate,
  onOpenResume,
  onPickTemplate,
  children,
  after,
}: {
  active: NavKey;
  counts: NavCounts;
  showUpgrade: boolean;
  user: ShellUser;
  resumes: DashResume[];
  alerts: Alert[];
  creating: boolean;
  /** Only on /user/dashboard: sections scroll in place instead of linking back. */
  onSection?: (key: SectionKey) => void;
  onUpgrade: () => void;
  onSignOut: () => void;
  onCreate: () => void;
  onOpenResume: (r: DashResume) => void;
  onPickTemplate: (t: LandingTemplate) => void;
  children: ReactNode;
  /** Dialogs and other overlays. */
  after?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  return (
    <div className={s.root}>
      <DashboardSidebar active={active} counts={counts} showUpgrade={showUpgrade} onSection={onSection} onUpgrade={onUpgrade} onSignOut={onSignOut} />
      <main className={s.main} id="main-content">
        <TopBar
          user={user}
          query={query}
          onQuery={setQuery}
          resumes={resumes}
          templates={LANDING_TEMPLATES}
          alerts={alerts}
          onOpenResume={onOpenResume}
          onPickTemplate={onPickTemplate}
          onSignOut={onSignOut}
        />
        {children}
      </main>
      <MobileTabBar active={active} busy={creating} counts={counts} onSection={onSection} onCreate={onCreate} onSignOut={onSignOut} />
      {after}
    </div>
  );
}

/** Page title row used by every workspace page inside the shell. */
export function WorkspaceHeader({ title, sub, actions, icon }: { title: string; sub?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <header className={w.head}>
      {icon && <span className={w.headIco} aria-hidden="true">{icon}</span>}
      <div className={w.headTxt}>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className={w.headActs}>{actions}</div>}
    </header>
  );
}

/**
 * Wrapper for workspace pages other than /user/dashboard (Jobs, Tracker, Auto Apply, Settings,
 * Noise Remover, PDF Tools, cover letters): signs the visitor in or sends them to /login?next=…,
 * loads the summary for the sidebar, top bar and alerts, and keeps the user inside the shell.
 */
export function UserWorkspace({ active, children, className }: { active: NavKey; children: ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname() || "/user/dashboard";
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<DashSummary | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toLogin = useCallback(() => {
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [router, pathname]);

  useEffect(() => {
    if (!getToken()) {
      toLogin();
      return;
    }
    setReady(true);
    let alive = true;
    apiFetch<DashSummary>("/user/dashboard-summary", { cache: "no-store" })
      .then((res) => alive && setData(res))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          toLogin();
        }
      });
    return () => {
      alive = false;
    };
  }, [toLogin]);

  const openResume = useCallback((r: DashResume) => router.push(`/user/editor/${r.id}`), [router]);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const id = await createStarterResume();
      router.push(`/user/editor/${id}`);
    } catch (err) {
      setError(friendlyError(err, "Could not create a resume. Please try again."));
      setCreating(false);
    }
  }

  async function pickTemplate(t: LandingTemplate) {
    setCreating(true);
    setError(null);
    try {
      const doc = await createResumeFromLandingTemplate(t);
      router.push(`/user/editor/${doc.id}`);
    } catch (err) {
      setError(friendlyError(err, "Could not start this template. Please try again."));
      setCreating(false);
    }
  }

  async function onSignOut() {
    await signOut().catch(() => undefined);
    window.location.assign("/login");
  }

  const alerts = useMemo(
    () => buildAlerts(data, { onPlans: () => setPlansOpen(true), onSettings: () => router.push("/user/settings"), onOpenResume: openResume }),
    [data, router, openResume]
  );
  const resumes = data?.resumes ?? [];
  const counts = { resumes: resumes.length, templates: LANDING_TEMPLATES.length, letters: data?.coverLetterCount ?? 0 };
  const showUpgrade = Boolean(data) && data?.usage.plan === "FREE";

  return (
    <UserDashboardShell
      active={active}
      counts={counts}
      showUpgrade={showUpgrade}
      user={data?.user ?? null}
      resumes={resumes}
      alerts={alerts}
      creating={creating}
      onUpgrade={() => setPlansOpen(true)}
      onSignOut={() => void onSignOut()}
      onCreate={() => void create()}
      onOpenResume={openResume}
      onPickTemplate={(t) => void pickTemplate(t)}
      after={plansOpen && data ? <PlansDialog usage={data.usage} onClose={() => setPlansOpen(false)} /> : null}
    >
      {error && (
        <div role="alert" className={cx(s.notice, s.noticeErr)}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div className={cx(w.page, className)}>{ready ? children : <div className={s.skel} style={{ height: 320 }} aria-busy="true" aria-label="Loading" />}</div>
    </UserDashboardShell>
  );
}
