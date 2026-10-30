import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useSignAudit } from "../engine/audit";
import { CameraRig, CameraShot } from "../engine/stage";
import { Mood, MOODS } from "./moods";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import { aoGradient, FloorPattern, haloTexture, lightPoolTexture, surfaceTexture, WallPattern } from "./surfaces";

// Generic set kit: build a new location in a few lines. Units are metres; the floor is y = 0, the
// camera usually looks toward -z. Puppets are 1.3 m tall (head centre at ~0.98 m), seats at ~0.34 m.

type Vec3 = [number, number, number];
const BLOCK_FONT = "Arial Black, Impact, sans-serif";
const INK = "#161212";

// ---------- lighting moods ----------
// Defined in moods.ts (Stage reads them too); pick a different one per location to keep colour varied.

export { moodBackground } from "./moods";
export type { Mood } from "./moods";

// ---------- canvas textures ----------

export const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

// Every number in `text` shown at fraction p (0..1, eased) of its value, keeping its commas and decimals:
// "$600" at p = 0.5 reads "$300". For signs whose figure counts up.
export const countText = (text: string, p: number) => {
  const e = 1 - (1 - Math.min(1, Math.max(0, p))) ** 3;
  return text.replace(/\d[\d,]*(\.\d+)?/g, (m) => {
    const decimals = m.split(".")[1]?.length ?? 0;
    const v = parseFloat(m.replace(/,/g, "")) * e;
    return m.includes(",") ? v.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) : v.toFixed(decimals);
  });
};

// Back-eased pop over 8 frames, flash fading over the 10 after the first two (`appear` = frames since it came on).
const popIn = (appear?: number) => {
  const t = appear === undefined ? 99 : appear;
  const p = Math.min(1, Math.max(0, t / 8));
  return {
    scale: t < 0 ? 0 : 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2,
    flash: t < 0 ? 0 : Math.max(0, 1 - Math.max(0, t - 2) / 10) * 0.75,
  };
};

