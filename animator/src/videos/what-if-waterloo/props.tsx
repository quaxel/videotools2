import React from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp } from "../../engine";
import { Blob, useOwned } from "../../three/BalloonSets";

// Props for "What if Napoleon's marshal had marched to the guns?".

type Vec3 = [number, number, number];
const INK = "#161212";
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- strawberries ----------

// A strawberry drawn about 2x so it reads on a phone: a red heart-shaped berry with seeds and a green leaf cap.
export const Strawberry: React.FC<{ position: Vec3; rotation?: Vec3; size?: number; bite?: boolean }> = ({ position, rotation = [0, 0, 0], size = 1, bite = false }) => (
  <group position={position} rotation={rotation} scale={size}>
    <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]} castShadow>
      <coneGeometry args={[0.028, 0.06, 12]} />
      <meshToonMaterial color="#d8222a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.045, 0]} scale={[1, 0.6, 1]}>
      <sphereGeometry args={[0.028, 12, 8]} />
      <meshToonMaterial color="#e02a30" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]} scale={1.1}>
      <coneGeometry args={[0.028, 0.06, 12]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {Array.from({ length: 8 }, (_, i) => (
      <mesh key={i} position={[Math.cos(i * 0.8) * 0.019 * (1 - (i % 3) * 0.25), 0.03 + (i % 3) * 0.008, Math.sin(i * 0.8) * 0.019 * (1 - (i % 3) * 0.25)]}>
        <sphereGeometry args={[0.0035, 4, 3]} />
        <meshBasicMaterial color="#f8e070" />
      </mesh>
    ))}
    {Array.from({ length: 5 }, (_, i) => (
      <mesh key={`l${i}`} position={[Math.cos((i / 5) * 6.28) * 0.016, 0.066, Math.sin((i / 5) * 6.28) * 0.016]} rotation={[Math.sin((i / 5) * 6.28) * 0.9, 0, -Math.cos((i / 5) * 6.28) * 0.9]}>
        <coneGeometry args={[0.009, 0.03, 3]} />
        <meshToonMaterial color="#3a8a2a" gradientMap={toonRamp} />
      </mesh>
    ))}
    {bite && (
      <mesh position={[0.015, 0.02, 0.018]}>
        <sphereGeometry args={[0.012, 8, 6]} />
        <meshToonMaterial color="#f8c8c8" gradientMap={toonRamp} />
      </mesh>
    )}
  </group>
);

// A blue-and-white faience bowl heaped with strawberries. `hop` 0..1 makes the top berries jump (the cannon rumble).
export const StrawberryBowl: React.FC<{ position: Vec3; hop?: number; frame?: number; count?: number; size?: number }> = ({ position, hop = 0, frame = 0, count = 14, size = 1 }) => (
  <group position={position} scale={size}>
    <mesh position={[0, 0.05, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.08, 0.1, 28, 1, true]} />
      <meshToonMaterial color="#f4f2ec" side={THREE.DoubleSide} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.05, 0]} scale={1.04}>
      <cylinderGeometry args={[0.15, 0.08, 0.1, 28, 1, true]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <mesh position={[0, 0.07, 0]}>
      <cylinderGeometry args={[0.152, 0.13, 0.018, 28, 1, true]} />
      <meshToonMaterial color="#2a4aa8" side={THREE.DoubleSide} gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.07} height={0.02} position={[0, 0.01, 0]} color="#f4f2ec" ink={0.006} />
    {Array.from({ length: count }, (_, i) => {
      const a = i * 2.4;
      const r = 0.035 + (i % 4) * 0.025;
      const top = i >= count - 6;
      const j = top ? Math.max(0, Math.sin(frame * 0.9 + i * 1.7)) * 0.06 * hop : 0;
      return <Strawberry key={i} position={[Math.cos(a) * r, 0.085 + (i % 3) * 0.018 + (top ? 0.025 : 0) + j, Math.sin(a) * r]} rotation={[0.5 * Math.sin(i), a, 0.4 * Math.cos(i * 2) + j * 6]} size={1.15} />;
    })}
  </group>
);

