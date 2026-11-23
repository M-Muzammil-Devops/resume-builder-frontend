import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { CARD_SIZES, cardImage, previewSrc } from "./data";
import { REVEAL_ROOT_MARGIN, inRevealBand, parallaxShift } from "./useAuroraMotion";

/** Runs from the frontend or (in the shared npm test) from ../resume-builder-backend. */
function frontendDir(): string {
  const here = path.resolve(process.cwd());
  const candidates = [here, path.resolve(here, "..", "resume-builder-frontend")];
  return candidates.find((d) => fs.existsSync(path.join(d, "public", "templates", "manifest.json"))) ?? candidates[0];
}
const fe = frontendDir();
const css = fs.readFileSync(path.join(fe, "src", "components", "landing", "aurora", "LandingAurora.module.css"), "utf8");

/** Width from a WebP header (VP8 / VP8L / VP8X). */
function webpWidth(file: string): number {
  const b = fs.readFileSync(file);
  const kind = b.toString("latin1", 12, 16);
  if (kind === "VP8X") return 1 + b.readUIntLE(24, 3);
  if (kind === "VP8L") return 1 + (((b[22] & 0x3f) << 8) | b[21]);
  return b.readUInt16LE(26) & 0x3fff;
}

test("BUG-1318 reveal: early 200px margin, short opacity-only fade, instant mode", () => {
  assert.equal(REVEAL_ROOT_MARGIN, "200px 0px");
  const rule = /\.js \[data-reveal\] \{([^}]*)\}/.exec(css)?.[1] ?? "";
  assert.match(rule, /opacity: 0/);
  assert.doesNotMatch(rule, /translate:/, "no translate offset on reveal");
  const fade = /opacity ([\d.]+)s/.exec(rule);
  assert.ok(fade && Number(fade[1]) >= 0.25 && Number(fade[1]) <= 0.3, "opacity fade 250–300ms");
  assert.match(css, /\.instant \[data-reveal\] \{\s*transition: none;/);
  // Sweep band: in view, or within 200px above/below.
  assert.equal(inRevealBand(100, 300, 800), true);
  assert.equal(inRevealBand(950, 1200, 800), true);
  assert.equal(inRevealBand(1100, 1300, 800), false);
  assert.equal(inRevealBand(-500, -150, 800), true);
  assert.equal(inRevealBand(-600, -250, 800), false);
});

test("BUG-1319 parallax: cached geometry → shift, off-screen nodes skipped", () => {
  // Centre of a 100px node exactly mid-viewport → no shift.
  assert.equal(parallaxShift(1350, 100, 0.1, 1000, 800), 0);
  // 200px below the middle with depth 0.1 → 20px (half-pixel rounding).
  assert.equal(parallaxShift(1550, 100, 0.1, 1000, 800), 20);
  assert.equal(parallaxShift(1553, 100, 0.1, 1000, 800), 20.5);
  // Far below / above the viewport → null (no style write).
  assert.equal(parallaxShift(5000, 100, 0.1, 1000, 800), null);
  assert.equal(parallaxShift(0, 100, 0.1, 3000, 800), null);
});

