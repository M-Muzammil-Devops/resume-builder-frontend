// node scripts/bake-shadows.cjs  (BUG-1319)
// Bakes the landing characters' drop shadows into the WebP files, so the page needs no CSS
// `filter: drop-shadow()` (a full blur pass per frame while they float). Writes *-shadow.webp next to
// each original; the originals stay untouched (they are used elsewhere without a shadow).
// Uses sharp from the backend's node_modules.
const path = require("path");
const req = require("module").createRequire(path.resolve(__dirname, "../../resume-builder-backend/package.json"));
const sharp = req("sharp");

const pub = path.resolve(__dirname, "../public");
// css: rendered height, shadow y-offset, blur radius, opacity, color — the values the CSS filters used.
const JOBS = [
  { file: "auth/man.webp", cssHeight: 500, dy: 26, blur: 22, alpha: 0.5, rgb: [0, 0, 0] },
  { file: "auth/boy.webp", cssHeight: 300, dy: 18, blur: 16, alpha: 0.4, rgb: [0, 0, 0] },
  { file: "landing/woman.webp", cssHeight: 400, dy: 24, blur: 20, alpha: 0.55, rgb: [0, 0, 0] },
  { file: "landing/jump.webp", cssHeight: 470, dy: 30, blur: 24, alpha: 0.6, rgb: [30, 10, 80] },
];

(async () => {
  for (const j of JOBS) {
    const src = path.join(pub, j.file);
    const { width: w, height: h } = await sharp(src).metadata();
    const k = h / j.cssHeight; // image px per CSS px
    const dy = Math.round(j.dy * k);
    const sigma = Math.max(0.3, (j.blur * k) / 2);
    const alphaRaw = await sharp(src).ensureAlpha().extractChannel(3).linear(j.alpha, 0).raw().toBuffer({ resolveWithObject: true });
    const alpha = alphaRaw.info.channels === 1 ? alphaRaw.data : Buffer.from(Array.from({ length: w * h }, (_, i) => alphaRaw.data[i * alphaRaw.info.channels]));
    // Shift the alpha mask down by dy in JS, then blur it as a 1-channel image. (Round 25: the old
    // sharp extend() step on raw 1-channel data came back with 3 channels, and reading that as one
    // channel drew horizontal streaks into the shadow — the "smear" over the hero paper at 1024.)
    const moved = Buffer.alloc(w * h);
    alpha.copy(moved, dy * w, 0, (h - dy) * w);
    const blurred = await sharp(moved, { raw: { width: w, height: h, channels: 1 } })
      .blur(sigma)
      .extractChannel(0)
      .raw()
      .toBuffer({ resolveWithObject: true });
    let shifted = blurred.data;
    if (blurred.info.channels !== 1 || shifted.length !== w * h) {
      const c = blurred.info.channels;
      shifted = Buffer.alloc(w * h);
      for (let i = 0; i < w * h; i++) shifted[i] = blurred.data[i * c];
    }
    // Round 25 (landing smear at 1024): the blurred shadow used to be cut off by the image box, which
    // left a hard-edged grey rectangle over the hero paper. Feather it to zero near every edge so the
    // shadow fades out inside the image instead of ending in a straight line.
    const feather = Math.max(8, Math.round(sigma * 3));
    for (let y = 0; y < h; y++) {
      const fy = Math.min(1, y / feather, (h - 1 - y) / feather);
      for (let x = 0; x < w; x++) {
        const f = Math.min(fy, x / feather, (w - 1 - x) / feather);
        if (f < 1) {
          const i = y * w + x;
          const e = Math.max(0, f);
          shifted[i] = Math.round(shifted[i] * e * e * (3 - 2 * e));
        }
      }
    }
    const shadow = await sharp({ create: { width: w, height: h, channels: 3, background: { r: j.rgb[0], g: j.rgb[1], b: j.rgb[2] } } })
      .joinChannel(shifted, { raw: { width: w, height: h, channels: 1 } })
      .png()
      .toBuffer();
    const out = src.replace(/\.webp$/, "-shadow.webp");
    await sharp(shadow).composite([{ input: src }]).webp({ quality: 86, alphaQuality: 90 }).toFile(out);
    const st = require("fs").statSync(out);
    console.log(`${path.relative(pub, out)} ${w}x${h} dy=${dy} sigma=${sigma.toFixed(1)} ${Math.round(st.size / 1024)} KB`);
  }
})();