// A flat label: big readable UPPERCASE text on a coloured card. The core of every "mechanism" prop.
// `appear` = frames since the label came on: it pops in past full size and settles, with a white flash.
// `count` (0..1) counts its numbers up from zero.
export const Label: React.FC<{
  text: string;
  position: Vec3;
  rotation?: Vec3;
  width?: number;
  fg?: string;
  bg?: string;
  border?: boolean;
  appear?: number;
  count?: number;
}> = ({ text: raw, position, rotation = [0, 0, 0], width = 0.6, fg = INK, bg = "#fff6dc", border = true, appear, count }) => {
  const text = count === undefined ? raw : countText(raw, count);
  const lines = text.split("\n");
  const longest = Math.max(...lines.map((l) => l.length));
  const tex = useMemo(
    () =>
      canvasTexture(1024, 256 * lines.length, (ctx) => {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1024, 256 * lines.length);
        if (border) {
          ctx.strokeStyle = INK;
          ctx.lineWidth = 24;
          ctx.strokeRect(12, 12, 1000, 256 * lines.length - 24);
        }
        ctx.fillStyle = fg;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Start from a size that suits the line length, then shrink until the widest line fits the card.
        let size = Math.min(170, Math.floor(1700 / Math.max(6, longest)));
        ctx.font = `900 ${size}px ${BLOCK_FONT}`;
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
        if (widest > 940) size = Math.floor((size * 940) / widest);
        ctx.font = `900 ${size}px ${BLOCK_FONT}`;
        lines.forEach((l, i) => ctx.fillText(l, 512, 256 * i + 140));
      }),
    [text, fg, bg, border, lines.length, longest],
  );
  const { scale, flash } = popIn(appear);
  const size: [number, number] = [width, (width / 4) * lines.length];
  const ref = useRef<THREE.Group>(null);
  useSignAudit(ref, size[0], size[1], raw);
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial map={tex} toneMapped={false} transparent />
      </mesh>
      {flash > 0.01 && (
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={size} />
          <meshBasicMaterial color="#ffffff" transparent opacity={flash} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// ---------- room ----------

// A floor, back wall and optional side walls, lit by a mood, with the camera rig built in.
// Everything else goes in `children`.
export const Room: React.FC<{
  camera: CameraShot;
  mood: Mood;
  floor: string;
  wall: string;
  width?: number;
  depth?: number; // back wall sits at z = -depth / 2
  sideWalls?: boolean;
  stripe?: string; // optional colour band along the wall
  wallPattern?: WallPattern; // default plaster
  floorPattern?: FloorPattern; // default wood
  sun?: { x: number; color?: string; bars?: number }; // window light falling on the floor/wall at x
  children?: React.ReactNode;
}> = ({ camera, mood, floor, wall, width = 8, depth = 6, sideWalls = false, stripe, wallPattern = "plaster", floorPattern = "wood", sun, children }) => {
  const m = MOODS[mood];
  const backZ = -depth / 2;
  const floorTex = surfaceTexture(floorPattern, (width * 3) / 1.2, (depth * 3) / 1.2);
  const wallTex = surfaceTexture(wallPattern, width / 1.6, 2);
  const sideTex = surfaceTexture(wallPattern, depth / 1.6, 2);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={[m.bg, 5, 16]} />
      <ambientLight intensity={m.ambient[0] * 0.85} color={m.ambient[1]} />
      {/* Key light casts the shadows that ground every prop; its shadow box covers the room. */}
      <directionalLight
        position={[-2.5, 5, 4]}
        intensity={m.key[0] * 1.15}
        color={m.key[1]}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-width / 2 - 1}
        shadow-camera-right={width / 2 + 1}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />
      <pointLight position={[0, 2.6, 1.2]} intensity={m.fill[0]} distance={7} color={m.fill[1]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 3, depth * 3]} />
        <meshToonMaterial color={floor} gradientMap={toonRamp} map={floorTex ?? null} />
      </mesh>
      <InkBox size={[width, 3.2, 0.1]} position={[0, 1.6, backZ]} color={wall} ink={0} map={wallTex} />
      {/* Contact shadow where the wall meets the floor */}
      <mesh position={[0, 0.35, backZ + 0.06]}>
        <planeGeometry args={[width, 0.7]} />
        <meshBasicMaterial map={aoGradient()} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.003, backZ + 0.45]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <planeGeometry args={[width, 0.8]} />
        <meshBasicMaterial map={aoGradient()} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {stripe && <InkBox size={[width, 0.18, 0.02]} position={[0, 0.95, backZ + 0.06]} color={stripe} ink={0} />}
      <InkBox size={[width, 0.14, 0.04]} position={[0, 0.07, backZ + 0.07]} color={wall} ink={0.006} />
      {sideWalls && (
        <>
          <InkBox size={[0.1, 3.2, depth]} position={[-width / 2, 1.6, 0]} color={wall} ink={0} map={sideTex} />
          <InkBox size={[0.1, 3.2, depth]} position={[width / 2, 1.6, 0]} color={wall} ink={0} map={sideTex} />
        </>
      )}
      {sun && <LightPool x={sun.x} z={backZ} color={sun.color ?? m.key[1]} bars={sun.bars ?? 6} />}
      {children}
    </>
  );
};

// Window light: a slanted pool of soft bars on the floor plus its continuation up the back wall.
export const LightPool: React.FC<{ x: number; z: number; color?: string; bars?: number; strength?: number }> = ({ x, z, color = "#ffe6a8", bars = 6, strength = 0.35 }) => {
  const tex = lightPoolTexture(bars);
  const mat = (
    <meshBasicMaterial map={tex} color={color} transparent opacity={strength} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  );
  return (
    <group>
      <mesh position={[x + 0.5, 0.006, z + 1.6]} rotation={[-Math.PI / 2, 0, 0.35]}>
        <planeGeometry args={[1.6, 2.6]} />
        {mat}
      </mesh>
      <mesh position={[x, 1.3, z + 0.07]} rotation={[0, 0, 0.12]}>
        <planeGeometry args={[1.4, 1.8]} />
        {mat}
      </mesh>
    </group>
  );
};

