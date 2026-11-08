import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo, Label } from "./kit";
import { Haze } from "./LakeSet";
import { Hills, House, stoneCanvas, WormFence } from "./FarmyardSet";
import { Blob, useOwned } from "./BalloonSets";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import { SkyDome } from "./sky";
import type { PuppetLight } from "../puppet/PuppetBillboard";

// The Mississippi at New Madrid in 1811-1812, built from guide/references/mississippi-1812.md.
//
// RiverSet: the river runs along z, downstream (south, to New Orleans) toward -z. Water surface at `RIVER.water`,
// between a steep clay cut bank on the left (x < -RIVER.half, top y = 1) and a pale sand bar and low bank on the right
// (x > RIVER.half); cottonwood bottomland forest on both sides, a low far line of forest and a dome sky. The water is
// a displaced cel sheet: `drift` (metres the water has moved toward +z: negative = flowing south as normal, positive =
// running upstream) carries its ripples, foam streaks and floating logs; `bore` sends a wall of water up the river;
// `uplift` 0..1 pushes the riverbed (and banks and forest) up at z = RIVER.step like a giant step, with a waterfall
// pouring back toward +z over its face; `swell` rolls big waves. A fingerpost reading NEW ORLEANS stands on the right
// bank at `POST`, pointing downstream: debris drifting away from it is the river running backward.
// The Flatboat's deck is at y = 0 so puppets stand on it; put it anywhere on the water.
//
// VillageSet: New Madrid on a moonlit night (hewn-log houses, rail fences, stumps, a ground crack with a sand blow).
// RiverSliceSet: a cake-slice of the river along its length, the block under the bed rising (`rise`).
// CypressLakeSet: Reelfoot Lake at sunrise, cypress standing in still water; `flood` 0..1 fills it.

type Vec3 = [number, number, number];
const INK = "#161212";

export const RIVER = { half: 7, water: -0.32, step: -16, stepH: 2.4 };
export const POST: Vec3 = [RIVER.half + 1.2, 0, 3];

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- moods ----------

export type RiverMode = "night" | "predawn" | "dawn" | "day";
export type Mood = {
  stops: [number, string][];
  sun: Vec3;
  glow: string;
  bg: string;
  fog: [string, number, number];
  ambient: [number, string];
  hemi: [string, string, number];
  key: [number, string];
  water: string;
  foam: string;
  far: [string, string, string];
  moon?: boolean;
};
export const MOODS: Record<RiverMode, Mood> = {
  night: {
    stops: [[-0.1, "#2a3458"], [0.0, "#3a4878"], [0.1, "#2a3668"], [0.3, "#1c2654"], [1.0, "#0e1438"]],
    sun: [5, 6, -10],
    glow: "#dfe8ff",
    bg: "#1c2654",
    fog: ["#24305a", 25, 110],
    ambient: [0.9, "#8090c8"],
    hemi: ["#6a7ac0", "#20202a", 0.5],
    key: [1.1, "#b8c8ff"],
    water: "#34466a",
    foam: "#9ab0d8",
    far: ["#1a2240", "#222c50", "#16203a"],
    moon: true,
  },
  predawn: {
    stops: [[-0.1, "#e8b0a0"], [0.0, "#e0a0a0"], [0.06, "#b890b8"], [0.18, "#7a7ab8"], [0.4, "#4a5a9a"], [1.0, "#2a3470"]],
    sun: [-2, 0.4, -10],
    glow: "#ffd0b0",
    bg: "#5a6aa8",
    fog: ["#9a8ab0", 25, 120],
    ambient: [1.0, "#c0b8e0"],
    hemi: ["#b0a8e0", "#3a3040", 0.6],
    key: [1.4, "#ffc8b0"],
    water: "#6e6458",
    foam: "#e4dcec",
    far: ["#4a4a78", "#3a3e6a", "#2c3058"],
  },
  dawn: {
    stops: [[-0.1, "#ffe0a0"], [0.0, "#ffd08a"], [0.05, "#f8b078"], [0.14, "#d89a8a"], [0.3, "#8aa0d0"], [0.6, "#5a7ac0"], [1.0, "#3a5aa8"]],
    sun: [-3, 0.5, -10],
    glow: "#fff0c0",
    bg: "#8aa0d0",
    fog: ["#e8c8a8", 30, 130],
    ambient: [1.1, "#ffe8d0"],
    hemi: ["#ffd8a8", "#4a4030", 0.6],
    key: [2.2, "#ffd8a0"],
    water: "#8a7a52",
    foam: "#fff4dc",
    far: ["#8a7a8a", "#6a6a6a", "#4a5440"],
  },
  day: {
    stops: [[-0.1, "#e8f0f2"], [0.0, "#dbe9f3"], [0.08, "#b6d5f1"], [0.16, "#7fb3ea"], [0.32, "#4f8fdc"], [0.6, "#3274cc"], [1.0, "#245fb8"]],
    sun: [-6, 9, 5],
    glow: "#fff6dc",
    bg: "#7fb3ea",
    fog: ["#cfe0ee", 35, 150],
    ambient: [1.2, "#ffffff"],
    hemi: ["#cfe4ff", "#6a7a3a", 0.6],
    key: [2.4, "#fff4e0"],
    water: "#7a6c46",
    foam: "#f4ecd8",
    far: ["#9fb4c8", "#7f98a6", "#5a7a48"],
  },
};
export const riverBg = (mode: RiverMode) => MOODS[mode].bg;

// A hanging lantern as a light for puppets (Stage `light` points): warm, flickering a little.
export const lanternPoint = (position: Vec3, frame: number) => ({
  position,
  color: "#ffb05a",
  strength: 2.4 * (0.9 + 0.1 * Math.sin(frame * 0.5) * Math.sin(frame * 0.23 + 1)),
  range: 2.2,
});

// How puppets are lit on the river: the low sun (dawn), the moon as a cool rim (night) and the lantern if near.
export const riverLight = (mode: RiverMode, frame: number, lantern?: Vec3): PuppetLight => {
  const points = lantern ? [lanternPoint(lantern, frame)] : [];
  if (mode === "night") return { tint: "#a0b0e0", tintAmount: 0.06, shadow: 0.25, points, distant: [{ direction: [0.6, 0.5, -0.6], color: "#b8c8ff", strength: 0.6 }] };
  if (mode === "predawn") return { tint: "#d8d0f0", shadow: 0.18, points, distant: [{ direction: [-0.3, 0.1, -1], color: "#ffb8a8", strength: 0.9 }] };
  if (mode === "dawn") return { tint: "#ffe8d0", shadow: 0.16, points, distant: [{ direction: [-0.3, 0.12, -1], color: "#ffc070", strength: 1.4 }] };
  return { tint: "#fff6e8", shadow: 0.14, points, distant: [{ direction: [-0.55, 0.75, 0.45], color: "#fff0d0", strength: 1.1 }] };
};

export const Lights: React.FC<{ m: Mood; reach?: number; map?: number }> = ({ m, reach = 14, map = 4096 }) => (
  <>
    <ambientLight intensity={m.ambient[0]} color={m.ambient[1]} />
    <hemisphereLight args={[m.hemi[0], m.hemi[1], m.hemi[2]]} />
    <directionalLight
      position={[m.sun[0] * 1.2 + 2, Math.max(4, m.sun[1] * 2 + 5), m.sun[2] < 0 ? -6 : 6]}
      intensity={m.key[0]}
      color={m.key[1]}
      castShadow
      shadow-mapSize={[map, map]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-reach}
      shadow-camera-right={reach}
      shadow-camera-top={reach}
      shadow-camera-bottom={-reach}
      shadow-camera-near={0.5}
      shadow-camera-far={60}
    />
    {/* A soft fill from the camera side, so faces of the set toward the lens never go black */}
    <directionalLight position={[2, 4, 10]} intensity={0.5} color={m.hemi[0]} />
  </>
);

