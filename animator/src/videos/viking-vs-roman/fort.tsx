import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, CameraRig, CameraShot, GodRays, Haze, Hills, InkBox, InkCylinder, PuppetLight, SkyDome, SmokePlume, toonRamp, Vec3 } from "../../engine";
import { rand, useOwnedTex } from "./farm";
import { Shield, Spear } from "./props";

// Felix's world, from guide/references/vindolanda-105.md: the timber fort (barrack rows with verandahs along a
// clay-and-chippings street, a turf rampart and a timber gate at the end) and the bathhouse (plastered rooms in a row,
// a raised hot basin, a plunge bath with a pink lining, steam, warm light from high windows and the furnace).

// ---------- textures ----------

const daubCanvas = () =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = "#d8ccb0";
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(150,128,96,0.12)" : "rgba(255,250,236,0.18)";
      ctx.beginPath();
      ctx.ellipse(rand(i + 3) * 512, rand(i + 5) * 256, 20 + rand(i + 7) * 60, 10 + rand(i + 8) * 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // splashed mud along the foot of the wall
    const g = ctx.createLinearGradient(0, 200, 0, 256);
    g.addColorStop(0, "rgba(110,86,60,0)");
    g.addColorStop(1, "rgba(110,86,60,0.6)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 200, 512, 56);
    // timber frame showing through: posts and a rail
    ctx.fillStyle = "#6a5240";
    for (let x = 0; x < 512; x += 128) ctx.fillRect(x, 0, 14, 256);
    ctx.fillRect(0, 96, 512, 10);
  });

const shingleCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#6d6258";
    ctx.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 16; r++)
      for (let c = 0; c < 8; c++) {
        const x = c * 32 + (r % 2) * 16;
        const y = r * 16;
        ctx.fillStyle = `rgb(${96 + rand(r * 9 + c) * 30},${86 + rand(r * 9 + c) * 26},${76 + rand(r * 9 + c) * 20})`;
        ctx.fillRect(x + 1, y + 1, 30, 15);
        ctx.fillStyle = "rgba(30,26,22,0.35)";
        ctx.fillRect(x, y + 13, 32, 3);
      }
  });

const streetCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#8a7660";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 9000; i++) {
      const v = rand(i);
      ctx.fillStyle = v > 0.66 ? "rgba(196,184,164,0.55)" : v > 0.33 ? "rgba(110,98,84,0.5)" : "rgba(160,140,112,0.5)";
      const s = 2 + rand(i + 1) * 5;
      ctx.fillRect(rand(i + 2) * 1024, rand(i + 3) * 1024, s, s * 0.8);
    }
    // two wheel ruts down the street (v runs along it)
    for (const x of [380, 640]) {
      const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
      g.addColorStop(0, "rgba(70,56,42,0)");
      g.addColorStop(0.5, "rgba(70,56,42,0.55)");
      g.addColorStop(1, "rgba(70,56,42,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 30, 0, 60, 1024);
    }
  });

const plasterCanvas = (warm: boolean) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = warm ? "#D6C6A5" : "#cfc2a6";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rand(i + 11) > 0.5 ? "rgba(160,130,96,0.1)" : "rgba(255,248,230,0.14)";
      ctx.beginPath();
      ctx.ellipse(rand(i + 3) * 512, rand(i + 5) * 512, 30 + rand(i + 7) * 80, 20 + rand(i + 8) * 50, rand(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // damp darkening up from the floor, a red painted band
    const g = ctx.createLinearGradient(0, 360, 0, 512);
    g.addColorStop(0, "rgba(120,96,70,0)");
    g.addColorStop(1, "rgba(120,96,70,0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 360, 512, 152);
    ctx.fillStyle = "#A9674B";
    ctx.fillRect(0, 300, 512, 22);
    ctx.fillStyle = "rgba(60,40,30,0.3)";
    ctx.fillRect(0, 320, 512, 3);
  });

const tileFloorCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#9c5c44";
    ctx.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = `rgb(${150 + rand(r * 8 + c) * 30},${86 + rand(r * 8 + c) * 20},${62 + rand(r * 8 + c) * 14})`;
        ctx.fillRect(c * 64 + 3, r * 64 + 3, 58, 58);
      }
  });

// ---------- fort ----------

export const FORT = { street: 1.9, unit: 1.7, units: 12, wall: 1.45 };

