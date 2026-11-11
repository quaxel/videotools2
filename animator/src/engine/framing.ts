import * as THREE from "three";
import type { PuppetPlacement } from "../puppet/PuppetBillboard";
import { drawnHead } from "../puppet/Puppet";
import type { CameraShot } from "./stage";

// Never a half head: Stage runs every shot's camera through keepHeadsInFrame. Any puppet whose head is partly in
// the frame (cut by an edge) gets the camera panned just enough to bring the whole head in, with a margin; when
// heads at opposite edges cannot both fit, the lens widens a little (up to ~25 %) and then the camera steps back (up
// to ~3x); if they still cannot, the heads
// farthest from the centre are panned wholly out of the frame instead (a whole head or none, never half). Heads
// wholly out of the shot are left out (a character who is meant to be off-screen stays off-screen), as are
// back-view puppets (over-the-shoulder framing is meant to crop) and placements marked `crop: true`.

const K = 1.3 / 1060; // metres per puppet unit
const HEAD_Y = 800 * K;
const HEAD_R = 0.3; // head plus hair or hat brim, metres
const MARGIN = 0.92; // keep heads inside this share of the frame (NDC)
const TOP = 0.9; // and a little more room at the top for hats

type Head = { c: THREE.Vector3; r: number };

const toCamera = (shot: CameraShot, aspect: number) => {
  const cam = new THREE.PerspectiveCamera(shot.fov, aspect, 0.05, 500);
  cam.position.set(...shot.position);
  cam.lookAt(...shot.target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};

// Where a head lands on screen (NDC centre) and its half-size there.
const onScreen = (cam: THREE.PerspectiveCamera, h: Head) => {
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
  const c = h.c.clone().project(cam);
  const rx = Math.abs(h.c.clone().addScaledVector(right, h.r).project(cam).x - c.x);
  const ry = Math.abs(h.c.clone().addScaledVector(up, h.r).project(cam).y - c.y);
  const behind = h.c.clone().applyMatrix4(cam.matrixWorldInverse).z > -0.05;
  return { x: c.x, y: c.y, rx, ry, behind };
};

// The content shift (NDC) along one axis that fits every kept head in [lo, hi] and pushes every dropped head
// wholly out past the edge it is nearest; null when that is impossible.
const fit = (spans: { c: number; r: number; drop?: boolean; main?: boolean }[], lo: number, hi: number): number | null => {
  let a = -Infinity;
  let b = Infinity;
  for (const s of spans) {
    if (s.drop) {
      if (s.c >= 0) a = Math.max(a, 1 - (s.c - s.r));
      else b = Math.min(b, -1 - (s.c + s.r));
      continue;
    }
    if (2 * s.r > hi - lo) {
      if (s.main) continue; // the subject of an extreme close-up may fill the frame
      if (s.c >= 0) a = Math.max(a, 1 - (s.c - s.r)); // anyone else that big must be wholly out
      else b = Math.min(b, -1 - (s.c + s.r));
      continue;
    }
    a = Math.max(a, lo - (s.c - s.r));
    b = Math.min(b, hi - (s.c + s.r));
  }
  if (a > b) return null;
  return Math.min(Math.max(0, a), b);
};

export const keepHeadsInFrame = (shot: CameraShot, aspect: number, puppets: PuppetPlacement[]): CameraShot => {
  const heads: Head[] = puppets
    .filter((p) => !p.crop && p.pose.view !== "back")
    .map((p) => {
      // The head as drawn (tipped by `lie`, lifted by `air`), carried along the card's right (it faces the camera) and
      // raised by `rise`; a moon suit's helmet is bigger than a head.
      const d = drawnHead(p.pose, p.look);
      const fx = shot.target[0] - shot.position[0];
      const fz = shot.target[2] - shot.position[2];
      const n = Math.hypot(fx, fz) || 1;
      const side = d.x * K;
      return { c: new THREE.Vector3(p.at[0] - (fz / n) * side, -d.y * K + (p.pose.rise ?? 0), p.at[1] + (fx / n) * side), r: p.look.space ? HEAD_R * 1.3 : HEAD_R };
    });
  if (!heads.length) return shot;
  let out = shot;
  for (let pass = 0; pass < 20; pass++) {
    const cam = toCamera(out, aspect);
    // The heads that are partly in this frame (wholly outside ones are not in the shot).
    const seen = heads
      .map((h) => onScreen(cam, h))
      .filter((s) => !s.behind && s.x + s.rx > -1 && s.x - s.rx < 1 && s.y + s.ry > -1 && s.y - s.ry < 1);
    const cut = seen.some((s) => s.x - s.rx < -MARGIN || s.x + s.rx > MARGIN || s.y + s.ry > TOP || s.y - s.ry < -MARGIN);
    if (!cut) return out;
    const main = seen.reduce((m, s, i) => (Math.hypot(s.x, s.y) < Math.hypot(seen[m].x, seen[m].y) ? i : m), 0);
    let sx = fit(seen.map((s, i) => ({ c: s.x, r: s.rx, main: i === main })), -MARGIN, MARGIN);
    let sy = fit(seen.map((s, i) => ({ c: s.y, r: s.ry, main: i === main })), -MARGIN, TOP);
    if ((sx === null || sy === null) && out.fov <= shot.fov * 1.25) {
      // Heads at both edges: open the lens a little and look again.
      out = { ...out, fov: out.fov * 1.08 };
      continue;
    }
    const tgt = new THREE.Vector3(...out.target);
    const away = new THREE.Vector3(...out.position).sub(tgt);
    const dist0 = new THREE.Vector3(...shot.position).distanceTo(new THREE.Vector3(...shot.target));
    if ((sx === null || sy === null) && away.length() < dist0 * 3) {
      // Then step the camera back along its line of sight.
      const p = tgt.addScaledVector(away, 1.18);
      out = { ...out, position: [p.x, p.y, p.z] };
      continue;
    }
    if (sx === null || sy === null) {
      // Still no room: keep the heads nearest the centre whole and push the rest out, farthest first.
      const order = seen.map((s, i) => ({ i, d: Math.hypot(s.x, s.y) })).sort((p, q) => q.d - p.d);
      const drop = new Set<number>();
      for (const { i } of order) {
        drop.add(i);
        sx = fit(seen.map((s, k) => ({ c: s.x, r: s.rx, drop: drop.has(k), main: k === main })), -MARGIN, MARGIN);
        sy = fit(seen.map((s, k) => ({ c: s.y, r: s.ry, drop: drop.has(k) && Math.abs(s.y) > Math.abs(s.x), main: k === main })), -MARGIN, TOP);
        if (sx !== null && sy !== null) break;
        if (drop.size >= seen.length - 1) break;
      }
      if (sx === null || sy === null) return out;
    }
    // Pan: moving the aim by d * tan(half angle) shifts the picture one NDC unit.
    const d = new THREE.Vector3(...out.target).distanceTo(new THREE.Vector3(...out.position));
    const vHalf = Math.tan((out.fov * Math.PI) / 360);
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const t = new THREE.Vector3(...out.target)
      .addScaledVector(right, -sx * d * vHalf * aspect)
      .addScaledVector(up, -sy * d * vHalf);
    out = { ...out, target: [t.x, t.y, t.z] };
  }
  return out;
};

// A framing correction as numbers: [position dx, dy, dz, target dx, dy, dz, fov ratio].
export type FramingDelta = [number, number, number, number, number, number, number];
export const framingDelta = (from: CameraShot, to: CameraShot): FramingDelta => [
  to.position[0] - from.position[0],
  to.position[1] - from.position[1],
  to.position[2] - from.position[2],
  to.target[0] - from.target[0],
  to.target[1] - from.target[1],
  to.target[2] - from.target[2],
  to.fov / from.fov,
];
export const applyFramingDelta = (cam: CameraShot, d: FramingDelta): CameraShot => ({
  position: [cam.position[0] + d[0], cam.position[1] + d[1], cam.position[2] + d[2]],
  target: [cam.target[0] + d[3], cam.target[1] + d[4], cam.target[2] + d[5]],
  fov: cam.fov * d[6],
});