// Sky dome riding with the camera, with the sun (or moon) disc and a few stars at night.
export const Sky: React.FC<{ camera: CameraShot; m: Mood }> = ({ camera, m }) => {
  const dir = new THREE.Vector3(...m.sun).normalize();
  const stars = useOwned(() => {
    const g = new THREE.BufferGeometry();
    const p: number[] = [];
    for (let i = 0; i < 260; i++) {
      const a = rand(i) * Math.PI * 2;
      const e = 0.12 + rand(i + 300) * 0.85;
      p.push(Math.cos(a) * Math.cos(e) * 280, Math.sin(e) * 280, Math.sin(a) * Math.cos(e) * 280);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  });
  return (
    <group position={camera.position}>
      <SkyDome sun={m.sun} stops={m.stops} glow={m.glow} />
      <mesh position={dir.clone().multiplyScalar(270).toArray()} onUpdate={(o) => o.lookAt(0, 0, 0)}>
        <circleGeometry args={[m.moon ? 9 : 12, 48]} />
        <meshBasicMaterial color={m.moon ? "#f4f0dc" : "#fff8e0"} fog={false} toneMapped={false} depthWrite={false} />
      </mesh>
      {m.moon && (
        <points geometry={stars}>
          <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} fog={false} toneMapped={false} depthWrite={false} />
        </points>
      )}
    </group>
  );
};

// ---------- textures ----------

const clayCanvas = () =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = "#9a6a42";
    ctx.fillRect(0, 0, 512, 256);
    // strata bands
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? "rgba(120,80,48,0.55)" : "rgba(196,150,100,0.4)";
      const y = 20 + i * 26 + rand(i) * 8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 4);
      ctx.lineTo(512, y + 10);
      ctx.lineTo(0, y + 10);
      ctx.fill();
    }
    // a dark grass lip on top and hanging roots
    ctx.fillStyle = "#4a5a2a";
    ctx.fillRect(0, 0, 512, 14);
    ctx.strokeStyle = "#4a3020";
    for (let i = 0; i < 40; i++) {
      const x = rand(i + 50) * 512;
      ctx.lineWidth = 1.5 + rand(i) * 2;
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.quadraticCurveTo(x + (rand(i + 3) - 0.5) * 30, 40, x + (rand(i + 4) - 0.5) * 20, 40 + rand(i + 5) * 70);
      ctx.stroke();
    }
  });

const sandCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#e2cf9a";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(170,140,90,0.35)" : "rgba(255,245,210,0.4)";
      ctx.fillRect(rand(i + 1) * 256, rand(i + 2) * 256, 2, 2);
    }
    // ripple lines
    ctx.strokeStyle = "rgba(160,130,80,0.35)";
    for (let i = 0; i < 14; i++) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, i * 19 + Math.sin(x * 0.08 + i) * 3);
      ctx.stroke();
    }
  });

const grassCanvas = (base: string) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
      const v = rand(i + 900);
      ctx.strokeStyle = v > 0.7 ? "rgba(40,60,20,0.45)" : v > 0.35 ? "rgba(150,170,80,0.35)" : "rgba(90,110,40,0.4)";
      ctx.lineWidth = 2;
      const x = rand(i) * 512;
      const y = rand(i + 7000) * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i + 3) - 0.5) * 6, y - 6 - rand(i + 4) * 8);
      ctx.stroke();
    }
  });

const plankCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    for (let r = 0; r < 8; r++) {
      const v = rand(r * 7);
      ctx.fillStyle = v > 0.6 ? "#a07a50" : v > 0.3 ? "#94704a" : "#aa8458";
      ctx.fillRect(0, r * 32, 256, 32);
      ctx.fillStyle = "rgba(50,30,16,0.55)";
      ctx.fillRect(0, r * 32 + 30, 256, 2);
      ctx.fillStyle = "rgba(60,40,20,0.25)";
      for (let k = 0; k < 5; k++) ctx.fillRect(rand(r * 13 + k) * 240, r * 32 + 8 + rand(r + k) * 16, 20, 2);
    }
  });

// White water streaks running down a waterfall (scroll the texture's offset).
const fallCanvas = () =>
  canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = "#cfe0e0";
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 70; i++) {
      const x = rand(i) * 256;
      ctx.fillStyle = rand(i + 5) > 0.5 ? "rgba(255,255,255,0.9)" : "rgba(140,170,170,0.6)";
      ctx.fillRect(x, rand(i + 9) * 512, 3 + rand(i + 3) * 8, 60 + rand(i + 4) * 200);
    }
  });

export const tiled = (t: THREE.Texture, x: number, y: number) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  return t;
};

// ---------- water ----------

export type WaterState = { drift?: number; chop?: number; bore?: number; boreH?: number; uplift?: number; swell?: number };

// Height of the river surface at (x, z) on `frame`.
export const surfaceY = (x: number, z: number, frame: number, w: WaterState) => {
  const p = z - (w.drift ?? 0);
  const chop = w.chop ?? 1;
  let y =
    RIVER.water +
    chop * (0.05 * Math.sin(p * 0.8 + x * 0.5 + frame * 0.05) + 0.035 * Math.sin(p * 1.9 - x * 1.1 - frame * 0.07) + 0.02 * Math.sin(x * 2.3 + p * 0.4 + frame * 0.11));
  if (w.bore !== undefined) {
    const d = z - w.bore;
    const h = w.boreH ?? 1;
    y += h * (Math.exp(-(d * d) / 1.4) + 0.5 / (1 + Math.exp(d * 2)));
  }
  if (w.uplift) y += w.uplift * RIVER.stepH * smooth(RIVER.step + 0.6, RIVER.step - 0.6, z);
  if (w.swell) y += w.swell * (0.55 * Math.sin(p * 0.32 + x * 0.12) + 0.2 * Math.sin(p * 0.7 - x * 0.3 + 1));
  return y;
};

export const RiverWater: React.FC<{ frame: number; m: Mood; w: WaterState; debris: boolean }> = ({ frame, m, w, debris }) => {
  const width = RIVER.half * 2 + 3;
  const geo = useOwned(() => {
    const g = new THREE.PlaneGeometry(width, 150, 70, 300);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -50);
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    return g;
  });
  // Raised water (a bore, a swell, the top of the step) turns paler toward foam, so its shape reads in flat cel light.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = geo.attributes.color as THREE.BufferAttribute;
  const base = new THREE.Color(m.water);
  const froth = new THREE.Color(m.foam);
  const deep = base.clone().multiplyScalar(0.62);
  const c = new THREE.Color();
  const lifted = (w.uplift ?? 0) * RIVER.stepH;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = surfaceY(x, z, frame, w);
    pos.setY(i, y);
    const stepLift = lifted * smooth(RIVER.step + 0.6, RIVER.step - 0.6, z);
    const rise = y - RIVER.water - stepLift;
    c.copy(base);
    if (rise > 0.12) c.lerp(froth, Math.min(0.75, (rise - 0.12) * 0.55));
    else if (rise < -0.05) c.lerp(deep, Math.min(1, -rise * 3));
    // the steep face of a bore is darker: it is the wall coming at you
    if (w.bore !== undefined) {
      const d = z - w.bore;
      if (d > 0 && d < 1.6) c.lerp(deep, 0.55 * (1 - d / 1.6));
    }
    col.setXYZ(i, c.r, c.g, c.b);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  geo.computeVertexNormals();

  // Foam streaks stretched along the flow, carried by the drift; denser on the bore and at the foot of the falls.
  const foam = useOwned(() => new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85, depthWrite: false }), 520));
  const o = new THREE.Object3D();
  const drift = w.drift ?? 0;
  for (let i = 0; i < 520; i++) {
    const x = (rand(i) - 0.5) * RIVER.half * 1.9;
    const span = 110;
    let z = ((((rand(i + 300) * span + drift * (0.9 + rand(i + 5) * 0.2)) % span) + span) % span) - (span - 18);
    let sx = 0.05 + rand(i + 7) * 0.08;
    let sz = 0.3 + rand(i + 8) * 0.9;
    if (w.bore !== undefined && i < 160) {
      // crest foam riding the front of the bore
      z = w.bore - 0.4 + rand(i + 11) * 1.2;
      sx = 0.14 + rand(i + 3) * 0.18;
      sz = 0.1 + rand(i + 4) * 0.2;
    } else if (w.uplift && i >= 160 && i < 300) {
      // churned water at the foot of the falls
      z = RIVER.step + 0.8 + rand(i + 13) * 3 + ((frame * 0.05 + rand(i)) % 1) * 1.5;
      sx = 0.1 + rand(i + 3) * 0.2;
      sz = 0.1 + rand(i + 4) * 0.3;
    }
    const y = surfaceY(x, z, frame, w) + 0.02;
    o.position.set(x, y, z);
    o.rotation.set(-Math.PI / 2, 0, 0);
    o.scale.set(sx, sz, 1);
    o.updateMatrix();
    foam.setMatrixAt(i, o.matrix);
  }
  foam.instanceMatrix.needsUpdate = true;
  (foam.material as THREE.MeshBasicMaterial).color.set(m.foam);

  return (
    <group userData={{ ghost: true }}>
      <mesh geometry={geo} receiveShadow>
        <meshToonMaterial color="#ffffff" vertexColors gradientMap={toonRamp} />
      </mesh>
      <primitive object={foam} />
      {w.bore !== undefined && <BoreCrest frame={frame} w={w} />}
      {debris && <Debris frame={frame} w={w} />}
    </group>
  );
};