// A coffee cup on its saucer; `ripple` 0..1 shivers the coffee.
export const Cup: React.FC<{ position: Vec3; ripple?: number; frame?: number }> = ({ position, ripple = 0, frame = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.075} height={0.012} position={[0, 0.006, 0]} color="#f4f2ec" ink={0.005} />
    <InkCylinder radius={0.045} height={0.07} position={[0, 0.047, 0]} color="#f4f2ec" ink={0.006} />
    <mesh position={[0.055, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.018, 0.006, 6, 14]} />
      <meshToonMaterial color="#f4f2ec" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.079 + Math.sin(frame * 2.1) * 0.002 * ripple, 0]} rotation={[-Math.PI / 2 + Math.sin(frame * 1.7) * 0.06 * ripple, 0, 0]}>
      <circleGeometry args={[0.04, 20]} />
      <meshToonMaterial color="#4a2a18" gradientMap={toonRamp} />
    </mesh>
    <InkBox size={[0.09, 0.005, 0.005]} position={[0, 0.0122, 0.07]} color="#2a4aa8" ink={0} />
  </group>
);

// The breakfast table: a white cloth, the strawberry bowl, a plate, the cup, bread, a candlestick, a napkin.
export const BreakfastTable: React.FC<{ position: Vec3; top?: number; frame: number; hop?: number; ripple?: number; plateBerry?: Vec3 | null; candle?: boolean }> = ({
  position,
  top = 0.44,
  frame,
  hop = 0,
  ripple = 0,
  plateBerry = null,
  candle = true,
}) => (
  <group position={position}>
    {/* table with a long cloth */}
    <InkBox size={[1.5, 0.05, 0.9]} position={[0, top - 0.025, 0]} color="#d8cdb4" ink={0.01} />
    <InkBox size={[1.52, top - 0.12, 0.92]} position={[0, (top - 0.12) / 2 + 0.12, 0]} color="#c8bca0" ink={0.008} />
    {[-0.65, 0.65].map((x) => [-0.36, 0.36].map((z) => <InkBox key={`${x}${z}`} size={[0.06, 0.12, 0.06]} position={[x, 0.06, z]} color="#5a3420" ink={0.006} />))}
    <StrawberryBowl position={[-0.12, top, 0.05]} hop={hop} frame={frame} />
    {/* plate with a few berries and a fork */}
    <InkCylinder radius={0.12} height={0.012} position={[0.26, top + 0.006, 0.18]} color="#f4f2ec" ink={0.006} />
    <InkCylinder radius={0.095} height={0.002} position={[0.26, top + 0.013, 0.18]} color="#dcd8ce" ink={0} />
    <Strawberry position={[0.22, top + 0.014, 0.16]} rotation={[1.4, 0.3, 0]} size={1.15} bite />
    <Strawberry position={[0.3, top + 0.014, 0.22]} rotation={[1.5, -0.6, 0]} size={1.15} />
    {plateBerry && <Strawberry position={plateBerry} rotation={[frame * 0.4, frame * 0.2, 0]} size={1.15} />}
    <InkBox size={[0.012, 0.006, 0.16]} position={[0.42, top + 0.004, 0.16]} color="#c8ccd4" ink={0.003} />
    <Cup position={[0.42, top, -0.05]} ripple={ripple} frame={frame} />
    {/* bread loaf and a knife on a board */}
    <InkBox size={[0.3, 0.02, 0.18]} position={[-0.48, top + 0.01, -0.1]} color="#a87a4a" ink={0.005} />
    <Blob position={[-0.48, top + 0.06, -0.1]} scale={[0.12, 0.05, 0.07]} color="#c88a42" ink={0.012} />
    <InkBox size={[0.18, 0.004, 0.02]} position={[-0.44, top + 0.024, 0.0]} rotation={[0, 0.3, 0]} color="#c8ccd4" ink={0.003} />
    {/* napkin */}
    <InkBox size={[0.16, 0.006, 0.16]} position={[0.05, top + 0.003, 0.32]} rotation={[0, 0.4, 0]} color="#ffffff" ink={0.004} />
    {candle && (
      <group position={[0.58, top, -0.28]}>
        <InkCylinder radius={0.05} height={0.015} position={[0, 0.008, 0]} color="#c8a040" ink={0.004} />
        <InkCylinder radius={0.015} height={0.16} position={[0, 0.09, 0]} color="#c8a040" ink={0.004} />
        <InkCylinder radius={0.014} height={0.12} position={[0, 0.23, 0]} color="#f4ecd8" ink={0.004} />
      </group>
    )}
  </group>
);

