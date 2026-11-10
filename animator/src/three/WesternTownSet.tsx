import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture } from "./kit";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import type { PuppetLight } from "../puppet/PuppetBillboard";

// A frontier main street at sunset, built from guide/references/western-street.md. The dirt street runs along -z
// (x within ±STREET.half, floor y = 0) between raised plank boardwalks and false-front wooden buildings (fronts at
// x = ±STREET.front) with porch roofs on posts. The street opens at z ≈ STREET.end onto the desert: a painted rock
// and cactus strip and a painted sky with mesas (both made with Codex image generation, public/backdrops/western/),
// the low sun sitting over the street's vanishing point. The sun light comes down the street toward +z, so
// everything throws long shadows toward the camera. Light puppets with `duskLight()`.

type Vec3 = [number, number, number];

export const STREET = { half: 3.0, walk: 1.25, front: 4.35, end: -34 };
export const SUN_POS: Vec3 = [0.25, 3.0, -30]; // the shadow light (low, slightly left of the street axis)
export const DUSK_BG = "#3a1d2a";
export type TownMode = "sunset" | "dusk" | "night" | "fog" | "day";
export const TOWN_BG: Record<TownMode, string> = { sunset: "#3a1d2a", dusk: "#2a2040", night: "#0e1220", fog: "#9aa4b0", day: "#7aa8e0" };
// The undertaker's blade sign hangs under his porch roof on two chains (right side of the street).
export const SIGN = { x: 3.35, y: 1.9, z: -0.9 };

// How the street's light falls on puppets, per time of day. `lantern` adds a held lantern's warm point light.
export const townLight = (mode: TownMode, lantern?: Vec3): PuppetLight => {
  const lamp = lantern ? [{ position: lantern, color: "#ffb860", strength: 2.6, range: 2.2 }] : [];
  if (mode === "dusk")
    return { tint: "#b8a0e0", tintAmount: 0.12, shadow: 0.3, points: lamp, distant: [{ direction: [-0.08, 0.2, -1], color: "#ff8a70", strength: 1.2 }, { direction: [0.3, 0.6, 1], color: "#7a70d8", strength: 0.5 }] };
  if (mode === "day") return { tint: "#fff4e0", tintAmount: 0.06, shadow: 0.16, points: lamp, distant: [{ direction: [-0.6, 0.8, 0.5], color: "#fff2d8", strength: 1.1 }] };
  if (mode === "fog") return { tint: "#e0e8f0", tintAmount: 0.1, shadow: 0.16, points: lamp, distant: [{ direction: [-0.5, 0.8, 0.5], color: "#f4f8ff", strength: 0.9 }] };
  if (mode === "night")
    return { tint: "#7088c8", tintAmount: 0.22, shadow: 0.45, points: lamp, distant: [{ direction: [-0.4, 0.6, -0.7], color: "#9ab4ff", strength: 1.4 }] };
  return { ...duskLight(), points: lamp };
};

export const duskLight = (): PuppetLight => ({
  tint: "#ffb488",
  tintAmount: 0.1,
  shadow: 0.34,
  distant: [
    { direction: [-0.08, 0.14, -1], color: "#ffa04a", strength: 2.6 }, // the sun behind them: a hot rim
    { direction: [0.3, 0.5, 1], color: "#8a7ad8", strength: 0.35 }, // violet sky bounce on the shaded side
  ],
});

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- painted backdrops (Codex image generation) ----------

const loader = new THREE.TextureLoader();
export const useImage = (src: string, key?: string) => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => delayRender(`Loading backdrop ${src}`));
  const advance = useThree((s) => s.advance);
  const released = useRef(false);
  useEffect(() => {
    loader.load(
      staticFile(src),
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        if (key) {
          // chroma key: the pure green ground becomes transparent, the fringe is despilled
          const img = t.image as HTMLImageElement;
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, c.width, c.height);
          const px = d.data;
          for (let i = 0; i < px.length; i += 4) {
            const r = px[i], g = px[i + 1], b = px[i + 2];
            const spill = g - Math.max(r, b);
            if (spill > 40) px[i + 3] = Math.max(0, 255 - (spill - 40) * 4);
            if (spill > 0) px[i + 1] = Math.max(r, b);
          }
          ctx.putImageData(d, 0, 0);
          const k = new THREE.CanvasTexture(c);
          k.colorSpace = THREE.SRGBColorSpace;
          k.anisotropy = 8;
          setTex(k);
        } else setTex(t);
      },
      undefined,
      (e) => cancelRender(new Error(`Could not load ${src}: ${e}`)),
    );
  }, [src, key]);
  useEffect(() => {
    if (tex && !released.current) {
      released.current = true;
      advance(performance.now());
      continueRender(handle);
    }
  }, [tex, handle, advance]);
  return tex;
};