// One barrack row: units along z, the front facing the street; a verandah of posts with a lean-to roof.
const BarrackRow: React.FC<{ x: number; facing: 1 | -1; frame: number; seed: number; daub: THREE.Texture; shingles: THREE.Texture }> = ({ x, facing, frame, seed, daub, shingles }) => {
  const len = FORT.unit * FORT.units;
  const z0 = 2;
  const depth = 3.2;
  const cx = x - facing * (depth / 2);
  return (
    <group>
      <InkBox size={[depth, FORT.wall, len]} position={[cx, FORT.wall / 2, z0 - len / 2]} color="#ffffff" map={daub} />
      {/* main roof: a long gable, ridge along z */}
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[depth / 2 + 0.5, 0.08, len + 0.3]} position={[cx + s * (depth / 4 + 0.08), FORT.wall + 0.42, z0 - len / 2]} rotation={[0, 0, -s * 0.48]} color="#ffffff" map={shingles} />
      ))}
      {/* verandah: posts along the street edge and a lean-to roof */}
      {Array.from({ length: FORT.units + 1 }, (_, i) => (
        <InkCylinder key={i} radius={0.05} height={1.32} position={[x + facing * 0.85, 0.66, z0 - i * FORT.unit]} color="#6a5240" />
      ))}
      <InkBox size={[1.15, 0.06, len + 0.2]} position={[x + facing * 0.45, 1.36, z0 - len / 2]} rotation={[0, 0, facing * 0.2]} color="#ffffff" map={shingles} />
      <InkBox size={[0.08, 0.1, len]} position={[x + facing * 0.85, 1.3, z0 - len / 2]} color="#5e4734" />
      {/* doors, shutters and life along the front */}
      {Array.from({ length: FORT.units }, (_, i) => {
        const z = z0 - (i + 0.5) * FORT.unit;
        const r = rand(seed * 31 + i);
        return (
          <group key={`d${i}`}>
            <InkBox size={[0.05, 0.98, 0.56]} position={[x + facing * 0.01, 0.49, z - 0.3]} color={r > 0.5 ? "#4a3626" : "#56402e"} />
            <InkBox size={[0.04, 0.3, 0.36]} position={[x + facing * 0.01, 1.0, z + 0.4]} color="#2e241c" />
            {r > 0.55 && <Shield position={[x + facing * 0.12, 0.38, z + 0.05]} rotation={[0, facing * Math.PI / 2 - facing * 0.25, -0.08 * facing]} scale={0.95} />}
            {r < 0.25 && (
              <group>
                <InkCylinder radius={0.15} height={0.4} position={[x + facing * 0.32, 0.2, z + 0.5]} color="#8a6a48" />
                <InkBox size={[0.34, 0.24, 0.3]} position={[x + facing * 0.3, 0.12, z + 0.05]} color="#c8b48a" />
              </group>
            )}
            {r > 0.3 && r < 0.42 && <Spear base={[x + facing * 0.1, 0.02, z + 0.25]} tip={[x + facing * 0.16, 1.5, z + 0.3]} />}
          </group>
        );
      })}
      {rand(seed) > 0.3 && <SmokePlume position={[cx, FORT.wall + 1.0, z0 - len * 0.6]} world={[cx, z0 - len * 0.6]} frame={frame} size={0.12} rise={1.8} wind={0.7} period={70} puffs={6} />}
    </group>
  );
};

// The gate at the end of the street: a turf rampart with a timber gateway, two towers and a walkway.
const Gateway: React.FC<{ z: number }> = ({ z }) => (
  <group position={[0, 0, z]}>
    {[-1, 1].map((s) => (
      <group key={s}>
        {/* turf rampart */}
        <mesh position={[s * 9, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[14, 1.8, 3.4]} />
          <meshToonMaterial color="#6f8248" gradientMap={toonRamp} />
        </mesh>
        {/* palisade on top */}
        {Array.from({ length: 24 }, (_, i) => (
          <InkBox key={i} size={[0.16, 0.7, 0.14]} position={[s * (2.2 + i * 0.55), 2.15, 0.9]} color="#6a5240" />
        ))}
        {/* tower */}
        {[-1, 1].map((k) => (
          <InkCylinder key={k} radius={0.12} height={3.6} position={[s * 1.9 + k * 0.6, 1.8, 0.9]} color="#5e4734" />
        ))}
        <InkBox size={[1.6, 0.9, 1.5]} position={[s * 1.9, 3.3, 0.9]} color="#7a5e44" />
        <InkBox size={[1.9, 0.1, 1.8]} position={[s * 1.9, 3.85, 0.9]} rotation={[0, 0, 0]} color="#5a4c40" />
      </group>
    ))}
    {/* the gate: oak posts in pairs, alder plank leaves, lintel and walkway */}
    <InkBox size={[3.2, 0.25, 1.3]} position={[0, 2.85, 0.9]} color="#6a5240" />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[1.1, 2.2, 0.12]} position={[s * 0.62, 1.1, 0.6]} rotation={[0, s * 0.9, 0]} color="#7d6248" />
    ))}
  </group>
);

