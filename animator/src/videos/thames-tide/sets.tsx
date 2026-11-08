import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../../engine/stage";
import { canvasTexture, Halo, Label, LightPool } from "../../three/kit";
import { InkBox, InkCylinder, toonRamp } from "../../three/toon";
import { Blob, useOwned } from "../../three/BalloonSets";
import { Hills } from "../../three/FarmyardSet";
import { Haze, SmokePlume } from "../../three/LakeSet";
import { Lights, Mood, RIVER, RiverWater, Sky, surfaceY, WaterState } from "../../three/RiverSets";
import { surfaceTexture } from "../../three/surfaces";
import type { PuppetLight } from "../../puppet/PuppetBillboard";

// Sets for "Why the Thames Kept Bringing Parliament's Stink Back" (Westminster, summer 1858), built from
// guide/references/thames-westminster-1858.md.
//
// ThamesSet: the river runs ACROSS the frame along x (downstream, toward the sea, is +x), centre line z = TH.zc.
// Parliament's river front stands on the far bank (terrace wall face at z = TH.far), a stone quay is the near bank
// (top y = 0, edge at z = TH.near) so puppets and the camera can stand on it. `water.drift` carries ripples, scum and
// floating filth along x (negative = flowing upstream, the flood tide); `level` raises the whole river (the tide).
// The TIDE gauge on the terrace wall (TH.gauge) shows the level. Sewer arches in the wall pour brown water.

type Vec3 = [number, number, number];
const INK = "#161212";
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const TH = { zc: -6, off: 50, far: -13.2, near: 1.7, gauge: [2.6, 0, -12.5] as Vec3, arches: [-7.5, 5.2, 13] };

// ---------- moods ----------

export type ThamesMode = "haze" | "dusk" | "steel";
export const T_MOODS: Record<ThamesMode, Mood> = {
  haze: {
    stops: [[-0.1, "#efe2bc"], [0.0, "#f2deaa"], [0.07, "#eadab6"], [0.18, "#cdd6d4"], [0.45, "#9fbcd2"], [1.0, "#7aa0c8"]],
    sun: [4, 8, 7],
    glow: "#fff0c0",
    bg: "#e6d8b0",
    fog: ["#e2d2a4", 28, 120],
    ambient: [1.15, "#fff2dc"],
    hemi: ["#fff0d0", "#6a5a3a", 0.6],
    key: [2.3, "#fff0d0"],
    water: "#6e6236",
    foam: "#c8bf92",
    far: ["#b7ab90", "#a49c82", "#8e8a70"],
  },
  dusk: {
    stops: [[-0.1, "#f2a46e"], [0.0, "#f09062"], [0.06, "#dc7c74"], [0.16, "#a46c9c"], [0.38, "#5e4c8c"], [1.0, "#2a2a5a"]],
    sun: [-5, 1.4, -10],
    glow: "#ffc890",
    bg: "#a46c9c",
    fog: ["#b47890", 24, 115],
    ambient: [0.95, "#e8c0cc"],
    hemi: ["#f0b4a4", "#3a2a40", 0.6],
    key: [1.7, "#ffb070"],
    water: "#5c4a3e",
    foam: "#dcb0a0",
    far: ["#5a4060", "#4a3a58", "#3a3050"],
  },
  steel: {
    stops: [[-0.1, "#d6dde4"], [0.0, "#c8d2dc"], [0.1, "#a8b8cc"], [0.3, "#7f98b6"], [1.0, "#4f6c96"]],
    sun: [6, 6, 6],
    glow: "#eef4ff",
    bg: "#a8b8cc",
    fog: ["#b4c0cc", 30, 130],
    ambient: [1.1, "#eef2ff"],
    hemi: ["#dfe8ff", "#4a5060", 0.6],
    key: [2.0, "#f2f4ff"],
    water: "#5e6450",
    foam: "#c8ccc0",
    far: ["#8a96a8", "#77849a", "#5f6c80"],
  },
};
export const thamesBg = (mode: ThamesMode) => T_MOODS[mode].bg;
export const thamesLight = (mode: ThamesMode): PuppetLight => {
  if (mode === "dusk") return { tint: "#ffd8c0", tintAmount: 0.06, shadow: 0.2, distant: [{ direction: [-0.5, 0.2, -1], color: "#ffa868", strength: 1.3 }] };
  if (mode === "steel") return { tint: "#e8eeff", tintAmount: 0.06, shadow: 0.14, distant: [{ direction: [0.6, 0.6, 0.6], color: "#f0f4ff", strength: 0.9 }] };
  return { tint: "#fff4e0", tintAmount: 0.06, shadow: 0.14, distant: [{ direction: [0.45, 0.8, 0.6], color: "#fff0cc", strength: 1.1 }] };
};

// Height of the river surface at world (x, z).
export const waterY = (x: number, z: number, frame: number, w: WaterState, level = 0) => level + surfaceY(TH.zc - z, x - TH.off, frame, w);

// ---------- textures ----------

const stoneCanvas = (base: string, line: string) =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    for (let r = 0; r < 8; r++) {
      const y = r * 32;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
      for (let c = 0; c < 6; c++) {
        const x = c * 90 + (r % 2) * 45 + rand(r * 9 + c) * 10;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 32);
        ctx.stroke();
      }
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
      ctx.fillRect(rand(i + 1) * 512, rand(i + 2) * 256, 4, 3);
    }
  });

// Parliament's river front: three storeys of tall Gothic windows between buttress strips, a carved band under each
// row and a pierced parapet. One bay per 128 px; tiled across the block.
const facadeCanvas = (dusk: boolean) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = dusk ? "#b88a6a" : "#dcc08c";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(120,80,40,0.08)" : "rgba(255,240,200,0.12)";
      ctx.fillRect(rand(i + 1) * 512, rand(i + 2) * 512, 5, 3);
    }
    for (let b = 0; b < 4; b++) {
      const x0 = b * 128;
      // buttress strip
      ctx.fillStyle = dusk ? "#a07658" : "#c8a874";
      ctx.fillRect(x0, 0, 14, 512);
      ctx.fillStyle = "rgba(60,40,20,0.35)";
      ctx.fillRect(x0 + 14, 0, 4, 512);
      for (let r = 0; r < 3; r++) {
        const y0 = 70 + r * 150;
        // two lancets per bay with pointed heads
        for (const dx of [34, 74]) {
          const x = x0 + dx;
          ctx.fillStyle = dusk ? (r === 1 && b % 2 ? "#ffcf7a" : "#3a3048") : "#3c4250";
          ctx.beginPath();
          ctx.moveTo(x, y0 + 100);
          ctx.lineTo(x, y0 + 22);
          ctx.quadraticCurveTo(x + 11, y0 - 6, x + 22, y0 + 22);
          ctx.lineTo(x + 22, y0 + 100);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.fillRect(x + 10, y0 + 18, 2, 82);
          ctx.fillRect(x, y0 + 60, 22, 2);
        }
        // carved band
        ctx.fillStyle = dusk ? "#946a50" : "#bfa070";
        ctx.fillRect(x0, y0 + 112, 128, 10);
        for (let k = 0; k < 8; k++) ctx.fillRect(x0 + 6 + k * 16, y0 + 106, 8, 6);
      }
    }
  });

const towerCanvas = (dusk: boolean) =>
  canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = dusk ? "#b0846a" : "#d8bc88";
    ctx.fillRect(0, 0, 256, 512);
    for (let r = 0; r < 6; r++) {
      const y0 = 20 + r * 82;
      for (const x of [40, 110, 180]) {
        ctx.fillStyle = "#3c4250";
        ctx.beginPath();
        ctx.moveTo(x, y0 + 60);
        ctx.lineTo(x, y0 + 14);
        ctx.quadraticCurveTo(x + 9, y0 - 4, x + 18, y0 + 14);
        ctx.lineTo(x + 18, y0 + 60);
        ctx.fill();
      }
      ctx.fillStyle = dusk ? "#946a50" : "#bfa070";
      ctx.fillRect(0, y0 + 68, 256, 6);
    }
  });

const clockCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#2a2a30";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#f4ecd2";
    ctx.beginPath();
    ctx.arc(128, 128, 104, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c8a040";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.fillRect(128 + Math.sin(a) * 84 - 4, 128 - Math.cos(a) * 84 - 9, 8, 18);
    }
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128, 62);
    ctx.moveTo(128, 128);
    ctx.lineTo(176, 140);
    ctx.stroke();
  });

const brickCanvas = (base = "#a4583a") =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#5a3a2a";
    ctx.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 24; r++)
      for (let c = 0; c < 9; c++) {
        const v = rand(r * 31 + c);
        ctx.fillStyle = v > 0.66 ? base : v > 0.33 ? "#b8693f" : "#8e4a30";
        ctx.fillRect(c * 60 + (r % 2) * 30 - 30 + 2, r * 21.3 + 2, 56, 17);
      }
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(0,0,0,0.1)" : "rgba(255,220,180,0.08)";
      ctx.fillRect(rand(i + 1) * 512, rand(i + 2) * 512, 6, 3);
    }
  });

