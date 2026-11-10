import React from "react";
import * as THREE from "three";
import { BlenderModel, canvasTexture, InkBox, InkCylinder, toonRamp, Vec3 } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

const INK = "#161212";
const K = 1.3 / 1060; // metres per puppet unit
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- the open touring car (sand3d: ../videos/what-if-sarajevo/sand3d/tourer.py) ----------

export const CAR = { r: 0.38, half: 1.6, width: 1.4 };
// Seats in the car's own space (front toward +z, the car's right at -x). Bench tops: front 0.62, rear 0.70.
export const SEAT = {
  driver: { x: -0.27, z: 0.14, y: 0.62 },
  governor: { x: 0.27, z: 0.14, y: 0.62 },
  archduke: { x: 0.25, z: -0.76, y: 0.84 },
  sophie: { x: -0.25, z: -0.76, y: 0.84 },
};
export type SeatName = keyof typeof SEAT;

// A heading of 0 drives toward +z; -PI/2 toward -x; PI toward -z.
export const local = (at: [number, number], heading: number, x: number, z: number): [number, number] => {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  return [at[0] + x * c + z * s, at[1] - x * s + z * c];
};
export const seatAt = (at: [number, number], heading: number, seat: SeatName, lift = 0) => {
  const s = SEAT[seat];
  return { at: local(at, heading, s.x, s.z), air: (s.y + lift - 0.34) / K, headY: s.y + lift + 0.57 };
};

export const Tourer: React.FC<{ at: [number, number]; heading: number; roll?: number; bump?: number; pitch?: number; steer?: number }> = ({ at, heading, roll = 0, bump = 0, pitch = 0 }) => {
  const deg = (roll / CAR.r) * (180 / Math.PI);
  return (
    <group position={[at[0], bump, at[1]]} rotation={[0, heading, 0]}>
      <group rotation={[pitch, 0, 0]}>
        <BlenderModel src="videos/what-if-sarajevo/models/tourer.glb" joints={{ spin_FL: deg, spin_FR: deg, spin_RL: deg, spin_RR: deg }} />
      </group>
    </group>
  );
};

// The route through the corner: along the quay toward -x in lane z = LANE, a right turn of radius TURN_R into
// Franz Joseph Street (x = 0) toward -z. `s` metres from the start of the turn (negative before it).
export const LANE = 0.2;
export const TURN_R = 1.6;
const ARC = (Math.PI / 2) * TURN_R;
export const route = (s: number): { at: [number, number]; heading: number } => {
  if (s <= 0) return { at: [TURN_R - s, LANE], heading: -Math.PI / 2 };
  if (s <= ARC) {
    const p = s / TURN_R;
    return { at: [TURN_R - TURN_R * Math.sin(p), LANE - TURN_R + TURN_R * Math.cos(p)], heading: -Math.PI / 2 - p };
  }
  return { at: [0, LANE - TURN_R - (s - ARC)], heading: -Math.PI };
};
export const STOP_S = ARC + 2.0; // where the Archduke's car stands still in the side street

// ---------- the Archduke's general's hat: dark green, gold band, a tall spray of green plumes ----------