const MORNING_SKY: [number, string][] = [
  [-0.1, "#e8ecee"],
  [0.0, "#dfe6ea"],
  [0.1, "#c2d2de"],
  [0.25, "#97b2cc"],
  [0.5, "#7495b8"],
  [1.0, "#5a7ca4"],
];
const FORT_SUN: Vec3 = [5, 4.5, 6];

export const fortLight = (): PuppetLight => ({ tint: "#f2f4f6", shadow: 0.16, distant: [{ direction: [0.6, 0.5, 0.62], color: "#fff2e0", strength: 1.2 }] });

export const FortStreetSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const camZ = camera.position[2];
  const daub = useOwnedTex(() => {
    const t = daubCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(FORT.units / 1.5, 1);
    return t;
  });
  const shingles = useOwnedTex(() => {
    const t = shingleCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 12);
    return t;
  });
  const street = useOwnedTex(() => {
    const t = streetCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 6);
    return t;
  });
  const grass = useOwnedTex(() => {
    const t = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = "#71844a";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = rand(i) > 0.5 ? "rgba(60,80,40,0.3)" : "rgba(150,160,100,0.3)";
        ctx.fillRect(rand(i + 1) * 256, rand(i + 2) * 256, 3, 6);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 30);
    return t;
  });
  const len = FORT.unit * FORT.units;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#c2d2de"]} />
      <fog attach="fog" args={["#d6dee4", 12, 60]} />
      <ambientLight intensity={1.05} color="#eef1f4" />
      <hemisphereLight args={["#d0dcea", "#6a5e4a", 0.6]} />
      <directionalLight
        position={FORT_SUN}
        intensity={2.3}
        color="#fff2e0"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />
      <group position={camera.position}>
        <SkyDome sun={FORT_SUN} stops={MORNING_SKY} glow="#fff2dc" />
      </group>
      <Hills z={-60} shift={camera.position[0] * 0.6} width={260} low={4} high={11} color="#9aa8ae" seed={21} flat />
      <Haze z={-40} color="#e2e8ea" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, -10]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshToonMaterial map={grass} gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 2 - len / 2 - 2]} receiveShadow>
        <planeGeometry args={[FORT.street * 2 + 1.8, len + 8]} />
        <meshToonMaterial map={street} gradientMap={toonRamp} />
      </mesh>
      {/* puddles: dark, glossy, catching the sky */}
      {[[0.5, -3.4, 0.5], [-0.7, -8.2, 0.7], [0.9, -13.5, 0.45]].map(([x, z, r], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, rand(i) * 3]} position={[x, 0.004, z]} scale={[1.6, 1, 1]}>
          <circleGeometry args={[r, 24]} />
          <meshBasicMaterial color="#a8bccb" transparent opacity={0.8} />
        </mesh>
      ))}
      <BarrackRow x={-FORT.street} facing={1} frame={frame} seed={1} daub={daub} shingles={shingles} />
      <BarrackRow x={FORT.street} facing={-1} frame={frame} seed={2} daub={daub} shingles={shingles} />
      <Gateway z={2 - len - 4} />
      {/* a handcart in the street and sacks waiting by it */}
      <group position={[1.1, 0, -6]} rotation={[0, 0.4, 0]}>
        <InkBox size={[0.8, 0.12, 1.2]} position={[0, 0.42, 0]} color="#8a6a48" />
        <InkBox size={[0.06, 0.3, 1.2]} position={[0.38, 0.6, 0]} color="#7a5e44" />
        <InkBox size={[0.06, 0.3, 1.2]} position={[-0.38, 0.6, 0]} color="#7a5e44" />
        {[-1, 1].map((s) => (
          <InkCylinder key={s} radius={0.32} height={0.06} position={[s * 0.46, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} color="#6a5240" />
        ))}
        <InkBox size={[0.04, 0.04, 0.9]} position={[0, 0.4, 0.98]} color="#6a5240" />
        <InkBox size={[0.34, 0.26, 0.3]} position={[0.1, 0.6, -0.2]} color="#c8b48a" />
        <InkBox size={[0.3, 0.24, 0.28]} position={[-0.15, 0.6, 0.25]} color="#bfa97e" />
      </group>
      {children}
    </>
  );
};

