import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { canvasTexture, cardTilt, Halo, InkBox, InkCylinder, Label, livenPose, PuppetPlacement, PuppetPose, toonRamp, useShotFrame, useSpeech, Vec3 } from "../../engine";
import { turnToCamera } from "../../puppet/PuppetBillboard";
import { useOwned } from "../../three/BalloonSets";

// Props for "The Real Insect Trapped in Relay 70" (Harvard Computation Laboratory, 9 September 1947; Menlo Park 1878;
// the Smithsonian today). The relays are drawn about 1.5x and the moth about 2x real size (plan.json format_note).
// References: guide/references/harvard-mark-ii-1947.md.

const INK = "#161212";
export const RACK = "#4a5a52";
const RACK_DARK = "#33403a";
const COIL = "#7a2e1e";
const BAKELITE = "#1e1a18";
const STEEL = "#9aa2a8";
const SILVER = "#e4e8ec";
export const HAND = '"Bradley Hand", "Noteworthy", "Marker Felt", "Comic Sans MS", cursive';
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const glow = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);
const sm = (x: number) => {
  const p = Math.max(0, Math.min(1, x));
  return p * p * (3 - 2 * p);
};

export const Ball: React.FC<{ position: Vec3; radius: number; color: string; scale?: Vec3; ink?: number; basic?: number }> = ({ position, radius, color, scale = [1, 1, 1], ink = 0.003, basic }) => (
  <group position={position} scale={scale}>
    <mesh>
      <sphereGeometry args={[radius, 18, 12]} />
      {basic !== undefined ? <meshBasicMaterial color={glow(color, basic)} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
    </mesh>
    {ink > 0 && (
      <mesh>
        <sphereGeometry args={[radius + ink, 18, 12]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

export const Stick: React.FC<{ a: Vec3; b: Vec3; radius: number; color: string; ink?: number }> = ({ a, b, radius, color, ink = 0.003 }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = Math.max(0.001, d.length());
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return <InkCylinder radius={radius} height={len} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[e.x, e.y, e.z]} color={color} ink={ink} />;
};

// ---------- the relay ----------

// How closed relay i is at frame f (0 open, 1 pulled in): each relay clacks in and out on its own uneven rhythm.
export const relayState = (i: number, f: number) => {
  const period = 9 + Math.floor(rnd(i, 1) * 17);
  const t = (f + rnd(i, 2) * 40) / period;
  const n = Math.floor(t);
  const on = rnd(n, i + 3) > 0.45;
  const prev = rnd(n - 1, i + 3) > 0.45;
  const k = sm((t - n) / 0.18);
  return prev === on ? (on ? 1 : 0) : on ? k : 1 - k;
};
// The frames in [a, b) at which relay i pulls in (for its clack).
export const relayCloses = (i: number, a: number, b: number) => {
  const out: number[] = [];
  for (let f = a; f < b; f++) if (relayState(i, f) > 0.5 && relayState(i, f - 1) <= 0.5) out.push(f);
  return out;
};

const GAP = 0.012;
let coilTex: THREE.Texture | null = null;
const coilTexture = () => {
  if (!coilTex)
    coilTex = canvasTexture(256, 64, (ctx) => {
      // copper winding showing at both ends, the middle wrapped in black insulating cloth with a paper tag band
      ctx.fillStyle = "#b8652e";
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = "rgba(70,30,10,0.6)";
      ctx.lineWidth = 3;
      for (let x = 2; x < 256; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 2, 64);
        ctx.stroke();
      }
      ctx.fillStyle = "#2a2624";
      ctx.fillRect(0, 9, 256, 46);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(0, 16, 256, 6);
    });
  return coilTex;
};
// One 1940s telephone-type relay seen from the front: a wound coil on its heel piece, the armature hinged on the
// heel, two leaf springs with silver points at the left. `close` 0..1 lifts the armature, which lifts the lower
// spring until its point meets the upper one. `stop` caps how far the points can close (a moth in between).
export const Relay: React.FC<{ position: Vec3; close: number; stop?: number; plate?: string; scale?: number; coil?: string; plateAppear?: number }> = ({ position, close, stop = 1, plate, scale = 1, coil = COIL, plateAppear }) => {
  const c = Math.min(close, stop);
  const arm = -0.133 * (1 - c); // armature: held up at rest, pulled down onto the core when the coil is on
  const spring = Math.atan((GAP * c) / 0.1); // the upper spring follows it down onto the lower point
  return (
    <group position={position} scale={scale}>
      {/* mounting strap */}
      <InkBox size={[0.13, 0.07, 0.006]} position={[0.005, 0.015, -0.03]} color={RACK_DARK} ink={0.002} />
      {/* coil with its end cheeks and a winding band */}
      <group position={[0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 0.08, 32, 1, true]} />
          <meshToonMaterial map={coilTexture()} color={coil === COIL ? "#ffffff" : coil} gradientMap={toonRamp} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.0215, 0.0215, 0.08, 32, 1, true]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      </group>
      {[-0.032, 0.052].map((x) => (
        <InkCylinder key={x} radius={0.025} height={0.004} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={BAKELITE} ink={0.002} />
      ))}
      <InkCylinder radius={0.008} height={0.01} position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={STEEL} ink={0.002} />
      {/* heel piece */}
      <InkBox size={[0.008, 0.07, 0.03]} position={[0.062, 0.008, 0]} color={STEEL} ink={0.002} />
      {/* armature */}
      <group position={[0.06, 0.03, 0]} rotation={[0, 0, arm]}>
        <InkBox size={[0.1, 0.005, 0.02]} position={[-0.05, 0, 0]} color={STEEL} ink={0.0015} />
        <InkBox size={[0.006, 0.02, 0.022]} position={[-0.1, -0.01, 0]} color={STEEL} ink={0.002} />
      </group>
      {/* spring stack clamp */}
      <InkBox size={[0.03, 0.03, 0.028]} position={[0.05, 0.06, 0]} color={BAKELITE} ink={0.002} />
      <InkCylinder radius={0.004} height={0.034} position={[0.05, 0.06, 0]} color="#c8a040" ink={0.001} />
      {/* lower (fixed) spring and its point */}
      <InkBox size={[0.1, 0.0022, 0.012]} position={[0.0, 0.052, 0]} color={SILVER} ink={0.001} />
      <Ball position={[-0.046, 0.056, 0]} radius={0.0045} color={SILVER} ink={0.0015} />
      {/* upper (moving) spring and its point, pressed down by the armature's pull */}
      <group position={[0.05, 0.072, 0]} rotation={[0, 0, spring]}>
        <InkBox size={[0.1, 0.0022, 0.012]} position={[-0.05, 0, 0]} color={SILVER} ink={0.001} />
        <Ball position={[-0.096, -0.006, 0]} radius={0.0045} color={SILVER} ink={0.0015} />
        <InkCylinder radius={0.003} height={0.02} position={[-0.075, -0.012, 0]} color="#f4f0e4" ink={0.001} />
      </group>
      {/* wires to the back */}
      <InkCylinder radius={0.002} height={0.04} position={[0.07, -0.02, -0.02]} rotation={[0.6, 0, 0]} color="#c84a2a" ink={0} />
      {plate && <Label text={plate} position={[0.01, 0.0, 0.024]} width={0.062} bg="#fff4dc" appear={plateAppear} />}
    </group>
  );
};

// Where the two points of a relay meet, in the relay's own frame (times its scale): the moth sits here.
export const RELAY_POINTS: Vec3 = [-0.046, 0.06, 0.0];

// A steel rack panel with rows x cols relays clacking at their own rhythm. `first` numbers the relays (plates on the
// row `plateRow`), `jam` is the index of the relay whose points are held open, `letter` the panel plate on top.
export const RelayPanel: React.FC<{ position: Vec3; f: number; rows: number; cols: number; first?: number; plateRow?: number; jam?: number; jamStop?: number; letter?: string; scale?: number; seed?: number; letterAppear?: number; plateAppear?: number; still?: number; plateJamOnly?: boolean; jamClose?: number }> = ({
  position,
  f,
  rows,
  cols,
  first = 0,
  plateRow,
  jam,
  jamStop = 0.35,
  letter,
  scale = 1.5,
  seed = 0,
  letterAppear,
  plateAppear,
  still = 0,
  plateJamOnly = false,
  jamClose,
}) => {
  const dx = 0.15 * scale;
  const dy = 0.13 * scale;
  const w = cols * dx + 0.06;
  const h = rows * dy + 0.08 + (letter ? 0.2 : 0);
  return (
    <group position={position}>
      <InkBox size={[w, h, 0.03]} position={[0, -h / 2 + 0.16 + (letter ? 0.2 : 0), -0.06 * scale]} color={RACK} ink={0.006} />
      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const idx = r * cols + c;
          const id = first + idx;
          const x = -((cols - 1) * dx) / 2 + c * dx;
          const y = -r * dy;
          const st = still > 0 ? 0 : relayState(id + seed * 1000, f);
          return <Relay key={idx} position={[x, y, 0]} scale={scale} close={still > 0 ? 0 : jam === idx && jamClose !== undefined ? jamClose : relayState(id + seed * 1000, f)} stop={jam === idx ? jamStop : 1} plate={plateRow === r && (!plateJamOnly || jam === idx) ? `${id}` : undefined} plateAppear={plateAppear} />;
        }),
      )}
      {letter && <Label text={letter} position={[0, 0.25, -0.04 * scale]} width={0.22} bg="#f0e8d0" appear={letterAppear} />}
    </group>
  );
};

