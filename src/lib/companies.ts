/**
 * Company search — Enhancv-style.
 * Live suggestions via Clearbit autocomplete (proxied by our API),
 * with a small local list for instant offline matches.
 */
import { apiFetch } from "@/lib/api";

export type CompanySuggestion = {
  name: string;
  domain: string;
  /** Preferred logo URL (UI has multi-source fallback) */
  logo?: string;
};

const BASE: CompanySuggestion[] = [
  { name: "WADIC", domain: "wadic.com" },
  { name: "GoDaddy", domain: "godaddy.com" },
  { name: "Wadi", domain: "wadi.com" },
  { name: "Wadick Enterprises Pty Ltd", domain: "wadick.com.au" },
  { name: "Google", domain: "google.com" },
  { name: "Microsoft", domain: "microsoft.com" },
  { name: "Amazon", domain: "amazon.com" },
  { name: "AWS", domain: "aws.amazon.com" },
  { name: "Meta", domain: "meta.com" },
  { name: "Apple", domain: "apple.com" },
  { name: "Netflix", domain: "netflix.com" },
  { name: "Uber", domain: "uber.com" },
  { name: "Airbnb", domain: "airbnb.com" },
  { name: "Spotify", domain: "spotify.com" },
  { name: "Shopify", domain: "shopify.com" },
  { name: "Stripe", domain: "stripe.com" },
  { name: "Slack", domain: "slack.com" },
  { name: "Salesforce", domain: "salesforce.com" },
  { name: "Oracle", domain: "oracle.com" },
  { name: "IBM", domain: "ibm.com" },
  { name: "Intel", domain: "intel.com" },
  { name: "NVIDIA", domain: "nvidia.com" },
  { name: "Docker", domain: "docker.com" },
  { name: "GitHub", domain: "github.com" },
  { name: "GitLab", domain: "gitlab.com" },
  { name: "HashiCorp", domain: "hashicorp.com" },
  { name: "Datadog", domain: "datadoghq.com" },
  { name: "Elevate Softsolution", domain: "elevatesoftsolution.com" },
  { name: "Al Nafi", domain: "alnafi.com" },
  { name: "Systems Limited", domain: "systemsltd.com" },
  { name: "Careem", domain: "careem.com" },
  { name: "Bykea", domain: "bykea.com" },
  { name: "Jazz", domain: "jazz.com.pk" },
  { name: "Telenor", domain: "telenor.com" },
  { name: "Daraz", domain: "daraz.com" },
];

function normalizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
}

/** Primary logo URL stored on the resume item. */
export function companyLogoUrl(_domain: string) {
  return "";
}

function domainFromLogoUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    const g = u.searchParams.get("domain");
    if (g) return normalizeDomain(g);
    if (u.hostname.includes("clearbit.com")) {
      return normalizeDomain(u.pathname.replace(/^\//, ""));
    }
    const duck = u.pathname.match(/ip3\/(.+)\.ico$/i);
    if (duck) return normalizeDomain(duck[1]);
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Ordered logo sources to try in the UI. */
export function companyLogoCandidates(opts: {
  logoUrl?: string;
  domain?: string;
  name?: string;
}): string[] {
  const out: string[] = [];
  const push = (u?: string) => {
    if (u && !out.includes(u)) out.push(u);
  };

  push(opts.logoUrl);

  let domain = opts.domain?.trim() || domainFromLogoUrl(opts.logoUrl);
  if (!domain && opts.name) {
    const hit = BASE.find((c) => c.name.toLowerCase() === opts.name!.trim().toLowerCase());
    domain = hit?.domain;
  }

  if (domain) {
    const local = companyLogoUrl(domain);
    if (local) push(local);
  }

  return out;
}

export function resolveCompany(name: string): CompanySuggestion | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  const hit = BASE.find((c) => c.name.toLowerCase() === q);
  if (!hit) return undefined;
  return { ...hit, logo: companyLogoUrl(hit.domain) };
}

/** Instant local filter (offline / while network loads). */
export function searchCompaniesLocal(query: string, limit = 8): CompanySuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored = BASE.map((c) => {
    const name = c.name.toLowerCase();
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 50;
    else if (c.domain.includes(q)) score = 30;
    return { c, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));
  return scored.slice(0, limit).map((x) => ({
    ...x.c,
    logo: companyLogoUrl(x.c.domain),
  }));
}

/** @deprecated use searchCompaniesLocal or searchCompaniesLive */
export function searchCompanies(query: string, limit = 8): CompanySuggestion[] {
  return searchCompaniesLocal(query, limit);
}

function mergeSuggestions(
  primary: CompanySuggestion[],
  secondary: CompanySuggestion[],
  limit = 10
): CompanySuggestion[] {
  const seen = new Set<string>();
  const out: CompanySuggestion[] = [];
  for (const c of [...primary, ...secondary]) {
    const key = c.domain.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...c,
      domain: normalizeDomain(c.domain),
      logo: c.logo || companyLogoUrl(c.domain),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Live company search (same-origin API, then the local list). */
export async function searchCompaniesLive(query: string): Promise<CompanySuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const local = searchCompaniesLocal(q, 6);

  try {
    const res = await apiFetch<{ companies: CompanySuggestion[] }>(
      `/companies/suggest?q=${encodeURIComponent(q)}`
    );
    if (res.companies?.length) {
      return mergeSuggestions(res.companies, local, 10);
    }
  } catch {
    /* fall through */
  }

  return local;
}
