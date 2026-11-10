import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BlenderModel, CameraRig, CameraShot, canvasTexture, Halo, Hills, InkBox, InkCylinder, PuppetLight, SkyDome, toonRamp } from "../../engine";
import { Haze } from "../../three/LakeSet";
import { Blob, useOwned } from "../../three/BalloonSets";

// The Waterloo country, built from references (guide/references/waterloo-1815.md): rolling Belgian farmland of rye,
// wheat and pasture between low ridges, elm and poplar rows, white farms with red tile roofs; the armies as toy-like
// instanced battalions in their uniforms with flags; cannon smoke banks, rain, mud. `FieldSet` takes a time of day /
// weather (`WMode`) so one country gives the video's palettes, and a terrain (`Terrain`): `valley` (two ridges facing
// each other across a dip, the battlefield), `slope` (a crest the Prussians pour over), `plain` (a flat road country).
// Floor y = 0 and flat for |x| < 9 and z > -7, so puppets stand there; `groundY` gives the height anywhere else.

export type Vec3 = [number, number, number];
const INK = "#161212";

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
// Always a double (never a small integer): object literals built every frame keep one field representation, which
// sidesteps a V8 boilerplate-migration crash in headless Chrome (seen with many soldiers and horses in one shot).
export const dbl = (v: number) => v + 1e-7;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- terrain ----------

export type Terrain = "valley" | "slope" | "plain" | "river";

export const groundY = (x: number, z: number, terrain: Terrain = "valley"): number => {
  const far = smooth(-7, -16, z); // flat near the camera, terrain beyond
  const und = (0.7 * Math.sin(x * 0.085 + 1.3) + 0.45 * Math.sin(x * 0.19 + z * 0.06) + 0.3 * Math.sin(z * 0.11 + x * 0.04)) * smooth(-10, -30, z);
  if (terrain === "valley") {
    const dip = -2.6 * Math.exp(-(((z + 24) / 9) ** 2));
    const ridge = 6 * smooth(-30, -50, z) - 1.2 * smooth(-62, -90, z);
    return far * (dip + ridge + und);
  }
  if (terrain === "slope") {
    // a crest across the view at z = -16 (3.4 m up), falling away behind it, and hills beyond
    const crest = 3.4 * Math.exp(-(((z + 17) / 7.5) ** 2)) * (1 + 0.15 * Math.sin(x * 0.12));
    const beyond = -1.4 * smooth(-22, -32, z) + 3.5 * smooth(-60, -90, z);
    return far * (crest + beyond + und * 0.6) + 0.25 * smooth(-3, -7, z) * Math.sin(x * 0.3);
  }
  if (terrain === "river") {
    // the Dyle at Wavre: a channel across at z = -9..-13, the town on both banks, the land rising behind
    const bed = -1.3 * Math.exp(-(((z + 11) / 1.6) ** 4));
    return bed * smooth(-6, -8.5, z) + far * (3.2 * smooth(-18, -40, z) + 3 * smooth(-50, -80, z) + und * 0.7);
  }
  return far * (und * 0.8 + 2.5 * smooth(-40, -80, z));
};

// ---------- moods ----------

export type WMode = "morning" | "overcast" | "storm" | "garden" | "smoke" | "golden" | "dusk" | "frost" | "sunset";

type Look = {
  sky: [number, string][];
  sun: Vec3;
  disc?: string;
  glow: string;
  fog: [string, number, number];
  bg: string;
  key: [number, string];
  ambient: [number, string];
  hemi: [string, string, number];
  hills: [string, string, string];
  haze: string;
  grass: string;
  fields: number; // how strongly the field patchwork shows (0..1)
  cloud: [string, string];
  clouds: number; // how many cloud banks
};

