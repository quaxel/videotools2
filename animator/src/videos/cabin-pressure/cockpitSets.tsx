import React from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, Halo, PuppetLight, SkyDome, Vec3 } from "../../engine";
import { Ball, Cyl, RBox } from "../dog-nose/props";
import { LightShaft, Lights, Motes, useOwnedTex } from "../dog-nose/sets";
import { rnd } from "../pisces-sign/props";
import { glowColor, Puff } from "./cockpitProps";

// The flight deck of "cabin-pressure" (guide/references/airliner-cockpit.md), built to puppet scale (the puppets'
// heads are half a metre wide, so the seats sit 1.1 m apart). The nose points to -z: windscreen at z -0.98..-0.72,
// glareshield top y 0.95, main panel below it facing the seats, the pedestal between them, the overhead panel
// sloping up from the windscreen header. The rear is open: cameras stand behind the seats (where a jump seat would
// be) and look forward. Pilots sit with `sit: true` at CAPT / FO in profile facing the centre (seen from behind,
// their seat backs hide their bodies as in a photo from the jump seat).
// Modes: cruise (dark teal, calm daylight over the cloud sea) and dive (slate blue, master warning flashing red, the
// nose pitched down by `pitch` radians and the cloud sea rushing up by `descent` 0..1).

export const CAPT: [number, number] = [-0.55, 0];
export const FO: [number, number] = [0.55, 0];
export const GLARE = { top: 0.95, front: -0.6, back: -0.98 };
export const POD: Vec3 = [0, 1.13, -0.8]; // centre of the big story dial on the glareshield
export const POD_SIZE = 0.3;
export const WARN_X = 0.21; // the red MASTER WARN buttons at x ±WARN_X on the glareshield front
// Each pilot's yoke: centre of the wheel (push moves it toward -z), horns ±0.12 in x.
export const yokeAt = (side: number, push = 0): Vec3 => [side * 0.55, 0.57, -0.27 - push];
export const maskBoxAt = (side: number): Vec3 => [side * 0.84, 0.52, -0.06];
export type CockpitMode = "cruise" | "dive";

const PANEL = "#2c3540";
const DARK = "#1c2128";
const FRAME = "#22272e";

// ---------- painted textures ----------

const panelTex = (base: string) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rnd(i) > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.08)";
      ctx.beginPath();
      ctx.ellipse(rnd(i + 1) * 512, rnd(i + 2) * 512, 20 + rnd(i + 3) * 60, 6 + rnd(i + 4) * 14, rnd(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 3;
    for (let x = 0; x < 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
  });

// Overhead panel: rows of switch blocks, little lit pushbuttons in amber and white, black toggles.
const overheadTex = (lit: boolean) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = lit ? "rgba(0,0,0,0)" : "#3a4552";
    ctx.fillRect(0, 0, 1024, 1024);
    if (!lit) {
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 6;
      for (let y = 0; y < 1024; y += 170) ctx.strokeRect(10, y + 10, 1004, 150);
      for (let x = 0; x < 1024; x += 256) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
      }
    }
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 16; c++) {
        const x = 30 + c * 62 + (r % 2) * 14;
        const y = 40 + r * 170;
        const kind = rnd(r * 31 + c);
        if (!lit) {
          ctx.fillStyle = "#1c2128";
          ctx.fillRect(x, y, 40, 30);
          ctx.fillStyle = "#e8e4d8";
          ctx.fillRect(x + 4, y + 70, 32, 6);
          ctx.fillStyle = "#14171b";
          ctx.beginPath();
          ctx.arc(x + 20, y + 110, 9, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind > 0.45) {
          ctx.fillStyle = kind > 0.8 ? "#ffffff" : kind > 0.6 ? "#ffb43a" : "#7fe0a0";
          ctx.fillRect(x + 6, y + 8, 28, 10);
        }
      }
  });

