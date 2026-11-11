import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Crates, Halo, Screen } from "./kit";
import { Ridge, SmokePlume } from "./LakeSet";
import { MOODS } from "./moods";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import type { PuppetLight } from "../puppet/PuppetBillboard";
import { rand } from "../engine/helpers";

// Moon base control deck: a metal-plated room (floor y = 0, back wall at z = -3) with a panoramic window onto the
// lunar surface, a ringed planet and Earth. A hologram table stands in the middle at `HOLO` (cyan light), an airlock
// with a rotating red warning beacon on the right at `AIRLOCK.x`, a console and radar on the left. Outside: craters,
// a rover, a turning dish, a rocket venting steam, habitat domes and grey ridges with parallax.
// Puppets stand around the table (x HOLO ± 0.6) or at the window (z > -2.6). Light them with `spaceLight(frame)`.

type Vec3 = [number, number, number];
const INK = "#161212";

export const HOLO: Vec3 = [0, 0, 0.3];
export const AIRLOCK = { x: 2.35 };
const BACK_Z = -3;
const WIN = { half: 1.4, bottom: 0.55, top: 2.55 };
const ROOM = { half: 4.5, height: 3.2 };
const OUT_Y = -0.5;
const BEACON: Vec3 = [AIRLOCK.x, 2.62, BACK_Z + 0.32];

// The hologram dims for two frames now and then, like a projector catching.
const holoFlicker = (frame: number) => (frame % 37 < 2 ? 0.55 : 1) * (0.92 + 0.08 * Math.sin(frame * 0.7));
// The beacon's beam turns round the vertical axis; 1 while it sweeps across the room (+z).
const beaconAngle = (frame: number) => frame * 0.16;
const beaconPulse = (frame: number) => Math.max(0, Math.cos(beaconAngle(frame))) ** 6;

// How the puppets are lit here (Stage `light`): the hologram's cyan on the side facing the table, the beacon's red
// flash as its beam passes, and a cool rim from the window behind them. The room's blue barely tints them.
export const spaceLight = (frame: number): PuppetLight => ({
  tint: "#8fa0ff",
  shadow: 0.2,
  points: [
    { position: [HOLO[0], 1.15, HOLO[2]], color: "#4ff3ff", strength: 4.2 * holoFlicker(frame), range: 1.25 },
    { position: [BEACON[0], BEACON[1], BEACON[2] + 0.3], color: "#ff3b30", strength: 3.5 * beaconPulse(frame), range: 3 },
  ],
  distant: [{ direction: [0.2, 0.3, -1], color: "#9fc0ff", strength: 0.6 }],
});

const repeated = (t: THREE.Texture, x: number, y: number) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  return t;
};

// Riveted deck plates.
const plateTexture = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#3a4050";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const x = i * 128;
        const y = j * 128;
        ctx.fillStyle = (i + j) % 2 ? "#3d4454" : "#373d4c";
        ctx.fillRect(x + 4, y + 4, 120, 120);
        ctx.fillStyle = "#4c5466";
        ctx.fillRect(x + 4, y + 4, 120, 3);
        ctx.fillStyle = "#5a6378";
        for (const [dx, dy] of [
          [14, 14],
          [114, 14],
          [14, 114],
          [114, 114],
        ]) {
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    ctx.fillStyle = "#22262f";
    for (let k = 0; k <= 4; k++) {
      ctx.fillRect(k * 128 - 3, 0, 6, 512);
      ctx.fillRect(0, k * 128 - 3, 512, 6);
    }
  });

// Upright wall panels with seams and a vent grille.
const panelTexture = () =>
  canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = "#566078";
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = "#4a5368";
    ctx.fillRect(0, 0, 8, 512);
    ctx.fillRect(0, 300, 256, 6);
    ctx.fillStyle = "#6a758e";
    ctx.fillRect(8, 0, 3, 512);
    ctx.fillStyle = "#3a4256";
    for (let k = 0; k < 6; k++) ctx.fillRect(60, 360 + k * 18, 136, 8);
  });

