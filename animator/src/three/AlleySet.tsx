import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo } from "./kit";
import { SmokePlume } from "./LakeSet";
import { MOODS } from "./moods";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import type { PuppetLight } from "../puppet/PuppetBillboard";
import { rand } from "../engine/helpers";

// Rainy night alley with a ramen stall, built from photo references (guide/references/rainy-alley.md).
// The alley runs away from the camera along -z between x = -1.3 (izakaya fronts) and x = 1.3 (a plain wall with
// a row of paper lanterns); floor y = 0. The stall (yatai) stands against the right wall at `STALL`: customers sit on
// its stools at `SEATS` (sit pose, side view facing +x), the cook stands behind it at `COOK` (side view facing -1).
// A car can creep down the alley toward the camera (`car` 0..1 along its path, lane x `CAR_X`). Wet ground carries
// every light as a long streak toward the camera. Light puppets with `alleyLight(frame, car)`.

type Vec3 = [number, number, number];
const INK = "#161212";
const JP_FONT = "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif";
const JP_SANS = "'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif";

export const ALLEY = { half: 1.3, end: -10.6 };
export const STALL = { x: 0.55, z: -0.5 };
export const SEATS: [number, number][] = [
  [-0.25, -1.05],
  [-0.25, -0.45],
  [-0.25, 0.15],
];
export const COOK: [number, number] = [1.07, -0.5];
export const CAR_X = -0.55;
const TUBE: Vec3 = [0.5, 1.92, STALL.z];
const STALL_LANTERN: Vec3 = [-0.02, 1.5, -1.62];

// The stall's fluorescent tube stutters now and then.
const tube = (frame: number) => (frame % 71 < 2 || frame % 71 === 4 ? 0.55 : 1);
// The car's nose (z) at progress p: rolls in from the cross street and eases to a stop short of the stall.
export const carZ = (p: number) => -12.5 + 8.6 * (1 - (1 - Math.min(1, Math.max(0, p))) ** 2);

// How the puppets are lit here (Stage `light`): the stall's hard white tube, and either its red lantern or, while a
// car is in the alley, the car's headlights. The night's blue only hints.
export const alleyLight = (frame: number, car?: number): PuppetLight => ({
  tint: "#7a80c8",
  shadow: 0.22,
  points: [
    { position: TUBE, color: "#fff2d8", strength: 3.4 * tube(frame), range: 1.3 },
    car === undefined
      ? { position: STALL_LANTERN, color: "#ff4a3a", strength: 2.4, range: 1.0 }
      : { position: [CAR_X, 0.65, carZ(car) + 1.3], color: "#eef4ff", strength: 5.5, range: 2.4 },
  ],
});

// ---------- textures ----------

// Black (or coloured) brush lettering written top to bottom.
const verticalText = (ctx: CanvasRenderingContext2D, text: string, cx: number, top: number, bottom: number, font: string, color: string) => {
  const chars = [...text];
  const step = (bottom - top) / chars.length;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.floor(step * 0.86)}px ${font}`;
  chars.forEach((c, i) => ctx.fillText(c, cx, top + step * (i + 0.5)));
};

const chochinTexture = (text: string, color: string) =>
  canvasTexture(256, 384, (ctx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 384);
    // Bamboo ribs
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 10; y < 384; y += 22) ctx.fillRect(0, y, 256, 3);
    // Bright glow in the middle where the bulb sits
    const g = ctx.createRadialGradient(128, 192, 10, 128, 192, 200);
    g.addColorStop(0, "rgba(255,240,200,0.55)");
    g.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 384);
    verticalText(ctx, text, 128, 40, 344, JP_FONT, "#1d1a1a");
  });

const paperLanternTexture = (band: string, body: string) =>
  canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = body;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    for (let y = 6; y < 128; y += 12) ctx.fillRect(0, y, 128, 2);
    ctx.fillStyle = band;
    ctx.fillRect(0, 86, 128, 16);
  });

const signTexture = (text: string, fg: string, bg: string) =>
  canvasTexture(128, 448, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 448);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 118, 438);
    verticalText(ctx, text, 64, 24, 424, JP_FONT, fg);
  });

const neonTexture = (text: string, color: string) =>
  canvasTexture(160, 640, (ctx) => {
    ctx.fillStyle = "#0b0a14";
    ctx.fillRect(0, 0, 160, 640);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.strokeRect(10, 10, 140, 620);
    ctx.shadowBlur = 24;
    verticalText(ctx, text, 80, 40, 600, JP_SANS, color);
    ctx.shadowBlur = 0;
    verticalText(ctx, text, 80, 40, 600, JP_SANS, "#ffffff");
  });

const norenTexture = (char: string, color: string) =>
  canvasTexture(128, 192, (ctx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 192);
    ctx.fillStyle = "#f4efe2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 84px ${JP_FONT}`;
    ctx.fillText(char, 64, 104);
  });