// Displays: attitude ball (blue over brown), map arcs (green and magenta), engine/warning page (dials and text bars).
const screenTex = (kind: "pfd" | "nd" | "ecam" | "ecam2", alarm: boolean) =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#06080c";
    ctx.fillRect(0, 0, 256, 256);
    if (kind === "pfd") {
      ctx.save();
      ctx.beginPath();
      ctx.rect(40, 30, 176, 196);
      ctx.clip();
      ctx.fillStyle = "#3a8ee8";
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = "#9a5a2c";
      ctx.fillRect(0, 128, 256, 128);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 126, 256, 4);
      for (let i = -2; i <= 2; i++) if (i) ctx.fillRect(108, 128 - i * 22, 40, 3);
      ctx.restore();
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(80, 124, 36, 8);
      ctx.fillRect(140, 124, 36, 8);
      ctx.fillStyle = "#2a2f36";
      ctx.fillRect(4, 30, 30, 196);
      ctx.fillRect(222, 30, 30, 196);
      ctx.fillStyle = "#7fe0a0";
      for (let i = 0; i < 8; i++) ctx.fillRect(8, 40 + i * 24, 18, 3);
    } else if (kind === "nd") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(128, 220, 170, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.strokeStyle = "#46e08a";
      ctx.beginPath();
      ctx.arc(128, 220, 100, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.strokeStyle = "#e05ad8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(128, 220);
      ctx.lineTo(150, 120);
      ctx.lineTo(190, 50);
      ctx.stroke();
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath();
      ctx.moveTo(118, 225);
      ctx.lineTo(138, 225);
      ctx.lineTo(128, 200);
      ctx.fill();
      ctx.fillStyle = "#46e08a";
      for (let i = 0; i < 4; i++) ctx.fillRect(20 + i * 50, 20, 30, 6);
    } else {
      // engine dials (top) or the warning page (bottom); red text bars in the alarm
      for (let i = 0; i < 2; i++) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(70 + i * 116, kind === "ecam" ? 80 : 60, 40, Math.PI * 0.8, Math.PI * 2.1);
        ctx.stroke();
        ctx.strokeStyle = "#46e08a";
        ctx.beginPath();
        ctx.moveTo(70 + i * 116, kind === "ecam" ? 80 : 60);
        ctx.lineTo(70 + i * 116 + 30, (kind === "ecam" ? 80 : 60) - 22);
        ctx.stroke();
      }
      for (let l = 0; l < 4; l++) {
        ctx.fillStyle = alarm && l < 2 ? "#ff3a3a" : l % 2 ? "#46e08a" : "#5ad8ff";
        ctx.fillRect(20, 150 + l * 24, alarm && l < 2 ? 200 : 120 + rnd(l) * 80, 12);
      }
    }
  });

// The selected altitude on the glareshield panel: cruise level, or the emergency descent target in the dive.
const fcuTex = (dive = false) =>
  canvasTexture(1024, 96, (ctx) => {
    ctx.fillStyle = "#2a323c";
    ctx.fillRect(0, 0, 1024, 96);
    ctx.fillStyle = "#07090b";
    [60, 300, 560, 800].forEach((x) => ctx.fillRect(x, 18, 170, 60));
    ctx.fillStyle = "#ffb43a";
    ctx.font = "900 46px 'Arial Black', Impact, sans-serif";
    ctx.textBaseline = "middle";
    ["250", "HDG", dive ? "FL100" : "FL350", dive ? "-60" : "-00"].forEach((t, i) => ctx.fillText(t, [70, 310, 568, 812][i], 50));
    ctx.fillStyle = "#7fe0a0";
    [250, 500, 760].forEach((x) => ctx.fillRect(x, 40, 22, 14));
  });