// ---------- bathhouse ----------

// The hot room: a raised basin of hot water against the back wall under a high window, an arch through to the next
// room (more steam, the furnace glow beyond), a plunge bath with steps and its pink lining in the floor on the right.
export const BATH = { basin: [-0.3, 0, -1.2] as Vec3, basinW: 2.6, basinD: 1.5, rim: 0.42, water: 0.36, plunge: [1.9, 0, 0.4] as Vec3 };

// Soft steam: camera-facing puffs that rise, swell and fade, on a loop.
const steamTex = () =>
  canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,0.75)");
    g.addColorStop(0.5, "rgba(255,255,255,0.3)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });

export const Steam: React.FC<{ area: [number, number, number, number]; base: number; frame: number; count?: number; height?: number; seed?: number; opacity?: number; color?: string }> = ({
  area,
  base,
  frame,
  count = 40,
  height = 1.6,
  seed = 1,
  opacity = 0.32,
  color = "#DCE2D5",
}) => {
  const tex = useOwnedTex(steamTex);
  const puffs = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ x: area[0] + rand(seed * 100 + i) * (area[2] - area[0]), z: area[1] + rand(seed * 100 + i + 50) * (area[3] - area[1]), off: rand(seed * 7 + i) * 200, sp: 0.6 + rand(i + 9) * 0.6, s: 0.5 + rand(i + 3) * 0.6 })),
    [area[0], area[1], area[2], area[3], count, seed],
  );
  return (
    <group userData={{ ghost: true }}>
      {puffs.map((p, i) => {
        const t = ((frame * p.sp + p.off) % 200) / 200;
        const y = base + t * height;
        const s = p.s * (0.5 + t * 1.3);
        const o = opacity * Math.sin(t * Math.PI);
        return (
          <sprite key={i} position={[p.x + Math.sin(frame / 40 + i) * 0.15 * t, y, p.z]} scale={[s, s, s]}>
            <spriteMaterial map={tex} color={color} transparent opacity={o} depthWrite={false} toneMapped={false} />
          </sprite>
        );
      })}
    </group>
  );
};

export const bathLight = (frame: number): PuppetLight => ({
  tint: "#fff0dc",
  shadow: 0.2,
  distant: [{ direction: [-0.3, 0.8, 0.5], color: "#ffe2b0", strength: 1.0 }],
  points: [{ position: [-2.6, 0.6, -2.6], color: "#ff9a50", strength: 1.6 + 0.2 * Math.sin(frame / 5), range: 3.2 }],
});

