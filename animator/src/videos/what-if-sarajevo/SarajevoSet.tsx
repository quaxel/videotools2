import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, Haze, InkBox, InkCylinder, PuppetLight, SkyDome, toonRamp, Vec3 } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

// Sarajevo, 28 June 1914: the Appel Quay along the Miljacka and the corner of Franz Joseph Street by the Latin
// Bridge (guide/references/sarajevo-1914.md). Layout, metres, y = 0 the quay:
// - the quay road runs along x (z -1.6 .. 1.8), a low stone river wall at z 1.8 .. 2.1, the river below it (+z);
// - building fronts face the river at z = -2.6 (pavement z -2.6 .. -1.6, kerb 0.08 high);
// - Franz Joseph Street runs away from the river (-z) between x = -1.6 and 1.6 (cobbled road |x| < 1);
// - the corner building on the west side (x < -1.6) has the DELIKATESSEN shop on its corner, a green-and-white awning;
// - the Latin Bridge leaves the quay across the river at x = 0 (z 2.1 .. 16), humped, four arches, two "eyes";
// - the striped Town Hall front stands further east at x = TOWNHALL.x.

export const Q = { front: -2.6, kerb: -1.6, wall: 1.8, side: 1.6, road: 1.0 };
export const DELI = { x: -1.6, z: -2.6 };
export const PRINCIP_SPOT: [number, number] = [-1.3, -3.35];
export const TOWNHALL = { x: 17, w: 8 };

export type CityMode = "morning" | "day" | "shade" | "cold" | "dream" | "dusk";

type Look = { sky: [number, string][]; fog: string; near: number; amb: [number, string]; hemi: [string, string, number]; key: [number, string]; keyPos: Vec3; sun: Vec3; glow: string; hills: [string, string, string] };
const LOOKS: Record<CityMode, Look> = {
  morning: {
    sky: [[-0.1, "#f6ecd8"], [0.0, "#f4e2c0"], [0.08, "#e8d6b0"], [0.18, "#a9c8e6"], [0.4, "#6f9fd8"], [1.0, "#3e74c4"]],
    fog: "#f0e2c4", near: 26, amb: [1.05, "#fff2dc"], hemi: ["#ffe8c4", "#7a6a4a", 0.6], key: [2.6, "#ffdca0"], keyPos: [-7, 7, 6], sun: [-6, 5, 4], glow: "#fff0c8",
    hills: ["#b9c4a0", "#93a476", "#6f8a58"],
  },
  day: {
    sky: [[-0.1, "#e8f0f2"], [0.0, "#dbe9f3"], [0.08, "#b6d5f1"], [0.16, "#7fb3ea"], [0.32, "#4f8fdc"], [1.0, "#245fb8"]],
    fog: "#d8e6ee", near: 28, amb: [1.15, "#ffffff"], hemi: ["#cfe4ff", "#6a7a5a", 0.6], key: [2.4, "#fff6e6"], keyPos: [-6, 9, 5], sun: [-6, 9, 5], glow: "#fff6dc",
    hills: ["#a8bccc", "#86a07e", "#6a8a56"],
  },
  shade: {
    sky: [[-0.1, "#dfeceb"], [0.0, "#cfe3e2"], [0.1, "#9fcad0"], [0.3, "#5f9eb4"], [1.0, "#2e6a8e"]],
    fog: "#c8dcd8", near: 22, amb: [0.95, "#d8f0ec"], hemi: ["#bfe6e0", "#3a5a50", 0.7], key: [1.5, "#e8f4ee"], keyPos: [6, 8, -4], sun: [6, 8, -4], glow: "#e0f4f0",
    hills: ["#9ab8b4", "#6e9a8a", "#4e7a64"],
  },
  cold: {
    sky: [[-0.1, "#c8ccd4"], [0.0, "#b8bec8"], [0.12, "#8e98a8"], [0.35, "#5e6a80"], [1.0, "#38425a"]],
    fog: "#a8b0bc", near: 18, amb: [0.85, "#c8d4e8"], hemi: ["#b8c8e0", "#3a4048", 0.7], key: [1.3, "#dce6f4"], keyPos: [-5, 8, 5], sun: [-5, 8, 5], glow: "#e0e8f4",
    hills: ["#8a94a4", "#6a7688", "#525e70"],
  },
  dream: {
    sky: [[-0.1, "#f4d8f0"], [0.0, "#e8c4ec"], [0.1, "#c8a4e8"], [0.3, "#8a74d4"], [1.0, "#4a3a9a"]],
    fog: "#d8c0e8", near: 22, amb: [1.0, "#f4e0ff"], hemi: ["#e8c8ff", "#5a4870", 0.7], key: [2.2, "#ffe0f4"], keyPos: [-6, 7, 6], sun: [-6, 6, 5], glow: "#fff0fa",
    hills: ["#b8a4d0", "#9480b8", "#6e5c98"],
  },
  dusk: {
    sky: [[-0.1, "#ffb878"], [0.0, "#ffa060"], [0.06, "#f08458"], [0.16, "#c0607a"], [0.4, "#6a4a8a"], [1.0, "#2a2a5a"]],
    fog: "#e89a78", near: 20, amb: [0.8, "#ffc8a0"], hemi: ["#ffb088", "#4a3050", 0.7], key: [2.2, "#ff9a58"], keyPos: [-8, 3, -6], sun: [-8, 2.2, -7], glow: "#ffd8a0",
    hills: ["#b07a8a", "#8a5a74", "#5e3e5e"],
  },
};

