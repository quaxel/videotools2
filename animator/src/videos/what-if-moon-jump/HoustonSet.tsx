import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CameraRig, CameraShot, canvasTexture, clamp01, easeIn, easeOut, Halo, InkCylinder, PuppetLight, rand, ramp, toonRamp } from "../../engine";
import { useOwned } from "../../three/BalloonSets";
import { paintTexture } from "../../three/surfaces";

// Mission Control, Houston, April 1972 (guide/references/lunar-surface-apollo16.md → Mission Control 1972).
// Metres. Every camera looks toward -z. Tiers step down toward the front wall:
//   hero tier  y = 0     for z > -0.35  (the two controllers sit here, facing the camera, at HOUSTON.seats)
//   tier 2     y = -0.25 for z -1.75..-0.35 (a low row of consoles, CRTs facing +z)
//   tier 3     y = -0.5  for z < -1.75      (the front "trench" row and the wall at HOUSTON.wallZ)
// Front wall: a wide blue world map with a ground track, the big TV in front of it (`tv` 0..1 plays the tiny grainy
// moon picture: standing, hop, tipping backward, on his back by 1), red seven-segment clocks above, a flag at the
// left, plot screens at the far sides. Warm-lit viewing-room glass high on the left side wall (seen only from shots
// that look left; no camera here looks toward +z). The coffee mug is NOT drawn by the set: render
// `<CoffeeMug position={MUG} tip={...} />` as a child.

type Vec3 = [number, number, number];
const INK = "#161212";

export const HOUSTON = {
  seats: [
    [-0.45, 0.9],
    [0.45, 0.9],
  ] as [number, number][],
  seatTop: 0.34,
  consoleTop: 0.44, // the hero console in front of the seats (z 1.12..1.44, x ±1.25)
  consoleZ: [1.12, 1.44] as [number, number],
  wallZ: -3.2,
  tv: [0, 1.78, -2.72] as Vec3, // centre of the TV picture
  tvSize: [1.08, 0.81] as [number, number],
};
export const MUG: Vec3 = [0.6, HOUSTON.consoleTop, 1.27];
export const HOUSTON_CAM: CameraShot = { position: [0, 1.2, 3.6], target: [0, 0.9, 0], fov: 40 };
export const HOUSTON_REVERSE: CameraShot = { position: [0, 1.3, 2.4], target: [0, 1.6, -3], fov: 40 };

const TIER2 = { z: -0.35, y: -0.25 };
const TIER3 = { z: -1.75, y: -0.5 };
const WALL_Z = HOUSTON.wallZ;
const ROOM = { half: 3.6, ceil: 3.45, back: 4.2 };

// CRT brightness wobble (a few % now and then), shared by the screens and the controllers' face light.
const crtFlicker = (frame: number) => 0.94 + 0.06 * Math.sin(frame * 0.9) * Math.sin(frame * 0.23 + 1);

// How the controllers are lit: the green-white console screens from below-front, a warm amber ceiling spot from
// above, and the big blue screens behind them as a cool rim.
export const houstonLight = (frame: number): PuppetLight => ({
  tint: "#7fd8c8",
  tintAmount: 0.06,
  shadow: 0.2,
  points: [
    { position: [0, 0.62, 1.34], color: "#9fffe0", strength: 1.1 * crtFlicker(frame), range: 1.3 },
    { position: [0, 2.9, 1.15], color: "#ffc27a", strength: 1.0, range: 2.4 },
  ],
  distant: [{ direction: [0, 0.35, -1], color: "#8ec8ff", strength: 0.75 }],
});

// ---------- small building blocks ----------

// A rounded (bevelled) toon box with an ink hull, the Pixar-ish replacement for InkBox.
export const RBox: React.FC<{
  size: Vec3;
  r?: number;
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  map?: THREE.Texture;
  ink?: number;
  emissive?: string;
  shadows?: boolean;
}> = ({ size, r = 0.03, position, rotation, color, map, ink = 0.012, emissive, shadows = true }) => {
  const [w, h, d] = size;
  const geo = useOwned(() => new RoundedBoxGeometry(w, h, d, 3, Math.max(0.001, Math.min(r, Math.min(w, h, d) / 2 - 0.001))), [w, h, d, r]);
  const hull = useOwned(
    () => new RoundedBoxGeometry(w + ink * 2, h + ink * 2, d + ink * 2, 3, Math.max(0.001, Math.min(r + ink, Math.min(w, h, d) / 2 + ink - 0.001))),
    [w, h, d, r, ink],
  );
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} castShadow={shadows} receiveShadow={shadows}>
        <meshToonMaterial color={color} gradientMap={toonRamp} map={map ?? paintTexture()} emissive={emissive ?? "#000"} />
      </mesh>
      {ink > 0 && (
        <mesh geometry={hull}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

// Painted wear for any big surface: soft blotches, scuffs and streaks, so nothing is a flat fill.
const wear = (ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, n: number, dark = "rgba(20,14,10,0.10)", light = "rgba(255,245,225,0.06)") => {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 3 ? dark : light;
    ctx.beginPath();
    ctx.ellipse(rand(i, seed) * w, rand(i, seed + 1) * h, 4 + rand(i, seed + 2) * w * 0.08, 2 + rand(i, seed + 3) * h * 0.05, rand(i, seed + 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < n / 2; i++) {
    ctx.strokeStyle = "rgba(20,14,10,0.12)";
    ctx.lineWidth = 1 + rand(i, seed + 5) * 2;
    const x = rand(i, seed + 6) * w;
    const y = rand(i, seed + 7) * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand(i, seed + 8) - 0.5) * 40, y + (rand(i, seed + 9) - 0.5) * 8);
    ctx.stroke();
  }
};

const vgrad = (ctx: CanvasRenderingContext2D, h: number, stops: [number, string][]) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [k, c] of stops) g.addColorStop(k, c);
  return g;
};

// Shared tiny geometry and materials for the indicator lights (a few hundred of them).
let lampGeo: THREE.BoxGeometry | undefined;
const LAMP_COLOURS = ["#ff3b2f", "#ffb21e", "#3cff7a", "#f4f4e8", "#36c8ff"];
const lampMats = new Map<string, THREE.MeshBasicMaterial>();
const lampMat = (c: number, on: boolean, hot = false) => {
  const key = `${c}${on ? 1 : 0}${hot ? 1 : 0}`;
  let m = lampMats.get(key);
  if (!m) {
    const col = new THREE.Color(LAMP_COLOURS[c]).multiplyScalar(on ? (hot ? 2.2 : 1.05) : 0.16);
    m = new THREE.MeshBasicMaterial({ color: col, toneMapped: false });
    lampMats.set(key, m);
  }
  return m;
};
const lampOn = (i: number, frame: number) => {
  const period = 7 + (i % 6) * 5;
  return rand(i, Math.floor((frame + i * 3) / period) + 11) > 0.33;
};