// The white rolling lip of a bore: tumbling inked foam along its crest, spray thrown off the top.
const BoreCrest: React.FC<{ frame: number; w: WaterState }> = ({ frame, w }) => {
  const bz = w.bore ?? 0;
  const h = w.boreH ?? 1;
  return (
    <>
      {Array.from({ length: 30 }, (_, i) => {
        const x = -RIVER.half + 0.2 + (i / 29) * (RIVER.half * 2 - 0.4) + (rand(i) - 0.5) * 0.3;
        const z = bz + 0.15 + (rand(i + 1) - 0.5) * 0.4;
        const s = (0.28 + rand(i + 2) * 0.22) * Math.min(1.4, h) * (0.85 + 0.15 * Math.sin(frame * 0.5 + i * 2.3));
        return <Blob key={i} position={[x, surfaceY(x, bz, frame, w) + 0.05, z]} rotation={[frame * 0.2 + i, i, 0]} scale={[s * 1.3, s * 0.7, s]} color="#f4f2ea" ink={0.05} detail={1} />;
      })}
      {Array.from({ length: 26 }, (_, i) => {
        const life = 18;
        const age = (frame + rand(i + 5) * life) % life;
        const x = (rand(i + 6) - 0.5) * RIVER.half * 1.9;
        const y = surfaceY(x, bz, frame, w) + 0.2 + age * 0.05 - age * age * 0.002;
        const s = 0.07 + rand(i + 7) * 0.07;
        return <Blob key={`s${i}`} position={[x, y, bz + 0.3 + age * 0.06]} scale={[s, s, s]} color="#ffffff" ink={0.12} detail={0} />;
      })}
    </>
  );
};

// Floating logs, branches and a barrel carried by the current (drift), bobbing on the surface.
const Debris: React.FC<{ frame: number; w: WaterState }> = ({ frame, w }) => {
  const drift = w.drift ?? 0;
  const span = 70;
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        const x = (rand(i + 40) - 0.5) * RIVER.half * 1.5;
        const z = ((((rand(i + 41) * span + drift * 1.05) % span) + span) % span) - (span - 14);
        const y = surfaceY(x, z, frame, w);
        const kind = i % 4;
        const yaw = rand(i + 42) * 3 + Math.sin(frame * 0.03 + i) * 0.2;
        const roll = Math.sin(frame * 0.09 + i) * 0.15;
        return (
          <group key={i} position={[x, y + 0.02, z]} rotation={[roll, yaw, 0]}>
            {kind === 3 ? (
              <InkCylinder radius={0.22} height={0.5} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} color="#8a6440" ink={0.015} />
            ) : (
              <>
                <InkCylinder radius={0.09 + rand(i) * 0.08} height={1.6 + rand(i + 2) * 2} rotation={[Math.PI / 2, 0, 0]} color={kind === 1 ? "#cfc6b0" : "#6a4a32"} ink={0.012} />
                {kind === 2 && <Blob position={[0, 0.2, 1]} scale={[0.5, 0.3, 0.5]} color="#5f7a3a" ink={0.05} detail={0} />}
              </>
            )}
          </group>
        );
      })}
    </>
  );
};

// The waterfall where the risen step meets the river: a sheet of white water pouring toward +z, mist and churn.
const Falls: React.FC<{ frame: number; uplift: number; w: WaterState }> = ({ frame, uplift, w }) => {
  const tex = useOwned(() => tiled(fallCanvas(), 3, 1));
  tex.offset.y = frame * 0.035;
  const h = uplift * RIVER.stepH + 0.15;
  if (uplift < 0.03) return null;
  return (
    <group userData={{ ghost: true }}>
      {/* the clay face of the step under the water */}
      <mesh position={[0, RIVER.water + h / 2 - 0.2, RIVER.step - 0.2]}>
        <planeGeometry args={[RIVER.half * 2 + 2, h + 0.4]} />
        <meshToonMaterial color="#7a5a3a" gradientMap={toonRamp} />
      </mesh>
      {/* the sheet, bowed out toward +z */}
      <mesh position={[0, RIVER.water + h / 2, RIVER.step + 0.35]} rotation={[-0.32, 0, 0]}>
        <planeGeometry args={[RIVER.half * 2, h * 1.08, 1, 1]} />
        <meshBasicMaterial map={tex} transparent opacity={0.95} toneMapped={false} />
      </mesh>
      {/* churning foam and spray along the foot */}
      {Array.from({ length: 18 }, (_, i) => {
        const x = -RIVER.half + 0.4 + (i / 17) * (RIVER.half * 2 - 0.8);
        const s = (0.35 + rand(i) * 0.3) * (0.85 + 0.15 * Math.sin(frame * 0.4 + i * 1.7)) * Math.min(1, uplift * 2);
        return <Blob key={i} position={[x, surfaceY(x, RIVER.step + 1, frame, w) + 0.1, RIVER.step + 0.9 + rand(i + 3) * 0.5]} scale={[s * 1.4, s * 0.6, s]} color="#f4f8f6" ink={0.04} detail={0} />;
      })}
      {Array.from({ length: 10 }, (_, i) => {
        const t = ((frame * 0.02 + rand(i + 20)) % 1);
        const x = (rand(i + 21) - 0.5) * RIVER.half * 1.8;
        return (
          <mesh key={`m${i}`} position={[x, RIVER.water + 0.4 + t * 2.4, RIVER.step + 1.4 + t * 1.5]}>
            <sphereGeometry args={[0.6 + t * 1.2, 12, 10]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.28 * (1 - t) * Math.min(1, uplift * 2)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- trees ----------

export type TreeSpot = { p: Vec3; h: number; s: number };

// Cottonwoods and sycamores: pale trunks and clusters of inked toon crowns, as instanced meshes.
export const Forest: React.FC<{ trees: TreeSpot[]; leaf: [string, string] }> = ({ trees, leaf }) => {
  const meshes = useMemo(() => {
    const o = new THREE.Object3D();
    const trunks: THREE.Matrix4[] = [];
    const crowns: { m: THREE.Matrix4; ink: THREE.Matrix4; c: string }[] = [];
    for (const t of trees) {
      const [x, y, z] = t.p;
      o.position.set(x, y + t.h * 0.35, z);
      o.rotation.set((rand(t.s) - 0.5) * 0.08, 0, (rand(t.s + 1) - 0.5) * 0.08);
      o.scale.set(0.16 + t.h * 0.012, t.h * 0.7, 0.16 + t.h * 0.012);
      o.updateMatrix();
      trunks.push(o.matrix.clone());
      o.rotation.set(0, 0, 0);
      for (let k = 0; k < 5; k++) {
        const a = rand(t.s + k * 3) * Math.PI * 2;
        const r = k === 0 ? 0 : 0.9 + rand(t.s + k) * 0.9;
        const s = (0.9 + rand(t.s + k + 9) * 0.6) * (t.h / 9);
        o.position.set(x + Math.cos(a) * r, y + t.h * (0.72 + rand(t.s + k * 5) * 0.2), z + Math.sin(a) * r * 0.8);
        o.scale.set(s * 1.5, s * 1.1, s * 1.4);
        o.updateMatrix();
        const m = o.matrix.clone();
        o.scale.multiplyScalar(1.05);
        o.updateMatrix();
        crowns.push({ m, ink: o.matrix.clone(), c: rand(t.s + k * 7) > 0.5 ? leaf[0] : leaf[1] });
      }
    }
    const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 1, 1, 7), new THREE.MeshToonMaterial({ color: "#cbbfa6", gradientMap: toonRamp }), trunks.length);
    trunks.forEach((m, i) => trunkMesh.setMatrixAt(i, m));
    const ico = new THREE.IcosahedronGeometry(1, 1);
    const crownMesh = new THREE.InstancedMesh(ico, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), crowns.length);
    const inkMesh = new THREE.InstancedMesh(ico, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }), crowns.length);
    const c = new THREE.Color();
    crowns.forEach((t, i) => {
      crownMesh.setMatrixAt(i, t.m);
      crownMesh.setColorAt(i, c.set(t.c));
      inkMesh.setMatrixAt(i, t.ink);
    });
    crownMesh.castShadow = true;
    trunkMesh.castShadow = true;
    return [trunkMesh, crownMesh, inkMesh];
  }, [trees, leaf]);
  React.useEffect(
    () => () =>
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
        m.dispose();
      }),
    [meshes],
  );
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
};