test("BUG-1319 layers: no will-change, backdrop-filter only on the modal scrim (and not on phones), no blur filters", () => {
  assert.doesNotMatch(css, /will-change/);
  assert.doesNotMatch(css, /(^|[\s;{])filter:\s*blur/);
  const blocks = [...css.matchAll(/([^{}]+)\{[^{}]*backdrop-filter:\s*blur[^{}]*\}/g)].map((m) => m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim());
  assert.deepEqual(blocks, [".modalBack"]);
  assert.match(css, /@media \(max-width: 767px\) \{\s*\/\*[^*]*\*\/\s*\.modalBack \{\s*backdrop-filter: none;/);
});

test("BUG-1319 previews: cards use 280w/560w thumbnails; the PREVIEW modal keeps the original", () => {
  const c = cardImage("/templates/clean-cyan.webp");
  assert.equal(c.src, "/templates/thumbs/clean-cyan-560.webp");
  assert.equal(c.srcSet, "/templates/thumbs/clean-cyan-280.webp 280w, /templates/thumbs/clean-cyan-560.webp 560w");
  assert.equal(c.sizes, CARD_SIZES);
  assert.deepEqual(cardImage("https://cdn.example.com/x.png"), { src: "https://cdn.example.com/x.png" });
  assert.deepEqual(cardImage("/uploads/admin-1.webp"), { src: "/uploads/admin-1.webp" });
  assert.equal(previewSrc("/templates/clean-cyan.webp"), "/templates/clean-cyan.png");

  const dir = path.join(fe, "public", "templates");
  const originals = fs.readdirSync(dir).filter((f) => f.endsWith(".webp"));
  assert.ok(originals.length >= 12);
  for (const f of originals) {
    const id = f.replace(/\.webp$/, "");
    for (const w of [280, 560]) {
      const thumb = path.join(dir, "thumbs", `${id}-${w}.webp`);
      assert.ok(fs.existsSync(thumb), `missing ${thumb}; run npm run templates:thumbs`);
      assert.equal(webpWidth(thumb), w, `${id}-${w}.webp width`);
      assert.ok(fs.statSync(thumb).size < (w === 560 ? 70_000 : 25_000), `${id}-${w}.webp too large`);
    }
  }
});

test("BUG-1319 round23: no drop-shadow filters, floats pause off-screen and while scrolling", () => {
  const css = fs.readFileSync(path.join(__dirname, "LandingAurora.module.css"), "utf8");
  const tsx = fs.readFileSync(path.join(__dirname, "LandingAurora.tsx"), "utf8");
  const hook = fs.readFileSync(path.join(__dirname, "useAuroraMotion.ts"), "utf8");
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /drop-shadow/);
  assert.match(css, /\.f1\[data-off\][^{]*\.f3\[data-pause\] \{ animation-play-state: paused; \}/);
  assert.match(tsx, /useFloatPause\(rootRef/);
  assert.match(hook, /new IntersectionObserver/);
});

test("BUG-1326: hero badges move with the figure and stack under the stage below 1240px", () => {
  const css = fs.readFileSync(path.join(__dirname, "LandingAurora.module.css"), "utf8");
  const chip = css.match(/\n\.chip \{[^}]*\}/)![0];
  assert.match(chip, /translate3d\(calc\(var\(--mx\) \* -10px\), calc\(var\(--my\) \* -6px\), 0\)/);
  assert.match(css, /@media \(max-width: 1240px\) \{\s*\.heroBadges \{[^}]*display: flex/);
});

test("BUG-1319 round25: one passive scroll listener for the landing, wheel pauses floats, no root class toggle", () => {
  const hook = fs.readFileSync(path.join(__dirname, "useAuroraMotion.ts"), "utf8");
  const tsx = fs.readFileSync(path.join(__dirname, "LandingAurora.tsx"), "utf8");
  // Only the shared bus adds a window scroll listener.
  assert.equal((hook.match(/addEventListener\("scroll"/g) || []).length, 1);
  assert.equal((tsx.match(/addEventListener\("scroll"/g) || []).length, 0);
  assert.match(hook, /addEventListener\("wheel", busWheel, \{ passive: true \}\)/);
  assert.match(hook, /setAttribute\("data-pause", ""\)/);
  assert.doesNotMatch(hook, /root\.classList\.add\(scrollingClass\)/);
});

test("BUG-1318 round25: anchor click / hash change reveals the target section instantly", () => {
  const hook = fs.readFileSync(path.join(__dirname, "useAuroraMotion.ts"), "utf8");
  assert.match(hook, /const revealHash = /);
  assert.match(hook, /target\.contains\(node\)/);
  assert.match(hook, /document\.addEventListener\("click", onClick, true\)/);
});