export const CITY_BG: Record<CityMode, string> = { morning: "#e8d6b0", day: "#b6d5f1", shade: "#9fcad0", cold: "#8e98a8", dream: "#c8a4e8", dusk: "#c0607a" };

export const cityLight = (mode: CityMode): PuppetLight => {
  if (mode === "morning") return { tint: "#ffe8c8", tintAmount: 0.08, shadow: 0.18, distant: [{ direction: [-0.6, 0.6, 0.5], color: "#ffd8a0", strength: 1.4 }] };
  if (mode === "shade") return { tint: "#d0f0ea", tintAmount: 0.12, shadow: 0.2, distant: [{ direction: [0.5, 0.7, -0.4], color: "#e0f4ee", strength: 0.7 }] };
  if (mode === "cold") return { tint: "#c8d4ec", tintAmount: 0.16, shadow: 0.28, distant: [{ direction: [-0.5, 0.7, 0.5], color: "#dce6f4", strength: 0.8 }] };
  if (mode === "dream") return { tint: "#f0d0ff", tintAmount: 0.14, shadow: 0.18, distant: [{ direction: [-0.6, 0.6, 0.5], color: "#ffd0f0", strength: 1.2 }] };
  if (mode === "dusk")
    return { tint: "#ffc8a0", tintAmount: 0.12, shadow: 0.3, distant: [{ direction: [-0.6, 0.25, -0.7], color: "#ff9a50", strength: 2.0 }, { direction: [0.4, 0.6, 1], color: "#8a70c8", strength: 0.4 }] };
  return { tint: "#fff4e0", tintAmount: 0.06, shadow: 0.16, distant: [{ direction: [-0.6, 0.8, 0.5], color: "#fff2d8", strength: 1.1 }] };
};

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- painted textures ----------