export const LOOKS: Record<WMode, Look> = {
  morning: {
    sky: [[-0.1, "#e8eedc"], [0.0, "#dfe9e4"], [0.06, "#bcd6e6"], [0.16, "#8cbbe4"], [0.34, "#5d97d8"], [0.7, "#3e7acb"], [1, "#2f63b4"]],
    sun: [-5, 6, 7],
    glow: "#fff6d8",
    fog: ["#d4e0d8", 40, 170],
    bg: "#9cc0d8",
    key: [2.7, "#fff0d0"],
    ambient: [1.0, "#eef2ff"],
    hemi: ["#cfe4ff", "#5a7a2a", 0.55],
    hills: ["#9fb6c4", "#89a37e", "#6d8c48"],
    haze: "#d6e2dc",
    grass: "#3f9e62",
    fields: 0.75,
    cloud: ["#ffffff", "#c8d6e6"],
    clouds: 9,
  },
  overcast: {
    sky: [[-0.1, "#c8c8be"], [0.0, "#bfc0b8"], [0.1, "#a8aca6"], [0.3, "#8e9494"], [0.7, "#7a8084"], [1, "#6a7076"]],
    sun: [4, 7, 2],
    glow: "#d8d8cc",
    fog: ["#b4b6a8", 26, 120],
    bg: "#8e9488",
    key: [1.5, "#e8e4d4"],
    ambient: [1.35, "#dcdcd0"],
    hemi: ["#c8ccc4", "#4a5230", 0.6],
    hills: ["#9a9c94", "#80866e", "#66704a"],
    haze: "#b8baae",
    grass: "#4e9480",
    fields: 0.5,
    cloud: ["#b8b8b0", "#8a8c8a"],
    clouds: 14,
  },
  storm: {
    sky: [[-0.1, "#2a3448"], [0.0, "#2c364a"], [0.1, "#253048"], [0.3, "#1c2640"], [0.7, "#141c32"], [1, "#0e1428"]],
    sun: [3, 6, -2],
    glow: "#3a4a6a",
    fog: ["#1e2638", 10, 55],
    bg: "#1a2232",
    key: [0.9, "#9ab0e0"],
    ambient: [0.75, "#7a8ab8"],
    hemi: ["#5a6a9a", "#1a2018", 0.5],
    hills: ["#2a3248", "#222a3a", "#1c2430"],
    haze: "#2a3448",
    grass: "#3e4a3a",
    fields: 0.2,
    cloud: ["#3a4660", "#222a3e"],
    clouds: 16,
  },
  garden: {
    sky: [[-0.1, "#f2f0e0"], [0.0, "#e6eee4"], [0.08, "#c4e0ee"], [0.2, "#94c6ec"], [0.4, "#62a4e2"], [1, "#3a7ccc"]],
    sun: [-4, 7, 5],
    glow: "#fffbe0",
    fog: ["#d8e8dc", 30, 140],
    bg: "#a8cce0",
    key: [2.6, "#fff4d8"],
    ambient: [1.05, "#f2f6ff"],
    hemi: ["#d8ecff", "#4a7a2a", 0.55],
    hills: ["#a4bccc", "#8aa880", "#6e9450"],
    haze: "#dceae2",
    grass: "#38a070",
    fields: 0.4,
    cloud: ["#ffffff", "#d0dcea"],
    clouds: 7,
  },
  smoke: {
    sky: [[-0.1, "#c8b890"], [0.0, "#c0b088"], [0.1, "#a8a07c"], [0.3, "#8c8a70"], [0.7, "#767664"], [1, "#666656"]],
    sun: [-6, 5, -3],
    glow: "#e8d8a0",
    fog: ["#a89c78", 22, 100],
    bg: "#9a8e6c",
    key: [1.9, "#ffe0a8"],
    ambient: [1.15, "#e0d4b0"],
    hemi: ["#d8c8a0", "#4a4a28", 0.55],
    hills: ["#9a9278", "#827c5c", "#6a6a40"],
    haze: "#b8aa84",
    grass: "#76803e",
    fields: 0.7,
    cloud: ["#c8bc98", "#9a9078"],
    clouds: 12,
  },
  golden: {
    sky: [[-0.1, "#ffd890"], [0.0, "#ffd48a"], [0.05, "#f8bc6a"], [0.14, "#e8a060"], [0.3, "#c08a78"], [0.6, "#7a7aa0"], [1, "#4a5a8a"]],
    sun: [2, 2.6, -9],
    disc: "#fff2c0",
    glow: "#ffe2a0",
    fog: ["#e8b878", 30, 140],
    bg: "#d89a60",
    key: [3.0, "#ffc070"],
    ambient: [0.95, "#ffd8b0"],
    hemi: ["#ffcc90", "#5a5a20", 0.55],
    hills: ["#d0a080", "#a88a5a", "#7a7a38"],
    haze: "#f0c088",
    grass: "#9a9a3e",
    fields: 1,
    cloud: ["#ffe0a8", "#e09a78"],
    clouds: 8,
  },
  dusk: {
    sky: [[-0.1, "#ff9a50"], [0.0, "#ff8a48"], [0.04, "#f06a3a"], [0.12, "#c8504a"], [0.26, "#8a3e5a"], [0.6, "#4a2e5a"], [1, "#2a2048"]],
    sun: [-3, 1.4, -9],
    disc: "#ffe0a0",
    glow: "#ffb070",
    fog: ["#c8603a", 18, 95],
    bg: "#a84a34",
    key: [2.6, "#ff9a5a"],
    ambient: [0.85, "#ffb090"],
    hemi: ["#ff9a70", "#3a2a20", 0.5],
    hills: ["#a8504a", "#7a3a3a", "#5a3a2a"],
    haze: "#e0784a",
    grass: "#6a6a30",
    fields: 0.6,
    cloud: ["#ff9a68", "#a84a4a"],
    clouds: 10,
  },
  frost: {
    sky: [[-0.1, "#f4f2ee"], [0.0, "#eef0f2"], [0.08, "#dfe8f2"], [0.2, "#c4d6ec"], [0.4, "#a4c0e4"], [1, "#7ea0d4"]],
    sun: [6, 3.5, -4],
    disc: "#fffef4",
    glow: "#ffffff",
    fog: ["#e4eaf0", 30, 150],
    bg: "#d4dfea",
    key: [2.2, "#fff8f0"],
    ambient: [1.3, "#eef2ff"],
    hemi: ["#f0f4ff", "#8a9a7a", 0.6],
    hills: ["#c8d4e0", "#aebcca", "#98a894"],
    haze: "#eef2f6",
    grass: "#9cc4d4",
    fields: 0.15,
    cloud: ["#ffffff", "#dce4ee"],
    clouds: 6,
  },
  sunset: {
    sky: [[-0.1, "#ffc8a0"], [0.0, "#ffbc98"], [0.05, "#f8a0a0"], [0.14, "#e088a8"], [0.3, "#a87ab0"], [0.6, "#6a6aa8"], [1, "#4a4a8a"]],
    sun: [-5, 1.6, -9],
    disc: "#fff0d8",
    glow: "#ffd0b0",
    fog: ["#e8a8a0", 26, 120],
    bg: "#c88a98",
    key: [2.4, "#ffb8a0"],
    ambient: [1.0, "#ffd0d0"],
    hemi: ["#ffb8b8", "#4a4a30", 0.5],
    hills: ["#c890a0", "#a07a88", "#7a6a5a"],
    haze: "#f0b0a8",
    grass: "#7a8a48",
    fields: 0.6,
    cloud: ["#ffd0c0", "#c890a8"],
    clouds: 9,
  },
};

export const fieldBg = (mode: WMode) => LOOKS[mode].bg;

// Puppets lit by the mode's sun as a coloured side light and rim; `dawn` blends the storm toward grey morning.
export const fieldLight = (mode: WMode, extra?: { points?: PuppetLight["points"] }): PuppetLight => {
  const m = LOOKS[mode];
  const dir = new THREE.Vector3(...m.sun).normalize().toArray() as Vec3;
  const strength = dbl(mode === "overcast" ? 0.7 : mode === "storm" ? 0.6 : mode === "frost" ? 1.05 : 1.4);
  return {
    tint: mode === "storm" ? "#a8b8e8" : "#fff6ee",
    tintAmount: mode === "storm" ? 0.14 : undefined,
    shadow: mode === "storm" ? 0.28 : 0.15,
    distant: [{ direction: dir, color: m.key[1], strength }],
    points: extra?.points ?? [],
  };
};

// ---------- ground ----------

