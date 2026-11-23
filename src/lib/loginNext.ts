/**
 * BUG-1327: where to go after ANY sign-in (password or demo). One parser, so both paths keep
 * ?next=template&tpl=… and ?next=/user/editor/… the same way.
 */
export type LoginNext = { kind: "template"; tplId: string } | { kind: "path"; path: string } | { kind: "default" };

/** Same-site relative paths only: "/x/y", never "//host", "/\\host", schemes, dots or odd characters. */
export function isSafeNextPath(p: string): boolean {
  return /^\/(?![/\\])[\w\-/]*$/.test(p) && !p.includes("//") && /^\/((user\/)?editor\/[\w-]+|tools\/[\w-]+|user\/[\w\-/]+)$/.test(p);
}

export function parseLoginNext(search: { get(name: string): string | null }): LoginNext {
  const next = (search.get("next") || "").trim();
  const tpl = (search.get("tpl") || "").trim();
  if (next === "template") return /^[\w-]{1,80}$/.test(tpl) ? { kind: "template", tplId: tpl } : { kind: "default" };
  if (next && isSafeNextPath(next)) return { kind: "path", path: next };
  return { kind: "default" };
}
