// Dumps a video's resolved cue tables (shots with their whip flag, effects, music) to JSON, for `pipeline.py sync`
// and the per-video score (videos/<slug>/music.py). Renders one frame of the soundtrack-only composition with the
// `cueDump` input prop and keeps what Video logs; no 3D shot is mounted. A composition that is not a Video (a preview
// with its own SoundTrack) gives its effect and music tables and no shots.
//   node scripts/cues.mjs <slug | composition> <out.json>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [slug, out] = process.argv.slice(2);
if (!slug || !out) {
  console.error("usage: node scripts/cues.mjs <slug> <out.json>");
  process.exit(2);
}
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });
const inputProps = { soundOnly: true, cueDump: true };
const composition = await selectComposition({ serveUrl, id: slug, inputProps });
let cues = null;
let track = null;
const tmp = path.join(os.tmpdir(), `cues-${slug}-${process.pid}.png`);
await renderStill({
  serveUrl,
  composition,
  frame: 0,
  scale: 0.1,
  inputProps,
  output: tmp,
  onBrowserLog: ({ text }) => {
    if (text.startsWith("[cues] ")) cues = JSON.parse(text.slice(7));
    if (text.startsWith("[soundtrack] ")) track ??= JSON.parse(text.slice(13));
  },
});
fs.rmSync(tmp, { force: true });
cues ??= track && { shots: [], ...track, library: track.music };
if (!cues) {
  console.error("no [cues] or [soundtrack] line logged: does the composition play a SoundTrack?");
  process.exit(1);
}
cues.total = composition.durationInFrames;
cues.fps = composition.fps;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(cues, null, 1));
console.log(`cues: ${cues.shots.length} shots, ${cues.sfx.length} effects, ${cues.music.length} music cues -> ${path.relative(root, out)}`);
