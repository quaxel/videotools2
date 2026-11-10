// Renders a handful of frames of one composition with a single bundle and browser, then tiles them.
//   node scripts/stills.mjs <slug> <out-dir> [frame,frame,...]
// Without a frame list it takes one frame every second plus the middle of the last second.
// Writes <out-dir>/NNNNN.jpg per frame and <out-dir>/contact.jpg (ffmpeg tile, 10 columns).
// Renders with the `audit` input prop, so puppets, labels and screens report framing problems (faces or signs cut
// by the edge, under the captions, hidden behind the set); those go to <out-dir>/framing.txt and the console.
// STILL_SCALE=1 renders full-size stills (default 0.4). COLLIDE=1 only checks puppets walking through the set.
// LIGHTING=1 renders with puppet lighting on (LIGHTING=0 off), whatever the video sets. POST works the same for the
// post chain (engine/post), INK_DEBUG=1 shows its ink mask.
import { sharedBundle } from "./bundle.mjs";
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

const serveUrl = await sharedBundle();
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
// COLLIDE=1: a fast pass every 5 frames at tiny scale that only reports puppets inside set objects (no post chain).
const collide = process.env.COLLIDE === "1";
// LIGHTING=1 / LIGHTING=0 forces puppet lighting on or off (to preview an older video lit).
// POST=1 / POST=0 forces the post chain on or off; POST='{"ink":false}' switches single parts (A/B stills).
// INK_DEBUG=1 shows the set ink mask instead of the picture (with the ink part on: POST='{"ink":true}').
const post = process.env.POST === undefined ? {} : { post: process.env.POST === "1" ? true : process.env.POST === "0" ? false : JSON.parse(process.env.POST) };
const inputProps = {
  audit: true,
  ...(process.env.LIGHTING ? { lighting: process.env.LIGHTING === "1" } : {}),
  ...post,
  ...(process.env.INK_DEBUG === "1" ? { inkDebug: true } : {}),
  ...(collide ? { collide: true } : {}),
};
const composition = await selectComposition({ serveUrl, id: slug, puppeteerInstance: browser, inputProps });
const frames = list
  ? list.split(",").map(Number)
  : collide
    ? Array.from({ length: Math.ceil(composition.durationInFrames / 5) }, (_, k) => k * 5)
    : Array.from({ length: Math.floor(composition.durationInFrames / composition.fps) }, (_, s) => s * composition.fps + 15);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const issues = [];
// Frames render in STILLS_CONCURRENCY tabs of one browser at once (default 3, like remotion.config.ts); a crashed tab
// fails only its frame, which is tried once more on its own.
const CONC = Number(process.env.STILLS_CONCURRENCY ?? 3);
const todo = frames.filter((f) => f < composition.durationInFrames);
const one = async (frame) => {
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
};
let next = 0;
const failed = [];
await Promise.all(
  Array.from({ length: Math.max(1, CONC) }, async () => {
    while (next < todo.length) {
      const frame = todo[next++];
      try {
        await one(frame);
      } catch (e) {
        failed.push(frame);
      }
    }
  }),
);
for (const frame of failed) await one(frame); // a second failure stops the run with its error
issues.sort((a, b) => Number(a.slice(0, 5)) - Number(b.slice(0, 5)));
await browser.close({ silent: true });

if (collide) {
  fs.writeFileSync(path.join(outDir, "collide.txt"), issues.join("\n") + (issues.length ? "\n" : ""));
  console.log(issues.length ? `\ncollisions: ${issues.length} (frame  problem)\n${issues.join("\n")}` : "\ncollisions: none");
  process.exit(0);
}

execFileSync("ffmpeg", [
  "-v", "error", "-y", "-pattern_type", "glob", "-i", path.join(outDir, "*.jpg"),
  "-vf", `scale=216:-1,tile=10x${Math.max(1, Math.ceil(todo.length / 10))}:padding=3:color=white`, "-frames:v", "1", path.join(outDir, "contact.jpg"),
]);
console.log(`\n${todo.length} stills -> ${path.join(outDir, "contact.jpg")}`);
// "depth: no background layer" fires on most interiors (a back wall behind the subject): a note to look at, not a
// fault to fix. Every other line is a fix.
const isNote = (l) => l.includes("depth: no background layer");
const notes = issues.filter(isNote);
const faults = issues.filter((l) => !isNote(l));
fs.writeFileSync(path.join(outDir, "framing.txt"), faults.join("\n") + (faults.length ? "\n" : ""));
fs.writeFileSync(path.join(outDir, "depth-notes.txt"), notes.join("\n") + (notes.length ? "\n" : ""));
console.log(faults.length ? `framing: ${faults.length} issue(s) (frame  problem)\n${faults.join("\n")}` : "framing: no issues");
if (notes.length) console.log(`depth notes: ${notes.length} frame(s) with no background layer (depth-notes.txt; flat if the wall fills the frame)`);
