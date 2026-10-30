import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Why Movie Popcorn Costs So Much".

const INK = "#161212";
const BLOCK_FONT = "Arial Black, Impact, sans-serif";

const stripeTexture = () =>
  canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#e0262f";
    for (let i = 0; i < 8; i++) ctx.fillRect(i * 64, 0, 32, 128);
  });

// A heap of popped kernels sitting on a disc of radius r.
const Heap: React.FC<{ r: number; y: number; count?: number; seed?: number }> = ({ r, y, count = 14, seed = 1 }) => (
  <group position={[0, y, 0]}>
    {Array.from({ length: count }, (_, i) => {
      const a = i * 2.4 + seed;
      const d = (((i * 37 + seed * 11) % 10) / 10) * r * 0.85;
      return (
        <mesh key={i} position={[Math.cos(a) * d, (1 - d / r) * r * 0.55, Math.sin(a) * d]}>
          <icosahedronGeometry args={[r * 0.26, 0]} />
          <meshToonMaterial color={i % 4 ? "#fff1b8" : "#ffd86b"} gradientMap={toonRamp} />
        </mesh>
      );
    })}
  </group>
);

// Striped cinema bucket with a heap on top and an optional price tag.
export const Bucket: React.FC<{ position: Vec3; scale?: number; price?: string; rotationY?: number }> = ({ position, scale = 1, price, rotationY = 0 }) => {
  const tex = useMemo(stripeTexture, []);
  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.1, 0.26, 32, 1, true]} />
        <meshToonMaterial map={tex} gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.148, 0.108, 0.27, 32, 1, true]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <Heap r={0.14} y={0.24} count={16} />
      {price && (
        <group position={[0.08, 0.1, 0.15]} rotation={[0, 0.3, -0.12]}>
          <Label text={price} position={[0, 0, 0]} width={0.13} fg="#e0262f" bg="#fff6dc" />
        </group>
      )}
    </group>
  );
};

// Glass popcorn machine on a red cart. `erupt` 0..1 sends kernels flying out of the lid.
export const PopcornMachine: React.FC<{ position: Vec3; erupt?: number; tag?: string; f: number }> = ({ position, erupt = 0, tag, f }) => (
  <group position={position}>
    <InkBox size={[0.9, 0.9, 0.6]} position={[0, 0.45, 0]} color="#d62828" />
    <InkBox size={[0.94, 0.06, 0.64]} position={[0, 0.93, 0]} color="#ffd23f" />
    {/* glass case */}
    <mesh position={[0, 1.35, 0]}>
      <boxGeometry args={[0.86, 0.8, 0.56]} />
      <meshBasicMaterial color="#dff4ff" transparent opacity={0.22} depthWrite={false} />
    </mesh>
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.03, 0.8, 0.03]} position={[sx * 0.43, 1.35, sz * 0.28]} color="#e0262f" ink={0.004} />),
    )}
    <InkBox size={[0.94, 0.12, 0.64]} position={[0, 1.8, 0]} color="#e0262f" />
    <Label text="POPCORN" position={[0, 1.8, 0.33]} width={0.5} fg="#ffd23f" bg="#e0262f" border={false} />
    {/* kettle and the pile */}
    <InkCylinder radius={0.12} height={0.14} position={[0, 1.58, 0]} color="#c9ced3" />
    <Heap r={0.36} y={0.96} count={26} seed={3} />
    <Halo position={[0, 1.4, 0.3]} size={1.4} color="#ffd86b" strength={0.35} />
    {erupt > 0 &&
      Array.from({ length: 40 }, (_, i) => {
        const age = erupt * 1.6 - (i / 40) * 0.6;
        if (age <= 0) return null;
        const a = i * 2.39;
        const v = 0.6 + ((i * 13) % 7) / 10;
        const t = Math.min(age, 1.2);
        const y = Math.max(0.05, 1.9 + v * 1.6 * t - 2.4 * t * t);
        return (
          <mesh key={i} position={[Math.cos(a) * v * t * 0.9, y, 0.2 + Math.abs(Math.sin(a)) * v * t * 0.9]} rotation={[f * 0.2 + i, i, 0]}>
            <icosahedronGeometry args={[0.05, 0]} />
            <meshToonMaterial color={i % 3 ? "#fff1b8" : "#ffd86b"} gradientMap={toonRamp} />
          </mesh>
        );
      })}
    {tag && (
      <group position={[0.22, 0.55, 0.31]} rotation={[0, 0, -0.06]}>
        <Label text={tag} position={[0, 0, 0]} width={0.42} fg={INK} bg="#ffd23f" />
      </group>
    )}
  </group>
);