const SKY: Record<TownMode, { sky: string; rocks?: string; tint?: string; horizon: number }> = {
  sunset: { sky: "backdrops/western/sky.png", rocks: "backdrops/western/rocks.png", horizon: 0.8 },
  dusk: { sky: "backdrops/western/dusk.png", rocks: "backdrops/western/rocks.png", tint: "#8a78b0", horizon: 0.97 },
  night: { sky: "backdrops/western/night.png", rocks: "backdrops/western/rocks_night.png", horizon: 0.97 },
  fog: { sky: "backdrops/goldcountry/sf_fog.png", horizon: 0.98 },
  day: { sky: "backdrops/northfield/day.png", horizon: 0.91 }, // a Minnesota river town on a late-summer afternoon (Northfield) // a foggy city morning: the town as a San Francisco street
};

const Backdrops: React.FC<{ camX: number; mode: TownMode }> = ({ camX, mode }) => {
  const m = SKY[mode];
  const sky = useImage(m.sky);
  const rocks = useImage(m.rocks ?? m.sky, "green");
  return (
    <>
      {sky && (
        // the painting's horizon at eye level (the sky-only paintings: their bottom edge, hidden by the rocks)
        <mesh position={[camX * 0.95 + 8.8, 0.4 + (m.horizon - 0.5) * 200, -160]} renderOrder={-9}>
          <planeGeometry args={[300, 200]} />
          <meshBasicMaterial map={sky} fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      {rocks && m.rocks && (
        // the strip's ground line (93 % down) on the desert floor
        <mesh position={[camX * 0.5 - 1, 0.43 * 40, -62]} renderOrder={-8}>
          <planeGeometry args={[60, 40]} />
          <meshBasicMaterial map={rocks} color={m.tint ?? "#ffffff"} transparent alphaTest={0.4} fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </>
  );
};

// The undertaker's blade sign: hanging on two chains, or (after the shoot-out) fallen flat on the boardwalk.
export const ShopSign: React.FC<{ fallen?: boolean }> = ({ fallen }) => {
  const face = useMemo(
    () =>
      canvasTexture(1024, 512, (ctx) => {
        ctx.fillStyle = "#1e1a18";
        ctx.fillRect(0, 0, 1024, 512);
        ctx.strokeStyle = "#e8d8a8";
        ctx.lineWidth = 12;
        ctx.strokeRect(22, 22, 980, 468);
        ctx.fillStyle = "#e8d8a8";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 150px Georgia, 'Times New Roman', serif";
        ctx.fillText("PRUITT & SON", 512, 190, 920);
        ctx.font = "bold 120px Georgia, 'Times New Roman', serif";
        ctx.fillText("COFFINS", 512, 360, 700);
      }),
    [],
  );
  const W = 1.1, H = 0.55;
  const board = (
    <group>
      <InkBox size={[W, H, 0.05]} color="#2a2420" ink={0.015} />
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 0, s * 0.027]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[W - 0.02, H - 0.02]} />
          <meshToonMaterial map={face} gradientMap={toonRamp} />
        </mesh>
      ))}
    </group>
  );
  const chain = (x: number, y0: number, len: number) => <InkCylinder radius={0.012} height={len} position={[x, y0 - len / 2, 0]} color="#3a3434" ink={0.006} />;
  if (fallen)
    return (
      <group>
        <group position={[SIGN.x + 0.2, 0.18 + 0.03, SIGN.z + 0.2]} rotation={[-Math.PI / 2, 0, 0.3]}>{board}</group>
        <group position={[SIGN.x, 0, SIGN.z]}>
          {chain(-0.4, 2.27, 0.16)}
          {chain(0.4, 2.27, 0.1)}
        </group>
      </group>
    );
  return (
    <group position={[SIGN.x, 0, SIGN.z]}>
      {chain(-0.4, 2.27, 2.27 - SIGN.y - H / 2)}
      {chain(0.4, 2.27, 2.27 - SIGN.y - H / 2)}
      <group position={[0, SIGN.y, 0]}>{board}</group>
    </group>
  );
};

