import React, { RefObject, useLayoutEffect } from "react";
import { getInputProps } from "remotion";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Framing audit for `pipeline.py stills`: when the render is started with the input prop `audit`, puppets,
// labels and screens measure where they land in the picture and log what a reviewer would flag: a face or a
// sign cut by the frame edge, under the caption band, or hidden behind a set piece. stills.mjs collects the
// "[framing]" lines per frame, and a puppet standing inside a set object. Normal renders skip all of it.

export const auditing = () => (getInputProps() as { audit?: boolean }).audit === true;

// Opt out on purpose: `userData.audit = false` on any object (or a group above it) leaves it out of every scene check
// below (a crowd meant to run off the edge, a sign that is meant to be cropped). Puppets use `crop`, models `heads`.
const optedOut = (o: THREE.Object3D | null) => {
  for (; o; o = o.parent) if (o.userData.audit === false) return true;
  return false;
};

// The caption band in normalised device coordinates (captions sit at 1300-1420 px of 1920, mid 75% wide).
const CAPTION = { x0: -0.75, x1: 0.75, y0: -0.48, y1: -0.33 };

type Box = { x0: number; x1: number; y0: number; y1: number };
const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const overlap = (a: Box, b: Box): Box => ({ x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1), y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1) });
const FRAME: Box = { x0: -1, x1: 1, y0: -1, y1: 1 };

// Screen box of world points, or null when any is behind the camera.
const project = (points: THREE.Vector3[], camera: THREE.Camera): Box | null => {
  const b: Box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const p of points) {
    const v = p.clone().project(camera);
    if (v.z > 1) return null;
    b.x0 = Math.min(b.x0, v.x);
    b.x1 = Math.max(b.x1, v.x);
    b.y0 = Math.min(b.y0, v.y);
    b.y1 = Math.max(b.y1, v.y);
  }
  return b;
};

// True when a solid set object sits between the camera and `point` (glows, shadows, decals and puppets skipped).
const hidden = (point: THREE.Vector3, scene: THREE.Scene, camera: THREE.Camera, self: THREE.Object3D, margin: number) => {
  // useFrame runs before the render that would update world matrices, so a freshly mounted set is still at
  // the origin: update them first.
  scene.updateMatrixWorld();
  const from = camera.getWorldPosition(new THREE.Vector3());
  const dir = point.clone().sub(from);
  const dist = dir.length();
  const ray = new THREE.Raycaster(from, dir.normalize(), 0.01, dist - margin);
  for (const hit of ray.intersectObjects(scene.children, true)) {
    let o: THREE.Object3D | null = hit.object;
    let skip = false;
    while (o) {
      if (o === self || o.userData.puppet) skip = true;
      o = o.parent;
    }
    const m = (hit.object as THREE.Mesh).material as THREE.Material | undefined;
    if (skip || !m || !hit.object.visible || m.depthWrite === false || (m.transparent && m.opacity < 0.5) || m.side === THREE.BackSide) continue;
    return true;
  }
  return false;
};

const HEAD_Y_M = (800 * 1.3) / 1060; // puppet head centre above its card's pivot (PuppetBillboard HEAD_Y)

const say = (msg: string) => console.log(`[framing] ${msg}`);
const fmt = (v: THREE.Vector3) => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
const pct = (v: number) => Math.round(v * 100);

// ---------- text drawn on canvases ----------

// Every word written on a 2D canvas (fillText / strokeText) is remembered with its box in canvas pixels, so any mesh
// that shows that canvas as its texture (kit Label and Screen, a set's shop sign, a slug's own board) can be checked
// for text cut by the frame edge, on the letters themselves rather than the card. Recording is on only while
// auditing; a canvas wiped whole (clearRect / fillRect over all of it) starts a fresh list.
export type TextRun = { text: string; x0: number; x1: number; y0: number; y1: number };
const RUNS = new WeakMap<HTMLCanvasElement | OffscreenCanvas, TextRun[]>();
export const canvasTexts = (canvas: unknown): TextRun[] | undefined => (canvas ? RUNS.get(canvas as HTMLCanvasElement) : undefined);
if (auditing() && typeof CanvasRenderingContext2D !== "undefined") {
  const P = CanvasRenderingContext2D.prototype;
  const record = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) => {
    if (!String(text).trim()) return;
    const m = ctx.measureText(text);
    const squeeze = maxWidth !== undefined && m.width > maxWidth && maxWidth > 0 ? maxWidth / m.width : 1;
    const l = m.actualBoundingBoxLeft * squeeze;
    const r = m.actualBoundingBoxRight * squeeze;
    const t = ctx.getTransform();
    const pts = [
      [x - l, y - m.actualBoundingBoxAscent],
      [x + r, y - m.actualBoundingBoxAscent],
      [x - l, y + m.actualBoundingBoxDescent],
      [x + r, y + m.actualBoundingBoxDescent],
    ].map(([px, py]) => [t.a * px + t.c * py + t.e, t.b * px + t.d * py + t.f]);
    const run: TextRun = {
      text: String(text).replace(/\s+/g, " ").trim(),
      x0: Math.min(...pts.map((p) => p[0])),
      x1: Math.max(...pts.map((p) => p[0])),
      y0: Math.min(...pts.map((p) => p[1])),
      y1: Math.max(...pts.map((p) => p[1])),
    };
    const list = RUNS.get(ctx.canvas) ?? [];
    // An outline and its fill are one word.
    if (!list.some((o) => o.text === run.text && Math.abs(o.x0 - run.x0) < 2 && Math.abs(o.y0 - run.y0) < 2)) list.push(run);
    RUNS.set(ctx.canvas, list);
  };
  const wipe = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const t = ctx.getTransform();
    if (t.a === 1 && t.b === 0 && t.c === 0 && t.d === 1 && t.e === 0 && t.f === 0 && x <= 0 && y <= 0 && x + w >= ctx.canvas.width && y + h >= ctx.canvas.height) RUNS.delete(ctx.canvas);
  };
  for (const name of ["fillText", "strokeText"] as const) {
    const orig = P[name];
    P[name] = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
      record(this, text, x, y, maxWidth);
      // eslint-disable-next-line prefer-rest-params
      return (orig as (...a: unknown[]) => void).apply(this, Array.from(arguments));
    };
  }
  for (const name of ["clearRect", "fillRect"] as const) {
    const orig = P[name];
    P[name] = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      wipe(this, x, y, w, h);
      return orig.call(this, x, y, w, h);
    };
  }
}

