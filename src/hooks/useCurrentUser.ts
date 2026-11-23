"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch, getRefreshToken, getToken, logoutSession, tryRefreshSession } from "@/lib/api";

export type CurrentUser = { id: string; email: string; name: string | null; role: string };
/** undefined = still checking, null = signed out. */
export type CurrentUserState = CurrentUser | null | undefined;

const AUTH_EVENT = "rb-auth-change";
let inflight: Promise<CurrentUser | null> | null = null;
let cached: { at: number; user: CurrentUser | null } | null = null;

async function loadMe(): Promise<CurrentUser | null> {
  if (!getToken() && !getRefreshToken()) return null;
  const fetchMe = () => apiFetch<{ user: CurrentUser | null }>("/auth/me").then((res) => res.user ?? null);
  try {
    if (!getToken()) throw new ApiError("Unauthorized", 401);
    return await fetchMe();
  } catch (err) {
    // /auth/* calls skip apiFetch's automatic refresh, so refresh once here.
    if (err instanceof ApiError && err.status === 401 && (await tryRefreshSession())) {
      return fetchMe().catch(() => null);
    }
    return null;
  }
}

export function fetchCurrentUser(force = false): Promise<CurrentUser | null> {
  if (!force && cached && Date.now() - cached.at < 30_000) return Promise.resolve(cached.user);
  inflight ??= loadMe()
    .then((user) => {
      cached = { at: Date.now(), user };
      return user;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Sign out server-side (refresh + access token revoked), clear local tokens, tell every header. */
export async function signOut() {
  await logoutSession();
  cached = { at: Date.now(), user: null };
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function useCurrentUser(): CurrentUserState {
  const [user, setUser] = useState<CurrentUserState>(undefined);
  useEffect(() => {
    let alive = true;
    const load = (force = false) =>
      fetchCurrentUser(force).then((u) => {
        if (alive) setUser(u);
      });
    void load();
    const onChange = () => void load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "rb_token" || e.key === "rb_refresh" || e.key === null) void load(true);
    };
    window.addEventListener(AUTH_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return user;
}

export function initialsOf(user: { name: string | null; email: string }) {
  const source = (user.name || "").trim() || user.email.split("@")[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}
