import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/csp";
import { ADMIN_COOKIE, ADMIN_LOGIN_PATH } from "@/lib/adminSession";

/** /admin pages except the admin sign-in itself. */
function isAdminConsolePath(pathname: string) {
  return (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    pathname !== ADMIN_LOGIN_PATH && !pathname.startsWith(`${ADMIN_LOGIN_PATH}/`);
}

/** BUG-916: fresh nonce per request; Next.js applies it to its inline/bootstrap scripts. */
export function proxy(request: NextRequest) {
  // Admin guard, first line: no session cookie means straight to the admin sign-in.
  // The (console) layout then verifies the token and the admin role with the API.
  // Next sends same-origin redirects with a relative Location, so it stays on the tunnel host.
  const { pathname, search } = request.nextUrl;
  if (isAdminConsolePath(pathname) && !request.cookies.get(ADMIN_COOKIE)?.value) {
    const target = request.nextUrl.clone();
    target.pathname = ADMIN_LOGIN_PATH;
    target.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    const response = NextResponse.redirect(target, 307);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const nonce = createNonce();
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV === "development",
    // GA4 hosts are allowed only when an id is configured (they are still used only after consent).
    gaId: process.env.NEXT_PUBLIC_GA_ID,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: skip the API proxy, static chunks, images, fonts and uploads.
      source: "/((?!rb-api|_next/static|_next/image|fonts/|templates/|uploads/|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
