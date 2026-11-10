// Head-framing pre-pass: Stage keeps every puppet's head whole (engine/framing.ts), but solved frame by frame the
// correction jumps when a head reaches an edge. This renders the video once at tiny scale with the `framingPass`
// input prop, collects the raw correction Stage logs for every shot frame, and smooths it per shot: each frame takes
// the strongest correction within ±HOLD frames (so the camera starts easing before a head arrives and holds while it
// is needed), then a gaussian blur. The render reads the result from public/videos/<slug>/framing.json.
//   node scripts/framing.mjs <slug>                 every shot
//   node scripts/framing.mjs <slug> 120-300,900-1010 only those frame spans (whole shots), merged into the existing
//                                                    table; pipeline.py stills <frames> uses this for the shots it looks at
import { sharedBundle } from "./bundle.mjs";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOLD = 24; // frames: longer than the blur's reach, so a needed correction is held in full
const SIGMA = 6; // frames

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const slug = process.argv[2];
const spans = process.argv[3] ? process.argv[3].split(",").map((r) => r.split("-").map(Number)) : null;
if (!slug) {
  console.error("usage: node scripts/framing.mjs <slug>");
  process.exit(2);
}

const serveUrl = await sharedBundle();
const inputProps = { framingPass: true };
const shots = {}; // shot start -> { f -> delta }
// Rendered in segments, each in a fresh browser: a render tab keeps every finished shot's WebGL context alive, so a
// long video with heavy sets runs the GPU out of memory in one pass ("Error creating WebGL context").
const SEGMENT = Number(process.env.FRAMING_SEGMENT ?? 400);
let total = null;
{
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  total = (await selectComposition({ serveUrl, id: slug, puppeteerInstance: browser, inputProps })).durationInFrames;
  await browser.close({ silent: true });
}
// The frame ranges to render: whole video in SEGMENT pieces, or the requested spans (each cut to SEGMENT pieces).
const ranges = [];
for (const [a, b] of spans ?? [[0, total - 1]])
  for (let s = a; s <= Math.min(b, total - 1); s += SEGMENT) ranges.push([s, Math.min(b, total - 1, s + SEGMENT - 1)]);
for (const [start, end] of ranges) {
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  const composition = await selectComposition({ serveUrl, id: slug, puppeteerInstance: browser, inputProps });
  const tmp = path.join(os.tmpdir(), `framing-${slug}-${process.pid}-${start}.mp4`);
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: tmp,
    inputProps,
    scale: 0.1,
    muted: true,
    frameRange: [start, end],
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
}

const ID = [0, 0, 0, 0, 0, 0, 1];
const size = (d) => Math.hypot(d[0], d[1], d[2], d[3], d[4], d[5], (d[6] - 1) * 10);
const out = path.join(root, "public", "videos", slug, "framing.json");
// A partial pass keeps the other shots' corrections from the last table and replaces the shots it measured.
const table = spans && fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
const inSpans = (s) => !spans || spans.some(([a, b]) => +s >= a && +s <= b);
// A neighbouring shot seen only through a dissolve was measured for a few frames: keep its old entry.
for (const s of Object.keys(shots)) if (!inSpans(s)) delete shots[s];
for (const s of Object.keys(table)) if (inSpans(s) && spans) delete table[s];
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
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(table));
console.log(`framing${spans ? " (partial)" : ""}: ${Object.keys(shots).length} shots measured, ${corrected} with smoothed corrections -> ${path.relative(root, out)}`);
