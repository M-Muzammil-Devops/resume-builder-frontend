export type Range = "today" | "7d" | "30d" | "90d";
export const RANGE_LABEL: Record<Range, string> = { today: "Today", "7d": "7D", "30d": "30D", "90d": "90D" };
export const RANGE_LONG: Record<Range, string> = { today: "today", "7d": "last 7 days", "30d": "last 30 days", "90d": "last 90 days" };

export type AdminAccess = {
  role: string;
  source: "owner" | "team";
  superAdmin: boolean;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canBilling: boolean;
  canSystem: boolean;
};
export type AdminMe = { user: { id: string; email: string; name: string | null; role: string }; access: AdminAccess | null };

export type Overview = {
  range: Range;
  since: string;
  generatedAt: string;
  kpis: {
    totalUsers: number;
    newUsers: { today: number; period: number };
    activeUsers: { dau: number; mau: number; period: number; returning: number };
    totalWebsitePages: { total: number; tracked: number; views: number };
    leadsCount: { total: number; contact: number; signups: number };
    billingPlanSplit: { free: number; pro: number };
    resumesCount: { total: number; period: number };
    pdfExportsCount: { total: number; period: number };
    audioJobsCount: { period: number };
    errorRate: { rate: number; errors: number; requests: number };
  };
  dailyTrend: { date: string; signups: number; visits: number; pageViews: number; logins: number }[];
  peakHours: {
    hours: { hour: number; label: string; count: number }[];
    weekdays: { day: string; count: number }[];
    peak: { from: number; to: number; label: string; share: number };
    quiet: { from: number; to: number; label: string; share: number };
    busiestDay: string | null;
    total: number;
  };
  devices: { device: "desktop" | "mobile" | "tablet" | "other"; count: number }[];
  geography: { code: string | null; country: string; visits: number; users: number }[];
  topPages: { path: string; views: number }[];
  latestLeads: { id: string; type: "contact" | "signup"; name: string; email: string; note: string; createdAt: string }[];
};

export type HealthStatus = "ok" | "warn" | "down" | "off" | "unknown";
export type Health = {
  checkedAt: string;
  backend: { status: HealthStatus; uptimeSeconds: number; node: string; rssMb: number; load: number; cpus: number };
  postgres: { status: HealthStatus; latencyMs: number | null };
  redis: { status: HealthStatus; latencyMs: number | null; enabled: boolean; reason: string | null };
  disk: { status: HealthStatus; usedGb: number | null; totalGb: number | null; pct: number | null };
  ram: { status: HealthStatus; usedMb: number; totalMb: number; pct: number };
  smtp: { status: HealthStatus; configured: boolean; host: string | null; error: string | null; checkedAt: string | null };
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  location: string | null;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  /** "City, Country" from the profile or the latest sign-in (GeoIP); null when unknown. */
  locationLabel?: string | null;
  plan: "FREE" | "PRO";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  emailVerifiedAt: string | null;
  resumes: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  userId: string | null;
  userEmail: string;
  plan: string;
  amountCents: number;
  currency: string;
  status: "PAID" | "PENDING" | "FAILED" | "REFUNDED";
  provider: string | null;
  issuedAt: string;
  paidAt: string | null;
};
export type Billing = {
  summary: {
    currency: string;
    totalRevenueCents: number;
    availableBalanceCents: number;
    pendingPayoutCents: number;
    pendingInvoicesCents: number;
    pendingInvoices: number;
    paidInvoices: number;
    failedInvoices: number;
    activeProSubs: number;
    providerConnected: boolean;
  };
  invoices: Invoice[];
  total: number;
};

export type Perms = { canRead: boolean; canWrite: boolean; canDelete: boolean; canBilling: boolean; canSystem: boolean };
export type TeamMember = Perms & {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  owner: boolean;
  invitedBy?: string | null;
  lastActiveAt: string | null;
  createdAt: string;
};
export type Team = { owners: TeamMember[]; members: TeamMember[]; roles: (Perms & { role: string })[] };

export type AudioJobStatus = "queued" | "processing" | "done" | "failed" | "canceled";
export type AudioJobRow = {
  id: string;
  userId: string | null;
  user: string | null;
  mode: string;
  strength: number | null;
  outputFormat: string | null;
  inputExt: string | null;
  sizeBytes: number;
  durationSec: number | null;
  status: AudioJobStatus;
  errorCode: string | null;
  engine: string | null;
  processingMs: number | null;
  createdAt: string;
  finishedAt: string | null;
};
export type AudioJobs = {
  range: string;
  summary: { total: number; completed: number; failed: number; canceled: number; active: number; minutesProcessed: number; inRange: number; untracked: number };
  jobs: AudioJobRow[];
  total: number;
  take: number;
  skip: number;
};

export type AdminSettings = {
  siteName: string;
  supportEmail: string;
  freeLimits: { pdfExportsPerMonth: number; audioMinutesPerMonth: number; maxResumes: number; watermark: boolean };
  registrationOpen: boolean;
  maintenance: { enabled: boolean; message: string };
};
export type Integration = { key: string; label: string; configured: boolean };
