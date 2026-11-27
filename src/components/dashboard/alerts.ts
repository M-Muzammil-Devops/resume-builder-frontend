import type { Alert } from "./TopBar";
import type { DashResume, DashSummary } from "./types";
import { usagePct } from "./format";

/** Bell alerts from the dashboard summary (same list on every workspace page). */
export function buildAlerts(
  data: DashSummary | null,
  act: { onPlans: () => void; onSettings: () => void; onOpenResume: (r: DashResume) => void }
): Alert[] {
  if (!data) return [];
  const out: Alert[] = [];
  const u = data.usage;
  const near = (used: number, limit: number) => limit > 0 && usagePct(used, limit) >= 80;
  if (near(u.pdfExportsUsed, u.pdfExportsLimit))
    out.push({ id: "pdf", tone: "warn", title: "PDF exports almost used", detail: `${u.pdfExportsUsed} of ${u.pdfExportsLimit} this month`, action: act.onPlans });
  if (near(u.resumesUsed, u.resumesLimit))
    out.push({ id: "res", tone: "warn", title: "Resume limit almost reached", detail: `${u.resumesUsed} of ${u.resumesLimit} resumes`, action: act.onPlans });
  if (near(u.audioMinutesUsed, u.audioMinutesLimit))
    out.push({ id: "aud", tone: "warn", title: "Noise Remover minutes almost used", detail: `${u.audioMinutesUsed} of ${u.audioMinutesLimit} min`, action: act.onPlans });
  const verify = data.profileSteps.find((st) => st.key === "verified" && !st.done);
  if (verify) out.push({ id: "verify", tone: "info", title: "Verify your email", detail: "Check your inbox for the verification link.", action: act.onSettings });
  const weak = [...data.resumes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).find((r) => r.score < 80);
  if (weak)
    out.push({
      id: `weak-${weak.id}`,
      tone: "info",
      title: `“${weak.title}” is ${weak.score}% ready`,
      detail: weak.missing.length ? `Add: ${weak.missing.slice(0, 2).join(", ")}` : "Open it to finish",
      action: () => act.onOpenResume(weak),
    });
  return out;
}