export const BathhouseSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const plaster = useOwnedTex(() => {
    const t = plasterCanvas(true);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1);
    return t;
  });
  const floor = useOwnedTex(() => {
    const t = tileFloorCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 4);
    return t;
  });
  const W = 7;
  const D = 5;
  const H = 2.8;
  const back = -2.2;
  const b = BATH;
  const ripple = Math.sin(frame / 9) * 0.004;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#3a3532"]} />
      <fog attach="fog" args={["#a89c88", 5, 18]} />
      <ambientLight intensity={0.42} color="#ffe8d0" />
      <hemisphereLight args={["#ffe2c0", "#4a3428", 0.4]} />
      <directionalLight position={[-1.5, 6, 3]} intensity={1.15} color="#ffe2b0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} />
      <pointLight position={[-2.6, 0.6, -2.6]} intensity={2.5} distance={4} color="#ff9a50" />
      {/* floor, wet and glossy */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D + 2]} />
        <meshPhongMaterial map={floor} shininess={80} specular="#806050" />
      </mesh>
      {/* walls: back (with the arch through), left, right, ceiling vault */}
      <InkBox size={[W, H, 0.2]} position={[1.2, H / 2, back - 0.1]} color="#ffffff" map={plaster} />
      <InkBox size={[0.2, H, D + 2]} position={[-W / 2, H / 2, 0]} color="#ffffff" map={plaster} />
      <InkBox size={[0.2, H, D + 2]} position={[W / 2, H / 2, 0]} color="#ffffff" map={plaster} />
      {/* arch to the next room: two piers and a semicircle, the room beyond glowing and steaming */}
      <InkBox size={[0.3, 1.7, 0.4]} position={[-1.9, 0.85, back]} color="#ffffff" map={plaster} />
      <InkBox size={[0.3, 1.7, 0.4]} position={[-3.2, 0.85, back]} color="#ffffff" map={plaster} />
      <mesh position={[-2.55, 1.7, back]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.65, 0.15, 10, 24, Math.PI]} />
        <meshToonMaterial color="#A9674B" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[1.0, 2.6, 0.2]} position={[-2.55, 1.6, back - 0.1 - 2.0]} color="#a8784c" />
      <mesh position={[-2.55, 0.35, back - 1.6]}>
        <planeGeometry args={[0.6, 0.5]} />
        <meshBasicMaterial color="#c86a2a" toneMapped={false} />
      </mesh>
      <InkBox size={[0.2, 2.8, 2.0]} position={[-2.0, 1.4, back - 1.1]} color="#ffffff" map={plaster} />
      <InkBox size={[0.2, 2.8, 2.0]} position={[-3.1, 1.4, back - 1.1]} color="#ffffff" map={plaster} />
      {/* barrel vault ceiling */}
      <mesh position={[0, H, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[W / 2, W / 2, D + 2, 32, 1, true, Math.PI, Math.PI]} />
        <meshToonMaterial map={plaster} gradientMap={toonRamp} side={THREE.BackSide} />
      </mesh>
      {/* high window and its shafts */}
      <InkBox size={[0.9, 0.6, 0.1]} position={[0.6, 2.25, back + 0.02]} color="#fff6e0" emissive="#fff0d0" />
      <GodRays center={[0.6, 2.25, back + 0.08]} size={[0.9, 0.6]} panes={[2, 1]} sun={[0.25, -0.75, 1]} strength={0.07} patch={0.18} motes={50} frame={frame} />
      {/* the raised hot basin: tile walls, a rim to sit on, water, ripples */}
      <group position={b.basin}>
        <InkBox size={[b.basinW, b.rim, 0.14]} position={[0, b.rim / 2, b.basinD / 2]} color="#A9674B" />
        <InkBox size={[0.14, b.rim, b.basinD]} position={[-b.basinW / 2, b.rim / 2, 0]} color="#A9674B" />
        <InkBox size={[0.14, b.rim, b.basinD]} position={[b.basinW / 2, b.rim / 2, 0]} color="#A9674B" />
        <InkBox size={[b.basinW + 0.14, 0.06, 0.24]} position={[0, b.rim + 0.03, b.basinD / 2]} color="#c8a184" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, b.water + ripple, 0]}>
          <planeGeometry args={[b.basinW - 0.1, b.basinD - 0.1]} />
          <meshPhongMaterial color="#759D9C" shininess={120} specular="#ffe8c8" transparent opacity={0.94} />
        </mesh>
      </group>
      {/* the plunge bath in the floor: steps down, pink crushed-tile lining */}
      <group position={b.plunge}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <planeGeometry args={[1.5, 1.2]} />
          <meshPhongMaterial color="#8fb2ae" shininess={140} specular="#ffffff" transparent opacity={0.9} />
        </mesh>
        {[-1, 1].map((s) => (
          <InkBox key={s} size={[1.66, 0.08, 0.08]} position={[0, 0.04, s * 0.64]} color="#d49a8a" />
        ))}
        {[-1, 1].map((s) => (
          <InkBox key={`x${s}`} size={[0.08, 0.08, 1.36]} position={[s * 0.79, 0.04, 0]} color="#d49a8a" />
        ))}
        <InkBox size={[0.4, 0.04, 1.1]} position={[-0.5, -0.06, 0]} color="#c98e80" />
      </group>
      {/* benches and a few things: a strigil and an oil flask on the bench, a folded cloth */}
      <InkBox size={[0.4, 0.34, 2.6]} position={[W / 2 - 0.35, 0.17, -0.2]} color="#c8b090" />
      <InkBox size={[0.36, 0.06, 0.4]} position={[W / 2 - 0.35, 0.37, 0.6]} color="#DDD0AC" />
      <InkCylinder radius={0.05} height={0.14} position={[W / 2 - 0.35, 0.41, -0.3]} color="#7a8a6a" />
      <Steam area={[b.basin[0] - 1.2, b.basin[2] - 0.6, b.basin[0] + 1.2, b.basin[2] + 0.6]} base={b.water} frame={frame} count={36} height={1.9} seed={2} />
      <Steam area={[-3.2, back - 2, -1.9, back]} base={0.2} frame={frame} count={14} height={2.4} seed={5} opacity={0.4} />
      <Steam area={[-3, -2, 3, 2]} base={0.4} frame={frame} count={24} height={1.6} seed={9} opacity={0.14} />
      {children}
    </>
  );
};