// The tide gauge: a white board with foot marks and numbers, read against the water.
const gaugeCanvas = () =>
  canvasTexture(128, 1024, (ctx) => {
    ctx.fillStyle = "#f4f0e2";
    ctx.fillRect(0, 0, 128, 1024);
    ctx.fillStyle = "#1a1a1a";
    for (let i = 0; i <= 20; i++) {
      const y = 1024 - i * 48 - 12;
      ctx.fillRect(0, y, i % 2 ? 50 : 90, i % 2 ? 6 : 10);
      if (i % 2 === 0) {
        ctx.font = "bold 34px sans-serif";
        ctx.fillText(String(i), 92, y + 14);
      }
    }
    ctx.fillStyle = "#c8302a";
    ctx.fillRect(0, 0, 128, 10);
    ctx.fillRect(0, 1014, 128, 10);
  });

// Opposite bank as seen from Parliament's windows: Lambeth wharves, warehouses, chimneys, haze.
const lambethCanvas = (dusk: boolean) =>
  canvasTexture(1024, 384, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 384);
    if (dusk) {
      sky.addColorStop(0, "#5a4a8a");
      sky.addColorStop(0.6, "#d07a74");
      sky.addColorStop(1, "#f2a46e");
    } else {
      sky.addColorStop(0, "#a8c0d0");
      sky.addColorStop(0.7, "#ecdcb0");
      sky.addColorStop(1, "#f2e2b4");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1024, 384);
    for (let i = 0; i < 16; i++) {
      const x = i * 68 - 10 + rand(i) * 20;
      const h = 70 + rand(i + 3) * 90;
      ctx.fillStyle = dusk ? (i % 2 ? "#3a2c48" : "#48364e") : i % 2 ? "#9a8670" : "#b09a7c";
      ctx.fillRect(x, 384 - h, 64, h);
      ctx.fillStyle = dusk ? "#2a2036" : "#7a6a58";
      ctx.beginPath();
      ctx.moveTo(x - 4, 384 - h);
      ctx.lineTo(x + 32, 384 - h - 26);
      ctx.lineTo(x + 68, 384 - h);
      ctx.fill();
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = dusk && rand(i * 7 + k) > 0.6 ? "#ffc870" : dusk ? "#221a2c" : "#5a4a3c";
        ctx.fillRect(x + 8 + (k % 3) * 18, 384 - h + 18 + Math.floor(k / 3) * 26, 9, 13);
      }
      if (i % 3 === 0) {
        ctx.fillStyle = dusk ? "#2a2036" : "#6a5a4a";
        ctx.fillRect(x + 40, 384 - h - 70, 12, 70);
        ctx.fillStyle = dusk ? "rgba(120,100,130,0.4)" : "rgba(130,120,110,0.35)";
        for (let s = 0; s < 4; s++) {
          ctx.beginPath();
          ctx.arc(x + 46 + s * 14, 384 - h - 84 - s * 22, 12 + s * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.fillStyle = dusk ? "rgba(240,160,140,0.18)" : "rgba(240,226,180,0.3)";
    ctx.fillRect(0, 240, 1024, 144);
  });

// ---------- small props ----------

// A cone with an ink hull.
export const InkCone: React.FC<{ radius: number; height: number; position: Vec3; color: string; sides?: number; ink?: number }> = ({ radius, height, position, color, sides = 4, ink = 0.03 }) => (
  <group position={position} rotation={[0, Math.PI / sides, 0]}>
    <mesh castShadow>
      <coneGeometry args={[radius, height, sides]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    {ink > 0 && (
      <mesh>
        <coneGeometry args={[radius + ink, height + ink * 2, sides]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

// The MP's bowler hat (drawn about 1.6x life size so it reads on the water). Origin at the brim.
export const Hat: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; wet?: boolean }> = ({ position, rotation = [0, 0, 0], scale = 1, wet }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <group userData={{ ghost: true }}>
      <mesh position={[0, 0.012, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.024, 32]} />
        <meshToonMaterial color={wet ? "#3a3428" : "#2a2420"} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.012, 0]} scale={[1, 1, 0.9]}>
        <cylinderGeometry args={[0.215, 0.215, 0.04, 32]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]} scale={[1, 1.1, 0.95]} castShadow>
        <sphereGeometry args={[0.13, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color={wet ? "#3a3428" : "#2a2420"} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.02, 0]} scale={[1, 1.1, 0.95]}>
        <sphereGeometry args={[0.145, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <InkBox size={[0.27, 0.025, 0.25]} position={[0, 0.035, 0]} color="#6a2a2a" ink={0} />
      {wet && <Blob position={[0.06, 0.15, 0.02]} scale={[0.06, 0.03, 0.05]} color="#6a7a2a" ink={0.01} detail={0} />}
    </group>
  </group>
);

// A sack stencilled LIME (drawn big). Origin at its centre.
const sackCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#d8c8a0";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(120,100,60,0.18)" : "rgba(255,250,230,0.25)";
      ctx.fillRect(rand(i + 1) * 256, rand(i + 2) * 256, 8, 2);
    }
    ctx.fillStyle = "#2a2a2a";
    ctx.font = "bold 78px serif";
    ctx.textAlign = "center";
    ctx.fillText("LIME", 128, 152);
  });
export const Sack: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => {
  const tex = useOwned(() => sackCanvas());
  return (
    <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
      <mesh castShadow scale={[0.36, 0.5, 0.24]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshToonMaterial color="#ffffff" map={tex} gradientMap={toonRamp} />
      </mesh>
      <mesh scale={[0.375, 0.515, 0.255]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <InkCylinder radius={0.06} height={0.12} position={[0, 0.5, 0]} color="#c8b890" ink={0.01} />
    </group>
  );
};

// A Thames lighter: low black hull with a square swim-head bow, leeboards, a stubby mast with a rust-red spritsail,
// sacks of lime heaped amidships. Deck at y = 0 (puppets stand on it, z -0.7..0.7), bow toward -x.
export const BARGE = { half: 2.6, beam: 0.85 };
export const Barge: React.FC<{ frame: number; sacks?: number; sail?: boolean; roll?: number }> = ({ frame, sacks = 6, sail = true, roll = 0 }) => {
  const plank = useOwned(() =>
    canvasTexture(256, 64, (ctx) => {
      ctx.fillStyle = "#2c2622";
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (let r = 0; r < 4; r++) ctx.fillRect(0, r * 16 + 14, 256, 2);
      ctx.fillStyle = "#8a3a2a";
      ctx.fillRect(0, 0, 256, 6);
    }),
  );
  return (
    <group rotation={[roll, 0, Math.sin(frame * 0.05) * 0.015]}>
      <InkBox size={[BARGE.half * 2 - 0.6, 0.55, BARGE.beam * 2]} position={[0.3, -0.28, 0]} color="#ffffff" map={plank} ink={0.02} />
      {/* swim-head bow raking up toward -x */}
      <InkBox size={[0.9, 0.5, BARGE.beam * 2]} position={[-BARGE.half + 0.4, -0.18, 0]} rotation={[0, 0, -0.42]} color="#2c2622" ink={0.02} />
      <InkBox size={[BARGE.half * 2 - 0.4, 0.04, BARGE.beam * 2 - 0.12]} position={[0.2, 0.01, 0]} color="#8a6a48" ink={0.008} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.6, -0.3, s * (BARGE.beam + 0.04)]} scale={[0.5, 0.75, 1]}>
          <circleGeometry args={[0.6, 24]} />
          <meshToonMaterial color="#3a2e24" gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {Array.from({ length: sacks }, (_, i) => (
        <Sack key={i} position={[0.5 + (i % 3) * 0.55 - 0.4, 0.28 + Math.floor(i / 3) * 0.42, ((i * 7) % 3) * 0.32 - 0.32]} rotation={[0, i * 0.7, 1.4 + (i % 2) * 0.2]} scale={0.85} />
      ))}
      {sail && (
        <group position={[-1.2, 0, 0]}>
          <InkCylinder radius={0.05} height={3.4} position={[0, 1.7, 0]} color="#5a4030" ink={0.01} />
          <mesh position={[0.75, 2.1, 0.06]} rotation={[0, 0, -0.08]}>
            <planeGeometry args={[1.4, 2.4]} />
            <meshToonMaterial color="#a8442a" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
          <InkBox size={[1.9, 0.04, 0.04]} position={[0.8, 2.6, 0.08]} rotation={[0, 0, 0.55]} color="#5a4030" ink={0.008} />
        </group>
      )}
    </group>
  );
};

// Floating filth carried by the river: brown lumps, cabbage leaves, scum rafts, a barrel stave.
export const Filth: React.FC<{ frame: number; w: WaterState; level?: number; count?: number; x0?: number; x1?: number; z0?: number; z1?: number; seed?: number }> = ({
  frame,
  w,
  level = 0,
  count = 40,
  x0 = -14,
  x1 = 14,
  z0 = -12,
  z1 = 1.2,
  seed = 1,
}) => {
  const drift = w.drift ?? 0;
  const span = x1 - x0;
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const k = seed * 100 + i;
        const x = x0 + ((((rand(k) * span + drift * (0.9 + rand(k + 1) * 0.2)) % span) + span) % span);
        const z = z0 + rand(k + 2) * (z1 - z0);
        const y = waterY(x, z, frame, w, level);
        const kind = i % 5;
        const s = 0.12 + rand(k + 3) * 0.16;
        const spin = rand(k + 4) * 6 + frame * 0.01 * (rand(k + 5) - 0.5);
        if (kind === 4)
          return (
            <mesh key={i} position={[x, y + 0.015, z]} rotation={[-Math.PI / 2, 0, spin]} scale={[s * 3, s * 1.6, 1]}>
              <circleGeometry args={[1, 10]} />
              <meshBasicMaterial color="#cfc394" transparent opacity={0.75} depthWrite={false} />
            </mesh>
          );
        return (
          <Blob
            key={i}
            position={[x, y + 0.02, z]}
            rotation={[0.3, spin, 0.2]}
            scale={kind === 2 ? [s * 1.3, s * 0.3, s] : [s, s * 0.45, s * 0.85]}
            color={kind === 0 ? "#5a4026" : kind === 1 ? "#6e5a2c" : kind === 2 ? "#7a9a3a" : "#4a3a22"}
            ink={0.02}
            detail={0}
          />
        );
      })}
    </group>
  );
};

