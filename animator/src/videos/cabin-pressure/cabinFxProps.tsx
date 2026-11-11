import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CameraShot, canvasTexture, Halo, handWorld, SimBody, Vec3 } from "../../engine";
import { Ball, Cyl, RBox } from "../dog-nose/props";
import { useOwnedTex } from "../dog-nose/sets";
import { CY, wallX } from "./cabin";

// Props and effects for the cabin-pressure shots in cabinFx.tsx, drawn as CabinSet children (cabin.tsx stays
// read-only): the over-wing exit with its seal, the CABIN ALT gauge, the galley trolley, the fog jet, suction
// streaks and haze, the debris drawn for the baked physics (physics.mjs), the chrome stopwatch, dream bokeh and
// sparkles, gold window shafts, masks worn on faces, and scene-fog / light rigs that re-light the cabin per mood.

const FONT = "'Arial Black', Impact, sans-serif";
export const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const glow = (c: string, k: number) => new THREE.Color(c).multiplyScalar(k);
// Sprites cannot be ray-cast without a camera on the raycaster (the stills audit casts without one): opt them out.
const noRay = () => {};

// ---------- the left wall's local frame ----------

// The cabin's left sidewall (x < 0) at height y: its slope, as CabinWindow uses it.
const wallAng = (y: number) => Math.atan2(y - CY, wallX(y));
// A point given in the left wall's frame at (y, z): local x aft (world -z), y up along the wall, z into the cabin.
export const leftWall = (y: number, z: number, [lx, ly, lz]: Vec3): Vec3 => {
  const a = wallAng(y);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [-wallX(y) + lz * c + ly * s, y - lz * s + ly * c, z - lx];
};
// Children built in that frame (a flat face toward +z is flush with the wall at its origin).
export const LeftWallMount: React.FC<{ y: number; z: number; children: React.ReactNode }> = ({ y, z, children }) => (
  <group position={[-wallX(y), y, z]} rotation={[0, 0, -wallAng(y)]}>
    <group rotation={[0, Math.PI / 2, 0]}>{children}</group>
  </group>
);

// The over-wing exit on the left wall, forward of row 0 (physics.mjs mirrors these numbers).
export const DOOR = { y: 0.74, z: 2.35, w: 0.5, h: 0.9 };
const SPLIT = { from: 0.0, to: 0.42 }; // the stretch of the aft seal that tears (local y)
export const CRACK = leftWall(DOOR.y, DOOR.z, [DOOR.w / 2, 0.2, 0.05]); // middle of the split
export const JET_FROM = leftWall(DOOR.y, DOOR.z, [DOOR.w / 2 + 0.01, 0.3, 0.08]); // the fog jets from its upper part
export const GAUGE = { y: 1.13, z: 1.84 }; // on the wall just aft of the exit, at eye height
export const TROLLEY = { x: 0.1, z: 2.5, w: 0.3, h: 0.72, d: 0.52 };

// ---------- painted textures ----------

const doorTex = () =>
  canvasTexture(256, 448, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 448);
    g.addColorStop(0, "#fbf6ec");
    g.addColorStop(1, "#e9dfcc");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 448);
    // finger smudges round the grip and scuffs from shoes at the bottom
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = `rgba(110,95,70,${0.015 + rand(i) * 0.025})`;
      ctx.beginPath();
      ctx.ellipse(70 + rand(i + 3) * 120, i < 12 ? 250 + rand(i + 5) * 40 : 390 + rand(i + 9) * 50, 8 + rand(i + 1) * 18, 4 + rand(i + 2) * 8, rand(i + 4) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(120,105,80,0.18)";
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, 228, 420);
  });

// The view through the exit's window: deep stratosphere blue, the cloud deck far below, the wing's top surface.
const outsideTex = () =>
  canvasTexture(128, 192, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, "#1f4fae");
    g.addColorStop(0.55, "#78aee6");
    g.addColorStop(0.72, "#e6f2ff");
    g.addColorStop(1, "#ffffff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 192);
    ctx.fillStyle = "#d9e3ee";
    ctx.beginPath();
    ctx.moveTo(0, 130);
    ctx.lineTo(128, 112);
    ctx.lineTo(128, 192);
    ctx.lineTo(0, 192);
    ctx.fill();
    ctx.fillStyle = "#9eacbd";
    ctx.fillRect(0, 128, 128, 4);
  });

