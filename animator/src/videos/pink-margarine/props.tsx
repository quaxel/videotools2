import React from "react";
import * as THREE from "three";
import { CameraShot, Counter, Door, Halo, InkBox, InkCylinder, Label, Room, toonRamp, Vec3, Window } from "../../engine";

// Props and sets for "The Law That Made Margarine Pink".
// General store and courtroom built from guide/references/general-store-1890s.md.

export const BUTTER = "#f6d55c";
export const PINK = "#ff8fc8";
const WOOD = "#6b4226";
const WOOD_DARK = "#4a2c18";
const IRON = "#2a2626";

// ---------- small props ----------

// A wooden tub (firkin) of margarine: staves, two iron hoops, an optional printed band and an open top that shows
// the contents' colour. `cut` slices a wedge out of the front so the colour inside shows.
export const Tub: React.FC<{ position: Vec3; fill?: string; text?: string; open?: boolean; scale?: number | Vec3; lid?: number; labelBg?: string }> = ({
  position,
  fill = BUTTER,
  text,
  open = true,
  scale = 1,
  lid = 0,
  labelBg = "#fff6dc",
}) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.17} height={0.26} position={[0, 0.13, 0]} color="#c08a4e" />
    {[0.05, 0.22].map((y) => (
      <InkCylinder key={y} radius={0.175} height={0.025} position={[0, y, 0]} color={IRON} ink={0.004} />
    ))}
    {open && (
      <mesh position={[0, 0.255, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 32]} />
        <meshToonMaterial color={fill} gradientMap={toonRamp} />
      </mesh>
    )}
    {open && (
      <mesh position={[0.02, 0.27, 0.02]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color={fill} gradientMap={toonRamp} />
      </mesh>
    )}
    {!open && (
      <group position={[0, 0.27 + lid * 0.5, lid * 0.15]} rotation={[-lid * 1.8, 0, lid * 0.6]}>
        <InkCylinder radius={0.18} height={0.025} color="#a8743e" ink={0.005} />
      </group>
    )}
    {text && <Label text={text} position={[0, 0.135, 0.176]} width={0.3} bg={labelBg} />}
  </group>
);

// A block of margarine or butter on a plate.
export const Block: React.FC<{ position: Vec3; color?: string; scale?: number }> = ({ position, color = BUTTER, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.2} height={0.02} position={[0, 0.01, 0]} color="#f7f7f2" ink={0.004} />
    <InkBox size={[0.22, 0.1, 0.13]} position={[0, 0.07, 0]} color={color} ink={0.006} />
  </group>
);

// A brass platform scale with a dial card.
export const Scale: React.FC<{ position: Vec3; reading: string; needle: number }> = ({ position, reading, needle }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.08, 0.4]} position={[0, 0.04, 0]} color="#b8892e" />
    <InkBox size={[0.44, 0.02, 0.34]} position={[0, 0.09, 0]} color="#d9b45a" ink={0.004} />
    <InkBox size={[0.06, 0.3, 0.06]} position={[0, 0.2, -0.17]} color="#b8892e" ink={0.005} />
    <mesh position={[0, 0.42, -0.16]} rotation={[0, 0, 0]}>
      <circleGeometry args={[0.13, 32]} />
      <meshBasicMaterial color="#fff6dc" toneMapped={false} />
    </mesh>
    <InkBox size={[0.012, 0.1, 0.01]} position={[Math.sin(needle) * 0.05, 0.42 + Math.cos(needle) * 0.05, -0.15]} rotation={[0, 0, -needle]} color="#d62828" ink={0} shadows={false} />
    <Label text={reading} position={[0, 0.6, -0.16]} width={0.34} fg="#ffffff" bg="#2a1a10" />
  </group>
);