// The cloud sea seen from 35,000 ft: white heaps on a pale base, blue-grey shadow undersides.
const cloudSeaTex = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#e9eef6";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 260; i++) {
      const x = rnd(i) * 1024;
      const y = rnd(i + 500) * 1024;
      const r = 20 + rnd(i + 7) * 70;
      ctx.fillStyle = "rgba(150,170,200,0.25)";
      ctx.beginPath();
      ctx.ellipse(x + r * 0.15, y + r * 0.25, r, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.9, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// High-altitude sky: deep navy overhead, a thin pale haze band on the horizon.
const HIGH_SKY: [number, string][] = [
  [-0.1, "#dfeaf6"],
  [0.0, "#d6e6f6"],
  [0.025, "#a9c8ee"],
  [0.07, "#5f93dc"],
  [0.18, "#2f63bf"],
  [0.4, "#1a4296"],
  [1.0, "#0c2462"],
];
const DIVE_SKY: [number, string][] = [
  [-0.1, "#c9d3e2"],
  [0.0, "#c2cfe0"],
  [0.03, "#93abd0"],
  [0.08, "#5a7cb8"],
  [0.2, "#34548f"],
  [0.45, "#22396d"],
  [1.0, "#142451"],
];

// The world outside the windscreen: sky dome round the camera, the low sun, the cloud sea far below with its curved
// edge, and cloud heaps that rise and rush past in the dive. `pitch` (radians, + = nose down) turns it about the
// cockpit's x axis, `descent` 0..1 brings the cloud sea up toward the aircraft.
const Outside: React.FC<{ camera: CameraShot; f: number; mode: CockpitMode; pitch: number; descent: number }> = ({ camera, f, mode, pitch, descent }) => {
  const sea = useOwnedTex(() => {
    const t = cloudSeaTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(26, 26);
    return t;
  });
  const sun: Vec3 = [0.9, 0.55, -1];
  const seaY = -46 + 38 * descent;
  // cloud heaps: ahead and below, drifting toward the aircraft (cruise: slowly; dive: rushing up and past)
  const speed = mode === "dive" ? 0.9 + 3.2 * descent : 0.12;
  const heaps = Array.from({ length: mode === "dive" ? 16 : 9 }, (_, i) => {
    const span = 140;
    const z = -150 + ((rnd(i + 3) * span + f * speed) % span);
    const wide = mode === "dive" ? 50 : 120;
    return { p: [(rnd(i) - 0.5) * wide, seaY + 4 + rnd(i + 9) * 6 + (mode === "dive" ? descent * (z + 150) * 0.08 : 0), z] as Vec3, s: 3 + rnd(i + 5) * 5, seed: i * 7 };
  });
  return (
    <group rotation={[pitch, 0, 0]}>
      <group position={camera.position}>
        <SkyDome sun={sun} stops={mode === "dive" ? DIVE_SKY : HIGH_SKY} glow="#fff6e0" />
      </group>
      <mesh position={[sun[0] * 260, sun[1] * 260, sun[2] * 260]} onUpdate={(m) => m.lookAt(0, 0, 0)}>
        <circleGeometry args={[7, 40]} />
        <meshBasicMaterial color={glowColor("#fffbea", 1.6)} fog={false} toneMapped={false} depthWrite={false} />
      </mesh>
      <Halo position={[sun[0] * 250, sun[1] * 250, sun[2] * 250]} size={90} color="#fff2cf" strength={0.5} />
      {/* the cloud sea: a huge flattened ellipsoid, so its far edge curves down at the sides like the horizon */}
      <mesh position={[0, seaY - 30, -60]} scale={[900, 30, 900]}>
        <sphereGeometry args={[1, 96, 48]} />
        <meshStandardMaterial map={sea} color="#ffffff" emissive="#9fb2cc" emissiveIntensity={0.35} roughness={1} />
      </mesh>
      {heaps.map((h, i) => (
        <Puff key={i} position={h.p} s={h.s} seed={h.seed} />
      ))}
    </group>
  );
};

// A pilot seat facing -z: cushion, back up to just under the shoulders (so the head and arms show above it from
// behind), armrests, a sheepskin-cream cover on the back's front, the column it stands on.
const PilotSeat: React.FC<{ at: [number, number] }> = ({ at }) => (
  <group position={[at[0], 0, at[1]]}>
    <Cyl r={0.08} h={0.2} position={[0, 0.1, 0.06]} color="#3a3f46" />
    <RBox size={[0.46, 0.1, 0.44]} position={[0, 0.25, 0.04]} color="#2b3f6e" radius={0.045} rough={0.85} />
    <RBox size={[0.5, 0.36, 0.12]} position={[0, 0.44, 0.26]} rotation={[0.08, 0, 0]} color="#2b3f6e" radius={0.06} rough={0.85} />
    <RBox size={[0.4, 0.3, 0.03]} position={[0, 0.45, 0.19]} rotation={[0.08, 0, 0]} color="#d8d1bf" radius={0.012} rough={1} />
    {/* seam across the back's rear */}
    <RBox size={[0.42, 0.012, 0.01]} position={[0, 0.5, 0.33]} rotation={[0.08, 0, 0]} color="#1e2d52" radius={0.004} />
    {[-1, 1].map((s) => (
      <RBox key={s} size={[0.055, 0.05, 0.32]} position={[s * 0.27, 0.46, 0.02]} color="#1f2a44" radius={0.022} />
    ))}
  </group>
);

// The observer's jump seat behind the pilots (it frames the shots from the back of the flight deck): a fold-down
// seat on a post, a tall back with a sheepskin cover and a headrest, top at OBS_TOP.
export const OBS: [number, number] = [-0.05, 2.1];
export const OBS_TOP = 1.1;
const ObserverSeat: React.FC = () => (
  <group position={[OBS[0], 0, OBS[1]]}>
    <Cyl r={0.05} h={0.3} position={[0, 0.15, 0.1]} color="#3a3f46" />
    <RBox size={[0.42, 0.08, 0.36]} position={[0, 0.33, 0.02]} color="#2b3f6e" radius={0.035} rough={0.85} />
    <RBox size={[0.44, 0.62, 0.1]} position={[0, 0.68, 0.2]} rotation={[0.06, 0, 0]} color="#2b3f6e" radius={0.05} rough={0.85} />
    <RBox size={[0.36, 0.5, 0.03]} position={[0, 0.68, 0.14]} rotation={[0.06, 0, 0]} color="#d8d1bf" radius={0.012} rough={1} />
    <RBox size={[0.3, 0.16, 0.12]} position={[0, OBS_TOP - 0.08, 0.2]} color="#26375f" radius={0.05} rough={0.85} />
    {[-1, 1].map((s) => (
      <RBox key={s} size={[0.05, 0.6, 0.012]} position={[s * 0.1, 0.72, 0.125]} rotation={[0.06, 0, s * 0.1]} color="#8a8f96" radius={0.004} />
    ))}
  </group>
);

// A yoke: column out of the floor, a ram's-horn wheel facing the pilot, a small checklist clip.
export const Yoke: React.FC<{ position: Vec3; turn?: number }> = ({ position, turn = 0 }) => (
  <group>
    <Cyl r={0.025} h={position[1] - 0.05} position={[position[0], (position[1] - 0.05) / 2, position[2] - 0.06]} rotation={[0.12, 0, 0]} color="#3a3f46" />
    <group position={position} rotation={[0, 0, turn]}>
      <RBox size={[0.08, 0.06, 0.05]} position={[0, -0.02, 0]} color="#2a2e34" radius={0.02} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <RBox size={[0.12, 0.035, 0.035]} position={[s * 0.07, 0.0, 0]} color="#2a2e34" radius={0.016} />
          <RBox size={[0.035, 0.1, 0.035]} position={[s * 0.125, 0.04, 0]} rotation={[0, 0, -s * 0.15]} color="#2a2e34" radius={0.016} />
          <RBox size={[0.012, 0.02, 0.02]} position={[s * 0.13, 0.08, 0.015]} color="#d8322c" radius={0.005} />
        </group>
      ))}
      <RBox size={[0.06, 0.04, 0.005]} position={[0, -0.02, 0.026]} color="#e8e4d8" radius={0.003} />
    </group>
  </group>
);