// The world boxes of the words a mesh shows: a plane (the whole texture over it) or the side faces of a box (the
// texture on each face, as three's BoxGeometry lays its UVs). Each word as 4 world corners in reading order
// (top-left, top-right, bottom-left, bottom-right), with the face's outward normal.
type Word = { text: string; corners: THREE.Vector3[]; normal: THREE.Vector3 };
const wordsOn = (mesh: THREE.Mesh): Word[] => {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshBasicMaterial | undefined;
  const map = mat?.map;
  const runs = map ? canvasTexts(map.image) : undefined;
  if (!map || !runs?.length) return [];
  if (map.repeat.x !== 1 || map.repeat.y !== 1 || map.offset.x !== 0 || map.offset.y !== 0 || map.rotation !== 0) return [];
  const img = map.image as { width: number; height: number };
  const geo = mesh.geometry as THREE.BufferGeometry & { parameters?: Record<string, number> };
  const prm = geo.parameters ?? {};
  // face frames in local space: origin (centre), u axis (texture left->right), v axis (texture bottom->top), normal
  const faces: { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; n: THREE.Vector3 }[] = [];
  if (geo.type === "PlaneGeometry") {
    faces.push({ o: new THREE.Vector3(), u: new THREE.Vector3(prm.width, 0, 0), v: new THREE.Vector3(0, prm.height, 0), n: new THREE.Vector3(0, 0, 1) });
  } else if (geo.type === "BoxGeometry") {
    const [w, h, d] = [prm.width, prm.height, prm.depth];
    faces.push(
      { o: new THREE.Vector3(0, 0, d / 2), u: new THREE.Vector3(w, 0, 0), v: new THREE.Vector3(0, h, 0), n: new THREE.Vector3(0, 0, 1) },
      { o: new THREE.Vector3(0, 0, -d / 2), u: new THREE.Vector3(-w, 0, 0), v: new THREE.Vector3(0, h, 0), n: new THREE.Vector3(0, 0, -1) },
      { o: new THREE.Vector3(w / 2, 0, 0), u: new THREE.Vector3(0, 0, -d), v: new THREE.Vector3(0, h, 0), n: new THREE.Vector3(1, 0, 0) },
      { o: new THREE.Vector3(-w / 2, 0, 0), u: new THREE.Vector3(0, 0, d), v: new THREE.Vector3(0, h, 0), n: new THREE.Vector3(-1, 0, 0) },
    );
  } else return [];
  const flip = map.flipY ? 1 : -1;
  const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const out: Word[] = [];
  for (const f of faces) {
    const at = (px: number, py: number) => {
      const u = px / img.width - 0.5;
      const v = (0.5 - py / img.height) * flip;
      return f.o.clone().addScaledVector(f.u, u).addScaledVector(f.v, v).applyMatrix4(mesh.matrixWorld);
    };
    const normal = f.n.clone().applyMatrix3(nm).normalize();
    for (const r of runs) out.push({ text: r.text, corners: [at(r.x0, r.y0), at(r.x1, r.y0), at(r.x0, r.y1), at(r.x1, r.y1)], normal });
  }
  return out;
};

// The screen box of one word and how much of it lies outside the frame; null when it does not read as text in this
// shot (behind the camera, facing away, or under ~14 px tall).
const wordOnScreen = (w: Word, camera: THREE.Camera, doubleSided: boolean) => {
  const eye = camera.getWorldPosition(new THREE.Vector3());
  if (!doubleSided && w.normal.dot(eye.clone().sub(w.corners[0])) <= 0) return null;
  const box = project(w.corners, camera);
  if (!box || box.y1 - box.y0 < 0.015) return null;
  const inFrame = area(overlap(box, FRAME));
  if (inFrame <= 0) return null;
  return { box, inFrame, out: 1 - inFrame / area(box) };
};

