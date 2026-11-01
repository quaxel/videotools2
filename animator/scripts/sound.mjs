// Renders only the soundtrack (voice, effects, music) of a composition to a WAV, for `pipeline.py render`, which
// renders the picture in segments and muxes this track over it. (The CLI applies remotion.config.ts's CRF, which an
// audio codec refuses, so this goes through the API.)
//   node scripts/sound.mjs <slug> <out.wav>
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [slug, out] = process.argv.slice(2);
if (!slug || !out) {
  console.error("usage: node scripts/sound.mjs <slug> <out.wav>");
  process.exit(2);
}
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });
const inputProps = { soundOnly: true };
const composition = await selectComposition({ serveUrl, id: slug, inputProps });
await renderMedia({ serveUrl, composition, codec: "wav", outputLocation: out, inputProps });