// Warm shop interior seen through an open front: amber glow, a counter, shelves of bottles.
const interiorTexture = (seed: number) =>
  canvasTexture(256, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#ffd894");
    g.addColorStop(1, "#d8823a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#7a3e1e";
    ctx.fillRect(0, 70, 256, 6);
    ctx.fillRect(0, 120, 256, 6);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = ["#3a2010", "#5a7a3a", "#8a2a2a", "#2a3a6a"][(i + seed) % 4];
      const x = 10 + i * 17 + rand(i + seed) * 6;
      const shelf = i % 2 ? 70 : 120;
      ctx.fillRect(x, shelf - 34 - rand(i + seed * 3) * 10, 9, 34 + rand(i + seed * 3) * 10);
    }
    ctx.fillStyle = "#4a2410";
    ctx.fillRect(0, 186, 256, 70);
    ctx.fillStyle = "#6a3a1e";
    ctx.fillRect(0, 180, 256, 10);
  });

// Lit / dark windows on a building at the end of the street.
const windowsTexture = (seed: number) =>
  canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = "#151428";
    ctx.fillRect(0, 0, 256, 512);
    for (let r = 0; r < 24; r++)
      for (let c = 0; c < 6; c++) {
        const on = rand(seed * 97 + r * 7 + c) > 0.55;
        ctx.fillStyle = on ? (rand(seed + r + c * 3) > 0.5 ? "#ffd894" : "#bfe0ff") : "#24223e";
        ctx.fillRect(14 + c * 40, 10 + r * 21, 26, 12);
      }
  });

// A light's mirror image on wet ground: brightest at the light's foot (far end), fading toward the camera.
const streakTexture = () =>
  canvasTexture(64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    // Broken up by ripples
    ctx.globalCompositeOperation = "destination-out";
    for (let y = 8; y < 256; y += 10) {
      ctx.fillStyle = `rgba(0,0,0,${0.25 + rand(y) * 0.5})`;
      ctx.fillRect(0, y, 64, 3);
    }
    ctx.globalCompositeOperation = "source-over";
    const side = ctx.createLinearGradient(0, 0, 64, 0);
    side.addColorStop(0, "rgba(0,0,0,1)");
    side.addColorStop(0.5, "rgba(0,0,0,0)");
    side.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, 64, 256);
    ctx.globalCompositeOperation = "source-over";
  });