// Additive glow behind or around a light source.
export const Halo: React.FC<{ position: Vec3; size: number; color: string; strength?: number }> = ({ position, size, color, strength = 0.5 }) => (
  <mesh position={position}>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial map={haloTexture()} color={color} transparent opacity={strength} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </mesh>
);

// ---------- props ----------

// Door in a wall facing +z; `open` 0..1 swings it inward around its left hinge. Optional sign above.
export const Door: React.FC<{ position: Vec3; open?: number; color?: string; frame?: string; sign?: string; glow?: string }> = ({
  position,
  open = 0,
  color = "#7fb3d5",
  frame = "#ffffff",
  sign,
  glow,
}) => (
  <group position={position}>
    <InkBox size={[1.0, 2.1, 0.08]} position={[0, 1.05, 0]} color={frame} />
    <mesh position={[0, 1.0, 0.045]}>
      <planeGeometry args={[0.84, 1.96]} />
      <meshBasicMaterial color={glow ?? "#1a1a24"} toneMapped={false} />
    </mesh>
    <group position={[-0.42, 0, 0.06]} rotation={[0, open * 1.6, 0]}>
      <InkBox size={[0.84, 1.96, 0.05]} position={[0.42, 0.99, 0]} color={color} />
      <InkCylinder radius={0.03} height={0.05} position={[0.74, 1.0, 0.04]} rotation={[Math.PI / 2, 0, 0]} color="#e8b04a" ink={0.006} />
      <InkBox size={[0.3, 0.4, 0.01]} position={[0.42, 1.55, 0.03]} color="#cfe9ff" ink={0.006} />
    </group>
    {sign && <Label text={sign} position={[0, 2.32, 0.06]} width={0.95} />}
  </group>
);

export const Window: React.FC<{ position: Vec3; size?: [number, number]; sky?: string; blinds?: boolean }> = ({
  position,
  size = [1.2, 1.0],
  sky = "#9fd8ff",
  blinds = false,
}) => (
  <group position={position}>
    <InkBox size={[size[0] + 0.1, size[1] + 0.1, 0.06]} position={[0, 0, 0]} color="#ffffff" />
    <mesh position={[0, 0, 0.035]}>
      <planeGeometry args={size} />
      <meshBasicMaterial color={sky} toneMapped={false} />
    </mesh>
    <InkBox size={[0.04, size[1], 0.04]} position={[0, 0, 0.05]} color="#ffffff" ink={0.004} />
    {blinds &&
      Array.from({ length: 8 }, (_, i) => (
        <InkBox key={i} size={[size[0], 0.03, 0.01]} position={[0, size[1] / 2 - (i + 0.5) * (size[1] / 8), 0.06]} color="#e8e0c8" ink={0} />
      ))}
  </group>
);

export const Desk: React.FC<{ position: Vec3; size?: Vec3; color?: string; rotationY?: number }> = ({
  position,
  size = [1.4, 0.75, 0.7],
  color = "#c99a6b",
  rotationY = 0,
}) => {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkBox size={[w, 0.06, d]} position={[0, h, 0]} color={color} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.06, h, 0.06]} position={[sx * (w / 2 - 0.05), h / 2, sz * (d / 2 - 0.05)]} color="#6b4a2e" ink={0.006} />),
      )}
    </group>
  );
};

// Counter / bar / reception desk: a solid block with a top lip.
export const Counter: React.FC<{ position: Vec3; size?: Vec3; color?: string; top?: string }> = ({
  position,
  size = [2.2, 1.0, 0.6],
  color = "#d95f43",
  top = "#f2e6d0",
}) => (
  <group position={position}>
    <InkBox size={size} position={[0, size[1] / 2, 0]} color={color} />
    <InkBox size={[size[0] + 0.08, 0.05, size[2] + 0.08]} position={[0, size[1] + 0.025, 0]} color={top} />
  </group>
);