// A row of indicator lamps on a face; `normal` is the face's rotation.
const Lamps: React.FC<{ position: Vec3; rotation?: Vec3; count: number; step: number; rows?: number; rowStep?: number; seed: number; frame: number; size?: number }> = ({
  position,
  rotation,
  count,
  step,
  rows = 1,
  rowStep = 0.03,
  seed,
  frame,
  size = 0.016,
}) => {
  if (!lampGeo) lampGeo = new THREE.BoxGeometry(1, 1, 0.004);
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: count * rows }, (_, k) => {
        const i = seed * 97 + k;
        const col = Math.floor(rand(i, 3) * 5);
        const on = lampOn(i, frame);
        const hot = rand(i, 4) > 0.9;
        const x = ((k % count) - (count - 1) / 2) * step;
        const y = -Math.floor(k / count) * rowStep;
        return <mesh key={k} geometry={lampGeo} material={lampMat(col, on, hot)} position={[x, y, 0.003]} scale={[size * 1.3, size, 1]} />;
      })}
    </group>
  );
};

// ---------- canvas textures ----------

const consoleFaceTex = (seed: number) =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = vgrad(ctx, 256, [
      [0, "#a9b8ac"],
      [0.5, "#93a497"],
      [1, "#7a897e"],
    ]);
    ctx.fillRect(0, 0, 512, 256);
    // top trim and dark kick plate
    ctx.fillStyle = "#c4cfc4";
    ctx.fillRect(0, 0, 512, 10);
    ctx.fillStyle = "#59645b";
    ctx.fillRect(0, 216, 512, 40);
    // panel seams with screws
    for (let x = 0; x < 512; x += 128) {
      ctx.fillStyle = "rgba(30,40,32,0.45)";
      ctx.fillRect(x, 10, 3, 206);
      ctx.fillStyle = "rgba(255,255,240,0.25)";
      ctx.fillRect(x + 3, 10, 2, 206);
      ctx.fillStyle = "#4d574f";
      for (const y of [22, 200]) {
        ctx.beginPath();
        ctx.arc(x + 14, y, 3, 0, Math.PI * 2);
        ctx.arc(x + 114, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // vent slots
    ctx.fillStyle = "rgba(30,40,32,0.5)";
    for (let k = 0; k < 7; k++) ctx.fillRect(300, 140 + k * 9, 120, 4);
    // scuffs from shoes on the kick plate, finger grime near the top
    wear(ctx, 512, 256, seed, 60);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = "rgba(20,16,12,0.22)";
      ctx.fillRect(rand(i, seed + 20) * 500, 220 + rand(i, seed + 21) * 30, 6 + rand(i, seed + 22) * 26, 2);
    }
  });

// The top of the hero console: grey-green panels of square push buttons and toggle rows (no words).
const consoleTopTex = () =>
  canvasTexture(1024, 160, (ctx) => {
    ctx.fillStyle = "#6f7d72";
    ctx.fillRect(0, 0, 1024, 160);
    for (let p = 0; p < 8; p++) {
      const x0 = p * 128;
      ctx.fillStyle = p % 2 ? "#7e8c80" : "#76857a";
      ctx.fillRect(x0 + 4, 6, 120, 148);
      ctx.strokeStyle = "rgba(20,26,22,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 + 4, 6, 120, 148);
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 6; c++) {
          const v = rand(p * 40 + r * 6 + c, 5);
          ctx.fillStyle = v > 0.8 ? "#d8d4c4" : v > 0.6 ? "#c84a3a" : v > 0.45 ? "#e0b050" : "#3c463e";
          ctx.fillRect(x0 + 14 + c * 18, 18 + r * 32, 13, 13);
        }
    }
    wear(ctx, 1024, 160, 41, 50);
  });

const carpetTex = () => {
  const t = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#3a4846";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.06)";
      ctx.fillRect(rand(i, 61) * 512, rand(i, 62) * 512, 2, 2);
    }
    wear(ctx, 512, 512, 63, 40, "rgba(10,10,8,0.12)", "rgba(200,190,160,0.05)");
    // a coffee stain or two
    ctx.strokeStyle = "rgba(60,36,20,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(380, 120, 22, 16, 0.4, 0, Math.PI * 2);
    ctx.stroke();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  return t;
};

const wallTex = () => {
  const t = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = vgrad(ctx, 512, [
      [0, "#1d2c30"],
      [0.6, "#24363a"],
      [1, "#1a2629"],
    ]);
    ctx.fillRect(0, 0, 512, 512);
    // acoustic panels: vertical boards with a soft bevel
    for (let x = 0; x < 512; x += 64) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x, 0, 3, 512);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x + 3, 0, 3, 512);
    }
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(rand(i, 71) * 512, rand(i, 72) * 512, 1.5, 1.5);
    }
    wear(ctx, 512, 512, 73, 30, "rgba(0,0,0,0.12)", "rgba(160,200,190,0.04)");
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
};

const ceilingTex = () => {
  const t = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#26302f";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#141a1a";
    ctx.lineWidth = 4;
    for (let k = 0; k <= 256; k += 64) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k, 256);
      ctx.moveTo(0, k);
      ctx.lineTo(256, k);
      ctx.stroke();
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(rand(i, 81) * 256, rand(i, 82) * 256, 1.5, 1.5);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  return t;
};