const signTex = (text: string, fg: string, bg: string, w = 256, h = 96) =>
  canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = `900 ${Math.round(h * 0.68)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 3);
  });

// CABIN ALT dial: 0-25 (thousand feet) over 270 degrees, amber band from 10, red from 14.
export const GAUGE_MAX = 25;
const gaugeAngle = (v: number) => ((-135 + (v / GAUGE_MAX) * 270) * Math.PI) / 180; // from straight up, clockwise
const gaugeTex = () =>
  canvasTexture(512, 512, (ctx) => {
    const c = 256;
    ctx.fillStyle = "#fbfbf7";
    ctx.beginPath();
    ctx.arc(c, c, 252, 0, Math.PI * 2);
    ctx.fill();
    const arc = (a: number, b: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.arc(c, c, 214, gaugeAngle(a) - Math.PI / 2, gaugeAngle(b) - Math.PI / 2);
      ctx.stroke();
    };
    arc(0, 10, "#4bb05a");
    arc(10, 14, "#f2b233");
    arc(14, GAUGE_MAX, "#e0362c");
    ctx.strokeStyle = "#1b1b20";
    for (let v = 0; v <= GAUGE_MAX; v++) {
      const a = gaugeAngle(v) - Math.PI / 2;
      const major = v % 5 === 0;
      ctx.lineWidth = major ? 10 : 5;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * (major ? 196 : 206), c + Math.sin(a) * (major ? 196 : 206));
      ctx.lineTo(c + Math.cos(a) * 240, c + Math.sin(a) * 240);
      ctx.stroke();
      if (major && v > 0 && v < GAUGE_MAX) {
        ctx.fillStyle = "#1b1b20";
        ctx.font = `900 46px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(v), c + Math.cos(a) * 156, c + Math.sin(a) * 156);
      }
    }
    ctx.fillStyle = "#1b1b20";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 50px ${FONT}`;
    ctx.fillText("CABIN ALT", c, c + 92);
    ctx.font = `900 30px ${FONT}`;
    ctx.fillStyle = "#555";
    ctx.fillText("x1000 FT", c, c + 146);
  });

// ---------- the over-wing exit ----------

const SEAL = "#33363d";

// One seal bead along local y from y0 to y1 (a soft dark rubber tube).
const Bead: React.FC<{ x: number; y0: number; y1: number; z: number }> = ({ x, y0, y1, z }) => <Cyl r={0.012} h={Math.abs(y1 - y0)} position={[x, (y0 + y1) / 2, z]} color={SEAL} rough={0.5} seg={10} />;

// The exit: a cream lining frame, the plug door (window with the wing outside, the red PULL flap, a grip), the seal
// bead round it, and the EXIT sign above. `crack` = frames since the seal split (negative: intact): the aft bead
// tears into two flaps that flutter in the outflow, a cold slit of daylight shows in the gap, frost creeps round it,
// and the door shudders.
export const ExitDoor: React.FC<{ f: number; crack: number }> = ({ f, crack }) => {
  const door = useOwnedTex(doorTex);
  const outside = useOwnedTex(outsideTex);
  const pull = useOwnedTex(() => signTex("PULL", "#ffffff", "#c62f28", 192, 72));
  const exit = useOwnedTex(() => signTex("EXIT", "#d42a22", "#fff9ef"));
  const { w, h } = DOOR;
  const torn = crack >= 0;
  const open = torn ? smooth(crack / 3) : 0;
  const shudder = torn ? Math.exp(-crack / 9) * 0.004 : 0;
  // the torn bead's two flaps lift into the cabin and flap in the rush
  const peel = open * (0.75 + 0.22 * Math.sin(f * 1.9) + 0.12 * Math.sin(f * 3.3 + 1));
  const flapLen = (SPLIT.to - SPLIT.from) / 2;
  const ax = w / 2 + 0.004; // the aft seal line
  return (
    <group>
      <LeftWallMount y={DOOR.y} z={DOOR.z}>
        {/* the lining frame round the opening, deep enough to meet the curved wall everywhere */}
        <RBox size={[w + 0.2, 0.09, 0.17]} position={[0, h / 2 + 0.045, 0]} color="#ddd2bf" radius={0.03} />
        <RBox size={[w + 0.2, 0.09, 0.17]} position={[0, -h / 2 - 0.045, 0]} color="#ddd2bf" radius={0.03} />
        <RBox size={[0.1, h + 0.18, 0.17]} position={[-(w / 2 + 0.05), 0, 0]} color="#ddd2bf" radius={0.03} />
        <RBox size={[0.1, h + 0.18, 0.17]} position={[w / 2 + 0.05, 0, 0]} color="#ddd2bf" radius={0.03} />
        {/* a dark reveal behind the bead, so the gap reads as a gap */}
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[w + 0.02, h + 0.02]} />
          <meshBasicMaterial color="#20232a" />
        </mesh>
        {/* the plug door */}
        <group position={[Math.sin(f * 2.7) * shudder, Math.sin(f * 3.4 + 1) * shudder, 0]}>
          <RBox size={[w - 0.012, h - 0.012, 0.12]} color="#f4ecdc" map={door} radius={0.06} />
          <RBox size={[0.24, 0.32, 0.03]} position={[0, 0.16, 0.068]} color="#e6e0d4" radius={0.1} />
          <mesh position={[0, 0.16, 0.0845]}>
            <planeGeometry args={[0.165, 0.235]} />
            <meshBasicMaterial map={outside} color={glow("#ffffff", 1.05)} toneMapped={false} />
          </mesh>
          <RBox size={[0.17, 0.06, 0.03]} position={[0, h / 2 - 0.085, 0.07]} color="#c62f28" radius={0.015} />
          <mesh position={[0, h / 2 - 0.085, 0.0857]}>
            <planeGeometry args={[0.13, 0.045]} />
            <meshBasicMaterial map={pull} toneMapped={false} />
          </mesh>
          <RBox size={[0.2, 0.045, 0.05]} position={[0, -0.13, 0.08]} color="#cfc7b8" radius={0.02} />
        </group>
        {/* the seal bead: top, bottom, fore side whole; the aft side whole below and above the split */}
        <group rotation={[0, 0, Math.PI / 2]}>
          <Bead x={h / 2 + 0.004} y0={-w / 2} y1={w / 2} z={0.045} />
          <Bead x={-h / 2 - 0.004} y0={-w / 2} y1={w / 2} z={0.045} />
        </group>
        <Bead x={-ax} y0={-h / 2} y1={h / 2} z={0.045} />
        <Bead x={ax} y0={-h / 2} y1={SPLIT.from} z={0.045} />
        <Bead x={ax} y0={SPLIT.to} y1={h / 2} z={0.045} />
        {/* the split stretch: whole before the crack, two flaps after */}
        {!torn ? (
          <Bead x={ax} y0={SPLIT.from} y1={SPLIT.to} z={0.045} />
        ) : (
          <>
            <group position={[ax, SPLIT.from, 0.045]} rotation={[peel, 0, -0.25 * open]}>
              <Cyl r={0.012} h={flapLen} position={[0, flapLen / 2, 0]} color={SEAL} rough={0.5} seg={10} />
            </group>
            <group position={[ax, SPLIT.to, 0.045]} rotation={[-peel * 0.85, 0, 0.3 * open]}>
              <Cyl r={0.012} h={flapLen} position={[0, -flapLen / 2, 0]} color={SEAL} rough={0.5} seg={10} />
            </group>
            {/* the cold slit of daylight in the gap, flickering with the rush */}
            <mesh position={[ax, (SPLIT.from + SPLIT.to) / 2, 0.036]}>
              <planeGeometry args={[0.022 * open * (0.8 + 0.2 * Math.sin(f * 2.3)), SPLIT.to - SPLIT.from - 0.02]} />
              <meshBasicMaterial color={glow("#dcefff", 1.25)} toneMapped={false} />
            </mesh>
            <Frost t={crack} />
          </>
        )}
      </LeftWallMount>
      {/* the lit EXIT sign on the wall above the exit */}
      <LeftWallMount y={1.29} z={DOOR.z}>
        <RBox size={[0.27, 0.1, 0.06]} position={[0, 0, 0.0]} color="#f3efe6" radius={0.025} />
        <mesh position={[0, 0, 0.031]}>
          <planeGeometry args={[0.235, 0.075]} />
          <meshBasicMaterial map={exit} color={glow("#ffffff", 1.2)} toneMapped={false} />
        </mesh>
        <Halo position={[0, 0, 0.05]} size={0.42} color="#ff9a8a" strength={0.25} />
      </LeftWallMount>
    </group>
  );
};

// Frost crystals growing on the door and frame round the split (white flecks appearing one by one).
const Frost: React.FC<{ t: number }> = ({ t }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: 34 }, (_, i) => {
      const born = 2 + i * 1.6;
      if (t < born) return null;
      const k = smooth((t - born) / 6);
      const side = rand(i) > 0.5 ? 1 : -1;
      const x = DOOR.w / 2 + side * (0.012 + rand(i + 5) * 0.05);
      const y = SPLIT.from - 0.04 + rand(i + 9) * (SPLIT.to - SPLIT.from + 0.08);
      return <Ball key={i} position={[x, y, side > 0 ? 0.088 : 0.062]} radius={(0.004 + rand(i + 3) * 0.006) * k} color={glow("#ffffff", 1.1).getStyle()} glow />;
    })}
  </group>
);

// The CABIN ALT gauge on the wall aft of the exit: a dark bezel, the painted dial and a red needle at `value`
// (thousand feet), with a little jitter once it is climbing.
export const CabinAltGauge: React.FC<{ value: number; f: number }> = ({ value, f }) => {
  const face = useOwnedTex(gaugeTex);
  const a = gaugeAngle(value + Math.sin(f * 1.7) * 0.06);
  const R0 = 0.125;
  return (
    <LeftWallMount y={GAUGE.y} z={GAUGE.z}>
      <RBox size={[0.31, 0.31, 0.06]} position={[0, 0, 0]} color="#d8d1c3" radius={0.045} />
      <Cyl r={R0 + 0.014} h={0.04} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.035]} color="#3c424e" rough={0.4} />
      <mesh position={[0, 0, 0.0555]}>
        <circleGeometry args={[R0, 48]} />
        <meshBasicMaterial map={face} color={glow("#ffffff", 0.97)} toneMapped={false} />
      </mesh>
      <group position={[0, 0, 0.058]} rotation={[0, 0, -a]}>
        <mesh position={[0, R0 * 0.36, 0]}>
          <planeGeometry args={[0.011, R0 * 0.92]} />
          <meshBasicMaterial color="#e3261c" />
        </mesh>
      </group>
      <Ball position={[0, 0, 0.06]} radius={0.012} color="#222630" ink={0} />
      {/* glass catching the light */}
      <mesh position={[-0.03, 0.045, 0.061]} rotation={[0, 0, 0.6]}>
        <planeGeometry args={[0.02, 0.07]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </LeftWallMount>
  );
};

// ---------- the galley trolley ----------

export const Trolley: React.FC<{ f: number; rattle?: number }> = ({ f, rattle = 0 }) => {
  const { x, z, w, h, d } = TROLLEY;
  const j = (k: number) => Math.sin(f * 2.3 + k) * 0.004 * rattle;
  return (
    <group position={[x, 0, z]}>
      <RBox size={[w, h - 0.06, d]} position={[0, (h - 0.06) / 2 + 0.03, 0]} color="#c9ced6" radius={0.035} rough={0.45} />
      {/* door seam, latch and a red stripe along the side */}
      <RBox size={[0.006, h - 0.16, d - 0.06]} position={[w / 2 + 0.002, h / 2, 0]} color="#9ea6b2" radius={0.002} />
      <RBox size={[0.02, 0.05, 0.08]} position={[w / 2 + 0.01, h * 0.62, 0.15]} color="#6d7480" radius={0.01} />
      <RBox size={[w + 0.004, 0.035, d + 0.004]} position={[0, h * 0.42, 0]} color="#b8352b" radius={0.012} />
      <RBox size={[w + 0.02, 0.03, d + 0.02]} position={[0, h - 0.015, 0]} color="#8f97a3" radius={0.012} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.03} h={0.025} rotation={[0, 0, Math.PI / 2]} position={[sx * (w / 2 - 0.05), 0.03, sz * (d / 2 - 0.06)]} color="#2c2f36" />))}
      {/* what stays on top: a stack of cups and a coffee pot at the fore end */}
      <group position={[0.07 + j(1), h, 0.21]}>
        {[0, 1, 2, 3, 4].map((k) => (
          <Cyl key={k} r={0.036} r2={0.038} h={0.03} position={[0, 0.016 + k * 0.022, 0]} color={k % 2 ? "#f6f6f2" : "#eef0f2"} />
        ))}
      </group>
      <group position={[-0.07 + j(2), h, 0.215]}>
        <Cyl r={0.05} r2={0.045} h={0.13} position={[0, 0.065, 0]} color="#d9dde3" rough={0.3} />
        <Cyl r={0.03} r2={0.03} h={0.03} position={[0, 0.145, 0]} color="#1f1f24" />
        <RBox size={[0.012, 0.07, 0.035]} position={[0.055, 0.075, 0]} color="#1f1f24" radius={0.005} />
      </group>
    </group>
  );
};

// ---------- debris drawn for the baked bodies ----------

// A soft paper sheet in the xz plane, size s, its surface waving by `wave(u, v)` (metres, along y).
const Sheet: React.FC<{ s: number; wave: (u: number, v: number) => number; color?: string }> = ({ s, wave, color = "#fbfaf4" }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(s, s, 6, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, wave(p.getX(i) / s + 0.5, p.getY(i) / s + 0.5));
    g.computeVertexNormals();
    return g;
  }, [s, wave]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
};

const PaperCup: React.FC = () => (
  <group>
    <Cyl r={0.027} r2={0.036} h={0.09} color="#ffffff" />
    <Cyl r={0.0315} r2={0.0335} h={0.026} position={[0, 0.006, 0]} color="#2f6fd8" />
    <mesh position={[0, 0.0455, 0]}>
      <torusGeometry args={[0.036, 0.003, 6, 24]} />
      <meshStandardMaterial color="#f2f2ee" />
    </mesh>
  </group>
);

const Peanut: React.FC<{ seed: number }> = ({ seed }) => (
  <group rotation={[0, 0, (rand(seed) - 0.5) * 0.4]}>
    <Ball position={[-0.009, 0, 0]} radius={0.011} color="#c99a5b" ink={0} />
    <Ball position={[0.009, 0, 0]} radius={0.0105} color="#d1a466" ink={0} />
  </group>
);

// Draws each doorSeal body as its prop (Simulation's `draw`).
export const drawDebris = (body: SimBody, f: number): React.ReactNode => {
  if (body.name.startsWith("napkin")) {
    const k = Number(body.name.slice(-1));
    return <Sheet s={0.12} wave={(u, v) => 0.01 * Math.sin(u * 4 + k) * Math.cos(v * 3) + 0.006 * Math.sin((u + v) * 9 + f * 0.6 + k)} />;
  }
  if (body.name === "cup") return <PaperCup />;
  if (body.name === "packet")
    return (
      <group>
        <RBox size={[0.07, 0.014, 0.1]} color="#d8452f" radius={0.006} />
        <RBox size={[0.05, 0.002, 0.04]} position={[0, 0.008, 0]} color="#ffd23f" radius={0.001} />
      </group>
    );
  return <Peanut seed={Number(body.name.replace(/\D/g, ""))} />;
};

// The napkin that sticks: it lifts off the trolley with the others, tumbles across and slaps flat over the lower
// half of the split, where the suction holds it while its free edges flap.
export const HeroNapkin: React.FC<{ t: number; f: number }> = ({ t, f }) => {
  const land = 14;
  const start: Vec3 = [TROLLEY.x - 0.08, TROLLEY.h + 0.03, TROLLEY.z - 0.18];
  const spot = leftWall(DOOR.y, DOOR.z, [DOOR.w / 2 - 0.01, 0.1, 0.075]);
  const p = smooth(t / land);
  const lift = Math.sin(Math.min(1, t / land) * Math.PI) * 0.22;
  const pos: Vec3 = t < 0 ? start : [start[0] + (spot[0] - start[0]) * p, start[1] + (spot[1] - start[1]) * p + lift, start[2] + (spot[2] - start[2]) * p];
  const flying = t >= 0 && t < land;
  // on the door: flat to the wall (its normal along the door's), edges flapping into the cabin
  const a = wallAng(DOOR.y);
  const stuck = t >= land;
  const wave = useMemo(
    () => (u: number, v: number) => (stuck ? 0.03 * Math.max(0, Math.abs(u - 0.5) * 2 - 0.3) * Math.sin(f * 1.6 + v * 5) + 0.012 * Math.sin(f * 2.4 + u * 7) : 0.015 * Math.sin(u * 5 + f * 0.9)),
    [stuck, f],
  );
  if (t < 0) return null;
  return (
    <group position={pos} rotation={flying ? [t * 0.5, t * 0.35, t * 0.22] : [0, 0, -a]}>
      <group rotation={flying ? [0, 0, 0] : [0, 0, -Math.PI / 2]}>
        <Sheet s={0.13} wave={wave} />
      </group>
    </group>
  );
};

// ---------- fog: the jet, suction streaks, haze, the scene fog ----------

const softRamp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([168, 212, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const basis = (d: THREE.Vector3) => {
  const e1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
  const e2 = new THREE.Vector3().crossVectors(d, e1).normalize();
  return [e1, e2];
};

// A hard jet of condensation fog from `from` along `dir`: cel-shaded puffs (four lobes each, in one instanced mesh)
// born at `rate` per frame, shot out fast, slowed by the air, curling round the jet's axis, swelling, turning and
// greying as they age, then shrinking away. `t` = frames since the jet started; `power` 0..1 scales speed and birth.
export const FogJet: React.FC<{ from: Vec3; dir: Vec3; t: number; frames: number; rate?: number; speed?: number; size?: number; life?: number; drag?: number; drift?: Vec3; power?: (t: number) => number; seed?: number }> = ({
  from,
  dir,
  t,
  frames,
  rate = 2.2,
  speed = 3.6,
  size = 0.07,
  life = 42,
  drag = 3.2,
  drift = [0.18, 0.12, 0.1],
  power = () => 1,
  seed = 1,
}) => {
  const n = Math.ceil(frames * rate);
  const LOBES = 4;
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshToonMaterial({ gradientMap: softRamp, emissive: new THREE.Color("#7f98ba"), emissiveIntensity: 0.1 }), n * LOBES);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    for (let i = 0; i < n * LOBES; i++) m.setColorAt(i, new THREE.Color("#ffffff"));
    return m;
  }, [n]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  const d = new THREE.Vector3(...dir).normalize();
  const [e1, e2] = basis(d);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  const young = new THREE.Color("#e2eaf4");
  const old = new THREE.Color("#a8bad0");
  const k = drag; // 1/s: how fast the air takes the birth speed away
  for (let i = 0; i < n; i++) {
    const sd = seed * 1000 + i * 7;
    const birth = i / rate + rand(sd) * 0.4;
    const age = (t - birth) / (life * (0.8 + rand(sd + 1) * 0.4));
    const pw = power(birth);
    const hide = age < 0 || age > 1 || pw <= 0.02;
    const ts = Math.max(0, (t - birth) / 30);
    const spread = 0.28 + rand(sd + 2) * 0.22;
    const ang = rand(sd + 3) * Math.PI * 2;
    const v0 = d.clone().multiplyScalar(speed * pw * (0.75 + rand(sd + 4) * 0.5));
    v0.addScaledVector(e1, Math.cos(ang) * spread * speed * pw).addScaledVector(e2, Math.sin(ang) * spread * speed * pw);
    const e = (1 - Math.exp(-k * ts)) / k;
    const curlR = 0.09 * (1 - Math.exp(-2 * ts)) * (0.5 + rand(sd + 5));
    const curlA = ang + ts * (2.4 + rand(sd + 6) * 1.6) * (rand(sd + 7) > 0.5 ? 1 : -1);
    const p = new THREE.Vector3(...from)
      .addScaledVector(v0, e)
      .add(new THREE.Vector3(...drift).multiplyScalar(ts))
      .addScaledVector(e1, Math.cos(curlA) * curlR)
      .addScaledVector(e2, Math.sin(curlA) * curlR);
    const grow = 0.35 + 1.5 * (1 - Math.exp(-3 * ts)) + ts * 0.4;
    const s = hide ? 0 : size * grow * (1 - smooth((age - 0.68) / 0.32)) * (0.75 + rand(sd + 8) * 0.5) * (0.5 + 0.5 * pw);
    const spin = ts * (1.5 + rand(sd + 9) * 2.5);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(spin + rand(sd + 10) * 6, spin * 0.7 + rand(sd + 11) * 6, rand(sd + 12) * 6));
    c.copy(young).lerp(old, Math.min(1, Math.max(0, age * 1.2)));
    for (let l = 0; l < LOBES; l++) {
      const off = new THREE.Vector3(rand(sd + 20 + l) - 0.5, (rand(sd + 30 + l) - 0.5) * 0.8, rand(sd + 40 + l) - 0.5).multiplyScalar(l === 0 ? 0 : 1.15 * s).applyQuaternion(q);
      o.position.copy(p).add(off);
      o.quaternion.copy(q);
      o.scale.setScalar(s * (l === 0 ? 1 : 0.6 + rand(sd + 50 + l) * 0.3));
      o.updateMatrix();
      mesh.setMatrixAt(i * LOBES + l, o.matrix);
      mesh.setColorAt(i * LOBES + l, c);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return (
    <group userData={{ ghost: true }}>
      <primitive object={mesh} />
    </group>
  );
};

// Air rushing into the split: thin bright streaks racing in from the cabin side and vanishing into the gap.
// `dirs` keeps them on the open side (z >= -0.15 relative to the crack: none come past the passengers' faces).
export const SuctionStreaks: React.FC<{ to: Vec3; t: number; amount: number; count?: number }> = ({ to, t, amount, count = 20 }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: glow("#f4fbff", 0.95), transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }), count);
    m.frustumCulled = false;
    return m;
  }, [count]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  const o = new THREE.Object3D();
  const target = new THREE.Vector3(...to);
  const n = new THREE.Vector3(Math.cos(wallAng(DOOR.y)), -Math.sin(wallAng(DOOR.y)), 0);
  for (let i = 0; i < count; i++) {
    // a direction out of the wall into the cabin, biased up and forward (toward +z, away from the rows)
    const dz = -0.15 + rand(i + 3) * 1.1;
    const dy = -0.6 + rand(i + 5) * 1.4;
    const dir = n.clone().multiplyScalar(0.6 + rand(i + 7) * 0.6).add(new THREE.Vector3(0, dy, dz)).normalize();
    const period = 9 + rand(i + 9) * 8;
    const ph = (t + rand(i + 11) * period) / period;
    const cyc = ph - Math.floor(ph);
    const dist = (1 - cyc) * (0.25 + rand(i + 13) * 0.4);
    const len = (0.05 + rand(i + 15) * 0.09) * Math.min(1, dist * 4);
    const on = t >= rand(i + 17) * 6 && rand(i + 19) < amount;
    o.position.copy(target).addScaledVector(dir, dist + len / 2);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    o.scale.set(on ? 0.004 : 0, on ? 0.004 : 0, on ? len : 0);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return (
    <group userData={{ ghost: true }}>
      <primitive object={mesh} />
    </group>
  );
};

const softDisc = (rim = 0) =>
  canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    if (rim > 0) {
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(0.78, "rgba(255,255,255,0.7)");
      g.addColorStop(0.9, `rgba(255,255,255,${0.7 + rim * 0.3})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
    } else {
      g.addColorStop(0, "rgba(255,255,255,0.8)");
      g.addColorStop(0.45, "rgba(255,255,255,0.4)");
      g.addColorStop(1, "rgba(255,255,255,0)");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });

// Soft haze clouds (camera-facing sprites) placed in `spots`: each swells, drifts and turns slowly; `amount` 0..1.
export const Haze: React.FC<{ spots: { at: Vec3; size: number }[]; f: number; amount: number; color?: string; opacity?: number }> = ({ spots, f, amount, color = "#eef4fa", opacity = 0.42 }) => {
  const tex = useOwnedTex(() => softDisc());
  if (amount <= 0.01) return null;
  return (
    <group userData={{ ghost: true }}>
      {spots.map(({ at, size }, i) => {
        const s = size * (0.75 + 0.25 * amount) * (1 + 0.06 * Math.sin(f * 0.03 + i));
        return (
          <sprite raycast={noRay} key={i} position={[at[0] + Math.sin(f * 0.012 + i) * 0.08, at[1] + Math.sin(f * 0.017 + i * 2) * 0.04, at[2]]} scale={[s, s * 0.8, s]}>
            <spriteMaterial map={tex} color={color} transparent opacity={opacity * amount * (0.75 + 0.25 * rand(i))} depthWrite={false} rotation={rand(i + 3) * 6 + f * 0.004 * (i % 2 ? 1 : -1)} />
          </sprite>
        );
      })}
    </group>
  );
};

// Re-colours the scene fog each frame (CabinSet's own fog is replaced: this one is mounted after it and wins).
const FOG_ARGS: [string, number, number] = ["#ffffff", 1, 100]; // one array, so the fog is built once and only re-coloured
export const FogTone: React.FC<{ color: string; near: number; far: number }> = ({ color, near, far }) => <fog attach="fog" args={FOG_ARGS} color={color} near={near} far={far} />;