// ---------- textures ----------

const dirtCanvas = () =>
  canvasTexture(1024, 2048, (ctx) => {
    ctx.fillStyle = "#b98a5c";
    ctx.fillRect(0, 0, 1024, 2048);
    for (let i = 0; i < 160; i++) {
      const v = rand(i + 3);
      ctx.fillStyle = v > 0.55 ? "rgba(150,104,66,0.35)" : "rgba(214,170,118,0.32)";
      ctx.beginPath();
      ctx.ellipse(rand(i) * 1024, rand(i + 400) * 2048, 40 + rand(i + 9) * 90, 20 + rand(i + 11) * 50, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // wagon ruts: two worn tracks with ridged edges, wavering down the street
    for (const cx of [330, 700]) {
      for (let y = 0; y < 2048; y += 4) {
        const x = cx + Math.sin(y * 0.004 + cx) * 18;
        ctx.fillStyle = "rgba(120,80,50,0.16)";
        ctx.fillRect(x - 34, y, 68, 4);
        ctx.fillStyle = "rgba(96,62,38,0.22)";
        ctx.fillRect(x - 14, y, 28, 4);
        ctx.fillStyle = "rgba(232,196,146,0.22)";
        ctx.fillRect(x - 44, y, 8, 4);
        ctx.fillRect(x + 36, y, 8, 4);
      }
    }
    // hoof prints and pebbles
    for (let i = 0; i < 900; i++) {
      const x = rand(i + 2000) * 1024;
      const y = rand(i + 5000) * 2048;
      const v = rand(i + 900);
      if (v > 0.7) {
        ctx.fillStyle = "rgba(100,66,42,0.35)";
        ctx.beginPath();
        ctx.arc(x, y, 6, Math.PI * 0.1, Math.PI * 1.9);
        ctx.fill();
      } else {
        ctx.fillStyle = v > 0.35 ? "rgba(90,60,40,0.5)" : "rgba(240,210,160,0.5)";
        ctx.fillRect(x, y, 2 + rand(i) * 4, 2 + rand(i + 1) * 3);
      }
    }
  });

const plankCanvas = (seed: number, base: string) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    const n = 8;
    for (let k = 0; k < n; k++) {
      const y = (k * 512) / n;
      const v = rand(seed + k);
      ctx.fillStyle = `rgba(${v > 0.5 ? "255,240,220" : "40,20,10"},${0.05 + v * 0.08})`;
      ctx.fillRect(0, y, 512, 512 / n);
      ctx.fillStyle = "rgba(30,16,10,0.55)";
      ctx.fillRect(0, y, 512, 3);
      // grain
      for (let g = 0; g < 14; g++) {
        ctx.fillStyle = "rgba(40,20,10,0.12)";
        ctx.fillRect(rand(seed * 7 + k * 31 + g) * 512, y + 6 + rand(seed + g * 3 + k) * (512 / n - 12), 30 + rand(g + k) * 120, 1.5);
      }
      // nail heads at the studs
      for (let s = 0; s < 4; s++) {
        ctx.fillStyle = "rgba(30,20,15,0.6)";
        ctx.fillRect(40 + s * 128, y + 8, 3, 3);
      }
    }
  });

const signCanvas = (text: string, bg: string, fg: string) =>
  canvasTexture(1024, 256, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, 988, 220);
    ctx.fillStyle = fg;
    ctx.font = "bold 150px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 138, 940);
  });

const glowCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });

// ---------- buildings ----------

type BuildingSpec = {
  z0: number; // street-side span along z (z0 > z1)
  z1: number;
  h: number; // false-front height
  color: string;
  trim: string;
  sign?: string;
  signBg?: string;
  signFg?: string;
  porch?: boolean;
  lit?: boolean; // warm lamp light in the windows
  saloon?: boolean;
  seed: number;
};

