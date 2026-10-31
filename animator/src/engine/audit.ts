import { RefObject } from "react";
import { getInputProps } from "remotion";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Framing audit for `pipeline.py stills`: when the render is started with the input prop `audit`, puppets,
// labels and screens measure where they land in the picture and log what a reviewer would flag: a face or a
// sign cut by the frame edge, under the caption band, or hidden behind a set piece. stills.mjs collects the
// "[framing]" lines per frame, and a puppet standing inside a set object. Normal renders skip all of it.

const auditing = () => (getInputProps() as { audit?: boolean }).audit === true;

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

const say = (msg: string) => console.log(`[framing] ${msg}`);

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

// For a flat sign of `w` x `h` metres centred on `ref`'s origin in its local XY plane.
export const useSignAudit = (ref: RefObject<THREE.Object3D | null>, w: number, h: number, name: string) => {
  useFrame(({ camera, scene }) => {
    const obj = ref.current;
    if (!obj || !auditing()) return;
    obj.updateWorldMatrix(true, false);
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
    if (inFrame / area(box) < 0.8) say(`sign "${label}" cut by the frame edge (${Math.round((1 - inFrame / area(box)) * 100)}% outside)`);
    const under = area(overlap(overlap(box, FRAME), CAPTION)) / inFrame;
    if (under > 0.3) say(`sign "${label}" under the captions (${Math.round(under * 100)}%)`);
    const centre = new THREE.Vector3().applyMatrix4(obj.matrixWorld);
    if (hidden(centre, scene, camera, obj, 0.02)) say(`sign "${label}" hidden behind the set`);
  });
};

// For a puppet whose head centre is at `head` (world) with radius `r`. A standing puppet (not `sit`) also
// reports when its body is inside a set object (walking through a counter, standing in a desk).
export const usePuppetAudit = (ref: RefObject<THREE.Object3D | null>, head: () => THREE.Vector3, r: number, id: string, sit = false) => {
  useFrame(({ camera, scene }) => {
    const obj = ref.current;
    if (!obj || !auditing()) return;
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
    if (!centreIn || (!big && out > 0.35)) say(`face of ${id} cut by the frame edge (${Math.round(out * 100)}% outside)`);
    if (centreIn && centre.x > CAPTION.x0 && centre.x < CAPTION.x1 && centre.y > CAPTION.y0 && centre.y < CAPTION.y1) say(`face of ${id} under the captions`);
    if (centreIn && hidden(c, scene, camera, obj, r)) say(`face of ${id} hidden behind the set`);
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