// Green stink fumes rising off the water (inked cel puffs).
export const Stink: React.FC<{ at: Vec3; frame: number; size?: number; rise?: number; wind?: number; seed?: number }> = ({ at, frame, size = 0.09, rise = 1.4, wind = 0.5, seed = 0 }) => (
  <group userData={{ ghost: true }}>
    <SmokePlume position={at} world={[at[0], at[2]]} frame={frame + seed * 37} size={size} rise={rise} wind={wind} period={60} puffs={6} colors={["#c8d27a", "#8a9a44", "#d8d8a8", "#a8a878"]} />
  </group>
);

// A sewer arch in the terrace wall (face toward +z) gushing brown water down into the river.
const SewerArch: React.FC<{ x: number; frame: number; flow: number; y?: number; level: number }> = ({ x, frame, flow, y = -0.1, level }) => {
  const stream = useOwned(() =>
    canvasTexture(128, 256, (ctx) => {
      ctx.fillStyle = "#5e4628";
      ctx.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = rand(i) > 0.5 ? "rgba(160,130,70,0.7)" : "rgba(40,30,16,0.6)";
        ctx.fillRect(rand(i + 1) * 128, rand(i + 2) * 256, 4 + rand(i + 3) * 8, 30 + rand(i + 4) * 60);
      }
    }),
  );
  stream.wrapS = stream.wrapT = THREE.RepeatWrapping;
  stream.offset.y = frame * 0.06;
  const z = TH.far + 0.02;
  const water = RIVER.water + level;
  const drop = Math.max(0.05, y - water + 0.1);
  return (
    <group position={[x, 0, 0]}>
      {/* brick ring and dark mouth */}
      <mesh position={[0, y + 0.35, z + 0.01]}>
        <circleGeometry args={[0.85, 32, 0, Math.PI]} />
        <meshToonMaterial color="#9a5034" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, y - 0.05, z + 0.01]}>
        <planeGeometry args={[1.7, 0.8]} />
        <meshToonMaterial color="#9a5034" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, y + 0.35, z + 0.02]}>
        <circleGeometry args={[0.62, 32, 0, Math.PI]} />
        <meshBasicMaterial color="#120c08" />
      </mesh>
      <mesh position={[0, y, z + 0.02]}>
        <planeGeometry args={[1.24, 0.72]} />
        <meshBasicMaterial color="#120c08" />
      </mesh>
      {flow > 0.02 && (
        <group userData={{ ghost: true }}>
          <mesh position={[0, y - 0.36 - drop / 2 + 0.2, z + 0.2]} rotation={[-0.25, 0, 0]}>
            <planeGeometry args={[1.0 * flow, drop + 0.4]} />
            <meshBasicMaterial map={stream} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const t = (frame * 0.04 + rand(i)) % 1;
            const s = (0.18 + t * 0.35) * flow;
            return <Blob key={i} position={[(rand(i + 4) - 0.5) * 1.2, water + 0.03, z + 0.5 + t * 1.6]} scale={[s * 1.4, s * 0.25, s]} color={i % 2 ? "#6a5230" : "#806640"} ink={0.02} detail={0} />;
          })}
        </group>
      )}
    </group>
  );
};

// ---------- the Thames at Westminster ----------

export const ThamesSet: React.FC<{
  camera: CameraShot;
  frame: number;
  mode?: ThamesMode;
  water?: WaterState;
  level?: number;
  sewage?: number;
  filth?: number;
  quay?: boolean;
  children?: React.ReactNode;
}> = ({ camera, frame, mode = "haze", water = {}, level = 0, sewage = 1, filth = 36, quay = true, children }) => {
  const m = T_MOODS[mode];
  const dusk = mode === "dusk";
  const camX = camera.position[0];
  const facade = useOwned(() => {
    const t = facadeCanvas(dusk);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(12, 1);
    return t;
  }, [dusk]);
  const tower = useOwned(() => {
    const t = towerCanvas(dusk);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 3);
    return t;
  }, [dusk]);
  const granite = useOwned(() => {
    const t = stoneCanvas("#b4a482", "rgba(70,60,40,0.45)");
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 2);
    return t;
  });
  const quayStone = useOwned(() => {
    const t = stoneCanvas("#9c8e74", "rgba(50,40,30,0.5)");
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(40, 1);
    return t;
  });
  const gauge = useOwned(() => gaugeCanvas());
  const clock = useOwned(() => clockCanvas());
  const stone = dusk ? "#c49a7a" : "#dcc08c";
  const roof = dusk ? "#3a3448" : "#5a6070";
  const bays = Array.from({ length: 17 }, (_, i) => -23 + i * 2.875);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={m.fog} />
      <Lights m={m} reach={30} />
      <Sky camera={camera} m={m} />
      <Hills z={-80} shift={camX * 0.5} width={360} low={3} high={8} color={m.far[0]} seed={6} />
      <Haze z={-60} color={m.fog[0]} />
      <Hills z={-50} shift={camX * 0.25} width={260} low={2} high={6} color={m.far[1]} seed={9} />

      {/* the river */}
      <group position={[TH.off, level, TH.zc]} rotation={[0, Math.PI / 2, 0]}>
        <RiverWater frame={frame} m={m} w={water} debris={false} />
      </group>
      <mesh position={[0, -1.7, TH.zc]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 20]} />
        <meshBasicMaterial color="#2e2618" />
      </mesh>
      {filth > 0 && <Filth frame={frame} w={water} level={level} count={filth} />}

      {/* far bank: mud at low water, the granite terrace wall, the tide gauge and sewer arches */}
      <InkBox size={[70, 0.4, 1.6]} position={[0, -0.45, TH.far + 0.7]} rotation={[0.28, 0, 0]} color={dusk ? "#4a3a30" : "#6a5a3a"} ink={0} />
      <InkBox size={[70, 3.2, 1.4]} position={[0, -0.7, TH.far - 0.7]} color="#ffffff" map={granite} ink={0.02} />
      <InkBox size={[70, 0.18, 1.6]} position={[0, 0.98, TH.far - 0.7]} color={dusk ? "#a88a72" : "#cbb894"} ink={0.015} />
      <group position={TH.gauge}>
        <mesh position={[0, -0.05, TH.far - TH.gauge[2] + 0.06]}>
          <planeGeometry args={[0.32, 2.5]} />
          <meshToonMaterial color="#ffffff" map={gauge} gradientMap={toonRamp} />
        </mesh>
        <InkBox size={[0.4, 0.06, 0.1]} position={[0, 1.22, TH.far - TH.gauge[2] + 0.06]} color="#3a3a3a" ink={0.006} />
        <Label text="TIDE" position={[0, 1.55, TH.far - TH.gauge[2] + 0.12]} width={0.62} />
      </group>
      {TH.arches.map((x, i) => (
        <SewerArch key={i} x={x} frame={frame + i * 17} flow={sewage} level={level} />
      ))}

      {/* Parliament's river front */}
      <group position={[0, 1.07, 0]}>
        <InkBox size={[48, 8, 6]} position={[0, 4, TH.far - 3.4]} color="#ffffff" map={facade} ink={0.03} />
        <InkBox size={[48.4, 0.5, 6.4]} position={[0, 8.15, TH.far - 3.4]} color={stone} ink={0.02} />
        <InkBox size={[47, 1.6, 4.4]} position={[0, 9.0, TH.far - 3.6]} rotation={[0, 0, 0]} color={roof} ink={0.02} />
        {bays.map((x, i) => (
          <group key={i} position={[x, 0, TH.far - 0.36]}>
            <InkBox size={[0.3, 8.9, 0.3]} position={[0, 4.45, 0]} color={stone} ink={0.012} />
            <InkCone radius={0.2} height={0.9} position={[0, 9.35, 0]} color={stone} />
          </group>
        ))}
        {/* Victoria Tower (south end) */}
        <group position={[-27, 0, TH.far - 3.6]}>
          <InkBox size={[6, 22, 6]} position={[0, 11, 0]} color="#ffffff" map={tower} ink={0.03} />
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <group key={`${sx}${sz}`} position={[sx * 3.05, 0, sz * 3.05]}>
                <InkCylinder radius={0.45} height={24} position={[0, 12, 0]} color={stone} ink={0.02} />
                <InkCone radius={0.55} height={1.6} position={[0, 24.8, 0]} color={roof} sides={8} />
              </group>
            )),
          )}
          <InkCone radius={3.6} height={3.4} position={[0, 23.7, 0]} color={roof} />
          <InkCylinder radius={0.06} height={4} position={[0, 27, 0]} color="#3a3a3a" ink={0.01} />
          <mesh position={[0.75, 28.3, 0]}>
            <planeGeometry args={[1.4, 0.8]} />
            <meshToonMaterial color="#c8302a" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
        </group>
        {/* the central spire */}
        <group position={[2, 0, TH.far - 4]}>
          <InkCylinder radius={1.3} height={6} position={[0, 11, 0]} color={stone} ink={0.02} />
          <InkCone radius={1.4} height={6} position={[0, 17, 0]} color={stone} sides={8} />
        </group>
        {/* the Clock Tower (north end), with scaffold poles: still being finished in 1858 */}
        <group position={[26, 0, TH.far - 2.4]}>
          <InkBox size={[3, 16, 3]} position={[0, 8, 0]} color="#ffffff" map={tower} ink={0.03} />
          <InkBox size={[3.5, 3.2, 3.5]} position={[0, 17.6, 0]} color={stone} ink={0.03} />
          <mesh position={[0, 17.6, 1.77]}>
            <circleGeometry args={[1.25, 40]} />
            <meshBasicMaterial map={clock} toneMapped={false} />
          </mesh>
          <InkBox size={[3.2, 2.4, 3.2]} position={[0, 20.4, 0]} color={stone} ink={0.03} />
          <InkCone radius={2.2} height={6.5} position={[0, 24.8, 0]} color={dusk ? "#5a5a40" : "#7a8a5a"} />
          <InkCone radius={0.25} height={1.8} position={[0, 28.8, 0]} color="#d8b040" sides={6} />
          {[-1.9, 1.9].map((x) => (
            <InkBox key={x} size={[0.08, 13, 0.08]} position={[x, 6.5, 1.9]} color="#8a6a48" ink={0.006} />
          ))}
          {[3, 6, 9, 12].map((y) => (
            <InkBox key={y} size={[4, 0.08, 0.08]} position={[0, y, 1.9]} color="#8a6a48" ink={0.006} />
          ))}
        </group>
      </group>

      {/* near bank: a stone quay (top y = 0), bollards, coiled rope, crates and a lamp post */}
      {quay && (
        <group>
          <InkBox size={[90, 2.6, 6]} position={[0, -1.3, TH.near + 3]} color="#ffffff" map={quayStone} ink={0.02} />
          <InkBox size={[90, 0.12, 0.4]} position={[0, 0.0, TH.near + 0.2]} color="#7e7058" ink={0.01} />
          {[-5.5, -1.2, 3.8, 8.5].map((x) => (
            <group key={x} position={[x, 0, TH.near + 0.45]}>
              <InkCylinder radius={0.13} height={0.5} position={[0, 0.25, 0]} color="#2a2a2a" ink={0.012} />
              <InkCylinder radius={0.16} height={0.06} position={[0, 0.52, 0]} color="#2a2a2a" ink={0.012} />
            </group>
          ))}
          <mesh position={[-0.6, 0.05, TH.near + 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.22, 0.05, 8, 24]} />
            <meshToonMaterial color="#b89a64" gradientMap={toonRamp} />
          </mesh>
          <InkBox size={[0.6, 0.5, 0.5]} position={[2.2, 0.25, TH.near + 1.6]} color="#8a6a44" ink={0.012} />
          <InkBox size={[0.5, 0.4, 0.45]} position={[2.3, 0.7, TH.near + 1.55]} color="#9a7a50" ink={0.012} />
          <group position={[-3.2, 0, TH.near + 1.2]}>
            <InkCylinder radius={0.06} height={2.6} position={[0, 1.3, 0]} color="#1e2a22" ink={0.01} />
            <InkBox size={[0.3, 0.38, 0.3]} position={[0, 2.75, 0]} color="#2a3a2e" ink={0.012} />
            {dusk && <Halo position={[0, 2.75, 0.2]} size={1.2} color="#ffc070" strength={0.7} />}
          </group>
        </group>
      )}
      {children}
    </>
  );
};

