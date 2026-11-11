import React from "react";
import * as THREE from "three";
import { CameraShot, canvasTexture, Halo, InkCylinder, Label, rand, Room, toonRamp } from "../../engine";
import type { PuppetLight } from "../../engine";
import { useOwned } from "../../three/BalloonSets";
import { Ball, RBox } from "./TruthLabSet";

// A 1972 suit workshop (white and orange-red): white pegboard wall with tools, a workbench with a helmet and a work
// lamp, a white suit hanging on a rack, warm lamps. Centre stage on a stand (`CUTAWAY`, chest height) the astronaut
// backpack as a cutaway model: a white FIBERGLASS shell with its front-left corner cut away (cut edges painted
// orange-red), inside an OXYGEN bottle, a spinning fan, coiled hoses; an O2 gauge on the front.
// `crack` 0..1 grows a jagged black crack across the shell's front; `leak` 0..1 jets white air out of it, drops the
// gauge to zero, flashes the red warning light on the back wall (bloom-ready) and tints the room red.
// Floor y = 0, back wall z = -2. Light puppets with `shopLight(f, leak)`.

type Vec3 = [number, number, number];
const INK = "#161212";

export const CUTAWAY: Vec3 = [0, 1.02, 0]; // the shell's centre
export const SHOP_CAMERA: CameraShot = { position: [0.3, 1.1, 2.2], target: [0, 0.95, 0], fov: 38 };
const SHELL = { w: 0.46, h: 0.6, d: 0.26, t: 0.018, band: 0.13 };
const BACK_Z = -2;
const BEACON: Vec3 = [-0.85, 1.5, BACK_Z + 0.1];
const ORANGE = "#e0532c";

// The beacon blinks while air leaks: on/off at ~2.5 Hz, coming in with the leak.
const beaconPulse = (frame: number, leak: number) => (leak <= 0.02 ? 0 : Math.min(1, leak * 4) * (Math.sin(frame * 0.55) > -0.2 ? 1 : 0.15));

// ---------- the cutaway backpack ----------

// The crack: a seeded jagged polyline across the intact front-right of the shell (local x, y on the front face),
// a main line and two short branches. Each piece is [from, to, width, start along the crack 0..1].
type Seg = { a: [number, number]; b: [number, number]; w: number; at: number };
const crackSegments = (): Seg[] => {
  const main: [number, number][] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = 0.078 + u * 0.14;
    const y = 0.13 - u * 0.24 + (i % 2 ? 1 : -1) * (0.01 + rand(i, 41) * 0.016);
    main.push([x, y]);
  }
  const segs: Seg[] = [];
  for (let i = 0; i < n; i++) segs.push({ a: main[i], b: main[i + 1], w: 0.015 - i * 0.0008, at: i / n });
  // branches off the 3rd and 6th joints
  const branch = (from: [number, number], dir: [number, number], at: number, seed: number) => {
    let p = from;
    for (let k = 0; k < 3; k++) {
      const q: [number, number] = [p[0] + dir[0] * 0.03 + (rand(seed + k, 43) - 0.5) * 0.012, p[1] + dir[1] * 0.03 + (rand(seed + k, 44) - 0.5) * 0.012];
      segs.push({ a: p, b: q, w: 0.008 - k * 0.0015, at: at + k * 0.06 });
      p = q;
    }
  };
  branch(main[3], [0.3, 0.9], 0.38, 1);
  branch(main[6], [-0.5, -0.8], 0.7, 7);
  return segs;
};
const CRACK = crackSegments();
// Where the air jets come out (front-face local x, y), the way each points and when it starts (fraction of leak).
const JETS: { at: [number, number]; dir: Vec3; from: number; seed: number }[] = [
  // all aimed out and down, clear of the FIBERGLASS band across the top
  { at: [0.1, 0.02], dir: [0.7, -0.35, 0.65], from: 0, seed: 1 },
  { at: [0.19, -0.05], dir: [0.85, -0.25, 0.5], from: 0.15, seed: 2 },
  { at: [0.15, -0.01], dir: [0.2, -0.55, 1], from: 0.3, seed: 3 },
];

