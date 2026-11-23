#!/usr/bin/env node
/**
 * npm run templates:thumbs
 *
 * Renders every landing template's starter resume with the REAL ResumeCanvas (public route
 * /template-preview/<id>, same print CSS as the PDF) and writes:
 *   public/templates/<id>.webp + <id>.png   page-1 thumbnail used by the landing page and picker
 *   public/templates/thumbs/<id>-560.webp + <id>-280.webp   small copies for the landing carousel (srcset)
 *   public/templates/manifest.json          { fingerprint, pages } per template
 * templateThumbs.test.ts fails when a template has no real-render thumbnail, when its preset or
 * starter content changed since the thumbnail was made, or when the starter overflows its pages.
 *
 * Needs the frontend running (default http://localhost:3000, override with RB_BASE_URL).
 * Puppeteer comes from this package or from ../resume-builder-backend (it already ships Chrome).
 * Next serves public/ files from the build, so rebuild / redeploy the frontend afterwards.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "templates");
const base = (process.env.RB_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function loadPuppeteer() {
  try {
    return (await import("puppeteer")).default;
  } catch {
    const req = createRequire(path.resolve(root, "..", "resume-builder-backend", "package.json"));
    return req("puppeteer");
  }
}

function landingIds() {
  const src = fs.readFileSync(path.join(root, "src", "lib", "landingTemplates.ts"), "utf8");
  const block = src.slice(src.indexOf("LANDING_TEMPLATES"), src.indexOf("];", src.indexOf("LANDING_TEMPLATES")));
  return [...block.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** Same lookup order as the backend PDF renderer (src/lib/chrome.ts): env, installed Chrome/Edge. */
function chromePath() {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  const pf = process.env.PROGRAMFILES || "C:\\Program Files";
  const pf86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
  const local = process.env.LOCALAPPDATA || "";
  const candidates = [
    path.join(pf, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
    local && path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

const A4 = { width: 794, height: 1123 };
const THUMB_WIDTHS = [560, 280];

async function main() {
  const only = process.argv.slice(2);
  const ids = landingIds().filter((id) => !only.length || only.includes(id));
  if (!ids.length) throw new Error("No landing templates found");
  fs.mkdirSync(outDir, { recursive: true });
  const manifestPath = path.join(outDir, "manifest.json");
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : { renderer: "resume-canvas", templates: {} };

  const puppeteer = await loadPuppeteer();
  const executablePath = chromePath();
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--font-render-hinting=none"],
  });
  let failed = 0;
  try {
    for (const id of ids) {
      const page = await browser.newPage();
      await page.setViewport({ ...A4, deviceScaleFactor: 1.5 });
      await page.goto(`${base}/template-preview/${id}`, { waitUntil: "networkidle0", timeout: 60_000 });
      await page.waitForSelector("[data-print-ready], [data-print-error]", { timeout: 30_000 });
      const err = await page.$eval("body", (b) => b.querySelector("[data-print-error]")?.getAttribute("data-print-error") || "");
      if (err) {
        console.error(`✗ ${id}: ${err}`);
        failed++;
        await page.close();
        continue;
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
      });
      const fingerprint = await page.$eval("[data-print-ready]", (el) => el.getAttribute("data-template-fingerprint") || "");
      const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      const pages = (Buffer.from(pdf).toString("latin1").match(/\/Type\s*\/Page(?!s)/g) || []).length;
      await page.emulateMediaType("print");
      await new Promise((r) => setTimeout(r, 150));
      const clip = { x: 0, y: 0, ...A4 };
      await page.screenshot({ path: path.join(outDir, `${id}.webp`), type: "webp", quality: 90, clip });
      await page.screenshot({ path: path.join(outDir, `${id}.png`), type: "png", clip });
      // Landing carousel cards (BUG-1319): small copies so cards don't download the 1191px original.
      fs.mkdirSync(path.join(outDir, "thumbs"), { recursive: true });
      for (const w of THUMB_WIDTHS) {
        await page.setViewport({ ...A4, deviceScaleFactor: w / A4.width });
        await new Promise((r) => setTimeout(r, 100));
        await page.screenshot({ path: path.join(outDir, "thumbs", `${id}-${w}.webp`), type: "webp", quality: 80, clip });
      }
      manifest.templates[id] = { fingerprint, pages, width: A4.width, height: A4.height, generatedAt: new Date().toISOString() };
      console.log(`✓ ${id}: ${pages} page(s), fingerprint ${fingerprint}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  manifest.renderer = "resume-canvas";
  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest: ${manifestPath}`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