// One cottonwood that can topple: pivots at its base about the z axis by `fall` (0 standing .. 1 flat), toward
// +x (`dir` 1) or -x (-1). `bend` sways it.
export const FallingTree: React.FC<{ position: Vec3; height?: number; fall?: number; dir?: 1 | -1; bend?: number; seed?: number; yaw?: number }> = ({
  position,
  height = 8,
  fall = 0,
  dir = 1,
  bend = 0,
  seed = 3,
  yaw = 0,
}) => {
  const k = height / 8;
  const tilt = -dir * (fall * fall * 1.45 + bend * 0.12);
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group rotation={[0, 0, tilt]}>
        <InkCylinder radius={0.24 * k} height={height * 0.75} position={[0, height * 0.375, 0]} color="#cbbfa6" ink={0.03} />
        <InkCylinder radius={0.1 * k} height={2.2 * k} position={[0.7 * k, height * 0.62, 0]} rotation={[0, 0, -0.7]} color="#c4b89e" ink={0.02} />
        <InkCylinder radius={0.1 * k} height={2.0 * k} position={[-0.6 * k, height * 0.68, 0.2]} rotation={[0.2, 0, 0.6]} color="#c4b89e" ink={0.02} />
        {Array.from({ length: 6 }, (_, i) => {
          const a = rand(seed + i * 3) * Math.PI * 2;
          const r = i === 0 ? 0 : 1.0 * k + rand(seed + i) * 0.8 * k;
          const s = (1.0 + rand(seed + i + 9) * 0.5) * k;
          return <Blob key={i} position={[Math.cos(a) * r, height * (0.8 + rand(seed + i * 5) * 0.18), Math.sin(a) * r * 0.7]} scale={[s * 1.3, s, s * 1.2]} color={i % 2 ? "#5f7a3a" : "#6e8a44"} ink={0.04} />;
        })}
        {/* root plate lifting out of the ground as it goes */}
        {fall > 0.05 && <Blob position={[dir * 0.3 * k, 0.1, 0]} scale={[0.9 * k * Math.min(1, fall * 3), 0.6 * k, 0.8 * k]} color="#6a4a30" ink={0.04} detail={0} />}
      </group>
    </group>
  );
};

// ---------- banks ----------

// A slab of the clay cut bank (grass on top, roots hanging) that cracks off and slumps into the river.
// Origin at the bank's river edge (x = -RIVER.half). `crack` 0..1 opens the gap behind it, `fall` 0..1 drops it.
export const BankSlab: React.FC<{ z: number; length?: number; crack?: number; fall?: number; tree?: boolean }> = ({ z, length = 5, crack = 0, fall = 0, tree = true }) => {
  const clay = useOwned(() => tiled(clayCanvas(), 1.5, 1));
  const f = fall * fall;
  return (
    <group position={[-RIVER.half, 0, z]}>
      {/* the dark crack opening behind the slab */}
      <mesh position={[-1.35, 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.05 + crack * 0.45, length]} />
        <meshBasicMaterial color="#1a120c" />
      </mesh>
      <group position={[f * 1.6, -f * 1.9, 0]} rotation={[0, 0, -f * 1.25]}>
        <group position={[-0.65, 0, 0]}>
          <InkBox size={[1.3, 2.0, length]} position={[0, 0, 0]} color="#ffffff" map={clay} ink={0.03} />
          <InkBox size={[1.32, 0.08, length + 0.02]} position={[0, 1.0, 0]} color="#5a7a34" ink={0.02} />
          {tree && <FallingTree position={[-0.1, 1.0, 0.4]} height={6.5} seed={11} />}
        </group>
      </group>
    </group>
  );
};

// Zigzag crack in the ground from a to b (x, z) at height y, `open` 0..1 its width.
export const GroundCrack: React.FC<{ a: [number, number]; b: [number, number]; open: number; y?: number; seed?: number }> = ({ a, b, open, y = 0.01, seed = 1 }) => {
  const n = 12;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const side = i === 0 || i === n ? 0 : (rand(seed + i) - 0.5) * 0.7;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    return [a[0] + dx * t + (-dz / len) * side, a[1] + dz * t + (dx / len) * side] as [number, number];
  });
  return (
    <group userData={{ ghost: true }}>
      {pts.slice(0, -1).map((p, i) => {
        const q = pts[i + 1];
        const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const w = (0.02 + open * 0.32) * (0.6 + 0.4 * Math.sin((i / n) * Math.PI));
        return (
          <mesh key={i} position={[(p[0] + q[0]) / 2, y, (p[1] + q[1]) / 2]} rotation={[-Math.PI / 2, 0, -Math.atan2(q[1] - p[1], q[0] - p[0])]}>
            <planeGeometry args={[len + w, w]} />
            <meshBasicMaterial color="#120c08" />
          </mesh>
        );
      })}
    </group>
  );
};

// A sand blow: sand and water fountaining out of a crack at `at`, `t` frames after it starts (ghost).
export const SandBlow: React.FC<{ at: Vec3; t: number; power?: number; color?: string }> = ({ at, t, power = 1, color = "#c8b890" }) => {
  if (t < 0) return null;
  return (
    <group position={at} userData={{ ghost: true }}>
      {Array.from({ length: 34 }, (_, i) => {
        const life = 26 + rand(i) * 14;
        const age = (t + rand(i + 1) * life) % life;
        const a = rand(i + 2) * Math.PI * 2;
        const v = (0.012 + rand(i + 3) * 0.02) * power;
        const up = (0.09 + rand(i + 4) * 0.07) * power;
        const y = Math.max(0, up * age - 0.0045 * age * age);
        const s = 0.04 + rand(i + 5) * 0.06;
        return <Blob key={i} position={[Math.cos(a) * v * age, y, Math.sin(a) * v * age]} scale={[s, s, s]} color={i % 3 ? color : "#e8ecea"} ink={0.12} detail={0} />;
      })}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35 + Math.min(1, t / 40) * 0.8 * power, 24]} />
        <meshBasicMaterial color="#5a4a36" transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  );
};