const grassCanvas = (base: string, mud: number) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 70; i++) {
      const v = rand(i + 50);
      ctx.fillStyle = v > 0.6 ? "rgba(50,80,30,0.28)" : v > 0.3 ? "rgba(210,200,120,0.2)" : "rgba(150,190,90,0.26)";
      ctx.beginPath();
      ctx.ellipse(rand(i) * 1024, rand(i + 400) * 1024, 30 + rand(i + 9) * 70, 18 + rand(i + 11) * 40, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9000; i++) {
      const x = rand(i) * 1024;
      const y = rand(i + 7000) * 1024;
      const v = rand(i + 900);
      ctx.strokeStyle = v > 0.82 ? "rgba(230,215,150,0.6)" : v > 0.5 ? "rgba(60,100,40,0.75)" : v > 0.22 ? "rgba(170,200,110,0.6)" : "rgba(40,80,30,0.75)";
      ctx.lineWidth = 2 + rand(i + 5) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i + 3) - 0.5) * 8, y - 7 - rand(i + 4) * 10);
      ctx.stroke();
    }
    if (mud > 0) {
      // churned mud: brown smears, wheel ruts and puddles that take the sky
      ctx.globalAlpha = mud;
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = rand(i + 77) > 0.5 ? "#4a3624" : "#5e4630";
        ctx.beginPath();
        ctx.ellipse(rand(i + 1200) * 1024, rand(i + 1300) * 1024, 40 + rand(i + 1400) * 90, 20 + rand(i + 1500) * 50, rand(i + 1600) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#2e2016";
      ctx.lineWidth = 9;
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        const x0 = rand(k + 2100) * 1024;
        ctx.moveTo(x0, 0);
        ctx.bezierCurveTo(x0 + 80, 300, x0 - 60, 700, x0 + 30, 1024);
        ctx.stroke();
      }
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = rand(i + 2500) > 0.5 ? "rgba(120,140,170,0.85)" : "rgba(150,165,190,0.8)";
        ctx.beginPath();
        ctx.ellipse(rand(i + 2200) * 1024, rand(i + 2300) * 1024, 14 + rand(i + 2400) * 30, 8 + rand(i + 2450) * 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = rand(i + 3300) > 0.5 ? "rgba(255,245,190,0.9)" : "rgba(220,70,60,0.85)";
        ctx.beginPath();
        ctx.arc(rand(i + 3000) * 1024, rand(i + 3100) * 1024, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

// The patchwork of fields over the whole country: strips of ripe rye and wheat, green pasture, clover, ploughland.
const fieldsCanvas = () =>
  canvasTexture(2048, 2048, (ctx) => {
    ctx.clearRect(0, 0, 2048, 2048);
    const cols = ["rgba(200,190,100,0.7)", "rgba(70,150,90,0.6)", "rgba(60,140,110,0.55)", "rgba(50,110,70,0.6)", "rgba(140,120,80,0.55)", "rgba(110,170,100,0.6)"];
    for (let i = 0; i < 70; i++) {
      const cx = rand(i + 10) * 2048;
      const cy = rand(i + 20) * 2048;
      const w = 160 + rand(i + 30) * 360;
      const h = 90 + rand(i + 40) * 260;
      const a = (rand(i + 50) - 0.5) * 0.7;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = cols[Math.floor(rand(i + 60) * cols.length)];
      ctx.fillRect(-w / 2, -h / 2, w, h);
      // furrows / rows
      ctx.strokeStyle = "rgba(60,50,20,0.16)";
      ctx.lineWidth = 3;
      for (let k = -w / 2; k < w / 2; k += 14) {
        ctx.beginPath();
        ctx.moveTo(k, -h / 2);
        ctx.lineTo(k, h / 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  });

// Instanced grass tufts over the near field (kept off a clear strip if given).
const Tufts: React.FC<{ tint: string; terrain: Terrain; count?: number; area?: [number, number, number, number] }> = ({ tint, terrain, count = 2600, area = [-9, -9, 9, 9] }) => {
  const mesh = useOwned(() => {
    const blade = new THREE.ConeGeometry(0.014, 0.15, 3);
    blade.translate(0, 0.075, 0);
    const parts: THREE.BufferGeometry[] = [];
    [-0.35, 0, 0.35].forEach((a, k) => {
      const b = blade.clone();
      b.rotateZ(a);
      b.translate((k - 1) * 0.014, 0, (k % 2) * 0.01);
      parts.push(b.toNonIndexed());
    });
    const merged = mergeGeometries(parts)!;
    merged.computeVertexNormals();
    const m = new THREE.InstancedMesh(merged, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), count);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const base = new THREE.Color(tint);
    for (let i = 0; i < count; i++) {
      const x = area[0] + rand(i * 3 + 1) * (area[2] - area[0]);
      const z = area[1] + rand(i * 3 + 2) * (area[3] - area[1]);
      o.position.set(x, groundY(x, z, terrain), z);
      o.rotation.set(0, rand(i * 5) * 6.28, 0);
      const k = 0.7 + rand(i * 7) * 1.0;
      o.scale.set(k, k * (0.8 + rand(i * 11) * 0.7), k);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      const v = rand(i * 13);
      m.setColorAt(i, c.copy(base).multiplyScalar(v > 0.7 ? 1.15 : v > 0.35 ? 0.85 : 1.0));
    }
    m.receiveShadow = true;
    return m;
  }, [tint, terrain, count, ...area]);
  return <primitive object={mesh} />;
};

// Tall ripe rye (the battle was fought over standing rye): instanced stalks with ears that sway in the wind. Good
// close to the lens as a foreground (it blurs) or as a strip in a field.
export const Rye: React.FC<{ area: [number, number, number, number]; count?: number; frame: number; terrain?: Terrain; color?: string; height?: number; seed?: number }> = ({
  area,
  count = 600,
  frame,
  terrain = "valley",
  color = "#d8b45a",
  height = 1.0,
  seed = 1,
}) => {
  const geo = useOwned(() => {
    const stalk = new THREE.CylinderGeometry(0.008, 0.012, 1, 4);
    stalk.translate(0, 0.5, 0);
    const ear = new THREE.CylinderGeometry(0.022, 0.012, 0.14, 5);
    ear.translate(0, 1.05, 0);
    const leaf = new THREE.ConeGeometry(0.02, 0.35, 3);
    leaf.rotateZ(0.5);
    leaf.translate(0.06, 0.4, 0);
    return mergeGeometries([stalk.toNonIndexed(), ear.toNonIndexed(), leaf.toNonIndexed()])!;
  }, []);
  const mat = useOwned(() => new THREE.MeshToonMaterial({ color, gradientMap: toonRamp }), [color]);
  const mesh = useOwned(() => {
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }, [geo, mat, count]);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  const base = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    const r1 = rand(seed * 7919 + i * 3 + 1);
    const r2 = rand(seed * 7919 + i * 3 + 2);
    const x = area[0] + r1 * (area[2] - area[0]);
    const z = area[1] + r2 * (area[3] - area[1]);
    const sway = 0.12 * Math.sin(frame * 0.07 + x * 0.9 + z * 0.4) + 0.05 * Math.sin(frame * 0.17 + i);
    o.position.set(x, groundY(x, z, terrain), z);
    o.rotation.set(sway * 0.6, rand(i * 5 + seed) * 6.28, sway);
    const k = height * (0.8 + rand(i * 7 + seed) * 0.45);
    o.scale.set(1, k, 1);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, c.copy(base).multiplyScalar(0.82 + rand(i * 13 + seed) * 0.3));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---------- trees, farms, villages ----------

export const Poplar: React.FC<{ position: Vec3; scale?: number; color?: string }> = ({ position, scale = 1, color = "#4a6a34" }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.12} height={1.0} position={[0, 0.5, 0]} color="#5a4a3a" ink={0.01} />
    <Blob position={[0, 3.0, 0]} scale={[0.75, 2.5, 0.75]} color={color} ink={0.05} />
  </group>
);

export const Elm: React.FC<{ position: Vec3; scale?: number; color?: string; seed?: number }> = ({ position, scale = 1, color = "#4e7236", seed = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.16} height={2.2} position={[0, 1.1, 0]} color="#5a4636" ink={0.012} />
    <Blob position={[0, 3.0, 0]} scale={[1.6, 1.3, 1.4]} color={color} ink={0.05} />
    <Blob position={[0.8 * (rand(seed) - 0.3), 3.9, 0.2]} scale={[1.1, 0.9, 1.0]} color={color} ink={0.05} />
    <Blob position={[-0.9, 2.6 + rand(seed + 1) * 0.4, -0.1]} scale={[0.9, 0.8, 0.9]} color={color} ink={0.05} />
  </group>
);

// A white-washed Brabant farm (La Haye Sainte, Hougoumont): long walls, red tile roofs, a gate, a dovecote.
export const Farm: React.FC<{ position: Vec3; rotationY?: number; scale?: number; wall?: string; roof?: string }> = ({ position, rotationY = 0, scale = 1, wall = "#ece4d2", roof = "#b4482e" }) => {
  const house = (x: number, z: number, w: number, d: number, h: number, ry = 0, key = "") => (
    <group key={key} position={[x, 0, z]} rotation={[0, ry, 0]}>
      <InkBox size={[w, h, d]} position={[0, h / 2, 0]} color={wall} ink={0.03} />
      <mesh position={[0, h + d * 0.31, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[d * 0.62, d * 0.62, w + 0.2, 3, 1, false, Math.PI / 2]} />
        <meshToonMaterial color={roof} gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: Math.max(1, Math.floor(w / 1.6)) }, (_, i) => (
        <InkBox key={i} size={[0.36, 0.42, 0.04]} position={[-w / 2 + 0.9 + i * 1.6, h * 0.55, d / 2 + 0.01]} color="#3a3028" ink={0.008} />
      ))}
    </group>
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {house(0, 0, 6, 2.2, 2.4, 0, "a")}
      {/* the long barn turned to the house, with its big doors */}
      <group position={[-3.6, 0, -2.2]} rotation={[0, Math.PI / 2, 0]}>
        {house(0, 0, 5, 2.6, 3, 0, "b")}
      </group>
      {/* courtyard wall with a gate */}
      <InkBox size={[5.4, 1.6, 0.3]} position={[1.0, 0.8, 2.8]} color={wall} ink={0.03} />
      <InkBox size={[1.4, 1.2, 0.34]} position={[-2.4, 1.0, 2.8]} color="#6a4428" ink={0.02} />
      <InkBox size={[0.3, 1.6, 4.6]} position={[3.6, 0.8, 0.5]} color={wall} ink={0.03} />
      {/* dovecote tower */}
      <InkBox size={[1.1, 3.6, 1.1]} position={[2.6, 1.8, -1.6]} color={wall} ink={0.03} />
      <mesh position={[2.6, 4.0, -1.6]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.95, 1.0, 4]} />
        <meshToonMaterial color={roof} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// A Brabant village on a far ridge: roofs round a church with a spire (Plancenoit, Wavre).
export const Village: React.FC<{ position: Vec3; scale?: number; wall?: string; roof?: string; spire?: boolean }> = ({ position, scale = 1, wall = "#e4dccb", roof = "#a8462e", spire = true }) => (
  <group position={position} scale={scale}>
    {[-4, -2.8, -1.4, 1.6, 2.9, 4.2, -5.2, 5.4].map((x, i) => (
      <group key={i} position={[x, 0, (i % 3) * 0.9 - 0.6]}>
        <InkBox size={[1.1, 0.9 + rand(i) * 0.5, 1.0]} position={[0, 0.5, 0]} color={wall} ink={0.025} shadows={false} />
        <mesh position={[0, 1.2 + rand(i) * 0.25, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.85, 0.7, 4]} />
          <meshToonMaterial color={roof} gradientMap={toonRamp} />
        </mesh>
      </group>
    ))}
    {spire && (
      <group position={[0.2, 0, -0.3]}>
        <InkBox size={[1.4, 1.6, 2.4]} position={[0, 0.8, -0.6]} color={wall} ink={0.025} shadows={false} />
        <InkBox size={[0.9, 3.4, 0.9]} position={[0, 1.7, 0.7]} color={wall} ink={0.025} shadows={false} />
        <mesh position={[0, 4.3, 0.7]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.7, 1.9, 4]} />
          <meshToonMaterial color="#3a3a44" gradientMap={toonRamp} />
        </mesh>
      </group>
    )}
  </group>
);

// Painted cloud banks: flat clusters of puffs far off, lit on top, drifting slowly with the frame.
const Clouds: React.FC<{ look: Look; frame: number; camX: number }> = ({ look, frame, camX }) => (
  <group>
    {Array.from({ length: look.clouds }, (_, i) => {
      const x = -150 + rand(i + 3) * 300 + frame * 0.02 + camX * 0.9;
      const y = 22 + rand(i + 5) * 34;
      const z = -140 - rand(i + 7) * 90;
      const w = 14 + rand(i + 9) * 22;
      return (
        <group key={i} position={[x, y, z]}>
          {Array.from({ length: 5 }, (_, k) => (
            <mesh key={k} position={[(k - 2) * w * 0.22, Math.sin(k * 1.7 + i) * 1.6 + (k % 2) * 1.2, 0]} scale={[w * 0.28, w * 0.13, 3]}>
              <sphereGeometry args={[1, 18, 10]} />
              <meshBasicMaterial color={k % 2 ? look.cloud[0] : look.cloud[1]} fog={false} toneMapped={false} />
            </mesh>
          ))}
        </group>
      );
    })}
  </group>
);

// ---------- the country ----------

export const FieldSet: React.FC<{
  camera: CameraShot;
  frame: number;
  mode: WMode;
  terrain?: Terrain;
  mud?: number; // 0..1 churned mud over the near ground
  dawn?: number; // storm only: 0 night .. 1 grey dawn
  flash?: number; // 0..1 lightning or a cannon flash lighting the whole country
  farms?: boolean;
  trees?: boolean;
  tufts?: boolean;
  children?: React.ReactNode;
}> = ({ camera, frame, mode, terrain = "valley", mud = 0, dawn = 0, flash = 0, farms = true, trees = true, tufts = true, children }) => {
  const base = LOOKS[mode];
  // the storm brightens toward a wet grey morning
  const m: Look = useMemo(() => {
    if (mode !== "storm" || dawn <= 0) return base;
    const o = LOOKS.overcast;
    const c = (a: string, b: string) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), dawn * 0.85).getHexString();
    return {
      ...base,
      sky: base.sky.map(([h, col], i) => [h, c(col, o.sky[Math.min(i, o.sky.length - 1)][1])] as [number, string]),
      fog: [c(base.fog[0], o.fog[0]), base.fog[1] + dawn * 14, base.fog[2] + dawn * 50],
      bg: c(base.bg, o.bg),
      key: [base.key[0] + dawn * 0.5, c(base.key[1], o.key[1])],
      ambient: [base.ambient[0] + dawn * 0.5, c(base.ambient[1], o.ambient[1])],
      hills: [c(base.hills[0], o.hills[0]), c(base.hills[1], o.hills[1]), c(base.hills[2], o.hills[2])],
      haze: c(base.haze, o.haze),
      cloud: [c(base.cloud[0], o.cloud[0]), c(base.cloud[1], o.cloud[1])],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, Math.round(dawn * 40)]);
  const camX = camera.position[0];
  const grass = useOwned(() => {
    const t = grassCanvas(mode === "storm" ? "#4a5a3a" : base.grass, mud);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(36, 36);
    t.anisotropy = 8;
    return t;
  }, [mode, mud > 0 ? Math.round(mud * 10) : 0]);
  const fields = useOwned(() => fieldsCanvas(), []);
  const geo = useOwned(() => {
    const g = new THREE.PlaneGeometry(220, 220, 220, 220);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i) - 60;
      p.setY(i, groundY(x, z, terrain));
      p.setZ(i, z);
    }
    g.computeVertexNormals();
    return g;
  }, [terrain]);
  const sunPos = new THREE.Vector3(...m.sun).normalize().multiplyScalar(280).toArray() as Vec3;
  const fl = Math.max(0, Math.min(1, flash));
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={[m.fog[0], m.fog[1], m.fog[2]]} />
      <ambientLight intensity={m.ambient[0] + fl * 1.6} color={fl > 0.05 ? "#dfe8ff" : m.ambient[1]} />
      <hemisphereLight args={m.hemi} />
      <directionalLight
        position={new THREE.Vector3(...m.sun).normalize().multiplyScalar(20).toArray() as Vec3}
        intensity={m.key[0]}
        color={m.key[1]}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
      />
      {/* sky dome, sun and clouds ride with the camera; hills slide at their own shares (parallax) */}
      <group position={camera.position}>
        <SkyDome sun={m.sun} stops={m.sky} glow={m.glow} />
        {m.disc && (
          <mesh position={sunPos} onUpdate={(o) => o.lookAt(0, 0, 0)}>
            <circleGeometry args={[10, 48]} />
            <meshBasicMaterial color={m.disc} fog={false} toneMapped={false} depthWrite={false} />
          </mesh>
        )}
        {fl > 0.02 && (
          <mesh position={[0, 0, 0]} renderOrder={-9}>
            <sphereGeometry args={[290, 24, 12]} />
            <meshBasicMaterial color="#e8eeff" transparent opacity={fl * 0.55} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
          </mesh>
        )}
      </group>
      <Clouds look={m} frame={frame} camX={camX} />
      <Hills z={-170} shift={camX * 0.85} width={520} low={8} high={20} color={m.hills[0]} seed={4} />
      <Haze z={-160} color={m.haze} />
      <Hills z={-130} shift={camX * 0.6} width={420} low={5} high={13} color={m.hills[1]} seed={8} />
      <Haze z={-120} color={m.haze} />
      <Hills z={-104} shift={camX * 0.35} width={360} low={3} high={9} color={m.hills[2]} seed={11} />

      {/* the land: fine grass with the field patchwork laid over it */}
      <mesh geometry={geo} receiveShadow>
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={grass} />
      </mesh>
      {base.fields > 0 && (
        <mesh geometry={geo} position={[0, 0.02, 0]}>
          <meshToonMaterial map={fields} transparent opacity={base.fields * (1 - mud)} gradientMap={toonRamp} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      )}
      {tufts && <Tufts tint={mode === "storm" ? "#4a5a3a" : base.grass} terrain={terrain} />}

      {trees && (
        <group>
          {Array.from({ length: 12 }, (_, i) => {
            const x = -55 + i * 9.5 + rand(i) * 3;
            const z = -58 - rand(i + 9) * 6;
            return <Poplar key={i} position={[x, groundY(x, z, terrain) - 0.2, z]} scale={1.1 + rand(i + 3) * 0.4} color={i % 3 ? "#4a6a34" : "#3e5e2e"} />;
          })}
          {Array.from({ length: 8 }, (_, i) => {
            const x = -38 + i * 11 + rand(i + 40) * 4;
            const z = -30 - rand(i + 49) * 10;
            return <Elm key={`e${i}`} position={[x, groundY(x, z, terrain) - 0.2, z]} scale={1.2 + rand(i + 41) * 0.4} seed={i} color={i % 2 ? "#4e7236" : "#5a7a3a"} />;
          })}
        </group>
      )}
      {farms && (
        <>
          <Farm position={[-17, groundY(-17, -36, terrain), -36]} rotationY={0.3} />
          <Farm position={[24, groundY(24, -52, terrain), -52]} rotationY={-0.4} scale={0.9} />
        </>
      )}
      {children}
    </>
  );
};

