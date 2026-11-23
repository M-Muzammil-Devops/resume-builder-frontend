/**
 * BUG-1297 / BUG-1270: after a deploy, a tab opened on the old build asks for JS/CSS chunks that
 * no longer exist (ChunkLoadError, or a stylesheet refused because the 404 page is HTML). Reload
 * once to pick up the new build; never loop (one reload per 60 s per tab).
 */
const KEY = "rb_chunk_reload_at";

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: unknown; message?: unknown };
  const name = typeof e.name === "string" ? e.name : "";
  const message = typeof e.message === "string" ? e.message : typeof err === "string" ? err : "";
  return (
    name === "ChunkLoadError" ||
    /Loading (CSS )?chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

export function reloadOnceForChunkError(err: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(err)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    window.sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // storage blocked: still reload once for this page view
  }
  window.location.reload();
  return true;
}