// A burst of muddy water and white spray at `at`, `t` frames after an impact (ghost).
export const Splash: React.FC<{ at: Vec3; t: number; power?: number; count?: number; color?: string }> = ({ at, t, power = 1, count = 40, color = "#e8eee8" }) => {
  if (t < 0 || t > 50) return null;
  return (
    <group userData={{ ghost: true }} position={at}>
      {Array.from({ length: count }, (_, i) => {
        const a = rand(i) * Math.PI * 2;
        const v = (0.03 + rand(i + 1) * 0.07) * power;
        const up = (0.1 + rand(i + 2) * 0.14) * power;
        const y = up * t - 0.009 * t * t;
        if (y < -0.3) return null;
        const s = (0.07 + rand(i + 3) * 0.12) * power * (1 - t / 55);
        return <Blob key={i} position={[Math.cos(a) * v * t, y, Math.sin(a) * v * t * 0.7]} scale={[s, s * 1.2, s]} color={i % 4 ? color : "#9a8a64"} ink={0.1} detail={0} />;
      })}
      {/* a crown of spray spikes thrown up round the hit, then the ring spreading on the surface */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const h = 1.1 * power * Math.sin(Math.min(1, t / 30) * Math.PI) * (0.6 + rand(i + 20) * 0.6);
        if (h < 0.05) return null;
        const r = (0.25 + t * 0.02) * power;
        return <Blob key={`c${i}`} position={[Math.cos(a) * r, h / 2, Math.sin(a) * r * 0.7]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]} scale={[0.09 * power, h / 2, 0.09 * power]} color="#f2f6f2" ink={0.06} detail={1} />;
      })}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2 + t * 0.06 * power, 0.35 + t * 0.075 * power, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={Math.max(0, 0.8 - t / 50)} depthWrite={false} />
      </mesh>
    </group>
  );
};

// The fingerpost on the right bank: a pole with a board pointing downstream (-z) reading NEW ORLEANS.
export const Fingerpost: React.FC<{ position?: Vec3; appear?: number; text?: string }> = ({ position = POST, appear, text = "NEW ORLEANS" }) => (
  <group position={position}>
    <InkCylinder radius={0.07} height={2.1} position={[0, 1.05, 0]} color="#6a4a30" ink={0.012} />
    <group position={[-0.05, 1.75, -0.55]} rotation={[0, Math.PI / 2, 0]}>
      <InkBox size={[1.3, 0.34, 0.06]} position={[0, 0, 0]} color="#c8a878" ink={0.015} />
      {/* the pointed end of the board */}
      <mesh position={[0.65 + 0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.17, 0.24, 3]} />
        <meshToonMaterial color="#c8a878" gradientMap={toonRamp} />
      </mesh>
    </group>
    <Label text={text} position={[-0.6, 2.25, -0.4]} rotation={[0, 0.45, 0]} width={1.25} appear={appear} />
  </group>
);

// ---------- the flatboat ----------

// A flatboat (broadhorn): a plank box hull, a gabled plank cabin over the front half, an open stern deck (z 0..2.4)
// where the crew stands, a long steering sweep off the stern, side sweeps, barrels and a lantern on a pole.
// Deck top at y = 0. `pitch`/`roll` tip it a little (radians); `heave` lifts it (give the crew the same `air`).
export const BOAT = { half: 1.2, stern: 2.6, bow: -3.6, lantern: [0.95, 1.55, 1.9] as Vec3 };
export const Flatboat: React.FC<{ frame: number; lantern?: boolean; sweep?: number; pitch?: number; roll?: number; heave?: number }> = ({
  frame,
  lantern = true,
  sweep = 0,
  pitch = 0,
  roll = 0,
  heave = 0,
}) => {
  const planks = useOwned(() => tiled(plankCanvas(), 2, 2));
  const L = BOAT.stern - BOAT.bow;
  const W = BOAT.half * 2;
  const cab = { from: -0.2, to: BOAT.bow + 0.2 };
  const cabL = cab.from - cab.to;
  const cabZ = (cab.from + cab.to) / 2;
  return (
    <group position={[0, heave, 0]} rotation={[pitch, 0, roll]}>
      {/* hull */}
      <InkBox size={[W, 0.62, L]} position={[0, -0.31, (BOAT.stern + BOAT.bow) / 2]} color="#ffffff" map={planks} ink={0.025} />
      <InkBox size={[W + 0.04, 0.06, L + 0.04]} position={[0, -0.02, (BOAT.stern + BOAT.bow) / 2]} color="#7a5a3a" ink={0.012} />
      {/* low rails round the open deck */}
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.07, 0.2, BOAT.stern - cab.from]} position={[s * (BOAT.half - 0.04), 0.1, (BOAT.stern + cab.from) / 2]} color="#6a4a30" ink={0.01} />
      ))}
      <InkBox size={[W, 0.2, 0.07]} position={[0, 0.1, BOAT.stern - 0.04]} color="#6a4a30" ink={0.01} />
      {/* cabin */}
      <InkBox size={[W - 0.2, 1.35, cabL]} position={[0, 0.675, cabZ]} color="#ffffff" map={planks} ink={0.025} />
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[W / 2 + 0.25, 0.08, cabL + 0.3]} position={[s * 0.55, 1.55, cabZ]} rotation={[0, 0, -s * 0.42]} color="#5c4a3c" ink={0.015} />
      ))}
      {/* cabin door, dark inside with a warm glow */}
      <InkBox size={[0.6, 1.05, 0.04]} position={[-0.35, 0.53, cab.from + 0.01]} color="#2a1a10" ink={0.01} emissive="#3a1a08" />
      {/* barrels and a crate on the deck by the cabin */}
      <InkCylinder radius={0.2} height={0.5} position={[0.8, 0.25, -0.0]} color="#8a6440" ink={0.012} />
      <InkCylinder radius={0.2} height={0.5} position={[0.78, 0.75, 0.02]} color="#946c46" ink={0.012} />
      <InkBox size={[0.45, 0.4, 0.4]} position={[-0.75, 0.2, 0.05]} color="#a08058" ink={0.012} />
      {/* steering sweep: a post at the stern, the long oar trailing behind into the water */}
      <InkCylinder radius={0.05} height={0.9} position={[0, 0.45, BOAT.stern - 0.2]} color="#5a3a24" ink={0.01} />
      <group position={[0, 0.88, BOAT.stern - 0.2]} rotation={[0, sweep, 0]}>
        <InkCylinder radius={0.04} height={5.2} position={[0, -0.55, 2.2]} rotation={[Math.PI / 2 - 0.25, 0, 0]} color="#8a6a44" ink={0.01} />
        <InkBox size={[0.45, 0.04, 1.1]} position={[0, -1.15, 4.6]} rotation={[-0.25, 0, 0]} color="#8a6a44" ink={0.01} />
      </group>
      {/* side sweeps (the broadhorns) resting on the cabin roof */}
      {[-1, 1].map((s) => (
        <InkCylinder key={`b${s}`} radius={0.035} height={4.2} position={[s * (BOAT.half + 0.9), 1.0, cabZ]} rotation={[0, 0, s * 1.2 + Math.sin(frame * 0.05 + s) * 0.03]} color="#8a6a44" ink={0.01} />
      ))}
      {/* lantern on a pole */}
      {lantern && (
        <group userData={{ ghost: true }}>
          <InkCylinder radius={0.03} height={1.5} position={[BOAT.lantern[0], 0.75, BOAT.lantern[2]]} color="#5a3a24" ink={0.008} />
          <InkBox size={[0.16, 0.22, 0.16]} position={[BOAT.lantern[0], BOAT.lantern[1], BOAT.lantern[2]]} color="#2a2018" ink={0.008} />
          <mesh position={BOAT.lantern}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshBasicMaterial color="#ffe0a0" toneMapped={false} />
          </mesh>
          <Halo position={[BOAT.lantern[0], BOAT.lantern[1], BOAT.lantern[2] + 0.05]} size={1.4} color="#ffb05a" strength={0.55 + 0.06 * Math.sin(frame * 0.4)} />
          <pointLight position={BOAT.lantern} color="#ffb05a" intensity={3} distance={6} decay={1.5} />
        </group>
      )}
    </group>
  );
};