const wetStoneTexture = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#24232f";
    ctx.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const off = r % 2 ? 32 : 0;
        ctx.fillStyle = rand(r * 8 + c) > 0.5 ? "#2a2936" : "#212029";
        ctx.fillRect(c * 64 + off + 3, r * 64 + 3, 58, 58);
      }
    // Darker puddles
    ctx.fillStyle = "rgba(10,10,20,0.45)";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(rand(i + 40) * 512, rand(i + 50) * 512, 40 + rand(i) * 50, 18 + rand(i + 3) * 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

let streakTex: THREE.Texture | null = null;
const STREAK = () => (streakTex ??= streakTexture());

// ---------- pieces ----------

// Mirror streak of a light on the wet ground: starts under the light at (x, z) and runs `length` toward the camera.
const Reflection: React.FC<{ x: number; z: number; length: number; width: number; color: string; strength?: number; frame: number }> = ({ x, z, length, width, color, strength = 0.6, frame }) => (
  <mesh position={[x, 0.004, z + length / 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[1 + 0.12 * Math.sin(frame * 0.4 + x * 7 + z), 1, 1]}>
    <planeGeometry args={[width, length]} />
    <meshBasicMaterial map={STREAK()} color={color} transparent opacity={strength} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </mesh>
);

// Red paper lantern (chochin) with writing down it.
const Chochin: React.FC<{ position: Vec3; text: string; size?: number; color?: string; tall?: boolean; frame: number; seed: number }> = ({ position, text, size = 0.2, color = "#e8352a", tall, frame, seed }) => {
  const tex = useMemo(() => chochinTexture(text, color), [text, color]);
  const sway = Math.sin(frame * 0.07 + seed) * 0.05;
  const h = tall ? 1.9 : 1.3;
  return (
    <group position={position} rotation={[0, 0, sway]}>
      <InkCylinder radius={size * 0.04} height={0.18} position={[0, size * h + 0.09, 0]} color={INK} ink={0} />
      <mesh scale={[1, h, 1]}>
        <sphereGeometry args={[size, 32, 20]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh scale={[1.04, h * 1.02, 1.04]}>
        <sphereGeometry args={[size, 32, 20]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {[1, -1].map((s) => (
        <InkCylinder key={s} radius={size * 0.62} height={size * 0.14} position={[0, s * size * h * 0.93, 0]} color="#1d1a1a" ink={0.004} />
      ))}
      <Halo position={[0, 0, size * 1.1]} size={size * 7} color={color} strength={0.45} />
    </group>
  );
};

const Sign: React.FC<{ position: Vec3; text: string; size?: [number, number]; fg?: string; bg?: string }> = ({ position, text, size = [0.3, 1.05], fg = INK, bg = "#f4efe2" }) => {
  const tex = useMemo(() => signTexture(text, fg, bg), [text, fg, bg]);
  return (
    <group position={position}>
      <InkBox size={[size[0], size[1], 0.05]} color={bg} ink={0.008} />
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 0, s * 0.027]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={size} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      ))}
      <InkBox size={[0.03, 0.03, 0.03]} position={[0, size[1] / 2 + 0.05, 0]} color={INK} ink={0} />
    </group>
  );
};