// Candy bars tumbling out of a jacket at `origin`, landing on the floor (y = 0), by t 0..1.
export const CandySpill: React.FC<{ origin: Vec3; t: number }> = ({ origin, t }) => {
  const colors = ["#7a3fd0", "#e0262f", "#3fae5a", "#ff9f1c", "#1d4fa8", "#f28482", "#ffd23f"];
  return (
    <group>
      {colors.map((c, i) => {
        const age = Math.max(0, t * 1.5 - i * 0.07);
        if (age <= 0) return null;
        const fall = Math.min(1, age * 1.6);
        const x = origin[0] + (i - 3) * 0.08 * fall + Math.sin(i * 3) * 0.12 * fall;
        const y = Math.max(0.02, origin[1] - origin[1] * fall * fall);
        const z = origin[2] + 0.25 * fall + (i % 3) * 0.06;
        return <InkBox key={i} size={[0.14, 0.03, 0.06]} position={[x, y, z]} rotation={[fall * 2 * (i % 2 ? 1 : -1), i, fall * 3]} color={c} ink={0.006} />;
      })}
    </group>
  );
};

// Bills: flat green notes.
const Bill: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <InkBox size={[0.16, 0.008, 0.07]} position={position} rotation={rotation} color="#7bc47f" ink={0.004} shadows={false} />
);

// Cash drawer seen from above. With `divider`, its two halves are labelled STUDIO / THEATER.
// `take` 0..1 lifts the left half of the cash away toward +x (into the briefcase).
export const CashDrawer: React.FC<{ position: Vec3; divider?: boolean; take?: number; slam?: number; label?: string; squash?: Vec3 }> = ({ position, divider, take = 0, slam = 0, label, squash = [1, 1, 1] }) => (
  <group position={position} scale={squash}>
    <group position={[0, 0, -slam * 0.3]}>
      <InkBox size={[0.7, 0.08, 0.42]} position={[0, 0.04, 0]} color="#2c3a40" />
      {[-0.17, 0.17].map((x, k) =>
        Array.from({ length: 4 }, (_, i) => {
          const leave = k === 0 ? Math.max(0, Math.min(1, take * 1.4 - i * 0.12)) : 0;
          return <Bill key={`${k}${i}`} position={[x + leave * 0.9, 0.085 + i * 0.012 + Math.sin(leave * Math.PI) * 0.35, (i - 1.5) * 0.02 - leave * 0.1]} rotation={[0, leave * 2 + i * 0.1, 0]} />;
        }),
      )}
      {divider && <InkBox size={[0.02, 0.1, 0.4]} position={[0, 0.06, 0]} color="#ffd23f" ink={0.004} />}
      {divider && (
        <>
          <Label text="STUDIO" position={[-0.15, 0.16, 0.2]} rotation={[-0.9, 0, 0]} width={0.22} fg="#ffffff" bg="#1d2f5e" />
          <Label text="THEATER" position={[0.15, 0.16, 0.2]} rotation={[-0.9, 0, 0]} width={0.22} fg="#ffffff" bg="#d62828" />
        </>
      )}
      {label && <Label text={label} position={[0, 0.16, 0.2]} rotation={[-0.9, 0, 0]} width={0.5} fg="#ffffff" bg="#d62828" />}
    </group>
  </group>
);

