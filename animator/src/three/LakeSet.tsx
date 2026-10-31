import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo } from "./kit";
import { MOODS } from "./moods";
import { haloTexture } from "./surfaces";
import type { PuppetLight } from "../puppet/PuppetBillboard";
import { InkBox, InkCylinder, toonRamp } from "./toon";

// Outdoor location: a mountain lake at dusk. Grass bank in front (y = 0, z > -1.5), the water below it,
// a cabin on the left, a dock running into the lake on the right, a campfire on the bank and layered
// mountain ridges under a sunset sky. Puppets stand on the bank or on the dock (deck top at y = 0).
//
// Layout (metres): cabin x -2.6, campfire `FIRE`, dock x `DOCK.x` from z -1.5 to `DOCK.end`.

type Vec3 = [number, number, number];
const INK = "#161212";

export const FIRE: Vec3 = [-0.45, 0, 1.3];

// A Campfire at `position` as a light for puppets (put it in a Stage `light`'s points): warm, pulsing with the flames.
export const firePoint = (position: Vec3, frame: number) => ({
  position: [position[0], position[1] + 0.45, position[2]] as Vec3,
  color: "#ff9a4a",
  strength: 2.8 * (0.78 + 0.22 * wobble(frame * 0.45, 1)),
  range: 1.1,
});

// How the puppets are lit in this set (Stage `light`): the campfire's warm pulse on the side facing it and a pink
// rim from the sunset behind the lake; the dusk sky itself only hints at purple.
export const lakeLight = (frame: number, fire = true): PuppetLight => ({
  tint: "#8a6ac8",
  shadow: 0.18,
  points: fire ? [firePoint(FIRE, frame)] : [],
  distant: [{ direction: [0.25, 0.25, -1], color: "#ff8aa0", strength: 0.5 }],
});
export const DOCK = { x: 1.2, end: -4.2, width: 0.8 };
const SUN: Vec3 = [1.6, 3.1, -21.5];
const WATER_Y = -0.24;