const hazardTexture = () =>
  canvasTexture(256, 64, (ctx) => {
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#1d1a1a";
    for (let x = -64; x < 256; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 24, 64);
      ctx.lineTo(x + 88, 0);
      ctx.lineTo(x + 64, 0);
      ctx.fill();
    }
  });

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3 }> = ({ position, radius, color, glow, scale }) => (
  <mesh position={position} scale={scale}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
  </mesh>
);

// ---------- inside ----------

const HoloTable: React.FC<{ frame: number }> = ({ frame }) => {
  const k = holoFlicker(frame);
  return (
    <group position={HOLO}>
      <InkCylinder radius={0.42} height={0.62} position={[0, 0.31, 0]} color="#2c3446" />
      <InkCylinder radius={0.45} height={0.05} position={[0, 0.645, 0]} color="#4a5468" ink={0.008} />
      <mesh position={[0, 0.675, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.33, 40]} />
        <meshBasicMaterial color="#4ff3ff" toneMapped={false} />
      </mesh>
      {/* Status lights round the rim */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const on = (Math.floor(frame / 6) + i) % 5 !== 0;
        return <Ball key={i} position={[Math.cos(a) * 0.43, 0.5, Math.sin(a) * 0.43]} radius={0.018} color={on ? "#4ff3ff" : "#1a3a4a"} glow />;
      })}
      <group userData={{ ghost: true }}>
        {/* Projection beam */}
        <mesh position={[0, 1.08, 0]}>
          <cylinderGeometry args={[0.36, 0.3, 0.8, 40, 1, true]} />
          <meshBasicMaterial color="#4ff3ff" transparent opacity={0.1 * k} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* Scan rings climbing the beam */}
        {[0, 1, 2].map((i) => {
          const t = ((frame + i * 14) % 42) / 42;
          return (
            <mesh key={i} position={[0, 0.72 + t * 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.3 + t * 0.05, 0.004, 6, 48]} />
              <meshBasicMaterial color="#b8fbff" transparent opacity={(1 - t) * 0.8 * k} toneMapped={false} />
            </mesh>
          );
        })}
        {/* The planet model: wireframe shell, glowing core, orbit ring and a moon */}
        <group position={[0, 1.18, 0]} rotation={[0.35, frame * 0.03, 0]}>
          <mesh>
            <icosahedronGeometry args={[0.22, 1]} />
            <meshBasicMaterial color="#b8fbff" wireframe transparent opacity={k} toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.2, 24, 16]} />
            <meshBasicMaterial color="#4ff3ff" transparent opacity={0.35 * k} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.1, 16, 12]} />
            <meshBasicMaterial color="#e8ffff" transparent opacity={0.7 * k} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[Math.PI / 2 - 0.2, 0, 0]}>
            <torusGeometry args={[0.32, 0.006, 6, 64]} />
            <meshBasicMaterial color="#b8fbff" transparent opacity={0.8 * k} toneMapped={false} />
          </mesh>
          <Ball position={[Math.cos(frame * 0.09) * 0.32, Math.sin(frame * 0.09) * 0.06, Math.sin(frame * 0.09) * 0.32]} radius={0.025} color="#ffffff" glow />
        </group>
        {/* Dust motes drifting up through the light */}
        {Array.from({ length: 12 }, (_, i) => {
          const t = ((frame * 0.6 + i * 23) % 90) / 90;
          return <Ball key={`d${i}`} position={[(rand(i) - 0.5) * 0.5 + Math.sin(t * 6 + i) * 0.03, 0.72 + t * 0.85, (rand(i + 7) - 0.5) * 0.5]} radius={0.006} color="#d8ffff" glow />;
        })}
      </group>
      <Halo position={[0, 1.18, 0.05]} size={1.6} color="#4ff3ff" strength={0.7 * k} />
      <pointLight position={[0, 1.2, 0.2]} intensity={5 * k} distance={4} color="#4ff3ff" />
    </group>
  );
};

