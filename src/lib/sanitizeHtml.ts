/* Same allow-list as the API (backend/src/lib/sanitizeHtml.ts). Render paths use this so stored HTML cannot run. */
const ALLOWED = new Set(["b", "i", "u", "br", "ul", "ol", "li", "a"]);

/** One HTML tag with properly quoted attributes, so a quoted ">" cannot end it early. */
const TAG = /^<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>][^\s>]*))?)*)\s*\/?>/;
const COMMENT = /^<!--[\s\S]*?(?:-->|$)/;

function safeHref(raw: string): string | null {
  const href = raw
    .replace(/&colon;|&#0*58;|&#x0*3a;/gi, ":")
    .trim()
    .replace(/[\u0000-\u001f\s]+/g, "");
  if (/^https?:\/\/[^"'<>`]+$/i.test(href)) return href;
  if (/^mailto:[^\s"'<>`]+$/i.test(href) && !/^mailto:javascript:/i.test(href)) return href;
  return null;
}

/**
 * Allow b, i, u, br, ul, ol, li and safe links. Every other tag, every attribute
 * (except a safe a[href]), comments and javascript: URLs are dropped. A "<" that could
 * start markup but is not a complete tag is escaped, so an unterminated tag such as
 * `<img src=x onerror=...` can never be completed by markup that follows it (BUG-402).
 */
export function sanitizeHtml(input: string): string {
  const source = String(input ?? "");
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch !== "<") {
      const next = source.slice(i).indexOf("<");
      const end = next === -1 ? source.length : i + next;
      out += source.slice(i, end);
      i = end;
      continue;
    }
    const rest = source.slice(i);
    const comment = COMMENT.exec(rest);
    if (comment) {
      i += comment[0].length;
      continue;
    }
    const tag = TAG.exec(rest);
    if (!tag) {
      // "a < b" stays as typed; only a "<" that could start markup is escaped.
      out += /^<[a-zA-Z!/?]/.test(rest) ? "&lt;" : "<";
      i += 1;
      continue;
    }
    i += tag[0].length;
    const closing = tag[1] === "/";
    const name = tag[2].toLowerCase();
    if (!ALLOWED.has(name)) continue;
    if (name === "br") {
      if (!closing) out += "<br>";
      continue;
    }
    if (closing) {
      out += `</${name}>`;
      continue;
    }
    if (name !== "a") {
      out += `<${name}>`;
      continue;
    }
    const match = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(` ${tag[3]}`);
    const href = safeHref(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
    out += href ? `<a href="${href}">` : "<a>";
  }
  return out.replace(/(?:<br>|\s)+$/i, (tail) => (tail.includes("<br>") ? "" : tail));
}