// ---------- interiors: shared shell ----------

type Mat = THREE.Texture;
const Shell: React.FC<{ camera: CameraShot; floor: Mat; wall: Mat; wallColor: string; width: number; depth: number; keyLight?: [number, string]; ambient?: [number, string]; hemi?: [string, string, number]; keyPos?: Vec3; children?: React.ReactNode; sideWalls?: boolean; backWall?: boolean }> = ({
  camera,
  floor,
  wall,
  wallColor,
  width,
  depth,
  keyLight = [1.8, "#fff0d8"],
  ambient = [0.9, "#fff2e0"],
  hemi = ["#fff0d8", "#5a4030", 0.5],
  keyPos = [3, 6, 5],
  children,
  sideWalls = true,
  backWall = true,
}) => (
  <>
    <CameraRig {...camera} />
    <ambientLight intensity={ambient[0]} color={ambient[1]} />
    <hemisphereLight args={[hemi[0], hemi[1], hemi[2]]} />
    <directionalLight position={keyPos} intensity={keyLight[0]} color={keyLight[1]} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
    <directionalLight position={[0, 3, 8]} intensity={0.45} color={hemi[0]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width * 2, depth * 2]} />
      <meshToonMaterial color="#ffffff" map={floor} gradientMap={toonRamp} />
    </mesh>
    {backWall && <InkBox size={[width, 3.6, 0.1]} position={[0, 1.8, -depth / 2]} color={wallColor} map={wall} ink={0} />}
    {sideWalls &&
      [-1, 1].map((s) => <InkBox key={s} size={[0.1, 3.6, depth * 2]} position={[(s * width) / 2, 1.8, 0]} color={wallColor} map={wall} ink={0} />)}
    <InkBox size={[width, 0.1, depth * 2]} position={[0, 3.6, 0]} color="#3a2a20" ink={0} />
    {children}
  </>
);

// ---------- the committee room on the river ----------

// Window in the back wall (z = CR.wall), opening x ±CR.w, y CR.sill..CR.top; outside, the river far below with the
// Lambeth bank. `outside.level` raises the river (it reaches the sill at 1). The MP stands at CR.mp.
export const CR = { wall: -2.4, w: 0.7, sill: 0.8, top: 2.6, mp: [0.35, -1.75] as [number, number], door: [2.35, 0, -2.35] as Vec3, thermo: [-1.55, 1.55, -2.18] as Vec3 };
export const outsideWaterY = (level: number) => -1.6 + level * 2.25;

const traceryCanvas = (wall: string) =>
  canvasTexture(256, 512, (ctx) => {
    ctx.clearRect(0, 0, 256, 512);
    // wall outside the pointed arch
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(256, 0);
    ctx.lineTo(256, 150);
    ctx.quadraticCurveTo(250, 30, 128, 6);
    ctx.quadraticCurveTo(6, 30, 0, 150);
    ctx.closePath();
    ctx.fill();
    // stone tracery: mullion, transom, a trefoil in the head
    ctx.strokeStyle = "#e8d8b0";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(128, 60);
    ctx.lineTo(128, 512);
    ctx.moveTo(0, 300);
    ctx.lineTo(256, 300);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 110, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#161212";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 150);
    ctx.quadraticCurveTo(6, 30, 128, 6);
    ctx.quadraticCurveTo(250, 30, 256, 150);
    ctx.stroke();
  });