// ---------- the armies ----------

export type Army = "french" | "guard" | "british" | "prussian" | "austrian" | "russian" | "highland";

type Kit = { coat: string; facing: string; trousers: string; hat: string; hatH: number; hatR: number; plume?: string; belts: string; pack: string };
export const KITS: Record<Army, Kit> = {
  french: { coat: "#2a3f8a", facing: "#f2efe6", trousers: "#f2efe6", hat: "#1a1a1e", hatH: 0.2, hatR: 0.11, plume: "#c8282a", belts: "#f6f2ea", pack: "#8a5a32" },
  guard: { coat: "#24367a", facing: "#f2efe6", trousers: "#f2efe6", hat: "#14100e", hatH: 0.42, hatR: 0.15, plume: "#c8282a", belts: "#f6f2ea", pack: "#8a5a32" },
  british: { coat: "#c42a26", facing: "#2a3a7a", trousers: "#7a7c84", hat: "#1a1a1e", hatH: 0.2, hatR: 0.11, plume: "#f2f2f2", belts: "#f6f2ea", pack: "#2a2a30" },
  highland: { coat: "#c42a26", facing: "#e8c040", trousers: "#2a4a3a", hat: "#14100e", hatH: 0.34, hatR: 0.15, belts: "#f6f2ea", pack: "#2a2a30" },
  prussian: { coat: "#1e2440", facing: "#c8282a", trousers: "#5a5e66", hat: "#14100e", hatH: 0.2, hatR: 0.11, belts: "#f6f2ea", pack: "#5a3a22" },
  austrian: { coat: "#f2efe6", facing: "#c8282a", trousers: "#e6e2d6", hat: "#1a1a1e", hatH: 0.22, hatR: 0.11, plume: "#e8c040", belts: "#1a1a1e", pack: "#8a5a32" },
  russian: { coat: "#2e5236", facing: "#c8282a", trousers: "#f2efe6", hat: "#1a1a1e", hatH: 0.22, hatR: 0.11, plume: "#1a1a1e", belts: "#f6f2ea", pack: "#5a4a32" },
};