export const Chair: React.FC<{ position: Vec3; rotationY?: number; color?: string }> = ({ position, rotationY = 0, color = "#6a3a22" }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.42, 0.04, 0.4]} position={[0, 0.36, 0]} color={color} ink={0.008} />
    {[-0.18, 0.18].map((x) => [-0.17, 0.17].map((z) => <InkBox key={`${x}${z}`} size={[0.04, 0.36, 0.04]} position={[x, 0.18, z]} color={color} ink={0.006} />))}
    <InkBox size={[0.42, 0.5, 0.04]} position={[0, 0.63, -0.19]} color={color} ink={0.008} />
  </group>
);

// A tall sash window on the back wall (facing +z) with the view painted on its glass: the sky over the fields and,
// in `flash` (0..1), a flicker of distant gunfire low on the horizon.
export const WindowView: React.FC<{ position: Vec3; size?: [number, number]; sky?: [string, string]; land?: string; flash?: number; frame?: number }> = ({
  position,
  size = [0.9, 1.4],
  sky = ["#9ab0c8", "#dfe6e8"],
  land = "#6a8a4a",
  flash = 0,
}) => {
  const tex = useOwned(
    () =>
      canvasTexture(256, 400, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 400);
        g.addColorStop(0, sky[0]);
        g.addColorStop(0.7, sky[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 400);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.ellipse(rand(i) * 256, 60 + rand(i + 4) * 120, 40 + rand(i + 8) * 40, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = land;
        ctx.beginPath();
        ctx.moveTo(0, 290);
        for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, 285 + Math.sin(x * 0.05) * 8);
        ctx.lineTo(256, 400);
        ctx.lineTo(0, 400);
        ctx.fill();
        ctx.fillStyle = "#4a6a3a";
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          ctx.ellipse(rand(i + 30) * 256, 286, 10, 18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [sky[0], sky[1], land],
  );
  const [w, h] = size;
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {flash > 0.02 && (
        <>
          <mesh position={[0, -h * 0.22, -0.015]}>
            <planeGeometry args={[w, h * 0.3]} />
            <meshBasicMaterial color="#ffd890" transparent opacity={flash * 0.6} toneMapped={false} />
          </mesh>
          <Halo position={[(rand(Math.floor(flash * 10)) - 0.5) * w * 0.6, -h * 0.18, 0]} size={0.6 * flash + 0.2} color="#ffe0a0" strength={flash} />
        </>
      )}
      {/* frame, sash bars, sill */}
      <InkBox size={[w + 0.12, 0.08, 0.1]} position={[0, h / 2 + 0.04, 0]} color="#f2ece0" ink={0.008} />
      <InkBox size={[w + 0.16, 0.06, 0.18]} position={[0, -h / 2 - 0.03, 0.04]} color="#f2ece0" ink={0.008} />
      <InkBox size={[0.06, h, 0.1]} position={[-w / 2 - 0.03, 0, 0]} color="#f2ece0" ink={0.008} />
      <InkBox size={[0.06, h, 0.1]} position={[w / 2 + 0.03, 0, 0]} color="#f2ece0" ink={0.008} />
      <InkBox size={[w, 0.04, 0.05]} position={[0, 0, 0.01]} color="#f2ece0" ink={0.005} />
      <InkBox size={[0.035, h, 0.05]} position={[0, 0, 0.01]} color="#f2ece0" ink={0.005} />
      {[-h / 4, h / 4].map((y) => (
        <InkBox key={y} size={[w, 0.03, 0.04]} position={[0, y, 0.01]} color="#f2ece0" ink={0.004} />
      ))}
      {/* curtains */}
      <InkBox size={[0.22, h + 0.2, 0.05]} position={[-w / 2 - 0.2, -0.05, 0.06]} color="#b8382e" ink={0.008} />
      <InkBox size={[0.22, h + 0.2, 0.05]} position={[w / 2 + 0.2, -0.05, 0.06]} color="#b8382e" ink={0.008} />
    </group>
  );
};

// A folded paper of orders held up: a cream sheet with a seal and a few words.
export const Orders: React.FC<{ position: Vec3; rotation?: Vec3; text: string; width?: number; appear?: number }> = ({ position, rotation = [0, 0, 0], text, width = 0.42, appear }) => (
  <group position={position} rotation={rotation}>
    <Label text={text} position={[0, 0, 0]} width={width} bg="#f4ead0" appear={appear} />
    <mesh position={[width * 0.38, -0.06, 0.012]}>
      <circleGeometry args={[0.03, 16]} />
      <meshToonMaterial color="#b8202a" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// ---------- garden ----------

export const GardenWall: React.FC<{ a: [number, number]; b: [number, number]; h?: number; color?: string }> = ({ a, b, h = 1.1, color = "#c8a888" }) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return (
    <group position={[(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2]} rotation={[0, -ang, 0]}>
      <InkBox size={[len, h, 0.3]} position={[0, h / 2, 0]} color={color} ink={0.02} />
      <InkBox size={[len + 0.06, 0.08, 0.38]} position={[0, h + 0.04, 0]} color="#a88a6a" ink={0.012} />
    </group>
  );
};

export const PearTree: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.09} height={1.3} position={[0, 0.65, 0]} rotation={[0, 0, 0.08]} color="#5a4232" ink={0.01} />
    <Blob position={[0, 1.75, 0]} scale={[0.85, 0.7, 0.8]} color="#4e7a34" ink={0.04} />
    <Blob position={[0.45, 1.5, 0.1]} scale={[0.5, 0.45, 0.5]} color="#5a8a3a" ink={0.04} />
    <Blob position={[-0.45, 1.6, -0.05]} scale={[0.5, 0.45, 0.5]} color="#457030" ink={0.04} />
    {Array.from({ length: 7 }, (_, i) => (
      <mesh key={i} position={[(rand(i) - 0.5) * 1.2, 1.35 + rand(i + 3) * 0.6, 0.45 + rand(i + 6) * 0.25]}>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshToonMaterial color="#d8c850" gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

// ---------- Wavre ----------

// A stone bridge over the Dyle along z (river across x at z = zc), with parapets; deck at y = 0.
export const Bridge: React.FC<{ position: Vec3; length?: number; width?: number }> = ({ position, length = 5, width = 1.8 }) => (
  <group position={position}>
    <InkBox size={[width, 0.3, length]} position={[0, -0.15, 0]} color="#9a9488" ink={0.02} />
    <InkBox size={[0.22, 0.5, length]} position={[-width / 2, 0.25, 0]} color="#a8a294" ink={0.015} />
    <InkBox size={[0.22, 0.5, length]} position={[width / 2, 0.25, 0]} color="#a8a294" ink={0.015} />
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * (width / 2 + 0.12), -0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.0, 0.3, 6, 18, Math.PI]} />
        <meshToonMaterial color="#8a8478" gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

// A barricade of an overturned cart, barrels and beams across a street.
export const Barricade: React.FC<{ position: Vec3; width?: number; rotationY?: number }> = ({ position, width = 2, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[width, 0.5, 0.5]} position={[0, 0.25, 0]} rotation={[0, 0, 0.06]} color="#6a4a2e" ink={0.015} />
    <InkCylinder radius={0.38} height={0.08} position={[-width * 0.3, 0.55, 0.05]} rotation={[0, 0, Math.PI / 2 + 0.3]} color="#5a3a22" ink={0.01} />
    {[-0.7, 0.2, 0.7].map((x, i) => (
      <InkCylinder key={i} radius={0.18} height={0.5} position={[x * width * 0.5, 0.25, 0.32]} color={i % 2 ? "#7a5232" : "#8a6038"} ink={0.01} />
    ))}
    <InkBox size={[width * 0.9, 0.1, 0.12]} position={[0, 0.7, -0.1]} rotation={[0.2, 0.1, -0.12]} color="#5a3a22" ink={0.01} />
  </group>
);

// A town house with a stepped gable (Wavre), facing +z.
export const TownHouse: React.FC<{ position: Vec3; w?: number; h?: number; color?: string; roof?: string; rotationY?: number }> = ({ position, w = 2, h = 2.6, color = "#d8ccb4", roof = "#5a5a66", rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[w, h, 2]} position={[0, h / 2, 0]} color={color} ink={0.025} />
    {[0, 1, 2].map((k) => (
      <InkBox key={k} size={[w - k * w * 0.28, 0.32, 0.22]} position={[0, h + 0.16 + k * 0.32, 0.92]} color={color} ink={0.015} />
    ))}
    <mesh position={[0, h + 0.58, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[1.18, 1.18, w + 0.1, 3, 1, false, Math.PI / 2]} />
      <meshToonMaterial color={roof} gradientMap={toonRamp} />
    </mesh>
    {[-0.5, 0.5].map((x) => [0.9, 1.9].map((y) => <InkBox key={`${x}${y}`} size={[0.34, 0.44, 0.04]} position={[x * w * 0.6, y, 1.01]} color="#2e2a2a" ink={0.006} />))}
    <InkBox size={[0.5, 0.9, 0.05]} position={[0, 0.45, 1.01]} color="#4a3022" ink={0.008} />
  </group>
);

// ---------- the what-if sand table ----------

// A wooden block with a word on its face (a unit on the map), `appear` frames since it popped in.
export const Block: React.FC<{ position: Vec3; text: string; color?: string; size?: Vec3; rotationY?: number; appear?: number; textW?: number }> = ({
  position,
  text,
  color = "#2a4a9a",
  size = [0.34, 0.12, 0.14],
  rotationY = 0,
  appear,
  textW,
}) => (
  <group position={position}>
    <group rotation={[0, rotationY, 0]}>
      <InkBox size={size} position={[0, size[1] / 2, 0]} color={color} ink={0.008} />
    </group>
    <Label text={text} position={[0, size[1] + 0.07, 0]} width={textW ?? size[0] * 0.95} appear={appear} bg="#f6efd8" />
  </group>
);

// An hourglass: `run` 0..1 empties the top bulb into the bottom one.
export const Hourglass: React.FC<{ position: Vec3; run: number; size?: number }> = ({ position, run, size = 1 }) => {
  const r = Math.min(1, Math.max(0, run));
  return (
    <group position={position} scale={size}>
      <InkCylinder radius={0.12} height={0.03} position={[0, 0.015, 0]} color="#6a3a22" ink={0.006} />
      <InkCylinder radius={0.12} height={0.03} position={[0, 0.5, 0]} color="#6a3a22" ink={0.006} />
      {[-1, 1].map((s) => [-1, 1].map((t) => <InkCylinder key={`${s}${t}`} radius={0.012} height={0.47} position={[s * 0.09, 0.257, t * 0.09]} color="#5a3420" ink={0.004} />))}
      {/* glass bulbs */}
      <mesh position={[0, 0.375, 0]}>
        <sphereGeometry args={[0.085, 16, 12]} />
        <meshBasicMaterial color="#d8eef8" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.085, 16, 12]} />
        <meshBasicMaterial color="#d8eef8" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* sand: the top cone shrinks, the bottom pile grows, a thread runs between */}
      <mesh position={[0, 0.34 + 0.03 * (1 - r), 0]} rotation={[Math.PI, 0, 0]} scale={[Math.max(0.05, 1 - r), Math.max(0.05, 1 - r), Math.max(0.05, 1 - r)]}>
        <coneGeometry args={[0.07, 0.08, 16]} />
        <meshToonMaterial color="#e8c070" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.07 + 0.03 * r, 0]} scale={[Math.max(0.05, r), Math.max(0.05, r), Math.max(0.05, r)]}>
        <coneGeometry args={[0.075, 0.08, 16]} />
        <meshToonMaterial color="#e8c070" gradientMap={toonRamp} />
      </mesh>
      {r > 0 && r < 1 && <InkBox size={[0.006, 0.2, 0.006]} position={[0, 0.2, 0]} color="#e8c070" ink={0} />}
    </group>
  );
};