// A point on the part of a word that is inside the frame (for the "hidden behind the set" ray).
const visiblePoint = (w: Word, box: Box): THREE.Vector3 => {
  const o = overlap(box, FRAME);
  const s = ((o.x0 + o.x1) / 2 - box.x0) / Math.max(1e-6, box.x1 - box.x0);
  const t = ((o.y0 + o.y1) / 2 - box.y0) / Math.max(1e-6, box.y1 - box.y0);
  const [tl, tr, bl, br] = w.corners;
  const top = tl.clone().lerp(tr, s);
  const bottom = bl.clone().lerp(br, s);
  return bottom.lerp(top, t);
};

// Set meshes a standing puppet's body passes through. The body is a thin column on the puppet's spot (the
// cut-out is flat); rooms (floor, walls) are skipped by size, glows, glass, ink hulls and anything under a
// `userData.ghost` group (smoke, held props, effects) are ignored.
const BODY = { halfW: 0.13, halfD: 0.06, y0: 0.15, y1: 0.95 };
const bodyHits = (scene: THREE.Scene, x: number, z: number): THREE.Vector3[] => {
  scene.updateMatrixWorld();
  const body = new THREE.Box3(new THREE.Vector3(x - BODY.halfW, BODY.y0, z - BODY.halfD), new THREE.Vector3(x + BODY.halfW, BODY.y1, z + BODY.halfD));
  const hits: THREE.Vector3[] = [];
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const m = mesh.material as THREE.Material | undefined;
    if (!m || m.depthWrite === false || (m.transparent && m.opacity < 0.5) || m.side === THREE.BackSide) return;
    for (let o: THREE.Object3D | null = mesh; o; o = o.parent) if (o.userData.puppet || o.userData.ghost) return;
    box.setFromObject(mesh);
    box.getSize(size);
    if (size.x > 3 || size.z > 3 || size.y > 2.6) return;
    if (box.intersectsBox(body)) hits.push(box.getCenter(new THREE.Vector3()));
  });
  return hits;
};

// For a flat sign of `w` x `h` metres centred on `ref`'s origin in its local XY plane. When the sign's texture has
// words on it (canvas text, see above), the frame-edge check is on the words: any letter outside the frame is a cut
// ("AUNCH"); the card's border may be cropped. Without words (a logo) it is on the card, 20 % outside.
export const useSignAudit = (ref: RefObject<THREE.Object3D | null>, w: number, h: number, name: string) => {
  useLayoutEffect(() => {
    if (ref.current) ref.current.userData.signAudit = true; // the scene audit leaves its words to this one
  });
  useFrame(({ camera, scene }) => {
    const obj = ref.current;
    if (!obj || !auditing()) return;
    obj.userData.signAudit = true; // the scene audit leaves its words to this one
    if (optedOut(obj)) return;
    obj.updateWorldMatrix(true, true);
    let words: Word[] = [];
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.visible) words = words.concat(wordsOn(o as THREE.Mesh));
    });
    const corners = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [-w / 2, h / 2],
      [w / 2, h / 2],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0).applyMatrix4(obj.matrixWorld));
    const box = project(corners, camera);
    if (!box) return;
    const inFrame = area(overlap(box, FRAME));
    // Only signs that read as part of the shot: at least 1 % of the frame.
    if (inFrame < 0.04) return;
    const label = name.replace(/\n/g, " ");
    if (words.length) {
      const cut = words.map((wd) => wordOnScreen(wd, camera, true)).filter((x): x is NonNullable<typeof x> => !!x && x.out > TEXT_OUT);
      const worst = cut.sort((a, b) => b.out - a.out)[0];
      if (worst) say(`sign "${label}" cut by the frame edge (${pct(worst.out)}% of its text outside)`);
    } else if (inFrame / area(box) < 0.8) say(`sign "${label}" cut by the frame edge (${Math.round((1 - inFrame / area(box)) * 100)}% outside)`);
    const under = area(overlap(overlap(box, FRAME), CAPTION)) / inFrame;
    if (under > 0.3) say(`sign "${label}" under the captions (${Math.round(under * 100)}%)`);
    const centre = new THREE.Vector3().applyMatrix4(obj.matrixWorld);
    if (hidden(centre, scene, camera, obj, 0.02)) say(`sign "${label}" hidden behind the set`);
  });
};

// Share of a word's screen box that may lie outside the frame before it counts as cut (rounding of the box).
const TEXT_OUT = 0.03;