// A tall relay rack for the room views: a cabinet whose front is painted rows of relays (cheap), with an optional
// name plate. Its painted relays flicker a little as they clack (two textures swapped).
const rackFront = (seed: number, alt: boolean) =>
  canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = "#4a5a52";
    ctx.fillRect(0, 0, 256, 512);
    for (let r = 0; r < 14; r++) {
      for (let c = 0; c < 5; c++) {
        const x = 16 + c * 46;
        const y = 22 + r * 34;
        const on = rnd(r * 7 + c, seed + (alt ? 9 : 0)) > 0.5;
        ctx.fillStyle = "#2a1a16";
        ctx.fillRect(x, y + 6, 30, 14);
        ctx.fillStyle = "#3a3430";
        ctx.fillRect(x + 4, y + 8, 22, 10);
        ctx.fillStyle = "#a8602e";
        ctx.fillRect(x + 4, y + 8, 3, 10);
        ctx.fillRect(x + 23, y + 8, 3, 10);
        ctx.fillStyle = "#c8ccd0";
        ctx.fillRect(x - 2, on ? y + 2 : y, 34, 3);
        ctx.fillRect(x - 2, y - 4, 34, 2);
      }
    }
    ctx.strokeStyle = "#2a3430";
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 504);
  });
export const Rack: React.FC<{ position: Vec3; f: number; seed?: number; height?: number; width?: number; rotationY?: number; open?: number }> = ({ position, f, seed = 1, height = 1.9, width = 0.62, rotationY = 0, open = 0 }) => {
  const a = useOwned(() => rackFront(seed, false), [seed]);
  const b = useOwned(() => rackFront(seed, true), [seed]);
  const alt = Math.floor(f / (5 + (seed % 4))) % 2 === 1;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkBox size={[width, height, 0.5]} position={[0, height / 2, 0]} color={RACK_DARK} ink={0.01} />
      <mesh position={[0, height / 2 + 0.02, 0.252]}>
        <planeGeometry args={[width - 0.06, height - 0.12]} />
        <meshToonMaterial map={alt ? b : a} gradientMap={toonRamp} />
      </mesh>
      {/* a panel door hinged on its left edge, swung open by `open` */}
      {open > 0 && (
        <group position={[-width / 2, height / 2 + 0.02, 0.27]} rotation={[0, -open * 1.6, 0]}>
          <InkBox size={[width - 0.04, height - 0.12, 0.02]} position={[(width - 0.04) / 2, 0, 0]} color={RACK} ink={0.006} />
        </group>
      )}
    </group>
  );
};