// A big open law book. `page` is the readable text on the right-hand page.
export const LawBook: React.FC<{ position: Vec3; rotation?: Vec3; title?: string; page?: string; pageAppear?: number; open?: number; scale?: number }> = ({
  position,
  rotation = [0, 0, 0],
  title = "N.H. LAW",
  page,
  pageAppear,
  open = 1,
  scale = 1,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* left cover lies flat, right cover swings open */}
    <InkBox size={[0.3, 0.04, 0.4]} position={[-0.15, 0.02, 0]} color="#7a1a1a" ink={0.006} />
    <InkBox size={[0.28, 0.03, 0.38]} position={[-0.15, 0.05, 0]} color="#fbf3dc" ink={0.004} />
    <group position={[0, 0.02, 0]} rotation={[0, 0, (1 - open) * Math.PI * 0.98]}>
      <InkBox size={[0.3, 0.04, 0.4]} position={[0.15, 0, 0]} color="#7a1a1a" ink={0.006} />
      <InkBox size={[0.28, 0.03, 0.38]} position={[0.15, 0.03, 0]} color="#fbf3dc" ink={0.004} />
      {open < 0.5 && <Label text={title} position={[0.15, -0.025, 0]} rotation={[Math.PI / 2, 0, Math.PI]} width={0.24} fg="#f2d27a" bg="#7a1a1a" border={false} />}
      {page && open > 0.9 && <Label text={page} position={[0.15, 0.047, 0]} rotation={[-Math.PI / 2, 0, 0]} width={0.26} fg="#2a1a10" bg="#fbf3dc" border={false} appear={pageAppear} />}
    </group>
    {/* printed lines on the left page */}
    {Array.from({ length: 7 }, (_, i) => (
      <InkBox key={i} size={[0.2, 0.002, 0.012]} position={[-0.15, 0.067, -0.14 + i * 0.045]} color="#8a7a60" ink={0} shadows={false} />
    ))}
  </group>
);

// A wooden lectern for the law book.
export const Lectern: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.9, 0.4]} position={[0, 0.45, 0]} color={WOOD} />
    <InkBox size={[0.7, 0.05, 0.5]} position={[0, 0.93, 0]} rotation={[0.25, 0, 0]} color={WOOD_DARK} />
  </group>
);

// A hand stamp that slams down at `hit` (frames relative to f) and leaves its card behind.
export const Stamp: React.FC<{ position: Vec3; f: number; hit: number; text: string; ink?: string }> = ({ position, f, hit, text, ink = "#d62828" }) => {
  const dt = f - hit;
  const y = dt < -10 ? 0.5 : dt < 0 ? 0.5 * (-dt / 10) ** 2 : dt < 8 ? 0 : Math.min(0.5, (dt - 8) * 0.05);
  return (
    <group position={position}>
      <group position={[0, y, 0]}>
        <InkBox size={[0.18, 0.05, 0.12]} position={[0, 0.03, 0]} color="#3a2a20" ink={0.005} />
        <InkCylinder radius={0.025} height={0.12} position={[0, 0.11, 0]} color={WOOD} ink={0.004} />
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshToonMaterial color="#d62828" gradientMap={toonRamp} />
        </mesh>
      </group>
      {dt >= 0 && <Label text={text} position={[0, 0.004, 0.13]} rotation={[-Math.PI / 2, 0, 0.12]} width={0.36} fg={ink} bg="#ffffff" appear={dt} />}
    </group>
  );
};

// A paper ticket lying on a surface.
export const Ticket: React.FC<{ position: Vec3; text: string; rotationZ?: number }> = ({ position, text, rotationZ = 0 }) => (
  <group position={position} rotation={[-Math.PI / 2, 0, rotationZ]}>
    <mesh>
      <planeGeometry args={[0.34, 0.24]} />
      <meshBasicMaterial color="#fffdf4" toneMapped={false} />
    </mesh>
    <Label text={text} position={[0, 0.02, 0.002]} width={0.3} fg="#1d1a1a" bg="#fffdf4" border={false} />
  </group>
);

