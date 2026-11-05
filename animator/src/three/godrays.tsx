import React, { useEffect, useMemo } from "react";
import * as THREE from "three";

// Sunbeams (god rays) through a window in a wall facing +z: one slanted shaft of light per pane, from the glass down
// to the floor, glowing where the window is and fading toward the floor, plus the panes' bright patch where they
// land and dust motes hanging in the light. Additive and see-through: the shafts lighten whatever stands in them.
// `sun` is the direction the light travels (into the room, downward: y < 0).

type Vec3 = [number, number, number];

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export type Pane = [Vec3, Vec3, Vec3, Vec3]; // corners on the glass: bottom-left, bottom-right, top-right, top-left

// The panes of a window centred at `center` (on the wall face), `size` [w, h], split into `panes` [columns, rows]
// by bars `bar` wide.
export const windowPanes = (center: Vec3, size: [number, number], panes: [number, number], bar = 0.05): Pane[] => {
  const [cx, cy, cz] = center;
  const [w, h] = size;
  const [nx, ny] = panes;
  const pw = (w - bar * (nx - 1)) / nx;
  const ph = (h - bar * (ny - 1)) / ny;
  const out: Pane[] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const x0 = cx - w / 2 + i * (pw + bar);
      const y0 = cy - h / 2 + j * (ph + bar);
      out.push([[x0, y0, cz], [x0 + pw, y0, cz], [x0 + pw, y0 + ph, cz], [x0, y0 + ph, cz]]);
    }
  return out;
};

// Where a point on the glass lands on the floor along the sun.
const toFloor = (p: Vec3, sun: Vec3, floor: number): Vec3 => {
  const t = (p[1] - floor) / -sun[1];
  return [p[0] + sun[0] * t, floor, p[2] + sun[2] * t];
};

// Grow a pane about its centre (a wider, fainter shaft round the core softens its edges).
const grow = (pane: Pane, k: number): Pane => {
  const c = [0, 1, 2].map((j) => pane.reduce((s, p) => s + p[j], 0) / 4);
  return pane.map((p) => p.map((v, j) => c[j] + (v - c[j]) * k) as Vec3) as Pane;
};