// ---------- the moth ----------

const wingCanvas = (fore: boolean) =>
  canvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.save();
    ctx.beginPath();
    if (fore) {
      ctx.moveTo(8, 128);
      ctx.bezierCurveTo(60, 40, 180, 10, 248, 30);
      ctx.bezierCurveTo(236, 90, 210, 150, 150, 176);
      ctx.bezierCurveTo(90, 196, 40, 170, 8, 140);
    } else {
      ctx.moveTo(8, 140);
      ctx.bezierCurveTo(60, 150, 170, 170, 200, 210);
      ctx.bezierCurveTo(170, 250, 80, 250, 30, 200);
      ctx.bezierCurveTo(14, 180, 8, 160, 8, 140);
    }
    ctx.closePath();
    ctx.fillStyle = fore ? "#8a6a48" : "#a88a64";
    ctx.fill();
    ctx.clip();
    // mottling and two dark bands
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(60,40,24,${0.15 + 0.2 * rnd(i, fore ? 1 : 2)})`;
      ctx.beginPath();
      ctx.arc(30 + rnd(i, 3) * 210, 30 + rnd(i, 4) * 200, 4 + rnd(i, 5) * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    if (fore) {
      ctx.strokeStyle = "rgba(50,32,20,0.7)";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(90, 60);
      ctx.bezierCurveTo(110, 110, 100, 150, 80, 180);
      ctx.moveTo(170, 30);
      ctx.bezierCurveTo(190, 80, 180, 130, 160, 170);
      ctx.stroke();
      ctx.fillStyle = "#3a2618";
      ctx.beginPath();
      ctx.arc(130, 100, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = "#1a120c";
    ctx.lineWidth = 8;
    ctx.beginPath();
    if (fore) {
      ctx.moveTo(8, 128);
      ctx.bezierCurveTo(60, 40, 180, 10, 248, 30);
      ctx.bezierCurveTo(236, 90, 210, 150, 150, 176);
      ctx.bezierCurveTo(90, 196, 40, 170, 8, 140);
    } else {
      ctx.moveTo(8, 140);
      ctx.bezierCurveTo(60, 150, 170, 170, 200, 210);
      ctx.bezierCurveTo(170, 250, 80, 250, 30, 200);
      ctx.bezierCurveTo(14, 180, 8, 160, 8, 140);
    }
    ctx.closePath();
    ctx.stroke();
  });

// A brown moth seen from above: body along +y (head up), wings spread along ±x in its own x-y plane. `flap` 0..1
// folds the wings up toward the viewer (1 = closed over the back); `size` is the wingspan in metres.
export const Moth: React.FC<{ position: Vec3; rotation?: Vec3; flap?: number; size?: number; squash?: number }> = ({ position, rotation = [0, 0, 0], flap = 0, size = 0.09, squash = 0 }) => {
  const fore = useOwned(() => wingCanvas(true));
  const hind = useOwned(() => wingCanvas(false));
  const s = size / 0.09;
  const fold = flap * 1.25;
  return (
    <group position={position} rotation={rotation} scale={[s, s * (1 - 0.25 * squash), s]} userData={{ ghost: true }}>
      {[-1, 1].map((side) => (
        <group key={side} rotation={[0, side * fold, 0]} scale={[side, 1, 1]}>
          <mesh position={[0.024, -0.002, 0.001]} rotation={[0, 0, -0.25]}>
            <planeGeometry args={[0.048, 0.048]} />
            <meshToonMaterial map={fore} transparent alphaTest={0.4} side={THREE.DoubleSide} gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0.018, -0.016, 0.0]} rotation={[0, 0, -0.1]}>
            <planeGeometry args={[0.036, 0.036]} />
            <meshToonMaterial map={hind} transparent alphaTest={0.4} side={THREE.DoubleSide} gradientMap={toonRamp} />
          </mesh>
        </group>
      ))}
      <Ball position={[0, -0.006, 0.004]} radius={0.006} scale={[0.9, 2.4, 0.9]} color="#5a4030" ink={0.0015} />
      <Ball position={[0, 0.011, 0.005]} radius={0.0055} color="#4a3424" ink={0.0015} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Stick a={[sx * 0.002, 0.015, 0.006]} b={[sx * 0.012, 0.03, 0.006]} radius={0.0008} color="#3a2818" ink={0} />
          <Ball position={[sx * 0.0035, 0.0125, 0.009]} radius={0.0016} color="#101010" ink={0} />
        </group>
      ))}
    </group>
  );
};

// ---------- the lab ----------

// A 1940s green enamel desk lamp on an arm; `on` 0..1.
export const DeskLamp: React.FC<{ position: Vec3; rotationY?: number; on?: number }> = ({ position, rotationY = 0, on = 1 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkCylinder radius={0.07} height={0.025} position={[0, 0.012, 0]} color="#2a4a3a" ink={0.004} />
    <Stick a={[0, 0.02, 0]} b={[0.02, 0.3, -0.02]} radius={0.01} color="#2a4a3a" />
    <Stick a={[0.02, 0.3, -0.02]} b={[0.14, 0.34, 0.02]} radius={0.01} color="#2a4a3a" />
    <group position={[0.16, 0.32, 0.03]} rotation={[0, 0, -0.5]}>
      <mesh>
        <coneGeometry args={[0.08, 0.1, 20, 1, true]} />
        <meshToonMaterial color="#2e6a4a" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <Ball position={[0, -0.04, 0]} radius={0.025} color="#fff4d0" ink={0} basic={0.9 + 0.2 * on} />
    </group>
    <pointLight position={[0.2, 0.2, 0.06]} color="#ffd8a0" intensity={1.6 * on} distance={2.2} />
  </group>
);

// A coffee cup on its saucer; `jump` lifts and tips the cup off the saucer.
export const CoffeeCup: React.FC<{ position: Vec3; jump?: number; tilt?: number }> = ({ position, jump = 0, tilt = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.055} height={0.008} position={[0, 0.004, 0]} color="#f4f0e6" ink={0.003} />
    <group position={[0, 0.008 + jump, 0]} rotation={[0, 0, tilt]}>
      <InkCylinder radius={0.032} height={0.06} position={[0, 0.03, 0]} color="#f4f0e6" ink={0.003} />
      <InkCylinder radius={0.028} height={0.004} position={[0, 0.058, 0]} color="#4a2a18" ink={0} />
      <mesh position={[0.04, 0.032, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.013, 0.004, 8, 16]} />
        <meshToonMaterial color="#f4f0e6" gradientMap={toonRamp} />
      </mesh>
    </group>
  </group>
);

// The printing typewriter that types out the results; `lines` are printed numbers, the last one `typed` 0..1 shown.
const printCanvas = (lines: string[], shown: number, red: number) =>
  canvasTexture(256, 320, (ctx) => {
    ctx.fillStyle = "#f6f2e6";
    ctx.fillRect(0, 0, 256, 320);
    ctx.font = "bold 34px Courier New, monospace";
    ctx.textBaseline = "top";
    lines.forEach((l, i) => {
      const text = i === lines.length - 1 ? l.slice(0, Math.round(l.length * shown)) : l;
      ctx.fillStyle = i === lines.length - 1 && red > 0 ? "#c8201a" : "#2a2a30";
      ctx.fillText(text, 18, 300 - (lines.length - i) * 44);
    });
  });
export const Typewriter: React.FC<{ position: Vec3; lines: string[]; typed: number; red?: number; carriage?: number }> = ({ position, lines, typed, red = 0, carriage = 0 }) => {
  const key = `${lines.join("|")}:${Math.round(typed * 20)}:${red > 0}`;
  const tex = useOwned(() => printCanvas(lines, typed, red), [key]);
  return (
    <group position={position}>
      <InkBox size={[0.46, 0.1, 0.32]} position={[0, 0.05, 0]} color="#2a2a2e" ink={0.006} />
      <InkBox size={[0.4, 0.05, 0.12]} position={[0, 0.11, 0.08]} rotation={[-0.3, 0, 0]} color="#3a3a3e" ink={0.004} />
      {/* keys */}
      {[0, 1, 2].flatMap((r) => Array.from({ length: 8 }).map((_, c) => <Ball key={`${r}${c}`} position={[-0.15 + c * 0.043, 0.13 + r * 0.012 - 0.01, 0.13 - r * 0.035]} radius={0.011} color="#f0ece0" ink={0.002} />))}
      {/* carriage and roller */}
      <group position={[carriage * 0.04, 0, 0]}>
        <InkCylinder radius={0.03} height={0.46} position={[0, 0.15, -0.08]} rotation={[0, 0, Math.PI / 2]} color="#1a1a1c" ink={0.004} />
        <mesh position={[0, 0.3, -0.09]} rotation={[-0.1, 0, 0]}>
          <planeGeometry args={[0.24, 0.3]} />
          <meshBasicMaterial map={tex} color="#e8e4d8" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};

// A red indicator lamp on a little bracket; `on` 0..1.
export const RedLamp: React.FC<{ position: Vec3; on: number }> = ({ position, on }) => (
  <group position={position}>
    <InkCylinder radius={0.03} height={0.03} position={[0, 0, -0.01]} rotation={[Math.PI / 2, 0, 0]} color="#2a2a2a" ink={0.003} />
    <Ball position={[0, 0, 0.012]} radius={0.024} color={on > 0.5 ? "#ff4a3a" : "#6a1a14"} ink={0.002} basic={on > 0.5 ? 0.95 : undefined} />
    {on > 0.5 && <pointLight position={[0, 0, 0.15]} color="#ff3020" intensity={2.4} distance={2.4} />}
    {on > 0.5 && <Halo position={[0, 0, 0.0]} size={0.24} color="#ff4030" strength={0.18} />}
  </group>
);

// A steel flashlight, pointing along +y of its group, with a soft additive beam.
export const Flashlight: React.FC<{ position: Vec3; rotation?: Vec3; beam?: number; length?: number }> = ({ position, rotation = [0, 0, 0], beam = 1, length = 1.2 }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkCylinder radius={0.018} height={0.14} position={[0, 0.0, 0]} color="#5a5e64" ink={0.003} />
    <InkCylinder radius={0.027} height={0.04} position={[0, 0.085, 0]} color="#8a8e94" ink={0.003} />
    <Ball position={[0, 0.106, 0]} radius={0.018} color="#fff4c8" ink={0} basic={0.75} />
    {beam > 0 && (
      <mesh position={[0, 0.11 + length / 2, 0]} userData={{ audit: false }}>
        <coneGeometry args={[0.16, length, 24, 1, true]} />
        <meshBasicMaterial color="#fff2c0" transparent opacity={0.02 * beam} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    )}
  </group>
);

// A pair of steel tweezers pointing along -y of its group (the tips at the origin).
export const Tweezers: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    {[-1, 1].map((s) => (
      <Stick key={s} a={[s * 0.002, 0.0, 0]} b={[s * 0.012, 0.12, 0]} radius={0.0035} color="#c8ccd0" ink={0.0015} />
    ))}
  </group>
);

// A pencil pointing along -y (the tip at the origin).
export const Pencil: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkCylinder radius={0.006} height={0.13} position={[0, 0.075, 0]} color="#e8b830" ink={0.0015} />
    <mesh position={[0, 0.005, 0]}>
      <coneGeometry args={[0.006, 0.014, 10]} />
      <meshToonMaterial color="#e8c8a0" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// ---------- the logbook ----------

export type LogLine = { t?: string; text: string; size?: number; shown?: number; x?: number };
// The squared page with its time column; scribble lines stand for the day's other entries (unreadable on purpose).
const pageCanvas = (lines: LogLine[], scribble: number[], tape: boolean) =>
  canvasTexture(768, 1024, (ctx) => {
    ctx.fillStyle = "#f4f0e0";
    ctx.fillRect(0, 0, 768, 1024);
    ctx.strokeStyle = "rgba(120,150,190,0.45)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= 768; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(768, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(200,80,80,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(150, 0);
    ctx.lineTo(150, 1024);
    ctx.stroke();
    // scribbles: wavy pencil strokes, no letters
    ctx.strokeStyle = "rgba(50,50,70,0.55)";
    ctx.lineWidth = 4;
    scribble.forEach((y, i) => {
      ctx.beginPath();
      ctx.moveTo(40, y);
      for (let x = 40; x < 110; x += 6) ctx.lineTo(x, y + Math.sin(x * 0.5 + i) * 5);
      ctx.moveTo(180, y);
      const end = 380 + rnd(i, 7) * 320;
      for (let x = 180; x < end; x += 5) ctx.lineTo(x, y + Math.sin(x * 0.45 + i * 2) * 7 + Math.sin(x * 0.13) * 3);
      ctx.stroke();
    });
    if (tape) {
      ctx.fillStyle = "rgba(220,170,90,0.55)";
      ctx.fillRect(170, 470, 220, 150);
    }
    ctx.fillStyle = "#24242e";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => {
      const y = 380 + i * 0;
      void y;
    });
    lines.forEach((l) => {
      const size = l.size ?? 54;
      ctx.font = `bold ${size}px ${HAND}`;
      const shown = l.shown ?? 1;
      const text = l.text.slice(0, Math.round(l.text.length * shown));
      const [y, x] = [Number(l.t ?? 0), l.x ?? 180];
      ctx.fillText(text, x, y);
    });
  });
// An open logbook lying on a desk (pages up, spine along x... the right page is the one we read). `lines` carry
// their own y on the page in `t` (canvas pixels, 0-1024). Width is the open spread.
export const Logbook: React.FC<{ position: Vec3; rotation?: Vec3; lines: LogLine[]; width?: number; tape?: boolean; scribble?: number[] }> = ({ position, rotation = [-Math.PI / 2, 0, 0], lines, width = 0.5, tape = false, scribble = [90, 150, 210, 270, 330, 390] }) => {
  const key = lines.map((l) => `${l.text}:${Math.round((l.shown ?? 1) * l.text.length)}`).join("|") + tape;
  const tex = useOwned(() => pageCanvas(lines, scribble, tape), [key]);
  const left = useOwned(() => pageCanvas([], [100, 170, 240, 310, 380, 450, 520, 590, 660, 730, 800], false));
  const pw = width / 2;
  const ph = pw * (1024 / 768);
  return (
    <group position={position} rotation={rotation}>
      <InkBox size={[width + 0.03, ph + 0.03, 0.02]} position={[0, 0, -0.012]} color="#2a3a5a" ink={0.004} />
      <mesh position={[pw / 2 + 0.002, 0, 0.0]}>
        <planeGeometry args={[pw, ph]} />
        <meshBasicMaterial map={tex} color="#e8e4d8" />
      </mesh>
      <mesh position={[-pw / 2 - 0.002, 0, 0.0]}>
        <planeGeometry args={[pw, ph]} />
        <meshBasicMaterial map={left} color="#dcd8cc" />
      </mesh>
    </group>
  );
};
// A point on the right page of a Logbook (u, v: canvas pixels 768 x 1024) in the book's own frame.
export const pagePoint = (width: number, u: number, v: number): Vec3 => {
  const pw = width / 2;
  const ph = pw * (1024 / 768);
  return [0.002 + (u / 768) * pw, ph / 2 - (v / 1024) * ph, 0.004];
};

// ---------- the truth room's giant relay ----------

// A 1.6 m cutaway relay on a plinth wired to a battery and a bulb. `close` 0..1 (the armature lifts the spring),
// `stop` caps it (the moth), `lit` 0..1 the bulb, `flow` the frame the current dots run from.
export const GIANT = 6;
export const GiantRelay: React.FC<{ position: Vec3; close: number; stop?: number; lit: number; flow: number; f: number }> = ({ position, close, stop = 1, lit, flow, f }) => {
  const S = GIANT;
  const wire = "#c84a2a";
  const pts: Vec3[] = [
    [0.3, 0.98, 0],
    [0.3, 1.22, 0],
    [0.38, 1.22, 0],
    [0.38, 1.36, 0],
  ];
  const len = pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  const along = (d: number): Vec3 => {
    let r = ((d % len) + len) % len;
    for (let i = 1; i < pts.length; i++) {
      const s2 = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (r <= s2) {
        const t = r / s2;
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, 0.03];
      }
      r -= s2;
    }
    return pts[pts.length - 1];
  };
  return (
    <group position={position}>
      <InkBox size={[0.95, 0.1, 0.45]} position={[0, 0.05, 0]} color="#3a4a8a" ink={0.01} />
      <InkBox size={[0.1, 0.32, 0.1]} position={[0.05, 0.26, -0.05]} color="#3a4a8a" ink={0.008} />
      <Relay position={[0, 0.6, 0]} scale={S} close={close} stop={stop} coil="#c86a3a" />
      {pts.slice(1).map((p, i) => (
        <Stick key={i} a={pts[i]} b={p} radius={0.01} color={wire} ink={0.004} />
      ))}
      <group position={[0.38, 1.47, 0]}>
        <InkCylinder radius={0.04} height={0.08} position={[0, -0.09, 0]} color="#b8a070" ink={0.004} />
        <Ball position={[0, 0.0, 0]} radius={0.075} color={lit > 0.5 ? "#fff0a0" : "#c8ccd0"} ink={0.004} basic={lit > 0.5 ? 0.9 : undefined} />
        {lit > 0.5 && <pointLight position={[0, 0, 0.3]} color="#ffe080" intensity={1.6 * lit} distance={1.2} />}
        {lit > 0.5 && <Halo position={[0, 0, -0.05]} size={0.5} color="#ffe080" strength={0.16 * lit} />}
      </group>
      {lit > 0.5 && Array.from({ length: 6 }).map((_, i) => <Ball key={i} position={along((f - flow) * 0.012 + (i * len) / 6)} radius={0.018} color="#fff4a0" ink={0} basic={0.9} />)}
    </group>
  );
};

// ---------- Menlo Park 1878 and the museum ----------

// A sheet of letter paper on a stand-up desk with a few handwritten words (the visible one is BUGS).
const letterCanvas = (shown: number) =>
  canvasTexture(512, 640, (ctx) => {
    ctx.fillStyle = "#efe4c8";
    ctx.fillRect(0, 0, 512, 640);
    ctx.strokeStyle = "rgba(60,40,30,0.55)";
    ctx.lineWidth = 4;
    for (let r = 0; r < 9; r++) {
      if (r === 4) continue;
      const y = 70 + r * 62;
      ctx.beginPath();
      ctx.moveTo(40, y);
      for (let x = 40; x < 470 - (r % 3) * 40; x += 5) ctx.lineTo(x, y + Math.sin(x * 0.42 + r) * 7);
      ctx.stroke();
    }
    ctx.fillStyle = "#2a1a10";
    ctx.font = `bold 110px ${HAND}`;
    ctx.textBaseline = "middle";
    ctx.fillText('"BUGS"'.slice(0, Math.round(6 * shown)), 110, 318);
  });
export const Letter: React.FC<{ position: Vec3; rotation?: Vec3; shown: number; size?: [number, number] }> = ({ position, rotation = [0, 0, 0], shown, size = [0.3, 0.375] }) => {
  const tex = useOwned(() => letterCanvas(shown), [Math.round(shown * 6)]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} color="#e4dcc8" />
    </mesh>
  );
};

// A grey steel storage cabinet with flat drawers (museum collections).
export const DrawerCabinet: React.FC<{ position: Vec3; width?: number; height?: number; drawers?: number; open?: number }> = ({ position, width = 0.9, height = 1.4, drawers = 8, open = 0 }) => (
  <group position={position}>
    <InkBox size={[width, height, 0.6]} position={[0, height / 2, 0]} color="#a8b4b4" ink={0.008} />
    {Array.from({ length: drawers }).map((_, i) => {
      const y = 0.08 + (i + 0.5) * ((height - 0.12) / drawers);
      const out = i === 2 ? open * 0.3 : 0;
      return (
        <group key={i} position={[0, y, 0.305 + out]}>
          <InkBox size={[width - 0.06, (height - 0.12) / drawers - 0.02, 0.02]} color="#bcc6c6" ink={0.003} />
          <InkBox size={[0.16, 0.025, 0.03]} position={[0, 0, 0.02]} color="#6a7474" ink={0.002} />
        </group>
      );
    })}
  </group>
);

// ---------- costume overlays: 1940s hair rolls and curls, ties ----------

const K = 1.3 / 1060;
const rot = (p: [number, number], deg: number, c: [number, number]): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};
const bodyPoint = (pose: PuppetPose, pt: [number, number]): { p: [number, number]; roll: number } => {
  const air = pose.air ?? 0;
  const bob = pose.bob ?? 0;
  const crouch = Math.max(0, Math.min(1, pose.crouch ?? 0));
  const bend = Math.max(0, Math.min(1, pose.bend ?? 0));
  const slump = pose.slump ?? 0;
  const k = 1 - 0.55 * bend;
  const lean = pose.lean ?? 0;
  let p: [number, number] = [pt[0], pt[1] + slump * 20 + (pt[1] < -280 ? (-280 - pt[1]) * (1 - k) * 0.6 : 0)];
  p = rot(p, lean, [0, -280]);
  p = [p[0], p[1] + bob + crouch * 150 - air];
  return { p, roll: lean };
};

export type Overlay = { tie?: string; rolls?: string; curls?: string; collar?: string; bow?: string; tails?: string };

// Rides on each listed puppet's card (front view, standing): a tie at the neck, 1940s victory rolls on top of the
// hair, or short curls round the face. Uses the same live pose Stage draws, the card's yaw and its lean-back tilt.
export const CostumeOverlays: React.FC<{ cast: PuppetPlacement[]; looks: Record<string, Overlay>; energy?: number }> = ({ cast, looks, energy = 1 }) => {
  const f = useShotFrame();
  const speech = useSpeech();
  const camera = useThree((s) => s.camera);
  return (
    <group userData={{ ghost: true, audit: false }}>
      {cast
        .filter((p) => looks[p.id])
        .map((p) => {
          const o = looks[p.id];
          const said = speech(p.id);
          const pose0 = said === null ? p.pose : { ...p.pose, mouthOpen: said.mouth, viseme: said.viseme };
          const live = livenPose(pose0, p.at, p.id, f, energy, said);
          const [x, z] = live.at;
          const yaw = Math.atan2(camera.position.x - x, camera.position.z - z);
          const pose = turnToCamera(live.pose, yaw);
          if ((pose.lie ?? 0) > 0 || pose.view === "back" || pose.view === "side" || pose.sit || (pose.seat ?? 0) > 0.3) return null;
          const tilt = cardTilt([camera.position.x, camera.position.y, camera.position.z], live.at);
          const neck = bodyPoint(pose, [0, -585]);
          const head = bodyPoint(pose, [0, -800]);
          const ht = ((pose.headTilt ?? 0) + head.roll) * (Math.PI / 180);
          return (
            <group key={p.id} position={[x, 0, z]}>
              <group rotation={[0, yaw, 0]}>
                <group rotation={[-tilt, 0, 0]}>
                  <group position={[neck.p[0] * K, -neck.p[1] * K, 0.04]} rotation={[0, 0, (-neck.roll * Math.PI) / 180]}>
                    {o.collar &&
                      [-1, 1].map((sx) => (
                        <mesh key={sx} position={[sx * 0.04, -0.012, 0.001]} rotation={[0, 0, sx * 0.55]}>
                          <planeGeometry args={[0.05, 0.035]} />
                          <meshToonMaterial color={o.collar} gradientMap={toonRamp} />
                        </mesh>
                      ))}
                    {o.bow && (
                      <group position={[0, -0.022, 0.004]}>
                        {[-1, 1].map((sx) => (
                          <mesh key={sx} position={[sx * 0.022, 0, 0]} rotation={[0, 0, sx > 0 ? Math.PI : 0]}>
                            <circleGeometry args={[0.022, 3]} />
                            <meshBasicMaterial color={o.bow} />
                          </mesh>
                        ))}
                        <mesh>
                          <circleGeometry args={[0.01, 10]} />
                          <meshBasicMaterial color={o.bow} />
                        </mesh>
                      </group>
                    )}
                    {o.tie && (
                      <group position={[0, -0.02, 0.003]}>
                        <mesh position={[0, -0.008, 0]}>
                          <planeGeometry args={[0.03, 0.026]} />
                          <meshBasicMaterial color={o.tie} />
                        </mesh>
                        <mesh position={[0, -0.1, 0]}>
                          <planeGeometry args={[0.026, 0.17]} />
                          <meshBasicMaterial color={o.tie} />
                        </mesh>
                        <mesh position={[0, -0.188, 0]} rotation={[0, 0, Math.PI / 4]}>
                          <planeGeometry args={[0.0185, 0.0185]} />
                          <meshBasicMaterial color={o.tie} />
                        </mesh>
                      </group>
                    )}
                  </group>
                  {o.tails &&
                    (() => {
                      const hip = bodyPoint(pose, [0, -330]);
                      return [-1, 1].map((sx) => (
                        <group key={`t${sx}`} position={[hip.p[0] * K + sx * 0.13, -hip.p[1] * K - 0.1, 0.03]} rotation={[0, 0, sx * 0.08]}>
                          <mesh>
                            <planeGeometry args={[0.1, 0.24]} />
                            <meshBasicMaterial color={INK} />
                          </mesh>
                          <mesh position={[0, 0.004, 0.001]}>
                            <planeGeometry args={[0.086, 0.226]} />
                            <meshToonMaterial color={o.tails} gradientMap={toonRamp} />
                          </mesh>
                        </group>
                      ));
                    })()}
                  {(o.rolls || o.curls) && (
                    <group position={[head.p[0] * K, -head.p[1] * K, 0.05]} rotation={[0, 0, -ht]}>
                      {o.rolls &&
                        [-1, 1].map((sx) => (
                          <group key={sx} position={[sx * 0.075, 0.215, 0]} scale={0.8}>
                            <mesh>
                              <circleGeometry args={[0.05, 24]} />
                              <meshBasicMaterial color={INK} />
                            </mesh>
                            <mesh position={[0, 0, 0.001]}>
                              <circleGeometry args={[0.042, 24]} />
                              <meshToonMaterial color={o.rolls} gradientMap={toonRamp} />
                            </mesh>
                            <mesh position={[sx * -0.008, 0.004, 0.002]}>
                              <ringGeometry args={[0.012, 0.019, 20, 1, 0, Math.PI * 1.4]} />
                              <meshBasicMaterial color={INK} transparent opacity={0.45} />
                            </mesh>
                          </group>
                        ))}
                      {o.curls &&
                        [-0.15, -0.075, 0, 0.075, 0.15].map((cx, i) => (
                          <group key={i} position={[cx, 0.24 - Math.abs(cx) * 0.55, 0]}>
                            <mesh>
                              <circleGeometry args={[0.038, 20]} />
                              <meshBasicMaterial color={INK} />
                            </mesh>
                            <mesh position={[0, 0, 0.001]}>
                              <circleGeometry args={[0.031, 20]} />
                              <meshToonMaterial color={o.curls} gradientMap={toonRamp} />
                            </mesh>
                          </group>
                        ))}
                    </group>
                  )}
                </group>
              </group>
            </group>
          );
        })}
    </group>
  );
};