export const CommitteeRoom: React.FC<{
  camera: CameraShot;
  frame: number;
  open?: number;
  panic?: number;
  outside?: { drift: number; level: number; dusk?: boolean };
  curtains?: boolean;
  thermo?: number;
  chairs?: boolean;
  door?: number;
  children?: React.ReactNode;
}> = ({ camera, frame, open = 0, panic = 0, outside = { drift: 0, level: 0 }, curtains = true, thermo = 1, chairs = true, door = 0, children }) => {
  const floor = surfaceTexture("carpet", 6, 6) as THREE.Texture;
  const wall = surfaceTexture("panel", 3, 2) as THREE.Texture;
  const tracery = useOwned(() => traceryCanvas("#7a4e2e"));
  const lambeth = useOwned(() => lambethCanvas(!!outside.dusk), [!!outside.dusk]);
  const wy = outsideWaterY(outside.level);
  const W = 7;
  const z = CR.wall;
  const wallC = "#8a5a36";
  const green = panic;
  return (
    <Shell camera={camera} floor={floor} wall={wall} wallColor={wallC} width={W} depth={9} backWall={false} keyLight={[1.6 * (1 - green * 0.4), "#fff0d0"]} ambient={[0.85, "#fff0dc"]} keyPos={[1, 5, -6]}>
      {green > 0 && <ambientLight intensity={0.7 * green} color="#9aff70" />}
      {green > 0 && <pointLight position={[0, 1.5, z + 0.4]} intensity={4 * green} distance={6} color="#b8ff6a" />}
      {/* the window wall in four pieces round the opening */}
      <InkBox size={[W / 2 - CR.w, 3.6, 0.3]} position={[-(W / 2 + CR.w) / 2, 1.8, z]} color={wallC} map={wall} ink={0.01} />
      <InkBox size={[W / 2 - CR.w, 3.6, 0.3]} position={[(W / 2 + CR.w) / 2, 1.8, z]} color={wallC} map={wall} ink={0.01} />
      <InkBox size={[CR.w * 2, CR.sill, 0.3]} position={[0, CR.sill / 2, z]} color={wallC} map={wall} ink={0.01} />
      <InkBox size={[CR.w * 2, 3.6 - CR.top, 0.3]} position={[0, (3.6 + CR.top) / 2, z]} color={wallC} map={wall} ink={0.01} />
      <InkBox size={[CR.w * 2 + 0.2, 0.08, 0.42]} position={[0, CR.sill + 0.04, z + 0.06]} color="#d8c8a0" ink={0.008} />
      <mesh position={[0, (CR.sill + CR.top) / 2, z + 0.155]}>
        <planeGeometry args={[CR.w * 2, CR.top - CR.sill]} />
        <meshBasicMaterial map={tracery} transparent alphaTest={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* casements swinging in */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * CR.w, CR.sill + 0.9, z + 0.16]} rotation={[0, s * open * 1.6, 0]}>
          <InkBox size={[0.04, 1.2, 0.04]} position={[-s * 0.02, -0.15, 0]} color="#3a2a1e" ink={0.004} />
          <InkBox size={[0.04, 1.2, 0.04]} position={[-s * 0.66, -0.15, 0]} color="#3a2a1e" ink={0.004} />
          <InkBox size={[0.68, 0.04, 0.04]} position={[-s * 0.34, 0.45, 0]} color="#3a2a1e" ink={0.004} />
          <InkBox size={[0.68, 0.04, 0.04]} position={[-s * 0.34, -0.75, 0]} color="#3a2a1e" ink={0.004} />
          <mesh position={[-s * 0.34, -0.15, 0]}>
            <planeGeometry args={[0.64, 1.18]} />
            <meshBasicMaterial color="#cfe4e8" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* wet curtains (set dressing), dripping */}
      {curtains &&
        [-1, 1].map((s) => (
          <group key={`c${s}`} position={[s * (CR.w + 0.32), 1.75, z + 0.3]}>
            {Array.from({ length: 5 }, (_, i) => (
              <InkBox key={i} size={[0.13, 2.1, 0.06]} position={[(i - 2) * 0.1, 0, (i % 2) * 0.05]} color={i % 2 ? "#c8cdb4" : "#d8dcc4"} ink={0.006} />
            ))}
            <InkBox size={[0.7, 0.08, 0.1]} position={[0, 1.1, 0]} color="#5a3a22" ink={0.006} />
            {Array.from({ length: 4 }, (_, i) => {
              const t = ((frame + i * 11) % 40) / 40;
              return (
                <mesh key={`d${i}`} position={[(i - 1.5) * 0.12, -1.06 - t * 0.9, 0.04]}>
                  <sphereGeometry args={[0.018, 8, 6]} />
                  <meshBasicMaterial color="#e8f0e0" />
                </mesh>
              );
            })}
          </group>
        ))}
      {/* the outside: the river far below and the Lambeth bank */}
      <mesh position={[0, wy, -14]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 24]} />
        <meshToonMaterial color={outside.dusk ? "#5c4a3e" : "#6e6236"} gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 40 }, (_, i) => {
        const x = ((((rand(i) * 30 + outside.drift * (0.9 + rand(i + 1) * 0.2)) % 30) + 30) % 30) - 15;
        const zz = -3.2 - rand(i + 2) * 14;
        return (
          <mesh key={i} position={[x, wy + 0.02 + 0.03 * Math.sin(frame * 0.1 + i), zz]} rotation={[-Math.PI / 2, 0, rand(i) * 3]} scale={[0.25 + rand(i + 3) * 0.6, 0.12 + rand(i + 4) * 0.2, 1]}>
            <circleGeometry args={[1, 10]} />
            <meshBasicMaterial color={i % 3 ? (outside.dusk ? "#d8b0a0" : "#c8bf92") : "#4a3820"} transparent opacity={0.8} depthWrite={false} />
          </mesh>
        );
      })}
      <mesh position={[0, 3.2, -26]}>
        <planeGeometry args={[48, 18]} />
        <meshBasicMaterial map={lambeth} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, -2.6, -2.9]}>
        <planeGeometry args={[40, 2.6]} />
        <meshToonMaterial color="#b4a482" gradientMap={toonRamp} />
      </mesh>
      {/* the long committee table with green cloth, papers, inkwell; chairs */}
      <group position={[0, 0, 0.2]}>
        <InkBox size={[2.8, 0.06, 1.0]} position={[0, 0.74, 0]} color="#2f6a3e" ink={0.012} />
        {[-1.25, 1.25].map((x) => [-0.4, 0.4].map((zz) => <InkBox key={`${x}${zz}`} size={[0.08, 0.72, 0.08]} position={[x, 0.36, zz]} color="#4a2e1a" ink={0.008} />))}
        <InkBox size={[0.32, 0.01, 0.24]} position={[-0.6, 0.775, 0.1]} rotation={[0, 0.2, 0]} color="#f4ecd8" ink={0.003} />
        <InkBox size={[0.3, 0.01, 0.22]} position={[0.5, 0.775, -0.1]} rotation={[0, -0.3, 0]} color="#f4ecd8" ink={0.003} />
        <InkCylinder radius={0.05} height={0.07} position={[0.05, 0.81, 0.05]} color="#1a1a2a" ink={0.006} />
        {chairs &&
          [-0.9, 0, 0.9].map((x) => (
            <group key={x} position={[x, 0, 0.75]}>
              <InkBox size={[0.42, 0.06, 0.42]} position={[0, 0.44, 0]} color="#7a2a22" ink={0.008} />
              <InkBox size={[0.42, 0.55, 0.05]} position={[0, 0.74, 0.19]} color="#4a2a1a" ink={0.008} />
              {[-0.17, 0.17].map((a) => [-0.17, 0.17].map((b) => <InkBox key={`${a}${b}`} size={[0.04, 0.44, 0.04]} position={[a, 0.22, b]} color="#4a2a1a" ink={0.004} />))}
            </group>
          ))}
      </group>
      {/* portraits and the thermometer */}
      {[-2.6, 2.6].map((x) => (
        <group key={x} position={[x, 1.9, z + 0.19]}>
          <InkBox size={[0.7, 0.9, 0.04]} position={[0, 0, 0]} color="#c8a040" ink={0.008} />
          <InkBox size={[0.56, 0.76, 0.02]} position={[0, 0, 0.02]} color={x < 0 ? "#3a3048" : "#3a4830"} ink={0} />
          <Blob position={[0, 0.06, 0.04]} scale={[0.14, 0.17, 0.02]} color="#d8b090" ink={0.004} detail={1} />
        </group>
      ))}
      <Thermometer position={CR.thermo} level={thermo} />
      {/* the door on the right */}
      <group position={CR.door}>
        <InkBox size={[1.0, 2.3, 0.1]} position={[0, 1.15, -0.02]} color="#2a1a10" ink={0} />
        <group position={[-0.48, 0, 0.04]} rotation={[0, door * 1.4, 0]}>
          <InkBox size={[0.96, 2.2, 0.06]} position={[0.48, 1.1, 0]} color="#6a4022" ink={0.01} />
          <InkCylinder radius={0.03} height={0.04} position={[0.85, 1.05, 0.05]} rotation={[Math.PI / 2, 0, 0]} color="#d8b040" ink={0.004} />
        </group>
      </group>
      {children}
    </Shell>
  );
};

// The wall thermometer (macro prop): brass back plate, a glass tube with a red column; `level` 0..1 fills it to 30.
export const Thermometer: React.FC<{ position: Vec3; level: number }> = ({ position, level }) => (
  <group position={position}>
    <InkBox size={[0.24, 0.8, 0.03]} position={[0, 0, 0]} color="#c89a3a" ink={0.006} />
    <InkCylinder radius={0.028} height={0.62} position={[0, 0.02, 0.03]} color="#f4f4f0" ink={0.004} />
    <mesh position={[0, -0.3, 0.03]}>
      <sphereGeometry args={[0.05, 16, 12]} />
      <meshToonMaterial color="#d8282a" gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.018} height={0.04 + level * 0.52} position={[0, -0.29 + (0.04 + level * 0.52) / 2, 0.045]} color="#d8282a" ink={0} />
    {Array.from({ length: 7 }, (_, i) => (
      <InkBox key={i} size={[0.05, 0.008, 0.005]} position={[0.07, -0.25 + i * 0.09, 0.02]} color="#2a2a2a" ink={0} />
    ))}
  </group>
);

// ---------- the library ----------