const SKIN = "#f0c8a8";

// One soldier, built from boxes and cylinders with vertex colours, standing on y = 0 facing +z (1.3 m like the
// puppets). Legs are separate so a column can march.
const soldierBody = (kit: Kit) => {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, color: string, pos: Vec3, rot: Vec3 = [0, 0, 0]) => {
    g.rotateX(rot[0]);
    g.rotateY(rot[1]);
    g.rotateZ(rot[2]);
    g.translate(...pos);
    const ng = g.index ? g.toNonIndexed() : g;
    const c = new THREE.Color(color);
    const col = new Float32Array(ng.attributes.position.count * 3);
    for (let i = 0; i < ng.attributes.position.count; i++) col.set([c.r, c.g, c.b], i * 3);
    ng.setAttribute("color", new THREE.BufferAttribute(col, 3));
    ng.deleteAttribute("uv");
    parts.push(ng);
  };
  add(new THREE.BoxGeometry(0.34, 0.44, 0.22), kit.coat, [0, 0.79, 0]);
  add(new THREE.BoxGeometry(0.3, 0.2, 0.05), kit.coat, [0, 0.5, -0.1]); // coat tails
  add(new THREE.BoxGeometry(0.16, 0.3, 0.02), kit.facing, [0, 0.82, 0.115]); // lapels
  add(new THREE.BoxGeometry(0.035, 0.5, 0.02), kit.belts, [0, 0.78, 0.125], [0, 0, 0.62]);
  add(new THREE.BoxGeometry(0.035, 0.5, 0.02), kit.belts, [0, 0.78, 0.127], [0, 0, -0.62]);
  add(new THREE.BoxGeometry(0.1, 0.42, 0.11), kit.coat, [-0.22, 0.77, 0]);
  add(new THREE.BoxGeometry(0.1, 0.42, 0.11), kit.coat, [0.22, 0.77, 0.02], [0.25, 0, 0]);
  add(new THREE.BoxGeometry(0.11, 0.06, 0.12), kit.facing, [-0.22, 0.58, 0]); // cuffs
  add(new THREE.SphereGeometry(0.06, 8, 6), SKIN, [-0.22, 0.53, 0.0]);
  add(new THREE.SphereGeometry(0.06, 8, 6), SKIN, [0.23, 0.55, 0.08]);
  add(new THREE.BoxGeometry(0.3, 0.3, 0.13), kit.pack, [0, 0.82, -0.17]);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 8), "#8a8a90", [0, 1.0, -0.17], [0, 0, Math.PI / 2]);
  add(new THREE.SphereGeometry(0.135, 14, 10), SKIN, [0, 1.12, 0.01]);
  add(new THREE.BoxGeometry(0.03, 0.03, 0.01), "#1a1414", [-0.045, 1.14, 0.135]);
  add(new THREE.BoxGeometry(0.03, 0.03, 0.01), "#1a1414", [0.045, 1.14, 0.135]);
  add(new THREE.CylinderGeometry(kit.hatR, kit.hatR * 1.04, kit.hatH, 14), kit.hat, [0, 1.2 + kit.hatH / 2, 0]);
  add(new THREE.BoxGeometry(kit.hatR * 2.1, 0.025, 0.08), kit.hat, [0, 1.21, 0.1]); // peak
  if (kit.plume) add(new THREE.CylinderGeometry(0.025, 0.02, 0.12, 6), kit.plume, [0, 1.2 + kit.hatH + 0.06, 0.03]);
  // musket at the shoulder with a bayonet
  add(new THREE.CylinderGeometry(0.016, 0.016, 1.15, 6), "#5a3a22", [0.27, 0.98, 0.02], [0.1, 0, 0]);
  add(new THREE.ConeGeometry(0.012, 0.22, 4), "#c8ccd4", [0.27, 1.66, 0.08], [0.1, 0, 0]);
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
};
const soldierLeg = (kit: Kit) => {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, color: string, pos: Vec3) => {
    g.translate(...pos);
    const ng = g.index ? g.toNonIndexed() : g;
    const c = new THREE.Color(color);
    const col = new Float32Array(ng.attributes.position.count * 3);
    for (let i = 0; i < ng.attributes.position.count; i++) col.set([c.r, c.g, c.b], i * 3);
    ng.setAttribute("color", new THREE.BufferAttribute(col, 3));
    ng.deleteAttribute("uv");
    parts.push(ng);
  };
  // pivot at the hip (y = 0.58 in the soldier): built hanging down from 0
  add(new THREE.BoxGeometry(0.12, 0.46, 0.13), kit.trousers, [0, -0.23, 0]);
  add(new THREE.BoxGeometry(0.13, 0.14, 0.18), "#1a1614", [0, -0.52, 0.02]);
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
};