// A dropper bottle of dye; `drip` 0..1 makes one drop fall below it.
export const DyeBottle: React.FC<{ position: Vec3; label: string; color: string; drip: number }> = ({ position, label, color, drip }) => (
  <group position={position}>
    <InkCylinder radius={0.06} height={0.18} position={[0, 0, 0]} color="#8a5a2a" />
    <InkCylinder radius={0.02} height={0.08} position={[0, 0.13, 0]} color="#1d1a1a" ink={0.004} />
    <mesh position={[0, 0.2, 0]}>
      <sphereGeometry args={[0.035, 14, 10]} />
      <meshToonMaterial color="#d62828" gradientMap={toonRamp} />
    </mesh>
    <Label text={label} position={[0, 0, 0.062]} width={0.2} fg="#1d1a1a" bg={color} />
    {drip > 0 && drip < 1 && (
      <mesh position={[0, -0.12 - drip * 0.35, 0]}>
        <sphereGeometry args={[0.018, 12, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    )}
  </group>
);

// A vat of pink dye. `dunk` 0..1 lowers a margarine block on a hook into it and back up, coming out pink.
export const DyeVat: React.FC<{ position: Vec3; f: number; dunk: number }> = ({ position, f, dunk }) => {
  const depth = Math.sin(Math.min(1, dunk) * Math.PI);
  const pink = dunk > 0.5;
  return (
    <group position={position}>
      <InkCylinder radius={0.45} height={0.7} position={[0, 0.35, 0]} color="#7a7f86" />
      {[0.12, 0.6].map((y) => (
        <InkCylinder key={y} radius={0.46} height={0.04} position={[0, y, 0]} color={IRON} ink={0.004} />
      ))}
      <mesh position={[0, 0.69, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.41, 40]} />
        <meshBasicMaterial color="#ff4fa8" toneMapped={false} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const a = ((f * 0.02 + i / 5) % 1);
        return (
          <mesh key={i} position={[Math.sin(i * 2.1) * 0.25, 0.7 + a * 0.05, Math.cos(i * 2.1) * 0.2]} scale={1 - a}>
            <sphereGeometry args={[0.03, 10, 8]} />
            <meshBasicMaterial color="#ffc2e4" transparent opacity={1 - a} toneMapped={false} />
          </mesh>
        );
      })}
      <Label text="PINK DYE" position={[0, 0.38, 0.455]} width={0.5} fg="#ffffff" bg="#e0267a" />
      <group position={[0, 1.15 - depth * 0.55, 0]}>
        <InkCylinder radius={0.008} height={0.6} position={[0, 0.42, 0]} color={IRON} ink={0} />
        <InkBox size={[0.26, 0.16, 0.16]} position={[0, 0.06, 0]} color={pink ? PINK : BUTTER} ink={0.008} />
      </group>
      <Halo position={[0, 0.8, 0.2]} size={1.6} color="#ff6fc0" strength={0.35} />
    </group>
  );
};

// A slice of toast with a pat on it; `fly` 0..1 flings it up, over and down butter-side first.
export const Toast: React.FC<{ position: Vec3; pat: string; fly?: number }> = ({ position, pat, fly = 0 }) => {
  const p = Math.min(1, fly);
  const y = 0.6 * Math.sin(p * Math.PI) ;
  return (
    <group position={[position[0] + p * 0.5, position[1] + y - (p >= 1 ? 0 : 0), position[2] + p * 0.25]} rotation={[p * Math.PI, 0, p * 0.4]}>
      <InkBox size={[0.18, 0.025, 0.16]} position={[0, 0.0125, 0]} color="#d99a4a" ink={0.005} />
      <InkBox size={[0.06, 0.02, 0.05]} position={[0, 0.035, 0]} color={pat} ink={0.004} />
    </group>
  );
};

// A padlock with a printed tag.
export const Padlock: React.FC<{ position: Vec3; tag: string; shake?: number }> = ({ position, tag, shake = 0 }) => (
  <group position={position} rotation={[0, 0, Math.sin(shake * 40) * 0.15 * Math.min(1, shake * 4)]}>
    <mesh position={[0, 0.07, 0]}>
      <torusGeometry args={[0.055, 0.014, 10, 24, Math.PI]} />
      <meshToonMaterial color="#b0b6bc" gradientMap={toonRamp} />
    </mesh>
    <InkBox size={[0.16, 0.13, 0.05]} position={[0, 0, 0]} color="#e8b04a" ink={0.006} />
    <Label text={tag} position={[0, -0.16, 0.03]} width={0.24} fg="#ffffff" bg="#e0267a" />
  </group>
);

// A paint bucket with a coloured band; `pour` 0..1 drops it from above and splashes.
export const Bucket: React.FC<{ position: Vec3; color: string; label?: string; scale?: number }> = ({ position, color, label, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.11} height={0.2} position={[0, 0.1, 0]} color="#c9ced3" />
    <InkCylinder radius={0.112} height={0.08} position={[0, 0.12, 0]} color={color} ink={0.004} />
    <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.1, 28]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    {label && <Label text={label} position={[0, 0.34, 0]} width={0.26} fg="#ffffff" bg={color === "#111111" ? "#333333" : color} />}
  </group>
);