// Short cloth curtain strips over a doorway; `facing` = the direction the cloth faces (+x on the left shops).
const Noren: React.FC<{ position: Vec3; chars: string; color: string; width: number; drop?: number; rotationY: number; frame: number; seed: number }> = ({ position, chars, color, width, drop = 0.42, rotationY, frame, seed }) => {
  const list = [...chars];
  const w = width / list.length;
  const texes = useMemo(() => list.map((c) => norenTexture(c, color)), [chars, color]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkCylinder radius={0.012} height={width + 0.1} rotation={[0, 0, Math.PI / 2]} color="#3a2a1a" ink={0.003} />
      {list.map((_, i) => (
        <group key={i} position={[-width / 2 + w * (i + 0.5), 0, 0]} rotation={[Math.sin(frame * 0.09 + i + seed) * 0.08, 0, 0]}>
          <mesh position={[0, -drop / 2, 0.005]}>
            <planeGeometry args={[w - 0.015, drop]} />
            <meshToonMaterial map={texes[i]} gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const Stool: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.025} height={0.3} position={[0, 0.15, 0]} color="#c9ced3" ink={0.004} />
    <InkCylinder radius={0.13} height={0.02} position={[0, 0.01, 0]} color="#c9ced3" ink={0.004} />
    <InkCylinder radius={0.15} height={0.05} position={[0, 0.315, 0]} color="#d62828" />
  </group>
);

// One izakaya front on the left side, centred at z, with its warm interior, noren, lantern, awning and sign.
const SHOPS = [
  { z: 2.9, wall: "#4a3a30", noren: "#1b2a55", chars: "やきとり", lantern: "やきとり", sign: "焼鳥", signBg: "#f4efe2" },
  { z: 0.7, wall: "#3a3040", noren: "#8a1e22", chars: "おでん", lantern: "おでん", sign: "酒処", signBg: "#ffd23f" },
  { z: -1.5, wall: "#5a3a2a", noren: "#2f4a3a", chars: "もつ", lantern: "もつ焼", sign: "居酒屋", signBg: "#f4efe2" },
  { z: -3.7, wall: "#3e3438", noren: "#1b2a55", chars: "さかな", lantern: "魚", sign: "定食", signBg: "#f4efe2" },
  { z: -5.9, wall: "#4a3a30", noren: "#8a1e22", chars: "てんぷら", lantern: "天ぷら", sign: "天ぷら", signBg: "#f4efe2" },
  { z: -8.1, wall: "#3a3040", noren: "#2f4a3a", chars: "ぎょうざ", lantern: "餃子", sign: "中華", signBg: "#e8352a" },
];

const Shop: React.FC<{ shop: (typeof SHOPS)[number]; index: number; frame: number }> = ({ shop, index, frame }) => {
  const interior = useMemo(() => interiorTexture(index * 5 + 1), [index]);
  const near = shop.z > -6.5;
  return (
    <group position={[0, 0, shop.z]}>
      <InkBox size={[0.3, 3.0, 2.12]} position={[-ALLEY.half - 0.15, 1.5, 0]} color={shop.wall} ink={0.01} />
      {/* Upper floor window */}
      <InkBox size={[0.04, 0.6, 1.0]} position={[-ALLEY.half + 0.01, 2.55, 0.2]} color="#1d1a1a" ink={0.004} />
      <mesh position={[-ALLEY.half + 0.035, 2.55, 0.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.92, 0.52]} />
        <meshBasicMaterial color={rand(index) > 0.4 ? "#ffc878" : "#2a2a44"} toneMapped={false} />
      </mesh>
      {/* Open front: warm interior and door frame */}
      <mesh position={[-ALLEY.half + 0.005, 0.95, -0.1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.5, 1.9]} />
        <meshBasicMaterial map={interior} toneMapped={false} />
      </mesh>
      {[-0.86, 0.66].map((dz) => (
        <InkBox key={dz} size={[0.06, 1.95, 0.06]} position={[-ALLEY.half + 0.02, 0.975, dz]} color="#3a2414" ink={0.004} />
      ))}
      <InkBox size={[0.08, 0.08, 1.6]} position={[-ALLEY.half + 0.03, 1.94, -0.1]} color="#3a2414" ink={0.004} />
      <Noren position={[-ALLEY.half + 0.06, 1.9, -0.1]} chars={shop.chars} color={shop.noren} width={1.4} rotationY={Math.PI / 2} frame={frame} seed={index} />
      {/* Awning sloping over the alley */}
      <InkBox size={[0.55, 0.04, 2.12]} position={[-ALLEY.half + 0.25, 2.18, 0]} rotation={[0, 0, -0.32]} color="#2a2a33" ink={0.006} />
      <Chochin position={[-ALLEY.half + 0.32, 1.72, 0.8]} text={shop.lantern} frame={frame} seed={index} />
      <Sign position={[-ALLEY.half + 0.3, 2.85, -0.75]} text={shop.sign} bg={shop.signBg} />
      {near && <pointLight position={[-ALLEY.half + 0.35, 1.3, -0.1]} intensity={2.2} distance={2.6} color="#ffb860" />}
      <Reflection x={-ALLEY.half + 0.32} z={0.8} length={2.4} width={0.32} color="#ff4a3a" strength={0.55} frame={frame} />
      <Reflection x={-ALLEY.half + 0.3} z={-0.6} length={1.8} width={0.7} color="#ffb860" strength={0.3} frame={frame} />
    </group>
  );
};

const LANTERN_BANDS = ["#d62828", "#d62828", "#2f6aa8", "#d62828"];
const LANTERN_BODIES = ["#fff6e0", "#ffe7a8", "#d8ecff", "#fff6e0"];

const RightWall: React.FC<{ frame: number }> = ({ frame }) => {
  const lanterns = useMemo(() => LANTERN_BODIES.map((b, i) => paperLanternTexture(LANTERN_BANDS[i], b)), []);
  const net = useMemo(
    () =>
      canvasTexture(64, 64, (ctx) => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.strokeStyle = "rgba(60,110,220,0.9)";
        ctx.lineWidth = 3;
        for (let k = 0; k <= 64; k += 16) {
          ctx.beginPath();
          ctx.moveTo(k, 0);
          ctx.lineTo(k, 64);
          ctx.moveTo(0, k);
          ctx.lineTo(64, k);
          ctx.stroke();
        }
      }),
    [],
  );
  net.wrapS = net.wrapT = THREE.RepeatWrapping;
  net.repeat.set(6, 9);
  const zs = Array.from({ length: 28 }, (_, i) => 3.6 - i * 0.45);
  return (
    <group>
      <InkBox size={[0.3, 3.4, 16]} position={[ALLEY.half + 0.15, 1.7, -2.4]} color="#6e6874" ink={0.01} />
      {[-6, -3, 0, 3].map((z) => (
        <InkBox key={z} size={[0.02, 3.4, 0.03]} position={[ALLEY.half + 0.005, 1.7, z]} color="#4e4854" ink={0} />
      ))}
      {/* Row of paper lanterns along the wall top */}
      <InkBox size={[0.04, 0.04, 13]} position={[ALLEY.half - 0.12, 2.98, -2.6]} color="#3a3a44" ink={0.004} />
      {zs.map((z, i) => (
        <group key={z} position={[ALLEY.half - 0.12, 2.76, z]} rotation={[0, 0, Math.sin(frame * 0.06 + i) * 0.04]}>
          <mesh scale={[1, 1.15, 1]}>
            <sphereGeometry args={[0.13, 20, 14]} />
            <meshBasicMaterial map={lanterns[i % 4]} toneMapped={false} />
          </mesh>
          <mesh scale={[1.05, 1.2, 1.05]}>
            <sphereGeometry args={[0.13, 20, 14]} />
            <meshBasicMaterial color={INK} side={THREE.BackSide} />
          </mesh>
        </group>
      ))}
      {zs
        .filter((_, i) => i % 3 === 0)
        .map((z) => (
          <Reflection key={`r${z}`} x={ALLEY.half - 0.15} z={z} length={1.6} width={0.25} color="#fff0c8" strength={0.25} frame={frame} />
        ))}
      {/* Red pipe, hanging fern, AC units, blue net */}
      <InkCylinder radius={0.045} height={3.3} position={[ALLEY.half - 0.06, 1.65, -2.6]} color="#c8262c" ink={0.006} />
      <group position={[ALLEY.half - 0.2, 2.45, -3.4]}>
        <InkCylinder radius={0.12} height={0.14} position={[0, 0.1, 0]} color="#7a4a2a" ink={0.005} />
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const sway = Math.sin(frame * 0.06 + i) * 0.06;
          return <InkBox key={i} size={[0.04, 0.75 + rand(i) * 0.35, 0.012]} position={[Math.cos(a) * 0.1, -0.3, Math.sin(a) * 0.1]} rotation={[Math.sin(a) * 0.35 + sway, a, -Math.cos(a) * 0.35]} color={i % 2 ? "#3fae5a" : "#5ac46a"} ink={0.003} />;
        })}
      </group>
      {[-4.9, -6.1].map((z) => (
        <group key={z} position={[ALLEY.half - 0.22, 0.32, z]}>
          <InkBox size={[0.4, 0.55, 0.7]} color="#d8d8d0" />
          <mesh position={[-0.205, 0.02, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[0.2, 24]} />
            <meshBasicMaterial color="#5a5a62" />
          </mesh>
        </group>
      ))}
      <mesh position={[ALLEY.half - 0.03, 1.2, -7.4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.4, 2.3]} />
        <meshBasicMaterial map={net} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <Sign position={[ALLEY.half - 0.3, 2.3, -4.6]} text="スナック" bg="#ffe7a8" />
      <Sign position={[ALLEY.half - 0.3, 2.4, -7.0]} text="喫茶" bg="#f4efe2" fg="#8a1e22" />
    </group>
  );
};