// Meshes riding on a puppet's head that are not part of its card: a slug's own 3D hat (a bicorne overlay through
// Stage `foreground`). Tagged `userData.hatOf = <puppet id>` on the hat or a group above it; untagged, any small solid
// mesh under a `ghost` group (foreground, held props) whose base sits on the top of the head and that is centred over
// it. Their world box joins the head.
const overlayHats = (scene: THREE.Scene, id: string, c: THREE.Vector3, r: number): THREE.Box3 | null => {
  const all = new THREE.Box3();
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const visit = (o: THREE.Object3D, ghost: boolean, tagged: string | undefined) => {
    if (!o.visible || o.userData.puppet || o.userData.audit === false) return;
    const g = ghost || !!o.userData.ghost;
    const tag = (o.userData.hatOf as string | undefined) ?? tagged;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && (tag === id || (tag === undefined && g))) {
      const m = mesh.material as THREE.Material;
      if (m && m.depthWrite !== false && !(m.transparent && m.opacity < 0.5) && m.side !== THREE.BackSide) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        box.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
        box.getSize(size);
        box.getCenter(mid);
        const onHead =
          tag === id ||
          (Math.max(size.x, size.y, size.z) < 0.65 &&
            Math.max(Math.abs(box.min.x - c.x), Math.abs(box.max.x - c.x), Math.abs(box.min.z - c.z), Math.abs(box.max.z - c.z)) < 0.4 &&
            box.min.y > c.y - 0.05 &&
            box.min.y < c.y + r + 0.12 &&
            box.max.y > c.y + r * 0.6);
        if (onHead) all.union(box);
      }
    }
    for (const ch of o.children) visit(ch, g, tag);
  };
  visit(scene, false, undefined);
  return all.isEmpty() ? null : all;
};

const corners8 = (b: THREE.Box3) =>
  [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
const union = (a: Box | null, b: Box | null): Box | null =>
  !a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) };

// For a puppet whose head centre is at `head` (world) with radius `r`. A standing puppet (not `sit`) also
// reports when its body is inside a set object (walking through a counter, standing in a desk).
// `opts.card` (the card's lean group, head at (0, headOnCard) on it) with `opts.hat` (the drawn hat's box in metres from the
// head centre, PuppetBillboard's hatBox) adds the hat to the head: a hat cut by the frame edge is a cut head too.
// Overlay hats (see overlayHats) count the same.
export const usePuppetAudit = (
  ref: RefObject<THREE.Object3D | null>,
  head: () => THREE.Vector3,
  r: number,
  id: string,
  sit = false,
  opts: { card?: RefObject<THREE.Object3D | null>; headOnCard?: number; hat?: { x0: number; x1: number; y0: number; y1: number } | null } = {},
) => {
  useFrame(({ camera, scene }) => {
    const obj = ref.current;
    if (!obj || !auditing() || optedOut(obj)) return;
    obj.updateWorldMatrix(true, true);
    const c = head();
    if (!sit) {
      const hits = bodyHits(scene, c.x, c.z);
      if (hits.length) {
        const p = hits[0];
        say(`body of ${id} inside a set object at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}) standing at (${c.x.toFixed(2)}, ${c.z.toFixed(2)})`);
      }
    }
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(r);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(r);
    const box = project([c.clone().add(right).add(up), c.clone().sub(right).add(up), c.clone().add(right).sub(up), c.clone().sub(right).sub(up)], camera);
    if (!box) return;
    const inFrame = area(overlap(box, FRAME));
    if (inFrame <= 0) return; // not in this shot
    const centre = c.clone().project(camera);
    const centreIn = Math.abs(centre.x) <= 1 && Math.abs(centre.y) <= 1;
    // A close-up may crop the top of a big head; a face is cut when its centre leaves or a third of it is gone.
    const big = box.y1 - box.y0 > 0.8;
    const out = 1 - inFrame / area(box);
    const faceCut = !centreIn || (!big && out > 0.35);
    if (faceCut) say(`face of ${id} cut by the frame edge (${Math.round(out * 100)}% outside)`);
    if (centreIn && centre.x > CAPTION.x0 && centre.x < CAPTION.x1 && centre.y > CAPTION.y0 && centre.y < CAPTION.y1) say(`face of ${id} under the captions`);
    if (centreIn && hidden(c, scene, camera, obj, r)) say(`face of ${id} hidden behind the set`);
    // The hat is part of the head: with the face in, any of the hat outside the frame is a cut (a close-up's big head
    // may still crop it).
    if (faceCut || big) return;
    let hat: Box | null = null;
    const card = opts.card?.current;
    if (card && opts.hat) {
      const hb = opts.hat;
      const pts = [
        [hb.x0, hb.y0],
        [hb.x1, hb.y0],
        [hb.x0, hb.y1],
        [hb.x1, hb.y1],
      ].map(([x, y]) => card.localToWorld(new THREE.Vector3(x, (opts.headOnCard ?? HEAD_Y_M) + y, 0)));
      hat = project(pts, camera);
    }
    const over = overlayHats(scene, id, c, r);
    if (over) hat = union(hat, project(corners8(over), camera));
    if (!hat) return;
    const hatOut = 1 - area(overlap(hat, FRAME)) / Math.max(1e-9, area(hat));
    if (hatOut > 0.1) say(`hat of ${id} cut by the frame edge (${pct(hatOut)}% outside)`);
  });
};

