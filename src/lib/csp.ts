/**
 * BUG-916: per-request nonce CSP.
 * Next.js reads the nonce from the request CSP header and adds it to its own
 * bootstrap/inline scripts, so script-src needs no 'unsafe-inline'.
 * 'strict-dynamic' lets those trusted scripts load the app chunks.
 */
/**
 * BUG-1404: sha256 of the inline <style> text Next.js 16 renders in its built-in pages:
 *  - builtin/error-styles.js errorThemeCss (default global-error / app-error page)
 *  - http-access-fallback/error-fallback.js (default 404/403/401 fallback)
 * csp.test.ts recomputes both from node_modules, so a Next upgrade that changes them fails the tests.
 */
export const NEXT_BUILTIN_STYLE_HASHES = [
  "sha256-Wwucq8eX2r0YFymkQhDXm5hN0+FfSvI3s4JSSaqa4iw=",
  "sha256-Z5XTK23DFuEMs0PwnyZDO9SWxemQ5HxcpVaBNuUJyWY=",
];

function styleSources(nonce: string, dev: boolean): string {
  if (dev) return "'unsafe-inline'";
  return [`'nonce-${nonce}'`, ...NEXT_BUILTIN_STYLE_HASHES.map((h) => `'${h}'`)].join(" ");
}

/** Google Analytics 4 hosts, allowed only when a GA4 id is configured (NEXT_PUBLIC_GA_ID). */
export const GA_SCRIPT_HOSTS = ["https://www.googletagmanager.com"];
export const GA_CONNECT_HOSTS = [
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://www.googletagmanager.com",
];

export function buildCsp(nonce: string, opts: { dev?: boolean; gaId?: string } = {}): string {
  const dev = Boolean(opts.dev);
  const ga = Boolean(opts.gaId && /^G-[A-Z0-9]{4,20}$/.test(opts.gaId.trim()));
  const gaScript = ga ? ` ${GA_SCRIPT_HOSTS.join(" ")}` : "";
  const gaConnect = ga ? ` ${GA_CONNECT_HOSTS.join(" ")}` : "";
  const directives = [
    "default-src 'self'",
    // React dev tooling needs eval in `next dev` only. Production never gets it.
    // gtag.js is injected by the (nonce-trusted) app bundle only after analytics consent;
    // the host is listed for browsers without 'strict-dynamic'.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${gaScript}${dev ? " 'unsafe-eval'" : ""}`,
    // BUG-1404: <style> elements need this request's nonce or one of the hashes of Next's own
    // built-in error/404 styles (those <style> tags never carry a nonce). <link> stylesheets are 'self'.
    // `next dev` injects un-nonced HMR styles, so only dev keeps inline styles allowed.
    `style-src 'self' ${styleSources(nonce, dev)}`,
    `style-src-elem 'self' ${styleSources(nonce, dev)}`,
    // Style ATTRIBUTES cannot carry a nonce or be hashed in Chrome/Firefox/Safari without
    // 'unsafe-hashes' per value; React style props, GSAP and three.js set them at runtime, so
    // this is the narrowest workable option. Attributes cannot load resources or run script.
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: blob:${gaConnect}`,
    // Resume and UI fonts are self-hosted (public/fonts, next/font).
    "font-src 'self' data:",
    // Audio tool: Before/After players play fetched previews as blob: URLs.
    "media-src 'self' blob:",
    `connect-src 'self'${gaConnect}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    // Never mix http sub-resources into the https site (not in local dev on http).
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

/** 128-bit random nonce, base64. Works in the Edge and Node runtimes. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