const wear = (ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, dark = "rgba(90,70,50,0.10)", light = "rgba(255,255,255,0.10)") => {
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = rand(seed + i) > 0.5 ? dark : light;
    ctx.beginPath();
    ctx.ellipse(rand(seed + i * 3) * w, rand(seed + i * 7) * h, 8 + rand(seed + i * 5) * 40, 6 + rand(seed + i * 11) * 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(60,40,20,0.14)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

// A facade: `floors` rows of tall shuttered windows over cornices, `cols` per row; the ground floor gets shopfronts.
const facadeCanvas = (base: string, trim: string, shutter: string, floors: number, cols: number, seed: number, striped = false) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    if (striped) {
      // Town Hall: ochre and red horizontal bands, Moorish arches
      for (let y = 0; y < 512; y += 22) {
        ctx.fillStyle = (y / 22) % 2 ? "#c8503a" : "#e8b860";
        ctx.fillRect(0, y, 512, 11);
      }
    }
    wear(ctx, 512, 512, seed);
    const fh = 512 / (floors + 0.35);
    for (let r = 0; r <= floors; r++) {
      const y = 512 - (r + 1) * fh + (r === 0 ? 0 : 0);
      ctx.fillStyle = trim;
      ctx.fillRect(0, Math.max(0, 512 - r * fh - 10), 512, 10); // cornice
      for (let c = 0; c < cols; c++) {
        const cw = 512 / cols;
        const x = c * cw + cw * 0.28;
        const ww = cw * 0.44;
        if (r === 0) {
          // shopfront / doors
          ctx.fillStyle = "#3a2e26";
          ctx.fillRect(c * cw + cw * 0.16, 512 - fh * 0.82, cw * 0.68, fh * 0.82);
          ctx.fillStyle = "#6a8aa0";
          ctx.fillRect(c * cw + cw * 0.22, 512 - fh * 0.76, cw * 0.56, fh * 0.4);
          continue;
        }
        const wy = y + fh * 0.2;
        const wh = fh * 0.58;
        ctx.fillStyle = trim;
        ctx.fillRect(x - 6, wy - 10, ww + 12, wh + 16);
        if (striped) {
          ctx.beginPath();
          ctx.arc(x + ww / 2, wy, ww / 2 + 6, Math.PI, 0);
          ctx.fill();
        }
        ctx.fillStyle = "#2c3640";
        ctx.fillRect(x, wy, ww, wh);
        if (striped) {
          ctx.beginPath();
          ctx.arc(x + ww / 2, wy, ww / 2, Math.PI, 0);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(160,200,230,0.35)";
        ctx.fillRect(x + 4, wy + 4, ww * 0.4, wh * 0.4);
        ctx.strokeStyle = trim;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + ww / 2, wy);
        ctx.lineTo(x + ww / 2, wy + wh);
        ctx.moveTo(x, wy + wh * 0.45);
        ctx.lineTo(x + ww, wy + wh * 0.45);
        ctx.stroke();
        if (!striped && rand(seed + r * 9 + c) > 0.35) {
          ctx.fillStyle = shutter;
          ctx.fillRect(x - ww * 0.42, wy, ww * 0.38, wh);
          ctx.fillRect(x + ww * 1.04, wy, ww * 0.38, wh);
        }
      }
    }
  });

const stoneSlabCanvas = (base: string, seed: number, cobble = false) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    if (cobble) {
      for (let y = 0; y < 512; y += 22)
        for (let x = (y / 22) % 2 ? -11 : 0; x < 512; x += 24) {
          const v = rand(seed + x * 3 + y * 7);
          ctx.fillStyle = v > 0.66 ? "#8a8076" : v > 0.33 ? "#9c9286" : "#a89e90";
          ctx.beginPath();
          ctx.ellipse(x + 12, y + 11, 10, 9, 0, 0, Math.PI * 2);
          ctx.fill();
        }
    } else {
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = rand(seed + i) > 0.5 ? "rgba(120,100,70,0.16)" : "rgba(255,250,230,0.16)";
        ctx.beginPath();
        ctx.ellipse(rand(seed + i * 3) * 512, rand(seed + i * 5) * 512, 6 + rand(i) * 30, 4 + rand(i + 1) * 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // cart ruts along the quay
      for (const y of [180, 330]) {
        ctx.fillStyle = "rgba(120,96,64,0.22)";
        ctx.fillRect(0, y - 10, 512, 20);
      }
    }
  });

const wallCanvas = () =>
  canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = "#c8bca4";
    ctx.fillRect(0, 0, 512, 128);
    for (let y = 0; y < 128; y += 32)
      for (let x = (y / 32) % 2 ? -30 : 0; x < 512; x += 60) {
        const v = rand(x * 3 + y);
        ctx.fillStyle = v > 0.6 ? "#b8ab92" : v > 0.3 ? "#d4c8b0" : "#c2b59c";
        ctx.fillRect(x + 2, y + 2, 56, 28);
      }
  });

const waterCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#5a9a8e";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(220,245,235,0.35)" : "rgba(40,90,80,0.35)";
      ctx.fillRect(rand(i * 3) * 512, rand(i * 5) * 512, 20 + rand(i * 7) * 60, 3);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(160,150,120,0.45)"; // stones showing through the shallow river
      ctx.beginPath();
      ctx.ellipse(rand(i + 300) * 512, rand(i + 400) * 512, 10 + rand(i) * 18, 6 + rand(i + 2) * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// The hillside town behind the roofs: green slopes with white houses, red roofs, poplars and two minarets.
const hillTownCanvas = (cols: [string, string, string], seed: number) =>
  canvasTexture(2048, 512, (ctx) => {
    ctx.clearRect(0, 0, 2048, 512);
    const crest = (x: number, k: number) => 140 + 90 * Math.sin(x / 260 + seed + k) + 40 * Math.sin(x / 90 + seed * 2 + k);
    for (let k = 0; k < 2; k++) {
      ctx.fillStyle = cols[k + 1];
      ctx.beginPath();
      ctx.moveTo(0, 512);
      for (let x = 0; x <= 2048; x += 16) ctx.lineTo(x, crest(x, k) + k * 90);
      ctx.lineTo(2048, 512);
      ctx.fill();
      for (let i = 0; i < 90; i++) {
        const x = rand(seed + i * 13 + k * 500) * 2048;
        const top = crest(x, k) + k * 90;
        const y = top + 20 + rand(seed + i * 7 + k) * (480 - top);
        if (y > 500) continue;
        const w = 16 + rand(i + k) * 14;
        ctx.fillStyle = rand(i * 3 + k) > 0.2 ? "#f4efe2" : "#e8d2a8";
        ctx.fillRect(x, y, w, w * 0.7);
        ctx.fillStyle = "#b8523a";
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x + w / 2, y - w * 0.45);
        ctx.lineTo(x + w + 3, y);
        ctx.fill();
        if (rand(i * 5 + k) > 0.7) {
          ctx.fillStyle = "#3e5a36"; // a poplar
          ctx.beginPath();
          ctx.ellipse(x - 8, y - 6, 5, 22, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    for (const mx of [520 + seed * 40, 1430 - seed * 30]) {
      const base = crest(mx, 1) + 150;
      ctx.fillStyle = "#f4f0e6";
      ctx.fillRect(mx, base - 150, 12, 150);
      ctx.fillRect(mx - 3, base - 110, 18, 6);
      ctx.fillStyle = "#6a7a8a";
      ctx.beginPath();
      ctx.moveTo(mx - 2, base - 150);
      ctx.lineTo(mx + 6, base - 190);
      ctx.lineTo(mx + 14, base - 150);
      ctx.fill();
      ctx.fillStyle = "#c8c0b0"; // the mosque's dome beside it
      ctx.beginPath();
      ctx.arc(mx + 50, base - 10, 34, Math.PI, 0);
      ctx.fill();
    }
  });

const signCanvas = (text: string, bg: string, fg: string) =>
  canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 108);
    ctx.fillStyle = fg;
    ctx.font = "bold 58px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 68, 470);
  });

const awningCanvas = () =>
  canvasTexture(256, 64, (ctx) => {
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = "#2f7a52";
      ctx.fillRect(x, 0, 16, 64);
      ctx.fillStyle = "#f2efe4";
      ctx.fillRect(x + 16, 0, 16, 64);
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 48, 256, 16);
  });

// ---------- pieces ----------

type Bld = { x0: number; x1: number; h: number; base: string; trim: string; shutter: string; floors: number; seed: number; striped?: boolean; depth?: number };