// ---------- the stopwatch ----------

const stopwatchTex = () =>
  canvasTexture(512, 512, (ctx) => {
    const c = 256;
    ctx.fillStyle = "#fffdf8";
    ctx.beginPath();
    ctx.arc(c, c, 250, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * Math.PI * 2 - Math.PI / 2;
      const major = k % 5 === 0;
      ctx.strokeStyle = "#202024";
      ctx.lineWidth = major ? 9 : 4;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * (major ? 200 : 215), c + Math.sin(a) * (major ? 200 : 215));
      ctx.lineTo(c + Math.cos(a) * 236, c + Math.sin(a) * 236);
      ctx.stroke();
    }
    ctx.fillStyle = "#202024";
    ctx.font = `900 44px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    [15, 30, 45, 60].forEach((v) => {
      const a = (v / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(String(v), c + Math.cos(a) * 160, c + Math.sin(a) * 160);
    });
    ctx.fillStyle = "#e0362c";
    ctx.font = `900 92px ${FONT}`;
    ctx.fillText("1 MIN", c, c + 78);
  });

// A big chrome stopwatch hanging on a ball chain from `pivot`: `swing` (rad) tips the chain in the `plane` ("xy":
// sideways along x, "zy": along z), `twist` turns it about the chain, its dial turned toward `face` (the camera) as
// far as the chain lets it; `hand` = seconds on the sweep hand.
export const Stopwatch: React.FC<{ pivot: Vec3; length: number; swing: number; plane?: "xy" | "zy"; twist: number; face: Vec3; hand: number; radius?: number }> = ({
  pivot,
  length,
  swing,
  plane = "xy",
  twist,
  face,
  hand,
  radius = 0.13,
}) => {
  const dial = useOwnedTex(stopwatchTex);
  const at: Vec3 = plane === "xy" ? [pivot[0] + Math.sin(swing) * length, pivot[1] - Math.cos(swing) * length, pivot[2]] : [pivot[0], pivot[1] - Math.cos(swing) * length, pivot[2] + Math.sin(swing) * length];
  // the watch's frame: +y up the chain, +z toward the camera (kept square to the chain), turned by `twist`
  const up = new THREE.Vector3(pivot[0] - at[0], pivot[1] - at[1], pivot[2] - at[2]).normalize();
  const toCam = new THREE.Vector3(face[0] - at[0], face[1] - at[1], face[2] - at[2]);
  const fwd = toCam.sub(up.clone().multiplyScalar(toCam.dot(up))).normalize().applyAxisAngle(up, twist);
  const right = new THREE.Vector3().crossVectors(up, fwd);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, fwd));
  const beads = Math.round(length / 0.022);
  const chain = length - radius - 0.06; // the chain ends at the ring on the crown
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: beads }, (_, i) => {
        const d = (i / beads) * chain;
        return <Ball key={i} position={[pivot[0] - up.x * d, pivot[1] - up.y * d, pivot[2] - up.z * d]} radius={0.0055} color="#cfd4dc" ink={0} rough={0.3} />;
      })}
      <group position={at} quaternion={q}>
        {/* ring, crown and buttons */}
        <mesh position={[0, radius + 0.045, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.018, 0.0045, 8, 20]} />
          <meshStandardMaterial color="#dfe3ea" roughness={0.25} metalness={0.2} />
        </mesh>
        <Cyl r={0.017} h={0.035} position={[0, radius + 0.015, 0]} color="#c9ced6" rough={0.25} />
        <Cyl r={0.01} h={0.03} position={[0.075, radius - 0.01, 0]} rotation={[0, 0, -0.7]} color="#c9ced6" rough={0.25} />
        {/* case and bezel */}
        <Cyl r={radius} h={0.05} rotation={[Math.PI / 2, 0, 0]} color="#d4d9e1" rough={0.22} />
        <mesh position={[0, 0, 0.026]}>
          <torusGeometry args={[radius - 0.006, 0.011, 12, 48]} />
          <meshStandardMaterial color="#eef1f5" roughness={0.18} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.0265]}>
          <circleGeometry args={[radius - 0.015, 48]} />
          <meshBasicMaterial map={dial} color={glow("#ffffff", 0.98)} toneMapped={false} />
        </mesh>
        {/* the sweep hand */}
        <group position={[0, 0, 0.03]} rotation={[0, 0, -(hand / 60) * Math.PI * 2]}>
          <mesh position={[0, radius * 0.33, 0]}>
            <planeGeometry args={[0.008, radius * 0.95]} />
            <meshBasicMaterial color="#e0362c" />
          </mesh>
        </group>
        <Ball position={[0, 0, 0.032]} radius={0.009} color="#e0362c" ink={0} />
        {/* a chrome glint */}
        <mesh position={[-radius * 0.45, radius * 0.45, 0.034]} rotation={[0, 0, 0.75]}>
          <planeGeometry args={[0.018, radius * 0.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- dream bokeh and sparkles ----------

const sparkTex = () =>
  canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 30);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const r = k % 2 ? 9 : 62;
      ctx.lineTo(64 + Math.cos(a - Math.PI / 2) * r, 64 + Math.sin(a - Math.PI / 2) * r);
    }
    ctx.fill();
  });

const DREAM = ["#ff8ad8", "#c49bff", "#ffd27a", "#8fe3ff", "#ffb3e6"];

// Floating bokeh discs (additive, rim-lit) in a box: rise slowly, sway and breathe in brightness.
export const Bokeh: React.FC<{ box: [Vec3, Vec3]; f: number; count?: number; size?: [number, number]; seed?: number; strength?: number }> = ({ box, f, count = 40, size = [0.04, 0.12], seed = 1, strength = 0.55 }) => {
  const tex = useOwnedTex(() => softDisc(1));
  const [a, b] = box;
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const sd = seed * 100 + i;
        const h = b[1] - a[1];
        const y = a[1] + ((rand(sd + 2) * h + f * 0.0016 * (0.5 + rand(sd + 3))) % h);
        const x = a[0] + rand(sd) * (b[0] - a[0]) + Math.sin(f * 0.02 + sd) * 0.05;
        const z = a[2] + rand(sd + 1) * (b[2] - a[2]);
        const s = size[0] + rand(sd + 4) * (size[1] - size[0]);
        const tw = 0.55 + 0.45 * Math.sin(f * (0.04 + rand(sd + 5) * 0.05) + sd);
        return (
          <sprite raycast={noRay} key={i} position={[x, y, z]} scale={[s, s, s]}>
            <spriteMaterial map={tex} color={glow(DREAM[i % DREAM.length], 1.3)} transparent opacity={strength * tw} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
        );
      })}
    </group>
  );
};

// Twinkling four-point sparkles at given spots (each pops, glints and fades on its own cycle).
export const Sparkles: React.FC<{ spots: Vec3[]; f: number; size?: number; color?: string }> = ({ spots, f, size = 0.07, color = "#fff2c8" }) => {
  const tex = useOwnedTex(sparkTex);
  return (
    <group userData={{ ghost: true }}>
      {spots.map((p, i) => {
        const period = 34 + rand(i + 7) * 30;
        const ph = ((f + rand(i) * period) % period) / period;
        const k = Math.sin(Math.PI * Math.min(1, ph * 1.6)) ** 2;
        const s = size * (0.4 + 0.8 * k) * (0.7 + rand(i + 2) * 0.6);
        return (
          <sprite raycast={noRay} key={i} position={[p[0], p[1] + Math.sin(f * 0.03 + i) * 0.03, p[2]]} scale={[s, s, s]}>
            <spriteMaterial map={tex} color={glow(color, 1.6)} transparent opacity={0.9 * k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} rotation={f * 0.01 * (i % 2 ? 1 : -1)} />
          </sprite>
        );
      })}
    </group>
  );
};

// ---------- masks worn on faces ----------

// The point on a seated puppet's face for a mask (card units: nose and mouth, under the eyes), brought forward of
// the card toward the camera so the cup sits on the face, not in it.
export const mouthPoint = (at: [number, number], camera: CameraShot, lean = 0, out = 0.07): Vec3 => {
  const p = handWorld(at, [Math.sin((lean * Math.PI) / 180) * 120, -706], camera);
  const d = new THREE.Vector3(camera.position[0] - p[0], camera.position[1] - p[1], camera.position[2] - p[2]).normalize();
  return [p[0] + d.x * out, p[1] + d.y * out, p[2] + d.z * out];
};

// A mask held on a face: the yellow cup (wide, soft rim to the face, closed end to the camera), its clear bag
// hanging below and breathing (`breath` 0..1 swells it), and the tube up to the service unit's drop door at `top`.
export const FaceMask: React.FC<{ at: Vec3; camera: CameraShot; top: Vec3; breath?: number; scale?: number }> = ({ at, camera, top, breath = 0.5, scale = 1.25 }) => {
  const yaw = Math.atan2(camera.position[0] - at[0], camera.position[2] - at[2]);
  const pitch = -Math.atan2(camera.position[1] - at[1], Math.hypot(camera.position[0] - at[0], camera.position[2] - at[2])) * 0.6;
  const bag = 0.8 + 0.45 * breath;
  const tubeFrom: Vec3 = [at[0], at[1] - 0.075 * scale, at[2]];
  return (
    <group userData={{ ghost: true }}>
      <group position={at} rotation={[pitch, yaw, 0]} scale={scale}>
        {/* +z toward the camera: the cup narrows outward from the face */}
        <Cyl r={0.062} r2={0.046} h={0.06} rotation={[Math.PI / 2, 0, 0]} color="#f3c623" rough={0.45} />
        <mesh position={[0, 0, -0.03]}>
          <torusGeometry args={[0.06, 0.008, 8, 24]} />
          <meshStandardMaterial color="#e2b10f" roughness={0.5} />
        </mesh>
        <Ball position={[0, -0.09, 0.012]} radius={0.045} scale={[0.95 * bag, 1.35 * bag, 0.6 * bag]} color="#e9f6fb" opacity={0.45} ink={0} />
        {/* the elastic from the cup's sides back round the head */}
        {[-1, 1].map((s) => (
          <Cyl key={s} r={0.0045} h={0.13} rotation={[0, s * 0.35, Math.PI / 2 + s * 0.12]} position={[s * 0.125, 0.012, -0.045]} color="#d8b23a" rough={0.6} seg={6} />
        ))}
      </group>
      <TubeTo a={tubeFrom} b={top} />
    </group>
  );
};

// A clear tube hanging in a gentle curve from a to b.
const TubeTo: React.FC<{ a: Vec3; b: Vec3 }> = ({ a, b }) => {
  const geo = useMemo(() => {
    const m = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), 0.5).add(new THREE.Vector3(0, -0.08, 0.02));
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), m, new THREE.Vector3(...b)), 20, 0.007, 6, false);
  }, [a[0], a[1], a[2], b[0], b[1], b[2]]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#d8eef5" roughness={0.25} transparent opacity={0.8} />
    </mesh>
  );
};

// ---------- re-lighting the cabin per mood (children of CabinSet) ----------

export const ColdRig: React.FC<{ crack: number; at: Vec3 }> = ({ crack, at }) => {
  const k = crack < 0 ? 0 : smooth(crack / 4);
  return (
    <>
      {/* soft fill on the exit from the cabin side (the sun is behind that wall) */}
      <pointLight position={[-1.0, 1.25, 2.85]} color={crack < 0 ? "#fff3e2" : "#e6f1ff"} intensity={1.0} distance={2.4} decay={1.2} />
      <hemisphereLight args={["#cfe2ff", "#6f7f9a", 0.25 + 0.5 * k]} />
      <pointLight position={at} color="#d6ecff" intensity={0.5 * k * (0.9 + 0.1 * Math.sin(crack * 2.1))} distance={1.6} decay={1.6} />
    </>
  );
};

export const DreamRig: React.FC<{ f: number }> = ({ f }) => (
  <>
    <hemisphereLight args={["#ffb8ee", "#4a2c7a", 1.1]} />
    <pointLight position={[-0.45, 1.25, 0.75]} color="#ff7ad0" intensity={2.2 + 0.3 * Math.sin(f * 0.05)} distance={3.2} decay={1.3} />
    <pointLight position={[1.2, 1.5, -0.8]} color="#8a5cff" intensity={3.0} distance={5} decay={1.2} />
    <pointLight position={[-1.2, 1.4, -1.5]} color="#c47bff" intensity={2.2} distance={5} decay={1.2} />
  </>
);

export const SunRig: React.FC = () => (
  <>
    <hemisphereLight args={["#ffe2b0", "#7a5a40", 0.35]} />
    <directionalLight position={[-6, 1.2, 1.2]} color="#ffb85c" intensity={0.9} />
  </>
);
