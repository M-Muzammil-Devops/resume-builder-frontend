import { apiFetch, setSession } from "@/lib/api";
import { continueAfterAuth, readPendingTemplate } from "@/lib/continueAfterAuth";
import { parseLoginNext } from "@/lib/loginNext";
import { LANDING_TEMPLATES, PENDING_TEMPLATE_KEY, type LandingTemplate } from "@/lib/landingTemplates";

/** Query string of /login or /register saved before an SSO redirect, so ?next=… survives the round trip. */
export const SSO_RETURN_KEY = "rb_sso_return";

/**
 * BUG-1327: every sign-in path (password, magic code, Google, Facebook) ends here, so
 * ?next=template&tpl=… and ?next=/user/editor/… behave the same way.
 */
export async function finishSignIn(
  push: (href: string) => void,
  search: { get(name: string): string | null },
  token: string,
  refreshToken?: string
) {
  setSession(token, refreshToken);
  const next = parseLoginNext(search);
  if (next.kind === "template") {
    let pending = readPendingTemplate();
    if (!pending || pending.id !== next.tplId) {
      pending = LANDING_TEMPLATES.find((t) => t.id === next.tplId) ?? null;
      if (!pending) {
        // Landing templates come from the API; a fresh tab has nothing in sessionStorage.
        const res = await apiFetch<{ templates: LandingTemplate[] }>("/landing-templates").catch(() => null);
        const hit = res?.templates?.find((t) => t.id === next.tplId);
        pending = hit ? { ...hit, source: "admin" as const } : null;
      }
      if (pending) sessionStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify(pending));
    }
  }
  // BUG-600: an expired session on /editor/:id comes back to that resume after login.
  if (next.kind === "path") {
    push(next.path);
    return;
  }
  await continueAfterAuth(push);
}