const Radar: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => {
  const a = -frame * 0.08;
  return (
    <group position={position}>
      <InkCylinder radius={0.3} height={0.04} rotation={[Math.PI / 2, 0, 0]} color="#2c3446" ink={0.008} />
      <mesh position={[0, 0, 0.022]}>
        <circleGeometry args={[0.27, 40]} />
        <meshBasicMaterial color="#0b2a1e" />
      </mesh>
      {[0.09, 0.18, 0.26].map((r) => (
        <mesh key={r} position={[0, 0, 0.024]}>
          <ringGeometry args={[r - 0.004, r, 48]} />
          <meshBasicMaterial color="#3fae5a" toneMapped={false} />
        </mesh>
      ))}
      {/* Sweep: a bright arm trailing a fading wedge */}
      <mesh position={[0, 0, 0.026]} rotation={[0, 0, a]}>
        <circleGeometry args={[0.26, 24, 0, 0.7]} />
        <meshBasicMaterial color="#5cff8a" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <mesh position={[Math.cos(a + 0.7) * 0.13, Math.sin(a + 0.7) * 0.13, 0.028]} rotation={[0, 0, a + 0.7]}>
        <planeGeometry args={[0.26, 0.008]} />
        <meshBasicMaterial color="#b8ffc8" toneMapped={false} />
      </mesh>
      {/* Blips glow when the arm passes them */}
      {[
        [0.12, 1.1],
        [0.2, 3.4],
        [0.07, 5.0],
      ].map(([r, b], i) => {
        const since = (((a + 0.7 - b) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2);
        return <Ball key={i} position={[Math.cos(b) * r, Math.sin(b) * r, 0.03]} radius={0.012} color="#b8ffc8" glow scale={[1, 1, 1].map(() => Math.max(0.2, 1 - since / 3)) as Vec3} />;
      })}
    </group>
  );
};

const Console: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => (
  <group position={position}>
    <InkBox size={[1.0, 0.78, 0.55]} position={[0, 0.39, 0]} color="#2c3446" />
    <InkBox size={[1.0, 0.05, 0.5]} position={[0, 0.84, 0.02]} rotation={[0.45, 0, 0]} color="#1a1f2b" />
    {/* Blinking buttons on the slanted panel */}
    {Array.from({ length: 12 }, (_, i) => {
      const on = (Math.floor(frame / (5 + (i % 4))) + i * 3) % 4 !== 0;
      const color = ["#e0262f", "#ffd23f", "#3fae5a", "#4ff3ff"][i % 4];
      return (
        <mesh key={i} position={[-0.36 + (i % 6) * 0.14, 0.86 + Math.floor(i / 6) * 0.07, 0.06 - Math.floor(i / 6) * 0.13]} rotation={[0.45 - Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.07, 0.05]} />
          <meshBasicMaterial color={on ? color : "#20242e"} toneMapped={false} />
        </mesh>
      );
    })}
  </group>
);

const Airlock: React.FC<{ frame: number }> = ({ frame }) => {
  const hazard = useMemo(() => hazardTexture(), []);
  const a = beaconAngle(frame);
  const pulse = beaconPulse(frame);
  return (
    <group position={[AIRLOCK.x, 0, BACK_Z + 0.16]}>
      <InkBox size={[1.3, 2.4, 0.2]} position={[0, 1.2, 0]} color="#3a4256" />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.26, 0, 0.12]}>
          <InkBox size={[0.5, 2.05, 0.06]} position={[0, 1.08, 0]} color="#c9ced3" />
          <mesh position={[0, 0.25, 0.032]}>
            <planeGeometry args={[0.46, 0.18]} />
            <meshBasicMaterial map={hazard} toneMapped={false} />
          </mesh>
          <mesh position={[0, 1.45, 0.034]}>
            <circleGeometry args={[0.1, 32]} />
            <meshBasicMaterial color="#1b2a55" />
          </mesh>
          <mesh position={[0, 1.45, 0.033]}>
            <circleGeometry args={[0.125, 32]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        </group>
      ))}
      <InkBox size={[0.012, 2.05, 0.07]} position={[0, 1.08, 0.13]} color={INK} ink={0} />
      {/* Warning beacon: red dome with a beam turning round it */}
      <group position={[0, BEACON[1], 0.16]}>
        <InkCylinder radius={0.09} height={0.06} position={[0, -0.04, 0]} color="#3a4256" ink={0.006} />
        <Ball position={[0, 0.02, 0]} radius={0.08} color={pulse > 0.3 ? "#ff8a80" : "#e0262f"} glow scale={[1, 0.8, 1]} />
        <group rotation={[0, a, 0]} userData={{ ghost: true }}>
          <mesh position={[0, 0.02, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.35, 1.8, 24, 1, true]} />
            <meshBasicMaterial color="#ff3b30" transparent opacity={0.22} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
        <Halo position={[0, 0.02, 0.1]} size={0.6 + pulse * 1.6} color="#ff3b30" strength={0.4 + pulse * 0.5} />
      </group>
      <pointLight position={[0, BEACON[1], 0.6]} intensity={1 + pulse * 9} distance={4.5} color="#ff3b30" />
    </group>
  );
};