// After a puppet's cut-out is rasterised: any drawn pixel on the canvas's top or side edge means the drawing ran
// past the card and is cut off in a hard line (a lifted or stretched puppet whose card did not grow).
export const auditCardEdges = (canvas: HTMLCanvasElement, id: string) => {
  if (!auditing()) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const d = ctx.getImageData(0, 0, w, h).data; // one readback (several small ones make Chrome warn)
  const solid = (x: number, y: number, cw: number, ch: number) => {
    for (let yy = y; yy < y + ch; yy++) for (let xx = x; xx < x + cw; xx++) if (d[(yy * w + xx) * 4 + 3] > 40) return true;
    return false;
  };
  if (solid(0, 0, w, 1)) say(`card of ${id} cuts the drawing at the top (head or hat sliced off)`);
  if (solid(0, 0, 1, h - 2) || solid(w - 1, 0, 1, h - 2)) say(`card of ${id} cuts the drawing at the side`);
};

// ---------- crowds: instanced figures ----------

// Where an instanced figure's head (with its hat or bonnet) is, in the instance's own space, or null when the mesh is
// not a figure. In order:
// - `userData.heads` on the InstancedMesh: { y, r, top? } (head centre height, radius, top of the hat), or false;
// - a full SphereGeometry of 6-30 cm radius whose parent also holds an instanced body with as many instances (a head
//   instanced on its own, as the theatre audiences are): the head, widened 20 % for hair and bonnets;
// - one merged figure 1-2.6 m tall with vertex colours (a soldier): the skin-coloured part near its axis in its upper
//   half is the face, everything on the axis above it the hat.
type CrowdHead = { box: THREE.Box3 };
const HEADS = new WeakMap<THREE.BufferGeometry, CrowdHead | null>();
const skinLike = (r: number, g: number, b: number) => r > 0.35 && g / r > 0.45 && g / r < 0.85 && b / r > 0.22 && b / r < 0.72;
const crowdHead = (mesh: THREE.InstancedMesh): CrowdHead | null => {
  const tag = mesh.userData.heads as false | { y: number; r: number; top?: number } | undefined;
  if (tag === false) return null;
  if (tag) return { box: new THREE.Box3(new THREE.Vector3(-tag.r, tag.y - tag.r, -tag.r), new THREE.Vector3(tag.r, tag.top ?? tag.y + tag.r, tag.r)) };
  const geo = mesh.geometry as THREE.BufferGeometry & { parameters?: Record<string, number> };
  if (HEADS.has(geo)) {
    const h = HEADS.get(geo)!;
    // the sphere kind depends on the siblings, checked below
    if (!h || geo.type !== "SphereGeometry") return h;
  }
  let found: CrowdHead | null = null;
  if (geo.type === "SphereGeometry") {
    const p = geo.parameters ?? {};
    const full = (p.phiLength ?? 7) > 6.2 && (p.thetaLength ?? 4) > 3.1 && (p.thetaStart ?? 0) < 0.01;
    if (full && p.radius >= 0.06 && p.radius <= 0.3 && mesh.count >= 3) {
      const body = mesh.parent?.children.some((o) => {
        const im = o as THREE.InstancedMesh;
        if (!im.isInstancedMesh || im === mesh || im.count !== mesh.count) return false;
        if (!im.geometry.boundingBox) im.geometry.computeBoundingBox();
        const b = im.geometry.boundingBox!;
        return b.max.y - b.min.y > 3 * p.radius;
      });
      const r = p.radius * 1.2;
      if (body) found = { box: new THREE.Box3(new THREE.Vector3(-r, -r, -r), new THREE.Vector3(r, r, r)) };
    }
    HEADS.set(geo, found);
    return found;
  }
  const col = geo.getAttribute("color");
  const pos = geo.getAttribute("position");
  if (col && pos) {
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    // Standing on its origin (the legs may be separate meshes, so the body need not reach y = 0).
    const H = bb.max.y;
    const wide = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    if (H >= 1.0 && H <= 2.6 && bb.min.y > -0.15 && bb.min.y < 0.6 * H && wide >= 0.2 && wide <= 0.9 * H) {
      const face = new THREE.Box3();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (y > 0.55 * H && Math.hypot(x, z) < 0.2 && skinLike(col.getX(i), col.getY(i), col.getZ(i))) face.expandByPoint(new THREE.Vector3(x, y, z));
      }
      const fs = face.getSize(new THREE.Vector3());
      if (!face.isEmpty() && fs.y > 0.1 && fs.y < 0.5) {
        let top = face.max.y;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          if (y > face.max.y && Math.hypot(x - (face.min.x + face.max.x) / 2, z - (face.min.z + face.max.z) / 2) < 0.2) top = Math.max(top, y);
        }
        found = { box: new THREE.Box3(face.min.clone(), new THREE.Vector3(face.max.x, top, face.max.z)) };
      }
    }
  }
  HEADS.set(geo, found);
  return found;
};

const lum = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