// A block whose front faces +z at z = Q.front (or, `side` ±1, faces the side street at x = ±Q.side).
const Building: React.FC<{ b: Bld; along?: "quay" | "west" | "east" }> = ({ b, along = "quay" }) => {
  const w = b.x1 - b.x0;
  const tex = useOwned(() => {
    const t = facadeCanvas(b.base, b.trim, b.shutter, b.floors, Math.max(2, Math.round(w / 1.3)), b.seed, b.striped);
    return t;
  });
  const depth = b.depth ?? 5;
  const roof = b.striped ? "#8a4a3a" : "#b4573c";
  const body =
    along === "quay"
      ? { pos: [(b.x0 + b.x1) / 2, b.h / 2, Q.front - depth / 2] as Vec3, size: [w, b.h, depth] as Vec3, rot: 0 }
      : { pos: [along === "west" ? -Q.side - depth / 2 : Q.side + depth / 2, b.h / 2, (b.x0 + b.x1) / 2] as Vec3, size: [w, b.h, depth] as Vec3, rot: along === "west" ? Math.PI / 2 : -Math.PI / 2 };
  return (
    <group position={body.pos} rotation={[0, body.rot, 0]}>
      <InkBox size={body.size} color="#ffffff" map={tex} ink={0.03} />
      {/* cornice and a pitched roof */}
      <InkBox size={[w + 0.2, 0.16, depth + 0.2]} position={[0, b.h / 2 + 0.08, 0]} color={b.trim} ink={0.02} />
      <mesh position={[0, b.h / 2 + 0.16, 0]} scale={[w / 2 + 0.05, 0.9, depth / 2 + 0.05]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[Math.SQRT2, 1, 4, 1]} />
        <meshToonMaterial color={roof} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

const QUAY_WEST: Bld[] = [
  { x0: -9.5, x1: -6.0, h: 4.6, base: "#e8d4b0", trim: "#f6ecd8", shutter: "#5a7a4a", floors: 2, seed: 3 },
  { x0: -14, x1: -9.5, h: 5.4, base: "#e6c4b4", trim: "#f4e6dc", shutter: "#4a6a7a", floors: 3, seed: 7 },
  { x0: -19, x1: -14, h: 4.8, base: "#d8c890", trim: "#f2e8c8", shutter: "#6a5a3a", floors: 2, seed: 11 },
  { x0: -26, x1: -19, h: 5.6, base: "#e4dcc8", trim: "#f8f2e4", shutter: "#4a6a4a", floors: 3, seed: 13 },
];
const QUAY_EAST: Bld[] = [
  { x0: 1.6, x1: 6.5, h: 5.0, base: "#e8c8a8", trim: "#f6e8d6", shutter: "#3e6a5a", floors: 2, seed: 17 },
  { x0: 6.5, x1: 12.6, h: 5.8, base: "#dcd4bc", trim: "#f4eedc", shutter: "#6a4a3a", floors: 3, seed: 19 },
  { x0: TOWNHALL.x - TOWNHALL.w / 2, x1: TOWNHALL.x + TOWNHALL.w / 2, h: 6.4, base: "#e8b860", trim: "#f2d8a0", shutter: "#000", floors: 2, seed: 23, striped: true },
  { x0: 21.4, x1: 28, h: 5.0, base: "#e0ccb0", trim: "#f6ecdc", shutter: "#5a6a4a", floors: 2, seed: 29 },
];
// Side street (Franz Joseph Street) fronts, given as z ranges.
const SIDE_WEST: Bld[] = [
  { x0: -14, x1: -9.2, h: 5.2, base: "#dccfb0", trim: "#f2e8d0", shutter: "#4a6a5a", floors: 3, seed: 31 },
  { x0: -20, x1: -14, h: 4.6, base: "#e6d0c0", trim: "#f6ece4", shutter: "#5a5a7a", floors: 2, seed: 37 },
];
const SIDE_EAST: Bld[] = [
  { x0: -12, x1: -7.6, h: 5.6, base: "#d8dcc8", trim: "#f0f2e6", shutter: "#6a4a3a", floors: 3, seed: 41 },
  { x0: -20, x1: -12, h: 4.8, base: "#e8d4b4", trim: "#f6ecd8", shutter: "#3e5a6a", floors: 2, seed: 43 },
];

// The deli's corner building: a cream two-storey block filling x -6 .. -1.6, z -9.2 .. -2.6, the shop on the corner.
const DeliCorner: React.FC<{ sign: boolean }> = ({ sign }) => {
  const tex = useOwned(() => facadeCanvas("#efe2c2", "#fbf4e2", "#4e7a56", 2, 4, 5));
  const deli = useOwned(() => signCanvas("DELIKATESSEN", "#1f4a34", "#f2d27a"));
  const awn = useOwned(() => awningCanvas());
  const H = 4.8;
  const W = 4.4;
  const D = 6.6;
  return (
    <group>
      <InkBox size={[W, H, D]} position={[-1.6 - W / 2, H / 2, Q.front - D / 2]} color="#ffffff" map={tex} ink={0.03} />
      <InkBox size={[W + 0.2, 0.16, D + 0.2]} position={[-1.6 - W / 2, H + 0.08, Q.front - D / 2]} color="#fbf4e2" ink={0.02} />
      <mesh position={[-1.6 - W / 2, H + 0.16, Q.front - D / 2]} scale={[W / 2 + 0.05, 0.9, D / 2 + 0.05]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[Math.SQRT2, 1, 4, 1]} />
        <meshToonMaterial color="#b4573c" gradientMap={toonRamp} />
      </mesh>
      {/* the shop: a dark shop window and door on the side-street face, the sign over them, an awning */}
      <InkBox size={[0.06, 1.25, 1.6]} position={[-1.58, 0.85, -3.75]} color="#2a3a44" ink={0.012} />
      <InkBox size={[0.07, 0.08, 1.7]} position={[-1.57, 1.5, -3.75]} color="#1f4a34" ink={0.01} />
      <InkBox size={[0.06, 1.7, 0.7]} position={[-1.58, 0.85, -5.0]} color="#4a3020" ink={0.012} />
      {/* shop window goods: jars and hams on shelves */}
      {[0.55, 0.95].map((y, r) =>
        [-3.25, -3.6, -3.95, -4.3].map((z, i) => <InkBox key={`${r}${i}`} size={[0.04, 0.16, 0.18]} position={[-1.54, y, z]} color={(r + i) % 2 ? "#e0b860" : "#c8603a"} ink={0.005} />),
      )}
      {sign && (
        <mesh position={[-1.54, 2.05, -3.75]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.9, 0.48]} />
          <meshToonMaterial map={deli} gradientMap={toonRamp} />
        </mesh>
      )}
      {/* awnings: along the side street and along the quay */}
      <mesh position={[-1.3, 1.82, -3.75]} rotation={[0, Math.PI / 2, -0.5]}>
        <planeGeometry args={[1.9, 0.62]} />
        <meshToonMaterial map={awn} gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-3.6, 1.82, Q.front + 0.3]} rotation={[-0.5, 0, 0]}>
        <planeGeometry args={[3.2, 0.62]} />
        <meshToonMaterial map={awn} gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      {sign && (
        <mesh position={[-3.6, 2.35, Q.front + 0.04]}>
          <planeGeometry args={[2.2, 0.5]} />
          <meshToonMaterial map={deli} gradientMap={toonRamp} />
        </mesh>
      )}
    </group>
  );
};