export const LibrarySet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const floor = surfaceTexture("carpet", 6, 6) as THREE.Texture;
  const wall = surfaceTexture("wallpaper", 3, 2) as THREE.Texture;
  const books = useOwned(() =>
    canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = "#3a2214";
      ctx.fillRect(0, 0, 512, 512);
      const cols = ["#7a2a22", "#2a4a3a", "#8a6a2a", "#3a2a4a", "#a0402a", "#2a3a5a", "#6a5a3a"];
      for (let r = 0; r < 5; r++) {
        let x = 4;
        while (x < 508) {
          const w = 12 + rand(r * 50 + x) * 14;
          ctx.fillStyle = cols[Math.floor(rand(r * 31 + x) * cols.length)];
          ctx.fillRect(x, r * 102 + 10, w - 2, 86 - rand(x + r) * 14);
          ctx.fillStyle = "rgba(240,200,120,0.6)";
          ctx.fillRect(x + 2, r * 102 + 30, w - 6, 3);
          x += w;
        }
        ctx.fillStyle = "#5a3a22";
        ctx.fillRect(0, r * 102 + 96, 512, 8);
      }
    }),
  );
  return (
    <Shell camera={camera} floor={floor} wall={wall} wallColor="#9a3a2e" width={8} depth={6} keyLight={[1.5, "#ffe0c0"]} ambient={[0.9, "#ffe8d8"]}>
      {[-2.5, -0.6, 1.3, 3.2].map((x) => (
        <group key={x} position={[x, 0, -2.85]}>
          <InkBox size={[1.7, 2.9, 0.4]} position={[0, 1.45, 0]} color="#ffffff" map={books} ink={0.015} />
          <InkBox size={[1.8, 0.12, 0.46]} position={[0, 2.95, 0]} color="#5a3a22" ink={0.01} />
        </group>
      ))}
      <InkBox size={[1.6, 0.06, 0.8]} position={[0.2, 0.72, -0.6]} color="#5a3a22" ink={0.01} />
      {[-0.5, 0.9].map((x) => (
        <InkBox key={x} size={[0.08, 0.7, 0.6]} position={[x, 0.35, -0.6]} color="#4a2e1a" ink={0.008} />
      ))}
      <group position={[0.7, 0.75, -0.7]}>
        <InkCylinder radius={0.02} height={0.36} position={[0, 0.18, 0]} color="#c8a040" ink={0.004} />
        <mesh position={[0, 0.4, 0]}>
          <coneGeometry args={[0.16, 0.14, 24, 1, true]} />
          <meshToonMaterial color="#2a7a4a" gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
        <Halo position={[0, 0.3, 0.1]} size={0.8} color="#ffe0a0" strength={0.5} />
      </group>
      <InkBox size={[0.3, 0.05, 0.22]} position={[-0.1, 0.77, -0.6]} rotation={[0, 0.3, 0]} color="#7a2a22" ink={0.006} />
      <Stink at={[-3.3, 1.2, -1.5]} frame={frame} size={0.12} rise={1.6} wind={1.1} />
      <Stink at={[-3.3, 0.6, -0.2]} frame={frame} size={0.1} rise={1.2} wind={1.3} seed={2} />
      {children}
    </Shell>
  );
};

// ---------- the mechanism: the Thames in a glass tank ----------

// A glass tank along x on a table: the model Westminster at the left end (x = -TANK.half), the SEA plunger at the
// right. `slosh` -1..1 tips the water toward Westminster (+1) or the sea (-1); filth rides it; `lime` 0..1 whitens.
export const TANK = { half: 0.62, depth: 0.16, top: 0.86, h: 0.3, table: 0.78 };
const tankLevel = (x: number, slosh: number, frame: number) => TANK.table + 0.18 + slosh * 0.06 * (-x / TANK.half) + 0.008 * Math.sin(x * 9 - frame * 0.25);

const TankWater: React.FC<{ slosh: number; frame: number; lime: number }> = ({ slosh, frame, lime }) => {
  const N = 48;
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  React.useEffect(() => () => geo.dispose(), [geo]);
  const pos: number[] = [];
  const x0 = -TANK.half + 0.02;
  const x1 = TANK.half - 0.02;
  const zf = TANK.depth - 0.01;
  const zb = -TANK.depth + 0.01;
  const bottom = TANK.table + 0.02;
  for (let i = 0; i < N; i++) {
    const a = x0 + ((x1 - x0) * i) / N;
    const b = x0 + ((x1 - x0) * (i + 1)) / N;
    const ya = tankLevel(a, slosh, frame);
    const yb = tankLevel(b, slosh, frame);
    // top
    pos.push(a, ya, zf, b, yb, zf, b, yb, zb, a, ya, zf, b, yb, zb, a, ya, zb);
    // front
    pos.push(a, bottom, zf, b, bottom, zf, b, yb, zf, a, bottom, zf, b, yb, zf, a, ya, zf);
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const col = new THREE.Color("#6a5e34").lerp(new THREE.Color("#d8d8c8"), lime * 0.55);
  return (
    <mesh geometry={geo}>
      <meshToonMaterial color={col} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
  );
};

export const TankSet: React.FC<{ camera: CameraShot; frame: number; slosh: number; tide: number; lime?: number; sackY?: number | null; children?: React.ReactNode }> = ({
  camera,
  frame,
  slosh,
  tide,
  lime = 0,
  sackY = null,
  children,
}) => {
  const floor = surfaceTexture("concrete", 6, 6) as THREE.Texture;
  const wall = surfaceTexture("plain", 3, 2) as THREE.Texture;
  const plunger = TANK.half + 0.1 - slosh * 0.12;
  return (
    <Shell camera={camera} floor={floor} wall={wall} wallColor="#3e5a86" width={7} depth={5} keyLight={[1.7, "#e8f0ff"]} ambient={[0.95, "#dfe8ff"]} hemi={["#dfe8ff", "#2a3040", 0.5]} keyPos={[2, 6, 4]}>
      <LightPool x={0} z={-0.2} color="#bfe0ff" strength={0.3} />
      {/* table */}
      <InkBox size={[1.7, 0.08, 0.7]} position={[0, TANK.table - 0.04, 0]} color="#5a6e8a" ink={0.012} />
      {[-0.75, 0.75].map((x) => [-0.28, 0.28].map((z) => <InkBox key={`${x}${z}`} size={[0.08, TANK.table - 0.08, 0.08]} position={[x, (TANK.table - 0.08) / 2, z]} color="#3a4a5e" ink={0.008} />))}
      {/* the water and filth */}
      <TankWater slosh={slosh} frame={frame} lime={lime} />
      {Array.from({ length: 14 }, (_, i) => {
        const base = -0.45 + (i / 13) * 0.85;
        const x = Math.max(-TANK.half + 0.1, Math.min(TANK.half - 0.08, base - slosh * 0.22 + 0.03 * Math.sin(frame * 0.07 + i)));
        const z = (rand(i) - 0.5) * 0.2;
        return <Blob key={i} position={[x, tankLevel(x, slosh, frame) + 0.01, z]} rotation={[0.3, i, 0]} scale={[0.03, 0.013, 0.026]} color={i % 3 ? "#5a4026" : "#7a9a3a"} ink={0.006} detail={0} />;
      })}
      {/* model Westminster on its bank at the left end */}
      <group position={[-TANK.half + 0.14, TANK.table, 0]} scale={0.75}>
        <InkBox size={[0.3, 0.3, 0.42]} position={[0, 0.15, 0]} color="#b8a070" ink={0.006} />
        <InkBox size={[0.2, 0.14, 0.4]} position={[0, 0.37, 0]} color="#dcc08c" ink={0.006} />
        <InkBox size={[0.06, 0.36, 0.06]} position={[0, 0.48, -0.16]} color="#dcc08c" ink={0.005} />
        <InkBox size={[0.04, 0.3, 0.04]} position={[0, 0.45, 0.17]} color="#dcc08c" ink={0.005} />
        <InkCone radius={0.04} height={0.08} position={[0, 0.64, 0.17]} color="#7a8a5a" ink={0.005} />
      </group>
      {/* the SEA plunger at the right end */}
      <group position={[plunger, TANK.table + 0.2, 0]}>
        <InkBox size={[0.03, 0.26, 0.28]} position={[-0.12, -0.02, 0]} color="#5a6a7a" ink={0.005} />
        <InkCylinder radius={0.015} height={0.5} position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#8a8a8a" ink={0.004} />
        <InkBox size={[0.06, 0.2, 0.06]} position={[0.4, 0, 0]} color="#c84a2a" ink={0.005} />
      </group>
      {/* glass */}
      <group userData={{ ghost: true }}>
        <mesh position={[0, TANK.table + TANK.h / 2, 0]}>
          <boxGeometry args={[TANK.half * 2, TANK.h, TANK.depth * 2]} />
          <meshBasicMaterial color="#cfe8ff" transparent opacity={0.13} depthWrite={false} />
        </mesh>
        {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.02, TANK.h, 0.02]} position={[sx * TANK.half, TANK.table + TANK.h / 2, sz * TANK.depth]} color="#9ab0c0" ink={0.003} />))}
        {[0, TANK.h].flatMap((y) => [-1, 1].map((sz) => <InkBox key={`${y}${sz}`} size={[TANK.half * 2, 0.02, 0.02]} position={[0, TANK.table + y, sz * TANK.depth]} color="#9ab0c0" ink={0.003} />))}
      </group>
      {sackY !== null && <Sack position={[0.1, sackY, 0]} rotation={[0, 0.4, 0.3]} scale={0.28} />}
      {/* labels on cards */}
      <Label text="WESTMINSTER" position={[-0.3, 1.36, -0.2]} width={0.42} />
      <Label text="SEA" position={[0.72, 1.36, -0.2]} width={0.26} />
      <Label text="THAMES" position={[0.1, 1.15, 0.2]} width={0.38} />
      {/* the TIDE dial on the wall */}
      <TideDial position={[0.1, 1.85, -2.42]} tide={tide} size={0.8} />
      {children}
    </Shell>
  );
};