// ---------- outside ----------

const Rover: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => (
  <group position={position} rotation={[0, 0.5, 0]}>
    {[-1, 1].flatMap((s) =>
      [-0.35, 0.35].map((z) => <InkCylinder key={`${s}${z}`} radius={0.16} height={0.1} position={[s * 0.36, 0.16, z]} rotation={[0, 0, Math.PI / 2]} color="#2a2a33" ink={0.01} />),
    )}
    <InkBox size={[0.62, 0.22, 1.0]} position={[0, 0.36, 0]} color="#e8ecf4" />
    <InkBox size={[0.5, 0.2, 0.4]} position={[0, 0.56, -0.15]} color="#f77f00" />
    <InkCylinder radius={0.012} height={0.5} position={[0.2, 0.75, 0.3]} color="#c9ced3" ink={0.004} />
    <Ball position={[0.2, 1.02, 0.3]} radius={0.035} color={frame % 30 < 15 ? "#5cff8a" : "#1a3a2a"} glow />
  </group>
);

const Dish: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => (
  <group position={position}>
    <InkCylinder radius={0.06} height={1.2} position={[0, 0.6, 0]} color="#8a94a8" ink={0.01} />
    <group position={[0, 1.25, 0]} rotation={[0, Math.sin(frame * 0.02) * 0.8, 0]}>
      <group rotation={[-0.6, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.6, 32, 12, 0, Math.PI * 2, 0, 0.9]} />
          <meshToonMaterial color="#e8ecf4" gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
        <InkCylinder radius={0.015} height={0.5} position={[0, 0.3, 0]} color="#c9ced3" ink={0.004} />
      </group>
    </group>
  </group>
);

const Rocket: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => (
  <group position={position}>
    <InkBox size={[1.6, 0.2, 1.6]} position={[0, 0.1, 0]} color="#4a4a5e" />
    <InkCylinder radius={0.3} height={2.4} position={[0, 1.5, 0]} color="#f4f4f8" ink={0.02} />
    <InkBox size={[0.62, 0.3, 0.02]} position={[0, 2.0, 0.3]} color="#e0262f" ink={0} />
    <mesh position={[0, 3.05, 0]}>
      <coneGeometry args={[0.3, 0.7, 24]} />
      <meshToonMaterial color="#e0262f" gradientMap={toonRamp} />
    </mesh>
    {[0, 1, 2].map((i) => (
      <InkBox key={i} size={[0.04, 0.5, 0.35]} position={[Math.cos((i / 3) * Math.PI * 2) * 0.32, 0.5, Math.sin((i / 3) * Math.PI * 2) * 0.32]} rotation={[0, -(i / 3) * Math.PI * 2, 0]} color="#e0262f" />
    ))}
    {/* Gantry with a blinking warning light on top */}
    <InkBox size={[0.12, 3.4, 0.12]} position={[0.75, 1.8, -0.2]} color="#8a94a8" />
    {[0.8, 1.6, 2.4].map((y) => (
      <InkBox key={y} size={[0.5, 0.05, 0.05]} position={[0.5, y, -0.2]} color="#8a94a8" ink={0.006} />
    ))}
    <Ball position={[0.75, 3.55, -0.2]} radius={0.06} color={frame % 24 < 8 ? "#ff3b30" : "#4a1010"} glow />
  </group>
);