// The Latin Bridge: a humped stone bridge, four arches on three piers, round "eyes" in the spandrels.
const LatinBridge: React.FC = () => {
  const tex = useOwned(() => {
    const t = wallCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.25, 0.25);
    return t;
  });
  const geo = useMemo(() => {
    const L = 13.9;
    const top = (u: number) => 0.85 * Math.sin((u / L) * Math.PI) ** 0.8;
    const s = new THREE.Shape();
    s.moveTo(0, -1.6);
    for (let i = 0; i <= 40; i++) s.lineTo((L * i) / 40, top((L * i) / 40));
    s.lineTo(L, -1.6);
    s.lineTo(0, -1.6);
    const spans = [
      [0.6, 3.6],
      [4.2, 6.85],
      [7.45, 10.1],
      [10.7, 13.4],
    ];
    for (const [a, b] of spans) {
      const c = (a + b) / 2;
      const r = (b - a) / 2;
      const h = new THREE.Path();
      h.moveTo(a, -1.6);
      h.lineTo(a, -1.0);
      h.absarc(c, -1.0, r, Math.PI, 0, true);
      h.lineTo(b, -1.6);
      h.lineTo(a, -1.6);
      s.holes.push(h);
    }
    for (const u of [3.9, 10.4]) {
      const e = new THREE.Path();
      e.absarc(u, -0.05 + top(u) * 0.35, 0.28, 0, Math.PI * 2, false);
      s.holes.push(e);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: false, curveSegments: 24 });
    return g;
  }, []);
  const ink = useMemo(() => new THREE.MeshBasicMaterial({ color: "#3a3028", side: THREE.BackSide }), []);
  return (
    <group position={[1.3, 0, Q.wall + 0.3]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshToonMaterial color="#e6dcc8" gradientMap={toonRamp} map={tex} />
      </mesh>
      <mesh geometry={geo} material={ink} scale={[1.004, 1.004, 1.01]} position={[-0.02, -0.004, -0.013]} />
    </group>
  );
};