const Crack: React.FC<{ crack: number; z: number }> = ({ crack, z }) => (
  <group position={[0, 0, z]}>
    {CRACK.map((s, i) => {
      const len = 1 / 9;
      const p = Math.min(1, Math.max(0, (crack - s.at) / len));
      if (p <= 0) return null;
      const bx = s.a[0] + (s.b[0] - s.a[0]) * p;
      const by = s.a[1] + (s.b[1] - s.a[1]) * p;
      const dx = bx - s.a[0];
      const dy = by - s.a[1];
      const l = Math.hypot(dx, dy);
      return (
        <group key={i} position={[(s.a[0] + bx) / 2, (s.a[1] + by) / 2, 0]} rotation={[0, 0, Math.atan2(dy, dx)]}>
          {/* pale chipped edge round the dark split */}
          <mesh position={[0, 0, -0.001]}>
            <planeGeometry args={[l + s.w, s.w * 2.4]} />
            <meshBasicMaterial color="#c9c2b4" />
          </mesh>
          <mesh>
            <planeGeometry args={[l + s.w * 0.6, s.w]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        </group>
      );
    })}
  </group>
);

// White air jetting out of the crack: cel puffs that shoot out fast, swell and fade, plus streaks along the jet.
const AirJets: React.FC<{ frame: number; leak: number; z: number }> = ({ frame, leak, z }) => {
  if (leak <= 0) return null;
  const period = 13;
  const puffs = 6;
  return (
    <group position={[0, 0, z]} userData={{ ghost: true }}>
      {JETS.map((j) => {
        const on = Math.min(1, Math.max(0, (leak - j.from) / 0.15));
        if (on <= 0) return null;
        const power = on * (leak > 0.85 ? 1 - (leak - 0.85) * 2.5 : 1); // eases off as the bottle empties
        const d = new THREE.Vector3(...j.dir).normalize();
        return (
          <group key={j.seed} position={[j.at[0], j.at[1], 0]}>
            {Array.from({ length: puffs }, (_, i) => {
              const clock = frame * 1.0 + (i * period) / puffs + j.seed * 3;
              const t = (clock % period) / period;
              const cyc = Math.floor(clock / period);
              const sd = j.seed * 100 + i * 7 + cyc * 13;
              const dist = (0.04 + 0.26 * Math.sqrt(t)) * power;
              const spread = 0.05 * t * power;
              const pos: Vec3 = [d.x * dist + (rand(sd, 2) - 0.5) * spread, d.y * dist + (rand(sd, 3) - 0.5) * spread + t * t * 0.04, d.z * dist];
              const size = (0.018 + 0.06 * t) * (0.8 + rand(sd, 4) * 0.4) * power * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
              if (size < 0.004) return null;
              return (
                <group key={i} position={pos}>
                  <mesh>
                    <sphereGeometry args={[size, 14, 10]} />
                    <meshToonMaterial color={t < 0.4 ? "#c4d4e6" : "#b4c4d8"} gradientMap={toonRamp} transparent opacity={0.95 - t * 0.4} />
                  </mesh>
                  {t < 0.6 && (
                    <mesh>
                      <sphereGeometry args={[size + 0.004, 14, 10]} />
                      <meshBasicMaterial color="#5a6c82" side={THREE.BackSide} transparent opacity={0.9 - t} />
                    </mesh>
                  )}
                </group>
              );
            })}
            {/* speed streaks along the jet */}
            {[0, 1, 2].map((k) => {
              const t = ((frame * 1.6 + k * 5 + j.seed * 4) % 8) / 8;
              const len = 0.12 * power;
              const c = 0.05 + t * 0.25 * power;
              const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
              const e = new THREE.Euler().setFromQuaternion(q);
              return (
                <mesh key={`s${k}`} position={[d.x * c + (k - 1) * 0.012, d.y * c + (k - 1) * 0.01, d.z * c]} rotation={[e.x, e.y, e.z]}>
                  <cylinderGeometry args={[0.0025, 0.0025, len, 6]} />
                  <meshBasicMaterial color="#9fb6d4" transparent opacity={(1 - t) * 0.9} depthWrite={false} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

const gaugeFace = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#f6f2e6";
    ctx.beginPath();
    ctx.arc(128, 128, 126, 0, Math.PI * 2);
    ctx.fill();
    const at = (deg: number, r: number) => [128 + Math.sin((deg * Math.PI) / 180) * r, 128 - Math.cos((deg * Math.PI) / 180) * r];
    // red zone at empty, green at full
    for (const [a0, a1, c] of [
      [-130, -95, "#d6402f"],
      [60, 130, "#3fae6a"],
    ] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.arc(128, 128, 96, ((a0 - 90) * Math.PI) / 180, ((a1 - 90) * Math.PI) / 180);
      ctx.stroke();
    }
    ctx.strokeStyle = INK;
    for (let k = 0; k <= 10; k++) {
      const d = -130 + k * 26;
      const [x0, y0] = at(d, 108);
      const [x1, y1] = at(d, k % 5 === 0 ? 76 : 88);
      ctx.lineWidth = k % 5 === 0 ? 8 : 4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.font = "900 64px Arial Black, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("O2", 128, 190);
  });

const Gauge: React.FC<{ position: Vec3; level: number; frame: number }> = ({ position, level, frame }) => {
  const face = useOwned(gaugeFace);
  const jitter = level > 0.02 && level < 0.98 ? Math.sin(frame * 1.7) * 3 : 0;
  const deg = -130 + 245 * level + jitter;
  return (
    <group position={position}>
      <InkCylinder radius={0.074} height={0.03} rotation={[Math.PI / 2, 0, 0]} color="#c9ced3" ink={0.007} />
      <mesh position={[0, 0, 0.0165]}>
        <circleGeometry args={[0.064, 40]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      <group position={[0, 0, 0.02]} rotation={[0, 0, (-deg * Math.PI) / 180]}>
        <mesh position={[0, 0.025, 0]}>
          <planeGeometry args={[0.008, 0.06]} />
          <meshBasicMaterial color="#c8261c" toneMapped={false} />
        </mesh>
      </group>
      <Ball position={[0, 0, 0.022]} radius={0.007} color={INK} ink={0} />
      {/* stub pipe into the shell */}
      <InkCylinder radius={0.012} height={0.04} position={[0, -0.088, -0.01]} color="#c9ced3" ink={0.004} />
    </group>
  );
};

// A coil of hose: a few stacked torus loops.
const Coil: React.FC<{ position: Vec3; rotation?: Vec3; r: number; color: string; loops?: number }> = ({ position, rotation = [0, 0, 0], r, color, loops = 3 }) => (
  <group position={position} rotation={rotation}>
    {Array.from({ length: loops }, (_, i) => (
      <group key={i} position={[0, i * 0.017, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.009, 8, 32]} />
          <meshToonMaterial color={color} gradientMap={toonRamp} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.0125, 8, 32]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      </group>
    ))}
  </group>
);

const CutawayPack: React.FC<{ frame: number; crack: number; leak: number }> = ({ frame, crack, leak }) => {
  const { w, h, d, t, band } = SHELL;
  const white = "#dcd8ce";
  const inner = "#9aa3ad";
  const fz = d / 2 - t / 2; // front panel centre z
  const cutX = 0.06; // the front is cut away left of this
  const rightW = w / 2 - cutX;
  const level = 1 - Math.min(1, Math.max(0, leak / 0.65)) ** 0.8;
  const fan = frame * 0.9 * (1 - 0.6 * Math.min(1, leak * 1.5));
  return (
    <group position={CUTAWAY}>
      {/* shell: back, right side, top, bottom, the front's right part and a band across its top; left side and the
          front-left are cut away */}
      <RBox size={[w, h, t]} radius={0.008} position={[0, 0, -d / 2 + t / 2]} color={white} />
      <RBox size={[t, h, d]} radius={0.008} position={[w / 2 - t / 2, 0, 0]} color={white} />
      <RBox size={[w, t, d]} radius={0.008} position={[0, h / 2 - t / 2, 0]} color={white} />
      <RBox size={[w, t, d]} radius={0.008} position={[0, -h / 2 + t / 2, 0]} color={white} />
      <RBox size={[rightW, h - band, t]} radius={0.008} position={[cutX + rightW / 2, -band / 2, fz]} color={white} />
      <RBox size={[w, band, t]} radius={0.008} position={[0, h / 2 - band / 2, fz]} color={white} />
      <RBox size={[t, band, d]} radius={0.008} position={[-w / 2 + t / 2, h / 2 - band / 2, 0]} color={white} />
      {/* cut edges painted orange-red, like a museum cutaway */}
      <RBox size={[t + 0.008, h - band + 0.004, t + 0.008]} radius={0.003} position={[cutX, -band / 2, fz]} color={ORANGE} ink={0.004} />
      <RBox size={[cutX + w / 2, t + 0.008, t + 0.008]} radius={0.003} position={[(cutX - w / 2) / 2, h / 2 - band, fz]} color={ORANGE} ink={0.004} />
      <RBox size={[t + 0.008, t + 0.008, d]} radius={0.003} position={[-w / 2 + t / 2, h / 2 - band, 0]} color={ORANGE} ink={0.004} />
      <RBox size={[t + 0.008, t + 0.008, d]} radius={0.003} position={[-w / 2 + t / 2, -h / 2 + t / 2, 0]} color={ORANGE} ink={0.004} />
      <RBox size={[t + 0.008, h - band, t + 0.008]} radius={0.003} position={[-w / 2 + t / 2, -band / 2, -d / 2 + t / 2]} color={ORANGE} ink={0.004} />
      {/* grey lining inside, so the parts read against it */}
      <mesh position={[0, -band / 2 + 0.005, -d / 2 + t + 0.004]}>
        <planeGeometry args={[w - 2 * t, h - band - 2 * t]} />
        <meshToonMaterial color={inner} gradientMap={toonRamp} />
      </mesh>
      {/* purge unit on top, white */}
      <RBox size={[w - 0.08, 0.13, d - 0.05]} radius={0.035} position={[0, h / 2 + 0.067, -0.01]} color="#d0d4da" />
      <Label text="FIBERGLASS" position={[0, h / 2 - band / 2, d / 2 + 0.012]} width={w - 0.04} bg="#fff6dc" />

      {/* inside: the oxygen bottle, standing left of centre */}
      <group position={[-0.12, -0.02, -0.01]}>
        <InkCylinder radius={0.072} height={0.26} position={[0, 0, 0]} color="#3fae6a" ink={0.008} />
        <Ball position={[0, 0.13, 0]} radius={0.072} color="#3fae6a" scale={[1, 0.55, 1]} />
        <Ball position={[0, -0.13, 0]} radius={0.072} color="#3fae6a" scale={[1, 0.45, 1]} />
        <InkCylinder radius={0.018} height={0.04} position={[0, 0.18, 0]} color="#c9ced3" ink={0.005} />
        <RBox size={[0.04, 0.03, 0.03]} radius={0.008} position={[0, 0.205, 0]} color="#d9b35c" ink={0.005} />
        <Label text="OXYGEN" position={[0, 0.03, 0.084]} width={0.15} bg="#fff6dc" />
      </group>
      {/* fan housing with spinning blades, lower right inside */}
      <group position={[0.0, -0.205, -0.03]}>
        <InkCylinder radius={0.065} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#5a6470" ink={0.007} />
        <group position={[0, 0, 0.03]} rotation={[0, 0, fan]}>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} rotation={[0, 0.5, (k * Math.PI) / 2]} position={[Math.cos((k * Math.PI) / 2) * 0.028, Math.sin((k * Math.PI) / 2) * 0.028, 0]}>
              <boxGeometry args={[0.05, 0.022, 0.004]} />
              <meshToonMaterial color="#e8ecf0" gradientMap={toonRamp} />
            </mesh>
          ))}
          <Ball position={[0, 0, 0.004]} radius={0.014} color={ORANGE} ink={0.004} />
        </group>
      </group>
      {/* pump block and coiled hoses */}
      <RBox size={[0.1, 0.08, 0.1]} radius={0.015} position={[0.02, -0.07, -0.05]} color="#7e8a96" ink={0.007} />
      <Coil position={[-0.13, -0.27, 0.02]} r={0.055} color="#2f6fd6" />
      <Coil position={[0.02, 0.08, -0.06]} rotation={[Math.PI / 2, 0, 0]} r={0.04} color="#d6402f" loops={2} />
      {/* a hose from the bottle valve over to the pump */}
      <mesh position={[0, 0.17, -0.02]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.11, 0.009, 8, 24, Math.PI * 0.8]} />
        <meshToonMaterial color="#2f6fd6" gradientMap={toonRamp} />
      </mesh>

      {/* the O2 gauge on the intact front, the crack above it, the air out of the crack */}
      <Gauge position={[0.145, -0.2, d / 2 + 0.016]} level={level} frame={frame} />
      <Crack crack={crack} z={d / 2 + 0.003} />
      <AirJets frame={frame} leak={leak} z={d / 2 + 0.01} />
    </group>
  );
};

// ---------- the workshop ----------

const pegboard = () =>
  canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#f1ece0";
    ctx.fillRect(0, 0, 1024, 512);
    // grime: darker toward the bench, smudges where hands go
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "rgba(120,90,60,0)");
    g.addColorStop(1, "rgba(120,90,60,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = `rgba(110,80,50,${0.05 + rand(i, 51) * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(rand(i, 52) * 1024, rand(i, 53) * 512, 20 + rand(i, 54) * 60, 10 + rand(i, 55) * 30, rand(i, 56) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#6f6458";
    for (let x = 16; x < 1024; x += 32) for (let y = 16; y < 512; y += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // painted tool outlines (shadow boards)
    ctx.strokeStyle = "rgba(200,70,40,0.55)";
    ctx.lineWidth = 6;
    for (const [x, y, ww, hh] of [
      [120, 80, 40, 200],
      [420, 60, 160, 50],
      [760, 120, 50, 220],
    ]) ctx.strokeRect(x, y, ww, hh);
  });

// Hanging hand tools on the pegboard.
const Tools: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    {/* wrenches */}
    {[0, 1, 2].map((i) => (
      <group key={`w${i}`} position={[-0.55 + i * 0.09, 0.1 - i * 0.03, 0]}>
        <RBox size={[0.025, 0.26 - i * 0.03, 0.012]} radius={0.005} position={[0, -0.12, 0]} color="#b9c2cc" ink={0.004} />
        <mesh position={[0, 0.02, 0]}>
          <torusGeometry args={[0.025, 0.01, 8, 20, Math.PI * 1.5]} />
          <meshToonMaterial color="#b9c2cc" gradientMap={toonRamp} />
        </mesh>
      </group>
    ))}
    {/* screwdrivers with orange-red handles */}
    {[0, 1, 2, 3].map((i) => (
      <group key={`s${i}`} position={[-0.15 + i * 0.07, 0.02, 0.01]}>
        <InkCylinder radius={0.017} height={0.1} position={[0, 0.05, 0]} color={i % 2 ? ORANGE : "#f2c14e"} ink={0.004} />
        <InkCylinder radius={0.005} height={0.14} position={[0, -0.07, 0]} color="#c9ced3" ink={0.003} />
      </group>
    ))}
    {/* hammer and a coil of safety wire */}
    <group position={[0.32, -0.02, 0.01]} rotation={[0, 0, 0.1]}>
      <RBox size={[0.03, 0.26, 0.025]} radius={0.008} position={[0, -0.05, 0]} color="#b98a5a" ink={0.004} />
      <RBox size={[0.13, 0.045, 0.04]} radius={0.01} position={[0, 0.09, 0]} color="#5a6470" ink={0.005} />
    </group>
    <mesh position={[0.55, 0.02, 0.01]}>
      <torusGeometry args={[0.07, 0.008, 8, 32]} />
      <meshToonMaterial color={ORANGE} gradientMap={toonRamp} />
    </mesh>
  </group>
);

// The white suit hanging from a rack, empty, with its blue and red connectors.
const HangingSuit: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => {
  const sway = Math.sin(frame * 0.03) * 0.02;
  return (
    <group position={position}>
      <RBox size={[1.0, 0.04, 0.04]} radius={0.015} position={[0, 2.05, 0]} color="#7e8a96" ink={0.006} />
      <InkCylinder radius={0.02} height={2.05} position={[-0.48, 1.025, 0]} color="#7e8a96" ink={0.006} />
      <group position={[0, 2.03, 0]} rotation={[0, 0.25, sway]}>
        <InkCylinder radius={0.006} height={0.1} position={[0, -0.05, 0]} color={INK} ink={0} />
        <RBox size={[0.4, 0.03, 0.03]} radius={0.01} position={[0, -0.1, 0]} color="#b98a5a" ink={0.005} />
        <RBox size={[0.44, 0.55, 0.24]} radius={0.09} position={[0, -0.38, 0]} color="#f3f2ec" />
        <RBox size={[0.16, 0.06, 0.06]} radius={0.02} position={[0, -0.1, 0.02]} color="#d9b35c" ink={0.006} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <InkCylinder radius={0.065} height={0.5} position={[s * 0.27, -0.42, 0]} rotation={[0, 0, s * 0.12]} color="#eceae2" ink={0.012} />
            <InkCylinder radius={0.075} height={0.62} position={[s * 0.12, -0.95, 0]} color="#eceae2" ink={0.012} />
            <RBox size={[0.13, 0.1, 0.2]} radius={0.04} position={[s * 0.12, -1.3, 0.03]} color="#e6e2d6" ink={0.01} />
            <Ball position={[s * 0.29, -0.7, 0]} radius={0.06} color="#e6e2d6" />
          </group>
        ))}
        {[
          [-0.07, "#2f6fd6"],
          [0.07, "#d6402f"],
        ].map(([x, c]) => (
          <InkCylinder key={x as number} radius={0.025} height={0.03} position={[x as number, -0.42, 0.125]} rotation={[Math.PI / 2, 0, 0]} color={c as string} ink={0.005} />
        ))}
        <RBox size={[0.2, 0.025, 0.02]} radius={0.008} position={[0, -0.25, 0.12]} color={ORANGE} ink={0.004} />
      </group>
    </group>
  );
};

