import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Burst, CameraShot, canvasTexture, GodRays, Halo, InkBox, InkCylinder, Label, LightPool, rand, Room, settle, toonRamp } from "../../engine";
import type { PuppetLight } from "../../engine";
import { paintTexture } from "../../three/surfaces";
import { useOwned } from "../../three/BalloonSets";

// The pivot's cold blue "truth" room for what-if-moon-jump: "the Moon cuts your weight, but not your mass".
// Two mechanism props side by side (stacked tall, so both fit the narrow 9:16 frame):
//   - SCALE (x -0.37): an old platform scale, a white Apollo backpack on its platform, a big round dial on a column
//     reading WEIGHT; `needle` 0..1 swings it from EARTH (top right) down to 1/6 (lower left) with an overshoot wobble.
//   - POST (x +0.40): the same backpack on top of a thin post on a floor hinge, MASS plate on its front; `tip` 0..1
//     tips it over backward (and a little to the right), slow then fast like a falling stick, lands at tip 0.8 with a
//     small bounce and a dust puff.
// Floor y = 0, back wall z = -2.5. A puppet may stand at `LAB_SPOT` (x 0, z 0.6). Light puppets with `labLight(f)`.

type Vec3 = [number, number, number];
const INK = "#161212";

export const SCALE: Vec3 = [-0.33, 0, 0];
export const POST: Vec3 = [0.36, 0, 0];
export const LAB_SPOT: [number, number] = [0, 0.6];
export const LAB_CAMERA: CameraShot = { position: [0, 1.15, 3.4], target: [0, 0.8, 0], fov: 40 };
const BACK_Z = -2.5;

// ---------- shared pieces (PackShopSet imports these) ----------

