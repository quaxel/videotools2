// Renders a handful of frames of one composition with a single bundle and browser, then tiles them.
//   node scripts/stills.mjs <slug> <out-dir> [frame,frame,...]
// Without a frame list it takes one frame every second plus the middle of the last second.
// Writes <out-dir>/NNNNN.jpg per frame and <out-dir>/contact.jpg (ffmpeg tile, 10 columns).
// Renders with the `audit` input prop, so puppets, labels and screens report framing problems (faces or signs cut
// by the edge, under the captions, hidden behind the set); those go to <out-dir>/framing.txt and the console.
// STILL_SCALE=1 renders full-size stills (default 0.4). COLLIDE=1 only checks puppets walking through the set.
// LIGHTING=1 renders with puppet lighting on (LIGHTING=0 off), whatever the video sets.
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [slug, outDir, list] = process.argv.slice(2);
if (!slug || !outDir) {
  console.error("usage: node scripts/stills.mjs <slug> <out-dir> [frames]");
  process.exit(2);
}

const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
// LIGHTING=1 / LIGHTING=0 forces puppet lighting on or off (to preview an older video lit).
const inputProps = { audit: true, ...(process.env.LIGHTING ? { lighting: process.env.LIGHTING === "1" } : {}) };
const composition = await selectComposition({ serveUrl, id: slug, puppeteerInstance: browser, inputProps });
// COLLIDE=1: a fast pass every 5 frames at tiny scale that only reports puppets inside set objects.
const collide = process.env.COLLIDE === "1";
const frames = list
  ? list.split(",").map(Number)
  : collide
    ? Array.from({ length: Math.ceil(composition.durationInFrames / 5) }, (_, k) => k * 5)
    : Array.from({ length: Math.floor(composition.durationInFrames / composition.fps) }, (_, s) => s * composition.fps + 15);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const issues = [];
for (const frame of frames.filter((f) => f < composition.durationInFrames)) {
  const seen = new Set();
  await renderStill({
    inputProps,
    onBrowserLog: ({ text }) => {
      if (!text.startsWith("[framing]") || seen.has(text) || (collide && !text.includes("inside a set object"))) return;
      seen.add(text);
      issues.push(`${String(frame).padStart(5)}  ${text.slice(10)}`);
    },
    serveUrl,
    composition,
    frame,
    output: path.join(outDir, `${String(frame).padStart(5, "0")}.jpg`),
    imageFormat: "jpeg",
    scale: collide ? 0.1 : Number(process.env.STILL_SCALE ?? 0.4),
    puppeteerInstance: browser,
    chromiumOptions: { gl: "angle" },
  });
  process.stdout.write(".");
}
await browser.close({ silent: true });

if (collide) {
  fs.writeFileSync(path.join(outDir, "collide.txt"), issues.join("\n") + (issues.length ? "\n" : ""));
  console.log(issues.length ? `\ncollisions: ${issues.length} (frame  problem)\n${issues.join("\n")}` : "\ncollisions: none");
  process.exit(0);
}

execFileSync("ffmpeg", [
  "-v", "error", "-y", "-pattern_type", "glob", "-i", path.join(outDir, "*.jpg"),
  "-vf", "scale=216:-1,tile=10x7:padding=3:color=white", "-frames:v", "1", path.join(outDir, "contact.jpg"),
]);
console.log(`\n${frames.length} stills -> ${path.join(outDir, "contact.jpg")}`);
fs.writeFileSync(path.join(outDir, "framing.txt"), issues.join("\n") + (issues.length ? "\n" : ""));
console.log(issues.length ? `framing: ${issues.length} issue(s) (frame  problem)\n${issues.join("\n")}` : "framing: no issues");