// Pink splash blobs on and around a point, growing with `t`.
export const Splash: React.FC<{ position: Vec3; t: number; color?: string }> = ({ position, t, color = PINK }) => (
  <group position={position}>
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const r = 0.05 + t * (0.18 + (i % 3) * 0.06);
      return (
        <mesh key={i} position={[Math.cos(a) * r, 0.05 + Math.sin(t * Math.PI) * 0.15 * ((i % 2) + 0.5), Math.sin(a) * r * 0.6]} scale={Math.max(0.01, 1 - t * 0.3)}>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshToonMaterial color={color} gradientMap={toonRamp} />
        </mesh>
      );
    })}
  </group>
);

// A rolling green stink cloud from a point, growing with `t`.
export const Stink: React.FC<{ position: Vec3; t: number }> = ({ position, t }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: 10 }, (_, i) => {
      const a = Math.max(0, Math.min(1, t * 1.4 - i * 0.05));
      if (a <= 0) return null;
      return (
        <mesh key={i} position={[Math.sin(i * 1.7) * 0.25 * a + (i % 2 ? 0.1 : -0.1) * a, 0.1 + a * (0.4 + (i % 4) * 0.15), Math.cos(i * 2.3) * 0.1]} scale={0.4 + a * 0.9}>
          <sphereGeometry args={[0.1, 14, 10]} />
          <meshToonMaterial color={i % 3 ? "#8fd14f" : "#b8e86a"} gradientMap={toonRamp} transparent opacity={0.9 - a * 0.3} />
        </mesh>
      );
    })}
  </group>
);

// Jail cell bars across x; `slide` 0..1 rolls the door section shut from the right.
export const CellBars: React.FC<{ position: Vec3; width?: number; slide: number }> = ({ position, width = 2.4, slide }) => {
  const n = Math.round(width / 0.16);
  return (
    <group position={position}>
      <InkBox size={[width + 0.1, 0.08, 0.08]} position={[0, 2.2, 0]} color="#3a3f46" ink={0.005} />
      <InkBox size={[width + 0.1, 0.06, 0.08]} position={[0, 0.03, 0]} color="#3a3f46" ink={0.005} />
      {Array.from({ length: n }, (_, i) => {
        const x = -width / 2 + i * 0.16;
        const isDoor = x > 0;
        const dx = isDoor ? (1 - slide) * 0.9 : 0;
        return <InkCylinder key={i} radius={0.018} height={2.2} position={[x + dx, 1.1, isDoor ? 0.06 : 0]} color="#59606a" ink={0.004} />;
      })}
      <InkBox size={[0.9, 0.05, 0.05]} position={[0.45 + (1 - slide) * 0.9, 1.1, 0.06]} color="#3a3f46" ink={0.004} />
    </group>
  );
};

// A bare hanging light bulb with its own point light.
export const Bulb: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#ffe6a8" }) => (
  <group position={position}>
    <InkCylinder radius={0.006} height={0.7} position={[0, 0.38, 0]} color={IRON} ink={0} />
    <mesh>
      <sphereGeometry args={[0.06, 16, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    <pointLight position={[0, -0.1, 0]} intensity={4} distance={4} color={color} />
    <Halo position={[0, 0, 0.02]} size={0.9} color={color} strength={0.6} />
  </group>
);

// Oil lamp hanging from the ceiling: brass font, glass chimney, flame and a warm light.
export const OilLamp: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => {
  const flick = 1 + Math.sin(f * 0.7) * 0.05 + Math.sin(f * 1.9) * 0.04;
  return (
    <group position={position}>
      <InkCylinder radius={0.006} height={0.8} position={[0, 0.5, 0]} color={IRON} ink={0} />
      <InkCylinder radius={0.12} height={0.03} position={[0, 0.1, 0]} color="#b8892e" ink={0.004} />
      <mesh position={[0, -0.02, 0]}>
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshToonMaterial color="#c99a3a" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.14, 16, 1, true]} />
        <meshBasicMaterial color="#fff4d0" transparent opacity={0.45} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.06, 0]} scale={[1, flick, 1]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshBasicMaterial color="#ffcf5a" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={3.2 * flick} distance={5} color="#ffc070" />
      <Halo position={[0, 0.05, 0.03]} size={1.0} color="#ffb860" strength={0.55 * flick} />
    </group>
  );
};