// Heads of one crowd cut by the frame edge: one line for the crowd (the worst head, and how many), so a block of
// forty soldiers along the bottom edge is one finding. Heads wholly out, wholly hidden behind something, or sunk in
// deep shadow (instance colour near black, as the theatre audience darkens heads at the frame edge) are fine.
const auditCrowd = (mesh: THREE.InstancedMesh, head: CrowdHead, camera: THREE.Camera, scene: THREE.Scene) => {
  const mat = mesh.material as THREE.MeshToonMaterial;
  if (!mat || Array.isArray(mat) || mat.side === THREE.BackSide || mat.depthWrite === false || (mat.transparent && mat.opacity < 0.5)) return;
  const base = (mat.color ?? new THREE.Color(1, 1, 1)).clone();
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  const corners = corners8(head.box);
  const cut: { out: number; at: THREE.Vector3; r: number }[] = [];
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m);
    m.premultiply(mesh.matrixWorld);
    const sc = new THREE.Vector3().setFromMatrixScale(m);
    if (Math.max(sc.x, sc.y, sc.z) < 1e-4) continue;
    const box = project(corners.map((p) => p.clone().applyMatrix4(m)), camera);
    if (!box || box.y1 - box.y0 < 0.012) continue;
    const inFrame = area(overlap(box, FRAME));
    if (inFrame <= 0) continue;
    const out = 1 - inFrame / area(box);
    if (out < 0.1) continue;
    if (mesh.instanceColor) {
      mesh.getColorAt(i, col);
      if (lum(col.multiply(base)) < 0.05) continue;
    }
    const at = head.box.getCenter(new THREE.Vector3()).applyMatrix4(m);
    cut.push({ out, at, r: (head.box.max.y - head.box.min.y) * 0.5 * Math.max(sc.x, sc.y, sc.z) });
  }
  if (!cut.length) return;
  cut.sort((a, b) => b.out - a.out);
  // Look past heads hidden behind something (the ray stops short of the head, so its own hair does not count).
  let shown = 0;
  let worst: (typeof cut)[number] | null = null;
  for (const h of cut.slice(0, 12)) {
    if (hidden(h.at, scene, camera, mesh, h.r * 1.3)) continue;
    shown++;
    worst = worst ?? h;
  }
  if (!worst) return;
  const more = cut.length > 12 ? `${shown}+` : `${shown}`;
  say(`face of a crowd figure at ${fmt(worst.at)} cut by the frame edge (${pct(worst.out)}% outside; ${more} cut heads in this crowd)`);
};

// ---------- the scene: crowds and words outside the kit signs ----------

// One per canvas that draws the set (Stage mounts it): instanced crowds (auditCrowd) and words on any canvas texture
// that no useSignAudit sign owns (a shop sign, a board, a painted drop), checked like a sign: cut by the frame edge
// (any letter out), under the captions, hidden behind the set.
const auditWords = (mesh: THREE.Mesh, camera: THREE.Camera, scene: THREE.Scene) => {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
  if (!mat || (mat.transparent && mat.opacity < 0.3)) return;
  const words = wordsOn(mesh);
  if (!words.length) return;
  const seen = words
    .map((w) => ({ w, s: wordOnScreen(w, camera, mat.side === THREE.DoubleSide) }))
    .filter((x): x is { w: Word; s: NonNullable<ReturnType<typeof wordOnScreen>> } => !!x.s);
  for (const { w, s } of seen.sort((a, b) => b.s.out - a.s.out)) {
    if (s.out > TEXT_OUT) {
      if (!hidden(visiblePoint(w, s.box), scene, camera, mesh, 0.02)) {
        say(`sign "${w.text}" cut by the frame edge (${pct(s.out)}% of its text outside)`);
        return; // one line per mesh
      }
      continue;
    }
    const under = area(overlap(overlap(s.box, FRAME), CAPTION)) / s.inFrame;
    if (under > 0.3) {
      say(`sign "${w.text}" under the captions (${pct(under)}%)`);
      return;
    }
    const mid = w.corners[0].clone().add(w.corners[3]).multiplyScalar(0.5);
    if (s.box.y1 - s.box.y0 > 0.03 && hidden(mid, scene, camera, mesh, 0.02)) {
      say(`sign "${w.text}" hidden behind the set`);
      return;
    }
  }
};

// ---------- z depth: z-fighting and the depth layers ----------

// One look through the frame on a grid of rays (DEPTH_GRID across, x 16/9 down): per ray, the first two solid surfaces.
// Transparent, depthWrite-off, polygonOffset and back-side (ink hull, sky dome) materials and puppet cards are skipped,
// and so are instanced meshes of more than 64 (grass, rye, rain: thousands of instances made the look time out).
const DEPTH_GRID = 14;
type Hit = { d: number; obj: THREE.Object3D; n: THREE.Vector3; p: THREE.Vector3 };
const solidMat = (m: THREE.Material | THREE.Material[] | undefined) => {
  const mm = Array.isArray(m) ? m[0] : m;
  return !!mm && !mm.transparent && mm.depthWrite !== false && !mm.polygonOffset && mm.side !== THREE.BackSide && mm.visible !== false;
};
const depthLook = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
  const ray = new THREE.Raycaster();
  const solid: THREE.Object3D[] = [];
  const collect = (o: THREE.Object3D) => {
    if (!o.visible || o.userData.puppet || o.userData.audit === false) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && solidMat(m.material) && !((o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.InstancedMesh).count > 64)) solid.push(o);
    for (const c of o.children) collect(c);
  };
  collect(scene);
  const rows = Math.round((DEPTH_GRID * 16) / 9);
  const out: Hit[][] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < DEPTH_GRID; i++) {
      // jittered off the exact grid so a seam between two boxes is not hit edge-on every time
      const x = -1 + (2 * (i + 0.5)) / DEPTH_GRID + 0.013;
      const y = -1 + (2 * (j + 0.5)) / rows + 0.009;
      ray.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits: Hit[] = [];
      for (const h of ray.intersectObjects(solid, false)) {
        if (!h.face) continue;
        const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
        hits.push({ d: h.distance, obj: h.object, n, p: h.point.clone() });
        if (hits.length >= 2) break;
      }
      out.push(hits);
    }
  return out;
};