export const GeneralHat: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <group userData={{ ghost: true }}>
      <mesh position={[0, 0.05, 0]} scale={[1.25, 0.75, 0.9]} castShadow>
        <sphereGeometry args={[0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color="#1c3424" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.05, 0]} scale={[1.33, 0.82, 0.98]}>
        <sphereGeometry args={[0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <InkCylinder radius={0.16} height={0.05} position={[0, 0.03, 0]} color="#1c3424" ink={0.008} />
      <InkCylinder radius={0.15} height={0.025} position={[0, 0.065, 0]} color="#e0b040" ink={0.004} />
      {/* the plume: drooping green feathers */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i - 4) * 0.22;
        return (
          <group key={i} position={[a * 0.12, 0.12, 0]} rotation={[0, 0, -a * 1.4]}>
            <mesh position={[0, 0.11, 0]} rotation={[0, 0, a > 0 ? -0.3 : 0.3]} scale={[0.035, 0.13, 0.03]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshToonMaterial color={i % 2 ? "#3a9a4a" : "#2e8040"} gradientMap={toonRamp} />
            </mesh>
            <mesh position={[0, 0.11, 0]} rotation={[0, 0, a > 0 ? -0.3 : 0.3]} scale={[0.045, 0.14, 0.04]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color={INK} side={THREE.BackSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  </group>
);

// Sophie's wide white summer hat with a pale ribbon.
export const LadyHat: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <group userData={{ ghost: true }}>
      <InkCylinder radius={0.2} height={0.025} position={[0, 0.0, 0]} color="#f6f2ea" ink={0.008} />
      <InkCylinder radius={0.1} height={0.09} position={[0, 0.05, 0]} color="#f6f2ea" ink={0.008} />
      <InkCylinder radius={0.103} height={0.03} position={[0, 0.03, 0]} color="#d8b8c8" ink={0.003} />
    </group>
  </group>
);

// ---------- the bomb, smoke and flashes ----------

export const Bomb: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => (
  <group position={position} scale={1.5} userData={{ ghost: true }}>
    <mesh castShadow>
      <sphereGeometry args={[0.09, 16, 12]} />
      <meshToonMaterial color="#26262a" gradientMap={toonRamp} />
    </mesh>
    <mesh scale={1.15}>
      <sphereGeometry args={[0.09, 16, 12]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <InkCylinder radius={0.012} height={0.08} position={[0, 0.12, 0]} color="#c8a878" ink={0.003} />
    <mesh position={[0, 0.17, 0]} scale={0.03 + 0.012 * Math.abs(Math.sin(frame * 1.9))}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color={new THREE.Color(3, 2.2, 0.8)} toneMapped={false} />
    </mesh>
  </group>
);

// A burst of inked smoke puffs from `at`, `t` frames since the blast (negative: nothing).
export const SmokeBurst: React.FC<{ at: Vec3; t: number; size?: number; count?: number; seed?: number; color?: string; rise?: number }> = ({
  at,
  t,
  size = 1,
  count = 12,
  seed = 1,
  color = "#d8d4cc",
  rise = 1,
}) => {
  if (t < 0) return null;
  return (
    <group position={at} userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const a = rand(seed + i) * Math.PI * 2;
        const sp = 0.4 + rand(seed + i * 3) * 0.6;
        const out = 1 - Math.exp(-t / 10);
        const r = (0.12 + rand(seed + i * 5) * 0.16) * size * (0.4 + out * 1.4) * Math.max(0, 1 - Math.max(0, t - 70) / 50);
        if (r <= 0.001) return null;
        const p: Vec3 = [Math.cos(a) * sp * out * size * 0.9, (0.1 + rand(seed + i * 7) * 0.5) * out * size + t * 0.004 * rise, Math.sin(a) * sp * out * size * 0.6];
        const shade = i % 3 === 0 ? "#a8a49c" : color;
        return (
          <group key={i} position={p}>
            <mesh scale={r}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshToonMaterial color={shade} gradientMap={toonRamp} />
            </mesh>
            <mesh scale={r * 1.08}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshBasicMaterial color="#5a5660" side={THREE.BackSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// A hot flash ball that blooms and is gone in a few frames.
export const Flash: React.FC<{ at: Vec3; t: number; size?: number }> = ({ at, t, size = 0.5 }) => {
  if (t < 0 || t > 6) return null;
  const k = 1 - t / 6;
  return (
    <mesh position={at} scale={size * (0.6 + (t / 6) * 0.8)} userData={{ ghost: true }}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial color={new THREE.Color(4 * k, 3 * k, 1.4 * k)} transparent opacity={k} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

// ---------- the drivers' newspaper ----------

const paperCanvas = () =>
  canvasTexture(256, 320, (ctx) => {
    ctx.fillStyle = "#efe8d6";
    ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = "#2a2622";
    ctx.fillRect(16, 16, 224, 34);
    for (let c = 0; c < 3; c++)
      for (let l = 0; l < 22; l++) {
        ctx.fillStyle = "rgba(40,36,30,0.55)";
        ctx.fillRect(16 + c * 76, 66 + l * 11, 62 - rand(c * 40 + l) * 18, 4);
      }
  });

export const Newspaper: React.FC<{ position: Vec3; rotation?: Vec3; flutter?: number }> = ({ position, rotation = [0, 0, 0], flutter = 0 }) => {
  const tex = useOwned(() => paperCanvas());
  return (
    <group position={position} rotation={rotation} userData={{ ghost: true }}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.1, 0, 0]} rotation={[0, s * (0.25 + flutter * 0.3), 0]}>
          <planeGeometry args={[0.2, 0.26]} />
          <meshToonMaterial map={tex} gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- the pivot: a map table with labelled dominoes, a wall calendar ----------

const mapCanvas = () =>
  canvasTexture(1024, 768, (ctx) => {
    ctx.fillStyle = "#9ab8c8"; // sea
    ctx.fillRect(0, 0, 1024, 768);
    ctx.fillStyle = "#e4d4a8"; // land
    ctx.beginPath();
    ctx.moveTo(60, 120);
    const pts = [
      [240, 60], [420, 120], [560, 40], [800, 30], [1000, 60], [1024, 520], [860, 600], [760, 560], [700, 640], [620, 560], [540, 700],
      [470, 560], [380, 600], [300, 520], [200, 600], [120, 520], [180, 400], [80, 300],
    ];
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    // borders and wear
    ctx.strokeStyle = "rgba(140,90,60,0.6)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    for (const [x0, y0, x1, y1] of [
      [300, 120, 360, 520], [520, 80, 470, 560], [620, 60, 640, 560], [380, 300, 700, 330], [560, 420, 820, 460],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2 + 40, (y0 + y1) / 2, x1, y1);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(120,90,50,0.08)" : "rgba(255,250,230,0.1)";
      ctx.beginPath();
      ctx.ellipse(rand(i * 3) * 1024, rand(i * 5) * 768, 20 + rand(i) * 60, 14 + rand(i + 1) * 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

export const MapTable: React.FC<{ position: Vec3; size?: [number, number] }> = ({ position, size = [2.4, 1.6] }) => {
  const tex = useOwned(() => mapCanvas());
  return (
    <group position={position}>
      <InkBox size={[size[0] + 0.16, 0.1, size[1] + 0.16]} position={[0, -0.05, 0]} color="#5a3a24" ink={0.012} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={size} />
        <meshToonMaterial map={tex} gradientMap={toonRamp} />
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.1, 0.8, 0.1]} position={[sx * (size[0] / 2 - 0.05), -0.45, sz * (size[1] / 2 - 0.05)]} color="#4a2e1c" ink={0.008} />))}
    </group>
  );
};

const dominoCanvas = (text: string, color: string) =>
  canvasTexture(384, 640, (ctx) => {
    ctx.fillStyle = "#fff6dc";
    ctx.fillRect(0, 0, 384, 640);
    ctx.strokeStyle = color;
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, 366, 622);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(192, 470, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "900 74px Arial Black, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 192, 200, 340);
  });

// A standing domino block, its broad labelled face toward +z; it tips backward (toward -z) about its back bottom
// edge as `fall` goes 0 -> 1 (about 1.2 rad: it comes to rest leaning on the next one or lying down with `flat`).
export const Domino: React.FC<{ position: Vec3; label: string; color: string; fall?: number; w?: number; h?: number; flat?: boolean }> = ({
  position,
  label,
  color,
  fall = 0,
  w = 0.3,
  h = 0.5,
  flat = false,
}) => {
  const tex = useOwned(() => dominoCanvas(label, color));
  const t = 0.08;
  const a = Math.min(1, Math.max(0, fall)) * (flat ? Math.PI / 2 - 0.03 : 0.74);
  return (
    <group position={position}>
      <group position={[0, 0, -t / 2]} rotation={[-a, 0, 0]}>
        <group position={[0, h / 2, t / 2]}>
          <InkBox size={[w, h, t]} color={color} ink={0.008} />
          <mesh position={[0, 0, t / 2 + 0.002]}>
            <planeGeometry args={[w * 0.92, h * 0.94]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

const calendarCanvas = (month: string) =>
  canvasTexture(256, 320, (ctx) => {
    ctx.fillStyle = "#fbf6ea";
    ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = "#b8302a";
    ctx.fillRect(0, 0, 256, 80);
    ctx.fillStyle = "#fff6dc";
    ctx.font = "900 54px Arial Black, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(month, 128, 44);
    ctx.fillStyle = "#1a1612";
    ctx.font = "900 150px Georgia, serif";
    ctx.fillText("28", 128, 200);
    ctx.font = "700 34px Georgia, serif";
    ctx.fillText("1914", 128, 290);
  });

// A tear-off wall calendar: JUNE on top until `flip` (0..1) lifts the page up and over, showing JULY.
export const WallCalendar: React.FC<{ position: Vec3; flip: number }> = ({ position, flip }) => {
  const june = useOwned(() => calendarCanvas("JUNE"));
  const july = useOwned(() => calendarCanvas("JULY"));
  const f = Math.min(1, Math.max(0, flip));
  return (
    <group position={position}>
      <InkBox size={[0.62, 0.76, 0.03]} position={[0, 0, -0.02]} color="#6a4a2e" ink={0.008} />
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[0.56, 0.7]} />
        <meshBasicMaterial map={july} toneMapped={false} />
      </mesh>
      {f < 0.98 && (
        <group position={[0, 0.35, 0.004]} rotation={[-f * Math.PI * 0.95, 0, 0]}>
          <mesh position={[0, -0.35, 0]}>
            <planeGeometry args={[0.56, 0.7]} />
            <meshBasicMaterial map={june} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ---------- four crowns on cushions ----------

export const Crown: React.FC<{ position: Vec3; topple: number; color?: string; dir?: number }> = ({ position, topple, color = "#e8b830", dir = 1 }) => {
  const p = Math.min(1, Math.max(0, topple));
  // tips over the cushion's edge, falls and lands on its side on the floor below
  const tip = Math.min(1, p * 2.2);
  const drop = Math.max(0, (p - 0.35) / 0.65);
  const y = -drop * drop * 0.52;
  return (
    <group position={[position[0] + dir * (tip * 0.1 + drop * 0.18), position[1] + y, position[2]]} rotation={[0, 0, -dir * Math.min(Math.PI / 2, tip * 1.3 + drop * 0.4)]}>
      <InkCylinder radius={0.11} height={0.08} position={[0, 0.04, 0]} color={color} ink={0.006} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.1, 0.12, Math.sin(a) * 0.1]}>
            <mesh rotation={[0, -a, 0]}>
              <coneGeometry args={[0.035, 0.1, 4]} />
              <meshToonMaterial color={color} gradientMap={toonRamp} />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <sphereGeometry args={[0.016, 8, 6]} />
              <meshToonMaterial color="#fff2c0" gradientMap={toonRamp} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.06, 0]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.09, 16, 10]} />
        <meshToonMaterial color="#9a1e2a" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0.11, 0.05, 0]}>
        <sphereGeometry args={[0.02, 8, 6]} />
        <meshToonMaterial color="#2a6ad8" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

export const Pedestal: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.27, 0.9, 0.27]} position={[0, 0.45, 0]} color="#e8dcc4" ink={0.01} />
    <InkBox size={[0.33, 0.06, 0.33]} position={[0, 0.93, 0]} color="#d4c4a4" ink={0.008} />
    <InkBox size={[0.27, 0.08, 0.27]} position={[0, 1.0, 0]} color="#7a1a3a" ink={0.008} />
  </group>
);

// The lamplighter's long pole with a burning wick at its tip (`spark` frames since he touches the lamp).
export const LampPole: React.FC<{ from: Vec3; to: Vec3; wick?: number }> = ({ from, to, wick = 1 }) => {
  const d = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const len = d.length();
  const mid: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <group userData={{ ghost: true }}>
      <group position={mid} rotation={[e.x, e.y, e.z]}>
        <InkCylinder radius={0.014} height={len} color="#6a4a2e" ink={0.004} />
      </group>
      {wick > 0 && (
        <mesh position={to} scale={0.028 * wick}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color={new THREE.Color(3.2, 1.9, 0.6)} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};