// Rounded, bevelled toon box with an ink hull: the house look for anything man-made.
export const RBox: React.FC<{ size: Vec3; radius?: number; position?: Vec3; rotation?: Vec3; color: string; ink?: number; map?: THREE.Texture }> = ({
  size,
  radius = 0.02,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  ink = 0.012,
  map,
}) => {
  const r = Math.min(radius, Math.min(...size) / 2 - 0.001);
  const geo = useOwned(() => new RoundedBoxGeometry(size[0], size[1], size[2], 3, r), [size[0], size[1], size[2], r]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshToonMaterial color={color} gradientMap={toonRamp} map={map ?? paintTexture()} />
      </mesh>
      {ink > 0 && (
        <mesh geometry={geo} scale={[1 + (ink * 2) / size[0], 1 + (ink * 2) / size[1], 1 + (ink * 2) / size[2]]}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

export const Ball: React.FC<{ position: Vec3; radius: number; color: string; scale?: Vec3; ink?: number; glow?: number }> = ({ position, radius, color, scale = [1, 1, 1], ink = 0.008, glow }) => (
  <group position={position} scale={scale}>
    <mesh castShadow>
      <sphereGeometry args={[radius, 24, 16]} />
      {glow ? <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(glow)} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
    </mesh>
    {ink > 0 && (
      <mesh>
        <sphereGeometry args={[radius + ink, 24, 16]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

// The Apollo life-support backpack (PLSS): a white rounded box with a smaller box (the oxygen purge unit) on top,
// seams, hose ports and straps. Origin at the middle of its bottom face; 0.38 x 0.65 x 0.22 m overall.
export const PACK = { w: 0.38, h: 0.52, d: 0.22, top: 0.13 };
export const Backpack: React.FC<{ position?: Vec3; rotation?: Vec3 }> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => {
  const { w, h, d, top } = PACK;
  return (
    <group position={position} rotation={rotation}>
      <RBox size={[w, h, d]} radius={0.045} position={[0, h / 2, 0]} color="#dde3ea" />
      {/* seam band and the purge unit on top */}
      <RBox size={[w + 0.008, 0.022, d + 0.008]} radius={0.01} position={[0, h * 0.62, 0]} color="#b9c3cf" ink={0} />
      <RBox size={[w - 0.06, top, d - 0.04]} radius={0.035} position={[0, h + top / 2 + 0.004, -0.01]} color="#d2d9e2" />
      <RBox size={[0.07, 0.05, 0.03]} radius={0.01} position={[0.08, h + top + 0.02, 0.02]} color="#9aa6b4" ink={0.006} />
      {/* hose ports: blue in, red out, on the front's lower corners */}
      {[
        [-0.12, "#2f6fd6"],
        [0.12, "#d6402f"],
      ].map(([x, c]) => (
        <group key={x as number} position={[x as number, 0.1, d / 2 + 0.012]}>
          <InkCylinder radius={0.032} height={0.03} rotation={[Math.PI / 2, 0, 0]} color={c as string} ink={0.006} />
          <InkCylinder radius={0.016} height={0.034} position={[0, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]} color="#d8dde3" ink={0} />
        </group>
      ))}
      {/* straps down the sides */}
      {[-1, 1].map((s) => (
        <RBox key={s} size={[0.012, h * 0.85, 0.05]} radius={0.004} position={[s * (w / 2 + 0.006), h * 0.48, 0.03]} color="#8c96a2" ink={0.004} />
      ))}
    </group>
  );
};

// ---------- the dial scale ----------

const DIAL = { r: 0.27, y: 1.25, z: -0.13 };
// Clockwise-from-top angles (degrees) of the dial's marks.
const A_ZERO = -170;
const A_EARTH = 50;
const A_SIXTH = A_ZERO + (A_EARTH - A_ZERO) / 6;

// Needle angle for `needle` 0..1: EARTH at 0, a fast swing down, past 1/6 and back in a damped wobble, exactly at 1/6
// from 1. A pure function of `needle`, so the scene can ramp or hold it however it likes.
export const needleAngle = (needle: number) => {
  const n = Math.min(1, Math.max(0, needle));
  const swing = 1 - (1 - Math.min(1, n / 0.55)) ** 2.2; // ease out: leaves EARTH briskly, arrives with speed
  const t = Math.max(0, (n - 0.55) / 0.45);
  const wobble = n > 0.55 ? 0.16 * Math.sin(t * Math.PI * 3) * (1 - t) ** 1.6 : 0;
  return A_EARTH + (A_SIXTH - A_EARTH) * (swing + wobble);
};

const dialFace = () =>
  canvasTexture(1024, 1024, (ctx) => {
    const c = 512;
    const R = 500;
    // aged cream enamel: a warm centre, a dusky rim and a few soft stains
    const g = ctx.createRadialGradient(c - 120, c - 140, 40, c, c, R);
    g.addColorStop(0, "#fbf6e8");
    g.addColorStop(0.75, "#efe6cf");
    g.addColorStop(1, "#cfc2a2");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      ctx.save();
      ctx.translate(c + (rand(i, 3) - 0.5) * 760, c + (rand(i, 4) - 0.5) * 760);
      ctx.scale(60 + rand(i, 5) * 90, 40 + rand(i, 6) * 60);
      sg.addColorStop(0, "rgba(150,120,70,0.12)");
      sg.addColorStop(1, "rgba(150,120,70,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const at = (deg: number, r: number) => {
      const a = (deg * Math.PI) / 180;
      return [c + Math.sin(a) * r, c - Math.cos(a) * r];
    };
    // the scale arc and its ticks
    ctx.strokeStyle = INK;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(c, c, 400, ((A_ZERO - 90) * Math.PI) / 180, ((A_EARTH - 90) * Math.PI) / 180);
    ctx.stroke();
    for (let k = 0; k <= 44; k++) {
      const deg = A_ZERO + ((A_EARTH - A_ZERO) * k) / 44;
      const major = k % 4 === 0;
      const [x0, y0] = at(deg, 400);
      const [x1, y1] = at(deg, major ? 340 : 368);
      ctx.lineWidth = major ? 12 : 6;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    // the two named marks: a fat red wedge at EARTH, a fat blue one at 1/6
    const mark = (deg: number, color: string) => {
      ctx.fillStyle = color;
      const [ax, ay] = at(deg - 3.5, 460);
      const [bx, by] = at(deg + 3.5, 460);
      const [tx, ty] = at(deg, 330);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      ctx.stroke();
    };
    mark(A_EARTH, "#d6402f");
    mark(A_SIXTH, "#1f8fd0");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 92px Arial Black, Impact, sans-serif";
    ctx.fillStyle = "#b8321f";
    const [ex, ey] = at(A_EARTH - 6, 245);
    ctx.fillText("EARTH", ex - 10, ey + 6);
    ctx.font = "900 120px Arial Black, Impact, sans-serif";
    ctx.fillStyle = "#16679a";
    const [sx, sy] = at(A_SIXTH + 21, 250);
    ctx.fillText("1/6", sx, sy);
    // the dial's name, in the empty lower right
    ctx.font = "900 92px Arial Black, Impact, sans-serif";
    ctx.fillStyle = INK;
    ctx.fillText("WEIGHT", c + 165, c + 205);
  });

const DialScale: React.FC<{ needle: number; frame: number }> = ({ needle, frame }) => {
  const face = useOwned(dialFace);
  const a = (needleAngle(needle) * Math.PI) / 180;
  // a tremble on the needle while it is moving, from its own speed (pure in `needle`)
  const speed = Math.abs(needleAngle(needle + 0.01) - needleAngle(needle));
  const tremble = speed > 0.2 ? Math.sin(frame * 2.1) * 0.004 * Math.min(1, speed) : 0;
  const body = "#2f5b73";
  const brass = "#d9b35c";
  return (
    <group position={SCALE}>
      {/* platform: cast base, ribbed steel plate */}
      <RBox size={[0.52, 0.11, 0.48]} radius={0.035} position={[0, 0.055, 0.02]} color={body} />
      <RBox size={[0.46, 0.022, 0.42]} radius={0.008} position={[0, 0.121, 0.02]} color="#a9b8c4" ink={0.006} />
      {[-0.15, -0.075, 0, 0.075, 0.15].map((z) => (
        <RBox key={z} size={[0.42, 0.008, 0.012]} radius={0.003} position={[0, 0.135, 0.02 + z]} color="#8597a6" ink={0} />
      ))}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <InkCylinder key={`${sx}${sz}`} radius={0.03} height={0.03} position={[sx * 0.22, 0.015, 0.02 + sz * 0.2]} color="#1e3a4a" ink={0.005} />),
      )}
      {/* the column, brass collar at its foot, the dial head */}
      <RBox size={[0.13, 0.12, 0.12]} radius={0.03} position={[0, 0.17, DIAL.z]} color={body} />
      <RBox size={[0.085, DIAL.y - 0.1, 0.075]} radius={0.025} position={[0, (DIAL.y + 0.1) / 2, DIAL.z]} color={body} />
      <InkCylinder radius={0.06} height={0.03} position={[0, 0.245, DIAL.z]} color={brass} ink={0.006} />
      <group position={[0, DIAL.y, DIAL.z]}>
        <InkCylinder radius={DIAL.r + 0.045} height={0.12} rotation={[Math.PI / 2, 0, 0]} color={body} ink={0.016} />
        <mesh position={[0, 0, 0.062]}>
          <torusGeometry args={[DIAL.r + 0.012, 0.024, 12, 64]} />
          <meshToonMaterial color={brass} gradientMap={toonRamp} />
        </mesh>
        <mesh position={[0, 0, 0.064]}>
          <circleGeometry args={[DIAL.r, 64]} />
          <meshBasicMaterial map={face} toneMapped={false} />
        </mesh>
        {/* needle with a counterweight tail, brass hub */}
        <group position={[0, 0, 0.074]} rotation={[0, 0, -a + tremble]}>
          <mesh>
            <shapeGeometry args={[needleShape(DIAL.r * 0.88)]} />
            <meshBasicMaterial color="#1a1a22" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -0.003]} scale={[1.7, 1.05, 1]}>
            <shapeGeometry args={[needleShape(DIAL.r * 0.88)]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        </group>
        <InkCylinder radius={0.03} height={0.03} position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]} color={brass} ink={0.006} />
        {/* glass glint */}
        <mesh position={[-0.09, 0.1, 0.095]} rotation={[0, 0, 0.7]}>
          <planeGeometry args={[0.05, 0.3]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* brass crown on top */}
        <RBox size={[0.14, 0.05, 0.08]} radius={0.02} position={[0, DIAL.r + 0.06, 0]} color={brass} ink={0.008} />
        <Ball position={[0, DIAL.r + 0.11, 0]} radius={0.03} color={brass} />
      </group>
      <Backpack position={[0, 0.132, 0.05]} />
    </group>
  );
};

// A long thin needle pointing +y from its pivot at the origin, with a short counterweight tail.
const needleShape = (len: number) => {
  const s = new THREE.Shape();
  s.moveTo(0, len);
  s.lineTo(0.024, 0);
  s.lineTo(0.01, -0.055);
  s.lineTo(-0.01, -0.055);
  s.lineTo(-0.024, 0);
  s.closePath();
  return s;
};

// ---------- the tipping post ----------

const HINGE_Y = 0.115; // the pack's back face (0.11 behind the post) rests on the floor when it lies flat
const POST_LEN = 0.95;
const TIP_YAW = -0.22; // it falls back and a little to the right, so the fall reads in the narrow frame
const LAND = 0.8;

// Fall angle (radians, 0 upright, PI/2 flat) for `tip` 0..1: a falling stick (slow lean, then fast), flat at
// tip 0.8, then two small hops off the floor.
export const tipAngle = (tip: number) => {
  const t = Math.min(1, Math.max(0, tip));
  if (t < LAND) return (Math.PI / 2) * (t / LAND) ** 2.6;
  const b = (t - LAND) / (1 - LAND);
  return Math.PI / 2 - 0.13 * Math.abs(Math.sin(b * Math.PI * 2)) * (1 - b) ** 1.5;
};

const TippingPost: React.FC<{ tip: number }> = ({ tip }) => {
  const a = tipAngle(tip);
  // where the pack's middle lands, for the dust
  const reach = POST_LEN + PACK.h / 2;
  const land: Vec3 = [POST[0] + Math.sin(-TIP_YAW) * reach, 0.02, POST[2] - Math.cos(TIP_YAW) * reach];
  const dust = tip >= LAND ? ((tip - LAND) / (1 - LAND)) * 30 : -1;
  return (
    <group>
      <group position={POST}>
        {/* floor plate and hinge cheeks */}
        <RBox size={[0.3, 0.035, 0.3]} radius={0.012} position={[0, 0.0175, 0]} color="#3b5873" />
        {[-1, 1].map((s) => (
          <group key={s} rotation={[0, TIP_YAW, 0]}>
            <RBox size={[0.025, 0.13, 0.09]} radius={0.01} position={[s * 0.05, 0.08, 0]} color="#5d7a92" ink={0.008} />
          </group>
        ))}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => <Ball key={`${sx}${sz}`} position={[sx * 0.12, 0.04, sz * 0.12]} radius={0.012} color="#a9b8c4" ink={0.004} />),
        )}
      </group>
      <group position={[POST[0], HINGE_Y, POST[2]]} rotation={[0, TIP_YAW, 0]}>
        <InkCylinder radius={0.022} height={0.14} rotation={[0, 0, Math.PI / 2]} color="#d9b35c" ink={0.006} />
        <group rotation={[-a, 0, 0]}>
          <InkCylinder radius={0.028} height={POST_LEN} position={[0, POST_LEN / 2, 0]} color="#c9d3dc" ink={0.008} />
          {/* hazard collar near the hinge */}
          <InkCylinder radius={0.032} height={0.08} position={[0, 0.1, 0]} color="#ffd23f" ink={0.006} />
          <RBox size={[0.24, 0.025, 0.16]} radius={0.008} position={[0, POST_LEN - 0.012, 0]} color="#5d7a92" ink={0.008} />
          <Backpack position={[0, POST_LEN, 0]} />
          {/* MASS plate, screwed to the pack's front */}
          <RBox size={[0.33, 0.1, 0.014]} radius={0.006} position={[0, POST_LEN + 0.3, PACK.d / 2 + 0.008]} color="#2b3e52" ink={0.006} />
          <Label text="MASS" position={[0, POST_LEN + 0.3, PACK.d / 2 + 0.018]} width={0.31} bg="#ffd23f" />
        </group>
      </group>
      <group userData={{ ghost: true }}>
        <Burst kind="dust" at={land} frame={dust} size={1.3} count={28} colors={["#9fb4d8", "#c8d6ee", "#7d93b8"]} seed={4} />
      </group>
    </group>
  );
};