const Workbench: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => {
  const flick = 0.94 + 0.06 * Math.sin(frame * 0.31) * Math.sin(frame * 0.13);
  return (
    <group position={position}>
      <RBox size={[2.0, 0.06, 0.62]} radius={0.015} position={[0, 0.9, 0]} color="#b98a5a" />
      <RBox size={[1.9, 0.75, 0.5]} radius={0.02} position={[0, 0.48, -0.04]} color={ORANGE} />
      {[-0.6, 0, 0.6].map((x) => (
        <group key={x}>
          <RBox size={[0.55, 0.3, 0.02]} radius={0.01} position={[x, 0.66, 0.215]} color="#ea6a40" ink={0.006} />
          <RBox size={[0.14, 0.025, 0.03]} radius={0.01} position={[x, 0.7, 0.235]} color="#c9ced3" ink={0.004} />
        </group>
      ))}
      {/* vise, a helmet with its gold visor, a parts tray */}
      <group position={[-0.7, 0.93, 0.05]}>
        <RBox size={[0.18, 0.08, 0.12]} radius={0.015} position={[0, 0.04, 0]} color="#5a6470" ink={0.006} />
        <RBox size={[0.06, 0.1, 0.12]} radius={0.01} position={[0.08, 0.11, 0]} color="#5a6470" ink={0.006} />
      </group>
      <group position={[0.15, 0.93, 0.02]}>
        <RBox size={[0.26, 0.04, 0.24]} radius={0.015} position={[0, 0.02, 0]} color="#d9b35c" ink={0.006} />
        <Ball position={[0, 0.17, 0]} radius={0.15} color="#f3f2ec" ink={0.01} />
        <Ball position={[0, 0.18, 0.04]} radius={0.125} color="#e0a83a" scale={[1, 0.85, 1]} ink={0} />
      </group>
      <RBox size={[0.3, 0.04, 0.18]} radius={0.01} position={[0.6, 0.95, 0.05]} color="#7e8a96" ink={0.006} />
      {[0, 1, 2, 3].map((i) => (
        <Ball key={i} position={[0.5 + i * 0.06, 0.985, 0.05 + (i % 2) * 0.03]} radius={0.015} color={i % 2 ? "#d9b35c" : "#c9ced3"} ink={0.004} />
      ))}
      {/* gooseneck work lamp, warm */}
      <group position={[-0.25, 0.93, 0.1]}>
        <InkCylinder radius={0.07} height={0.025} position={[0, 0.012, 0]} color={ORANGE} ink={0.006} />
        <InkCylinder radius={0.012} height={0.36} position={[0.03, 0.19, 0]} rotation={[0, 0, -0.2]} color="#5a6470" ink={0.004} />
        <InkCylinder radius={0.012} height={0.24} position={[0.15, 0.38, 0]} rotation={[0, 0, -1.2]} color="#5a6470" ink={0.004} />
        <group position={[0.26, 0.36, 0]} rotation={[0, 0, -0.5]}>
          <mesh>
            <coneGeometry args={[0.08, 0.11, 24, 1, true]} />
            <meshToonMaterial color={ORANGE} gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
          <Ball position={[0, -0.04, 0]} radius={0.03} color="#ffd9a0" glow={2.2 * flick} ink={0} />
        </group>
        <Halo position={[0.3, 0.3, 0.06]} size={0.7} color="#ffb060" strength={0.5 * flick} />
      </group>
    </group>
  );
};