// A pot-bellied iron stove with its pipe.
const Stove: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.45, 0]} castShadow>
      <sphereGeometry args={[0.28, 20, 16]} />
      <meshToonMaterial color={IRON} gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.2} height={0.12} position={[0, 0.12, 0]} color={IRON} ink={0.004} />
    <InkCylinder radius={0.06} height={2.4} position={[0, 1.8, 0]} color={IRON} ink={0.004} />
    <mesh position={[0, 0.42, 0.27]}>
      <circleGeometry args={[0.06, 16]} />
      <meshBasicMaterial color="#ff8a3a" toneMapped={false} />
    </mesh>
  </group>
);

const Barrel: React.FC<{ position: Vec3; top?: string }> = ({ position, top }) => (
  <group position={position}>
    <InkCylinder radius={0.24} height={0.62} position={[0, 0.31, 0]} color="#9a6a3a" />
    {[0.08, 0.54].map((y) => (
      <InkCylinder key={y} radius={0.245} height={0.03} position={[0, y, 0]} color={IRON} ink={0.004} />
    ))}
    {top && <Label text={top} position={[0, 0.34, 0.245]} width={0.34} fg="#2a1a10" bg="#efe2c6" />}
  </group>
);

// Wall shelving packed with tins, jars and packets.
const TinWall: React.FC<{ position: Vec3; width: number }> = ({ position, width }) => {
  const tins = ["#a83a2a", "#3f7a4a", "#d9b45a", "#efe2c6", "#2f4f7a", "#c06a2a"];
  const rows = 5;
  const per = Math.floor(width / 0.17);
  return (
    <group position={position}>
      <InkBox size={[width, 2.5, 0.3]} position={[0, 1.25, -0.05]} color={WOOD_DARK} ink={0.01} />
      {Array.from({ length: rows }, (_, r) => (
        <group key={r}>
          <InkBox size={[width, 0.03, 0.32]} position={[0, 0.3 + r * 0.45, 0.02]} color={WOOD} ink={0.004} shadows={false} />
          {Array.from({ length: per }, (_, k) => {
            const c = tins[(k * 5 + r * 3) % tins.length];
            const h = 0.18 + ((k + r) % 3) * 0.05;
            const round = (k + r) % 2 === 0;
            const x = -width / 2 + 0.1 + k * 0.17;
            return round ? (
              <InkCylinder key={k} radius={0.06} height={h} position={[x, 0.315 + r * 0.45 + h / 2, 0.06]} color={c} ink={0.004} />
            ) : (
              <InkBox key={k} size={[0.12, h, 0.12]} position={[x, 0.315 + r * 0.45 + h / 2, 0.06]} color={c} ink={0.004} shadows={false} />
            );
          })}
        </group>
      ))}
    </group>
  );
};

// ---------- sets ----------

export const COUNTER_Z = -0.6; // the store counter's centre line; the seller stands behind it at z ≈ -1.25
export const STORE_DOOR_X = 2.0;

// 1890s general store: wall of tins behind a long counter with a glass case, barrels, stove, hanging oil lamp,
// a front window onto the street and the door at the right. `mood` lets the twist re-light it.
export const GeneralStore: React.FC<{ camera: CameraShot; f: number; mood?: "warm" | "cold"; door?: number; children?: React.ReactNode; walker?: number }> = ({
  camera,
  f,
  mood = "warm",
  door = 0,
  children,
}) => (
  <Room camera={camera} mood={mood} floor={mood === "cold" ? "#3e4658" : "#7a4e2c"} wall={mood === "cold" ? "#4a5a7a" : "#8a5a34"} width={8} depth={5} wallPattern="panel" floorPattern="wood" sideWalls>
    <TinWall position={[-0.4, 0, -2.3]} width={3.2} />
    <Label text="GENERAL STORE" position={[-0.4, 2.75, -2.38]} width={1.6} fg="#f2d27a" bg="#3a1a10" />
    <Counter position={[-0.4, 0, COUNTER_Z]} size={[2.6, 0.62, 0.55]} color={mood === "cold" ? "#4e4a4c" : WOOD} top={mood === "cold" ? "#8a8078" : "#a8743e"} />
    {/* glass display case on the counter's left end */}
    <group position={[-1.35, 0.645, COUNTER_Z]}>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.6, 0.32, 0.45]} />
        <meshBasicMaterial color="#cfeaff" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <InkCylinder key={i} radius={0.05} height={0.14} position={[-0.18 + i * 0.18, 0.07, 0]} color={["#e0262f", "#f2d27a", "#3fae5a"][i]} ink={0.004} />
      ))}
    </group>
    <Barrel position={[1.0, 0, 0.1]} top="CRACKERS" />
    <Barrel position={[-2.5, 0, -0.3]} top="FLOUR" />
    <Stove position={[-2.6, 0, -1.6]} />
    <OilLamp position={[-0.3, 2.3, -0.4]} f={f} />
    <Window position={[2.3, 1.45, -2.44]} size={[1.0, 1.1]} sky={mood === "cold" ? "#2a3f7a" : "#bfe6ff"} />
    <Door position={[STORE_DOOR_X + 1.3, 0, -1.2]} open={door} color={mood === "cold" ? "#4a4446" : "#5a3a22"} frame={mood === "cold" ? "#2e2a30" : "#3a2414"} glow={mood === "cold" ? "#9fb6ff" : "#fff1c4"} />
    {children}
  </Room>
);