// Deterministic 0..1 noise so every render of a frame is identical.
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Toon cone with an inverted-hull ink outline; few sides give the faceted pine look.
const InkCone: React.FC<{ radius: number; height: number; position: Vec3; color: string; ink?: number; sides?: number }> = ({
  radius,
  height,
  position,
  color,
  ink = 0.02,
  sides = 7,
}) => (
  <group position={position}>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0, radius, height, sides]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    {ink > 0 && (
      <mesh>
        <cylinderGeometry args={[0, radius + ink, height + ink * 2, sides]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

export const Pine: React.FC<{ position: Vec3; scale?: number; color?: string; ink?: number }> = ({ position, scale = 1, color = "#2f5a4a", ink = 0.02 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.06} height={0.4} position={[0, 0.2, 0]} color="#5a3a2a" ink={ink * 0.5} />
    <InkCone radius={0.5} height={0.8} position={[0, 0.7, 0]} color={color} ink={ink} />
    <InkCone radius={0.4} height={0.7} position={[0, 1.1, 0]} color={color} ink={ink} />
    <InkCone radius={0.28} height={0.6} position={[0, 1.48, 0]} color={color} ink={ink} />
  </group>
);

export const Rock: React.FC<{ position: Vec3; size: number; color?: string; seed?: number }> = ({ position, size, color = "#6b6280", seed = 0 }) => (
  <group position={position} rotation={[rand(seed) * 3, rand(seed + 1) * 3, 0]} scale={[1, 0.6, 1]}>
    <mesh castShadow receiveShadow>
      <dodecahedronGeometry args={[size, 0]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh scale={1.07}>
      <dodecahedronGeometry args={[size, 0]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

// A band of evening haze lying at the foot of a ridge, so the layers separate in depth.
export const Haze: React.FC<{ z: number; color: string }> = ({ z, color }) => {
  const tex = useMemo(
    () =>
      canvasTexture(4, 128, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(1, "rgba(255,255,255,1)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 4, 128);
      }),
    [],
  );
  return (
    <mesh position={[0, WATER_Y + 0.7, z]}>
      <planeGeometry args={[70, 1.6]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={0.55} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
};

// A flat mountain silhouette `width` wide, its base at y = 0; peaks between `low` and `high`. `shift` slides it
// sideways (parallax).
export const Ridge: React.FC<{ z: number; shift?: number; width: number; low: number; high: number; peaks: number; color: string; seed: number; snow?: string }> = ({
  z,
  shift = 0,
  width,
  low,
  high,
  peaks,
  color,
  seed,
  snow,
}) => {
  const { body, caps } = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= peaks * 2; i++) {
      const x = -width / 2 + (width * i) / (peaks * 2) + (rand(seed + i) - 0.5) * (width / peaks / 3);
      const y = i % 2 ? low + (high - low) * (0.45 + 0.55 * rand(seed + i * 7)) : low * (0.5 + 0.5 * rand(seed + i * 3));
      pts.push([x, y]);
    }
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -1);
    pts.forEach(([x, y]) => shape.lineTo(x, y));
    shape.lineTo(width / 2, -1);
    // Snow caps: the top 18 % of each tall peak.
    const capShapes: THREE.Shape[] = [];
    for (let i = 1; i < pts.length - 1; i += 2) {
      const [px, py] = pts[i];
      if (py < low + (high - low) * 0.7) continue;
      const cut = py - (py - Math.min(pts[i - 1][1], pts[i + 1][1])) * 0.18;
      const lerpX = (a: [number, number]) => px + (a[0] - px) * ((py - cut) / (py - a[1]));
      const cap = new THREE.Shape();
      cap.moveTo(lerpX(pts[i - 1]), cut);
      cap.lineTo(px, py);
      cap.lineTo(lerpX(pts[i + 1]), cut);
      cap.lineTo(px + (lerpX(pts[i + 1]) - px) * 0.4, cut - 0.12);
      cap.lineTo(px, cut + 0.05);
      cap.lineTo(px + (lerpX(pts[i - 1]) - px) * 0.5, cut - 0.15);
      capShapes.push(cap);
    }
    return { body: new THREE.ShapeGeometry(shape), caps: capShapes.length ? new THREE.ShapeGeometry(capShapes) : null };
  }, [width, low, high, peaks, seed]);
  return (
    <group position={[shift, WATER_Y, z]}>
      <mesh geometry={body}>
        <meshBasicMaterial color={color} fog={false} toneMapped={false} />
      </mesh>
      {snow && caps && (
        <mesh geometry={caps} position={[0, 0, 0.01]}>
          <meshBasicMaterial color={snow} fog={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

const Cabin: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => {
  // The window glow breathes slightly, like a fire inside.
  const glow = 0.85 + 0.15 * Math.sin(frame * 0.31) * Math.sin(frame * 0.13);
  return (
    <group position={position}>
      <InkBox size={[1.7, 1.2, 1.4]} position={[0, 0.6, 0]} color="#8a5a3a" />
      {/* Log lines across the front */}
      {[0.2, 0.45, 0.7, 0.95].map((y) => (
        <InkBox key={y} size={[1.72, 0.02, 0.02]} position={[0, y, 0.71]} color="#5a3a2a" ink={0} />
      ))}
      {/* Roof: two slabs meeting at the ridge, overhanging the walls */}
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[1.18, 0.1, 1.7]} position={[s * 0.46, 1.48, 0]} rotation={[0, 0, -s * 0.6]} color="#4a2d4f" />
      ))}
      <InkBox size={[0.22, 0.6, 0.22]} position={[0.45, 1.75, -0.25]} color="#6b6280" />
      {/* Door and a warm lit window */}
      <InkBox size={[0.36, 0.72, 0.04]} position={[-0.42, 0.36, 0.71]} color="#4a2a1a" />
      <InkBox size={[0.04, 0.04, 0.03]} position={[-0.3, 0.38, 0.74]} color="#e8b04a" ink={0} />
      <InkBox size={[0.46, 0.38, 0.04]} position={[0.36, 0.66, 0.71]} color="#3a2416" />
      <mesh position={[0.36, 0.66, 0.735]}>
        <planeGeometry args={[0.38, 0.3]} />
        <meshBasicMaterial color="#ffc062" toneMapped={false} />
      </mesh>
      <InkBox size={[0.025, 0.3, 0.02]} position={[0.36, 0.66, 0.745]} color="#3a2416" ink={0} />
      <InkBox size={[0.38, 0.025, 0.02]} position={[0.36, 0.66, 0.745]} color="#3a2416" ink={0} />
      <Halo position={[0.36, 0.66, 0.8]} size={1.1} color="#ffb347" strength={0.55 * glow} />
      <pointLight position={[0.36, 0.7, 1.1]} intensity={2.2 * glow} distance={2.5} color="#ffb347" />
      <SmokePlume position={[0.45, 2.08, -0.25]} world={[position[0] + 0.45, position[2] - 0.25]} frame={frame} size={0.13} rise={1.9} wind={0.75} period={72} puffs={7} />
    </group>
  );
};

// ---------- fire and smoke ----------
// Both are flat cut-outs turned toward the camera (like the puppets), drawn in the same cel style: ink outline,
// flat fills, a lit side and a shade side.

// Smooth -1..1 noise from three sines; each seed gives its own rhythm.
const wobble = (t: number, seed: number) => 0.5 * Math.sin(t * 0.9 + seed) + 0.3 * Math.sin(t * 2.3 + seed * 1.7) + 0.2 * Math.sin(t * 5.1 + seed * 0.3);

// Yaw that turns a cut-out at world (x, z) to face the camera the CameraRig has already placed.
const useYaw = (x: number, z: number) => {
  const camera = useThree((s) => s.camera);
  return Math.atan2(camera.position.x - x, camera.position.z - z);
};

const DISC = new THREE.CircleGeometry(1, 28);

// Flame outline: rounded base at the origin, tip at (tipX, h); `lick` (-1..1) ripples the two sides.
const flameShape = (w: number, h: number, tipX: number, lick: number) => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-w * 0.62, 0, -w * 0.62, h * 0.36, -w * 0.26 + tipX * 0.35 + lick * w * 0.14, h * 0.6);
  s.quadraticCurveTo(tipX * 0.7 - w * 0.14, h * 0.8, tipX, h);
  s.quadraticCurveTo(tipX * 0.7 + w * 0.22 - lick * w * 0.12, h * 0.72, w * 0.3 + tipX * 0.3, h * 0.5);
  s.bezierCurveTo(w * 0.62, h * 0.3, w * 0.62, 0, 0, 0);
  return new THREE.ShapeGeometry(s, 10);
};

const FLAME_COLORS = ["#e8361a", "#ff7a1f", "#ffc23a", "#fff3b8"];
const FLAME_SCALE = [1, 0.74, 0.5, 0.28];

// One tongue of fire: nested colour layers, each stretching, leaning and licking on its own rhythm, under one ink outline.
const Tongue: React.FC<{ x: number; z?: number; w: number; h: number; lean?: number; seed: number; frame: number; layers?: number }> = ({
  x,
  z = 0,
  w,
  h,
  lean = 0,
  seed,
  frame,
  layers = 4,
}) => {
  const parts = useMemo(
    () =>
      FLAME_COLORS.slice(0, layers).map((color, i) => {
        const k = FLAME_SCALE[i];
        const hh = h * k * (0.8 + 0.2 * wobble(frame * 0.45, seed + i * 2.1));
        const ww = w * k * (0.94 + 0.08 * wobble(frame * 0.6, seed + i));
        const tip = lean * hh + w * 0.42 * k * wobble(frame * 0.32, seed + i * 1.3);
        const lick = wobble(frame * 0.7, seed + i * 3);
        return { color, geo: flameShape(ww, hh, tip, lick), ink: i === 0 ? flameShape(ww + 0.036, hh + 0.03, tip, lick) : null };
      }),
    [x, w, h, lean, seed, frame, layers],
  );
  return (
    <group position={[x, 0, z]}>
      {parts[0].ink && (
        <mesh geometry={parts[0].ink} position={[0, -0.014, -0.002]}>
          <meshBasicMaterial color={INK} />
        </mesh>
      )}
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} position={[0, 0.012 * i, 0.001 * i]}>
          <meshBasicMaterial color={p.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// A cartoon smoke puff: overlapping discs with one merged ink outline, a shade side and a lit side.
const Puff: React.FC<{ position: Vec3; rotation: number; size: number; seed: number; light: THREE.Color; shade: THREE.Color }> = ({ position, rotation, size, seed, light, shade }) => {
  const discs = [
    [0, 0, 1],
    [-0.62, -0.18, 0.72],
    [0.6, -0.12, 0.78],
    [0.12, 0.52, 0.66],
  ].map(([x, y, r], k) => [x + (rand(seed + k) - 0.5) * 0.3, y + (rand(seed + k + 4) - 0.5) * 0.3, r * (0.85 + rand(seed + k + 8) * 0.3)]);
  return (
    <group position={position} rotation={[0, 0, rotation]} scale={size}>
      {discs.map(([x, y, r], k) => (
        <mesh key={`i${k}`} geometry={DISC} position={[x, y, 0]} scale={r + 0.1}>
          <meshBasicMaterial color={INK} />
        </mesh>
      ))}
      {discs.map(([x, y, r], k) => (
        <mesh key={`s${k}`} geometry={DISC} position={[x, y, 0.002]} scale={r}>
          <meshBasicMaterial color={shade} />
        </mesh>
      ))}
      {discs.map(([x, y, r], k) => (
        <mesh key={`l${k}`} geometry={DISC} position={[x - r * 0.16, y + r * 0.16, 0.004]} scale={r * 0.78}>
          <meshBasicMaterial color={light} />
        </mesh>
      ))}
    </group>
  );
};

// A rising column of puffs. Each puff is born small at the source, swells, drifts downwind on a curve while it
// turns, lightens as it thins out, and shrinks away at the top. `world` is the source's (x, z) for facing.
export const SmokePlume: React.FC<{
  position: Vec3;
  world: [number, number];
  frame: number;
  size: number;
  rise: number;
  wind: number;
  period: number;
  puffs: number;
  dark?: boolean;
  colors?: [string, string, string, string]; // [light, shade] when born, [light, shade] when old; e.g. road dust
}> = ({ position, world, frame, size, rise, wind, period, puffs, dark, colors }) => {
  const yaw = useYaw(world[0], world[1]);
  const [lightA, shadeA, lightB, shadeB] = (colors ?? (dark ? ["#6e6280", "#463c56", "#b4a6c6", "#857898"] : ["#a89ab8", "#71658a", "#f3eafa", "#bfb0d6"])).map((c) => new THREE.Color(c));
  return (
    <group position={position} rotation={[0, yaw, 0]} userData={{ ghost: true }}>
      {Array.from({ length: puffs }, (_, i) => {
        const clock = frame + (i * period) / puffs;
        const t = (clock % period) / period;
        const sd = i * 13 + Math.floor(clock / period) * 7; // a new shape every cycle
        const grow = Math.min(1, t / 0.22);
        const fade = t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
        const s = size * (0.3 + 0.7 * grow) * (1 + t * 0.9) * fade * (0.8 + rand(sd) * 0.4);
        const x = wind * t ** 1.6 + Math.sin(t * 5 + sd) * size * 0.25;
        return (
          <Puff
            key={i}
            position={[x, rise * t, i * 0.012]}
            rotation={(rand(sd + 1) - 0.5) * 2 + t * (rand(sd + 2) > 0.5 ? 1.2 : -1.2)}
            size={s}
            seed={sd}
            light={lightA.clone().lerp(lightB, t)}
            shade={shadeA.clone().lerp(shadeB, t)}
          />
        );
      })}
    </group>
  );
};

// `smoke` false leaves out the dark smoke over the flames (a fire under a pot, where the pot catches it).
export const Campfire: React.FC<{ position: Vec3; frame: number; smoke?: boolean }> = ({ position, frame, smoke = true }) => {
  // The light follows the main tongue's height, so the glow on faces pumps with the flames.
  const flick = 0.78 + 0.22 * wobble(frame * 0.45, 1);
  const yaw = useYaw(position[0], position[2]);
  const ground = useMemo(() => haloTexture(), []);
  return (
    <group position={position}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        return <Rock key={i} position={[Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3]} size={0.08} color="#7a7090" seed={i * 5} />;
      })}
      {/* Glowing ember bed under the logs */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.25 + i * 1.9);
        return (
          <mesh key={`e${i}`} position={[Math.cos(a) * 0.12, 0.02, Math.sin(a) * 0.12]} scale={[1, 0.45, 1]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshBasicMaterial color={new THREE.Color("#c4260f").lerp(new THREE.Color("#ffb347"), pulse)} toneMapped={false} />
          </mesh>
        );
      })}
      {[0, 1, 2].map((i) => (
        <InkCylinder key={i} radius={0.035} height={0.42} position={[0, 0.06, 0]} rotation={[Math.PI / 2, (i / 3) * Math.PI, 0.25]} color="#4a2e22" ink={0.006} />
      ))}
      <group position={[0, 0.07, 0]} rotation={[0, yaw, 0]} userData={{ ghost: true }}>
        {/* Back tongues lean out to the sides, the main one stands tall, a small one licks in front */}
        <Tongue x={-0.09} z={-0.02} w={0.2} h={0.36} lean={-0.35} seed={4} frame={frame} />
        <Tongue x={0.1} z={-0.02} w={0.19} h={0.42} lean={0.3} seed={9} frame={frame} />
        <Tongue x={0} w={0.3} h={0.56} seed={1} frame={frame} />
        <Tongue x={0.04} z={0.02} w={0.14} h={0.2} lean={0.1} seed={15} frame={frame} layers={3} />
        {/* Licks that break off the tips, rise and burn out from yellow to red */}
        {[0, 1, 2].map((i) => {
          const period = 18 + i * 5;
          const t = ((frame + i * 9) % period) / period;
          const sd = i * 5 + Math.floor((frame + i * 9) / period);
          const k = 1 - t;
          return (
            <Tongue
              key={`l${i}`}
              x={(rand(sd) - 0.5) * 0.14 + Math.sin(t * 6 + i) * 0.02}
              z={0.01}
              w={0.075 * k}
              h={0.13 * k}
              seed={sd}
              frame={frame}
              layers={t < 0.35 ? 3 : t < 0.7 ? 2 : 1}
            />
          );
        })}
        {/* Sparks: each flies up on its own curve, flickers and cools from yellow to red */}
        {Array.from({ length: 8 }, (_, i) => {
          const period = 26 + (i % 3) * 9;
          const clock = frame + i * 7;
          const t = (clock % period) / period;
          const sd = i * 31 + Math.floor(clock / period) * 7;
          const big = rand(sd + 2) > 0.7 ? 1.7 : 1;
          return (
            <mesh
              key={`s${i}`}
              geometry={DISC}
              position={[(rand(sd) - 0.5) * 0.24 + t ** 1.5 * 0.25 + Math.sin(t * 8 + sd) * 0.04, 0.25 + t * (0.8 + rand(sd + 1) * 0.7), 0.03]}
              scale={0.012 * big * (1 - t * 0.6) * ((frame + i) % 4 === 0 ? 0.6 : 1)}
            >
              <meshBasicMaterial color={t < 0.5 ? "#fff1a8" : t < 0.8 ? "#ffa62b" : "#e8361a"} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      {smoke && <SmokePlume position={[0, 0.66, 0]} world={[position[0], position[2]]} frame={frame} size={0.045} rise={0.75} wind={0.18} period={40} puffs={4} dark />}
      {/* Warm light pool on the grass and the glow around the flames */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={ground} color="#ff8a3c" transparent opacity={0.4 * flick} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <Halo position={[0, 0.32, 0.05]} size={1.5} color="#ff8a3c" strength={0.45 * flick} />
      <pointLight position={[0, 0.5, 0.2]} intensity={7.5 * flick} distance={4} color="#ff8a3c" />
    </group>
  );
};

const Dock: React.FC<{ frame: number }> = ({ frame }) => {
  const len = -1.2 - DOCK.end;
  const planks = Math.round(len / 0.2);
  return (
    <group position={[DOCK.x, 0, 0]}>
      {Array.from({ length: planks }, (_, i) => (
        <InkBox key={i} size={[DOCK.width, 0.06, 0.18]} position={[0, -0.03, -1.3 - i * 0.2]} color={i % 3 ? "#a8784a" : "#9a6a3e"} ink={0.004} />
      ))}
      {[-1.6, -2.9, DOCK.end + 0.1].flatMap((z) =>
        [-1, 1].map((s) => <InkCylinder key={`${z}${s}`} radius={0.05} height={0.6} position={[s * (DOCK.width / 2 - 0.02), -0.2, z]} color="#5a3a2a" ink={0.006} />),
      )}
      {/* Lantern on a post at the end of the dock */}
      <InkCylinder radius={0.035} height={0.9} position={[DOCK.width / 2 - 0.02, 0.35, DOCK.end + 0.1]} color="#5a3a2a" ink={0.006} />
      <InkBox size={[0.14, 0.18, 0.14]} position={[DOCK.width / 2 - 0.02, 0.88, DOCK.end + 0.1]} color="#2a1d45" ink={0.006} />
      <mesh position={[DOCK.width / 2 - 0.02, 0.88, DOCK.end + 0.1]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshBasicMaterial color="#ffe3a0" toneMapped={false} />
      </mesh>
      <Halo position={[DOCK.width / 2 - 0.02, 0.88, DOCK.end + 0.15]} size={0.7} color="#ffc062" strength={0.5 + 0.08 * Math.sin(frame * 0.2)} />
      {/* Rowboat tied alongside */}
      <group position={[-DOCK.width / 2 - 0.45, WATER_Y + 0.02 + Math.sin(frame * 0.12) * 0.015, -2.6]} rotation={[0, 0.08, Math.sin(frame * 0.1) * 0.03]}>
        <InkBox size={[0.5, 0.18, 1.3]} position={[0, 0.09, 0]} color="#e0262f" />
        <InkBox size={[0.4, 0.04, 1.18]} position={[0, 0.17, 0]} color="#fff6dc" ink={0} />
        <InkBox size={[0.42, 0.04, 0.1]} position={[0, 0.2, 0.1]} color="#a8784a" ink={0.004} />
      </group>
    </group>
  );
};

export const LakeSet: React.FC<{ camera: CameraShot; frame: number; fire?: boolean }> = ({ camera, frame, fire = true }) => {
  const m = MOODS.dusk;
  const camX = camera.position[0];
  const sky = useMemo(
    () =>
      canvasTexture(512, 1024, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 1024);
        g.addColorStop(0, "#1e1546");
        g.addColorStop(0.35, "#3b2a6b");
        g.addColorStop(0.62, "#c9577a");
        g.addColorStop(0.8, "#ff9a5c");
        g.addColorStop(1, "#ffd08a");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 1024);
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 90; i++) ctx.fillRect(rand(i) * 512, rand(i + 400) * 380, i % 9 ? 2 : 3, i % 9 ? 2 : 3);
        // Flat sunset cloud bands
        for (const [x, y, w, c] of [
          [120, 520, 150, "#e98aa0"],
          [380, 470, 120, "#f2a1a0"],
          [260, 610, 200, "#ffb38a"],
        ] as const) {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.ellipse(x, y, w, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [],
  );
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={["#6a3f7a", 9, 30]} />
      <ambientLight intensity={m.ambient[0]} color={m.ambient[1]} />
      <hemisphereLight args={["#ffb37a", "#2a1d45", 0.7]} />
      <directionalLight
        position={[-3, 5, 4]}
        intensity={m.key[0]}
        color={m.key[1]}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />
      {/* Rim light from the setting sun behind the lake */}
      <directionalLight position={[2, 2, -8]} intensity={1.3} color="#ff9a6a" />

      {/* Sky, sun and mountain ridges, back to front. Parallax: each layer is carried sideways with the camera by
          its own share (`follow` x camera x), so when the camera trucks the sky holds still, the snowy range creeps,
          the middle range slides and the near hills sweep past faster than true perspective at this distance gives. */}
      <group position={[camX, 0, 0]}>
        <mesh position={[0, 7, -23]}>
          <planeGeometry args={[60, 34]} />
          <meshBasicMaterial map={sky} fog={false} toneMapped={false} />
        </mesh>
        <mesh position={SUN}>
          <circleGeometry args={[1.4, 48]} />
          <meshBasicMaterial color="#ffe3a0" fog={false} toneMapped={false} />
        </mesh>
        <Halo position={[SUN[0], SUN[1], SUN[2] + 0.1]} size={7} color="#ffb35c" strength={0.6} />
      </group>
      <Ridge z={-20} shift={camX * 0.55} width={60} low={2.2} high={6.2} peaks={7} color="#7a4a8c" seed={3} snow="#e8c0d8" />
      <Haze z={-18.6} color="#c9577a" />
      <Ridge z={-17} shift={0} width={60} low={1.2} high={3.6} peaks={9} color="#53336f" seed={11} />
      <Haze z={-16.2} color="#9a4a86" />
      <Ridge z={-15.2} shift={-camX * 1.1} width={64} low={0.5} high={1.6} peaks={14} color="#3a2656" seed={23} />

      {/* Far shore with a line of small dark pines */}
      <InkBox size={[60, 0.3, 2]} position={[0, WATER_Y, -14]} color="#2f1f4a" ink={0} />
      {Array.from({ length: 34 }, (_, i) => (
        <Pine key={i} position={[-17 + i + rand(i) * 0.6, WATER_Y + 0.12, -13.6 - rand(i + 50) * 0.6]} scale={0.7 + rand(i + 20) * 0.6} color="#24183c" ink={0} />
      ))}

      {/* The lake: a flat sheet, the sun's glitter path and slow ripple lines */}
      <mesh position={[0, WATER_Y, -8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 16]} />
        <meshToonMaterial color="#4a3a7a" gradientMap={toonRamp} />
      </mesh>
      <group>
        {Array.from({ length: 22 }, (_, i) => {
          const z = -13 + i * 0.5;
          const w = (0.5 + rand(i) * 0.9) * (0.7 + 0.3 * Math.sin(frame * 0.15 + i * 1.7));
          return (
            <mesh key={i} position={[camX + SUN[0] * (1 - i / 30) + Math.sin(frame * 0.05 + i) * 0.08, WATER_Y + 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[w, 0.05]} />
              <meshBasicMaterial color={i % 3 ? "#ffd27a" : "#ffe3a0"} transparent opacity={0.85 - i * 0.025} depthWrite={false} toneMapped={false} />
            </mesh>
          );
        })}
        {Array.from({ length: 16 }, (_, i) => (
          <mesh key={`r${i}`} position={[((rand(i + 70) * 16 + frame * 0.004 * (i % 2 ? 1 : -1)) % 16) - 8, WATER_Y + 0.004, -2 - rand(i + 90) * 10]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.6 + rand(i) * 1.2, 0.03]} />
            <meshBasicMaterial color="#8a78c8" transparent opacity={0.7} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Grass bank: its top is the floor (y = 0), its front edge drops to the water at z = -1.5 */}
      <InkBox size={[40, 0.6, 12]} position={[0, -0.3, 4.5]} color="#4f7a4a" ink={0.01} />
      {[
        [-3.6, -1.45, 0.22],
        [-1.6, -1.5, 0.16],
        [-0.2, -1.42, 0.12],
        [2.2, -1.48, 0.2],
        [3.4, -1.4, 0.26],
      ].map(([x, z, s], i) => (
        <Rock key={i} position={[x, -0.02, z]} size={s} seed={i * 3 + 1} />
      ))}
      {/* Grass tufts */}
      {Array.from({ length: 24 }, (_, i) => {
        const x = -4 + rand(i + 200) * 8;
        const z = -1.2 + rand(i + 300) * 4;
        if (Math.abs(x - FIRE[0]) < 0.6 && Math.abs(z - FIRE[2]) < 0.6) return null;
        if (Math.abs(x - DOCK.x) < 0.5 && z < -0.9) return null;
        return <InkCone key={`g${i}`} radius={0.05} height={0.14 + rand(i) * 0.08} position={[x, 0.07, z]} color="#6f9a5a" ink={0.006} sides={4} />;
      })}

      <Cabin position={[-2.6, 0, -0.4]} frame={frame} />
      <Dock frame={frame} />
      {fire && <Campfire position={FIRE} frame={frame} />}

      {/* Pines framing both sides */}
      <Pine position={[-3.9, 0, -0.9]} scale={1.5} />
      <Pine position={[-1.55, 0, -1.05]} scale={1.15} color="#34604f" />
      <Pine position={[-4.4, 0, 0.8]} scale={1.8} color="#2a5244" />
      <Pine position={[2.5, 0, -1.0]} scale={1.3} />
      <Pine position={[3.3, 0, -0.5]} scale={1.7} color="#2a5244" />
      <Pine position={[4.2, 0, 0.9]} scale={2.0} color="#34604f" />

      {/* Fireflies drifting by the trees */}
      <group userData={{ ghost: true }}>
        {Array.from({ length: 10 }, (_, i) => {
          const side = i % 2 ? 1 : -1;
          const blink = 0.5 + 0.5 * Math.sin(frame * 0.2 + i * 2.1);
          return (
            <mesh key={i} position={[side * (2.2 + rand(i) * 1.6) + Math.sin(frame * 0.03 + i) * 0.3, 0.5 + rand(i + 5) * 1.2 + Math.sin(frame * 0.05 + i * 3) * 0.15, -0.6 + rand(i + 8) * 1.4]}>
              <sphereGeometry args={[0.018, 6, 6]} />
              <meshBasicMaterial color="#e8ff8a" transparent opacity={blink} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    </>
  );
};