// The red warning light on the back wall, bloom-ready when it flashes.
const WarningLight: React.FC<{ frame: number; leak: number }> = ({ frame, leak }) => {
  const pulse = beaconPulse(frame, leak);
  return (
    <group position={BEACON}>
      <RBox size={[0.2, 0.06, 0.1]} radius={0.015} position={[0, -0.09, 0]} color="#5a6470" ink={0.006} />
      <mesh position={[0, -0.04, 0]}>
        <sphereGeometry args={[0.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={pulse > 0.5 ? new THREE.Color("#ff3b30").multiplyScalar(3.2) : new THREE.Color("#7a1a14")} toneMapped={false} />
      </mesh>
      {[-1, 0, 1].map((k) => (
        <mesh key={k} position={[0, -0.04, 0]} rotation={[0, (k * Math.PI) / 3, 0]}>
          <torusGeometry args={[0.102, 0.006, 6, 24, Math.PI]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      ))}
      {pulse > 0 && <Halo position={[0, -0.02, 0.08]} size={0.6 + 1.6 * pulse} color="#ff3b30" strength={0.65 * pulse} />}
      <pointLight position={[0, 0, 0.4]} intensity={6 * pulse} distance={2.5} color="#ff3b30" />
    </group>
  );
};

// How puppets in the shop are lit: the warm lamp over the stand, and the red warning light while air leaks.
export const shopLight = (frame: number, leak = 0): PuppetLight => ({
  tint: "#ffe2c4",
  shadow: 0.15,
  points: [
    { position: [0, 2.0, 0.3], color: "#ffd9a0", strength: 1.8, range: 2.6 },
    { position: [BEACON[0], BEACON[1], BEACON[2] + 0.3], color: "#ff3b30", strength: 3 * beaconPulse(frame, leak), range: 3.5 },
  ],
});

export const PackShopSet: React.FC<{ camera: CameraShot; frame: number; crack?: number; leak?: number; children?: React.ReactNode }> = ({
  camera,
  frame,
  crack = 0,
  leak = 0,
  children,
}) => {
  const board = useOwned(pegboard);
  const pulse = beaconPulse(frame, leak);
  const sway = Math.sin(frame * 0.04) * 0.04;
  return (
    <Room camera={camera} mood="warm" floor="#d8cdb8" wall="#ece6da" width={6} depth={4} wallPattern="plaster" floorPattern="tile">
      {/* pegboard and tools on the back wall */}
      <RBox size={[2.6, 1.3, 0.02]} radius={0.006} position={[-0.1, 1.65, BACK_Z + 0.075]} color="#ffffff" ink={0.006} map={board} />
      <Tools position={[-0.1, 1.75, BACK_Z + 0.1]} />
      <Workbench position={[-0.1, 0, BACK_Z + 0.42]} frame={frame} />
      <HangingSuit position={[-1.05, 0, -1.0]} frame={frame} />
      {/* a tall cabinet on the right, orange-red, with a white stencil band */}
      <RBox size={[0.6, 1.9, 0.45]} radius={0.04} position={[1.35, 0.95, BACK_Z + 0.35]} color={ORANGE} />
      <RBox size={[0.5, 0.08, 0.02]} radius={0.01} position={[1.35, 1.5, BACK_Z + 0.585]} color="#f3f2ec" ink={0.004} />
      <WarningLight frame={frame} leak={leak} />

      {/* the stand */}
      <group position={[CUTAWAY[0], 0, CUTAWAY[2]]}>
        <InkCylinder radius={0.24} height={0.04} position={[0, 0.02, 0]} color="#5a6470" ink={0.01} />
        <InkCylinder radius={0.035} height={0.66} position={[0, 0.37, 0]} color="#c9ced3" ink={0.008} />
        <RBox size={[0.4, 0.04, 0.3]} radius={0.012} position={[0, CUTAWAY[1] - SHELL.h / 2 - 0.02, 0]} color={ORANGE} />
      </group>
      <CutawayPack frame={frame} crack={crack} leak={leak} />

      {/* warm hanging lamp over the stand, swaying a touch, its light cone in the haze */}
      <group position={[0.05, 3.2, 0.15]} rotation={[sway * 0.3, 0, sway]}>
        <InkCylinder radius={0.006} height={1.0} position={[0, -0.5, 0]} color={INK} ink={0} />
        <mesh position={[0, -1.08, 0]}>
          <coneGeometry args={[0.2, 0.18, 32, 1, true]} />
          <meshToonMaterial color={ORANGE} gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
        <Ball position={[0, -1.15, 0]} radius={0.05} color="#ffe2b0" glow={1.8} ink={0} />
        <group userData={{ ghost: true }}>
          <mesh position={[0, -1.85, 0]}>
            <coneGeometry args={[0.7, 1.4, 40, 1, true]} />
            <meshBasicMaterial color="#ffc070" transparent opacity={0.06} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <pointLight position={[0, 2.0, 0.5]} intensity={1.2} distance={4} color="#ffd9a0" />
      <Halo position={[-0.3, 1.5, BACK_Z + 0.12]} size={3} color="#ffb060" strength={0.1} />
      {/* the room goes a little red while the alarm flashes */}
      <pointLight position={[-0.3, 1.4, -1.3]} intensity={4 * pulse} distance={3} color="#ff3b30" />
      {pulse > 0 && (
        <mesh position={[0, 1.4, BACK_Z + 0.13]}>
          <planeGeometry args={[6, 3]} />
          <meshBasicMaterial color="#ff2a1a" transparent opacity={0.2 * pulse} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {children}
    </Room>
  );
};