// Open briefcase lying on a surface, bills piling in as `fill` rises.
export const OpenBriefcase: React.FC<{ position: Vec3; fill?: number }> = ({ position, fill = 0 }) => (
  <group position={position}>
    <InkBox size={[0.46, 0.08, 0.32]} position={[0, 0.04, 0]} color="#5a3a22" />
    <InkBox size={[0.46, 0.32, 0.03]} position={[0, 0.2, -0.17]} rotation={[-0.25, 0, 0]} color="#5a3a22" />
    {Array.from({ length: Math.round(fill * 4) }, (_, i) => (
      <Bill key={i} position={[-0.06 + (i % 2) * 0.12, 0.09 + i * 0.012, 0]} rotation={[0, i * 0.3, 0]} />
    ))}
  </group>
);

// Contract lying flat with a rubber-stamp mark that slams in with `stamp` 0..1.
export const Contract: React.FC<{ position: Vec3; stamp: number; mark: string }> = ({ position, stamp, mark }) => {
  const tex = useMemo(
    () =>
      canvasTexture(720, 960, (ctx) => {
        ctx.fillStyle = "#fffdf4";
        ctx.fillRect(0, 0, 720, 960);
        ctx.fillStyle = INK;
        ctx.font = `900 64px ${BLOCK_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("FILM DEAL", 360, 110);
        ctx.fillStyle = "#b9b2a0";
        for (let i = 0; i < 14; i++) ctx.fillRect(70, 180 + i * 46, 580 - (i % 3) * 90, 14);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(380, 880);
        ctx.bezierCurveTo(430, 820, 480, 920, 560, 860);
        ctx.stroke();
      }),
    [],
  );
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0.06]}>
      <mesh>
        <planeGeometry args={[0.42, 0.56]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {stamp > 0 && (
        <group position={[0, -0.02, 0.004]} rotation={[0, 0, -0.2]} scale={1 + (1 - stamp) * 0.9}>
          <Label text={mark} position={[0, 0, 0]} width={0.3} fg="#e0262f" bg="#fffdf4" />
        </group>
      )}
    </group>
  );
};

// Rubber stamp hovering over a point, coming down as `press` goes 0 → 1.
export const RubberStamp: React.FC<{ position: Vec3; press: number }> = ({ position, press }) => (
  <group position={[position[0] + (1 - press) * 0.45, position[1] + 0.03 + (1 - press) * 0.3, position[2]]}>
    <InkBox size={[0.18, 0.05, 0.12]} position={[0, 0, 0]} color="#d62828" ink={0.008} />
    <InkCylinder radius={0.025} height={0.12} position={[0, 0.08, 0]} color="#a0662e" ink={0.008} />
    <mesh position={[0, 0.16, 0]}>
      <sphereGeometry args={[0.045, 16, 16]} />
      <meshToonMaterial color="#a0662e" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// Cinema marquee with chasing bulbs. `on` 0..1 dims the whole sign.
export const Marquee: React.FC<{ position: Vec3; text: string; f: number; on?: number; width?: number }> = ({ position, text, f, on = 1, width = 3.2 }) => {
  const n = Math.round(width * 8);
  return (
    <group position={position}>
      <InkBox size={[width, 1.0, 0.3]} position={[0, 0, 0]} color="#e0262f" />
      <Label text={text} position={[0, 0, 0.16]} width={width * 0.8} fg={on > 0.5 ? INK : "#5a5a5a"} bg={on > 0.5 ? "#fff6dc" : "#6a6458"} border={false} />
      {Array.from({ length: n }, (_, i) => {
        const lit = on > 0.5 && (i + Math.floor(f / 3)) % 3 !== 0;
        return [0.44, -0.44].map((y) => (
          <mesh key={`${i}${y}`} position={[-width / 2 + 0.06 + (i * (width - 0.12)) / (n - 1), y, 0.17]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshBasicMaterial color={lit ? "#ffe9a0" : "#5a4a3a"} toneMapped={false} />
          </mesh>
        ));
      })}
      {on > 0.5 && <Halo position={[0, 0, 0.2]} size={width * 1.5} color="#ffcf6b" strength={0.45 * on} />}
    </group>
  );
};

// Glass jar of mixed tokens: popcorn share in yellow at the bottom, ticket share in blue above.
// `appear` pops the band label (Label's `appear`).
export const Jar: React.FC<{ position: Vec3; label: string; snack: number; fill?: number; band?: string; appear?: number }> = ({ position, label, snack, fill = 1, band, appear }) => {
  const H = 1.0;
  const sh = H * snack * fill;
  const th = H * (1 - snack) * Math.max(0, Math.min(1, fill * 1.4 - 0.4));
  return (
    <group position={position}>
      <mesh position={[0, sh / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.27, 0.27, Math.max(sh, 0.001), 32]} />
        <meshToonMaterial color="#ffd23f" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, sh + th / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.27, 0.27, Math.max(th, 0.001), 32]} />
        <meshToonMaterial color="#4f7dff" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, H / 2 + 0.04, 0]}>
        <cylinderGeometry args={[0.3, 0.3, H + 0.08, 32, 1, true]} />
        <meshBasicMaterial color="#e6fbff" transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <InkCylinder radius={0.31} height={0.06} position={[0, H + 0.1, 0]} color="#c9ced3" />
      <Label text={label} position={[0, H + 0.24, 0]} width={0.56} fg="#ffffff" bg="#1d2f5e" />
      {band && fill > 0.6 && <Label text={band} position={[0, Math.max(sh / 2, 0.1), 0.32]} width={0.5} fg={INK} bg="#ffd23f" appear={appear} />}
    </group>
  );
};

// 100 coins = one dollar. `spent` 0..1 greys out 96 of them; four stay gold.
export const CoinBoard: React.FC<{ position: Vec3; spent: number; size?: number }> = ({ position, spent, size = 1.1 }) => {
  const step = Math.round(Math.min(1, Math.max(0, spent)) * 12);
  const tex = useMemo(
    () =>
      canvasTexture(1000, 1000, (ctx) => {
        ctx.fillStyle = "#2a0f3a";
        ctx.fillRect(0, 0, 1000, 1000);
        const gone = Math.round((step / 12) * 96);
        for (let i = 0; i < 100; i++) {
          const x = (i % 10) * 96 + 68;
          const y = Math.floor(i / 10) * 96 + 68;
          const kept = i >= 96;
          const grey = !kept && i < gone;
          ctx.fillStyle = grey ? "#55506a" : "#ffcc33";
          ctx.strokeStyle = INK;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(x, y, 38, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (kept && step === 12) {
            ctx.strokeStyle = "#ff4fd8";
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(x, y, 46, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }),
    [step],
  );
  return (
    <group position={position}>
      <InkBox size={[size + 0.08, size + 0.08, 0.04]} position={[0, 0, -0.025]} color="#22262b" />
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <Label text="$1 = 100¢" position={[0, size / 2 + 0.16, 0.01]} width={0.7} fg="#ffffff" bg="#d62828" />
      {step === 12 && <Label text="THEATER KEEPS 4¢" position={[0, -size / 2 - 0.14, 0.01]} width={0.8} fg={INK} bg="#ffcc33" />}
    </group>
  );
};

// Seesaw: TICKETS end goes down, POPCORN end goes up, by `tilt` 0..1.
export const Seesaw: React.FC<{ position: Vec3; tilt: number }> = ({ position, tilt }) => {
  const a = tilt * 0.4;
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}>
        <coneGeometry args={[0.25, 0.5, 3]} />
        <meshToonMaterial color="#5a3d7a" gradientMap={toonRamp} />
      </mesh>
      <group position={[0, 0.52, 0]} rotation={[0, 0, a]}>
        <InkBox size={[1.4, 0.06, 0.3]} position={[0, 0, 0]} color="#c99a6b" />
        <group position={[-0.55, 0.03, 0]}>
          <InkBox size={[0.36, 0.22, 0.26]} position={[0, 0.11, 0]} color="#4f7dff" />
          <group rotation={[0, 0, -a]}>
            <Label text="TICKETS" position={[0, 0.42, 0.05]} width={0.5} fg="#ffffff" bg="#1d2f5e" />
          </group>
        </group>
        <group position={[0.55, 0.03, 0]}>
          <Bucket position={[0, 0, 0]} scale={1.3} />
          <group rotation={[0, 0, -a]}>
            <Label text="POPCORN" position={[0, 0.6, 0.05]} width={0.55} fg="#ffffff" bg="#d62828" />
          </group>
        </group>
      </group>
    </group>
  );
};

// Burlap sack of kernels with a stencil.
export const Sack: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.42, 0.55, 0.3]} position={[0, 0.275, 0]} color="#c8a26b" />
    <InkBox size={[0.3, 0.08, 0.2]} position={[0, 0.59, 0]} color="#b08850" />
    <Label text="CORN" position={[0, 0.3, 0.16]} width={0.3} fg="#7a4a1a" bg="#e6cf9a" border={false} />
  </group>
);

// Cinema screen: a big glowing panel showing a simple "movie" (a sunset that drifts with f).
export const MovieScreen: React.FC<{ position: Vec3; width: number; f: number; on?: number }> = ({ position, width, f, on = 1 }) => {
  const h = width * 0.45;
  const sun = Math.round(f / 4) % 40;
  const tex = useMemo(
    () =>
      canvasTexture(640, 288, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 288);
        g.addColorStop(0, "#ff7eb6");
        g.addColorStop(1, "#ffd27a");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 640, 288);
        ctx.fillStyle = "#fff4c2";
        ctx.beginPath();
        ctx.arc(200 + sun * 6, 170, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a1650";
        ctx.beginPath();
        ctx.moveTo(0, 288);
        ctx.lineTo(0, 210);
        ctx.lineTo(160, 150);
        ctx.lineTo(300, 220);
        ctx.lineTo(470, 130);
        ctx.lineTo(640, 200);
        ctx.lineTo(640, 288);
        ctx.fill();
      }),
    [sun],
  );
  return (
    <group position={position}>
      <InkBox size={[width + 0.2, h + 0.2, 0.06]} position={[0, 0, -0.05]} color="#1a0a24" />
      <mesh>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial map={tex} color={on > 0.5 ? "#ffffff" : "#333333"} toneMapped={false} />
      </mesh>
      {on > 0.5 && <Halo position={[0, 0, 0.1]} size={width * 1.6} color="#ff9fd0" strength={0.4} />}
    </group>
  );
};

// Cinema seats: rows of red chairs facing -z, stepped up toward +z.
export const CinemaSeats: React.FC<{ rows: number; cols: number[]; z0: number; color?: string }> = ({ rows, cols, z0, color = "#b0203a" }) => (
  <group>
    {Array.from({ length: rows }, (_, r) =>
      cols.map((x) => (
        <group key={`${r}${x}`} position={[x, r * 0.18, z0 + r * 0.95]}>
          <InkBox size={[0.46, 0.18 + r * 0.18, 0.46]} position={[0, -(r * 0.18) / 2 + 0.06, 0]} color="#3a1a2a" ink={0.006} />
          <InkBox size={[0.44, 0.1, 0.42]} position={[0, 0.34, 0]} color={color} />
          <InkBox size={[0.44, 0.36, 0.1]} position={[0, 0.53, 0.2]} color={color} />
        </group>
      )),
    )}
  </group>
);

// A big dollar coin standing on its edge, face toward +z.
export const DollarCoin: React.FC<{ position: Vec3; radius?: number }> = ({ position, radius = 0.24 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = "#ffcc33";
        ctx.beginPath();
        ctx.arc(256, 256, 250, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#c98a1a";
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(256, 256, 210, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#7a4a1a";
        ctx.font = `900 250px ${BLOCK_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$1", 256, 270);
      }),
    [],
  );
  return (
    <group position={position}>
      <InkCylinder radius={radius} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#ffcc33" ink={0.01} />
      <mesh position={[0, 0, 0.027]}>
        <circleGeometry args={[radius * 0.98, 48]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};