// The sand table: a wooden tray of painted country (green fields, a road, a blue river), on trestles.
export const SandTable: React.FC<{ position: Vec3; w?: number; d?: number; top?: number }> = ({ position, w = 2.2, d = 1.3, top = 0.72 }) => {
  const tex = useOwned(
    () =>
      canvasTexture(1024, 600, (ctx) => {
        ctx.fillStyle = "#7a9a50";
        ctx.fillRect(0, 0, 1024, 600);
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = ["#a8b060", "#c8b468", "#6a8a44", "#8aa858"][i % 4];
          ctx.save();
          ctx.translate(rand(i) * 1024, rand(i + 50) * 600);
          ctx.rotate((rand(i + 9) - 0.5) * 0.8);
          ctx.fillRect(-60, -30, 60 + rand(i + 3) * 90, 40 + rand(i + 5) * 50);
          ctx.restore();
        }
        // the road from Wavre (right) to Waterloo (left)
        ctx.strokeStyle = "#d8c8a0";
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(1024, 330);
        ctx.bezierCurveTo(780, 260, 540, 400, 300, 300);
        ctx.lineTo(0, 320);
        ctx.stroke();
        // the Dyle
        ctx.strokeStyle = "#4a7ab0";
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(880, 0);
        ctx.bezierCurveTo(840, 200, 920, 400, 860, 600);
        ctx.stroke();
        // woods
        ctx.fillStyle = "#3a5a2a";
        for (let i = 0; i < 30; i++) {
          ctx.beginPath();
          ctx.arc(400 + rand(i + 70) * 240, 80 + rand(i + 90) * 120, 16, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [],
  );
  return (
    <group position={position}>
      <InkBox size={[w + 0.1, 0.08, d + 0.1]} position={[0, top - 0.04, 0]} color="#6a4428" ink={0.012} />
      <mesh position={[0, top + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshToonMaterial map={tex} gradientMap={toonRamp} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <InkBox size={[0.08, top - 0.08, 0.08]} position={[s * (w / 2 - 0.15), (top - 0.08) / 2, d / 2 - 0.15]} color="#5a3420" ink={0.008} />
          <InkBox size={[0.08, top - 0.08, 0.08]} position={[s * (w / 2 - 0.15), (top - 0.08) / 2, -d / 2 + 0.15]} color="#5a3420" ink={0.008} />
        </group>
      ))}
      <InkBox size={[w + 0.14, 0.06, 0.04]} position={[0, top + 0.03, d / 2 + 0.05]} color="#5a3420" ink={0.008} />
    </group>
  );
};

// ---------- frontier and village ----------

// A striped frontier post with a sign board (facing +z).
export const BorderPost: React.FC<{ position: Vec3; text: string; rotationY?: number; appear?: number }> = ({ position, text, rotationY = 0, appear }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    {Array.from({ length: 8 }, (_, i) => (
      <InkCylinder key={i} radius={0.07} height={0.25} position={[0, 0.125 + i * 0.25, 0]} color={i % 2 ? "#2a4aa8" : "#f4f0e6"} ink={0.008} />
    ))}
    <Label text={text} position={[0, 2.2, 0.09]} width={1.1} bg="#f6efd8" appear={appear} />
  </group>
);

// A wooden fingerpost / village name board on two posts (facing +z).
export const VillageSign: React.FC<{ position: Vec3; text: string; rotationY?: number; width?: number; appear?: number }> = ({ position, text, rotationY = 0, width = 1.3, appear }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.08, 1.6, 0.08]} position={[-width / 2 + 0.08, 0.8, 0]} color="#5a3a22" ink={0.008} />
    <InkBox size={[0.08, 1.6, 0.08]} position={[width / 2 - 0.08, 0.8, 0]} color="#5a3a22" ink={0.008} />
    <Label text={text} position={[0, 1.38, 0.06]} width={width} bg="#f6efd8" appear={appear} />
  </group>
);

