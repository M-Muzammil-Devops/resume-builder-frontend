import type { NextRequest } from "next/server";

/**
 * Same-origin proxy to the API (replaces the old next.config rewrite).
 * A rewrite answered "502 Bad Gateway" / "Internal Server Error" as text/html when the
 * API was down; this handler always answers errors with a JSON body.
 */
export const dynamic = "force-dynamic";

const apiInternalUrl = (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
const TIMEOUT_MS = 120_000;
/**
 * Audio uploads (up to 100 MB) can take a long time on a slow line (100 MB at 1 Mbit/s ≈ 14 min,
 * at 512 kbit/s ≈ 27 min); the API answers only after the whole body arrived. Default 60 min,
 * override with AUDIO_UPLOAD_TIMEOUT_MS. The Node server's own 5-minute request timeout is lifted
 * by server-timeouts.cjs (preloaded in logs/start-frontend.cmd).
 */
const UPLOAD_TIMEOUT_MS = Math.max(60_000, Number(process.env.AUDIO_UPLOAD_TIMEOUT_MS) || 60 * 60_000);

// Hop-by-hop and recomputed headers are not forwarded. Client-sent forwarding headers are dropped too: the API
// trusts X-Forwarded-For from loopback (this server), so only the value set below may reach it (QA run3, 2e).
const DROP_REQUEST = new Set([
  "host", "connection", "keep-alive", "transfer-encoding", "upgrade", "content-length", "expect",
  "x-forwarded-for", "x-real-ip", "forwarded",
]);
const DROP_RESPONSE = new Set(["connection", "keep-alive", "transfer-encoding", "content-encoding", "content-length", "set-cookie"]);

function jsonError(status: number, error: string, code: string) {
  return Response.json(
    { error, code },
    { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }
  );
}

async function forward(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  if (path.some((part) => part === ".." || part === ".")) return jsonError(400, "Bad request path", "BAD_PATH");
  const target = `${apiInternalUrl}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROP_REQUEST.has(key.toLowerCase())) headers.set(key, value);
  });
  const host = request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  headers.set("x-forwarded-host", request.headers.get("x-forwarded-host") || host);
  headers.set("x-forwarded-proto", proto);
  // Host nginx overwrites X-Real-IP with $remote_addr, so it is the real client when the request came through nginx.
  const realIp = (request.headers.get("x-real-ip") || "").trim();
  if (/^[0-9a-fA-F:.]{2,64}$/.test(realIp)) {
    headers.set("x-forwarded-for", realIp);
    headers.set("x-real-ip", realIp);
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(request.method === "POST" && path[0] === "audio" ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS),
      // Stream request bodies (file uploads) instead of buffering them.
      ...(hasBody ? ({ duplex: "half" } as Record<string, string>) : {}),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return timedOut
      ? jsonError(504, "The server took too long to respond. Please try again.", "UPSTREAM_TIMEOUT")
      : jsonError(502, "The server is unavailable right now. Please try again shortly.", "UPSTREAM_UNAVAILABLE");
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.has(key.toLowerCase())) out.set(key, value);
  });
  // BUG-1341: keep Content-Length for media (Range/206 previews) when the body is passed through as-is.
  const len = upstream.headers.get("content-length");
  if (len && !upstream.headers.get("content-encoding") && request.method !== "HEAD") out.set("content-length", len);
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie);

  // Upstream errors that are not JSON (e.g. a crash page) are wrapped so clients always get JSON.
  const type = upstream.headers.get("content-type") || "";
  if (upstream.status >= 400 && !type.includes("application/json")) {
    await upstream.body?.cancel().catch(() => undefined);
    const message = upstream.status >= 500 ? "Something went wrong on the server." : "Request failed.";
    const res = jsonError(upstream.status, message, `HTTP_${upstream.status}`);
    for (const cookie of upstream.headers.getSetCookie()) res.headers.append("set-cookie", cookie);
    return res;
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: out });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE, forward as OPTIONS, forward as HEAD };