export type SoldierState = { x: number; z: number; yaw: number; stride: number; swing: number; lift?: number; lean?: number };

// A battalion of instanced soldiers. `place(i)` gives each soldier's ground spot, heading and stride (so a scene can
// march them, wheel them or rout them); `terrain` puts their feet on the ground. Ink hull on every part.
export const Troops: React.FC<{ army: Army; count: number; place: (i: number) => SoldierState; terrain?: Terrain; scale?: number; ink?: boolean }> = ({
  army,
  count,
  place,
  terrain = "valley",
  scale = 1,
  ink = true,
}) => {
  const kit = KITS[army];
  const geos = useOwned(() => {
    const body = soldierBody(kit);
    const leg = soldierLeg(kit);
    return { body, leg, dispose: () => (body.dispose(), leg.dispose()) };
  }, [army]);
  const mats = useOwned(() => {
    const toon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp });
    const hull = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    return { toon, hull, dispose: () => (toon.dispose(), hull.dispose()) };
  }, []);
  const meshes = useOwned(() => {
    const mk = (g: THREE.BufferGeometry, m: THREE.Material) => {
      const im = new THREE.InstancedMesh(g, m, count);
      im.frustumCulled = false;
      return im;
    };
    const list = [mk(geos.body, mats.toon), mk(geos.leg, mats.toon), mk(geos.leg, mats.toon)];
    const hulls = ink ? [mk(geos.body, mats.hull), mk(geos.leg, mats.hull), mk(geos.leg, mats.hull)] : [];
    list.forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    return { list, hulls, dispose: () => [...list, ...hulls].forEach((m) => m.dispose()) };
  }, [geos, mats, count, ink]);
  const o = new THREE.Object3D();
  const leg = new THREE.Object3D();
  const mtx = new THREE.Matrix4();
  const HULL = 1.06;
  for (let i = 0; i < count; i++) {
    const raw = place(i);
    const s = { x: dbl(raw.x), z: dbl(raw.z), yaw: dbl(raw.yaw), stride: dbl(raw.stride), swing: dbl(raw.swing), lift: dbl(raw.lift ?? 0), lean: dbl(raw.lean ?? 0) };
    const y = groundY(s.x, s.z, terrain) + s.lift + Math.abs(Math.sin(s.stride)) * 0.035 * s.swing * scale;
    o.position.set(s.x, y, s.z);
    o.rotation.set(s.lean, s.yaw, 0);
    o.scale.setScalar(scale);
    o.updateMatrix();
    meshes.list[0].setMatrixAt(i, o.matrix);
    if (ink) {
      o.scale.set(scale * HULL, scale * 1.02, scale * HULL);
      o.position.y = y - 0.012 * scale;
      o.updateMatrix();
      meshes.hulls[0].setMatrixAt(i, o.matrix);
      o.scale.setScalar(scale);
      o.position.y = y;
      o.updateMatrix();
    }
    for (let k = 0; k < 2; k++) {
      leg.position.set(k === 0 ? -0.075 : 0.075, 0.58, 0);
      leg.rotation.set(Math.sin(s.stride + (k === 1 ? Math.PI : 0)) * 0.5 * s.swing, 0, 0);
      leg.scale.setScalar(1);
      leg.updateMatrix();
      mtx.multiplyMatrices(o.matrix, leg.matrix);
      meshes.list[1 + k].setMatrixAt(i, mtx);
      if (ink) {
        leg.scale.set(HULL, 1.02, HULL);
        leg.updateMatrix();
        mtx.multiplyMatrices(o.matrix, leg.matrix);
        meshes.hulls[1 + k].setMatrixAt(i, mtx);
      }
    }
  }
  [...meshes.list, ...meshes.hulls].forEach((m) => (m.instanceMatrix.needsUpdate = true));
  return (
    <group>
      {meshes.list.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      {meshes.hulls.map((m, i) => (
        <primitive key={`h${i}`} object={m} />
      ))}
    </group>
  );
};

// A block of `rows` x `cols` soldiers centred on `at`, facing `yaw`, marching `speed` m per frame along it.
export const blockPlace =
  (at: [number, number], rows: number, cols: number, yaw: number, frame: number, opts: { gap?: number; speed?: number; seed?: number; swing?: number } = {}) =>
  (i: number): SoldierState => {
    const gap = opts.gap ?? 0.55;
    const r = Math.floor(i / cols);
    const c = i % cols;
    const lx = (c - (cols - 1) / 2) * gap + (rand(i * 3 + (opts.seed ?? 0)) - 0.5) * 0.08;
    const lz = (r - (rows - 1) / 2) * gap * 1.15 + (rand(i * 7 + (opts.seed ?? 0)) - 0.5) * 0.08;
    const travel = (opts.speed ?? 0) * frame;
    const sn = Math.sin(yaw);
    const cs = Math.cos(yaw);
    const x = at[0] + lx * cs + lz * sn + sn * travel;
    const z = at[1] - lx * sn + lz * cs + cs * travel;
    const moving = (opts.speed ?? 0) !== 0;
    return { x: dbl(x), z: dbl(z), yaw: dbl(yaw), stride: dbl(moving ? travel * 7 + rand(i) * 0.4 : 0), swing: dbl(moving ? opts.swing ?? 1 : 0), lift: dbl(0), lean: dbl(0) };
  };

// ---------- flags ----------