export const Chair: React.FC<{ position: Vec3; color?: string; rotationY?: number }> = ({ position, color = "#e04646", rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.42, 0.06, 0.42]} position={[0, 0.34, 0]} color={color} />
    <InkBox size={[0.42, 0.45, 0.05]} position={[0, 0.6, -0.19]} color={color} />
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.04, 0.34, 0.04]} position={[sx * 0.17, 0.17, sz * 0.17]} color="#3a3a3a" ink={0.004} />),
    )}
  </group>
);

// Bookshelf / shelving unit with coloured blocks for books or boxes.
export const Shelf: React.FC<{ position: Vec3; width?: number; rows?: number; color?: string; seed?: number }> = ({
  position,
  width = 1.2,
  rows = 3,
  color = "#8a5a3a",
  seed = 1,
}) => {
  const palette = ["#e04646", "#2a9d8f", "#f2b630", "#4f7dff", "#9b5de5", "#f28482"];
  return (
    <group position={position}>
      <InkBox size={[width, rows * 0.45 + 0.05, 0.32]} position={[0, (rows * 0.45) / 2, 0]} color={color} />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: 6 }, (_, k) => {
          const h = 0.25 + (((k * 7 + r * 3 + seed) % 5) * 0.03);
          return (
            <InkBox
              key={`${r}-${k}`}
              size={[width / 8, h, 0.24]}
              position={[-width / 2 + 0.12 + k * (width / 6.5), r * 0.45 + 0.05 + h / 2, 0.06]}
              color={palette[(k + r + seed) % palette.length]}
              ink={0.006}
            />
          );
        }),
      )}
    </group>
  );
};

export const Lamp: React.FC<{ position: Vec3; on?: boolean; color?: string }> = ({ position, on = true, color = "#ffe6a8" }) => (
  <group position={position}>
    <InkCylinder radius={0.01} height={0.6} position={[0, 0.3, 0]} color={INK} ink={0} />
    <mesh position={[0, -0.02, 0]}>
      <coneGeometry args={[0.22, 0.22, 24, 1, true]} />
      <meshToonMaterial color="#2f6f5e" side={THREE.DoubleSide} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, -0.1, 0]}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshBasicMaterial color={on ? color : "#555"} toneMapped={false} />
    </mesh>
    {on && <pointLight position={[0, -0.3, 0]} intensity={3} distance={3} color={color} />}
    {on && <Halo position={[0, -0.12, 0.02]} size={0.8} color={color} strength={0.55} />}
  </group>
);

export const Plant: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.14} height={0.3} position={[0, 0.15, 0]} color="#c97a3a" />
    <mesh position={[0, 0.52, 0]}>
      <sphereGeometry args={[0.24, 24, 24]} />
      <meshToonMaterial color="#3fae5a" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// Corkboard with pinned cards; `cards` are short labels, laid out in a grid.
export const Board: React.FC<{ position: Vec3; cards: string[]; width?: number; height?: number; color?: string }> = ({
  position,
  cards,
  width = 1.6,
  height = 1.0,
  color = "#c99a6b",
}) => {
  const cols = Math.ceil(Math.sqrt(cards.length * 1.6));
  const rows = Math.ceil(cards.length / cols);
  const cw = width / cols;
  const ch = height / rows;
  return (
    <group position={position}>
      <InkBox size={[width + 0.1, height + 0.1, 0.04]} position={[0, 0, 0]} color={color} />
      {cards.map((c, i) => (
        <Label
          key={i}
          text={c}
          width={cw * 0.85}
          position={[-width / 2 + cw * ((i % cols) + 0.5), height / 2 - ch * (Math.floor(i / cols) + 0.5), 0.03]}
          rotation={[0, 0, (((i * 37) % 7) - 3) * 0.02]}
        />
      ))}
    </group>
  );
};