// ---------- the river set ----------

export const RiverSet: React.FC<{
  camera: CameraShot;
  frame: number;
  mode: RiverMode;
  water?: WaterState;
  debris?: boolean;
  post?: boolean;
  postAppear?: number;
  // trees on the left bank between these z that should be left out (for a hero FallingTree there)
  clear?: [number, number];
  children?: React.ReactNode;
}> = ({ camera, frame, mode, water = {}, debris = true, post = true, postAppear, clear, children }) => {
  const m = MOODS[mode];
  const camX = camera.position[0];
  const up = (water.uplift ?? 0) * RIVER.stepH;
  const clay = useOwned(() => tiled(clayCanvas(), 30, 1));
  const clayS = useOwned(() => tiled(clayCanvas(), 30, 1));
  const sand = useOwned(() => tiled(sandCanvas(), 3, 40));
  const grass = useOwned(() => tiled(grassCanvas(mode === "night" ? "#3a4a3a" : "#6a7a3a"), 10, 40));
  const trees = useMemo(() => {
    const north: TreeSpot[] = [];
    const south: TreeSpot[] = [];
    for (let i = 0; i < 150; i++) {
      const left = i % 2 === 0;
      const x = left ? -RIVER.half - 1.6 - rand(i) * 14 : RIVER.half + 4.2 + rand(i) * 14;
      const z = 26 - rand(i + 500) * 130;
      if (clear && left && x > -RIVER.half - 4 && z < clear[0] && z > clear[1]) continue;
      if (Math.abs(x - POST[0]) < 1.6 && Math.abs(z - POST[2]) < 2) continue;
      const spot = { p: [x, left ? 1.0 : 0.6, z] as Vec3, h: 7 + rand(i + 9) * 5, s: i * 7 };
      (z < RIVER.step ? south : north).push(spot);
    }
    return { north, south };
  }, [clear]);
  const leaf: [string, string] = mode === "night" ? ["#2a3a30", "#334636"] : ["#5f7a3a", "#6e8a44"];
  const segs: [number, number, number][] = [
    [28, RIVER.step, 0],
    [RIVER.step, -110, up],
  ];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={m.fog} />
      <Lights m={m} />
      <Sky camera={camera} m={m} />
      {/* The far forest line low on the horizon (the valley is flat: no mountains) */}
      <Hills z={-150} shift={camX * 0.8} width={420} low={2} high={6} color={m.far[0]} seed={4} />
      <Haze z={-135} color={m.fog[0]} />
      <Hills z={-120} shift={camX * 0.5} width={320} low={1.5} high={5} color={m.far[1]} seed={8} />
      <Hills z={-100} shift={camX * 0.2} width={260} low={1} high={4} color={m.far[2]} seed={12} />

      <RiverWater frame={frame} m={m} w={water} debris={debris} />
      <Falls frame={frame} uplift={water.uplift ?? 0} w={water} />

      {segs.map(([z0, z1, dy], k) => {
        const len = z0 - z1;
        const zc = (z0 + z1) / 2;
        return (
          <group key={k} position={[0, dy, 0]}>
            {/* left: steep clay cut bank, top at y = 1 */}
            <InkBox size={[30, 3.2, len]} position={[-RIVER.half - 15, -0.6, zc]} color="#ffffff" map={k ? clayS : clay} ink={0.02} />
            <mesh position={[-RIVER.half - 15, 1.002, zc]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[30, len]} />
              <meshToonMaterial color="#ffffff" map={grass} gradientMap={toonRamp} />
            </mesh>
            {/* right: sand bar sloping out of the water, then the low grassy bank */}
            <mesh position={[RIVER.half + 1.6, RIVER.water + 0.25, zc]} rotation={[-Math.PI / 2, -0.12, 0]} receiveShadow>
              <planeGeometry args={[4.2, len]} />
              <meshToonMaterial color="#ffffff" map={sand} gradientMap={toonRamp} />
            </mesh>
            <InkBox size={[30, 2, len]} position={[RIVER.half + 3.6 + 15, -0.4, zc]} color="#7a6a3a" ink={0.02} />
            <mesh position={[RIVER.half + 3.6 + 15, 0.602, zc]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[30, len]} />
              <meshToonMaterial color="#ffffff" map={grass} gradientMap={toonRamp} />
            </mesh>
            {/* riverbed under the water so a low camera never sees through */}
            <mesh position={[0, -1.6, zc]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[RIVER.half * 2 + 4, len]} />
              <meshBasicMaterial color="#3a2e20" />
            </mesh>
          </group>
        );
      })}
      {/* the clay step face across both banks where the land rose */}
      {up > 0.02 &&
        [-1, 1].map((s) => (
          <InkBox key={s} size={[30, up + 0.1, 0.4]} position={[s * (RIVER.half + 15 + (s > 0 ? 3.6 : 0)), (s < 0 ? 1 : 0.6) + up / 2 - 0.05, RIVER.step]} color="#ffffff" map={clay} ink={0.02} />
        ))}
      <Forest trees={trees.north} leaf={leaf} />
      <group position={[0, up, 0]}>
        <Forest trees={trees.south} leaf={leaf} />
      </group>
      {post && <Fingerpost appear={postAppear} />}
      {children}
    </>
  );
};

// ---------- New Madrid ----------

const dirtCanvas = (night: boolean) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = night ? "#4a4a40" : "#8a7a58";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3000; i++) {
      const v = rand(i);
      ctx.fillStyle = v > 0.6 ? "rgba(30,34,24,0.35)" : v > 0.3 ? "rgba(110,120,80,0.35)" : "rgba(160,150,120,0.25)";
      ctx.fillRect(rand(i + 1) * 512, rand(i + 2) * 512, 3, 2);
    }
  });

// The toppling stone chimney of the front house: stands at the house's right end, pivots at its foot by `fall`
// (0..1) toward +z, its top chunk breaking off (ghost so falling stones are not counted as a puppet collision).
export const Chimney: React.FC<{ position: Vec3; fall: number; height?: number }> = ({ position, fall, height = 3.9 }) => {
  const stone = useOwned(() => tiled(stoneCanvas(), 1, 3));
  const a = fall * fall * 1.5;
  return (
    <group position={position} userData={{ ghost: true }}>
      <InkBox size={[0.75, height * 0.4, 0.8]} position={[0, height * 0.2, 0]} color="#ffffff" map={stone} ink={0.02} />
      <group position={[0, height * 0.4, 0.4]} rotation={[a, 0, a * 0.2]}>
        <InkBox size={[0.75, height * 0.6, 0.8]} position={[0, height * 0.3, -0.4]} color="#ffffff" map={stone} ink={0.02} />
      </group>
    </group>
  );
};

