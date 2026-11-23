/**
 * The admin console server-side guard (app/admin/(console)/layout.tsx and proxy.ts)
 * reads the admin access token from this cookie. The API sets it (HttpOnly, Secure,
 * SameSite=Strict, Path=/admin) only on an admin sign-in, and clears it on logout (BUG-1221).
 */
export const ADMIN_COOKIE = "rb_admin_at";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";
export const USER_HOME_PATH = "/user/dashboard";

/** Admin console pages that exist (BUG-1220). */
export const ADMIN_PAGES = ["/admin", "/admin/templates", "/admin/users", "/admin/activity", "/admin/pdf"] as const;

/** Only known admin console pages are valid post-login targets; anything else is /admin. */
export function safeAdminNext(next: string | null | undefined): string {
  const path = String(next || "").split(/[?#]/)[0].replace(/\/+$/, "") || ADMIN_HOME_PATH;
  return (ADMIN_PAGES as readonly string[]).includes(path) ? path : ADMIN_HOME_PATH;
}