// Green-white CRT text, drawn as dashes (no real words: the framing audit checks every fillText).
const crtTex = (seed: number) => {
  const t = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#03140c";
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 20; row++) {
      const y = 6 + row * 12.6;
      if (row % 7 === 0) {
        ctx.fillStyle = "rgba(190,255,215,0.95)";
        ctx.fillRect(10, y, 60 + rand(row, seed) * 120, 6);
        continue;
      }
      let x = 10;
      while (x < 240) {
        const w = 6 + Math.floor(rand(row * 31 + x, seed) * 5) * 6;
        if (rand(row * 13 + x * 3, seed + 1) > 0.18) {
          ctx.fillStyle = rand(row + x, seed + 2) > 0.88 ? "#f4fff6" : "rgba(120,240,170,0.85)";
          ctx.fillRect(x, y, Math.min(w, 246 - x), 6);
        }
        x += w + 8;
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

// Rough continents in longitude / latitude for the world map.
const LAND: [number, number][][] = [
  [[-168, 66], [-156, 71], [-130, 70], [-95, 72], [-80, 73], [-62, 60], [-55, 52], [-66, 45], [-76, 38], [-81, 31], [-80, 25], [-90, 29], [-97, 26], [-97, 20], [-90, 16], [-83, 9], [-79, 8], [-86, 13], [-95, 16], [-105, 20], [-112, 28], [-117, 32], [-124, 40], [-124, 48], [-136, 58], [-150, 60], [-165, 60]],
  [[-79, 8], [-62, 10], [-50, 0], [-35, -6], [-39, -15], [-48, -26], [-58, -36], [-65, -42], [-69, -52], [-74, -50], [-72, -35], [-71, -20], [-76, -14], [-81, -5], [-78, 2]],
  [[-10, 36], [-9, 43], [-2, 47], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [60, 69], [80, 73], [100, 77], [130, 71], [160, 70], [180, 66], [170, 60], [160, 58], [156, 51], [142, 47], [140, 40], [130, 35], [122, 40], [121, 31], [115, 22], [108, 20], [106, 10], [100, 13], [98, 8], [103, 1], [100, 6], [95, 16], [90, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [52, 28], [48, 30], [56, 24], [58, 18], [52, 15], [44, 12], [38, 20], [34, 28], [35, 36], [28, 36], [26, 40], [20, 38], [16, 40], [12, 44], [7, 44], [3, 42], [-4, 36]],
  [[-17, 21], [-16, 12], [-12, 7], [-5, 5], [8, 4], [10, -2], [13, -10], [12, -18], [18, -34], [26, -34], [33, -26], [40, -15], [40, -3], [51, 12], [43, 12], [37, 19], [32, 31], [20, 32], [10, 37], [-6, 36], [-10, 30]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [131, -31], [116, -35], [114, -28]],
  [[-55, 60], [-43, 60], [-20, 70], [-20, 80], [-60, 80], [-73, 77], [-58, 70]],
  [[-5, 50], [1, 51], [-2, 56], [-5, 58], [-6, 54]],
  [[130, 31], [141, 36], [142, 44], [140, 41], [135, 34]],
  [[44, -25], [50, -15], [49, -12], [43, -17]],
  [[95, 5], [105, -6], [115, -8], [120, -2], [110, 2], [100, 2]],
  [[131, -1], [141, -3], [150, -10], [141, -9]],
];
const MAP_LAT: [number, number] = [72, -58];
const MAP_W = 4.4;
const MAP_H = 1.5;
const MAP_Y = 1.72;
const mapXY = (lon: number, lat: number, W: number, H: number): [number, number] => [((lon + 180) / 360) * W, ((MAP_LAT[0] - lat) / (MAP_LAT[0] - MAP_LAT[1])) * H];
const trackLat = (lon: number) => 32 * Math.sin(((lon + 40) * Math.PI) / 180);

const mapTex = () =>
  canvasTexture(1024, 350, (ctx) => {
    const W = 1024;
    const H = 350;
    ctx.fillStyle = vgrad(ctx, H, [
      [0, "#16524a"],
      [0.5, "#1c6658"],
      [1, "#144840"],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(190,240,200,0.18)";
    ctx.lineWidth = 1.5;
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = mapXY(lon, 0, W, H);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = mapXY(0, lat, W, H);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (const poly of LAND) {
      ctx.beginPath();
      poly.forEach(([lon, lat], i) => {
        const [x, y] = mapXY(lon, lat, W, H);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = "#4fae72";
      ctx.fill();
      ctx.strokeStyle = "#c8f4d0";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    // Antarctic band
    ctx.fillStyle = "#4fae72";
    ctx.fillRect(0, H - 10, W, 10);
    // three passes of the ground track, the newest brightest
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k === 0 ? "#fff6c8" : `rgba(255,236,170,${0.55 - k * 0.15})`;
      ctx.lineWidth = k === 0 ? 4 : 2.5;
      ctx.setLineDash(k === 0 ? [] : [10, 8]);
      ctx.beginPath();
      for (let lon = -180; lon <= 180; lon += 3) {
        const [x, y] = mapXY(lon, 32 * Math.sin(((lon + 40 + k * 24) * Math.PI) / 180), W, H);
        if (lon === -180) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // tracking-station dots
    for (const [lon, lat] of [
      [-95, 30],
      [-81, 28],
      [-16, 28],
      [149, -35],
      [-4, 40],
      [-157, 21],
      [116, -31],
    ]) {
      const [x, y] = mapXY(lon, lat, W, H);
      ctx.fillStyle = "#ffcf5a";
      ctx.fillRect(x - 4, y - 4, 8, 8);
    }
  });

// Plot screens at the far sides: white curves on blue graph paper.
const plotTex = (seed: number) =>
  canvasTexture(256, 320, (ctx) => {
    ctx.fillStyle = "#12376e";
    ctx.fillRect(0, 0, 256, 320);
    ctx.strokeStyle = "rgba(160,200,255,0.25)";
    ctx.lineWidth = 1;
    for (let k = 0; k <= 256; k += 32) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k, 320);
      ctx.stroke();
    }
    for (let k = 0; k <= 320; k += 32) {
      ctx.beginPath();
      ctx.moveTo(0, k);
      ctx.lineTo(256, k);
      ctx.stroke();
    }
    ctx.strokeStyle = "#f0f6ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 4) {
      const y = 280 - x * 0.9 + Math.sin(x * 0.05 + seed) * 30 * (1 - x / 300);
      if (x) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#ffcf5a";
    ctx.beginPath();
    ctx.arc(128, 160, 70 + seed * 6, 0.3, 4.2);
    ctx.stroke();
  });

// Seven-segment digits drawn as rectangles.
const SEG: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg" };
const sevenSeg = (ctx: CanvasRenderingContext2D, text: string, x0: number, y: number, w: number, h: number) => {
  const t = Math.max(3, w * 0.18);
  const hh = h / 2;
  let x = x0;
  for (const ch of text) {
    if (ch === ":") {
      ctx.fillStyle = "#ff3a1e";
      ctx.fillRect(x + 2, y + h * 0.28, t, t);
      ctx.fillRect(x + 2, y + h * 0.66, t, t);
      x += t + 8;
      continue;
    }
    const segs: Record<string, [number, number, number, number]> = {
      a: [x + t, y, w - 2 * t, t],
      b: [x + w - t, y + t, t, hh - t * 1.5],
      c: [x + w - t, y + hh + t * 0.5, t, hh - t * 1.5],
      d: [x + t, y + h - t, w - 2 * t, t],
      e: [x, y + hh + t * 0.5, t, hh - t * 1.5],
      f: [x, y + t, t, hh - t * 1.5],
      g: [x + t, y + hh - t / 2, w - 2 * t, t],
    };
    const on = SEG[ch] ?? "";
    for (const s of "abcdefg") {
      ctx.fillStyle = on.includes(s) ? "#ff3a1e" : "rgba(90,14,8,0.55)";
      const [a, b, c, d] = segs[s];
      ctx.fillRect(a, b, c, d);
    }
    x += w + 8;
  }
};
const pad = (n: number, k = 2) => String(Math.floor(n)).padStart(k, "0");
const clockStrings = (sec: number) => {
  const met = 170 * 3600 + 21 * 60 + 42 + sec; // mission elapsed time: the fall is at about 170:22:08 (ALSJ transcript)
  return [
    "EVA-3",
    `${pad(met / 3600, 3)}:${pad((met / 60) % 60)}:${pad(met % 60)}`,
    "",
  ];
};
const clockTex = (sec: number) =>
  canvasTexture(1024, 96, (ctx) => {
    ctx.fillStyle = "#0a0505";
    ctx.fillRect(0, 0, 1024, 96);
    const [a, b, c] = clockStrings(sec);
    for (const [x, s] of [
      [24, a],
      [390, b],
      [770, c],
    ] as [number, string][]) {
      ctx.fillStyle = "#1a0b08";
      ctx.fillRect(x - 12, 8, s.length * 30 + 8, 80);
      sevenSeg(ctx, s, x, 18, 26, 60);
    }
  });

// ---------- the TV picture ----------

const TV_W = 320;
const TV_H = 240;
const drawTV = (ctx: CanvasRenderingContext2D, tv: number, frame: number) => {
  const W = TV_W;
  const H = TV_H;
  ctx.fillStyle = "#060606";
  ctx.fillRect(0, 0, W, H);
  const hz = H * 0.52;
  // ground with a soft rolling horizon and a far hill
  ctx.fillStyle = "#5c5955";
  ctx.beginPath();
  ctx.ellipse(W * 0.82, hz + 6, 90, 16, 0, Math.PI, 0);
  ctx.fill();
  const g = ctx.createLinearGradient(0, hz, 0, H);
  g.addColorStop(0, "#6e6a65");
  g.addColorStop(1, "#aaa59d");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, hz + 8);
  ctx.quadraticCurveTo(W * 0.4, hz - 3, W, hz + 6);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  // craters and rocks with hard shadows
  for (let i = 0; i < 7; i++) {
    const x = rand(i, 91) * W;
    const y = hz + 14 + rand(i, 92) * (H - hz - 20);
    const r = 4 + rand(i, 93) * 10 * ((y - hz) / (H - hz));
    ctx.fillStyle = "rgba(40,38,36,0.55)";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.6, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220,215,205,0.5)";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.3, y + r * 0.15, r * 1.2, r * 0.25, 0, 0, Math.PI);
    ctx.fill();
  }
  // a little rover at the left for context
  ctx.fillStyle = "#8c8a86";
  ctx.fillRect(24, hz + 12, 44, 8);
  ctx.fillStyle = "#2a2a2a";
  for (const x of [28, 62]) {
    ctx.beginPath();
    ctx.arc(x, hz + 22, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d8d6d0";
  ctx.beginPath();
  ctx.ellipse(40, hz - 4, 9, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(39, hz - 2, 2, 14);

  // the astronaut: a hop, then tipping over backward onto the backpack
  const cx = W * 0.54;
  const gy = H * 0.82;
  const hop = tv < 0.55 ? Math.sin(Math.PI * clamp01(tv / 0.55)) * 30 : 0;
  const fall = easeIn(ramp(tv, 0.32, 0.86));
  const bounce = tv > 0.86 ? Math.sin(ramp(tv, 0.86, 1) * Math.PI) * 0.07 : 0;
  const ang = fall * (Math.PI / 2) - bounce;
  const s = 0.62;
  // shadow on the ground
  ctx.fillStyle = "rgba(10,10,10,0.6)";
  ctx.beginPath();
  ctx.ellipse(cx - 6 - fall * 30, gy + 2, 16 + fall * 22 - hop * 0.2, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, gy - hop - Math.sin(ang) * 22 * s);
  ctx.rotate(-ang);
  ctx.scale(s, s);
  const suit = "#e9e8e2";
  const shade = "#b9b8b2";
  const arm = 0.25 + fall * 2.0 + Math.sin(frame * 0.5) * 0.15 * fall * (1 - ramp(tv, 0.9, 1));
  // backpack (on his back, the -x side) and the small pack on top
  ctx.fillStyle = shade;
  ctx.fillRect(-30, -86, 18, 50);
  ctx.fillStyle = "#d4d3cc";
  ctx.fillRect(-27, -98, 13, 13);
  // legs and boots
  ctx.fillStyle = suit;
  ctx.fillRect(-11, -40, 9, 38);
  ctx.fillRect(2, -40, 9, 38);
  ctx.fillStyle = "#4a4a48";
  ctx.fillRect(-12, -6, 11, 6);
  ctx.fillRect(1, -6, 13, 6);
  // far arm
  const drawArm = (a: number, x: number) => {
    ctx.save();
    ctx.translate(x, -70);
    ctx.rotate(-a);
    ctx.fillStyle = suit;
    ctx.fillRect(-4, 0, 8, 30);
    ctx.fillStyle = "#cfcec8";
    ctx.fillRect(-5, 28, 10, 7);
    ctx.restore();
  };
  drawArm(arm * 0.8, -6);
  // torso
  ctx.fillStyle = suit;
  ctx.fillRect(-14, -78, 28, 42);
  ctx.fillStyle = shade;
  ctx.fillRect(-6, -62, 14, 8);
  // helmet with a dark visor facing +x
  ctx.fillStyle = suit;
  ctx.beginPath();
  ctx.arc(0, -90, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#262626";
  ctx.beginPath();
  ctx.ellipse(5, -90, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(6, -96, 2, 5);
  drawArm(arm, 6);
  ctx.restore();
  // dust kicked up on the landing
  const puff = ramp(tv, 0.84, 1);
  if (puff > 0 && puff < 1) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(190,185,176,${0.45 * (1 - puff)})`;
      ctx.beginPath();
      ctx.ellipse(cx - 40 + (rand(i, 95) - 0.3) * 70 * puff, gy - 4 - rand(i, 96) * 14 * puff, 6 + puff * 10, 3 + puff * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // the TV look: rolling bar, scan lines, grain, vignette
  const bar = ((frame * 2.2) % (H + 60)) - 30;
  const rb = ctx.createLinearGradient(0, bar - 30, 0, bar + 30);
  rb.addColorStop(0, "rgba(255,255,255,0)");
  rb.addColorStop(0.5, "rgba(255,255,255,0.08)");
  rb.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rb;
  ctx.fillRect(0, bar - 30, W, 60);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  for (let i = 0; i < 1400; i++) {
    const v = rand(i, frame * 3 + 1);
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.5})` : `rgba(0,0,0,${(0.5 - v) * 0.6})`;
    ctx.fillRect(rand(i, frame * 3 + 2) * W, rand(i, frame * 3 + 3) * H, 1.5, 1.5);
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
};

// ---------- props ----------

// A coffee mug on the console; `tip` 0..1 tips it over sideways (toward +x) and lets a small puddle spread.
export const CoffeeMug: React.FC<{ position: Vec3; tip?: number; frame?: number; color?: string }> = ({ position, tip = 0, frame = 0, color = "#e39a3a" }) => {
  const R = 0.042;
  const H = 0.095;
  const t = clamp01(tip);
  const over = t < 0.7 ? easeIn(t / 0.7) : 1 + 0.06 * Math.sin(((t - 0.7) / 0.3) * Math.PI * 2) * (1 - (t - 0.7) / 0.3);
  const a = over * (Math.PI / 2);
  const spill = easeOut(ramp(t, 0.5, 1));
  const steam = 1 - ramp(t, 0, 0.2);
  return (
    <group position={position}>
      <group position={[R, 0, 0]} rotation={[0, 0, -a]}>
        <group position={[-R, 0, 0]}>
          <InkCylinder radius={R} height={H} position={[0, H / 2, 0]} color={color} ink={0.006} />
          <mesh position={[0, H + 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[R - 0.006, 24]} />
            <meshBasicMaterial color="#3a2010" />
          </mesh>
          <mesh position={[0, H + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[R - 0.006, R, 24]} />
            <meshToonMaterial color="#f4ead8" gradientMap={toonRamp} />
          </mesh>
          <mesh position={[-R + 0.002, H * 0.52, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.026, 0.008, 8, 16, Math.PI]} />
            <meshToonMaterial color={color} gradientMap={toonRamp} />
          </mesh>
          {/* a stripe round the mug */}
          <mesh position={[0, H * 0.7, 0]}>
            <cylinderGeometry args={[R + 0.0015, R + 0.0015, 0.012, 24, 1, true]} />
            <meshToonMaterial color="#f6f0e2" gradientMap={toonRamp} />
          </mesh>
        </group>
      </group>
      {spill > 0 && (
        <group position={[R + H * 0.75 + spill * 0.04, 0.002, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1 + spill * 0.9, 0.7 + spill * 0.5, 1]}>
            <circleGeometry args={[0.035 + spill * 0.035, 28]} />
            <meshToonMaterial color="#4a2812" gradientMap={toonRamp} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
          </mesh>
          <mesh position={[0.03 * spill, 0.0008, 0.012]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.012 * spill + 0.004, 16]} />
            <meshBasicMaterial color="#a8724a" polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
          </mesh>
        </group>
      )}
      {steam > 0 && (
        <group userData={{ ghost: true }}>
          {[0, 1, 2].map((i) => {
            const k = ((frame * 0.02 + i / 3) % 1 + 1) % 1;
            return (
              <mesh key={i} position={[Math.sin(k * 5 + i) * 0.012, H + 0.02 + k * 0.12, 0]} scale={0.012 + k * 0.02}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshBasicMaterial color="#e8f0ee" transparent opacity={0.28 * (1 - k) * steam} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// A 1970s swivel chair (seat top at 0.34) in burnt-orange vinyl; `yaw` π faces it toward -z.
const SwivelChair: React.FC<{ position: Vec3; yaw?: number; color?: string }> = ({ position, yaw = 0, color = "#b8612e" }) => (
  <group position={position} rotation={[0, yaw, 0]}>
    {Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      return (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[0.13, 0.04, 0]} castShadow>
            <boxGeometry args={[0.26, 0.025, 0.035]} />
            <meshToonMaterial color="#8e9694" gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0.25, 0.022, 0]}>
            <sphereGeometry args={[0.022, 10, 8]} />
            <meshToonMaterial color="#222" gradientMap={toonRamp} />
          </mesh>
        </group>
      );
    })}
    <InkCylinder radius={0.024} height={0.22} position={[0, 0.15, 0]} color="#a8b0ae" ink={0.006} />
    <RBox size={[0.44, 0.08, 0.42]} r={0.035} position={[0, 0.3, 0]} color={color} />
    <mesh position={[0, 0.44, -0.2]} castShadow>
      <boxGeometry args={[0.05, 0.2, 0.03]} />
      <meshToonMaterial color="#8e9694" gradientMap={toonRamp} />
    </mesh>
    <RBox size={[0.42, 0.4, 0.07]} r={0.035} position={[0, 0.62, -0.23]} rotation={[-0.08, 0, 0]} color={color} />
  </group>
);

type Tex = { face: THREE.Texture; crt: THREE.Texture[] };

// A CRT monitor: a bulging rounded housing with a glowing screen on its front (+z) face.
const Crt: React.FC<{ position: Vec3; rotation?: Vec3; size?: [number, number]; tex: THREE.Texture; flick: number }> = ({ position, rotation, size = [0.28, 0.22], tex, flick }) => {
  const [w, h] = size;
  return (
    <group position={position} rotation={rotation}>
      <RBox size={[w + 0.07, h + 0.07, 0.2]} r={0.035} position={[0, 0, -0.08]} color="#5f6e64" />
      <RBox size={[w * 0.7, h * 0.7, 0.16]} r={0.05} position={[0, 0, -0.22]} color="#55635a" ink={0.008} />
      <mesh position={[0, 0, 0.024]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} color={new THREE.Color("#d8ffe6").multiplyScalar(flick)} toneMapped={false} />
      </mesh>
      {/* glass sheen */}
      <mesh position={[-w * 0.18, h * 0.18, 0.027]} rotation={[0, 0, 0.5]}>
        <planeGeometry args={[w * 0.12, h * 0.9]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <Halo position={[0, 0, 0.03]} size={w * 2.4} color="#7dffb8" strength={0.18 * flick} />
    </group>
  );
};

// One console bay of a back row: cabinet, writing shelf, and a slanted bezel with CRTs, all facing +z.
const ConsoleBay: React.FC<{ position: Vec3; w?: number; crts: number[]; seed: number; frame: number; tex: Tex }> = ({ position, w = 1.0, crts, seed, frame, tex }) => {
  const flick = crtFlicker(frame + seed * 7);
  return (
    <group position={position}>
      <RBox size={[w, 0.55, 0.5]} r={0.04} position={[0, 0.275, 0]} color="#ffffff" map={tex.face} />
      <RBox size={[w + 0.04, 0.04, 0.26]} r={0.015} position={[0, 0.57, 0.3]} color="#7d8b80" />
      <Lamps position={[0, 0.592, 0.3]} rotation={[-Math.PI / 2, 0, 0]} count={10} step={0.07} rows={2} rowStep={0.05} seed={seed} frame={frame} />
      <group position={[0, 0.78, -0.06]} rotation={[-0.32, 0, 0]}>
        <RBox size={[w, 0.4, 0.22]} r={0.04} color="#8a998d" />
        {crts.map((x, i) => (
          <group key={i} position={[x, 0.03, 0.111]}>
            <mesh position={[0, 0, 0.002]}>
              <planeGeometry args={[0.3, 0.24]} />
              <meshBasicMaterial color="#1a221d" />
            </mesh>
            <mesh position={[0, 0, 0.005]}>
              <planeGeometry args={[0.26, 0.2]} />
              <meshBasicMaterial map={tex.crt[(seed + i) % tex.crt.length]} color={new THREE.Color("#d8ffe6").multiplyScalar(flick)} toneMapped={false} />
            </mesh>
            <Halo position={[0, 0, 0.012]} size={0.6} color="#7dffb8" strength={0.16 * flick} />
          </group>
        ))}
        <Lamps position={[0, -0.155, 0.113]} count={14} step={0.06} seed={seed + 50} frame={frame} />
      </group>
    </group>
  );
};

// A hand-held flag on a pole with a crossbar, rippling softly. `draw` paints the cloth (w x h px canvas).
export const WavingFlag: React.FC<{
  position: Vec3;
  size: [number, number];
  frame: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  pole?: number; // pole height below the cloth's top edge
  amp?: number;
  speed?: number;
  hang?: boolean; // hang from a crossbar (indoors) instead of flying out
  yaw?: number;
  seed?: number;
}> = ({ position, size, frame, draw, pole = 2, amp = 0.05, speed = 0.12, hang = false, yaw = 0, seed = 0 }) => {
  const [w, h] = size;
  const tex = useOwned(() => canvasTexture(256, Math.round((256 * h) / w), (ctx) => draw(ctx, 256, Math.round((256 * h) / w))), [w, h, draw]);
  const geo = useOwned(() => new THREE.PlaneGeometry(w, h, 20, 10), [w, h]);
  const ref = useRef<THREE.Mesh>(null);
  useLayoutEffect(() => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = (i % 21) / 20; // 0 at the pole
      const v = Math.floor(i / 21) / 10; // 0 at the top
      const x = u * w;
      const y = -v * h;
      const ph = frame * speed + seed;
      const k = hang ? 0.35 + 0.65 * v : u;
      const z = amp * k * (Math.sin(x * 5.5 - ph * 2) + 0.45 * Math.sin(x * 9 + y * 3 - ph * 3.1));
      const droop = hang ? 0 : -amp * 0.6 * u * u;
      pos.setXYZ(i, x, y + droop, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <InkCylinder radius={0.018} height={pole + h * 0.3} position={[-0.02, -(pole + h * 0.3) / 2 + h * 0.3, 0]} color="#c9b98a" ink={0.006} />
      <mesh position={[-0.02, h * 0.3 + 0.03, 0]}>
        <sphereGeometry args={[0.035, 12, 10]} />
        <meshToonMaterial color="#e0c060" gradientMap={toonRamp} />
      </mesh>
      {hang && (
        <mesh position={[w / 2, 0.012, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, w + 0.04, 8]} />
          <meshToonMaterial color="#c9b98a" gradientMap={toonRamp} />
        </mesh>
      )}
      <mesh ref={ref} geometry={geo} castShadow>
        <meshToonMaterial map={tex} gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const drawStripes = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 ? "#f4efe4" : "#c23a32";
    ctx.fillRect(0, (i * h) / 13, w, h / 13 + 1);
  }
  ctx.fillStyle = "#2c3e78";
  ctx.fillRect(0, 0, w * 0.42, (h * 7) / 13);
  ctx.fillStyle = "#f4efe4";
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 6; c++) {
      ctx.beginPath();
      ctx.arc(10 + c * 17 + (r % 2) * 6, 10 + r * 13, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
};

// Cigarette smoke curling up from an ashtray (1972).
const SmokeWisp: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: 8 }, (_, i) => {
      const k = ((frame * 0.009 + i / 8) % 1 + 1) % 1;
      return (
        <mesh key={i} position={[Math.sin(k * 7 + i * 0.7) * 0.04 * k + k * 0.05, 0.02 + k * 0.6, Math.cos(k * 5 + i) * 0.02 * k]} scale={0.008 + k * 0.05}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#cdd8d6" transparent opacity={0.26 * Math.sin(Math.PI * k)} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);

// A soft cone of hazy light under a ceiling spot, with dust motes drifting down it.
const Shaft: React.FC<{ position: Vec3; height: number; frame: number; seed: number; color?: string }> = ({ position, height, frame, seed, color = "#ffbe6a" }) => (
  <group position={position} userData={{ ghost: true }}>
    <mesh position={[0, -height / 2, 0]}>
      <cylinderGeometry args={[0.09, 0.75, height, 32, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.045} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh position={[0, -height * 0.3, 0]}>
      <cylinderGeometry args={[0.07, 0.35, height * 0.6, 24, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.04} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
    {Array.from({ length: 10 }, (_, i) => {
      const k = ((frame * 0.0035 + rand(i, seed)) % 1 + 1) % 1;
      const r = 0.06 + k * 0.5 * rand(i, seed + 1);
      const a = rand(i, seed + 2) * 6.28 + frame * 0.01;
      return (
        <mesh key={i} position={[Math.cos(a) * r, -k * height, Math.sin(a) * r]}>
          <sphereGeometry args={[0.006, 6, 4]} />
          <meshBasicMaterial color="#ffe2b0" transparent opacity={0.7 * Math.sin(Math.PI * k)} depthWrite={false} toneMapped={false} />
        </mesh>
      );
    })}
  </group>
);

// ---------- the set ----------

export const HoustonSet: React.FC<{ camera: CameraShot; frame: number; tv?: number; children?: React.ReactNode }> = ({ camera, frame, tv, children }) => {
  const faces = [useOwned(() => consoleFaceTex(1)), useOwned(() => consoleFaceTex(2)), useOwned(() => consoleFaceTex(3))];
  const crts = [useOwned(() => crtTex(1)), useOwned(() => crtTex(2)), useOwned(() => crtTex(3)), useOwned(() => crtTex(4))];
  // teletype-style scrolling: each text variant steps up a line at its own pace
  crts.forEach((t, i) => {
    t.offset.y = Math.floor((frame + i * 17) / (9 + i * 4)) * (12.6 / 256);
  });
  const top = useOwned(consoleTopTex);
  const carpet = useOwned(carpetTex);
  const wall = useOwned(wallTex);
  const ceil = useOwned(ceilingTex);
  const map = useOwned(mapTex);
  const plots = [useOwned(() => plotTex(1)), useOwned(() => plotTex(4))];
  const sec = Math.floor(frame / 30);
  const clocks = useOwned(() => clockTex(sec), [sec]);
  const tvk = tv ?? 0;
  const tvTex = useOwned(() => canvasTexture(TV_W, TV_H, (ctx) => drawTV(ctx, tvk, frame)), [Math.round(tvk * 60), frame]);
  const flick = crtFlicker(frame);
  const tex = (i: number): Tex => ({ face: faces[i % faces.length], crt: crts });

  // the craft's dot along the ground track on the map
  const lon = ((frame * 0.35 + 40) % 360) - 180;
  const lat = trackLat(lon);
  const dot: Vec3 = [(lon / 360) * MAP_W, MAP_Y + MAP_H / 2 - ((MAP_LAT[0] - lat) / (MAP_LAT[0] - MAP_LAT[1])) * MAP_H, WALL_Z + 0.125];
  const dotPulse = 0.75 + 0.25 * Math.sin(frame * 0.3);

  const row2 = useMemo(() => [-2.1, -1.05, 0, 1.05, 2.1], []);
  const row3 = useMemo(() => [-2.6, -1.55, -0.5, 0.55, 1.6, 2.65], []);

  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#0b1416"]} />
      <fog attach="fog" args={["#0f1d1e", 7, 22]} />
      <ambientLight intensity={0.55} color="#6f9c96" />
      <hemisphereLight args={["#7fb4aa", "#3a2618", 0.5]} />
      <directionalLight
        position={[-1.5, 6, 4]}
        intensity={1.15}
        color="#ffc27a"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />
      {/* screen glows and warm spots */}
      <pointLight position={[0, 1.8, -2.2]} intensity={4.5} distance={6} color="#c8f0d0" />
      <pointLight position={[-2.0, 1.8, -2.4]} intensity={3} distance={5} color="#4a8cff" />
      <pointLight position={[2.0, 1.8, -2.4]} intensity={3} distance={5} color="#4a8cff" />
      <pointLight position={[0, 0.8, 1.02]} intensity={0.6 * flick} distance={1.0} color="#7dffc0" />
      <pointLight position={[0, 3.1, 1.1]} intensity={3.2} distance={4} color="#ffb056" />
      <pointLight position={[-1.6, 3.1, -0.9]} intensity={2.4} distance={4} color="#ffb056" />
      <pointLight position={[1.6, 3.1, -0.9]} intensity={2.4} distance={4} color="#ffb056" />
      <pointLight position={[-3.2, 2.3, 0.5]} intensity={2.5} distance={3.5} color="#ffa040" />

      {/* ---------- floor tiers ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (TIER2.z + ROOM.back) / 2]} receiveShadow>
        <planeGeometry args={[ROOM.half * 2, ROOM.back - TIER2.z]} />
        <meshToonMaterial color="#ffffff" map={carpet} gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TIER2.y, (TIER2.z + TIER3.z) / 2]} receiveShadow>
        <planeGeometry args={[ROOM.half * 2, TIER2.z - TIER3.z]} />
        <meshToonMaterial color="#e8eeee" map={carpet} gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TIER3.y, (TIER3.z + WALL_Z) / 2]} receiveShadow>
        <planeGeometry args={[ROOM.half * 2, TIER3.z - WALL_Z]} />
        <meshToonMaterial color="#d8e0e0" map={carpet} gradientMap={toonRamp} />
      </mesh>
      {/* risers with warm nosing strips along the step edges */}
      {[TIER2, TIER3].map((t, i) => {
        const above = i === 0 ? 0 : TIER2.y;
        return (
          <group key={i}>
            <mesh position={[0, (above + t.y) / 2, t.z - 0.001]}>
              <planeGeometry args={[ROOM.half * 2, above - t.y]} />
              <meshToonMaterial color="#26302f" gradientMap={toonRamp} />
            </mesh>
            <mesh position={[0, above + 0.003, t.z + 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[ROOM.half * 2, 0.04]} />
              <meshBasicMaterial color={new THREE.Color("#ffb04a").multiplyScalar(1.3)} toneMapped={false} />
            </mesh>
          </group>
        );
      })}

      {/* ---------- walls and ceiling ---------- */}
      <mesh position={[0, (TIER3.y + ROOM.ceil) / 2, WALL_Z]} receiveShadow>
        <planeGeometry args={[ROOM.half * 2, ROOM.ceil - TIER3.y]} />
        <meshToonMaterial color="#ffffff" map={wall} gradientMap={toonRamp} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * ROOM.half, (TIER3.y + ROOM.ceil) / 2, (WALL_Z + ROOM.back) / 2]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[ROOM.back - WALL_Z, ROOM.ceil - TIER3.y]} />
          <meshToonMaterial color="#d8e4e2" map={wall} gradientMap={toonRamp} />
        </mesh>
      ))}
      <mesh position={[0, ROOM.ceil, (WALL_Z + ROOM.back) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.half * 2, ROOM.back - WALL_Z]} />
        <meshToonMaterial color="#ffffff" map={ceil} gradientMap={toonRamp} />
      </mesh>
      {/* soffit over the screens and recessed amber spots */}
      <RBox size={[ROOM.half * 2, 0.3, 0.6]} r={0.05} position={[0, ROOM.ceil - 0.15, WALL_Z + 0.3]} color="#2c3836" ink={0} />
      {[-2.4, -1.2, 0, 1.2, 2.4].map((x) => (
        <group key={x} position={[x, ROOM.ceil - 0.302, WALL_Z + 0.42]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.07, 20]} />
            <meshBasicMaterial color={new THREE.Color("#ffc070").multiplyScalar(2.6)} toneMapped={false} />
          </mesh>
          <Halo position={[0, -0.04, 0.02]} size={0.5} color="#ffb056" strength={0.5} />
        </group>
      ))}
      {[
        [-1.6, -0.9],
        [1.6, -0.9],
        [0, 1.1],
        [-2.4, 1.6],
        [2.4, 1.6],
        [0, -2.0],
      ].map(([x, z], i) => (
        <group key={i} position={[x, ROOM.ceil - 0.004, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.1, 24]} />
            <meshBasicMaterial color={new THREE.Color("#ffc070").multiplyScalar(2.4)} toneMapped={false} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
            <ringGeometry args={[0.1, 0.13, 24]} />
            <meshBasicMaterial color="#3a4442" />
          </mesh>
        </group>
      ))}
      <Shaft position={[-1.6, ROOM.ceil, -0.9]} height={ROOM.ceil - TIER2.y} frame={frame} seed={1} />
      <Shaft position={[1.6, ROOM.ceil, -0.9]} height={ROOM.ceil - TIER2.y} frame={frame} seed={2} />

      {/* viewing room high on the left wall: warm glass with a few onlookers */}
      <group position={[-ROOM.half + 0.02, 2.3, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <RBox size={[3.8, 1.05, 0.12]} r={0.04} position={[0, 0, -0.04]} color="#2a3432" />
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[3.6, 0.85]} />
          <meshBasicMaterial color={new THREE.Color("#ffb766").multiplyScalar(0.95)} toneMapped={false} />
        </mesh>
        {[-1.2, -0.4, 0.5, 1.3].map((x, i) => (
          <mesh key={i} position={[x, -0.18 + rand(i, 7) * 0.06, 0.035]}>
            <circleGeometry args={[0.1, 18]} />
            <meshBasicMaterial color="#6a3c1c" />
          </mesh>
        ))}
        {[-0.9, 0, 0.9].map((x) => (
          <mesh key={x} position={[x, 0, 0.04]}>
            <planeGeometry args={[0.05, 0.85]} />
            <meshBasicMaterial color="#2a3432" />
          </mesh>
        ))}
        <mesh position={[0.6, 0.1, 0.045]} rotation={[0, 0, 0.6]}>
          <planeGeometry args={[0.18, 1.0]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      </group>

      {/* ---------- front wall: map, TV, clocks, plots, flag ---------- */}
      <RBox size={[MAP_W + 0.16, MAP_H + 0.16, 0.1]} r={0.04} position={[0, MAP_Y, WALL_Z + 0.06]} color="#2a3232" />
      <mesh position={[0, MAP_Y, WALL_Z + 0.115]}>
        <planeGeometry args={[MAP_W, MAP_H]} />
        <meshBasicMaterial map={map} color="#e8f0ff" toneMapped={false} />
      </mesh>
      <group position={dot}>
        <mesh>
          <circleGeometry args={[0.03, 20]} />
          <meshBasicMaterial color={new THREE.Color("#fff4c0").multiplyScalar(1.8 * dotPulse)} toneMapped={false} />
        </mesh>
        <Halo position={[0, 0, 0.005]} size={0.3} color="#ffe08a" strength={0.6 * dotPulse} />
      </group>
      <Halo position={[0, MAP_Y, WALL_Z + 0.2]} size={6} color="#2a6cff" strength={0.12} />
      {/* event-light panel under the map: two rows of status lamps */}
      <RBox size={[MAP_W + 0.16, 0.2, 0.08]} r={0.03} position={[0, MAP_Y - MAP_H / 2 - 0.2, WALL_Z + 0.05]} color="#3a4644" />
      <Lamps position={[0, MAP_Y - MAP_H / 2 - 0.16, WALL_Z + 0.091]} count={60} step={0.072} rows={2} rowStep={0.07} seed={70} frame={frame} size={0.03} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 2.95, 1.75, WALL_Z + 0.06]}>
          <RBox size={[1.0, 1.24, 0.1]} r={0.04} color="#2a3232" />
          <mesh position={[0, 0, 0.056]}>
            <planeGeometry args={[0.88, 1.1]} />
            <meshBasicMaterial map={plots[s < 0 ? 0 : 1]} color="#e8f0ff" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* clock strip */}
      <RBox size={[4.95, 0.42, 0.1]} r={0.04} position={[0, 2.78, WALL_Z + 0.06]} color="#1e2424" />
      <mesh position={[0, 2.78, WALL_Z + 0.115]}>
        <planeGeometry args={[4.8, 0.36]} />
        <meshBasicMaterial map={clocks} color={new THREE.Color(1.45, 1.45, 1.45)} toneMapped={false} />
      </mesh>
      <Halo position={[0, 2.78, WALL_Z + 0.16]} size={3} color="#ff4020" strength={0.1} />
      {/* the TV: a bulky set hung in front of the map on two struts */}
      <group position={[HOUSTON.tv[0], HOUSTON.tv[1], HOUSTON.tv[2]]}>
        {[-0.4, 0.4].map((x) => (
          <mesh key={x} position={[x, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.3, 10]} />
            <meshToonMaterial color="#4a5452" gradientMap={toonRamp} />
          </mesh>
        ))}
        <RBox size={[HOUSTON.tvSize[0] + 0.16, HOUSTON.tvSize[1] + 0.16, 0.34]} r={0.06} position={[0, 0, -0.19]} color="#4c5654" />
        <RBox size={[HOUSTON.tvSize[0] * 0.7, HOUSTON.tvSize[1] * 0.7, 0.2]} r={0.08} position={[0, 0, -0.4]} color="#424a48" ink={0.008} />
        <mesh position={[0, 0, -0.016]}>
          <planeGeometry args={[HOUSTON.tvSize[0] + 0.05, HOUSTON.tvSize[1] + 0.05]} />
          <meshBasicMaterial color="#0c0f0f" />
        </mesh>
        <mesh>
          <planeGeometry args={HOUSTON.tvSize} />
          <meshBasicMaterial map={tvTex} color="#dde8ee" toneMapped={false} />
        </mesh>
        <mesh position={[-0.3, 0.18, 0.004]} rotation={[0, 0, 0.55]}>
          <planeGeometry args={[0.1, 0.9]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.05} depthWrite={false} />
        </mesh>
        <Halo position={[0, 0, 0.02]} size={2.2} color="#b8d8ff" strength={0.16} />
        {/* a small red "on air" lamp on the frame */}
        <mesh position={[0.6, -0.47, 0.0]}>
          <sphereGeometry args={[0.022, 12, 10]} />
          <meshBasicMaterial color={new THREE.Color("#ff3020").multiplyScalar(frame % 40 < 28 ? 2.4 : 0.4)} toneMapped={false} />
        </mesh>
      </group>
      <WavingFlag position={[-1.05, 2.25, WALL_Z + 0.22]} size={[0.72, 0.46]} frame={frame} draw={drawStripes} pole={2.75} amp={0.018} speed={0.05} hang />

      {/* ---------- tier 3: the trench row under the screens ---------- */}
      {row3.map((x, i) => (
        <ConsoleBay key={`r3${i}`} position={[x, TIER3.y, -2.62]} crts={i % 2 ? [-0.24, 0.24] : [0]} seed={30 + i} frame={frame} tex={tex(i)} />
      ))}
      {[-1.6, 0.55, 2.15].map((x, i) => (
        <SwivelChair key={`c3${i}`} position={[x, TIER3.y, -1.95]} yaw={Math.PI + (rand(i, 3) - 0.5) * 0.6} color="#7a8a84" />
      ))}

      {/* ---------- tier 2 ---------- */}
      {row2.map((x, i) => (
        <ConsoleBay key={`r2${i}`} position={[x, TIER2.y, -1.32]} crts={x === 0 ? [0] : [-0.24, 0.24]} seed={10 + i} frame={frame} tex={tex(i + 1)} />
      ))}
      {[-2.2, -1.25, 1.3, 2.2].map((x, i) => (
        <SwivelChair key={`c2${i}`} position={[x, TIER2.y, -0.7]} yaw={Math.PI + (rand(i, 5) - 0.5) * 0.7} color={i % 2 ? "#b8612e" : "#7a8a84"} />
      ))}
      {/* a jacket over a chair, a headset on a console */}
      <RBox size={[0.4, 0.3, 0.05]} r={0.02} position={[-1.25, TIER2.y + 0.6, -0.5]} rotation={[0.15, 0, 0.05]} color="#5a6a8a" ink={0.006} />
      <mesh position={[1.3, TIER2.y + 0.61, -1.0]} rotation={[0, 0.3, 0]}>
        <torusGeometry args={[0.07, 0.008, 6, 20, Math.PI]} />
        <meshToonMaterial color="#222" gradientMap={toonRamp} />
      </mesh>

      {/* ---------- hero tier: the console in front of the two seats ---------- */}
      <group>
        <RBox size={[2.5, 0.41, 0.32]} r={0.04} position={[0, 0.205, (HOUSTON.consoleZ[0] + HOUSTON.consoleZ[1]) / 2]} color="#ffffff" map={faces[0]} />
        <RBox size={[2.58, 0.035, 0.38]} r={0.012} position={[0, HOUSTON.consoleTop - 0.0175, (HOUSTON.consoleZ[0] + HOUSTON.consoleZ[1]) / 2]} color="#ffffff" map={top} ink={0.008} />
        {/* lamp strip on the face toward the camera, and a lit button cluster on the top between the seats */}
        <Lamps position={[0, 0.33, HOUSTON.consoleZ[1] + 0.003]} count={34} step={0.068} seed={1} frame={frame} />
        <Lamps position={[0, 0.3, HOUSTON.consoleZ[1] + 0.003]} count={34} step={0.068} seed={2} frame={frame} size={0.012} />
        <Lamps position={[0, HOUSTON.consoleTop + 0.001, 1.2]} rotation={[-Math.PI / 2, 0, 0]} count={6} step={0.04} rows={3} rowStep={0.035} seed={3} frame={frame} />
        {/* CRTs at both ends, turned in toward the seats */}
        <Crt position={[-0.92, HOUSTON.consoleTop + 0.14, 1.28]} rotation={[0, Math.PI / 2 + 0.35, 0]} tex={crts[0]} flick={flick} />
        <Crt position={[0.95, HOUSTON.consoleTop + 0.14, 1.28]} rotation={[0, -Math.PI / 2 - 0.35, 0]} tex={crts[2]} flick={flick} />
        {/* papers, a binder, the ashtray with a smoking cigarette */}
        <RBox size={[0.21, 0.006, 0.28]} r={0.002} position={[-0.32, HOUSTON.consoleTop + 0.004, 1.27]} rotation={[0, 0.25, 0]} color="#f2ecd8" ink={0.003} shadows={false} />
        <RBox size={[0.21, 0.006, 0.28]} r={0.002} position={[-0.28, HOUSTON.consoleTop + 0.01, 1.28]} rotation={[0, 0.05, 0]} color="#fbf6e6" ink={0.003} shadows={false} />
        <RBox size={[0.24, 0.04, 0.3]} r={0.01} position={[0.3, HOUSTON.consoleTop + 0.02, 1.28]} rotation={[0, -0.2, 0]} color="#3e5a8a" ink={0.006} />
        <group position={[-0.68, HOUSTON.consoleTop, 1.3]}>
          <InkCylinder radius={0.05} height={0.022} position={[0, 0.011, 0]} color="#7a8e8a" ink={0.004} />
          <mesh position={[0.03, 0.026, 0]} rotation={[0, 0.4, Math.PI / 2 - 0.15]}>
            <cylinderGeometry args={[0.005, 0.005, 0.07, 8]} />
            <meshToonMaterial color="#f4f0e4" gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0.063, 0.031, -0.015]}>
            <sphereGeometry args={[0.0055, 8, 6]} />
            <meshBasicMaterial color={new THREE.Color("#ff6a20").multiplyScalar(1.6 + 0.6 * Math.sin(frame * 0.2))} toneMapped={false} />
          </mesh>
          <SmokeWisp position={[0.063, 0.03, -0.015]} frame={frame} />
        </group>
      </group>
      {HOUSTON.seats.map(([x, z], i) => (
        <SwivelChair key={`hero${i}`} position={[x, 0, z - 0.07]} />
      ))}
      {[-1.9, 1.9].map((x, i) => (
        <SwivelChair key={`side${i}`} position={[x, 0, 0.82]} yaw={(i ? -1 : 1) * 0.4} color="#7a8a84" />
      ))}
      {children}
    </>
  );
};