const LEFT: BuildingSpec[] = [
  { z0: 9, z1: 4.6, h: 4.2, color: "#8a5a3a", trim: "#e8d8b8", sign: "HOTEL", signBg: "#2a1a14", signFg: "#f0d890", porch: true, lit: true, seed: 1 },
  { z0: 4.4, z1: 0.2, h: 3.4, color: "#9c8a6a", trim: "#5a3a24", sign: "GENERAL STORE", signBg: "#e8dcc0", signFg: "#3a2014", porch: true, seed: 2 },
  { z0: 0, z1: -4.6, h: 4.8, color: "#7a2e22", trim: "#f0e0c0", sign: "SALOON", signBg: "#f0e0c0", signFg: "#7a2e22", porch: true, lit: true, saloon: true, seed: 3 },
  { z0: -4.8, z1: -8.2, h: 3.2, color: "#6a6a62", trim: "#d8d0b8", sign: "BARBER", signBg: "#2a2a2a", signFg: "#e8e0c8", porch: true, seed: 4 },
  { z0: -8.4, z1: -13, h: 4.0, color: "#a0784a", trim: "#4a2a1a", sign: "LIVERY", signBg: "#4a2a1a", signFg: "#f0d8a8", porch: false, seed: 5 },
  { z0: -13.2, z1: -17, h: 3.0, color: "#7e6448", trim: "#e0d0b0", porch: true, seed: 6 },
  { z0: -17.2, z1: -21.5, h: 3.6, color: "#5e4636", trim: "#d0b890", porch: true, seed: 7 },
];
const RIGHT: BuildingSpec[] = [
  { z0: 9, z1: 5.0, h: 3.6, color: "#5a6a74", trim: "#e8e0d0", sign: "SHERIFF", signBg: "#1e2228", signFg: "#f0d070", porch: true, seed: 11 },
  { z0: 4.8, z1: 0.4, h: 5.0, color: "#c8a878", trim: "#5a2a1a", sign: "BANK", signBg: "#5a2a1a", signFg: "#f4e2b0", porch: true, lit: true, seed: 12 },
  { z0: 0.2, z1: -3.6, h: 3.3, color: "#8a3a2a", trim: "#e8d8b0", porch: true, seed: 13 },
  { z0: -3.8, z1: -8.6, h: 4.4, color: "#6e5a44", trim: "#f0e4c8", sign: "DRY GOODS", signBg: "#f0e4c8", signFg: "#3a2a1a", porch: true, lit: true, seed: 14 },
  { z0: -8.8, z1: -12.4, h: 3.1, color: "#9a8a70", trim: "#4a3020", porch: true, seed: 15 },
  { z0: -12.6, z1: -17.4, h: 3.9, color: "#74503a", trim: "#e0c8a0", sign: "POST", signBg: "#e0c8a0", signFg: "#3a2010", porch: true, seed: 16 },
  { z0: -17.6, z1: -21, h: 2.9, color: "#887058", trim: "#d8c0a0", porch: false, seed: 17 },
];

const Window: React.FC<{ y: number; z: number; x: number; side: number; lit?: boolean; w?: number; h?: number; trim: string }> = ({ y, z, x, side, lit, w = 0.7, h = 0.95, trim }) => (
  <group position={[x, y, z]}>
    <InkBox size={[0.06, h + 0.16, w + 0.16]} color={trim} ink={0.012} />
    <InkBox size={[0.08, h, w]} position={[-side * 0.01, 0, 0]} color={lit ? "#ffb85a" : "#2a2a3e"} emissive={lit ? "#c86a1a" : "#141022"} ink={0} />
    {/* muntins */}
    <InkBox size={[0.1, h, 0.035]} position={[-side * 0.02, 0, 0]} color={trim} ink={0} />
    <InkBox size={[0.1, 0.035, w]} position={[-side * 0.02, 0, 0]} color={trim} ink={0} />
  </group>
);