// Seller's light behind the counter: the oil lamp above him.
export const lampLight = (mood: "warm" | "cold" = "warm") => ({
  points: [{ position: [-0.3, 2.2, -0.4] as Vec3, color: mood === "warm" ? "#ffc070" : "#c8d6ff", strength: mood === "warm" ? 1.6 : 0.9, range: 4 }],
});

// The Supreme Court in the old Senate chamber: mahogany bench, crimson drapes under a valence, a gilt eagle,
// marble columns and a red carpet with gold stars.
export const BENCH_Z = -1.3;
export const OldCourt: React.FC<{ camera: CameraShot; children?: React.ReactNode }> = ({ camera, children }) => (
  <Room camera={camera} mood="alarm" floor="#8a1a22" wall="#efe6d6" width={9} depth={6} wallPattern="plaster" floorPattern="carpet">
    {/* drapes and valence behind the bench */}
    {Array.from({ length: 7 }, (_, i) => (
      <InkBox key={i} size={[0.42, 2.3, 0.08]} position={[-1.35 + i * 0.45, 1.55, -2.85]} rotation={[0, (i % 2 ? 0.12 : -0.12), 0]} color="#a3142a" ink={0.006} />
    ))}
    <InkBox size={[3.4, 0.28, 0.2]} position={[0, 2.75, -2.78]} color="#5a2414" />
    {/* gilt eagle: body, spread wings, shield */}
    <group position={[0, 3.0, -2.6]}>
      <mesh>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshToonMaterial color="#e8b04a" gradientMap={toonRamp} />
      </mesh>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.55, 0.16, 0.04]} position={[s * 0.32, 0.08, 0]} rotation={[0, 0, s * 0.35]} color="#e8b04a" ink={0.005} />
      ))}
      <mesh position={[0, 0.14, 0.04]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshToonMaterial color="#f2c860" gradientMap={toonRamp} />
      </mesh>
    </group>
    {/* marble columns */}
    {[-3.2, -2.2, 2.2, 3.2].map((x) => (
      <group key={x} position={[x, 0, -2.4]}>
        <InkCylinder radius={0.16} height={3.0} position={[0, 1.5, 0]} color="#d9d2c6" />
        <InkBox size={[0.42, 0.12, 0.42]} position={[0, 3.0, 0]} color="#efe6d6" ink={0.005} />
        <InkBox size={[0.42, 0.12, 0.42]} position={[0, 0.06, 0]} color="#efe6d6" ink={0.005} />
      </group>
    ))}
    {/* the justices' bench: a long mahogany desk with high-backed chairs behind */}
    <InkBox size={[3.4, 0.6, 0.3]} position={[0, 0.3, BENCH_Z + 0.15]} color="#6b2a14" />
    <InkBox size={[3.5, 0.05, 0.4]} position={[0, 0.625, BENCH_Z + 0.15]} color="#8a3a1a" />
    {[-1.1, 0, 1.1].map((x) => (
      <InkBox key={x} size={[0.55, 1.45, 0.1]} position={[x, 0.725, BENCH_Z - 0.85]} color="#3a1a10" ink={0.006} />
    ))}
    <Halo position={[0, 3.2, -2.5]} size={3} color="#fff4e0" strength={0.25} />
    {children}
  </Room>
);

// Justices stand behind the bench in front of their chairs; these are their floor spots.
export const JUSTICE_X = [-1.1, 0, 1.1];
export const JUSTICE_Z = BENCH_Z - 0.55;