// Sagging overhead cables between the two sides, and a utility pole with a transformer.
const Cables: React.FC = () => {
  const tubes = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const z = 3 - i * 1.6 + rand(i) * 0.8;
        const a = new THREE.Vector3(-ALLEY.half, 3.15 + rand(i + 1) * 0.4, z);
        const b = new THREE.Vector3(ALLEY.half, 3.2 + rand(i + 2) * 0.4, z - 0.6 + rand(i + 3) * 1.2);
        const mid = a.clone().lerp(b, 0.5);
        mid.y -= 0.25 + rand(i + 4) * 0.25;
        return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 16, 0.008, 5);
      }).concat(
        Array.from({ length: 4 }, (_, i) => {
          const x = 0.9 - i * 0.12;
          const a = new THREE.Vector3(x, 4.6 - i * 0.12, -6.4);
          const b = new THREE.Vector3(x - 0.6, 3.4 - i * 0.05, 4);
          const mid = a.clone().lerp(b, 0.5);
          mid.y -= 0.5;
          return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.008, 5);
        }),
      ),
    [],
  );
  return (
    <group>
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#0e0d14" />
        </mesh>
      ))}
      <InkCylinder radius={0.11} height={5.6} position={[1.0, 2.8, -6.4]} color="#8a847c" ink={0.01} />
      <InkBox size={[1.2, 0.08, 0.08]} position={[0.8, 4.65, -6.4]} color="#5a5650" ink={0.006} />
      <InkCylinder radius={0.16} height={0.42} position={[1.18, 4.1, -6.4]} color="#9a9a96" ink={0.008} />
      <InkBox size={[0.18, 0.32, 0.02]} position={[1.0, 1.6, -6.28]} color="#ffd23f" ink={0.004} />
    </group>
  );
};