const Building: React.FC<{ b: BuildingSpec; side: -1 | 1 }> = ({ b, side }) => {
  const len = b.z0 - b.z1;
  const zc = (b.z0 + b.z1) / 2;
  const fx = side * STREET.front;
  const clap = useMemo(() => {
    const t = plankCanvas(b.seed, "#ffffff");
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(len / 2.2, b.h / 1.2);
    return t;
  }, [b.seed, len, b.h]);
  const sign = useMemo(() => (b.sign ? signCanvas(b.sign, b.signBg ?? "#2a1a14", b.signFg ?? "#f0d890") : null), [b.sign, b.signBg, b.signFg]);
  const bodyH = b.h * 0.72;
  const doorZ = zc + (rand(b.seed) - 0.5) * len * 0.25;
  // stepped or flat false-front top
  const stepped = rand(b.seed + 5) > 0.45;
  return (
    <group>
      {/* the building behind the false front, gable roof */}
      <InkBox size={[4, bodyH, len - 0.1]} position={[fx + side * 2.1, bodyH / 2, zc]} color={b.color} map={clap} ink={0.02} />
      <mesh position={[fx + side * 2.1, bodyH + 0.5, zc]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[4.3, 0.14, len - 0.05]} />
        <meshToonMaterial color="#4a3428" gradientMap={toonRamp} />
      </mesh>
      {/* the false front */}
      <InkBox size={[0.16, b.h, len]} position={[fx, b.h / 2, zc]} color={b.color} map={clap} ink={0.02} />
      {stepped && <InkBox size={[0.16, 0.5, len * 0.5]} position={[fx, b.h + 0.25, zc]} color={b.color} map={clap} ink={0.02} />}
      {/* cornice and corner boards */}
      <InkBox size={[0.34, 0.16, len + 0.2]} position={[fx - side * 0.05, b.h - 0.08, zc]} color={b.trim} ink={0.015} />
      {stepped && <InkBox size={[0.3, 0.12, len * 0.5 + 0.16]} position={[fx - side * 0.05, b.h + 0.5, zc]} color={b.trim} ink={0.015} />}
      <InkBox size={[0.22, b.h, 0.14]} position={[fx - side * 0.02, b.h / 2, b.z0 - 0.07]} color={b.trim} ink={0.012} />
      <InkBox size={[0.22, b.h, 0.14]} position={[fx - side * 0.02, b.h / 2, b.z1 + 0.07]} color={b.trim} ink={0.012} />
      {/* sign board across the false front */}
      {sign && (
        <group position={[fx - side * 0.12, b.h - 0.72, zc]} rotation={[0, -side * Math.PI / 2, 0]}>
          <mesh>
            <planeGeometry args={[Math.min(len * 0.8, 3.4), Math.min(len * 0.8, 3.4) / 4]} />
            <meshToonMaterial map={sign} gradientMap={toonRamp} />
          </mesh>
        </group>
      )}
      {/* upper windows */}
      {b.h > 3.6 &&
        [-0.28, 0.28].map((k, i) => <Window key={i} x={fx - side * 0.1} y={b.h - 1.55} z={zc + k * len} side={side} lit={b.lit && i === 0} w={0.55} h={0.8} trim={b.trim} />)}
      {/* door and shop windows */}
      <InkBox size={[0.1, 1.75, 1.0]} position={[fx - side * 0.04, 0.18 + 0.875, doorZ]} color="#1e140e" ink={0.012} />
      <InkBox size={[0.14, 0.14, 1.2]} position={[fx - side * 0.06, 0.18 + 1.82, doorZ]} color={b.trim} ink={0.012} />
      {b.saloon ? (
        // batwing doors, half open, lamplight behind
        <>
          <InkBox size={[0.08, 1.7, 0.96]} position={[fx + side * 0.02, 0.18 + 0.86, doorZ]} color="#ffb860" emissive="#d87020" ink={0} />
          {[-1, 1].map((s) => (
            <InkBox key={s} size={[0.05, 0.75, 0.46]} position={[fx - side * 0.18, 0.18 + 0.95, doorZ + s * 0.26]} rotation={[0, s * side * 0.5, 0]} color={b.trim} ink={0.012} />
          ))}
        </>
      ) : (
        <InkBox size={[0.06, 1.5, 0.82]} position={[fx - side * 0.09, 0.18 + 0.8, doorZ]} rotation={[0, 0, 0]} color="#5a3a26" ink={0.01} />
      )}
      {[-1, 1].map((s) => {
        const wz = doorZ + s * (0.5 + len * 0.22);
        if (wz > b.z0 - 0.5 || wz < b.z1 + 0.5) return null;
        return <Window key={s} x={fx - side * 0.1} y={0.18 + 1.05} z={wz} side={side} lit={b.lit} w={Math.min(1.2, len * 0.25)} h={1.15} trim={b.trim} />;
      })}
      {/* porch roof on posts over the boardwalk */}
      {b.porch && (
        <>
          <mesh position={[fx - side * (STREET.walk / 2 + 0.05), 2.32, zc]} rotation={[0, 0, side * 0.12]} castShadow receiveShadow>
            <boxGeometry args={[STREET.walk + 0.35, 0.07, len]} />
            <meshToonMaterial color="#5e4434" gradientMap={toonRamp} />
          </mesh>
          <InkBox size={[0.12, 0.14, len]} position={[fx - side * (STREET.walk + 0.17), 2.2, zc]} color={b.trim} ink={0.012} />
          {Array.from({ length: Math.max(2, Math.round(len / 2.1) + 1) }, (_, i) => {
            const n = Math.max(2, Math.round(len / 2.1) + 1);
            const pz = b.z0 - 0.15 - (i * (len - 0.3)) / (n - 1);
            return <InkBox key={i} size={[0.11, 2.05, 0.11]} position={[fx - side * (STREET.walk + 0.15), 0.18 + 1.0, pz]} color={b.trim} ink={0.012} />;
          })}
        </>
      )}
    </group>
  );
};