// Two objects count as one when they share a small parent group (one prop's pieces, up to 8) or sit inside one model
// (a BlenderModel's own parts). A set's big container or the scene itself does not make them one.
const sameObject = (a: THREE.Object3D, b: THREE.Object3D) => {
  const p = a.parent;
  if (p && p === b.parent && !(p as THREE.Scene).isScene && p.children.length <= 8) return true;
  const model = (o: THREE.Object3D | null) => {
    for (; o; o = o.parent) if (o.userData.model) return o;
    return null;
  };
  const ma = model(a);
  return !!ma && ma === model(b);
};
const describe = (o: THREE.Object3D) => {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.name && !p.name.endsWith("_ink")) return p.name;
  const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry & { parameters?: Record<string, number> };
  const prm = g?.parameters ?? {};
  const dims = ["width", "height", "depth", "radius"].filter((k) => typeof prm[k] === "number").map((k) => prm[k].toFixed(2));
  const at = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
  return `${(g?.type ?? "mesh").replace("Geometry", "").toLowerCase()}${dims.length ? " " + dims.join("x") : ""} at ${fmt(at)}`;
};

// Two surfaces of one colour and pattern flicker invisibly (the crossing bars of one shelf frame).
const looksSame = (a: THREE.Object3D, b: THREE.Object3D) => {
  const ma = (a as THREE.Mesh).material as THREE.MeshToonMaterial;
  const mb = (b as THREE.Mesh).material as THREE.MeshToonMaterial;
  if (Array.isArray(ma) || Array.isArray(mb)) return false;
  if (ma === mb) return true;
  return !!ma.color && !!mb.color && ma.color.equals(mb.color) && (ma.map?.uuid ?? "") === (mb.map?.uuid ?? "") && !(a as THREE.InstancedMesh).instanceColor && !(b as THREE.InstancedMesh).instanceColor;
};

// Z1: two different objects whose surfaces meet a ray within the depth buffer's resolution there, with near-parallel
// faces (a sign flat on its wall, a floor patch on the floor, two boxes sharing a face) flicker from frame to frame.
// Each pair is reported once per shot.
const fought = new Set<string>();
const auditZFight = (look: Hit[][], camera: THREE.PerspectiveCamera, shot: number) => {
  const near = Math.max(1e-3, camera.near);
  const pairs = new Map<string, { a: THREE.Object3D; b: THREE.Object3D; p: THREE.Vector3; n: number }>();
  for (const hits of look) {
    if (hits.length < 2) continue;
    const [a, b] = hits;
    // what a 24-bit depth buffer can tell apart at this distance, with room for interpolation error
    const eps = Math.max(2e-4, (20 * a.d * a.d) / (near * 2 ** 24));
    if (b.d - a.d > eps || a.obj === b.obj || Math.abs(a.n.dot(b.n)) < 0.998 || sameObject(a.obj, b.obj) || looksSame(a.obj, b.obj)) continue;
    const key = [a.obj.uuid, b.obj.uuid].sort().join("|");
    const e = pairs.get(key);
    if (e) e.n++;
    else pairs.set(key, { a: a.obj, b: b.obj, p: a.p, n: 1 });
  }
  for (const [key, e] of pairs) {
    if (e.n < 2) continue; // a single ray is a seam or two curved surfaces crossing, not a shared face
    const k = `${shot}:${key}`;
    if (fought.has(k)) continue;
    fought.add(k);
    say(`z-fighting: "${describe(e.a)}" and "${describe(e.b)}" coplanar at ${fmt(e.p)} (${e.n} of ${look.length} rays)`);
  }
};

// Z2: the depth layers against the subject's distance `focus` (Stage's focus: the nearest puppet's head, else the aim).
// Background = rays that reach past 1.6 x focus (or the sky); foreground = upright surfaces nearer than 0.5 x focus
// (a floor running toward the lens is not a foreground object). No foreground is fine; a frame with no background, or a
// foreground over a third of it, is reported.
const auditLayers = (look: Hit[][], focus: number) => {
  if (!(focus > 0.2)) return;
  let far = 0;
  let front = 0;
  for (const hits of look) {
    const h = hits[0];
    if (!h || h.d > 1.6 * focus) far++;
    else if (h.d < 0.5 * focus && Math.abs(h.n.y) < 0.85) front++;
  }
  const n = look.length;
  if (far / n < 0.03) say(`depth: no background layer (nothing beyond ${(1.6 * focus).toFixed(1)} m, 1.6 x the subject's ${focus.toFixed(1)} m)`);
  if (front / n > 0.33) say(`depth: foreground fills ${pct(front / n)}% of the frame`);
};