const Dome: React.FC<{ position: Vec3; radius: number; frame: number; seed: number }> = ({ position, radius, frame, seed }) => (
  <group position={position}>
    <mesh>
      <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshToonMaterial color="#d8dce8" gradientMap={toonRamp} />
    </mesh>
    <mesh scale={1.03}>
      <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {/* A band of lit windows round the dome */}
    {Array.from({ length: 6 }, (_, i) => {
      const a = -0.9 + i * 0.36;
      const on = (Math.floor(frame / 40) + i + seed) % 7 !== 0;
      return (
        <mesh key={i} position={[Math.sin(a) * radius * 0.93, radius * 0.32, Math.cos(a) * radius * 0.93]} rotation={[0, a, 0]}>
          <planeGeometry args={[radius * 0.22, radius * 0.12]} />
          <meshBasicMaterial color={on ? "#ffd27a" : "#3a3a4e"} toneMapped={false} />
        </mesh>
      );
    })}
  </group>
);

const Crater: React.FC<{ position: Vec3; radius: number }> = ({ position, radius }) => (
  <group position={position}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      <circleGeometry args={[radius, 36]} />
      <meshToonMaterial color="#5e5e72" gradientMap={toonRamp} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.35]}>
      <torusGeometry args={[radius, radius * 0.12, 8, 40]} />
      <meshToonMaterial color="#9a9aae" gradientMap={toonRamp} />
    </mesh>
  </group>
);