// ---------- street furniture ----------

const Boardwalk: React.FC<{ side: -1 | 1 }> = ({ side }) => {
  const planks = useMemo(() => {
    const t = plankCanvas(40 + side, "#ffffff");
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.rotation = Math.PI / 2;
    t.repeat.set(16, 1);
    return t;
  }, [side]);
  const len = 9 - STREET.end;
  return (
    <InkBox size={[STREET.walk + 0.1, 0.18, 30.5]} position={[side * (STREET.front - STREET.walk / 2), 0.09, 9 - 30.5 / 2]} color="#8a6a4e" map={planks} ink={0.015} key={len} />
  );
};

const HitchRail: React.FC<{ x: number; z: number; len?: number }> = ({ x, z, len = 2.2 }) => (
  <group position={[x, 0, z]}>
    <InkBox size={[0.1, 0.95, 0.1]} position={[0, 0.48, len / 2]} color="#6a4a32" ink={0.012} />
    <InkBox size={[0.1, 0.95, 0.1]} position={[0, 0.48, -len / 2]} color="#6a4a32" ink={0.012} />
    <InkBox size={[0.09, 0.09, len + 0.2]} position={[0, 0.9, 0]} color="#7a5a3e" ink={0.012} />
  </group>
);

const Trough: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <InkBox size={[0.6, 0.5, 1.5]} position={[0, 0.25, 0]} color="#6a5040" ink={0.015} />
    <mesh position={[0, 0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.48, 1.38]} />
      <meshBasicMaterial color="#e89a5a" toneMapped={false} />
    </mesh>
  </group>
);

const Barrel: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#8a5a36" }) => (
  <group position={position}>
    <InkCylinder radius={0.24} height={0.7} position={[0, 0.35, 0]} color={color} ink={0.012} />
    <InkCylinder radius={0.25} height={0.05} position={[0, 0.16, 0]} color="#3a3434" ink={0} />
    <InkCylinder radius={0.25} height={0.05} position={[0, 0.54, 0]} color="#3a3434" ink={0} />
  </group>
);

const WaterTower: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    {[-1, 1].flatMap((a) => [-1, 1].map((b) => <InkBox key={`${a}${b}`} size={[0.18, 5.2, 0.18]} position={[a * 1.0, 2.6, b * 1.0]} rotation={[b * 0.05, 0, -a * 0.05]} color="#4a3428" ink={0.02} />))}
    <InkBox size={[2.3, 0.15, 2.3]} position={[0, 5.2, 0]} color="#4a3428" ink={0.02} />
    <InkCylinder radius={1.25} height={2.0} position={[0, 6.3, 0]} color="#6a4a36" ink={0.025} />
    <mesh position={[0, 7.75, 0]} castShadow>
      <coneGeometry args={[1.45, 0.9, 24]} />
      <meshToonMaterial color="#4a2e24" gradientMap={toonRamp} />
    </mesh>
  </group>
);