export type FlagKind = "france" | "britain" | "prussia" | "austria" | "russia";
const flagCanvas = (kind: FlagKind) =>
  canvasTexture(512, 340, (ctx) => {
    const W = 512;
    const H = 340;
    if (kind === "france") {
      ["#2a3f9a", "#f6f2ea", "#d42a2a"].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect((i * W) / 3, 0, W / 3 + 1, H);
      });
      // gold laurel wreath in the white
      ctx.strokeStyle = "#d8a830";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 46, 0.6, Math.PI - 0.6, true);
      ctx.stroke();
    } else if (kind === "britain") {
      ctx.fillStyle = "#1e2e7a";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#f6f2ea";
      ctx.lineWidth = 60;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W, H);
      ctx.moveTo(W, 0);
      ctx.lineTo(0, H);
      ctx.stroke();
      ctx.strokeStyle = "#c8282a";
      ctx.lineWidth = 20;
      ctx.stroke();
      ctx.fillStyle = "#f6f2ea";
      ctx.fillRect(W / 2 - 50, 0, 100, H);
      ctx.fillRect(0, H / 2 - 50, W, 100);
      ctx.fillStyle = "#c8282a";
      ctx.fillRect(W / 2 - 30, 0, 60, H);
      ctx.fillRect(0, H / 2 - 30, W, 60);
    } else if (kind === "prussia") {
      ctx.fillStyle = "#f6f2ea";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1a1a1e";
      ctx.fillRect(0, 0, W, 40);
      ctx.fillRect(0, H - 40, W, 40);
      // a black eagle, drawn as a spread silhouette
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, 34, 56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W / 2 - 20, H / 2 - 20);
      ctx.lineTo(W / 2 - 120, H / 2 - 60);
      ctx.lineTo(W / 2 - 100, H / 2 + 20);
      ctx.closePath();
      ctx.moveTo(W / 2 + 20, H / 2 - 20);
      ctx.lineTo(W / 2 + 120, H / 2 - 60);
      ctx.lineTo(W / 2 + 100, H / 2 + 20);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "austria") {
      ctx.fillStyle = "#f2c830";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1a1a1e";
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, 40, 64, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c8282a";
      ctx.fillRect(0, 0, W, 26);
      ctx.fillRect(0, H - 26, W, 26);
    } else {
      ctx.fillStyle = "#f6f2ea";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#2a4aa8";
      ctx.lineWidth = 64;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W, H);
      ctx.moveTo(W, 0);
      ctx.lineTo(0, H);
      ctx.stroke();
    }
    ctx.strokeStyle = "#e8b838";
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, W - 12, H - 12);
  });

// The cloth's vertices for a wave phase t: a 19 x 9 grid, x along the cloth from the pole.
function waveCloth(arr: Float32Array, size: number, t: number, wind: number) {
  const h = size * 0.66;
  let k = 0;
  for (let row = 0; row < 9; row++) {
    const yy = (0.5 - row / 8) * h;
    for (let col = 0; col < 19; col++) {
      const u = col / 18;
      arr[k] = u * size * (1 - 0.06 * u);
      arr[k + 1] = yy - u * u * 0.08 * size;
      arr[k + 2] = Math.sin(u * 5 - t) * 0.09 * size * u * wind + Math.sin(u * 9 - t * 1.4 + yy * 4) * 0.025 * size * u;
      k += 3;
    }
  }
}

// A flag on its pole, the cloth rippling in the wind (cloth along +x from the pole). `size` = cloth width.
export const Flag: React.FC<{ kind: FlagKind; position: Vec3; frame: number; size?: number; pole?: number; yaw?: number; wind?: number; seed?: number }> = ({
  kind,
  position,
  frame,
  size = 0.8,
  pole = 2.3,
  yaw = 0,
  wind = 1,
  seed = 0,
}) => {
  const tex = useOwned(() => flagCanvas(kind), [kind]);
  const geo = useOwned(() => new THREE.PlaneGeometry(size, size * 0.66, 18, 8), [size]);
  waveCloth(geo.attributes.position.array as Float32Array, size, frame * 0.16 * wind + seed, wind);
  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <InkCylinder radius={0.022} height={pole} position={[0, pole / 2, 0]} color="#5a3a22" ink={0.008} />
      {kind === "france" ? (
        <group position={[0, pole + 0.08, 0]}>
          <Blob position={[0, 0.02, 0]} scale={[0.07, 0.09, 0.05]} color="#e0b030" ink={0.012} />
          <Blob position={[-0.08, 0.06, 0]} scale={[0.07, 0.04, 0.02]} rotation={[0, 0, 0.5]} color="#e0b030" ink={0.01} />
          <Blob position={[0.08, 0.06, 0]} scale={[0.07, 0.04, 0.02]} rotation={[0, 0, -0.5]} color="#e0b030" ink={0.01} />
        </group>
      ) : (
        <mesh position={[0, pole + 0.05, 0]}>
          <coneGeometry args={[0.04, 0.14, 6]} />
          <meshToonMaterial color="#d8b040" gradientMap={toonRamp} />
        </mesh>
      )}
      <mesh geometry={geo} position={[0.02, pole - size * 0.36, 0]} castShadow>
        <meshToonMaterial map={tex} side={THREE.DoubleSide} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// ---------- smoke, fire, rain ----------

// A bank of musket and cannon smoke: soft inked puffs that are born along a line, swell and drift downwind.
export const SmokeBank: React.FC<{
  from: Vec3;
  to: Vec3;
  frame: number;
  puffs?: number;
  size?: number;
  wind?: Vec3;
  color?: string;
  shade?: string;
  period?: number;
  opacity?: number;
  seed?: number;
  terrain?: Terrain;
}> = ({ from, to, frame, puffs = 26, size = 1.4, wind = [0.012, 0.004, 0], color = "#dcd8d0", shade = "#a8a4a0", period = 160, opacity = 0.72, seed = 1 }) => {
  const geo = useOwned(() => new THREE.IcosahedronGeometry(1, 2), []);
  const mats = useOwned(() => {
    const a = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp, transparent: true, opacity, depthWrite: false });
    const b = new THREE.MeshToonMaterial({ color: shade, gradientMap: toonRamp, transparent: true, opacity, depthWrite: false });
    return { a, b, dispose: () => (a.dispose(), b.dispose()) };
  }, [color, shade, opacity]);
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: puffs }, (_, i) => {
        const u = rand(seed * 97 + i);
        const age = (((frame + rand(seed * 31 + i) * period) % period) + period) % period;
        const t = age / period;
        const x = from[0] + (to[0] - from[0]) * u + wind[0] * age;
        const y = from[1] + (to[1] - from[1]) * u + wind[1] * age + t * size * 0.6;
        const z = from[2] + (to[2] - from[2]) * u + wind[2] * age;
        const s = size * (0.45 + 0.75 * Math.sqrt(t)) * (0.7 + rand(seed * 13 + i) * 0.6) * (t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1) * Math.min(1, t * 8);
        return <mesh key={i} geometry={geo} material={i % 3 ? mats.a : mats.b} position={[x, y, z]} scale={[s * 1.3, s, s]} />;
      })}
    </group>
  );
};

