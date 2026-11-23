import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { LANDING_TEMPLATES } from "./landingTemplates";
import { LANDING_PRESETS } from "../shared/templateStarter";
import { expectedPages, templateFingerprint, templatePreviewDocument } from "./templateFingerprint";

/** Runs from the frontend or (in the shared npm test) from ../resume-builder-backend. */
function templatesDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "public", "templates"),
    path.resolve(process.cwd(), "..", "resume-builder-frontend", "public", "templates"),
  ];
  return candidates.find((dir) => fs.existsSync(path.join(dir, "manifest.json"))) ?? candidates[0];
}

const dir = templatesDir();
const manifestFile = path.join(dir, "manifest.json");

test("landing-match: thumbnails come from the real renderer (npm run templates:thumbs)", () => {
  assert.ok(fs.existsSync(manifestFile), `missing ${manifestFile}; run npm run templates:thumbs`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  assert.equal(manifest.renderer, "resume-canvas");
  for (const t of LANDING_TEMPLATES) {
    const entry = manifest.templates?.[t.id];
    assert.ok(entry, `${t.id}: no real-render thumbnail; run npm run templates:thumbs`);
    assert.equal(t.image, `/templates/${t.id}.webp`, `${t.id}: landing card must use its generated thumbnail`);
    assert.ok(fs.existsSync(path.join(dir, `${t.id}.webp`)), `${t.id}: missing public/templates/${t.id}.webp`);
    assert.equal(
      entry.fingerprint,
      templateFingerprint(t.id),
      `${t.id}: preset or starter content changed since the thumbnail was made; run npm run templates:thumbs`
    );
    assert.ok(
      entry.pages >= 1 && entry.pages <= expectedPages(t.id),
      `${t.id}: starter resume prints on ${entry.pages} pages (expected ≤ ${expectedPages(t.id)})`
    );
  }
});

test("landing-match: every landing card has a preset with the same layout and only shown sections", () => {
  for (const t of LANDING_TEMPLATES) {
    const preset = LANDING_PRESETS[t.id];
    assert.ok(preset, `${t.id}: no LANDING_PRESETS entry`);
    assert.equal(t.layoutKey, preset.layoutKey, `${t.id}: landing layoutKey differs from preset`);
    assert.equal(t.templateId, `tmpl-landing-${t.id}`);
  }
});

test("photo-restore: every starter sample photo exists in public/templates/photos", () => {
  for (const t of LANDING_TEMPLATES) {
    const url = templatePreviewDocument(t.id)?.content.sections.find((s) => s.type === "header");
    const photo = url && "photoUrl" in url ? url.photoUrl : "";
    if (!photo) continue;
    assert.match(photo, /^\/templates\/photos\/[a-z0-9-]+\.webp$/);
    assert.ok(fs.existsSync(path.join(dir, "photos", path.basename(photo))), `${t.id}: missing ${photo}`);
  }
});
