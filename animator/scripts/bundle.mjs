// One shared Remotion bundle for every script (stills, collide, framing, cues, sound) and for `remotion render`.
// A fresh bundle() compiles all of src/ and copies the whole of public/ (~340 MB) into a temp folder, about two
// minutes each time; every stills, collide, framing, cues and render segment used to pay that. Here the bundle is
// built once per source state into out/bundles/<signature>/ with public/ symlinked, not copied, and reused until a
// file under src/ (or the Remotion version) changes. Files added to public/ show through the symlink without a
// rebuild. Two processes building the same signature at once each build into a private folder and the first rename
// wins, so a reader never sees a half-written bundle.
//   import { sharedBundle } from "./bundle.mjs";  const serveUrl = await sharedBundle();
//   node scripts/bundle.mjs            prints the bundle folder (builds it if needed), for pipeline.py
import { bundle } from "@remotion/bundler";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const store = path.join(root, "out", "bundles");
const KEEP = 4; // newest bundles kept; older ones are deleted

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(`${path.relative(root, p)}:${fs.statSync(p).mtimeMs}:${fs.statSync(p).size}`);
  }
  return out;
}

export function signature() {
  const files = walk(path.join(root, "src"), []).sort();
  for (const f of ["package-lock.json", "remotion.config.ts", "tsconfig.json"]) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) files.push(`${f}:${fs.statSync(p).mtimeMs}`);
  }
  return crypto.createHash("sha1").update(files.join("\n")).digest("hex").slice(0, 16);
}

function prune() {
  if (!fs.existsSync(store)) return;
  const dirs = fs
    .readdirSync(store)
    .filter((d) => !d.includes(".tmp-"))
    .map((d) => ({ d, t: fs.statSync(path.join(store, d)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { d } of dirs.slice(KEEP)) fs.rmSync(path.join(store, d), { recursive: true, force: true });
  // Private build folders older than an hour belong to a build that died.
  for (const d of fs.readdirSync(store).filter((d) => d.includes(".tmp-"))) {
    const p = path.join(store, d);
    if (Date.now() - fs.statSync(p).mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true });
  }
}

export async function sharedBundle({ quiet = false } = {}) {
  if (process.env.FRESH_BUNDLE === "1") return bundle({ entryPoint: path.join(root, "src", "index.ts") });
  const sig = signature();
  const dir = path.join(store, sig);
  if (fs.existsSync(path.join(dir, "index.html"))) {
    fs.utimesSync(dir, new Date(), new Date()); // keeps it among the newest for prune()
    return dir;
  }
  fs.mkdirSync(store, { recursive: true });
  const tmp = path.join(store, `${sig}.tmp-${process.pid}`);
  const began = Date.now();
  if (!quiet) process.stderr.write(`bundling src/ (${sig})...\n`);
  await bundle({
    entryPoint: path.join(root, "src", "index.ts"),
    outDir: tmp,
    publicDir: path.join(root, "public"),
    symlinkPublicDir: true,
    enableCaching: true,
  });
  try {
    fs.renameSync(tmp, dir);
  } catch {
    // Another process finished the same bundle first: use theirs.
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (!quiet) process.stderr.write(`bundled in ${((Date.now() - began) / 1000).toFixed(0)} s\n`);
  prune();
  return dir;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(await sharedBundle());
}
