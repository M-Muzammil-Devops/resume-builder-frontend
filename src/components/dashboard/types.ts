/** Shapes returned by GET /user/dashboard-summary (resume-builder-backend/src/routes/userDashboard.ts). */
export type ProfileStep = { key: string; label: string; done: boolean };

export type DashResume = {
  id: string;
  title: string;
  /** Job title the user wrote in the header; null while it is empty or still sample/starter text. */
  headline: string | null;
  templateId: string;
  layoutKey: string;
  accentColor: string | null;
  createdAt: string;
  updatedAt: string;
  isComplete: boolean;
  /** Deterministic readiness score 0–100 from the sections the user filled. */
  score: number;
  status: "ready" | "draft";
  missing: string[];
};

export type DashDownload = {
  id: string;
  kind: "resume" | "audio";
  resumeId: string | null;
  title: string;
  format: string;
  pageSize: string | null;
  durationSec?: number | null;
  createdAt: string;
};

export type DashUsage = {
  plan: "FREE" | "PRO" | "ADMIN";
  resetsAt: string;
  pdfExportsUsed: number;
  /** 0 = unlimited */
  pdfExportsLimit: number;
  audioMinutesUsed: number;
  audioMinutesLimit: number;
  resumesUsed: number;
  resumesLimit: number;
};

export type DashSummary = {
  user: { id: string; name: string | null; email: string; role: string; plan: "FREE" | "PRO"; createdAt: string | null };
  profileCompletionPct: number;
  profileSteps: ProfileStep[];
  usage: DashUsage;
  coverLetterCount: number;
  resumes: DashResume[];
  downloads: DashDownload[];
};

export type CoverLetterRow = { id: string; title: string; body?: string; updatedAt?: string };

export type SortKey = "recent" | "name" | "score";