// A screen (monitor, phone, scoreboard) showing big text; `glow` colours the text.
// `appear` and `count` work as on Label, on the text only (the set stays put).
export const Screen: React.FC<{ position: Vec3; text: string; size?: [number, number]; glow?: string; bg?: string; rotation?: Vec3; appear?: number; count?: number }> = ({
  position,
  text: raw,
  size = [0.8, 0.5],
  glow = "#4dff9a",
  bg = "#0b1a14",
  rotation = [0, 0, 0],
  appear,
  count,
}) => {
  const text = count === undefined ? raw : countText(raw, count);
  const lines = text.split("\n");
  const tex = useMemo(
    () =>
      canvasTexture(1024, Math.round((1024 * size[1]) / size[0]), (ctx) => {
        const h = Math.round((1024 * size[1]) / size[0]);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1024, h);
        ctx.shadowColor = glow;
        ctx.shadowBlur = 20;
        ctx.fillStyle = glow;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const longest = Math.max(...lines.map((l) => l.length));
        let fs = Math.min(h / (lines.length + 0.6), 1700 / Math.max(5, longest));
        ctx.font = `900 ${fs}px ${BLOCK_FONT}`;
        // Shrink until the widest line fits inside the screen.
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
        if (widest > 940) fs = (fs * 940) / widest;
        ctx.font = `900 ${fs}px ${BLOCK_FONT}`;
        lines.forEach((l, i) => ctx.fillText(l, 512, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.1));
      }),
    // size and lines are new arrays every render; depend on their values so the texture is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, glow, bg, size[0], size[1]],
  );
  const { scale, flash } = popIn(appear);
  const ref = useRef<THREE.Group>(null);
  useSignAudit(ref, size[0], size[1], raw);
  return (
    <group ref={ref} position={position} rotation={rotation}>
      <Halo position={[0, 0, -0.03]} size={Math.max(size[0], size[1]) * 2.2} color={glow} strength={0.35} />
      <InkBox size={[size[0] + 0.06, size[1] + 0.06, 0.05]} position={[0, 0, 0]} color="#22262b" />
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={size} />
        <meshBasicMaterial color={bg} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.027]} scale={scale}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {flash > 0.01 && (
        <mesh position={[0, 0, 0.029]}>
          <planeGeometry args={size} />
          <meshBasicMaterial color="#ffffff" transparent opacity={flash} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// A big labelled push button (the classic "mechanism" prop). `press` 0..1 pushes it down.
export const BigButton: React.FC<{ position: Vec3; label: string; color?: string; press?: number }> = ({ position, label, color = "#e0262f", press = 0 }) => (
  <group position={position}>
    <InkBox size={[0.36, 0.1, 0.36]} position={[0, 0.05, 0]} color="#2c3a40" />
    <InkCylinder radius={0.12} height={0.08} position={[0, 0.14 - press * 0.05, 0]} color={color} />
    <Label text={label} position={[0, 0.06, 0.19]} width={0.34} />
  </group>
);

// A lever switch on a panel, labelled; `on` 0..1 flips it.
export const Switch: React.FC<{ position: Vec3; label: string; on?: number }> = ({ position, label, on = 1 }) => (
  <group position={position}>
    <InkBox size={[0.22, 0.32, 0.04]} position={[0, 0, 0]} color="#e6ecf2" />
    <group position={[0, 0, 0.03]} rotation={[(on - 0.5) * 1.2, 0, 0]}>
      <InkBox size={[0.04, 0.14, 0.04]} position={[0, 0.07, 0]} color={on > 0.5 ? "#3ccf6e" : "#e04646"} ink={0.004} />
    </group>
    <Label text={label} position={[0, -0.22, 0.01]} width={0.3} />
  </group>
);

// Scatter of small boxes (stock, files, crates) for filling empty corners.
export const Crates: React.FC<{ position: Vec3; count?: number; color?: string }> = ({ position, count = 3, color = "#c9a26b" }) => (
  <group position={position}>
    {Array.from({ length: count }, (_, i) => (
      <InkBox key={i} size={[0.42, 0.32, 0.36]} position={[(i % 2) * 0.46 - 0.2, 0.16 + Math.floor(i / 2) * 0.32, (i % 3) * 0.05]} color={color} />
    ))}
  </group>
);

// ---------- zodiac ----------

// Zodiac glyphs as stroke paths in a 100 x 100 box (drawn, not typed, so no font is needed).
const ZODIAC_GLYPHS = {
  aries: "M50 90 L50 45 C50 20 35 10 25 15 C12 22 15 42 28 42 M50 45 C50 20 65 10 75 15 C88 22 85 42 72 42",
  taurus: "M28 62 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 M15 15 C20 35 35 40 50 40 C65 40 80 35 85 15",
  gemini: "M20 15 C40 22 60 22 80 15 M20 85 C40 78 60 78 80 85 M38 20 L38 80 M62 20 L62 80",
  cancer: "M85 35 C70 18 35 15 18 35 M20 40 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 M15 65 C30 82 65 85 82 65 M60 60 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0",
  leo: "M22 68 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 M46 68 C46 40 40 25 55 18 C72 10 82 28 70 45 C60 60 62 80 75 85 C82 88 88 82 88 78",
  virgo: "M15 30 L15 75 M15 40 C15 25 35 25 35 40 L35 75 M35 40 C35 25 55 25 55 40 L55 75 C55 90 75 85 80 65 C82 55 70 50 62 62",
  libra: "M15 85 L85 85 M15 68 L35 68 C25 55 30 30 50 30 C70 30 75 55 65 68 L85 68",
  scorpio: "M15 30 L15 75 M15 40 C15 25 35 25 35 40 L35 75 M35 40 C35 25 55 25 55 40 L55 70 C55 82 65 85 78 80 M70 72 L80 80 L72 88",
  sagittarius: "M20 85 L80 20 M50 20 L80 20 L80 50 M35 45 L60 70",
  capricorn: "M15 25 L28 70 L40 30 C45 20 55 25 55 45 L55 70 C55 85 75 88 82 75 C88 62 70 55 62 68 C58 75 50 85 40 88",
  aquarius: "M12 42 L27 30 L42 42 L57 30 L72 42 L87 30 M12 72 L27 60 L42 72 L57 60 L72 72 L87 60",
  pisces: "M20 15 C40 35 40 65 20 85 M80 15 C60 35 60 65 80 85 M25 50 L75 50",
} as const;
export type ZodiacSign = keyof typeof ZODIAC_GLYPHS;

// Round badge with a zodiac glyph, facing +z (a wall emblem, a sticker, a sign logo). `appear` pops it in like Label.
export const ZodiacBadge: React.FC<{ sign: ZodiacSign; position: Vec3; rotation?: Vec3; size?: number; bg?: string; fg?: string; appear?: number }> = ({
  sign,
  position,
  rotation = [0, 0, 0],
  size = 0.6,
  bg = "#e0262f",
  fg = "#ffffff",
  appear,
}) => {
  const tex = useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        ctx.translate(56, 56);
        ctx.scale(4, 4);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const path = new Path2D(ZODIAC_GLYPHS[sign]);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 17;
        ctx.stroke(path);
        ctx.strokeStyle = fg;
        ctx.lineWidth = 10;
        ctx.stroke(path);
      }),
    [sign, fg],
  );
  const { scale, flash } = popIn(appear);
  const ref = useRef<THREE.Group>(null);
  useSignAudit(ref, size, size, sign.toUpperCase() + " LOGO");
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <InkCylinder radius={size / 2} height={0.04} rotation={[Math.PI / 2, 0, 0]} color={bg} ink={0.012} />
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[size * 0.78, size * 0.78]} />
        <meshBasicMaterial map={tex} toneMapped={false} transparent />
      </mesh>
      {flash > 0.01 && (
        <mesh position={[0, 0, 0.024]}>
          <circleGeometry args={[size / 2, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={flash} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};