// New Madrid on a moonlit winter night: dirt street (floor y = 0), hewn-log houses (`HOUSE` layout of the farmyard,
// the front one with its chimney left off for a shot to topple), rail fences, stumps, the forest behind.
// `shake` 0..1 rocks the houses and trees.
export const VillageSet: React.FC<{ camera: CameraShot; frame: number; shake?: number; chimney?: boolean; children?: React.ReactNode }> = ({
  camera,
  frame,
  shake = 0,
  chimney = true,
  children,
}) => {
  const m = MOODS.night;
  const dirt = useOwned(() => tiled(dirtCanvas(true), 12, 12));
  const camX = camera.position[0];
  const rock = (k: number) => shake * 0.035 * Math.sin(frame * 1.7 + k * 2.1);
  const trees = useMemo(() => {
    const out: TreeSpot[] = [];
    for (let i = 0; i < 40; i++) out.push({ p: [-18 + rand(i) * 36, 0, -9 - rand(i + 70) * 12], h: 7 + rand(i + 9) * 5, s: i * 5 });
    return out;
  }, []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={["#1e2850", 18, 70]} />
      <Lights m={m} reach={10} />
      <Sky camera={camera} m={m} />
      <Hills z={-60} shift={camX * 0.5} width={260} low={2} high={5} color={m.far[1]} seed={6} />
      <mesh position={[0, 0, -10]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshToonMaterial color="#ffffff" map={dirt} gradientMap={toonRamp} />
      </mesh>
      <group rotation={[rock(1), 0, rock(2)]}>
        <House frame={frame} chimney={chimney} />
      </group>
      <group position={[-6.5, 0, -2.5]} rotation={[rock(3), 0.5, rock(4)]}>
        <House frame={frame + 30} />
      </group>
      <group position={[6.2, 0, -3]} rotation={[rock(5), -0.45, rock(6)]}>
        <House frame={frame + 60} />
      </group>
      {/* warm hearth light in the windows */}
      <Halo position={[-0.45 + 0.85, 1.2, -2.9]} size={1.2} color="#ffb05a" strength={0.5} />
      <WormFence a={[-3.6, 4.5]} b={[-3.6, -1.2]} seed={1} />
      <WormFence a={[3.2, -1.2]} b={[3.2, 4.5]} seed={9} />
      {[
        [2.2, 2.6],
        [-2.4, 3.4],
        [4.6, 0.8],
      ].map(([x, z], i) => (
        <InkCylinder key={i} radius={0.22} height={0.35} position={[x, 0.17, z]} color="#8a6a48" ink={0.015} />
      ))}
      <group rotation={[rock(7) * 0.5, 0, rock(8) * 2]}>
        <Forest trees={trees} leaf={["#2a3a30", "#334636"]} />
      </group>
      {children}
    </>
  );
};

// ---------- the river slice ----------

// A cake-slice of the river along its length, like a cutaway model standing in the dawn valley. The river runs
// left-right along x in front (z 0 .. -1.6), the cut face at z = 0 shows the earth below the bed. The block under the
// right half (x > 0.4) rises by `rise` (0..1, up to 1.1 m): the water on it is lifted and pours back to the left over
// the step. Origin: the bed's top at the cut, left part y = -1.2. Put the boat (scaled) on the left water.
export const SLICE = { bed: -1.2, water: -0.35, fault: 0.2, lift: 1.1, front: 0.0, back: -1.6, left: 3.2, right: 3.0 };
export const sliceWaterY = (x: number, rise: number) => (x < SLICE.fault ? SLICE.water + rise * 0.25 : SLICE.water + rise * SLICE.lift);
export const RiverSliceSet: React.FC<{ camera: CameraShot; frame: number; rise: number; children?: React.ReactNode }> = ({ camera, frame, rise, children }) => {
  const m = MOODS.dawn;
  const strata = useOwned(() =>
    canvasTexture(512, 256, (ctx) => {
      const bands = ["#8a5e3a", "#a87a4a", "#6e4a2e", "#b88a5a", "#7a5434", "#946a42", "#5e3e26"];
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = bands[i];
        ctx.beginPath();
        ctx.moveTo(0, i * 36);
        for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, i * 36 + Math.sin(x * 0.02 + i * 2) * 5);
        ctx.lineTo(512, 256);
        ctx.lineTo(0, 256);
        ctx.fill();
      }
      for (let i = 0; i < 300; i++) {
        ctx.fillStyle = "rgba(40,24,12,0.35)";
        ctx.beginPath();
        ctx.arc(rand(i) * 512, rand(i + 1) * 256, 1 + rand(i + 2) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }),
  );
  const strataB = useOwned(() => {
    const t = strata.clone();
    t.needsUpdate = true;
    return t;
  }, [strata]);
  const grass = useOwned(() => tiled(grassCanvas("#6a7a3a"), 4, 2));
  const lift = rise * SLICE.lift;
  const fallTex = useOwned(() => tiled(fallCanvas(), 1, 1));
  fallTex.offset.y = frame * 0.04;
  const wl = sliceWaterY(-1, rise);
  const wr = sliceWaterY(1, rise);
  const trees = useMemo<TreeSpot[]>(() => Array.from({ length: 10 }, (_, i) => ({ p: [-3.2 + i * 0.7 + rand(i) * 0.3, 0, -2.3 - rand(i + 4) * 2.2], h: 2.2 + rand(i + 9) * 1.2, s: i * 9 })), []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={m.fog} />
      <Lights m={m} reach={8} />
      <Sky camera={camera} m={m} />
      <Hills z={-60} shift={camera.position[0] * 0.5} width={260} low={1} high={3} color={m.far[1]} seed={3} />
      <Haze z={-50} color={m.fog[0]} />
      {/* far valley floor */}
      <mesh position={[0, -3.2, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 100]} />
        <meshToonMaterial color="#7a8a4a" gradientMap={toonRamp} />
      </mesh>
      {/* earth under the left (fixed) half */}
      <InkBox size={[SLICE.left, 2.0, 3.6]} position={[-SLICE.left / 2 + SLICE.fault, SLICE.bed - 1.0, -1.8]} color="#ffffff" map={strata} ink={0.03} />
      {/* the rising block under the right half, lifted by `rise`, a red fault line on its face */}
      <group position={[0, lift, 0]}>
        <InkBox size={[SLICE.right, 2.0, 3.6]} position={[SLICE.fault + SLICE.right / 2, SLICE.bed - 1.0, -1.8]} color="#ffd8c0" map={strataB} ink={0.03} />
        <InkBox size={[0.06, 2.0, 0.02]} position={[SLICE.fault + 0.03, SLICE.bed - 1.0, 0.01]} color="#e02a1a" emissive="#601008" ink={0} />
        {/* the far bank behind the river on the right part, rising with it */}
        <InkBox size={[SLICE.right, 1.4, 2.0]} position={[SLICE.fault + SLICE.right / 2, SLICE.bed + 0.7, -2.6]} color="#ffffff" map={strataB} ink={0.03} />
        <mesh position={[SLICE.fault + SLICE.right / 2, SLICE.bed + 1.402, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SLICE.right, 2.0]} />
          <meshToonMaterial color="#ffffff" map={grass} gradientMap={toonRamp} />
        </mesh>
      </group>
      {/* the far bank behind the left part */}
      <InkBox size={[SLICE.left, 1.4, 2.0]} position={[-SLICE.left / 2 + SLICE.fault, SLICE.bed + 0.7, -2.6]} color="#ffffff" map={strata} ink={0.03} />
      <mesh position={[-SLICE.left / 2 + SLICE.fault, SLICE.bed + 1.402, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SLICE.left, 2.0]} />
        <meshToonMaterial color="#ffffff" map={grass} gradientMap={toonRamp} />
      </mesh>
      <Forest trees={trees.filter((t) => t.p[0] < SLICE.fault)} leaf={["#5f7a3a", "#6e8a44"]} />
      <group position={[0, lift, 0]}>
        <Forest trees={trees.filter((t) => t.p[0] >= SLICE.fault)} leaf={["#5f7a3a", "#6e8a44"]} />
      </group>
      {/* the water: a box on each part (front face is the cut), left one swelling as the right drains onto it */}
      <group userData={{ ghost: true }}>
        <InkBox size={[SLICE.left, wl - SLICE.bed, 1.6]} position={[-SLICE.left / 2 + SLICE.fault, (wl + SLICE.bed) / 2, -0.8]} color="#6a8a92" ink={0.02} />
        <InkBox size={[SLICE.right, Math.max(0.05, wr - SLICE.bed - lift), 1.6]} position={[SLICE.fault + SLICE.right / 2, (wr + SLICE.bed + lift) / 2, -0.8]} color="#6a8a92" ink={0.02} />
        {rise > 0.05 && (
          <>
            <mesh position={[SLICE.fault - 0.12, (wr + wl) / 2, -0.8]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[1.6, Math.max(0.05, wr - wl)]} />
              <meshBasicMaterial map={fallTex} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            {Array.from({ length: 6 }, (_, i) => (
              <Blob key={i} position={[SLICE.fault - 0.4 - rand(i) * 0.5, wl + 0.05, -0.2 - i * 0.24]} scale={[0.22, 0.12 + 0.04 * Math.sin(frame * 0.5 + i), 0.18]} color="#f4f8f6" ink={0.05} detail={0} />
            ))}
          </>
        )}
      </group>
      {children}
    </>
  );
};

// ---------- Reelfoot Lake ----------

// A bald cypress standing in water: flared buttress base, straight tapering trunk, flat layered crown, knees round it.
const Cypress: React.FC<{ position: Vec3; height: number; seed: number; dead?: boolean }> = ({ position, height, seed, dead }) => {
  const k = height / 9;
  return (
    <group position={position}>
      <mesh position={[0, 0.5 * k, 0]} castShadow>
        <cylinderGeometry args={[0.2 * k, 0.7 * k, 1.4 * k, 9]} />
        <meshToonMaterial color={dead ? "#9a948a" : "#8a6a52"} gradientMap={toonRamp} />
      </mesh>
      <InkCylinder radius={0.18 * k} height={height * 0.85} position={[0, height * 0.43, 0]} color={dead ? "#a8a296" : "#7a5c46"} ink={0.03} />
      {!dead &&
        Array.from({ length: 4 }, (_, i) => {
          const s = (1.5 - i * 0.25) * k;
          return <Blob key={i} position={[(rand(seed + i) - 0.5) * 0.8 * k, height * (0.62 + i * 0.12), (rand(seed + i + 3) - 0.5) * 0.6 * k]} scale={[s * 1.4, s * 0.35, s * 1.1]} color={i % 2 ? "#4a6a3a" : "#5a7a42"} ink={0.06} detail={1} />;
        })}
      {dead && <InkCylinder radius={0.06 * k} height={1.6 * k} position={[0.5 * k, height * 0.75, 0]} rotation={[0, 0, -0.8]} color="#a8a296" ink={0.02} />}
      {Array.from({ length: 4 }, (_, i) => {
        const a = rand(seed + i * 7) * Math.PI * 2;
        return (
          <mesh key={`k${i}`} position={[Math.cos(a) * 1.0 * k, 0.1, Math.sin(a) * 1.0 * k]}>
            <coneGeometry args={[0.08 * k, 0.5 * k, 6]} />
            <meshToonMaterial color="#8a6a52" gradientMap={toonRamp} />
          </mesh>
        );
      })}
    </group>
  );
};

const SUNRISE: [number, string][] = [[-0.1, "#ffc8a8"], [0.0, "#ffb090"], [0.05, "#f890a0"], [0.15, "#c07ab8"], [0.35, "#7a6ab0"], [1.0, "#3a3a88"]];

// Reelfoot Lake at sunrise: still pink water (surface at `LAKE.water`), bald cypress standing in it, grey snags of the
// drowned forest, a far shore. `flood` 0..1 raises the water from the bare sunken ground (0) to the full lake (1).
// A dugout canoe at `LAKE.canoe` (seat at y = 0) for a sitting fisherman.
export const LAKE = { water: 0.0, canoe: [0.4, 0, 0.6] as Vec3 };
export const CypressLakeSet: React.FC<{ camera: CameraShot; frame: number; flood?: number; canoe?: boolean; children?: React.ReactNode }> = ({
  camera,
  frame,
  flood = 1,
  canoe = true,
  children,
}) => {
  const sun: Vec3 = [-2, 0.35, -10];
  const camX = camera.position[0];
  const level = -1.6 + flood * (LAKE.water + 1.6);
  const mud = useOwned(() => tiled(dirtCanvas(false), 8, 8));
  const cypress = useMemo(() => {
    const out: { p: Vec3; h: number; s: number; dead: boolean }[] = [];
    for (let i = 0; i < 46; i++) {
      const x = (rand(i) - 0.5) * 40;
      const z = 2 - rand(i + 30) * 40;
      if (Math.abs(x - LAKE.canoe[0]) < 2.4 && z > -3.5) continue;
      out.push({ p: [x, -1.6, z], h: 7 + rand(i + 9) * 6, s: i * 13, dead: rand(i + 60) > 0.7 });
    }
    return out;
  }, []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#c07ab8"]} />
      <fog attach="fog" args={["#e0a0b0", 18, 70]} />
      <ambientLight intensity={1.0} color="#ffd8e0" />
      <hemisphereLight args={["#ffc0c8", "#3a2a40", 0.6]} />
      <directionalLight position={[-6, 3, -8]} intensity={2.0} color="#ffc090" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <directionalLight position={[2, 4, 10]} intensity={0.5} color="#e8c0e0" />
      <group position={camera.position}>
        <SkyDome sun={sun} stops={SUNRISE} glow="#fff0c8" />
        <mesh position={new THREE.Vector3(...sun).normalize().multiplyScalar(270).toArray()} onUpdate={(o) => o.lookAt(0, 0, 0)}>
          <circleGeometry args={[13, 48]} />
          <meshBasicMaterial color="#fff2c8" fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
      <Hills z={-80} shift={camX * 0.6} width={300} low={1.5} high={4} color="#6a4a7a" seed={14} />
      <Haze z={-70} color="#f0a8b0" />
      {/* the sunken ground, then the water over it */}
      <mesh position={[0, -1.6, -20]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 90]} />
        <meshToonMaterial color="#8a7a5a" map={mud} gradientMap={toonRamp} />
      </mesh>
      <group userData={{ ghost: true }}>
        <mesh position={[0, level, -20]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[120, 90]} />
          <meshToonMaterial color="#c88aa8" gradientMap={toonRamp} transparent opacity={0.92} />
        </mesh>
        {/* the sun's glitter path and slow ripple lines */}
        {Array.from({ length: 26 }, (_, i) => (
          <mesh key={i} position={[camX * 0.9 + sun[0] * (2 + i * 0.3) + Math.sin(frame * 0.05 + i) * 0.1, level + 0.01, -36 + i * 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[(0.6 + rand(i) * 1.4) * (0.7 + 0.3 * Math.sin(frame * 0.12 + i * 1.7)), 0.08]} />
            <meshBasicMaterial color={i % 3 ? "#ffd8a0" : "#fff0c8"} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
        {/* lily pads */}
        {Array.from({ length: 30 }, (_, i) => (
          <mesh key={`p${i}`} position={[(rand(i + 90) - 0.5) * 14, level + 0.012, 1 - rand(i + 91) * 10]} rotation={[-Math.PI / 2, 0, rand(i) * 6]}>
            <circleGeometry args={[0.18 + rand(i + 92) * 0.12, 12, 0.3, Math.PI * 1.8]} />
            <meshToonMaterial color="#5a8a4a" gradientMap={toonRamp} />
          </mesh>
        ))}
      </group>
      {cypress.map((c, i) => (
        <Cypress key={i} position={c.p} height={c.h} seed={c.s} dead={c.dead} />
      ))}
      {canoe && flood > 0.8 && (
        <group position={[LAKE.canoe[0], 0.28 + Math.sin(frame * 0.08) * 0.015, LAKE.canoe[2]]} rotation={[0, 0.25, Math.sin(frame * 0.06) * 0.02]}>
          <mesh scale={[0.42, 0.42, 1.9]} position={[0, 0, 0]}>
            <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshToonMaterial color="#6a4a30" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.42, 1.9, 1]}>
            <circleGeometry args={[1, 24]} />
            <meshBasicMaterial color="#3a2618" />
          </mesh>
          <InkBox size={[0.7, 0.05, 0.25]} position={[0, 0.06, -0.3]} color="#8a6a44" ink={0.008} />
          {/* fishing pole */}
          <group userData={{ ghost: true }}>
            <InkCylinder radius={0.012} height={2.4} position={[0.55, 0.9, -0.6]} rotation={[0.9, 0, -0.5]} color="#c8a878" ink={0.004} />
          </group>
        </group>
      )}
      {children}
    </>
  );
};