// One display in its bezel on the main panel.
const Display: React.FC<{ position: Vec3; kind: "pfd" | "nd" | "ecam" | "ecam2"; alarm: boolean; k: number; size?: number }> = ({ position, kind, alarm, k, size = 0.2 }) => {
  const tex = useOwnedTex(() => screenTex(kind, alarm), [kind, alarm]);
  return (
    <group position={position}>
      <RBox size={[size + 0.04, size + 0.04, 0.03]} position={[0, 0, -0.012]} color="#181b20" radius={0.012} />
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={tex} color={glowColor("#ffffff", k)} toneMapped={false} />
      </mesh>
    </group>
  );
};

// A glareshield push button (MASTER WARN red, MASTER CAUTION amber): lit `on` 0..1 (> 0.5 blooms).
const WarnButton: React.FC<{ position: Vec3; color: string; on: number }> = ({ position, color, on }) => (
  <group position={position}>
    <RBox size={[0.075, 0.05, 0.03]} color="#15181c" radius={0.01} />
    <mesh position={[0, 0, 0.017]}>
      <planeGeometry args={[0.06, 0.036]} />
      <meshBasicMaterial color={glowColor(color, 0.35 + 2.2 * on)} toneMapped={false} />
    </mesh>
    {on > 0.05 && <Halo position={[0, 0, 0.03]} size={0.32} color={color} strength={0.55 * on} />}
  </group>
);

