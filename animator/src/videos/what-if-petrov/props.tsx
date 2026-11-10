import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "What if Petrov had reported the launch?" (Serpukhov-15, 26 September 1983).

const INK = "#1a1418";

// A low command console: a desk 0.45 m high with a sloped lamp panel on top (a seated puppet's hands stay above it).
export const Console: React.FC<{ position: Vec3; width?: number; color?: string; lamps?: string[]; frame?: number; alarm?: boolean }> = ({
  position,
  width = 1.4,
  color = "#7a8a84",
  lamps = ["#4dff9a", "#ffd24a", "#4dc8ff"],
  frame = 0,
  alarm = false,
}) => {
  const n = Math.max(4, Math.round(width / 0.14));
  return (
    <group position={position}>
      <InkBox size={[width, 0.4, 0.5]} position={[0, 0.2, 0]} color={color} ink={0.012} />
      <InkBox size={[width, 0.06, 0.34]} position={[0, 0.43, -0.06]} rotation={[0.35, 0, 0]} color="#3a4440" ink={0.008} />
      {Array.from({ length: n }, (_, i) => {
        const on = alarm ? (Math.floor(frame / 4) + i) % 2 === 0 : (Math.floor(frame / 23 + i * 1.7) % 3) !== 0;
        const c = alarm ? "#ff3b30" : lamps[i % lamps.length];
        return (
          <mesh key={i} position={[-width / 2 + 0.08 + i * ((width - 0.16) / (n - 1)), 0.47, -0.03]} rotation={[0.35 - Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.022, 12]} />
            <meshBasicMaterial color={on ? c : "#2a302e"} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// The big wall board over the hall: a lit LAUNCH panel that flashes when `on`, and a strip of status lamps.
export const LaunchBoard: React.FC<{ position: Vec3; on?: boolean; frame?: number; width?: number }> = ({ position, on = false, frame = 0, width = 1.5 }) => {
  const blink = on && Math.floor(frame / 6) % 2 === 0;
  return (
    <group position={position}>
      <InkBox size={[width + 0.2, 0.75, 0.08]} position={[0, 0, 0]} color="#2a3230" ink={0.012} />
      <Label text="LAUNCH" position={[0, 0.06, 0.05]} width={width * 0.8} bg={blink ? "#ff2a1e" : on ? "#8a1a14" : "#4a1814"} fg={blink ? "#fff4e0" : "#d88a80"} border={false} />
      {blink && <Halo position={[0, 0.06, 0.08]} size={width * 1.6} color="#ff3b30" strength={0.6} />}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-width / 2 + 0.15 + i * ((width - 0.3) / 5), -0.27, 0.05]}>
          <circleGeometry args={[0.03, 12]} />
          <meshBasicMaterial color={on ? (i % 2 === (Math.floor(frame / 5) % 2) ? "#ff3b30" : "#5a1410") : i === 2 ? "#ffd24a" : "#4dff9a"} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// A flat painted world map for a wall (simple continent blobs on dark blue).
export const WorldMap: React.FC<{ position: Vec3; size?: [number, number]; sea?: string; land?: string; tracks?: number }> = ({ position, size = [1.6, 0.9], sea = "#1c3a5a", land = "#c8d4a0", tracks = 0 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, 576, (ctx) => {
        ctx.fillStyle = sea;
        ctx.fillRect(0, 0, 1024, 576);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        for (let x = 0; x <= 1024; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 576);
          ctx.stroke();
        }
        for (let y = 0; y <= 576; y += 64) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(1024, y);
          ctx.stroke();
        }
        ctx.fillStyle = land;
        const blob = (pts: [number, number][]) => {
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.fill();
        };
        blob([[90, 120], [300, 90], [330, 180], [260, 260], [220, 330], [160, 260], [80, 200]]); // N America
        blob([[230, 330], [300, 350], [290, 470], [250, 520], [230, 420]]); // S America
        blob([[470, 110], [900, 90], [960, 170], [860, 260], [760, 240], [640, 250], [520, 210], [470, 170]]); // Eurasia
        blob([[500, 260], [600, 270], [610, 380], [560, 450], [510, 360]]); // Africa
        blob([[840, 400], [930, 400], [920, 460], [850, 460]]); // Australia
        if (tracks > 0) {
          ctx.strokeStyle = "#ff3b30";
          ctx.lineWidth = 6;
          ctx.setLineDash([16, 10]);
          for (let k = 0; k < tracks; k++) {
            ctx.beginPath();
            ctx.moveTo(200 + k * 14, 170 + k * 8);
            ctx.quadraticCurveTo(420, 10 + k * 10, 640 + k * 10, 150 + k * 6);
            ctx.stroke();
          }
        }
      }),
    [sea, land, tracks],
  );
  return (
    <group position={position}>
      <InkBox size={[size[0] + 0.08, size[1] + 0.08, 0.04]} color="#3a2a1a" ink={0.008} />
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// A cartoon rocket standing on its fins: body, nose cone, three fins. Height ~ 1 x scale (m).
export const Rocket: React.FC<{ position: Vec3; scale?: number; color?: string; nose?: string; rotation?: Vec3 }> = ({ position, scale = 1, color = "#e8e4dc", nose = "#d62828", rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkCylinder radius={0.09} height={0.7} position={[0, 0.45, 0]} color={color} ink={0.012} />
    <mesh position={[0, 0.92, 0]} castShadow>
      <coneGeometry args={[0.09, 0.24, 24]} />
      <meshToonMaterial color={nose} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.92, 0]} scale={[1.18, 1.1, 1.18]}>
      <coneGeometry args={[0.09, 0.24, 24]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {[0, 1, 2].map((k) => (
      <InkBox key={k} size={[0.02, 0.2, 0.14]} position={[Math.sin((k * Math.PI * 2) / 3) * 0.1, 0.12, Math.cos((k * Math.PI * 2) / 3) * 0.1]} rotation={[0, (k * Math.PI * 2) / 3, 0]} color={nose} ink={0.006} />
    ))}
  </group>
);

// A wide open crate packed with rocket noses: "HUNDREDS".
export const RocketCrate: React.FC<{ position: Vec3; fill?: number }> = ({ position, fill = 1 }) => {
  const rows = 7;
  const cols = 10;
  const shown = Math.round(rows * cols * fill);
  return (
    <group position={position}>
      <InkBox size={[1.3, 0.5, 0.9]} position={[0, 0.25, 0]} color="#6a4a2a" ink={0.012} />
      {Array.from({ length: shown }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        return (
          <mesh key={i} position={[-0.56 + c * 0.125, 0.56, -0.36 + r * 0.12]}>
            <coneGeometry args={[0.045, 0.14, 10]} />
            <meshToonMaterial color={(r + c) % 3 === 0 ? "#d62828" : "#e8e4dc"} gradientMap={toonRamp} />
          </mesh>
        );
      })}
    </group>
  );
};

// A round radar scope in a cabinet: a sweeping line over green rings, a label above, a readout below.
export const Scope: React.FC<{ position: Vec3; sweep: number; readout?: string; label?: string; radius?: number }> = ({ position, sweep, readout, label, radius = 0.32 }) => {
  return (
    <group position={position}>
      <InkBox size={[radius * 2.6, radius * 2.6, 0.3]} position={[0, 0, -0.16]} color="#4a5a52" ink={0.012} />
      <InkCylinder radius={radius + 0.04} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#2a302e" ink={0.008} />
      <mesh position={[0, 0, 0.03]}>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial color="#06200f" toneMapped={false} />
      </mesh>
      {[0.33, 0.66, 0.97].map((k) => (
        <mesh key={k} position={[0, 0, 0.032]}>
          <ringGeometry args={[radius * k - 0.006, radius * k, 48]} />
          <meshBasicMaterial color="#2fbf6a" toneMapped={false} />
        </mesh>
      ))}
      <group position={[0, 0, 0.034]} rotation={[0, 0, -sweep]}>
        <mesh position={[0, radius / 2, 0]}>
          <planeGeometry args={[0.012, radius]} />
          <meshBasicMaterial color="#9dffc0" toneMapped={false} />
        </mesh>
        <mesh rotation={[0, 0, 0.35]} position={[0, 0, -0.001]}>
          <circleGeometry args={[radius, 24, Math.PI / 2, 0.35]} />
          <meshBasicMaterial color="#2fbf6a" transparent opacity={0.4} toneMapped={false} />
        </mesh>
      </group>
      <Halo position={[0, 0, 0]} size={radius * 3} color="#4dff9a" strength={0.25} />
      {label && <Label text={label} position={[0, radius + 0.22, 0.01]} width={radius * 2.4} bg="#e8ecd8" />}
      {readout && <Label text={readout} position={[0, -radius - 0.2, 0.01]} width={radius * 2.2} bg="#0b1a14" fg="#4dff9a" border={false} />}
    </group>
  );
};

// A red telephone with its handset; `lift` 0..1 raises the handset off the cradle.
export const RedPhone: React.FC<{ position: Vec3; lift?: number; rotationY?: number }> = ({ position, lift = 0, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.22, 0.08, 0.18]} position={[0, 0.04, 0]} color="#c4241c" ink={0.006} />
    <InkCylinder radius={0.05} height={0.015} position={[0, 0.09, 0.03]} rotation={[0.3, 0, 0]} color="#f0e8d8" ink={0.004} />
    <group position={[0, 0.11 + lift * 0.18, -0.04]} rotation={[0, 0, lift * 0.5]}>
      <InkBox size={[0.24, 0.035, 0.05]} color="#c4241c" ink={0.006} />
      <InkBox size={[0.06, 0.05, 0.06]} position={[-0.1, -0.02, 0]} color="#c4241c" ink={0.005} />
      <InkBox size={[0.06, 0.05, 0.06]} position={[0.1, -0.02, 0]} color="#c4241c" ink={0.005} />
    </group>
  </group>
);

// A wall clock; `minutes` turns the hands.
export const WallClock: React.FC<{ position: Vec3; minutes: number; size?: number; face?: string }> = ({ position, minutes, size = 0.2, face = "#f4ecd8" }) => (
  <group position={position}>
    <InkCylinder radius={size} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#3a3a3a" ink={0.006} />
    <mesh position={[0, 0, 0.03]}>
      <circleGeometry args={[size * 0.84, 36]} />
      <meshBasicMaterial color={face} toneMapped={false} />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => (
      <mesh key={i} position={[Math.sin((i * Math.PI) / 6) * size * 0.72, Math.cos((i * Math.PI) / 6) * size * 0.72, 0.032]}>
        <circleGeometry args={[size * 0.035, 8]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    ))}
    <group position={[0, 0, 0.036]} rotation={[0, 0, -(minutes / 60) * Math.PI * 2]}>
      <InkBox size={[size * 0.05, size * 0.7, 0.004]} position={[0, size * 0.32, 0]} color={INK} ink={0} />
    </group>
    <group position={[0, 0, 0.038]} rotation={[0, 0, -((minutes / 720) * Math.PI * 2 + 0.05)]}>
      <InkBox size={[size * 0.07, size * 0.45, 0.004]} position={[0, size * 0.2, 0]} color={INK} ink={0} />
    </group>
  </group>
);

// A folded newspaper lying on a desk, with a headline.
export const Paper: React.FC<{ position: Vec3; rotation?: Vec3; size?: number; lines: string[]; masthead?: string }> = ({ position, rotation = [-Math.PI / 2, 0, 0], size = 0.42, lines, masthead = "NEWS" }) => {
  const page = useMemo(
    () =>
      canvasTexture(512, 680, (ctx) => {
        ctx.fillStyle = "#f0e8d4";
        ctx.fillRect(0, 0, 512, 680);
        ctx.fillStyle = "#1a1410";
        ctx.textAlign = "center";
        ctx.font = "bold 40px Georgia";
        ctx.fillText(masthead, 256, 58);
        ctx.fillRect(30, 78, 452, 5);
        ctx.font = "900 76px Arial Black, Arial";
        lines.forEach((l, i) => {
          let fs = 76;
          ctx.font = `900 ${fs}px Arial Black, Arial`;
          const w = ctx.measureText(l).width;
          if (w > 460) fs = Math.floor((fs * 460) / w);
          ctx.font = `900 ${fs}px Arial Black, Arial`;
          ctx.fillText(l, 256, 170 + i * 84);
        });
        ctx.fillRect(30, 170 + lines.length * 84 - 30, 452, 3);
        ctx.fillStyle = "rgba(40,30,20,0.45)";
        for (let i = 0; i < 8; i++) {
          ctx.fillRect(40, 190 + lines.length * 84 + i * 24, 200, 8);
          ctx.fillRect(272, 190 + lines.length * 84 + i * 24, 200, 8);
        }
      }),
    [lines.join("|"), masthead],
  );
  return (
    <mesh position={position} rotation={rotation} userData={{ ghost: true }}>
      <planeGeometry args={[size, size * 1.33]} />
      <meshToonMaterial map={page} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
  );
};

// The Earth seen from orbit: ocean sphere, painted land, a cloud shell; a sun glint flares on the clouds.
export const Earth: React.FC<{ position: Vec3; radius: number; spin: number; glint?: number; glintAt?: Vec3 }> = ({ position, radius, spin, glint = 0, glintAt }) => {
  const land = useMemo(
    () =>
      canvasTexture(1024, 512, (ctx) => {
        ctx.fillStyle = "#1f5a9a";
        ctx.fillRect(0, 0, 1024, 512);
        ctx.fillStyle = "#4f8a4a";
        const rnd = (s: number) => {
          const x = Math.sin(s * 91.7) * 43758.5;
          return x - Math.floor(x);
        };
        for (let i = 0; i < 26; i++) {
          ctx.beginPath();
          ctx.ellipse(rnd(i) * 1024, 90 + rnd(i + 50) * 330, 30 + rnd(i + 9) * 90, 20 + rnd(i + 3) * 50, rnd(i + 7) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#f4f8ff";
        ctx.fillRect(0, 0, 1024, 30);
        ctx.fillRect(0, 486, 1024, 26);
      }),
    [],
  );
  const clouds = useMemo(
    () =>
      canvasTexture(1024, 512, (ctx) => {
        ctx.clearRect(0, 0, 1024, 512);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        const rnd = (s: number) => {
          const x = Math.sin(s * 12.9898) * 43758.5;
          return x - Math.floor(x);
        };
        for (let i = 0; i < 90; i++) {
          ctx.beginPath();
          ctx.ellipse(rnd(i) * 1024, 40 + rnd(i + 200) * 430, 14 + rnd(i + 5) * 46, 6 + rnd(i + 8) * 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [],
  );
  return (
    <group position={position}>
      <group rotation={[0.35, spin, 0]}>
        <mesh>
          <sphereGeometry args={[radius, 64, 48]} />
          <meshToonMaterial map={land} gradientMap={toonRamp} />
        </mesh>
        <mesh rotation={[0, spin * 0.4, 0]}>
          <sphereGeometry args={[radius * 1.012, 64, 48]} />
          <meshToonMaterial map={clouds} transparent gradientMap={toonRamp} depthWrite={false} />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[radius * 1.06, 48, 32]} />
        <meshBasicMaterial color="#7ab8ff" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {glintAt && glint > 0.01 && (
        <group position={glintAt}>
          <Halo position={[0, 0, 0]} size={radius * 0.22 * (0.6 + glint)} color="#fff4c8" strength={glint * 0.55} />
          <mesh>
            <sphereGeometry args={[radius * 0.02 * (0.5 + glint), 12, 8]} />
            <meshBasicMaterial color={new THREE.Color(3, 2.8, 2.2)} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// An early-warning satellite: a gold body, a sensor tube, two solar wings.
export const Satellite: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkCylinder radius={0.22} height={0.6} color="#d8a840" ink={0.012} />
    <InkCylinder radius={0.11} height={0.35} position={[0, -0.45, 0]} color="#c8ccd4" ink={0.01} />
    <InkCylinder radius={0.08} height={0.04} position={[0, -0.64, 0]} color="#1a1a24" ink={0.006} />
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.75, 0.05, 0]}>
        <InkBox size={[0.06, 0.04, 0.04]} position={[-s * 0.34, 0, 0]} color="#8a8a90" ink={0.004} />
        <InkBox size={[0.9, 0.42, 0.03]} color="#1f3a7a" ink={0.01} />
        {[-0.3, 0, 0.3].map((x) => (
          <InkBox key={x} size={[0.01, 0.42, 0.034]} position={[x, 0, 0]} color="#c8ccd4" ink={0} />
        ))}
      </group>
    ))}
  </group>
);

// A padlock with a label on its body; `shut` 0..1 drops the shackle into the body.
export const Padlock: React.FC<{ position: Vec3; label: string; shut?: number; scale?: number }> = ({ position, label, shut = 1, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[0.3, 0.24, 0.1]} position={[0, 0, 0]} color="#d8a840" ink={0.01} />
    <group position={[0, 0.12 + (1 - shut) * 0.08, 0]}>
      <mesh>
        <torusGeometry args={[0.09, 0.022, 10, 24, Math.PI]} />
        <meshToonMaterial color="#b8bcc4" gradientMap={toonRamp} />
      </mesh>
      <InkCylinder radius={0.022} height={0.06} position={[-0.09, -0.03, 0]} color="#b8bcc4" ink={0.004} />
      <InkCylinder radius={0.022} height={0.06} position={[0.09, -0.03, 0]} color="#b8bcc4" ink={0.004} />
    </group>
    <Label text={label} position={[0, -0.01, 0.052]} width={0.26} bg="#fff6dc" />
  </group>
);

// The launch button under a hinged glass cover on a slanted panel; `cover` 0 shut, 1 open.
export const LaunchPanel: React.FC<{ position: Vec3; cover?: number; press?: number; lit?: boolean }> = ({ position, cover = 0, press = 0, lit = true }) => (
  <group position={position}>
    <InkBox size={[1.1, 0.9, 0.5]} position={[0, 0.45, 0]} color="#3a3a3a" ink={0.012} />
    <group position={[0, 0.92, 0]} rotation={[0.45, 0, 0]}>
      <InkBox size={[1.1, 0.06, 0.6]} color="#5a5a58" ink={0.01} />
      <InkCylinder radius={0.13} height={0.05} position={[0, 0.05, 0]} color="#2a2a2a" ink={0.006} />
      <InkCylinder radius={0.1} height={0.08} position={[0, 0.1 - press * 0.04, 0]} color={lit ? "#ff2a1e" : "#7a1a14"} ink={0.008} emissive={lit ? "#5a0a06" : "#000"} />
      <group position={[0, 0.06, -0.16]} rotation={[-cover * 1.6, 0, 0]}>
        <mesh position={[0, 0.07, 0.16]}>
          <boxGeometry args={[0.32, 0.14, 0.32]} />
          <meshBasicMaterial color="#bfe4ff" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </group>
      <Label text="LAUNCH" position={[0, 0.035, 0.24]} rotation={[-Math.PI / 2, 0, 0]} width={0.4} bg="#e8e0c8" />
    </group>
  </group>
);

// A rubber stamp; `lift` 0 on the paper, 1 raised.
export const RubberStamp: React.FC<{ position: Vec3; lift: number }> = ({ position, lift }) => (
  <group position={[position[0], position[1] + lift * 0.35, position[2]]}>
    <InkBox size={[0.16, 0.04, 0.1]} position={[0, 0.02, 0]} color="#7a1a14" ink={0.005} />
    <InkBox size={[0.12, 0.05, 0.07]} position={[0, 0.065, 0]} color="#6a4a2a" ink={0.005} />
    <InkCylinder radius={0.025} height={0.12} position={[0, 0.15, 0]} color="#6a4a2a" ink={0.005} />
    <mesh position={[0, 0.235, 0]}>
      <sphereGeometry args={[0.045, 16, 12]} />
      <meshToonMaterial color="#3a2414" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// A sheet of paperwork; `stamped` shows the red REPRIMAND mark.
export const Sheet: React.FC<{ position: Vec3; rotation?: Vec3; stamped?: boolean; lift?: number }> = ({ position, rotation = [0, 0, 0], stamped = false, lift = 0 }) => (
  <group position={[position[0], position[1] + lift, position[2]]} rotation={rotation}>
    <InkBox size={[0.34, 0.006, 0.44]} color="#f4eee0" ink={0.003} />
    {Array.from({ length: 6 }, (_, i) => (
      <InkBox key={i} size={[0.24, 0.002, 0.012]} position={[0, 0.004, -0.15 + i * 0.04]} color="#8a8478" ink={0} />
    ))}
    {stamped && <Label text="REPRIMAND" position={[0, 0.006, 0.12]} rotation={[-Math.PI / 2, 0, -0.12]} width={0.3} bg="#f4eee0" fg="#c4241c" />}
  </group>
);

// A coin; `spin` turns it about its x axis (flips), lying flat when spin is a multiple of PI.
export const Coin: React.FC<{ position: Vec3; spin: number; size?: number }> = ({ position, spin, size = 0.045 }) => (
  <group position={position} rotation={[Math.PI / 2 + spin, 0, 0]}>
    <InkCylinder radius={size} height={size * 0.18} color="#d8b44a" ink={0.003} />
  </group>
);

// A wall calendar showing a year.
export const Calendar: React.FC<{ position: Vec3; year: string; appear?: number }> = ({ position, year, appear }) => (
  <group position={position}>
    <InkBox size={[0.44, 0.5, 0.02]} color="#f4f0e6" ink={0.006} />
    <InkBox size={[0.44, 0.1, 0.025]} position={[0, 0.2, 0.004]} color="#c4241c" ink={0.004} />
    <Label text={year} position={[0, -0.02, 0.016]} width={0.38} bg="#f4f0e6" border={false} appear={appear} />
  </group>
);

// An envelope marked WARNING.
export const Envelope: React.FC<{ position: Vec3; rotation?: Vec3; glow?: number }> = ({ position, rotation = [0, 0, 0], glow = 0 }) => (
  <group position={position} rotation={rotation}>
    {glow > 0 && <Halo position={[0, 0, -0.02]} size={0.7} color="#ff5a4a" strength={glow * 0.6} />}
    <InkBox size={[0.42, 0.26, 0.02]} color="#f0e4c8" ink={0.006} />
    <Label text="WARNING" position={[0, -0.02, 0.012]} width={0.34} bg="#c4241c" fg="#fff4e0" border={false} />
  </group>
);

// A small red star (gate, Kremlin tower).
export const RedStar: React.FC<{ position: Vec3; size?: number; glow?: boolean }> = ({ position, size = 0.3, glow = false }) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 1 : 0.42;
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    return s;
  }, []);
  return (
    <group position={position} scale={size}>
      {glow && <Halo position={[0, 0, -0.05]} size={3} color="#ff3b30" strength={0.5} />}
      <mesh position={[0, 0, -0.01]} scale={1.15}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={glow ? new THREE.Color(1.6, 0.25, 0.2) : "#d62828"} toneMapped={!glow} />
      </mesh>
    </group>
  );
};

// A lattice antenna mast with a dish.
export const Mast: React.FC<{ position: Vec3; height?: number; frame?: number }> = ({ position, height = 6, frame = 0 }) => (
  <group position={position}>
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.06, height, 0.06]} position={[s * 0.18, height / 2, 0]} rotation={[0, 0, -s * 0.03]} color="#5a6470" ink={0.006} />
    ))}
    {Array.from({ length: Math.floor(height / 0.6) }, (_, i) => (
      <InkBox key={i} size={[0.36, 0.03, 0.03]} position={[0, 0.4 + i * 0.6, 0]} rotation={[0, 0, i % 2 ? 0.5 : -0.5]} color="#5a6470" ink={0.004} />
    ))}
    <group position={[0, height + 0.2, 0]} rotation={[0.5, frame * 0.01, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 4]} />
        <meshToonMaterial color="#c8ccd4" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
    </group>
    <mesh position={[0, height + 0.05, 0]}>
      <sphereGeometry args={[0.06, 10, 8]} />
      <meshBasicMaterial color={Math.floor(frame / 20) % 2 ? "#ff3b30" : "#5a1410"} toneMapped={false} />
    </mesh>
  </group>
);
