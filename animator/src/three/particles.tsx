import { useThree } from "@react-three/fiber";
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { toonRamp } from "./toon";
import { rand } from "../engine/helpers";

// Particle effects as a pure function of the frame: every particle's birth, direction, speed, spin and colour come
// from its seed, its position from a closed-form flight (gravity with air drag), so any frame renders on its own.
// One instanced mesh per effect. Kinds:
//   confetti  paper flecks: shot up, flutter down slowly, tumble, then lie flat where they land
//   sparks    hot specks: fly fast, fall, cool from white to red and go out (bright enough for the bloom)
//   dust      soft puffs rolling out low along the ground from a landing, swelling and shrinking away
//   stars     cartoon impact stars: pop out round the hit, spin, shrink away (always turned to the camera)

type Vec3 = [number, number, number];
export type ParticleKind = "confetti" | "sparks" | "dust" | "stars";

const between = (i: number, [a, b]: [number, number]) => a + (b - a) * rand(i);

type Kind = {
  count: number;
  speed: [number, number]; // m/s at birth
  up: number; // 1: straight up in a narrow cone ... 0: flat ring along the ground ... -1: all round
  drag: number; // 1/s: how fast the air takes the birth speed away
  drift: Vec3; // m/s it settles to (terminal fall)
  life: [number, number]; // s (Infinity: stays once landed)
  size: [number, number]; // m
  colors: string[];
};
const KINDS: Record<ParticleKind, Kind> = {
  confetti: { count: 120, speed: [2.6, 4.6], up: 1, drag: 4, drift: [0, -0.75, 0], life: [Infinity, Infinity], size: [0.036, 0.052], colors: ["#e0262f", "#ffd23f", "#3fae5a", "#2f80ed", "#ff7ac8", "#ffffff"] },
  sparks: { count: 40, speed: [2.5, 6], up: -1, drag: 1.5, drift: [0, -6.5, 0], life: [0.25, 0.6], size: [0.01, 0.02], colors: [] },
  dust: { count: 14, speed: [0.5, 1.4], up: 0, drag: 3.5, drift: [0, 0.12, 0], life: [0.5, 0.9], size: [0.07, 0.14], colors: ["#b9a58a", "#cbb99e", "#a8957a"] },
  stars: { count: 6, speed: [1.2, 2.2], up: -1, drag: 3, drift: [0, -0.3, 0], life: [0.5, 0.8], size: [0.07, 0.11], colors: ["#ffd23f", "#fff1a8"] },
};

// Position t seconds after birth: linear air drag pulls the birth velocity toward the drift velocity.
const fly = (p0: Vec3, v0: Vec3, drift: Vec3, drag: number, t: number): Vec3 => {
  const e = (1 - Math.exp(-drag * t)) / drag;
  return [0, 1, 2].map((j) => p0[j] + drift[j] * t + (v0[j] - drift[j]) * e) as Vec3;
};
// First time the flight reaches the floor, or null if it is still above it at t (one rise, then a fall).
const landing = (p0: Vec3, v0: Vec3, drift: Vec3, drag: number, t: number, floor: number) => {
  if (fly(p0, v0, drift, drag, t)[1] > floor) return null;
  let [lo, hi] = [0, t];
  const apex = Math.max(0, Math.log(Math.max(1e-6, (v0[1] - drift[1]) / -drift[1] || 1e-6)) / drag);
  if (apex < t && fly(p0, v0, drift, drag, apex)[1] > floor) lo = apex;
  for (let k = 0; k < 24; k++) {
    const m = (lo + hi) / 2;
    if (fly(p0, v0, drift, drag, m)[1] > floor) lo = m;
    else hi = m;
  }
  return hi;
};

const HOT = [new THREE.Color("#ffffff"), new THREE.Color("#fff1a8"), new THREE.Color("#ffa62b"), new THREE.Color("#e8361a")];
// Spark colour by age 0..1, over white for the bloom (threshold 1.0) while it is hot.
const sparkColor = (age: number, c: THREE.Color) => {
  const x = Math.min(0.999, age) * (HOT.length - 1);
  c.copy(HOT[Math.floor(x)]).lerp(HOT[Math.floor(x) + 1], x - Math.floor(x));
  return c.multiplyScalar(3.2 - 2.4 * age);
};

const starShape = (inner: number) => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : 1;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
};