// The domed chapel of Waterloo (a round church with a lead dome and a lantern) among cottages.
export const Chapel: React.FC<{ position: Vec3; scale?: number; wall?: string; dome?: string }> = ({ position, scale = 1, wall = "#ece2d0", dome = "#5a6070" }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={1.6} height={2.6} position={[0, 1.3, 0]} color={wall} ink={0.04} />
    <mesh position={[0, 2.6, 0]} scale={[1, 0.8, 1]} castShadow>
      <sphereGeometry args={[1.6, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshToonMaterial color={dome} gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.32} height={0.7} position={[0, 4.1, 0]} color={wall} ink={0.015} />
    <mesh position={[0, 4.6, 0]}>
      <coneGeometry args={[0.36, 0.5, 12]} />
      <meshToonMaterial color={dome} gradientMap={toonRamp} />
    </mesh>
    {/* portico with columns */}
    <InkBox size={[2.0, 0.3, 0.9]} position={[0, 2.35, 1.75]} color={wall} ink={0.02} />
    <mesh position={[0, 2.78, 1.75]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.5, 0.5, 2.1, 3, 1, false, Math.PI / 2]} />
      <meshToonMaterial color={wall} gradientMap={toonRamp} />
    </mesh>
    {[-0.8, -0.27, 0.27, 0.8].map((x) => (
      <InkCylinder key={x} radius={0.09} height={2.2} position={[x, 1.1, 2.05]} color="#f4ecdc" ink={0.01} />
    ))}
    <InkBox size={[0.6, 1.2, 0.05]} position={[0, 0.6, 1.62]} color="#4a3022" ink={0.01} />
  </group>
);