const TelegraphLine: React.FC<{ x: number; zs: number[] }> = ({ x, zs }) => {
  const wire = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < zs.length - 1; i++) {
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const z = zs[i] + (zs[i + 1] - zs[i]) * t;
        pts.push(new THREE.Vector3(x, 5.1 - Math.sin(Math.PI * t) * 0.35, z));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [x, zs]);
  return (
    <group>
      {zs.map((z, i) => (
        <group key={i} position={[x, 0, z]}>
          <InkCylinder radius={0.09} height={5.4} position={[0, 2.7, 0]} color="#5a4030" ink={0.015} />
          <InkBox size={[1.2, 0.1, 0.1]} position={[0, 5.15, 0]} color="#5a4030" ink={0.012} />
        </group>
      ))}
      <line>
        <primitive object={wire} attach="geometry" />
        <lineBasicMaterial color="#2a1a18" />
      </line>
    </group>
  );
};

// A tangle of thin dry stems rolled into a ball
export const Tumbleweed: React.FC<{ position: Vec3; size?: number; spin?: number }> = ({ position, size = 0.42, spin = 0 }) => {
  const geo = useMemo(() => {
    const gs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 34; i++) {
      const g = new THREE.TorusGeometry(size * (0.55 + rand(i + 3) * 0.45), 0.012, 4, 28, Math.PI * (1.1 + rand(i) * 0.9));
      g.rotateX(rand(i + 10) * Math.PI);
      g.rotateY(rand(i + 20) * Math.PI);
      g.rotateZ(rand(i + 30) * Math.PI);
      g.translate((rand(i + 40) - 0.5) * size * 0.25, (rand(i + 50) - 0.5) * size * 0.25, (rand(i + 60) - 0.5) * size * 0.25);
      gs.push(g);
    }
    const merged = mergeGeometries(gs);
    gs.forEach((g) => g.dispose());
    return merged;
  }, [size]);
  return (
    <mesh geometry={geo} position={[position[0], position[1] + size * 0.85, position[2]]} rotation={[spin, spin * 0.4, 0]} castShadow>
      <meshToonMaterial color="#a07a4a" gradientMap={toonRamp} />
    </mesh>
  );
};