const GasLamp: React.FC<{ position: Vec3; lit?: number }> = ({ position, lit = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.05} height={2.6} position={[0, 1.3, 0]} color="#2a3a34" ink={0.01} />
    <InkCylinder radius={0.11} height={0.2} position={[0, 0.1, 0]} color="#2a3a34" ink={0.01} />
    <InkBox size={[0.26, 0.34, 0.26]} position={[0, 2.78, 0]} color={lit > 0 ? "#ffe0a0" : "#d8e4e0"} emissive={lit > 0 ? "#" + new THREE.Color(Math.min(1, 1.0 * lit), Math.min(1, 0.7 * lit), 0.25 * lit).getHexString() : undefined} ink={0.012} />
    <mesh position={[0, 3.02, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.24, 0.18, 4]} />
      <meshToonMaterial color="#2a3a34" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// A black-and-yellow Habsburg flag hanging from a staff over the street, swaying.
const Flag: React.FC<{ position: Vec3; frame: number; dir?: number; seed?: number }> = ({ position, frame, dir = 1, seed = 0 }) => {
  const sway = Math.sin(frame * 0.07 + seed) * 0.12 + Math.sin(frame * 0.19 + seed * 2) * 0.05;
  return (
    <group position={position} rotation={[0.5 * dir, 0, 0]}>
      <InkCylinder radius={0.025} height={1.2} position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]} color="#c8a050" ink={0.006} />
      <group position={[0, -0.02, 1.0]} rotation={[sway, 0, sway * 0.6]}>
        <mesh position={[0, -0.24, 0]}>
          <planeGeometry args={[0.1, 0.48]} />
          <meshToonMaterial color="#f0c020" gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
        <InkBox size={[0.02, 0.24, 0.5]} position={[0, -0.12, -0.25]} color="#141414" ink={0.004} />
        <InkBox size={[0.02, 0.24, 0.5]} position={[0, -0.36, -0.25]} color="#f0c020" ink={0.004} />
      </group>
    </group>
  );
};