export const Cottage: React.FC<{ position: Vec3; rotationY?: number; w?: number; wall?: string; roof?: string; lit?: number }> = ({ position, rotationY = 0, w = 2.2, wall = "#ece4d4", roof = "#a84a30", lit = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[w, 1.5, 1.7]} position={[0, 0.75, 0]} color={wall} ink={0.02} />
    <mesh position={[0, 1.5 + 0.54, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[1.08, 1.08, w + 0.2, 3, 1, false, Math.PI / 2]} />
      <meshToonMaterial color={roof} gradientMap={toonRamp} />
    </mesh>
    <InkBox size={[0.4, 0.4, 0.04]} position={[-w * 0.25, 0.9, 0.86]} color={lit > 0 ? "#ffd27a" : "#3a3030"} emissive={lit > 0 ? "#8a5a10" : undefined} ink={0.006} />
    <InkBox size={[0.4, 0.4, 0.04]} position={[w * 0.25, 0.9, 0.86]} color={lit > 0 ? "#ffd27a" : "#3a3030"} emissive={lit > 0 ? "#8a5a10" : undefined} ink={0.006} />
    <InkBox size={[0.45, 0.9, 0.04]} position={[0, 0.45, 0.86]} color="#5a3a22" ink={0.006} />
    <InkBox size={[0.3, 0.6, 0.3]} position={[w * 0.35, 2.3, -0.2]} color="#8a5a42" ink={0.01} />
  </group>
);

// A low dry-stone wall along x (a top for the strawberry in the last shot).
export const StoneWall: React.FC<{ position: Vec3; length?: number; h?: number }> = ({ position, length = 3, h = 0.6 }) => (
  <group position={position}>
    <InkBox size={[length, h, 0.4]} position={[0, h / 2, 0]} color="#9a8e7a" ink={0.015} />
    {Array.from({ length: Math.floor(length / 0.3) }, (_, i) => (
      <InkBox key={i} size={[0.26, 0.1, 0.42]} position={[-length / 2 + 0.15 + i * 0.3, h + 0.05, 0]} rotation={[0, 0, (rand(i) - 0.5) * 0.12]} color={i % 2 ? "#a89a84" : "#8e8270"} ink={0.006} />
    ))}
  </group>
);

// Bell tent of the bivouac.
export const Tent: React.FC<{ position: Vec3; color?: string; scale?: number }> = ({ position, color = "#d8d0b8", scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.7, 0]} castShadow>
      <coneGeometry args={[0.95, 1.4, 10]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.7, 0]} scale={1.03}>
      <coneGeometry args={[0.95, 1.4, 10]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <InkBox size={[0.4, 0.7, 0.02]} position={[0, 0.35, 0.72]} rotation={[-0.45, 0, 0]} color="#3a3428" ink={0.004} />
  </group>
);
