// Renders a handful of frames of one composition with a single bundle and browser, then tiles them.
//   node scripts/stills.mjs <slug> <out-dir> [frame,frame,...]
// Without a frame list it takes one frame every second plus the middle of the last second.
// Writes <out-dir>/NNNNN.jpg per frame and <out-dir>/contact.jpg (ffmpeg tile, 10 columns).
// Renders with the `audit` input prop, so puppets, labels and screens report framing problems (faces or signs cut
// by the edge, under the captions, hidden behind the set); those go to <out-dir>/framing.txt and the console.
// STILL_SCALE=1 renders full-size stills (default 0.4). COLLIDE=1 only checks puppets walking through the set: every
// 5th frame (or the given frames), no pictures, -> <out-dir>/collide.txt.
// Collide walks the frames in a few tabs that stay open (about 6x faster); stills open a page per frame unless
// STILLS_WALK=1 (see below). STILLS_OLD=1 forces a page per frame for collide too, to compare.
// LIGHTING=1 renders with puppet lighting on (LIGHTING=0 off), whatever the video sets. POST works the same for the
// post chain (engine/post), INK_DEBUG=1 shows its ink mask.
import { sharedBundle } from "./bundle.mjs";
import { openBrowser, renderFrames, renderStill, selectComposition } from "@remotion/renderer";
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
// COLLIDE=1: a fast pass every 5 frames at tiny scale that only reports puppets inside set objects.
const collide = process.env.COLLIDE === "1";
// LIGHTING=1 / LIGHTING=0 forces puppet lighting on or off (to preview an older video lit).
// POST=1 / POST=0 forces the post chain on or off; POST='{"ink":false}' switches single parts (A/B stills).
// INK_DEBUG=1 shows the set ink mask instead of the picture (with the ink part on: POST='{"ink":true}').
const post = process.env.POST === undefined || process.env.COLLIDE === "1" ? {} : { post: process.env.POST === "1" ? true : process.env.POST === "0" ? false : JSON.parse(process.env.POST) };
const inputProps = {
  audit: true,
  ...(process.env.LIGHTING ? { lighting: process.env.LIGHTING === "1" } : {}),
  ...post,
  ...(process.env.INK_DEBUG === "1" ? { inkDebug: true } : {}),
  // collide: the engine's `collide` prop turns the post chain off, and without it a Stage with `blur` draws the set
  // and the cast on two canvases, where no puppet can meet a set object: every such shot said "none" whatever stood
  // in the desk. A post chain with every part off keeps each Stage on one canvas, for videos with and without `post`.
  // COLLIDE_PROPS=old passes the old prop instead (to compare).
  ...(collide ? (process.env.COLLIDE_PROPS === "old" ? { collide: true } : { post: { ink: false, lens: false, bloom: false, grade: false } }) : {}),
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
// Frames render in STILLS_CONCURRENCY tabs of one browser at once (default 3, like remotion.config.ts). Each tab
// WALKS its share of the frames in order (renderFrames with a frame list, one tab per call): the page, its shaders
// and the shot's set are loaded once and stay, where a renderStill per frame loaded them again for every frame
// (about 1.2 s a frame for collide, against 0.1-0.2 s walking). A walk covers at most WALK_SPAN frames of the video
// and then starts a fresh tab, because a tab keeps every finished shot's WebGL context alive (framing.mjs).
// Browser logs carry no frame number, so every walk is its own renderFrames call with one tab: what it logs before
// a frame is reported done belongs to that frame. COLLIDE=1 takes no pictures at all (imageFormat "none").
// STILLS_OLD=1 renders the old way (one renderStill per frame), to compare the two.
const CONC = Math.max(1, Number(process.env.STILLS_CONCURRENCY ?? 3));
const WALK_SPAN = Number(process.env.STILLS_WALK_SPAN ?? 400);
const todo = [...new Set(frames.filter((f) => f < composition.durationInFrames))].sort((a, b) => a - b);
const scale = collide ? 0.1 : Number(process.env.STILL_SCALE ?? 0.4);
const wanted = (text) => text.startsWith("[framing]") && !(collide && !text.includes("inside a set object"));
const note = (frame, texts) => {
  for (const text of new Set(texts)) issues.push(`${String(frame).padStart(5)}  ${text.slice(10)}`);
};
const file = (frame) => path.join(outDir, `${String(frame).padStart(5, "0")}.jpg`);
// Stills render one page per frame by default: walking puts the framing audit's log lines on the wrong frame now and
// then (a headline measured at 122 reported at 117), and a still's findings are read frame by frame. Collide walks
// (its findings are world-space and hold over neighbouring frames); STILLS_WALK=1 walks stills too, for speed.
if (process.env.STILLS_OLD === "1" || (!collide && process.env.STILLS_WALK !== "1")) {
  const one = async (frame) => {
    const seen = [];
    await renderStill({
      inputProps,
      onBrowserLog: ({ text }) => wanted(text) && seen.push(text),
      serveUrl,
      composition,
      frame,
      output: file(frame),
      imageFormat: "jpeg",
      scale,
      puppeteerInstance: browser,
      chromiumOptions: { gl: "angle" },
    });
    note(frame, seen);
    process.stdout.write(".");
  };
  let next = 0;
  const failed = [];
  await Promise.all(
    Array.from({ length: CONC }, async () => {
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
} else {
  // The walks: runs of neighbouring frames, about todo/CONC frames each and no longer than WALK_SPAN on the timeline.
  const share = Math.ceil(todo.length / CONC);
  const walks = [];
  for (const f of todo) {
    const last = walks[walks.length - 1];
    if (last && last.length < share && f - last[0] < WALK_SPAN) last.push(f);
    else walks.push([f]);
  }
  const done = new Set();
  // A walk collects the frames' sound like a render does (`muted` does not stop it here) and dies on an effect whose
  // baked file under public/space/ is not made yet (`pipeline.py cues`); a still never needed the sound. `stem` is
  // the engine's prop for one part of the soundtrack alone: a part that does not exist mounts no sound at all.
  const silent = { ...inputProps, stem: "none" };
  const walk = async (list) => {
    let heard = [];
    await renderFrames({
      serveUrl,
      composition,
      inputProps: silent,
      frames: list,
      concurrency: 1,
      muted: true,
      logLevel: "error", // "info" prints every browser log line
      scale,
      imageFormat: collide ? "none" : "jpeg",
      outputDir: null,
      ...(collide ? {} : { onFrameBuffer: (buffer, frame) => fs.writeFileSync(file(frame), buffer) }),
      onStart: () => undefined,
      onBrowserLog: ({ text }) => wanted(text) && heard.push(text),
      onFrameUpdate: (_, frame) => {
        if (!done.has(frame)) note(frame, heard);
        heard = [];
        done.add(frame);
        process.stdout.write(".");
      },
      puppeteerInstance: browser,
      chromiumOptions: { gl: "angle" },
    });
  };
  let next = 0;
  const failed = [];
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (next < walks.length) {
        const list = walks[next++];
        try {
          await walk(list);
        } catch (e) {
          failed.push(list.filter((f) => !done.has(f)));
        }
      }
    }),
  );
  for (const list of failed) if (list.length) await walk(list); // a second failure stops the run with its error
}
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