// The four side walls of the shaft from one pane to the floor, coloured bright at the glass and dim at the floor.
const shaftGeometry = (panes: Pane[], sun: Vec3, floor: number, color: THREE.Color, near: number, far: number) => {
  const pos: number[] = [];
  const col: number[] = [];
  const a = color.clone().multiplyScalar(near);
  const b = color.clone().multiplyScalar(far);
  for (const pane of panes) {
    const down = pane.map((p) => toFloor(p, sun, floor));
    for (let e = 0; e < 4; e++) {
      const [p, q] = [pane[e], pane[(e + 1) % 4]];
      const [pf, qf] = [down[e], down[(e + 1) % 4]];
      for (const [v, c] of [[p, a], [q, a], [qf, b], [p, a], [qf, b], [pf, b]] as [Vec3, THREE.Color][]) {
        pos.push(...v);
        col.push(c.r, c.g, c.b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
};

// A level surface the sun also falls on (a table top): height `y`, extent `x` and `z` [min, max].
export type SunTop = { y: number; x: [number, number]; z: [number, number] };

// Clip a polygon on a level plane to an x/z rectangle (Sutherland-Hodgman, one side at a time).
const clipToRect = (poly: Vec3[], { x, z }: SunTop) => {
  const sides: [number, number, number][] = [[0, x[0], 1], [0, x[1], -1], [2, z[0], 1], [2, z[1], -1]]; // axis, edge, inside sign
  for (const [j, edge, sign] of sides) {
    const out: Vec3[] = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const [pin, qin] = [(p[j] - edge) * sign >= 0, (q[j] - edge) * sign >= 0];
      if (pin) out.push(p);
      if (pin !== qin) {
        const t = (edge - p[j]) / (q[j] - p[j]);
        out.push(p.map((v, k) => v + (q[k] - v) * t) as Vec3);
      }
    });
    poly = out;
    if (!poly.length) break;
  }
  return poly;
};

// The panes' light where it lands: one patch per pane on the floor and on each top (clipped to its edges). The
// floor patch is drawn whole; a top hides the part of it underneath from a camera above the top.
const patchGeometry = (panes: Pane[], sun: Vec3, floor: number, tops: SunTop[]) => {
  const pos: number[] = [];
  for (const pane of panes) {
    const d = pane.map((p) => toFloor(p, sun, floor + 0.004));
    for (const k of [0, 1, 2, 0, 2, 3]) pos.push(...d[k]);
    for (const top of tops) {
      const poly = clipToRect(pane.map((p) => toFloor(p, sun, top.y + 0.004)), top);
      for (let k = 1; k + 1 < poly.length; k++) pos.push(...poly[0], ...poly[k], ...poly[k + 1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
};

export const GodRays: React.FC<{
  center: Vec3; // the window's centre on the wall face
  size: [number, number];
  panes?: [number, number];
  bar?: number;
  sun: Vec3;
  floor?: number;
  color?: string;
  strength?: number; // brightness of the shafts at the glass
  patch?: number; // opacity of the patches on the floor (0: none)
  tops?: SunTop[]; // level surfaces in the light that get their own patch (a table top)
  motes?: number;
  seed?: number;
  frame?: number; // the motes drift slowly down the shafts and sway with it (0: still)
}> = ({ center, size, panes = [2, 2], bar = 0.06, sun: dir, floor = 0, color = "#ffe2a6", strength = 0.32, patch = 0.42, motes = 70, seed = 1, tops = [], frame = 0 }) => {
  const sun = useMemo(() => new THREE.Vector3(...dir).normalize().toArray() as Vec3, [dir[0], dir[1], dir[2]]);
  const geo = useMemo(() => {
    const ps = windowPanes(center, size, panes, bar);
    const c = new THREE.Color(color);
    return {
      core: shaftGeometry(ps, sun, floor, c, strength, strength * 0.12),
      soft: shaftGeometry(ps.map((p) => grow(p, 1.2)), sun, floor, c, strength * 0.3, 0),
      patch: patchGeometry(ps, sun, floor, tops),
      panes: ps,
    };
  }, [center[0], center[1], center[2], size[0], size[1], panes[0], panes[1], bar, sun, floor, color, strength, JSON.stringify(tops)]);
  // Motes: specks scattered through the shafts, each sinking slowly along its shaft (wrapping round to the top) and
  // swaying on its own rhythm, so a moving shot shows the air in the light.
  const dots = useMemo(
    () => new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), motes),
    [motes, color],
  );
  const o = new THREE.Object3D();
  for (let i = 0; i < motes; i++) {
    const k = seed * 31 + i;
    const pane = geo.panes[Math.floor(rand(k) * geo.panes.length)];
    const [u, v] = [rand(k + 0.1), rand(k + 0.2)];
    const t = 0.08 + ((rand(k + 0.3) * 0.8 + frame * 0.0008 * (0.5 + rand(k + 0.5))) % 0.8);
    const p = [0, 1, 2].map((j) => pane[0][j] + (pane[1][j] - pane[0][j]) * u + (pane[3][j] - pane[0][j]) * v) as Vec3;
    const f = toFloor(p, sun, floor);
    const sway = 0.012 * Math.sin(frame * 0.05 + k * 2.3);
    o.position.set(...([0, 1, 2].map((j) => p[j] + (f[j] - p[j]) * t + (j === 0 ? sway : j === 1 ? sway * 0.6 : 0)) as Vec3));
    o.scale.setScalar(0.004 + 0.007 * rand(k + 0.4));
    o.updateMatrix();
    dots.setMatrixAt(i, o.matrix);
  }
  dots.instanceMatrix.needsUpdate = true;
  useEffect(
    () => () => {
      for (const g of [geo.core, geo.soft, geo.patch]) g.dispose();
    },
    [geo],
  );
  useEffect(
    () => () => {
      dots.geometry.dispose();
      (dots.material as THREE.Material).dispose();
      dots.dispose();
    },
    [dots],
  );
  const beam = (
    <meshBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
  );
  // `ghost` (collide ignores the light) and `noInk` (the post chain's ink skips it).
  return (
    <group userData={{ ghost: true }}>
      <mesh geometry={geo.soft} userData={{ noInk: true }}>
        {beam}
      </mesh>
      <mesh geometry={geo.core} userData={{ noInk: true }}>
        {beam}
      </mesh>
      {patch > 0 && (
        <mesh geometry={geo.patch} userData={{ noInk: true }}>
          <meshBasicMaterial color={color} transparent opacity={patch} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
      {motes > 0 && <primitive object={dots} />}
    </group>
  );
};
