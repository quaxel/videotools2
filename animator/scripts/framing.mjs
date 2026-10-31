// Head-framing pre-pass: Stage keeps every puppet's head whole (engine/framing.ts), but solved frame by frame the
// correction jumps when a head reaches an edge. This renders the video once at tiny scale with the `framingPass`
// input prop, collects the raw correction Stage logs for every shot frame, and smooths it per shot: each frame takes
// the strongest correction within ±HOLD frames (so the camera starts easing before a head arrives and holds while it
// is needed), then a gaussian blur. The render reads the result from public/videos/<slug>/framing.json.
//   node scripts/framing.mjs <slug>
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOLD = 24; // frames: longer than the blur's reach, so a needed correction is held in full
const SIGMA = 6; // frames

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const slug = process.argv[2];
if (!slug) {
  console.error("usage: node scripts/framing.mjs <slug>");
  process.exit(2);
}

const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
const inputProps = { framingPass: true };
const composition = await selectComposition({ serveUrl, id: slug, puppeteerInstance: browser, inputProps });
const shots = {}; // shot start -> { f -> delta }
const tmp = path.join(os.tmpdir(), `framing-${slug}-${process.pid}.mp4`);
await renderMedia({
  serveUrl,
  composition,
  codec: "h264",
  outputLocation: tmp,
  inputProps,
  scale: 0.1,
  muted: true,
  puppeteerInstance: browser,
  chromiumOptions: { gl: "angle" },
  onBrowserLog: ({ text }) => {
    if (!text.startsWith("[framefix] ")) return;
    const { s, f, d } = JSON.parse(text.slice(11));
    (shots[s] ??= {})[f] = d;
  },
});
await browser.close({ silent: true });
fs.rmSync(tmp, { force: true });

const ID = [0, 0, 0, 0, 0, 0, 1];
const size = (d) => Math.hypot(d[0], d[1], d[2], d[3], d[4], d[5], (d[6] - 1) * 10);
const table = {};
let corrected = 0;
for (const [s, byF] of Object.entries(shots)) {
  const fs_ = Object.keys(byF).map(Number);
  const f0 = Math.min(...fs_);
  const f1 = Math.max(...fs_);
  const raw = Array.from({ length: f1 - f0 + 1 }, (_, i) => byF[f0 + i] ?? ID);
  if (raw.every((d) => size(d) < 1e-4)) continue; // nothing to correct in this shot
  // Hold: the strongest correction nearby.
  const held = raw.map((_, i) => {
    let best = raw[i];
    for (let j = Math.max(0, i - HOLD); j <= Math.min(raw.length - 1, i + HOLD); j++) if (size(raw[j]) > size(best)) best = raw[j];
    return best;
  });
  // Ease: a gaussian blur of every component.
  const r = Math.ceil(SIGMA * 3);
  const smooth = held.map((_, i) => {
    const acc = [0, 0, 0, 0, 0, 0, 0];
    let wsum = 0;
    for (let k = -r; k <= r; k++) {
      const j = Math.max(0, Math.min(held.length - 1, i + k));
      const w = Math.exp(-(k * k) / (2 * SIGMA * SIGMA));
      held[j].forEach((v, c) => (acc[c] += v * w));
      wsum += w;
    }
    return acc.map((v) => Math.round((v / wsum) * 1e4) / 1e4);
  });
  table[s] = { f0, d: smooth };
  corrected++;
}
const out = path.join(root, "public", "videos", slug, "framing.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(table));
console.log(`framing: ${Object.keys(shots).length} shots measured, ${corrected} with smoothed corrections -> ${path.relative(root, out)}`);