// A brass dial with IN on the left and OUT on the right; `tide` -1 (out) .. 1 (in) swings the needle. `high` writes
// HIGH TIDE at the top instead of TIDE.
export const TideDial: React.FC<{ position: Vec3; tide: number; title?: string; size?: number }> = ({ position, tide, title = "TIDE", size = 1 }) => (
  <group position={position} scale={size}>
    <InkCylinder radius={0.42} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#c89a3a" ink={0.012} />
    <InkCylinder radius={0.36} height={0.02} position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]} color="#f4ecd2" ink={0} />
    {Array.from({ length: 9 }, (_, i) => {
      const a = (-0.5 + i / 8) * Math.PI * 0.9;
      return <InkBox key={i} size={[0.012, 0.06, 0.01]} position={[Math.sin(a) * 0.3, Math.cos(a) * 0.3, 0.05]} rotation={[0, 0, -a]} color="#2a2a2a" ink={0} />;
    })}
    <group position={[0, 0, 0.06]} rotation={[0, 0, tide * Math.PI * 0.4]}>
      <InkBox size={[0.025, 0.3, 0.012]} position={[0, 0.13, 0]} color="#c8282a" ink={0.004} />
    </group>
    <InkCylinder radius={0.035} height={0.03} position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]} color="#3a3a3a" ink={0.003} />
    <Label text="IN" position={[-0.3, -0.17, 0.08]} width={0.2} />
    <Label text="OUT" position={[0.3, -0.17, 0.08]} width={0.26} />
    <Label text={title} position={[0, 0.58, 0.02]} width={title.length > 5 ? 0.66 : 0.4} />
  </group>
);

// ---------- the intercepting sewer ----------

// An egg-shaped brick tube along z (toward -z is east, to the outfall); a walkway on the left at y = 0, the brown flow
// in the channel at y = -0.35 running toward -z; lanterns; the 82 MILES plaque; on the right an old sewer arch whose
// TO RIVER flap gate closes (`gate` 0 open .. 1 shut).
export const TUNNEL = { r: 1.7, cy: 0.75, walk: -0.75, plaque: [-1.55, 1.15, -3.0] as Vec3, side: [1.2, 0.3, -1.4] as Vec3 };
export const TunnelSet: React.FC<{ camera: CameraShot; frame: number; gate?: number; plaque?: number; children?: React.ReactNode }> = ({ camera, frame, gate = 0, plaque, children }) => {
  const brick = useOwned(() => {
    const t = brickCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 10);
    return t;
  });
  const flow = useOwned(() => {
    const t = canvasTexture(128, 512, (ctx) => {
      ctx.fillStyle = "#5e4a2a";
      ctx.fillRect(0, 0, 128, 512);
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = rand(i) > 0.5 ? "rgba(170,140,80,0.6)" : "rgba(40,30,16,0.5)";
        ctx.fillRect(rand(i + 1) * 128, rand(i + 2) * 512, 6 + rand(i + 3) * 18, 4 + rand(i + 4) * 8);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 8);
    return t;
  });
  flow.offset.y = frame * 0.02;
  const lanterns = [2, -2.5, -7, -11.5, -16];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#120a06"]} />
      <fog attach="fog" args={["#2a1a10", 6, 24]} />
      <ambientLight intensity={0.55} color="#ffc890" />
      <hemisphereLight args={["#ffb070", "#2a1a10", 0.4]} />
      {lanterns.map((z, i) => (
        <group key={i}>
          <pointLight position={[-1.2, 1.7, z]} intensity={6} distance={6} color="#ffb05a" decay={1.6} />
          <InkBox size={[0.18, 0.26, 0.18]} position={[-1.35, 1.75, z]} color="#2a2420" ink={0.008} />
          <mesh position={[-1.35, 1.72, z]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshBasicMaterial color="#ffd890" toneMapped={false} />
          </mesh>
          <Halo position={[-1.3, 1.72, z + 0.1]} size={1.1} color="#ffb05a" strength={0.6 * (0.9 + 0.1 * Math.sin(frame * 0.4 + i))} />
        </group>
      ))}
      {/* the egg-shaped tube, seen from inside */}
      <mesh position={[0, TUNNEL.cy, -6]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.25]}>
        <cylinderGeometry args={[TUNNEL.r, TUNNEL.r, 30, 40, 1, true]} />
        <meshToonMaterial color="#ffffff" map={brick} gradientMap={toonRamp} side={THREE.BackSide} />
      </mesh>
      {/* walkway and channel */}
      <InkBox size={[1.4, 0.4, 30]} position={[TUNNEL.walk - 0.2, -0.2, -6]} color="#7a6a5a" ink={0.01} />
      <mesh position={[0.55, -0.35, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 30]} />
        <meshToonMaterial color="#ffffff" map={flow} gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const z = 3 - ((frame * 0.05 + rand(i) * 20) % 20);
        return <Blob key={i} position={[0.3 + rand(i + 3) * 0.6, -0.32, z]} scale={[0.1, 0.03, 0.08]} color={i % 2 ? "#5a4026" : "#7a6a3a"} ink={0.008} detail={0} />;
      })}
      {/* plaque */}
      <group position={TUNNEL.plaque} rotation={[0, Math.PI / 2 - 0.15, 0]}>
        <InkBox size={[0.9, 0.5, 0.04]} position={[0, 0, 0]} color="#1a1a1e" ink={0.01} />
        <Label text={"82 MILES"} position={[0, 0.03, 0.03]} width={0.74} appear={plaque} />
      </group>
      {/* the old sewer branch on the right and its flap gate */}
      <group position={TUNNEL.side} rotation={[0, -Math.PI / 2 + 0.2, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <circleGeometry args={[0.55, 28]} />
          <meshBasicMaterial color="#0c0806" />
        </mesh>
        <mesh position={[0, 0.25, -0.01]}>
          <ringGeometry args={[0.55, 0.72, 28]} />
          <meshToonMaterial color="#9a5034" gradientMap={toonRamp} />
        </mesh>
        <group position={[0, 0.8, 0.04]} rotation={[-(1 - gate) * 1.3, 0, 0]}>
          <InkBox size={[1.1, 1.1, 0.05]} position={[0, -0.55, 0]} color="#3a4a3a" ink={0.012} />
          {[-0.3, 0.3].map((x) => (
            <InkBox key={x} size={[0.05, 1.0, 0.03]} position={[x, -0.55, 0.04]} color="#5a6a5a" ink={0} />
          ))}
        </group>
        <Label text="TO RIVER" position={[0, 1.2, 0.05]} width={0.62} />
      </group>
      {children}
    </>
  );
};

// ---------- Crossness: reservoir, sluice and the river ----------