// The ramen stall: cart, counter, tarp roof on four poles, noren, a fluorescent tube, menu tags, a tall red lantern,
// a steaming stock pot, bowls, stools and a clear umbrella left against it.
const Yatai: React.FC<{ frame: number }> = ({ frame }) => {
  const menu = useMemo(() => ["醤油", "味噌", "塩", "餃子"].map((t) => signTexture(t, INK, "#f4e2b8")), []);
  const k = tube(frame);
  const zc = STALL.z;
  return (
    <group>
      <InkBox size={[0.6, 0.72, 1.8]} position={[STALL.x, 0.36, zc]} color="#8a5a3a" />
      {[0.18, 0.36, 0.54].map((y) => (
        <InkBox key={y} size={[0.005, 0.015, 1.78]} position={[STALL.x - 0.302, y, zc]} color="#5a3a24" ink={0} />
      ))}
      <InkBox size={[0.85, 0.05, 1.95]} position={[STALL.x - 0.12, 0.765, zc]} color="#c9a26b" />
      {[-0.62, 0.62].map((dz) => (
        <InkCylinder key={dz} radius={0.24} height={0.08} position={[STALL.x - 0.33, 0.24, zc + dz]} rotation={[0, 0, Math.PI / 2]} color="#3a2a1a" ink={0.008} />
      ))}
      {/* Roof */}
      {[
        [0.03, -1.43],
        [0.03, 0.43],
        [0.98, -1.43],
        [0.98, 0.43],
      ].map(([x, z]) => (
        <InkCylinder key={`${x}${z}`} radius={0.022} height={1.28} position={[x, 1.43, z]} color="#3a3a44" ink={0.004} />
      ))}
      <InkBox size={[1.3, 0.04, 2.1]} position={[0.5, 2.1, zc]} rotation={[0, 0, 0.12]} color="#2f4a6a" />
      <Noren position={[-0.04, 2.02, zc]} chars="らーめん" color="#b8262c" width={1.7} drop={0.3} rotationY={-Math.PI / 2} frame={frame} seed={11} />
      <Noren position={[0.5, 2.06, 0.47]} chars="ラーメン" color="#1b2a55" width={0.95} drop={0.3} rotationY={0} frame={frame} seed={13} />
      {/* Fluorescent tube */}
      <mesh position={TUBE}>
        <boxGeometry args={[0.05, 0.05, 1.5]} />
        <meshBasicMaterial color={k < 1 ? "#c8c0b0" : "#fffaf0"} toneMapped={false} />
      </mesh>
      <Halo position={[TUBE[0] - 0.2, TUBE[1] - 0.05, TUBE[2]]} size={2.2} color="#fff2d8" strength={0.35 * k} />
      <pointLight position={[TUBE[0], TUBE[1] - 0.1, TUBE[2]]} intensity={7 * k} distance={3.6} color="#fff2d8" />
      {/* Menu tags under the roof edge, facing the customers */}
      {menu.map((t, i) => (
        <mesh key={i} position={[0.06, 1.72, zc - 0.6 + i * 0.4]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.13, 0.42]} />
          <meshBasicMaterial map={t} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Chochin position={STALL_LANTERN} text="ラーメン" size={0.17} tall frame={frame} seed={21} />
      <pointLight position={[STALL_LANTERN[0], STALL_LANTERN[1], STALL_LANTERN[2] + 0.2]} intensity={2.5} distance={2.2} color="#ff4a3a" />
      {/* Stock pot with steam, bowls on the counter */}
      <InkCylinder radius={0.14} height={0.22} position={[0.72, 0.9, zc - 0.78]} color="#c9ced3" />
      <SmokePlume position={[0.72, 1.04, zc - 0.78]} world={[0.72, zc - 0.78]} frame={frame} size={0.06} rise={0.85} wind={-0.15} period={48} puffs={5} />
      {SEATS.slice(0, 2).map(([, z], i) => (
        <group key={i} position={[0.17, 0.8, z]}>
          <InkCylinder radius={0.08} height={0.06} position={[0, 0.03, 0]} color="#f4efe2" ink={0.005} />
          <InkCylinder radius={0.083} height={0.012} position={[0, 0.058, 0]} color="#c8262c" ink={0} />
          <InkBox size={[0.008, 0.008, 0.2]} position={[0.03, 0.07, 0.04]} rotation={[0, 0.3, 0.1]} color="#c9a26b" ink={0} />
        </group>
      ))}
      {SEATS.map(([x, z]) => (
        <Stool key={z} position={[x, 0, z]} />
      ))}
      {/* Clear umbrella leaning on the stall end */}
      <group position={[1.12, 0, 0.62]} rotation={[0.3, 0, 0.2]} userData={{ ghost: true }}>
        <InkCylinder radius={0.012} height={0.85} position={[0, 0.42, 0]} color="#e8e8f0" ink={0.003} />
        <mesh position={[0, 0.85, 0]}>
          <sphereGeometry args={[0.42, 24, 10, 0, Math.PI * 2, 0, 1.0]} />
          <meshBasicMaterial color="#e8f4ff" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <Reflection x={0.3} z={zc - 0.8} length={2.4} width={1.0} color="#fff2d8" strength={0.35 * k} frame={frame} />
      <Reflection x={STALL_LANTERN[0]} z={STALL_LANTERN[2]} length={2.6} width={0.36} color="#ff4a3a" strength={0.7} frame={frame} />
    </group>
  );
};

// A small red car creeping down the alley with its headlights on.
const Car: React.FC<{ progress: number; frame: number }> = ({ progress, frame }) => {
  const zf = carZ(progress);
  const moving = progress < 1;
  return (
    <group position={[CAR_X, 0, zf - 1.2]}>
      <InkBox size={[1.2, 0.5, 2.4]} position={[0, 0.45, 0]} color="#9a2a2a" />
      <InkBox size={[1.1, 0.52, 1.4]} position={[0, 0.96, -0.25]} color="#9a2a2a" />
      <mesh position={[0, 0.98, 0.46]} rotation={[-0.25, 0, 0]}>
        <planeGeometry args={[1.0, 0.44]} />
        <meshBasicMaterial color="#1b2a55" />
      </mesh>
      {/* Wiper sweeping the windscreen */}
      <group position={[0.2, 0.78, 0.5]} rotation={[-0.25, 0, Math.sin(frame * 0.25) * 0.9]}>
        <InkBox size={[0.012, 0.36, 0.01]} position={[0, 0.18, 0.01]} color={INK} ink={0} />
      </group>
      {[-1, 1].flatMap((s) => [-0.8, 0.8].map((z) => <InkCylinder key={`${s}${z}`} radius={0.2} height={0.14} position={[s * 0.58, 0.2, z]} rotation={[0, 0, Math.PI / 2]} color="#1d1a1a" ink={0.006} />))}
      {[-0.42, 0.42].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.55, 1.205]}>
            <circleGeometry args={[0.09, 24]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <Halo position={[x, 0.55, 1.3]} size={0.55} color="#eef4ff" strength={0.7} />
          <mesh position={[x, 0.5, 2.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.55, 2.8, 24, 1, true]} />
            <meshBasicMaterial color="#eef4ff" transparent opacity={0.045} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          <Reflection x={x} z={1.3} length={4.5} width={0.4} color="#eef4ff" strength={0.8} frame={frame} />
        </group>
      ))}
      {[-0.5, 0.5].map((x) => (
        <mesh key={`t${x}`} position={[x, 0.55, -1.205]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.16, 0.08]} />
          <meshBasicMaterial color={moving ? "#ff3b30" : "#ff8a80"} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// Tall buildings across the street at the end of the alley, with vertical neon signs, and the wet cross street.
const NEON = [
  { x: -2.6, y: 3.6, text: "カラオケ", color: "#ff4fd8" },
  { x: -0.7, y: 4.4, text: "ホテル", color: "#4ff3ff" },
  { x: 1.0, y: 3.4, text: "居酒屋", color: "#5cff8a" },
  { x: 2.8, y: 4.0, text: "ゲーム", color: "#ffd23f" },
];
const StreetEnd: React.FC<{ frame: number }> = ({ frame }) => {
  const windows = useMemo(() => [0, 1, 2, 3].map((i) => windowsTexture(i + 1)), []);
  const neon = useMemo(() => NEON.map((n) => neonTexture(n.text, n.color)), []);
  return (
    <group>
      <mesh position={[0, 0.002, -12.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 4]} />
        <meshToonMaterial color="#2a2940" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[-3.5 + i * 1, 0.006, -12.0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 1.4]} />
          <meshBasicMaterial color="#c8c8d8" transparent opacity={0.5} />
        </mesh>
      ))}
      {[
        [-4.4, 3.0, 13],
        [-1.6, 2.6, 10],
        [1.3, 2.8, 15],
        [4.2, 3.0, 11],
      ].map(([x, w, h], i) => (
        <group key={i}>
          <InkBox size={[w, h, 2]} position={[x, h / 2, -16]} color="#ffffff" ink={0.03} map={windows[i]} />
        </group>
      ))}
      {NEON.map((n, i) => {
        const flick = i === 2 && frame % 53 < 3 ? 0.3 : 1;
        return (
          <group key={n.text}>
            <mesh position={[n.x, n.y, -14.9]}>
              <planeGeometry args={[0.7, 2.8]} />
              <meshBasicMaterial map={neon[i]} transparent opacity={flick} toneMapped={false} />
            </mesh>
            <Halo position={[n.x, n.y, -14.8]} size={3.2} color={n.color} strength={0.35 * flick} />
            <Reflection x={n.x} z={-14.4} length={6.5} width={0.6} color={n.color} strength={0.5 * flick} frame={frame} />
          </group>
        );
      })}
    </group>
  );
};