// ---------- room dressing ----------

// Calibration weights: stacked cast-iron cylinders with knobs, on a wall shelf.
const Weights: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <RBox size={[1.1, 0.04, 0.26]} radius={0.01} position={[0, 0, 0]} color="#3b5873" ink={0.008} />
    {[
      [-0.42, 0.11, 0.09],
      [-0.25, 0.085, 0.07],
      [-0.11, 0.065, 0.055],
      [0.02, 0.05, 0.045],
      [0.13, 0.04, 0.035],
    ].map(([x, r, h], i) => (
      <group key={i} position={[x, 0.02, 0]}>
        <InkCylinder radius={r} height={h} position={[0, h / 2, 0]} color="#3a4352" ink={0.006} />
        <InkCylinder radius={r * 0.3} height={h * 0.6} position={[0, h + h * 0.3, 0]} color="#3a4352" ink={0.005} />
        <Ball position={[0, h * 1.6 + r * 0.25, 0]} radius={r * 0.32} color="#3a4352" ink={0.005} />
      </group>
    ))}
    {/* a brass beam balance at the end */}
    <group position={[0.38, 0.02, 0]}>
      <InkCylinder radius={0.012} height={0.3} position={[0, 0.15, 0]} color="#d9b35c" ink={0.004} />
      <RBox size={[0.34, 0.014, 0.014]} radius={0.004} position={[0, 0.3, 0]} rotation={[0, 0, 0.08]} color="#d9b35c" ink={0.004} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, 0.21 + s * 0.013, 0]}>
          <cylinderGeometry args={[0.06, 0.04, 0.02, 24]} />
          <meshToonMaterial color="#d9b35c" gradientMap={toonRamp} />
        </mesh>
      ))}
    </group>
  </group>
);