export const useSceneAudit = (opts: { focus?: number; shot?: number } = {}) => {
  useFrame(({ camera, scene }) => {
    if (!auditing()) return;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const look = depthLook(scene, camera as THREE.PerspectiveCamera);
      auditZFight(look, camera as THREE.PerspectiveCamera, opts.shot ?? 0);
      if (opts.focus !== undefined) auditLayers(look, opts.focus);
    }
    const visit = (o: THREE.Object3D) => {
      if (!o.visible || o.userData.audit === false || o.userData.puppet || o.userData.signAudit) return;
      const im = o as THREE.InstancedMesh;
      if (im.isInstancedMesh) {
        const h = crowdHead(im);
        if (h) auditCrowd(im, h, camera, scene);
      } else if ((o as THREE.Mesh).isMesh) auditWords(o as THREE.Mesh, camera, scene);
      for (const c of o.children) visit(c);
    };
    visit(scene);
  });
};
// `focus`: the subject's distance for the depth layers (left out on a canvas that draws only the foreground).
export const SceneAudit: React.FC<{ focus?: number; shot?: number }> = (p) => {
  useSceneAudit(p);
  return null;
};

// ---------- heads of models (BlenderModel, sand3d) ----------

// A model's head: the nodes named `head` or `skull` (any case; the outermost when they nest, as a joint over its group)
// with their sub-trees and the head parts beside them (ears, eyes, muzzle, nostrils, jaw, horns...), or the nodes
// named in BlenderModel `heads`. Each part's own box, so a tilted head is not blown up to a world box.
const HEAD_NAME = /^(head|skull)$/i;
const HEAD_PART = /^(ear|ears|earin|eye|pupil|glint|brow|muzzle|snout|nose|nostril|noseband|jaw|mouth|tongue|tooth|toothu|beak|horn|antler|blaze|whisker|cheekstrap)(_.*|\d.*)?$/i;
export const modelHeadParts = (root: THREE.Object3D, names?: string[]): THREE.Mesh[][] => {
  const picked: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (names ? names.includes(o.name) : HEAD_NAME.test(o.name)) picked.push(o);
  });
  const tops = picked.filter((o) => {
    for (let p = o.parent; p; p = p.parent) if (picked.includes(p)) return false;
    return true;
  });
  return tops.map((t) => {
    const parts = [t, ...(names ? [] : (t.parent?.children ?? []).filter((s) => s !== t && HEAD_PART.test(s.name)))];
    const meshes: THREE.Mesh[] = [];
    for (const p of parts) p.traverse((o) => (o as THREE.Mesh).isMesh && !o.userData.ink && meshes.push(o as THREE.Mesh));
    return meshes;
  });
};

// For a BlenderModel whose head parts are `heads()` (modelHeadParts): a head cut by the frame edge, under the captions
// or hidden behind the set, like a puppet's face. `name` is the model file.
export const useModelAudit = (ref: RefObject<THREE.Object3D | null>, heads: () => THREE.Mesh[][], name: string) => {
  useFrame(({ camera, scene }) => {
    const obj = ref.current;
    if (!obj || !auditing() || optedOut(obj)) return;
    obj.updateWorldMatrix(true, true);
    for (const parts of heads()) {
      let box: Box | null = null;
      let behind = false;
      const world = new THREE.Box3();
      for (const mesh of parts) {
        if (!mesh.visible) continue;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const pts = corners8(mesh.geometry.boundingBox!).map((p) => p.applyMatrix4(mesh.matrixWorld));
        pts.forEach((p) => world.expandByPoint(p));
        const b = project(pts, camera);
        if (!b) behind = true;
        box = union(box, b);
      }
      if (!box || behind || box.y1 - box.y0 < 0.02) continue;
      const inFrame = area(overlap(box, FRAME));
      if (inFrame <= 0) continue;
      const out = 1 - inFrame / area(box);
      const c = world.getCenter(new THREE.Vector3());
      const centre = c.clone().project(camera);
      const centreIn = Math.abs(centre.x) <= 1 && Math.abs(centre.y) <= 1;
      const big = box.y1 - box.y0 > 0.8;
      const r = world.getSize(new THREE.Vector3()).length() * 0.35;
      if (!centreIn || (!big && out > 0.1)) {
        if (!hidden(c, scene, camera, obj, r)) say(`head of model "${name}" cut by the frame edge (${pct(out)}% outside)`);
        continue;
      }
      if (centre.x > CAPTION.x0 && centre.x < CAPTION.x1 && centre.y > CAPTION.y0 && centre.y < CAPTION.y1) say(`head of model "${name}" under the captions`);
    }
  });
};