// Rain: streaks falling past the camera inside a box round `center`; closed-form in the frame.
export const Rain: React.FC<{ center: Vec3; frame: number; size?: Vec3; count?: number; color?: string; slant?: number; opacity?: number }> = ({
  center,
  frame,
  size = [14, 9, 14],
  count = 1800,
  color = "#b8c8e8",
  slant = 0.18,
  opacity = 0.55,
}) => {
  const geo = useOwned(() => new THREE.BoxGeometry(0.008, 0.42, 0.008), []);
  const mat = useOwned(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }), [color, opacity]);
  const mesh = useOwned(() => {
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.frustumCulled = false;
    return m;
  }, [geo, mat, count]);
  const o = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const h = size[1];
    const fall = (rand(i + 9) * h + frame * (0.55 + rand(i + 3) * 0.2)) % h;
    const y = center[1] + h / 2 - fall;
    o.position.set(center[0] + (rand(i) - 0.5) * size[0] + slant * fall * 0.3, y, center[2] + (rand(i + 5) - 0.5) * size[2]);
    o.rotation.set(0, 0, -slant);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return (
    <group userData={{ ghost: true }}>
      <primitive object={mesh} />
    </group>
  );
};

// Rain rings on puddles: little rings that open and fade.
export const Ripples: React.FC<{ area: [number, number, number, number]; frame: number; count?: number; y?: number }> = ({ area, frame, count = 60, y = 0.03 }) => {
  const geo = useOwned(() => new THREE.RingGeometry(0.85, 1, 20), []);
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const period = 14 + Math.floor(rand(i + 3) * 10);
        const t = (((frame + rand(i) * period) % period) + period) % period / period;
        const x = area[0] + rand(i + 20) * (area[2] - area[0]);
        const z = area[1] + rand(i + 40) * (area[3] - area[1]);
        return (
          <mesh key={i} geometry={geo} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} scale={0.03 + t * 0.14}>
            <meshBasicMaterial color="#dfe8f8" transparent opacity={(1 - t) * 0.7} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// A muzzle flash: a bright bloom with a point light, `t` frames since the shot (negative: nothing).
export const MuzzleFlash: React.FC<{ position: Vec3; t: number; size?: number; color?: string }> = ({ position, t, size = 1.6, color = "#fff0b0" }) => {
  if (t < 0 || t > 7) return null;
  const k = Math.exp(-t / 2);
  return (
    <group userData={{ ghost: true }}>
      <Halo position={position} size={size * (0.6 + 0.6 * k)} color={color} strength={k} />
      <mesh position={position} scale={size * 0.16 * k}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <pointLight position={position} intensity={40 * k} distance={12} color="#ffd890" />
    </group>
  );
};

// ---------- the hero props ----------

// The sand3d field gun (../videos/what-if-waterloo/sand3d/cannon.py). Faces +z (muzzle toward the camera) at yaw 0.
// `recoil` 0..1 throws it back along its trail; `roll` turns the wheels (degrees).
export const FieldGun: React.FC<{ position: Vec3; yaw?: number; elevate?: number; recoil?: number; roll?: number; sink?: number; scale?: number }> = ({
  position,
  yaw = 0,
  elevate = 3,
  recoil = 0,
  roll = 0,
  sink = 0,
  scale = 1,
}) => {
  const back = recoil * 0.45 * scale;
  return (
    <group position={[position[0] - Math.sin(yaw) * back, position[1] - sink, position[2] - Math.cos(yaw) * back]} rotation={[0, yaw, 0]}>
      <BlenderModel src="videos/what-if-waterloo/models/cannon.glb" scale={scale} joints={{ elevate: dbl(elevate + recoil * 4), spin_L: dbl(roll - recoil * 30), spin_R: dbl(roll - recoil * 30) }} />
    </group>
  );
};

export const HORSE_SADDLE = 1.26;
export type Coat = "grey" | "bay" | "black" | "chestnut";
// A sand3d horse (../videos/what-if-waterloo/sand3d/horse.py), facing +z at yaw 0. `gait` 0 stands, 1 walks, 2
// gallops: the legs swing from `phase`; `rear` lifts the front; `nod` the head.
export const Charger: React.FC<{ coat: Coat; position: Vec3; yaw?: number; phase?: number; gait?: number; nod?: number; rear?: number; scale?: number }> = ({
  coat,
  position,
  yaw = 0,
  phase = 0,
  gait = 0,
  nod = 0,
  rear = 0,
  scale = 1,
}) => {
  const a = gait > 1.5 ? 38 : 24 * gait;
  const sw = (p: number) => Math.sin(phase + p) * a;
  const kn = (p: number) => Math.max(0, Math.sin(phase + p + 0.9)) * (gait > 1.5 ? 70 : 45 * gait);
  const bob = gait > 0 ? Math.abs(Math.cos(phase)) * 0.03 * gait : 0;
  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={[0, yaw, 0]}>
      <group position={[0, 0, -0.5 * scale]} rotation={[-rear * 0.5, 0, 0]}>
        <group position={[0, 0, 0.5 * scale]}>
          <BlenderModel
            src={`videos/what-if-waterloo/models/horse_${coat}.glb`}
            scale={scale}
            joints={{
              leg_FL: dbl(sw(0) - rear * 40),
              leg_FR: dbl(sw(Math.PI) - rear * 30),
              leg_HL: dbl(sw(Math.PI) * 0.8),
              leg_HR: dbl(sw(0) * 0.8),
              knee_FL: dbl(kn(0) + rear * 70),
              knee_FR: dbl(kn(Math.PI) + rear * 80),
              knee_HL: dbl(-kn(Math.PI) * 0.6),
              knee_HR: dbl(-kn(0) * 0.6),
              neck: dbl(nod + Math.sin(phase) * 4 * gait - rear * 15),
              tail: dbl(6 + Math.sin(phase * 0.5) * 6 * gait),
            }}
          />
        </group>
      </group>
    </group>
  );
};

// The cloud from one cannon shot: puffs thrown out of the muzzle along `dir`, swelling and drifting up and away;
// `t` frames since the shot (negative: nothing).
export const ShotSmoke: React.FC<{ at: Vec3; dir: Vec3; t: number; size?: number; seed?: number; color?: string; shade?: string }> = ({ at, dir, t, size = 0.7, seed = 1, color = "#e6e2da", shade = "#b4b0aa" }) => {
  const geo = useOwned(() => new THREE.IcosahedronGeometry(1, 2), []);
  const mats = useOwned(() => {
    const a = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp, transparent: true, opacity: 0.85, depthWrite: false });
    const b = new THREE.MeshToonMaterial({ color: shade, gradientMap: toonRamp, transparent: true, opacity: 0.85, depthWrite: false });
    return { a, b, dispose: () => (a.dispose(), b.dispose()) };
  }, [color, shade]);
  if (t < 0) return null;
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: 14 }, (_, i) => {
        const age = t - i * 0.5;
        if (age < 0) return null;
        const throwOut = (1 - Math.exp(-age / 6)) * (0.5 + i * 0.16);
        const x = at[0] + dir[0] * throwOut + (rand(seed * 11 + i) - 0.5) * 0.4 + age * 0.004;
        const y = at[1] + dir[1] * throwOut + age * 0.008 + (rand(seed * 17 + i) - 0.3) * 0.2;
        const z = at[2] + dir[2] * throwOut + (rand(seed * 23 + i) - 0.5) * 0.4;
        const s = size * (0.25 + 0.75 * (1 - Math.exp(-age / 14))) * (0.5 + rand(seed * 5 + i) * 0.7);
        return <mesh key={i} geometry={geo} material={i % 3 ? mats.a : mats.b} position={[x, y, z]} scale={[s * 1.2, s, s]} />;
      })}
    </group>
  );
};
