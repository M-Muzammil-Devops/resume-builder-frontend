/** Browser uses the Next proxy so a public tunnel works. Server calls the API directly. */
export function getApiUrl() {
  if (typeof window !== "undefined") return "/rb-api";
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
}

const TOKEN_KEY = "rb_token";
const REFRESH_KEY = "rb_refresh";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * BUG-1221: the /admin page guard cookie is HttpOnly and set by the API only for admins.
 * Call after the admin access token changes (login page bounce, console load).
 */
export async function refreshAdminCookie(): Promise<boolean> {
  try {
    await apiFetch("/auth/admin/session", { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

export function setSession(token: string, refreshToken?: string) {
  setToken(token);
  if (typeof window === "undefined" || !refreshToken) return;
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function logoutSession() {
  const refreshToken = getRefreshToken();
  const token = getToken();
  try {
    await fetch(`${getApiUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    });
  } catch {
    /* still clear the local session */
  }
  clearToken();
}

let refreshFlight: Promise<boolean> | null = null;

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearToken();
    return false;
  }
  const data = (await res.json()) as { token?: string; refreshToken?: string };
  if (!data.token || !data.refreshToken) {
    clearToken();
    return false;
  }
  setSession(data.token, data.refreshToken);
  return true;
}

/** One shared refresh for callers that hit /auth/* routes (those skip the automatic retry). */
export function tryRefreshSession(): Promise<boolean> {
  refreshFlight ??= refreshSession().finally(() => {
    refreshFlight = null;
  });
  return refreshFlight;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const headers = new Headers(options.headers);

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    refreshFlight ??= refreshSession().finally(() => {
      refreshFlight = null;
    });
    if (await refreshFlight) return apiFetch<T>(path, options, true);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf") || contentType.includes("text/html")) {
    if (!res.ok) {
      throw new ApiError(`Request failed (${res.status})`, res.status);
    }
    return res as unknown as T;
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const obj = typeof data === "object" && data ? (data as Record<string, unknown>) : null;
    const message =
      (typeof obj?.error === "string" && obj.error !== "Internal Server Error"
        ? obj.error
        : null) ||
      (typeof obj?.message === "string" ? obj.message : null) ||
      `Request failed (${res.status})`;
    // Prefer short user-facing text
    const short =
      message.includes("Email already")
        ? "Email already registered"
        : message.length > 120
          ? `Request failed (${res.status})`
          : message;
    throw new ApiError(short, res.status, data);
  }

  return data as T;
}