export const SpaceBaseSet: React.FC<{ camera: CameraShot; frame: number }> = ({ camera, frame }) => {
  const m = MOODS.space;
  const camX = camera.position[0];
  const floorTex = useMemo(() => repeated(plateTexture(), 6, 5), []);
  const wallTex = useMemo(() => repeated(panelTexture(), 4, 1), []);
  const sideTex = useMemo(() => repeated(panelTexture(), 4, 1), []);
  const sky = useMemo(
    () =>
      canvasTexture(1024, 1024, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 1024);
        g.addColorStop(0, "#02030a");
        g.addColorStop(0.7, "#0a0f2a");
        g.addColorStop(1, "#1a1f48");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1024, 1024);
        // Nebula clouds
        for (const [x, y, r, c] of [
          [300, 380, 260, "rgba(140,60,200,0.22)"],
          [460, 300, 200, "rgba(60,160,220,0.18)"],
          [760, 520, 240, "rgba(220,80,160,0.14)"],
        ] as const) {
          const n = ctx.createRadialGradient(x, y, 0, x, y, r);
          n.addColorStop(0, c);
          n.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = n;
          ctx.fillRect(0, 0, 1024, 1024);
        }
        for (let i = 0; i < 420; i++) {
          const s = rand(i + 900) > 0.93 ? 3 : rand(i + 900) > 0.7 ? 2 : 1;
          ctx.fillStyle = rand(i + 50) > 0.85 ? "#ffd8a8" : rand(i + 60) > 0.8 ? "#a8c8ff" : "#ffffff";
          ctx.fillRect(rand(i) * 1024, rand(i + 400) * 1024, s, s);
        }
      }),
    [],
  );
  const planetTex = useMemo(
    () =>
      canvasTexture(512, 256, (ctx) => {
        const bands = ["#e8b07a", "#d48a5a", "#f2d0a0", "#c2724a", "#e8c08a", "#b8603e", "#f0d8b0", "#d08a5a"];
        let y = 0;
        let i = 0;
        while (y < 256) {
          const h = 14 + rand(i) * 30;
          ctx.fillStyle = bands[i % bands.length];
          ctx.fillRect(0, y, 512, h);
          y += h;
          i++;
        }
        ctx.fillStyle = "#a8503a";
        ctx.beginPath();
        ctx.ellipse(330, 150, 34, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }),
    [],
  );
  const ringTex = useMemo(
    () =>
      canvasTexture(512, 8, (ctx) => {
        for (let x = 0; x < 512; x += 4) {
          const a = 0.25 + 0.6 * rand(x) * (x > 200 && x < 230 ? 0.1 : 1);
          ctx.fillStyle = `rgba(240,210,170,${a})`;
          ctx.fillRect(x, 0, 4, 8);
        }
      }),
    [],
  );
  // Ring UVs run round the ring; rotate the strip so its bands run outward.
  const ringGeo = useMemo(() => {
    const g = new THREE.RingGeometry(4.6, 7.4, 96, 1);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (r - 4.6) / 2.8, 0.5);
    }
    return g;
  }, []);
  // A shooting star crosses the sky every three seconds.
  const st = (frame % 90) / 18;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <ambientLight intensity={m.ambient[0]} color={m.ambient[1]} />
      <hemisphereLight args={["#8fa0ff", "#1a1f2b", 0.5]} />
      <directionalLight
        position={[-3, 5, 4]}
        intensity={m.key[0]}
        color={m.key[1]}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />
      {/* Sunlight on the moonscape and the planet, from the left */}
      <directionalLight position={[-6, 3, -2]} intensity={2.2} color="#fff4e0" />

      {/* Sky and planets: parallax shares of the camera's x, like the lake's ridges */}
      <group position={[camX, 0, 0]}>
        <mesh position={[0, 8, -46]}>
          <planeGeometry args={[130, 70]} />
          <meshBasicMaterial map={sky} toneMapped={false} />
        </mesh>
        {st < 1 && (
          <mesh position={[-14 + st * 22, 15 - st * 6, -45]} rotation={[0, 0, -0.27]}>
            <planeGeometry args={[2.4 * Math.sin(st * Math.PI), 0.06]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={Math.sin(st * Math.PI)} toneMapped={false} />
          </mesh>
        )}
      </group>
      <group position={[camX * 0.85, 0, 0]}>
        <group position={[3.6, 5.2, -40]} rotation={[0.25, 0, 0.35]}>
          <mesh rotation={[0, frame * 0.002, 0]}>
            <sphereGeometry args={[3.6, 48, 32]} />
            <meshToonMaterial map={planetTex} gradientMap={toonRamp} />
          </mesh>
          <mesh geometry={ringGeo} rotation={[-Math.PI / 2 + 0.25, 0, 0]}>
            <meshBasicMaterial map={ringTex} transparent side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
        <group position={[-4.6, 6.4, -42]}>
          <mesh rotation={[0, frame * 0.004, 0]}>
            <sphereGeometry args={[0.9, 32, 24]} />
            <meshToonMaterial color="#3f7fd8" gradientMap={toonRamp} />
          </mesh>
          <Halo position={[0, 0, 0.5]} size={2.8} color="#7fb8ff" strength={0.35} />
        </group>
      </group>
      <Ridge z={-26} shift={camX * 0.55} width={80} low={1.0} high={2.6} peaks={8} color="#3e3e52" seed={31} />
      <Ridge z={-20} shift={0} width={70} low={0.5} high={1.4} peaks={10} color="#525268" seed={37} />
      <Ridge z={-15} shift={-camX * 0.8} width={64} low={0.3} high={0.8} peaks={14} color="#66667e" seed={41} />

      {/* Moonscape */}
      <mesh position={[0, OUT_Y, -30]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 56]} />
        <meshToonMaterial color="#8a8a9e" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <Crater key={i} position={[(rand(i + 3) - 0.5) * 18, OUT_Y, -5 - rand(i + 11) * 12]} radius={0.4 + rand(i + 19) * 1.3} />
      ))}
      <Rover position={[-1.1, OUT_Y, -6.5]} frame={frame} />
      <Dish position={[1.3, OUT_Y, -8.5]} frame={frame} />
      <Rocket position={[3.2, OUT_Y, -12]} frame={frame} />
      <SmokePlume position={[3.2, OUT_Y + 0.25, -11.4]} world={[3.2, -11.4]} frame={frame} size={0.3} rise={1.6} wind={1.2} period={80} puffs={6} />
      <Dome position={[-3.4, OUT_Y, -10]} radius={1.3} frame={frame} seed={1} />
      <Dome position={[-5.6, OUT_Y, -12.5]} radius={0.9} frame={frame} seed={4} />
      <InkCylinder radius={0.22} height={1.8} position={[-4.6, OUT_Y + 0.25, -11.2]} rotation={[0, 0.9, Math.PI / 2]} color="#c9ced3" ink={0.01} />

      {/* Deck */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} receiveShadow>
        <planeGeometry args={[ROOM.half * 2, 7.2]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={floorTex} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (ROOM.half - 0.35), 0.004, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.05, 6.6]} />
          <meshBasicMaterial color="#4ff3ff" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.004, BACK_Z + 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM.half * 2 - 0.7, 0.05]} />
        <meshBasicMaterial color="#4ff3ff" toneMapped={false} />
      </mesh>

      {/* Back wall built round the window opening */}
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[ROOM.half - WIN.half, ROOM.height, 0.3]} position={[s * (WIN.half + (ROOM.half - WIN.half) / 2), ROOM.height / 2, BACK_Z]} color="#ffffff" ink={0} map={wallTex} />
      ))}
      <InkBox size={[WIN.half * 2, WIN.bottom, 0.3]} position={[0, WIN.bottom / 2, BACK_Z]} color="#4a5468" ink={0} />
      <InkBox size={[WIN.half * 2, ROOM.height - WIN.top, 0.3]} position={[0, (ROOM.height + WIN.top) / 2, BACK_Z]} color="#4a5468" ink={0} />
      {/* Window frame, struts and glass with two glints */}
      <InkBox size={[WIN.half * 2 + 0.16, 0.1, 0.4]} position={[0, WIN.top, BACK_Z]} color="#2a3040" />
      <InkBox size={[WIN.half * 2 + 0.16, 0.12, 0.44]} position={[0, WIN.bottom, BACK_Z]} color="#2a3040" />
      {[-1, 1].map((s) => (
        <InkBox key={`f${s}`} size={[0.1, WIN.top - WIN.bottom, 0.4]} position={[s * WIN.half, (WIN.top + WIN.bottom) / 2, BACK_Z]} color="#2a3040" />
      ))}
      {[-1, 1].map((s) => (
        <InkBox key={`m${s}`} size={[0.05, WIN.top - WIN.bottom, 0.1]} position={[s * 0.47, (WIN.top + WIN.bottom) / 2, BACK_Z]} color="#2a3040" />
      ))}
      <InkBox size={[WIN.half * 2, 0.05, 0.1]} position={[0, 1.95, BACK_Z]} color="#2a3040" />
      <mesh position={[0, (WIN.top + WIN.bottom) / 2, BACK_Z + 0.03]}>
        <planeGeometry args={[WIN.half * 2, WIN.top - WIN.bottom]} />
        <meshBasicMaterial color="#8fd8ff" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      {[
        [-0.8, 0.5],
        [0.95, 0.25],
      ].map(([x, w], i) => (
        <mesh key={`g${i}`} position={[x, 1.6, BACK_Z + 0.04]} rotation={[0, 0, 0.6]}>
          <planeGeometry args={[w, 1.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} />
        </mesh>
      ))}
      {/* Side walls, ceiling with light panels, pipes */}
      {[-1, 1].map((s) => (
        <InkBox key={`w${s}`} size={[0.2, ROOM.height, 7]} position={[s * ROOM.half, ROOM.height / 2, 0.5]} color="#ffffff" ink={0} map={sideTex} />
      ))}
      <InkBox size={[ROOM.half * 2, 0.2, 7]} position={[0, ROOM.height + 0.1, 0.5]} color="#2c3446" ink={0} />
      {[-1.2, 0.6, 2.4].map((z) => (
        <mesh key={z} position={[0, ROOM.height - 0.005, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 0.18]} />
          <meshBasicMaterial color="#dff6ff" toneMapped={false} />
        </mesh>
      ))}
      {[
        [2.85, "#c9ced3"],
        [2.68, "#e8b04a"],
      ].map(([y, c]) => (
        <InkCylinder key={y as number} radius={0.05} height={2.9} position={[-ROOM.half + 1.55, y as number, BACK_Z + 0.22]} rotation={[0, 0, Math.PI / 2]} color={c as string} ink={0.006} />
      ))}

      {/* Left: console, status screen and radar */}
      <Console position={[-2.3, 0, BACK_Z + 0.5]} frame={frame} />
      <Screen position={[-2.3, 1.75, BACK_Z + 0.17]} text="O2 98%" size={[0.95, 0.5]} glow="#5cff8a" bg="#0b2a1e" />
      <Radar position={[-3.35, 1.45, BACK_Z + 0.2]} frame={frame} />
      <Crates position={[-2.0, 0, 1.6]} count={3} color="#8a94a8" />

      <Airlock frame={frame} />
      <HoloTable frame={frame} />
    </>
  );
};
