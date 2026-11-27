"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { takeAuthNotice, createResumeFromLandingTemplate } from "@/lib/continueAfterAuth";
import { LANDING_TEMPLATES, type LandingTemplate } from "@/lib/landingTemplates";
import { createSampleDevopsResume } from "@/shared";
import { ApiError, apiFetch, clearToken, getToken } from "@/lib/api";
import { signOut } from "@/hooks/useCurrentUser";
import { DashboardSidebar, type NavKey } from "@/components/dashboard/DashboardSidebar";
import { TopBar, type Alert } from "@/components/dashboard/TopBar";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { UsageCard } from "@/components/dashboard/UsageCard";
import { TemplateStrip } from "@/components/dashboard/TemplateStrip";
import { ResumeGrid } from "@/components/dashboard/ResumeGrid";
import { CoverLettersCard, DownloadsCard, ToolsCard } from "@/components/dashboard/BottomRow";
import { DeleteDialog, PlansDialog, RenameDialog } from "@/components/dashboard/Modals";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { cx, fileSafe, firstName, greetingForHour, usagePct } from "@/components/dashboard/format";
import type { CoverLetterRow, DashDownload, DashResume, DashSummary } from "@/components/dashboard/types";
import s from "@/components/dashboard/Dashboard.module.css";

/** BUG-920/320: friendly messages; never show raw server error text. */
function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 402) {
    return err.message && err.message.length < 160 ? err.message : "You've reached the Free plan limit. Upgrade to Pro, or delete a resume to make room.";
  }
  if (err instanceof ApiError && err.status === 429 && err.message.length < 160) return err.message;
  if (err instanceof ApiError && err.status >= 500) return fallback;
  if (err instanceof ApiError && err.message && err.message.length < 160) return err.message;
  return fallback;
}