// A high window in the back wall that the cold beams come through.
const HighWindow: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <RBox size={[1.0, 0.72, 0.06]} radius={0.02} position={[0, 0, 0]} color="#22324d" ink={0.01} />
    <mesh position={[0, 0, 0.032]}>
      <planeGeometry args={[0.88, 0.6]} />
      <meshBasicMaterial color={new THREE.Color("#bff2ff").multiplyScalar(1.25)} toneMapped={false} />
    </mesh>
    {[0, 1].map((k) => (
      <RBox key={`v${k}`} size={[0.035, 0.62, 0.04]} radius={0.008} position={[-0.15 + k * 0.3, 0, 0.05]} color="#22324d" ink={0.006} />
    ))}
    <RBox size={[0.9, 0.035, 0.04]} radius={0.008} position={[0, 0, 0.05]} color="#22324d" ink={0.006} />
    <Halo position={[0, 0, 0.1]} size={1.8} color="#7fe8ff" strength={0.45} />
  </group>
);

// A pendant lamp over the props, swaying a touch: its shade glows and drops a soft cone of light.
const Pendant: React.FC<{ frame: number }> = ({ frame }) => {
  const sway = Math.sin(frame * 0.045) * 0.035;
  return (
    <group position={[0.02, 3.2, 0.25]} rotation={[sway * 0.4, 0, sway]}>
      <InkCylinder radius={0.006} height={0.85} position={[0, -0.425, 0]} color={INK} ink={0} />
      <mesh position={[0, -0.95, 0]}>
        <coneGeometry args={[0.2, 0.2, 32, 1, true]} />
        <meshToonMaterial color="#2f5b73" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <Ball position={[0, -1.03, 0]} radius={0.05} color="#dff8ff" glow={1.6} ink={0} />
      <group userData={{ ghost: true }}>
        <mesh position={[0, -1.95, 0]}>
          <coneGeometry args={[0.95, 1.8, 40, 1, true]} />
          <meshBasicMaterial color="#7fe8ff" transparent opacity={0.05} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

// Painted wear for the back wall: navy panels with streaks and scuffs, so it never reads as a flat fill.
const wallWear = () =>
  canvasTexture(1024, 512, (ctx) => {
    ctx.clearRect(0, 0, 1024, 512);
    for (let i = 0; i < 26; i++) {
      const x = rand(i, 11) * 1024;
      const w = 6 + rand(i, 12) * 26;
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "rgba(10,20,40,0)");
      g.addColorStop(0.5 + rand(i, 13) * 0.4, `rgba(10,20,40,${0.12 + rand(i, 14) * 0.18})`);
      g.addColorStop(1, "rgba(10,20,40,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, w, 512);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(140,190,230,${0.04 + rand(i, 21) * 0.06})`;
      ctx.beginPath();
      ctx.ellipse(rand(i, 22) * 1024, 300 + rand(i, 23) * 212, 10 + rand(i, 24) * 40, 4 + rand(i, 25) * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// How puppets standing here are lit: the cold pendant overhead and a cyan rim from the window behind.
export const labLight = (frame: number): PuppetLight => ({
  tint: "#9fb6ff",
  shadow: 0.2,
  points: [{ position: [0.02 + Math.sin(frame * 0.045) * 0.035, 2.2, 0.25], color: "#bff2ff", strength: 1.6, range: 2.6 }],
  distant: [{ direction: [-0.4, 0.5, -1], color: "#7fe8ff", strength: 0.8 }],
});

export const TruthLabSet: React.FC<{ camera: CameraShot; frame: number; needle?: number; tip?: number; children?: React.ReactNode }> = ({
  camera,
  frame,
  needle = 0,
  tip = 0,
  children,
}) => {
  const wear = useOwned(wallWear);
  return (
    <Room camera={camera} mood="cold" floor="#33415e" wall="#22345a" width={7} depth={5} wallPattern="panel" floorPattern="concrete">
      {/* back wall wear and a skirting of pipes */}
      <mesh position={[0, 1.4, BACK_Z + 0.06]}>
        <planeGeometry args={[7, 2.8]} />
        <meshBasicMaterial map={wear} transparent depthWrite={false} />
      </mesh>
      {[
        [2.75, "#5d7a92", 0.05],
        [2.6, "#d9b35c", 0.035],
      ].map(([y, c, r]) => (
        <InkCylinder key={y as number} radius={r as number} height={7} position={[0, y as number, BACK_Z + 0.16]} rotation={[0, 0, Math.PI / 2]} color={c as string} ink={0.006} />
      ))}
      {/* the lit back wall: a cyan pool of light and beams from the high window, dust in them */}
      <LightPool x={-0.2} z={BACK_Z} color="#6fe0ff" strength={0.3} />
      <Halo position={[0.15, 1.2, BACK_Z + 0.1]} size={3.4} color="#3fc8ff" strength={0.16} />
      <HighWindow position={[-1.05, 2.2, BACK_Z + 0.06]} />
      <GodRays center={[-1.05, 2.2, BACK_Z + 0.1]} size={[0.88, 0.6]} panes={[3, 2]} sun={[0.75, -0.62, 0.45]} color="#9feaff" strength={0.05} patch={0.16} motes={90} frame={frame} />
      {/* shelf of calibration weights and a tall cabinet on the right */}
      <Weights position={[0.95, 1.45, BACK_Z + 0.2]} />
      <RBox size={[0.7, 1.9, 0.45]} radius={0.04} position={[2.0, 0.95, BACK_Z + 0.3]} color="#2a4566" />
      {[0.55, 1.15].map((y) => (
        <RBox key={y} size={[0.6, 0.5, 0.02]} radius={0.01} position={[2.0, y, BACK_Z + 0.53]} color="#34557a" ink={0.006} />
      ))}
      {/* a squat crate and a stool, deep left, for layers */}
      <RBox size={[0.6, 0.45, 0.5]} radius={0.04} position={[-1.7, 0.225, -1.4]} color="#2f4a66" />
      <RBox size={[0.4, 0.3, 0.36]} radius={0.04} position={[-1.65, 0.6, -1.4]} color="#3b5d80" />
      <group position={[1.3, 0, -1.3]}>
        <InkCylinder radius={0.18} height={0.05} position={[0, 0.6, 0]} color="#d9b35c" ink={0.008} />
        {[0, 1, 2].map((i) => (
          <InkCylinder key={i} radius={0.018} height={0.62} position={[Math.cos(i * 2.09) * 0.12, 0.29, Math.sin(i * 2.09) * 0.12]} rotation={[Math.sin(i * 2.09) * 0.15, 0, -Math.cos(i * 2.09) * 0.15]} color="#5d7a92" ink={0.005} />
        ))}
      </group>
      {/* cold light on the props: a pool on the floor round them, the pendant overhead */}
      <mesh position={[0, 0.004, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.25, 48]} />
        <meshBasicMaterial color="#3fc8ff" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <Pendant frame={frame} />
      <pointLight position={[0, 2.2, 0.6]} intensity={1.5} distance={4.5} color="#bff2ff" />
      <pointLight position={[-1.0, 2.0, -1.8]} intensity={2} distance={3.5} color="#4fd8ff" />

      <DialScale needle={needle} frame={frame} />
      <TippingPost tip={tip} />
      {children}
    </Room>
  );
};