// The master warning flash: on in quick irregular bursts (not a steady sine), 0..1.
export const warnFlash = (f: number) => {
  if (f < 0) return 0;
  const period = 9 + Math.round(2 * Math.sin(f * 0.13));
  const c = f % period;
  return c < 5 ? 1 - c * 0.08 : 0.08;
};

// The puppets' light: windscreen daylight from ahead and above; in the dive the red flash on the glareshield.
export const cockpitLight = (mode: CockpitMode, f: number): PuppetLight => ({
  tint: mode === "dive" ? "#9aa8c8" : "#bfe0dc",
  shadow: 0.16,
  distant: [{ direction: [0.1, 0.55, -1], color: mode === "dive" ? "#c8d6f0" : "#eaf4ff", strength: mode === "dive" ? 0.9 : 1.25 }],
  points: mode === "dive" ? [{ position: [0, 0.98, GLARE.front + 0.05], color: "#ff2a2a", strength: 2.6 * warnFlash(f), range: 1.5 }] : [],
});

// The flight deck. `children` are drawn in it (the story dial, masks, hoses, effects).
export const CockpitSet: React.FC<{
  camera: CameraShot;
  f: number;
  mode: CockpitMode;
  pitch?: number;
  descent?: number;
  thrust?: number; // thrust lever angle 0 (idle) .. 1 (climb)
  yokePush?: number;
  children?: React.ReactNode;
}> = ({ camera, f, mode, pitch = 0, descent = 0, thrust = 0.75, yokePush = 0, children }) => {
  const dive = mode === "dive";
  const panel = useOwnedTex(() => panelTex(PANEL));
  const dark = useOwnedTex(() => panelTex(DARK));
  const over = useOwnedTex(() => overheadTex(false));
  const overLit = useOwnedTex(() => overheadTex(true));
  const fcu = useOwnedTex(() => fcuTex(dive), [dive]);
  const flash = dive ? warnFlash(f) : 0;
  const screenK = dive ? 1.15 : 1.3;
  // windscreen geometry: base on the glareshield's back edge, top under the overhead header
  const wsBase = { y: GLARE.top, z: GLARE.back };
  const wsTop = { y: 1.78, z: -0.72 };
  const wsLen = Math.hypot(wsTop.y - wsBase.y, wsTop.z - wsBase.z);
  const wsTilt = Math.atan2(wsTop.z - wsBase.z, wsTop.y - wsBase.y); // lean back from vertical
  const wsMid: Vec3 = [0, (wsBase.y + wsTop.y) / 2, (wsBase.z + wsTop.z) / 2];
  const bg = dive ? "#2a3550" : "#123a3a";
  const lever = (s: number) => 0.5 - thrust + s * 0.02; // forward (-z) is more thrust
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[dive ? "#9fb0cc" : "#c8dcf0", 60, 420]} />
      <Lights camera={camera} sun={[0.6, 4.5, -5]} sunColor={dive ? "#c8d6f0" : "#f2f8ff"} sunK={dive ? 1.3 : 1.7} sky={dive ? "#7f93bf" : "#9fd0cc"} ground={dive ? "#20283a" : "#1f3433"} hemiK={dive ? 0.75 : 0.9} ambient={0.22} box={3} />
      {/* warm bounce off the glareshield and a teal glow from the displays */}
      <pointLight position={[0, 0.75, -0.35]} intensity={dive ? 0.5 : 0.8} distance={2.2} color={dive ? "#7f8fb8" : "#5fd0c0"} />
      <pointLight position={[0, 1.3, 1.2]} intensity={0.6} distance={3} color={dive ? "#8090c0" : "#ffe2c0"} />
      {dive && <pointLight position={[0, 1.0, GLARE.front + 0.1]} intensity={3.2 * flash} distance={2.6} color="#ff2a2a" />}
      <Outside camera={camera} f={f} mode={mode} pitch={pitch} descent={descent} />

      {/* floor, side walls round the side windows, ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.8]} receiveShadow>
        <planeGeometry args={[2.6, 4.6]} />
        <meshStandardMaterial color="#3a4250" roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* lower wall with the side console, upper wall above the side window, the window's rear post */}
          <RBox size={[0.08, 0.95, 4.0]} position={[s * 1.18, 0.47, 1.0]} rotation={[0, 0, s * 0.06]} color="#ffffff" map={panel} radius={0.02} />
          <RBox size={[0.08, 0.6, 4.0]} position={[s * 1.1, 1.85, 1.0]} rotation={[0, 0, -s * 0.18]} color="#ffffff" map={panel} radius={0.02} />
          <RBox size={[0.09, 0.62, 0.1]} position={[s * 1.15, 1.25, 0.28]} color={FRAME} radius={0.03} />
          <RBox size={[0.09, 0.62, 0.1]} position={[s * 1.15, 1.25, 1.2]} color={FRAME} radius={0.03} />
          <RBox size={[0.08, 0.62, 2.2]} position={[s * 1.17, 1.25, 2.3]} color="#ffffff" map={panel} radius={0.02} />
          {/* side console and the mask box on it */}
          <RBox size={[0.3, 0.12, 0.9]} position={[s * 0.96, 0.46, -0.05]} color="#ffffff" map={dark} radius={0.03} />
          <RBox size={[0.26, 0.42, 0.86]} position={[s * 0.98, 0.2, -0.05]} color="#ffffff" map={panel} radius={0.03} />
          {/* the reading/flood light over each seat */}
          <Ball position={[s * 0.62, 2.0, 0.55]} radius={0.03} color={glowColor("#fff1d6", 1.4).getStyle()} glow />
        </group>
      ))}
      <RBox size={[2.4, 0.06, 3.2]} position={[0, 2.12, 1.4]} color="#ffffff" map={panel} radius={0.02} />

      {/* overhead panel: sloping up from the windscreen header, switches and lit buttons */}
      <group position={[0, 1.94, -0.14]} rotation={[-0.27, 0, 0]}>
        <RBox size={[1.5, 0.08, 1.25]} color="#ffffff" map={dark} radius={0.03} />
        <mesh position={[0, -0.042, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.36, 1.15]} />
          <meshStandardMaterial map={over} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.044, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.36, 1.15]} />
          <meshBasicMaterial map={overLit} color={glowColor("#ffffff", dive ? 1.2 : 1.45)} transparent toneMapped={false} depthWrite={false} />
        </mesh>
        {/* a few raised guards and knobs so it reads 3D */}
        {Array.from({ length: 14 }, (_, i) => (
          <RBox key={i} size={[0.05, 0.03, 0.035]} position={[-0.6 + (i % 7) * 0.2, -0.055, -0.35 + Math.floor(i / 7) * 0.5]} color={i % 4 === 0 ? "#c8c4b8" : "#1a1d22"} radius={0.01} />
        ))}
      </group>

      {/* windscreen: header, sill, centre post, corner posts, the side panes angled back, a faint glass sheen */}
      <group position={wsMid} rotation={[wsTilt, 0, 0]}>
        <RBox size={[2.2, 0.1, 0.12]} position={[0, wsLen / 2, 0]} color={FRAME} radius={0.04} />
        <RBox size={[0.08, wsLen, 0.1]} position={[0, 0, 0]} color={FRAME} radius={0.035} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <RBox size={[0.09, wsLen, 0.1]} position={[s * 0.74, 0, 0]} color={FRAME} radius={0.035} />
            <RBox size={[0.09, wsLen, 0.1]} position={[s * 1.1, 0, 0.28]} rotation={[0, s * 0.6, 0]} color={FRAME} radius={0.035} />
            {/* wiper parked on the sill */}
            <RBox size={[0.36, 0.015, 0.02]} position={[s * 0.36, -wsLen / 2 + 0.05, 0.02]} rotation={[0, 0, s * 0.12]} color="#111316" radius={0.006} />
          </group>
        ))}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[2.1, wsLen]} />
          <meshBasicMaterial color="#cfe4ff" transparent opacity={0.04} depthWrite={false} />
        </mesh>
        {[-0.45, 0.32].map((x, i) => (
          <mesh key={x} position={[x, 0.1 + i * 0.12, -0.005]} rotation={[0, 0, 0.7]}>
            <planeGeometry args={[0.03, 0.5]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.07} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* glareshield: dark padded shelf, autopilot strip, master warn and caution buttons */}
      <RBox size={[2.1, 0.12, GLARE.front - GLARE.back]} position={[0, GLARE.top - 0.06, (GLARE.front + GLARE.back) / 2]} color="#ffffff" map={dark} radius={0.05} rough={0.9} />
      <RBox size={[2.1, 0.08, 0.1]} position={[0, GLARE.top - 0.1, GLARE.front + 0.02]} color={DARK} radius={0.04} rough={0.9} />
      <mesh position={[0, GLARE.top - 0.1, GLARE.front + 0.073]}>
        <planeGeometry args={[0.8, 0.075]} />
        <meshBasicMaterial map={fcu} color={glowColor("#ffffff", 1.25)} toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <WarnButton position={[s * WARN_X, GLARE.top - 0.1, GLARE.front + 0.08]} color="#ff2a2a" on={flash} />
          <WarnButton position={[s * (WARN_X + 0.09), GLARE.top - 0.1, GLARE.front + 0.08]} color="#ffb000" on={dive ? 0.7 : 0} />
        </group>
      ))}

      {/* main panel under the glareshield, tilted back a little: six displays and the standby gauges */}
      <group position={[0, 0.62, GLARE.front + 0.03]} rotation={[-0.2, 0, 0]}>
        <RBox size={[2.0, 0.5, 0.08]} color="#ffffff" map={panel} radius={0.03} />
        <Display position={[-0.75, 0.04, 0.05]} kind="pfd" alarm={dive} k={screenK} />
        <Display position={[-0.47, 0.04, 0.05]} kind="nd" alarm={dive} k={screenK} />
        <Display position={[0.47, 0.04, 0.05]} kind="nd" alarm={dive} k={screenK} />
        <Display position={[0.75, 0.04, 0.05]} kind="pfd" alarm={dive} k={screenK} />
        <Display position={[0, 0.1, 0.05]} kind="ecam" alarm={dive} k={screenK} size={0.18} />
        {[-0.2, 0.2].map((x) => (
          <group key={x} position={[x, 0.12, 0.05]}>
            <Cyl r={0.045} h={0.03} rotation={[Math.PI / 2, 0, 0]} color="#15181c" />
            <mesh position={[0, 0, 0.017]}>
              <circleGeometry args={[0.036, 24]} />
              <meshBasicMaterial color={glowColor(x < 0 ? "#3a8ee8" : "#2a2f36", 1.0)} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* pedestal between the seats: thrust levers, radio boxes, trim wheel */}
      <group>
        <RBox size={[0.36, 0.56, 0.6]} position={[0, 0.28, -0.34]} color="#ffffff" map={panel} radius={0.04} />
        <RBox size={[0.34, 0.06, 0.56]} position={[0, 0.58, -0.34]} rotation={[0.12, 0, 0]} color={DARK} radius={0.025} />
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.055, 0.6, -0.3]} rotation={[lever(s), 0, 0]}>
            <RBox size={[0.03, 0.14, 0.025]} position={[0, 0.07, 0]} color="#c8ccd2" radius={0.01} rough={0.35} />
            <RBox size={[0.07, 0.04, 0.05]} position={[s * 0.012, 0.15, 0]} color="#2a2e34" radius={0.018} />
          </group>
        ))}
        {[-0.12, 0.12].map((x, i) => (
          <mesh key={x} position={[x, 0.615, -0.48 + i * 0.02]} rotation={[-Math.PI / 2 + 0.12, 0, 0]}>
            <planeGeometry args={[0.07, 0.12]} />
            <meshBasicMaterial color={glowColor(i ? "#7fe0a0" : "#ffb43a", 1.1)} toneMapped={false} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <Cyl key={`t${s}`} r={0.09} h={0.03} position={[s * 0.19, 0.42, -0.25]} rotation={[0, 0, Math.PI / 2]} color="#1c1f24" />
        ))}
      </group>

      <ObserverSeat />
      <PilotSeat at={CAPT} />
      <PilotSeat at={FO} />
      <Yoke position={yokeAt(-1, yokePush)} turn={dive ? 0.05 * Math.sin(f * 0.21) : 0.02 * Math.sin(f * 0.04)} />
      <Yoke position={yokeAt(1, yokePush * 0.5)} turn={dive ? 0.05 * Math.sin(f * 0.21) : 0.02 * Math.sin(f * 0.04)} />

      {/* sunlight through the windscreen, dust in it */}
      <LightShaft from={[0.35, 1.5, -0.9]} to={[0.1, 0.6, 0.6]} width={0.9} color={dive ? "#b8c8ff" : "#e8f6ff"} opacity={dive ? 0.06 : 0.1} />
      <Motes center={[0, 1.2, -0.1]} size={[1.6, 0.9, 1.4]} f={f} count={40} color="#eaf6ff" r={0.005} />
      {children}
    </>
  );
};