type Notice = { tone: "err" | "info" | "ok"; text: string } | null;

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashSummary | null>(null);
  const [letters, setLetters] = useState<CoverLetterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<DashResume | null>(null);
  const [deleting, setDeleting] = useState<DashResume | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [active, setActive] = useState<NavKey>("dashboard");
  const [query, setQuery] = useState("");
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
    // BUG-1327/1329: a template picked before sign-in that could not be created (402 plan limit).
    const note = takeAuthNotice();
    if (note) setNotice({ tone: "info", text: note });
  }, []);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setLoadFailed(false);
      try {
        const [summary, letterRes] = await Promise.all([
          apiFetch<DashSummary>("/user/dashboard-summary", { cache: "no-store" }),
          apiFetch<{ coverLetters: CoverLetterRow[] }>("/cover-letters").catch(() => ({ coverLetters: [] as CoverLetterRow[] })),
        ]);
        setData(summary);
        setLetters(letterRes.coverLetters ?? []);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace("/login?next=/user/dashboard");
          return;
        }
        if (!quiet) setLoadFailed(true);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/user/dashboard");
      return;
    }
    void load();
  }, [router, load, reloadKey]);

  const resumes = useMemo(() => data?.resumes ?? [], [data]);
  const usage = data?.usage;
  // The Upgrade card waits for the summary, so Pro and Admin accounts never see it flash on load.
  const showUpgrade = !loading && Boolean(data) && usage?.plan === "FREE";

  async function createResume() {
    setBusy(true);
    setNotice(null);
    try {
      const sample = createSampleDevopsResume();
      const res = await apiFetch<{ resume: { id: string } }>("/resumes", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled Resume",
          templateId: sample.templateId,
          layoutKey: sample.layoutKey,
          content: sample.content,
          design: sample.design,
        }),
      });
      router.push(`/user/editor/${res.resume.id}`);
    } catch (err) {
      setNotice({ tone: "err", text: friendlyError(err, "Could not create a resume. Please try again.") });
      setBusy(false);
    }
  }

  async function pickTemplate(t: LandingTemplate) {
    setBusy(true);
    setNotice(null);
    try {
      const doc = await createResumeFromLandingTemplate(t);
      router.push(`/user/editor/${doc.id}`);
    } catch (err) {
      setNotice({ tone: "err", text: friendlyError(err, "Could not start this template. Please try again.") });
      setBusy(false);
    }
  }

  function openResume(r: DashResume) {
    router.push(`/user/editor/${r.id}`);
  }

  async function downloadPdf(resumeId: string, title: string) {
    setPdfId(resumeId);
    setNotice(null);
    try {
      const name = fileSafe(title);
      const res = await apiFetch<Response>(`/export/${resumeId}`, {
        method: "POST",
        body: JSON.stringify({ format: "pdf", filename: name }),
      });
      if (!(res instanceof Response) || !(res.headers.get("content-type") || "").includes("application/pdf")) {
        throw new Error("not a pdf");
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      // Show the new download and usage count at once, then confirm with the server numbers.
      setData((prev) =>
        prev
          ? {
              ...prev,
              usage: { ...prev.usage, pdfExportsUsed: prev.usage.pdfExportsUsed + 1 },
              downloads: [
                { id: `local-${Date.now()}`, kind: "resume" as const, resumeId, title, format: "pdf", pageSize: null, createdAt: new Date().toISOString() },
                ...prev.downloads,
              ].slice(0, 6),
            }
          : prev
      );
      await load(true);
    } catch (err) {
      setNotice({ tone: "err", text: friendlyError(err, "Could not create the PDF. Please try again.") });
    } finally {
      setPdfId(null);
    }
  }

  async function duplicateResume(r: DashResume) {
    setBusyId(r.id);
    setNotice(null);
    try {
      await apiFetch(`/resumes/${r.id}/duplicate`, { method: "POST" });
      await load(true);
      setNotice({ tone: "ok", text: `“${r.title}” duplicated.` });
    } catch (err) {
      setNotice({ tone: "err", text: friendlyError(err, "Could not duplicate the resume. Please try again.") });
    } finally {
      setBusyId(null);
    }
  }

  async function saveRename(title: string) {
    if (!renaming) return;
    const target = renaming;
    setBusyId(target.id);
    try {
      const res = await apiFetch<{ resume: { id: string; title: string; updatedAt: string } }>(`/resumes/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      setData((d) => (d ? { ...d, resumes: d.resumes.map((x) => (x.id === target.id ? { ...x, title: res.resume.title, updatedAt: res.resume.updatedAt } : x)) } : d));
      setRenaming(null);
    } catch (err) {
      setNotice({ tone: "err", text: friendlyError(err, "Could not rename the resume. Please try again.") });
      setRenaming(null);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setBusyId(target.id);
    try {
      await apiFetch(`/resumes/${target.id}`, { method: "DELETE" });
      setDeleting(null);
      await load(true);
      setNotice({ tone: "ok", text: `“${target.title}” deleted.` });
    } catch (err) {
      setDeleting(null);
      setNotice({ tone: "err", text: friendlyError(err, "Could not delete the resume. Please try again.") });
    } finally {
      setBusyId(null);
    }
  }

  // BUG-315: start a blank cover letter and open it.
  async function newLetter() {
    setBusy(true);
    try {
      const res = await apiFetch<{ coverLetter: CoverLetterRow }>("/cover-letters", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled Cover Letter", body: "" }),
      });
      router.push(`/user/cover-letters/${res.coverLetter.id}`);
    } catch (err) {
      setNotice({ tone: "err", text: friendlyError(err, "Could not create a cover letter. Please try again.") });
      setBusy(false);
    }
  }

  function goSection(key: NavKey) {
    setActive(key);
    if (key === "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onSignOut() {
    await signOut().catch(() => undefined);
    window.location.assign("/login");
  }

  const alerts = useMemo<Alert[]>(() => {
    if (!data) return [];
    const out: Alert[] = [];
    const u = data.usage;
    const near = (used: number, limit: number) => limit > 0 && usagePct(used, limit) >= 80;
    if (near(u.pdfExportsUsed, u.pdfExportsLimit))
      out.push({ id: "pdf", tone: "warn", title: "PDF exports almost used", detail: `${u.pdfExportsUsed} of ${u.pdfExportsLimit} this month`, action: () => setPlansOpen(true) });
    if (near(u.resumesUsed, u.resumesLimit))
      out.push({ id: "res", tone: "warn", title: "Resume limit almost reached", detail: `${u.resumesUsed} of ${u.resumesLimit} resumes`, action: () => setPlansOpen(true) });
    if (near(u.audioMinutesUsed, u.audioMinutesLimit))
      out.push({ id: "aud", tone: "warn", title: "Noise Remover minutes almost used", detail: `${u.audioMinutesUsed} of ${u.audioMinutesLimit} min`, action: () => setPlansOpen(true) });
    const verify = data.profileSteps.find((st) => st.key === "verified" && !st.done);
    if (verify) out.push({ id: "verify", tone: "info", title: "Verify your email", detail: "Check your inbox for the verification link.", action: () => router.push("/user/settings") });
    const weak = [...data.resumes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).find((r) => r.score < 80);
    if (weak)
      out.push({ id: `weak-${weak.id}`, tone: "info", title: `“${weak.title}” is ${weak.score}% ready`, detail: weak.missing.length ? `Add: ${weak.missing.slice(0, 2).join(", ")}` : "Open it to finish", action: () => openResume(weak) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, router]);

  const latest = resumes[0];
  const counts = { resumes: resumes.length, templates: LANDING_TEMPLATES.length, letters: letters.length };

  return (
    <div className={s.root}>
      <DashboardSidebar
        active={active}
        counts={counts}
        showUpgrade={showUpgrade}
        onSection={goSection}
        onUpgrade={() => setPlansOpen(true)}
        onSignOut={() => void onSignOut()}
      />
      <main className={s.main} id="main-content">
        <TopBar
          user={data?.user ?? null}
          query={query}
          onQuery={setQuery}
          resumes={resumes}
          templates={LANDING_TEMPLATES}
          alerts={alerts}
          onOpenResume={openResume}
          onPickTemplate={(t) => void pickTemplate(t)}
          onSignOut={() => void onSignOut()}
        />

        {notice && (
          <div role={notice.tone === "err" ? "alert" : "status"} className={cx(s.notice, notice.tone === "err" ? s.noticeErr : notice.tone === "ok" ? s.noticeOk : s.noticeInfo)}>
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        )}

        {loadFailed ? (
          <div className={cx(s.card, s.pad, s.empty)} role="alert">
            <h4>We couldn&apos;t load your dashboard</h4>
            <p>Something went wrong on our side. Check your connection and try again.</p>
            <button type="button" className={cx(s.btn, s.primary)} onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className={cx(s.row, s.r1)}>
              {data ? (
                <>
                  <WelcomeCard
                    greeting={greeting}
                    name={firstName(data.user.name, data.user.email)}
                    pct={data.profileCompletionPct}
                    steps={data.profileSteps}
                    hasResume={Boolean(latest)}
                    busy={busy}
                    onContinue={() => (latest ? openResume(latest) : void createResume())}
                    onNew={() => void createResume()}
                  />
                  <UsageCard usage={data.usage} onPlans={() => setPlansOpen(true)} />
                </>
              ) : (
                <>
                  <div className={s.skel} style={{ height: 230 }} />
                  <div className={s.skel} style={{ height: 230 }} />
                </>
              )}
            </div>

            <TemplateStrip templates={LANDING_TEMPLATES} busy={busy} onBlank={() => void createResume()} onPick={(t) => void pickTemplate(t)} />

            <ResumeGrid
              resumes={resumes}
              loading={loading}
              busyId={busyId}
              pdfId={pdfId}
              creating={busy}
              onEdit={openResume}
              onPdf={(r) => void downloadPdf(r.id, r.title)}
              onDuplicate={(r) => void duplicateResume(r)}
              onRename={(r) => setRenaming(r)}
              onDelete={(r) => setDeleting(r)}
              onCreate={() => goSection("templates")}
            />

            <div className={cx(s.row, s.r3)}>
              <ToolsCard />
              <DownloadsCard
                downloads={data?.downloads ?? []}
                pdfId={pdfId}
                onDownload={(d: DashDownload) => d.resumeId && void downloadPdf(d.resumeId, d.title)}
              />
              <CoverLettersCard letters={letters} busy={busy} onNew={() => void newLetter()} />
            </div>
          </>
        )}
      </main>
      <MobileTabBar active={active} busy={busy} onSection={goSection} onCreate={() => void createResume()} />

      {renaming && <RenameDialog initial={renaming.title} busy={busyId === renaming.id} onSave={(t) => void saveRename(t)} onClose={() => setRenaming(null)} />}
      {deleting && <DeleteDialog title={deleting.title} busy={busyId === deleting.id} onConfirm={() => void confirmDelete()} onClose={() => setDeleting(null)} />}
      {plansOpen && usage && <PlansDialog usage={usage} onClose={() => setPlansOpen(false)} />}
    </div>
  );
}