// The reservoir (a brick basin, water up to `fill`) on the left, the SLUICE gate (lifted by `gate`) in the river wall,
// the river beyond running along x (ebb = toward +x), the engine house with its chimney behind.
export const CX = { gate: [0.9, 0, -2.2] as Vec3, wheel: [2.0, 1.05, -1.95] as Vec3, gauge: [-1.9, 0, -1.2] as Vec3, dial: [2.5, 1.7, -2.2] as Vec3, sign: [3.6, 0, -4.4] as Vec3 };
export const CrossnessSet: React.FC<{ camera: CameraShot; frame: number; fill: number; gate: number; water?: WaterState; children?: React.ReactNode }> = ({ camera, frame, fill, gate, water = {}, children }) => {
  const m = T_MOODS.steel;
  const brick = useOwned(() => {
    const t = brickCanvas("#9a5a3a");
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 2);
    return t;
  });
  const house = useOwned(() => {
    const t = canvasTexture(512, 256, (ctx) => {
      ctx.fillStyle = "#a8603e";
      ctx.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 80;
        ctx.fillStyle = "#e8d8b8";
        ctx.beginPath();
        ctx.arc(x + 22, 80, 26, Math.PI, 0);
        ctx.lineTo(x + 48, 200);
        ctx.lineTo(x - 4, 200);
        ctx.fill();
        ctx.fillStyle = "#2a3040";
        ctx.beginPath();
        ctx.arc(x + 22, 84, 18, Math.PI, 0);
        ctx.lineTo(x + 40, 192);
        ctx.lineTo(x + 4, 192);
        ctx.fill();
      }
      ctx.fillStyle = "#e8d8b8";
      ctx.fillRect(0, 214, 512, 10);
    });
    return t;
  });
  const ry = -0.9 + fill * 0.75;
  const outflow = gate;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={m.fog} />
      <Lights m={m} reach={16} />
      <Sky camera={camera} m={m} />
      <Hills z={-70} shift={camera.position[0] * 0.4} width={300} low={2} high={5} color={m.far[0]} seed={3} />
      {/* the river behind the sluice wall, running along x */}
      <group position={[TH.off, 0, -9]} rotation={[0, Math.PI / 2, 0]}>
        <RiverWater frame={frame} m={m} w={water} debris={false} />
      </group>
      <mesh position={[0, -1.7, -9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 20]} />
        <meshBasicMaterial color="#2e2618" />
      </mesh>
      {/* ground (y = 0) between the reservoir and the river wall */}
      <InkBox size={[40, 1, 10]} position={[0, -0.5, 3.6]} color="#7a8a6a" ink={0} />
      <InkBox size={[40, 1, 1.4]} position={[0, -0.5, -2.9]} color="#8a8070" ink={0.01} />
      {/* the reservoir basin (left/front), water at ry */}
      <group position={[-1.6, 0, 0.6]}>
        {[
          [3.2, 1.2, 0.25, 0, 1.4],
          [3.2, 1.2, 0.25, 0, -1.4],
          [0.25, 1.2, 2.8, -1.6, 0],
        ].map(([w, h, d, x, z], i) => (
          <InkBox key={i} size={[w, h, d]} position={[x, 0.1 - h / 2 + 0.6, z]} color="#ffffff" map={brick} ink={0.012} />
        ))}
        <mesh position={[0, ry, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.1, 2.6]} />
          <meshToonMaterial color="#6a5a34" gradientMap={toonRamp} />
        </mesh>
        <mesh position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.2, 2.8]} />
          <meshBasicMaterial color="#2a2014" />
        </mesh>
      </group>
      {/* the channel from the reservoir to the sluice, the gate, the wheel */}
      <group position={CX.gate}>
        {[-0.75, 0.75].map((x) => (
          <InkBox key={x} size={[0.24, 2.4, 0.5]} position={[x, 0.8, 0]} color="#3a6a4a" ink={0.012} />
        ))}
        <InkBox size={[1.8, 0.24, 0.6]} position={[0, 2.0, 0]} color="#a8342a" ink={0.012} />
        <InkBox size={[1.26, 1.3, 0.12]} position={[0, -0.25 + gate * 1.3, 0.05]} color="#3a3a3e" ink={0.012} />
        {[-0.35, 0, 0.35].map((x) => (
          <InkBox key={x} size={[0.05, 1.2, 0.03]} position={[x, -0.25 + gate * 1.3, 0.13]} color="#6a6a70" ink={0} />
        ))}
        <InkCylinder radius={0.04} height={1.4} position={[0, 1.6 + gate * 0.5, 0.05]} color="#5a5a5a" ink={0.005} />
        <Label text="SLUICE" position={[0, 2.45, 0.32]} width={0.62} />
      </group>
      <InkBox size={[0.22, CX.wheel[1] - 0.1, 0.22]} position={[CX.wheel[0], (CX.wheel[1] - 0.1) / 2, CX.wheel[2] - 0.1]} color="#3a6a4a" ink={0.01} />
      <group position={CX.wheel} rotation={[0, 0, gate * 9]}>
        <mesh>
          <torusGeometry args={[0.32, 0.035, 8, 32]} />
          <meshToonMaterial color="#c8a040" gradientMap={toonRamp} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <InkBox key={i} size={[0.64, 0.03, 0.03]} rotation={[0, 0, (i * Math.PI) / 3]} color="#c8a040" ink={0.003} />
        ))}
      </group>
      {/* the water rushing out under the lifted gate */}
      {outflow > 0.05 && (
        <group userData={{ ghost: true }}>
          {Array.from({ length: 18 }, (_, i) => {
            const t = (frame * 0.035 + rand(i)) % 1;
            const s = (0.12 + t * 0.3) * outflow;
            return <Blob key={i} position={[CX.gate[0] + (rand(i + 3) - 0.5) * 1.0 + t * 1.5, -0.3 + 0.1 * (1 - t), CX.gate[2] - 0.6 - t * 2.4]} scale={[s * 1.4, s * 0.4, s]} color={i % 2 ? "#6a5a34" : "#8a7a4a"} ink={0.015} detail={0} />;
          })}
        </group>
      )}
      {/* gauge column counting gallons */}
      <group position={CX.gauge}>
        <InkBox size={[0.5, 2.2, 0.5]} position={[0, 1.1, 0]} color="#3a6a4a" ink={0.012} />
        <InkBox size={[0.62, 0.14, 0.62]} position={[0, 2.25, 0]} color="#c8a040" ink={0.01} />
      </group>
      {/* engine house and chimney behind */}
      <group position={[-7, 0, -6]}>
        <InkBox size={[9, 4.4, 4]} position={[0, 2.2, 0]} color="#ffffff" map={house} ink={0.02} />
        <InkBox size={[9.4, 0.9, 4.4]} position={[0, 4.8, 0]} rotation={[0, 0, 0]} color="#4a5060" ink={0.015} />
        <InkCylinder radius={0.55} height={12} position={[5.2, 6, -1]} color="#9a5a3a" ink={0.02} />
        <SmokePlume position={[5.2, 12.1, -1]} world={[-1.8, -7]} frame={frame} size={0.3} rise={3} wind={1.5} period={70} puffs={7} dark />
      </group>
      {/* sign on the river bank */}
      <group position={CX.sign}>
        <InkCylinder radius={0.05} height={1.8} position={[0, 0.9, 0]} color="#5a4030" ink={0.008} />
        <Label text="TO THE SEA" position={[0.35, 1.6, 0.05]} width={0.9} />
      </group>
      {children}
    </>
  );
};

// ---------- the Commons ----------

export const CommonsSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, children }) => {
  const floor = surfaceTexture("carpet", 6, 6) as THREE.Texture;
  const wall = surfaceTexture("panel", 3, 2) as THREE.Texture;
  return (
    <Shell camera={camera} floor={floor} wall={wall} wallColor="#6a4428" width={8} depth={7} keyLight={[1.6, "#fff0d0"]} ambient={[0.9, "#f0ffe8"]} hemi={["#e8ffe0", "#2a3a20", 0.5]}>
      {/* green benches rising on both sides */}
      {[-1, 1].map((s) =>
        [0, 1, 2].map((r) => (
          <group key={`${s}${r}`} position={[s * (1.9 + r * 0.6), 0, -0.6]}>
            <InkBox size={[0.55, 0.42 + r * 0.32, 5]} position={[0, (0.42 + r * 0.32) / 2, 0]} color="#2f6a3a" ink={0.012} />
            <InkBox size={[0.1, 0.4, 5]} position={[s * 0.28, 0.42 + r * 0.32 + 0.15, 0]} color="#245a30" ink={0.008} />
          </group>
        )),
      )}
      {/* the Speaker's canopy at the back */}
      <group position={[0, 0, -3.3]}>
        <InkBox size={[1.4, 2.6, 0.5]} position={[0, 1.3, 0]} color="#5a3a22" ink={0.015} />
        <InkCone radius={0.9} height={0.8} position={[0, 3.0, 0]} color="#c8a040" />
        <InkBox size={[0.9, 1.0, 0.5]} position={[0, 0.5, 0.4]} color="#2f6a3a" ink={0.012} />
      </group>
      {/* the clerks' table */}
      <InkBox size={[1.8, 0.08, 0.9]} position={[0, 0.74, -1.2]} color="#5a3a22" ink={0.012} />
      {[-0.8, 0.8].map((x) => (
        <InkBox key={x} size={[0.08, 0.7, 0.8]} position={[x, 0.35, -1.2]} color="#4a2e1a" ink={0.008} />
      ))}
      <InkBox size={[0.36, 0.04, 0.26]} position={[0.55, 0.8, -1.05]} color="#f4ecd8" ink={0.004} />
      {children}
    </Shell>
  );
};

// A desk calendar block with a counting page and a red stamp that lands at `stamp` (frames since; negative = not yet).
export const Calendar: React.FC<{ position: Vec3; count: number; stamp: number }> = ({ position, count, stamp }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.44, 0.12]} position={[0, 0.22, 0]} rotation={[-0.25, 0, 0]} color="#f4ecd8" ink={0.01} />
    <InkBox size={[0.5, 0.1, 0.13]} position={[0, 0.42, -0.03]} rotation={[-0.25, 0, 0]} color="#c8302a" ink={0.008} />
    <Label text="18 DAYS" position={[0, 0.2, 0.08]} rotation={[-0.25, 0, 0]} width={0.44} count={count} border={false} />
    {stamp >= 0 && <Label text="LAW" position={[0.12, 0.12, 0.1]} rotation={[-0.25, 0, -0.25]} width={0.3} fg="#c8302a" bg="#f4ecd8" appear={stamp} />}
  </group>
);