type Born = { at: Vec3; birth: number; seed: number }; // birth in seconds after the effect's frame 0

// The shared engine of Burst and Shower: places `born` particles of `kind` at `frame` (30 fps).
// `rain`: particles start from rest and fall until they land (no life limit); stars fall faster and pop out on landing.
const Particles: React.FC<{ kind: ParticleKind; born: Born[]; frame: number; size: number; speed: number; colors?: string[]; floor: number | null; spray?: Vec3; rain?: boolean }> = ({
  kind,
  born,
  frame,
  size,
  speed,
  colors,
  floor,
  spray,
  rain = false,
}) => {
  const k: Kind = rain ? { ...KINDS[kind], life: [Infinity, Infinity], drift: kind === "stars" ? [0, -1.1, 0] : KINDS[kind].drift } : KINDS[kind];
  const camera = useThree((s) => s.camera);
  const { mesh, ink } = useMemo(() => {
    const n = born.length;
    const geometry =
      kind === "confetti" ? new THREE.PlaneGeometry(1, 0.62) : kind === "stars" ? new THREE.ShapeGeometry(starShape(0.45)) : new THREE.IcosahedronGeometry(1, kind === "dust" ? 2 : 0);
    const material =
      kind === "sparks"
        ? new THREE.MeshBasicMaterial({ toneMapped: false })
        : kind === "stars"
          ? new THREE.MeshBasicMaterial()
          : new THREE.MeshToonMaterial({ gradientMap: toonRamp, side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(geometry, material, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    // Colour every instance now: the shader is built with instance colours only if they exist at its first draw.
    for (let i = 0; i < n; i++) mesh.setColorAt(i, new THREE.Color("#ffffff"));
    // Stars get an ink rim: the same instances drawn larger and just behind in a second mesh.
    const ink =
      kind === "stars"
        ? new THREE.InstancedMesh(new THREE.ShapeGeometry(starShape(0.5)).scale(1.28, 1.28, 1).translate(0, 0, -0.002), new THREE.MeshBasicMaterial({ color: "#161212" }), n)
        : null;
    if (ink) ink.frustumCulled = false;
    return { mesh, ink };
  }, [kind, born.length]);
  useEffect(
    () => () => {
      for (const m of [mesh, ink]) {
        if (!m) continue;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
        m.dispose();
      }
    },
    [mesh, ink],
  );

  const o = new THREE.Object3D();
  const c = new THREE.Color();
  const palette = colors ?? k.colors;
  const now = frame / 30;
  born.forEach(({ at, birth, seed }, i) => {
    const t = now - birth;
    const life = between(seed + 9, k.life);
    if (t < 0 || t > life) {
      o.scale.setScalar(0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      ink?.setMatrixAt(i, o.matrix);
      return;
    }
    // Birth direction: `up` 1 is a narrow cone straight up, 0 a ring along the ground, -1 a whole sphere.
    const yaw = rand(seed + 1) * Math.PI * 2;
    const elev = k.up === 1 ? Math.PI / 2 - rand(seed + 2) * 0.55 : k.up === 0 ? 0.1 + rand(seed + 2) * 0.35 : Math.asin(rand(seed + 2) * 2 - 1);
    const v = between(seed + 3, k.speed) * speed;
    const v0: Vec3 = [Math.cos(yaw) * Math.cos(elev) * v, Math.sin(elev) * v, Math.sin(yaw) * Math.cos(elev) * v];
    if (spray) for (let j = 0; j < 3; j++) v0[j] += spray[j];
    const land = floor === null || kind === "dust" ? null : landing(at, v0, k.drift, k.drag, t, floor + 0.003);
    const p = fly(at, v0, k.drift, k.drag, land ?? t);
    const s = between(seed + 4, k.size) * size;
    const age = Number.isFinite(life) ? t / life : 0;
    if (kind === "confetti") {
      // Flutter side to side and tumble while falling; flat on the floor once landed.
      const ft = land ?? t;
      const flutter = Math.sin(ft * between(seed + 5, [5, 9]) + seed) * 0.05 * Math.min(1, ft * 2);
      o.position.set(p[0] + flutter, p[1], p[2] + flutter * 0.5);
      if (land !== null) o.rotation.set(-Math.PI / 2, 0, rand(seed + 6) * 6.28);
      else o.rotation.set(t * between(seed + 7, [6, 14]), t * between(seed + 8, [3, 8]) + yaw, t * 2);
      o.scale.setScalar(s);
    } else if (kind === "sparks") {
      if (land !== null) {
        o.scale.setScalar(0); // goes out on the floor
      } else {
        o.position.set(...p);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(s * (1 - age * 0.6));
      }
    } else if (kind === "dust") {
      o.position.set(...p);
      o.rotation.set(rand(seed + 6) * 3, rand(seed + 7) * 3, 0);
      o.scale.set(1, 0.75, 1).multiplyScalar(s * Math.sin(Math.PI * Math.min(1, age ** 0.6)) * (0.35 + 0.65 * Math.min(1, age * 3)));
    } else {
      // Stars pop past full size, spin and shrink away, always flat to the camera.
      o.position.set(...p);
      o.quaternion.copy(camera.quaternion);
      o.rotateZ(t * between(seed + 6, [-6, 6]));
      const out = rain ? (land === null ? 0 : Math.min(1, (t - land) / 0.25)) : age ** 3;
      o.scale.setScalar(s * Math.min(1.15, (rain ? t * 1.5 : age) * 9) * (1 - out));
    }
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    ink?.setMatrixAt(i, o.matrix);
    if (kind === "sparks") mesh.setColorAt(i, sparkColor(age, c));
    else mesh.setColorAt(i, c.set(palette[Math.floor(rand(seed + 10) * palette.length)]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  if (ink) ink.instanceMatrix.needsUpdate = true;

  // `ghost`: effects never count as a puppet walking through the set (pipeline.py collide).
  return (
    <group userData={{ ghost: true }}>
      {ink && <primitive object={ink} />}
      <primitive object={mesh} />
    </group>
  );
};

// One burst from a point: `frame` is frames since it went off (negative: not yet). Confetti from a popper, sparks
// off a grinder or a hit, a ring of dust where a crate lands, stars round a bonk. `count`, `size` and `speed` scale
// the kind's defaults; `spray` adds a velocity to every particle (m/s: a popper aimed sideways, dust kicked forward).
export const Burst: React.FC<{
  kind: ParticleKind;
  at: Vec3;
  frame: number;
  count?: number;
  size?: number;
  speed?: number;
  spray?: Vec3;
  colors?: string[];
  seed?: number;
  floor?: number | null;
}> = ({ kind, at, frame, count, size = 1, speed = 1, spray, colors, seed = 1, floor = 0 }) => {
  const n = count ?? KINDS[kind].count;
  // Born over the first 2 frames, so it reads as a puff and not one solid shell.
  const born = useMemo(() => Array.from({ length: n }, (_, i): Born => ({ at, birth: rand(seed * 1000 + i) * 0.066, seed: seed * 1000 + i * 17 })), [n, seed, ...at]);
  if (frame < 0) return null;
  return <Particles kind={kind} born={born} frame={frame} size={size} speed={speed} colors={colors} floor={floor} spray={spray} />;
};

// Confetti or stars raining over an area from `top` (y) for `frames` frames: `area` = [x0, z0, x1, z1] on the
// floor. Confetti stays where it lands, so the floor fills up; keep `count` near 200 for a celebration.
export const Shower: React.FC<{
  kind?: "confetti" | "stars";
  area: [number, number, number, number];
  top: number;
  frame: number;
  frames?: number;
  count?: number;
  size?: number;
  colors?: string[];
  seed?: number;
  floor?: number | null;
}> = ({ kind = "confetti", area, top, frame, frames = 60, count = 200, size = 1, colors, seed = 1, floor = 0 }) => {
  const [x0, z0, x1, z1] = area;
  const born = useMemo(
    () =>
      Array.from({ length: count }, (_, i): Born => ({
        at: [x0 + (x1 - x0) * rand(seed * 7 + i * 3), top + rand(seed * 7 + i * 3 + 1) * 0.4, z0 + (z1 - z0) * rand(seed * 7 + i * 3 + 2)],
        birth: (rand(seed * 5000 + i) * frames) / 30,
        seed: seed * 5000 + i * 13,
      })),
    [count, frames, seed, top, x0, z0, x1, z1],
  );
  if (frame < 0) return null;
  // Rain starts from rest: speed 0, only the drift (and confetti's flutter) moves it.
  return <Particles kind={kind} born={born} frame={frame} size={size} speed={0} colors={colors} floor={floor} rain />;
};
