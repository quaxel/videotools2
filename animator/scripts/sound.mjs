// Renders only the soundtrack (voice, effects, music) of a composition to a WAV, for `pipeline.py render`, which
// renders the picture in segments and muxes this track over it. (The CLI applies remotion.config.ts's CRF, which an
// audio codec refuses, so this goes through the API.)
//   node scripts/sound.mjs <slug> <out.wav>
import { sharedBundle } from "./bundle.mjs";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [slug, out] = process.argv.slice(2);
if (!slug || !out) {
  console.error("usage: node scripts/sound.mjs <slug> <out.wav>");
  process.exit(2);
}
const serveUrl = await sharedBundle();
// SCORE=1 / SCORE=0 plays the video's own score (public/videos/<slug>/music.wav) or the scene's library cues, for an A/B.
// STEM=voice|music|sfx renders that part alone (pipeline.py mix).
const inputProps = { soundOnly: true, ...(process.env.SCORE ? { score: process.env.SCORE === "1" } : {}), ...(process.env.STEM ? { stem: process.env.STEM } : {}) };
const composition = await selectComposition({ serveUrl, id: slug, inputProps });
await renderMedia({ serveUrl, composition, codec: "wav", outputLocation: out, inputProps });