const mergeGeometries = (gs: THREE.BufferGeometry[]) => {
  let n = 0;
  gs.forEach((g) => (n += (g.index ? g.index.count : g.attributes.position.count)));
  const pos: number[] = [];
  const nor: number[] = [];
  gs.forEach((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.push(...(ng.attributes.position.array as Float32Array));
    nor.push(...(ng.attributes.normal.array as Float32Array));
    if (ng !== g) ng.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return out;
};

// Warm dust hanging in the low sun along the street
const DustHaze: React.FC = () => {
  const glow = useMemo(() => glowCanvas(), []);
  return (
    <group>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[(rand(i + 70) - 0.5) * 4, 0.5 + rand(i + 80) * 0.8, -4 - i * 3.2]}>
          <planeGeometry args={[7 + rand(i) * 4, 1.6 + rand(i + 5)]} />
          <meshBasicMaterial map={glow} color="#ffb070" transparent opacity={0.12 + i * 0.012} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
};

// Motes of dust caught in the sun (small additive specks)
const Motes: React.FC<{ count?: number }> = ({ count = 220 }) => {
  const geo = useMemo(() => {
    const p: number[] = [];
    for (let i = 0; i < count; i++) p.push((rand(i + 300) - 0.5) * 5.5, 0.05 + Math.pow(rand(i + 600), 2) * 2.2, 1.5 - rand(i + 900) * 14);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, [count]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffd8a0" size={0.035} transparent opacity={0.75} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// ---------- the set ----------

const LIGHTS: Record<TownMode, { fog: string; fogNear: number; ambient: [number, string]; hemi: [string, string, number]; key: [number, string]; keyPos: Vec3 }> = {
  sunset: { fog: "#f0a06a", fogNear: 18, ambient: [1.0, "#ffd0b8"], hemi: ["#9a86e0", "#b0603a", 0.55], key: [3.4, "#ffa858"], keyPos: SUN_POS },
  dusk: { fog: "#8a6aa8", fogNear: 16, ambient: [0.8, "#c8b0e8"], hemi: ["#7a6ad8", "#6a4a5a", 0.5], key: [1.3, "#ff9a80"], keyPos: SUN_POS },
  fog: { fog: "#b8c2cc", fogNear: 6, ambient: [1.25, "#e8eef4"], hemi: ["#c8d4e0", "#7a7a80", 0.5], key: [1.0, "#f0f4ff"], keyPos: [-6, 10, 6] },
  day: { fog: "#c8dcec", fogNear: 24, ambient: [1.2, "#ffffff"], hemi: ["#cfe4ff", "#8a7a4a", 0.55], key: [2.6, "#fff2dc"], keyPos: [-8, 12, 6] },
  night: { fog: "#1a2238", fogNear: 12, ambient: [0.42, "#8aa0e0"], hemi: ["#3a5aa8", "#1a1a26", 0.35], key: [1.1, "#a8c0ff"], keyPos: [-8, 10, -22] },
};

export const WesternTownSet: React.FC<{ camera: CameraShot; frame: number; mode?: TownMode; signFallen?: boolean; children?: React.ReactNode }> = ({ camera, mode = "sunset", signFallen = false, children }) => {
  const L = LIGHTS[mode];
  const camX = camera.position[0];
  const dirt = useMemo(() => {
    const t = dirtCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 6);
    return t;
  }, []);
  const glow = useMemo(() => glowCanvas(), []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[L.fog]} />
      <fog attach="fog" args={[L.fog, L.fogNear, 70]} />
      <ambientLight intensity={L.ambient[0]} color={L.ambient[1]} />
      <hemisphereLight args={[L.hemi[0], L.hemi[1], L.hemi[2]]} />
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
        shadow-camera-near={1}
        shadow-camera-far={70}
      />

      <Backdrops camX={camX} mode={mode} />
      {/* the low sun: a hot disc (bloom) with a wide glow round it */}
      <group position={[camX * 0.9 + 6.6, 3.6, -120]} visible={mode === "sunset"}>
        <mesh>
          <circleGeometry args={[2.3, 48]} />
          <meshBasicMaterial color={new THREE.Color(5, 3.6, 2.0)} fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, 0.5]}>
          <planeGeometry args={[34, 34]} />
          <meshBasicMaterial map={glow} color="#ffb060" transparent opacity={0.85} fog={false} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      {/* street and the desert beyond */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -12]} receiveShadow>
        <planeGeometry args={[STREET.front * 2 + 0.2, 44]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={dirt} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -60]} receiveShadow>
        <planeGeometry args={[200, 120]} />
        <meshToonMaterial color={mode === "day" ? "#9aa04a" : "#c0845a"} gradientMap={toonRamp} />
      </mesh>

      <Boardwalk side={-1} />
      <Boardwalk side={1} />
      {LEFT.map((b) => <Building key={b.seed} b={b} side={-1} />)}
      {RIGHT.map((b) => <Building key={b.seed} b={b} side={1} />)}

      <HitchRail x={-STREET.half + 0.15} z={-2.2} />
      <HitchRail x={STREET.half - 0.15} z={-10.5} len={2.6} />
      <Trough x={-STREET.half + 0.15} z={-5.2} />
      <Barrel position={[STREET.front - 0.35, 0.18, 2.0]} />
      <Barrel position={[STREET.front - 0.62, 0.18, 1.6]} color="#7a4a2e" />
      <Barrel position={[-STREET.front + 0.4, 0.18, -9.0]} />
      <WaterTower position={[STREET.front + 2.6, 0, -24.5]} />
      <TelegraphLine x={-STREET.half - 0.1} zs={[8, -2.5, -9, -15.5, -22, -28]} />
      {mode === "sunset" && <DustHaze />}
      {mode !== "night" && <Motes />}
      <ShopSign fallen={signFallen} />
      {children}
    </>
  );
};