// `signs` shows the DELIKATESSEN boards: only in shots that keep them wholly in frame (no half-cut text).
export const SarajevoSet: React.FC<{ camera: CameraShot; frame: number; mode?: CityMode; lampLit?: number; signs?: boolean; children?: React.ReactNode }> = ({
  camera,
  frame,
  mode = "day",
  lampLit = 0,
  signs = false,
  children,
}) => {
  const L = LOOKS[mode];
  const camX = camera.position[0];
  const quay = useOwned(() => {
    const t = stoneSlabCanvas("#d8c8a6", 5);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(12, 1);
    return t;
  });
  const cobbles = useOwned(() => {
    const t = stoneSlabCanvas("#7a7268", 9, true);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.2, 10);
    return t;
  });
  const pave = useOwned(() => {
    const t = stoneSlabCanvas("#c4b8a2", 15);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(16, 1);
    return t;
  });
  const wall = useOwned(() => {
    const t = wallCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 1);
    return t;
  });
  const water = useOwned(() => {
    const t = waterCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 2);
    return t;
  });
  const town = useOwned(() => hillTownCanvas(L.hills, 1));
  const town2 = useOwned(() => hillTownCanvas(L.hills, 4));
  water.offset.set(frame * 0.0012, 0);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[L.fog]} />
      <fog attach="fog" args={[L.fog, L.near, 110]} />
      <ambientLight intensity={L.amb[0]} color={L.amb[1]} />
      <hemisphereLight args={L.hemi} />
      <directionalLight
        position={L.keyPos}
        intensity={L.key[0]}
        color={L.key[1]}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />
      <group position={camera.position}>
        <SkyDome sun={L.sun} stops={L.sky} glow={L.glow} />
      </group>
      {/* the hillside town behind the roofs (parallax), and the far bank across the river */}
      <mesh position={[camX * 0.7, 9, -60]}>
        <planeGeometry args={[150, 37.5]} />
        <meshBasicMaterial map={town} transparent fog={false} toneMapped={false} depthWrite={false} />
      </mesh>
      <Haze z={-48} color={L.fog} />
      <mesh position={[camX * 0.45, 5.2, -40]}>
        <planeGeometry args={[110, 27.5]} />
        <meshBasicMaterial map={town2} transparent fog={false} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[-camX * 0.3, 4, 48]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[110, 27.5]} />
        <meshBasicMaterial map={town} transparent fog={false} toneMapped={false} depthWrite={false} />
      </mesh>

      {/* quay road, pavement, side street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (Q.kerb + Q.wall) / 2]} receiveShadow>
        <planeGeometry args={[80, Q.wall - Q.kerb]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={quay} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, (Q.front + Q.kerb) / 2]} receiveShadow>
        <planeGeometry args={[80, Q.kerb - Q.front]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={pave} />
      </mesh>
      <InkBox size={[80, 0.08, 0.1]} position={[0, 0.04, Q.kerb]} color="#a89c88" ink={0.006} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -12.6]} receiveShadow>
        <planeGeometry args={[Q.road * 2, 20]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={cobbles} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s * (Q.road + Q.side) / 2, 0.08, -12.6]} receiveShadow>
            <planeGeometry args={[Q.side - Q.road, 20]} />
            <meshToonMaterial color="#c4b8a2" gradientMap={toonRamp} />
          </mesh>
          <InkBox size={[0.1, 0.08, 20]} position={[s * Q.road, 0.04, -12.6]} color="#a89c88" ink={0.006} />
        </group>
      ))}

      {/* river wall and the river */}
      <InkBox size={[80, 0.62, 0.32]} position={[0, 0.31, Q.wall + 0.16]} color="#ffffff" map={wall} ink={0.012} />
      <InkBox size={[80, 0.06, 0.4]} position={[0, 0.65, Q.wall + 0.16]} color="#e4dccc" ink={0.008} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 14]}>
        <planeGeometry args={[90, 24]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={water} />
      </mesh>
      <InkBox size={[90, 1.8, 0.3]} position={[0, -0.6, 26]} color="#c8bca4" ink={0.01} />
      <LatinBridge />

      {/* buildings */}
      <DeliCorner sign={signs} />
      {QUAY_WEST.map((b) => <Building key={b.seed} b={b} />)}
      {QUAY_EAST.map((b) => <Building key={b.seed} b={b} />)}
      {SIDE_WEST.map((b) => <Building key={b.seed} b={b} along="west" />)}
      {SIDE_EAST.map((b) => <Building key={b.seed} b={b} along="east" />)}
      {/* the end of the side street: a far facade closing the view */}
      <group position={[0, 0, -20.3]}>
        <Building b={{ x0: -2.2, x1: 2.2, h: 5.4, base: "#e0d8c4", trim: "#f4eedc", shutter: "#4a6a5a", floors: 3, seed: 53, depth: 2 }} />
      </group>

      {/* street furniture: gas lamps along the kerb, flags on the facades */}
      {[-12, -6.5, 2.4, 8, 13.5, 21].map((x) => <GasLamp key={x} position={[x, 0.08, Q.kerb - 0.2]} lit={x === 2.4 ? lampLit : 0} />)}
      {[-12.5, -8, -4.6, 3.4, 9.5, 15, 19, 24].map((x, i) => <Flag key={x} position={[x, 3.3, Q.front]} frame={frame} seed={i} />)}
      {children}
    </>
  );
};