// Rain: thin streaks falling through the alley (one geometry rebuilt per frame), and ripples ringing out in
// the puddles.
const RAIN = 340;
const Rain: React.FC<{ frame: number }> = ({ frame }) => {
  const geo = useMemo(() => {
    const pos = new Float32Array(RAIN * 18);
    for (let i = 0; i < RAIN; i++) {
      const x = (rand(i) - 0.5) * 3.4;
      const z = 4.5 - rand(i + 1000) * 16;
      const len = 0.18 + rand(i + 2000) * 0.14;
      const y = 3.8 - ((rand(i + 3000) * 3.8 + frame * 0.32) % 3.8);
      const w = 0.004;
      const dx = 0.03; // a little wind slant
      const q = [
        [x - w, y, z],
        [x + w, y, z],
        [x + w + dx, y + len, z],
        [x - w, y, z],
        [x + w + dx, y + len, z],
        [x - w + dx, y + len, z],
      ];
      q.forEach((v, k) => pos.set(v, i * 18 + k * 3));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [frame]);
  return (
    <group userData={{ ghost: true }}>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#c8d4ff" transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 26 }, (_, i) => {
        const period = 18 + (i % 4) * 4;
        const clock = frame + i * 5;
        const t = (clock % period) / period;
        const sd = i * 13 + Math.floor(clock / period) * 7;
        const x = (rand(sd) - 0.5) * 2.4;
        const z = 3.5 - rand(sd + 1) * 13;
        if (x > 0.05 && z > -1.6 && z < 0.6) return null; // not on the stall's counter
        const r = 0.02 + t * 0.16;
        return (
          <mesh key={i} position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.006, r, 28]} />
            <meshBasicMaterial color="#c8d4ff" transparent opacity={(1 - t) * 0.5} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

export const AlleySet: React.FC<{ camera: CameraShot; frame: number; car?: number }> = ({ camera, frame, car }) => {
  const m = MOODS.night;
  const floor = useMemo(() => {
    const t = wetStoneTexture();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 10);
    return t;
  }, []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#0a0a16"]} />
      <fog attach="fog" args={["#141428", 9, 36]} />
      <ambientLight intensity={m.ambient[0] * 0.8} color={m.ambient[1]} />
      <hemisphereLight args={["#5a6aa8", "#14121c", 0.5]} />
      <directionalLight
        position={[-2, 6, 4]}
        intensity={0.8}
        color="#9fb0ff"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3.2]} receiveShadow>
        <planeGeometry args={[ALLEY.half * 2, 15]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={floor} />
      </mesh>
      {SHOPS.map((s, i) => (
        <Shop key={s.z} shop={s} index={i} frame={frame} />
      ))}
      <RightWall frame={frame} />
      <Cables />
      <Yatai frame={frame} />
      <StreetEnd frame={frame} />
      {car !== undefined && <Car progress={car} frame={frame} />}
      <Rain frame={frame} />
    </>
  );
};
