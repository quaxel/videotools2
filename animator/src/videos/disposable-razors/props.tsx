import React from "react";
import * as THREE from "three";
import { Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Why Razor Refills Are Locked Up Like Jewelry". Small story objects are drawn at about 2× real size
// so they read on a phone (plan.json → format_note).

const INK = "#161212";
const STEEL = "#cfd8e0";
const FACE: Vec3 = [Math.PI / 2, 0, 0];

// A cartridge razor standing on its handle end: handle along +y, head on top, blades facing +z.
// `blades` strips on the head; `wheels` 0..1 turns the head into a tiny lawnmower (wheels drop, a spinner whirls).
export const Razor: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; blades?: number; color?: string; f?: number; wheels?: number }> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  blades = 5,
  color = "#2f6fd8",
  f = 0,
  wheels = 0,
}) => {
  const headW = 0.09 + Math.max(0, blades - 5) * 0.012;
  const headH = 0.03 + blades * 0.006;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <InkCylinder radius={0.011} height={0.24} position={[0, 0.12, 0]} color={color} ink={0.003} />
      <InkCylinder radius={0.0125} height={0.06} position={[0, 0.07, 0]} color="#1d1a1a" ink={0.003} />
      <InkBox size={[0.02, 0.03, 0.018]} position={[0, 0.25, 0]} color="#9aa0a6" ink={0.002} />
      <group position={[0, 0.27 + headH / 2, 0.004]}>
        <InkBox size={[headW, headH, 0.02]} color="#1d1a1a" ink={0.003} />
        <InkBox size={[headW * 0.96, 0.006, 0.004]} position={[0, headH / 2 - 0.004, 0.011]} color="#7fd0ff" ink={0} />
        {Array.from({ length: blades }, (_, i) => (
          <InkBox key={i} size={[headW * 0.9, 0.0028, 0.004]} position={[0, -headH / 2 + 0.006 + (i * (headH - 0.014)) / Math.max(1, blades - 1), 0.011]} color={STEEL} emissive="#556070" ink={0} shadows={false} />
        ))}
        {wheels > 0 && (
          <>
            {[-1, 1].map((s) => (
              <InkCylinder key={s} radius={0.018 * wheels} height={0.01} position={[s * (headW / 2 + 0.006), -headH / 2, 0]} rotation={[0, 0, Math.PI / 2]} color="#e0262f" ink={0.002} />
            ))}
            <group position={[0, 0, 0.028]} rotation={[0, 0, f * 0.9]}>
              <InkBox size={[headW * 1.1 * wheels, 0.008, 0.004]} color={STEEL} ink={0.001} />
            </group>
          </>
        )}
      </group>
    </group>
  );
};

// The handle on its blister card with the price tag (hangs from a peg at its top centre).
export const RazorPack: React.FC<{ position: Vec3; rotation?: Vec3; tag?: string; color?: string; scale?: number }> = ({ position, rotation = [0, 0, 0], tag = "$10", color = "#2f6fd8", scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkBox size={[0.16, 0.36, 0.012]} position={[0, -0.18, 0]} color="#fffdf4" ink={0.003} />
    <InkBox size={[0.16, 0.08, 0.013]} position={[0, -0.04, 0.001]} color={color} ink={0.002} />
    <mesh position={[0, -0.21, 0.03]}>
      <boxGeometry args={[0.12, 0.27, 0.04]} />
      <meshBasicMaterial color="#e6f4ff" transparent opacity={0.28} depthWrite={false} />
    </mesh>
    <Razor position={[0, -0.33, 0.018]} scale={0.78} color={color} />
    <Label text={tag} position={[0.055, -0.3, 0.06]} rotation={[0, 0, -0.2]} width={0.09} bg="#e0262f" fg="#ffffff" />
  </group>
);

// A small refill box (the eight-pack), standing on its base.
export const RefillPack: React.FC<{ position: Vec3; rotation?: Vec3; color?: string; scale?: number }> = ({ position, rotation = [0, 0, 0], color = "#f28a1c", scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkBox size={[0.11, 0.15, 0.04]} position={[0, 0.075, 0]} color={color} ink={0.003} />
    <InkBox size={[0.085, 0.05, 0.002]} position={[0, 0.095, 0.021]} color="#1d1a1a" ink={0} shadows={false} />
    {[0, 1, 2].map((i) => (
      <InkBox key={i} size={[0.07, 0.003, 0.002]} position={[0, 0.082 + i * 0.012, 0.0225]} color={STEEL} emissive="#556070" ink={0} shadows={false} />
    ))}
    <InkBox size={[0.11, 0.03, 0.002]} position={[0, 0.03, 0.021]} color="#ffffff" ink={0} shadows={false} />
  </group>
);

// An open white cabinet (base, top, sides and a dark back) that cases put their shelves in.
const CaseFrame: React.FC<{ width: number; h: number }> = ({ width, h }) => (
  <group>
    <InkBox size={[width + 0.08, 0.5, 0.38]} position={[0, 0.25, -0.16]} color="#f4f6f8" ink={0.008} />
    <InkBox size={[width + 0.08, 0.12, 0.38]} position={[0, h + 0.56, -0.16]} color="#f4f6f8" ink={0.008} />
    {[-1, 1].map((sx) => (
      <InkBox key={sx} size={[0.04, h, 0.38]} position={[sx * (width / 2 + 0.02), h / 2 + 0.5, -0.16]} color="#f4f6f8" ink={0.006} />
    ))}
    <InkBox size={[width, h, 0.02]} position={[0, h / 2 + 0.5, -0.34]} color="#2a4a70" ink={0} />
  </group>
);

// The locked refill case: a white bay with three shelves of refill packs behind a clear acrylic door that swings
// open on its left hinge (`open` 0..1), a padlock, a red HELP button and a yellow price strip on each shelf.
export const LockedCase: React.FC<{ position: Vec3; width?: number; open?: number; f?: number; help?: boolean }> = ({ position, width = 1.1, open = 0, f = 0, help = false }) => {
  const h = 1.05;
  const glow = help && Math.floor(f / 8) % 2 === 0;
  return (
    <group position={position}>
      <CaseFrame width={width} h={h} />
      {[0.55, 0.9, 1.25].map((y, r) => (
        <group key={y}>
          <InkBox size={[width - 0.02, 0.02, 0.3]} position={[0, y, -0.17]} color="#c9ced3" ink={0.003} shadows={false} />
          <InkBox size={[width - 0.02, 0.035, 0.008]} position={[0, y - 0.005, -0.015]} color="#ffd23f" ink={0} shadows={false} />
          {Array.from({ length: Math.floor(width / 0.14) }, (_, k) => (
            <RefillPack key={k} position={[-width / 2 + 0.09 + k * 0.14, y + 0.01, -0.16]} color={["#f28a1c", "#2f6fd8", "#3fae5a", "#9b5de5"][(k + r) % 4]} />
          ))}
        </group>
      ))}
      {/* the acrylic door, hinged on the left edge */}
      <group position={[-width / 2, 0.5, 0.03]} rotation={[0, -open * 1.6, 0]}>
        <mesh position={[width / 2, h / 2, 0]}>
          <boxGeometry args={[width, h, 0.012]} />
          <meshBasicMaterial color="#cfe9ff" transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {[0, h].map((y) => (
          <InkBox key={y} size={[width, 0.02, 0.02]} position={[width / 2, y, 0]} color="#9aa0a6" ink={0.002} />
        ))}
        <group position={[width - 0.08, h / 2, 0.02]}>
          <InkBox size={[0.07, 0.07, 0.03]} color="#e8b04a" ink={0.003} />
          <mesh position={[0, 0.05, 0]}>
            <torusGeometry args={[0.025, 0.007, 8, 18, Math.PI]} />
            <meshToonMaterial color="#9aa0a6" gradientMap={toonRamp} />
          </mesh>
        </group>
      </group>
      <Label text="LOCKED" position={[0, h + 0.66, 0.03]} width={0.5} bg="#e0262f" fg="#ffffff" />
      <group position={[width / 2 + 0.1, 1.05, 0.03]}>
        <InkBox size={[0.1, 0.16, 0.03]} color="#f4f6f8" ink={0.003} />
        <InkCylinder radius={0.03} height={0.02} position={[0, 0.02, 0.02]} rotation={FACE} color={glow ? "#ff3b30" : "#a3141a"} emissive={glow ? "#ff3b30" : undefined} ink={0.002} />
        {glow && <Halo position={[0, 0.02, 0.04]} size={0.14} color="#ff3b30" strength={0.6} />}
      </group>
    </group>
  );
};

// A pegboard bay of handle packs, open to grab. `taken` hides the pack at `takenIndex`.
export const PegWall: React.FC<{ position: Vec3; width?: number; taken?: boolean; swing?: number }> = ({ position, width = 1.0, taken = false, swing = 0 }) => (
  <group position={position}>
    <InkBox size={[width, 1.3, 0.04]} position={[0, 1.15, -0.02]} color="#e8dcc4" ink={0.006} />
    {[0, 1].map((r) =>
      [0, 1, 2, 3].map((k) => {
        const x = -width / 2 + 0.16 + k * ((width - 0.32) / 3);
        const y = 1.65 - r * 0.55;
        if (taken && r === 1 && k === 2) return null;
        return (
          <group key={`${r}${k}`}>
            <InkCylinder radius={0.005} height={0.09} position={[x, y, 0.045]} rotation={FACE} color="#9aa0a6" ink={0.001} />
            <RazorPack position={[x, y, 0.03]} rotation={[0, 0, r === 0 && k === 1 ? Math.sin(swing) * 0.15 : 0]} color={["#2f6fd8", "#e0262f", "#3fae5a", "#1d1a1a"][(k + r) % 4]} />
          </group>
        );
      }),
    )}
    <Label text="RAZORS" position={[0, 1.95, 0.02]} width={0.5} bg="#2f6fd8" fg="#ffffff" />
  </group>
);

// Bathroom vanity: cabinet, basin, mirror with a bar of warm bulbs above it, a foam can and a towel ring.
export const Vanity: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.9, 0.8, 0.5]} position={[0, 0.4, 0]} color="#f4f6f8" />
    <InkBox size={[0.96, 0.05, 0.55]} position={[0, 0.825, 0]} color="#e8ecf0" />
    <InkCylinder radius={0.17} height={0.06} position={[0, 0.83, 0.02]} color="#ffffff" ink={0.004} />
    <InkCylinder radius={0.14} height={0.02} position={[0, 0.85, 0.02]} color="#bcd6e6" ink={0} />
    <InkCylinder radius={0.012} height={0.12} position={[0, 0.92, -0.17]} color="#9aa0a6" ink={0.003} />
    <InkBox size={[0.012, 0.012, 0.1]} position={[0, 0.98, -0.12]} color="#9aa0a6" ink={0.002} />
    <InkCylinder radius={0.035} height={0.16} position={[0.34, 0.93, 0.08]} color="#3fae5a" ink={0.003} />
    <InkCylinder radius={0.025} height={0.03} position={[0.34, 1.025, 0.08]} color="#ffffff" ink={0.002} />
    <InkBox size={[0.74, 0.7, 0.03]} position={[0, 1.42, -0.24]} color="#9aa0a6" ink={0.006} />
    <InkBox size={[0.68, 0.64, 0.01]} position={[0, 1.42, -0.22]} color="#bfe3f2" emissive="#28404c" ink={0} />
    <InkBox size={[0.78, 0.05, 0.06]} position={[0, 1.82, -0.22]} color="#2c3a40" ink={0.003} />
    {[-0.27, -0.09, 0.09, 0.27].map((x) => (
      <group key={x}>
        <mesh position={[x, 1.82, -0.17]}>
          <sphereGeometry args={[0.035, 16, 12]} />
          <meshBasicMaterial color="#fff6dc" toneMapped={false} />
        </mesh>
        <Halo position={[x, 1.82, -0.14]} size={0.22} color="#ffe6a8" strength={0.5} />
      </group>
    ))}
    <mesh position={[0.62, 1.15, -0.22]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.08, 0.008, 8, 24]} />
      <meshToonMaterial color="#9aa0a6" gradientMap={toonRamp} />
    </mesh>
    <InkBox size={[0.16, 0.3, 0.03]} position={[0.62, 0.98, -0.2]} color="#ff9f1c" ink={0.004} />
  </group>
);

// A gem: a cut octahedron that turns and glints.
export const Diamond: React.FC<{ position: Vec3; size?: number; f: number; color?: string }> = ({ position, size = 0.08, f, color = "#bfefff" }) => (
  <group position={position} rotation={[0, f * 0.04, 0]}>
    <mesh scale={[1, 1.25, 1]}>
      <octahedronGeometry args={[size, 0]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} emissive="#3a6f88" />
    </mesh>
    <Halo position={[0, 0, size]} size={size * 3} color="#e6fbff" strength={0.4 + 0.3 * Math.sin(f / 5)} />
  </group>
);

// A velvet jewellery pedestal under a glass dome, holding whatever is in `children` on its top (y = 1.0).
export const Pedestal: React.FC<{ position: Vec3; children?: React.ReactNode; dome?: boolean; color?: string }> = ({ position, children, dome = true, color = "#5b1a7a" }) => (
  <group position={position}>
    <InkBox size={[0.36, 0.96, 0.36]} position={[0, 0.48, 0]} color="#1d1a1a" />
    <InkBox size={[0.4, 0.04, 0.4]} position={[0, 0.98, 0]} color={color} ink={0.004} />
    <group position={[0, 1.0, 0]}>{children}</group>
    {dome && (
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.17, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#e6f4ff" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    )}
    {dome && (
      <mesh position={[0, 1.09, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.18, 28, 1, true]} />
        <meshBasicMaterial color="#e6f4ff" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    )}
  </group>
);

// A bin of steel blade strips (the materials shot).
export const SteelBin: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.3, 0.36]} position={[0, 0.15, 0]} color="#3a4a5c" />
    {Array.from({ length: 9 }, (_, i) => (
      <InkBox key={i} size={[0.36, 0.006, 0.05]} position={[((i * 37) % 9) * 0.012 - 0.05, 0.305 + (i % 3) * 0.006, -0.12 + i * 0.03]} rotation={[0, (i - 4) * 0.12, 0]} color={STEEL} emissive={i === Math.floor(f / 10) % 9 ? "#8090a0" : "#3a4450"} ink={0.001} shadows={false} />
    ))}
  </group>
);

// A clear jar of plastic pellets.
export const PelletJar: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.14, 0.14, 0.4, 28, 1, true]} />
      <meshBasicMaterial color="#e6f4ff" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <InkCylinder radius={0.15} height={0.04} position={[0.3, 0.02, 0.12]} color="#e0262f" ink={0.003} />
    {Array.from({ length: 40 }, (_, i) => {
      const a = i * 2.39;
      const r = 0.03 + ((i * 7) % 10) * 0.009;
      return (
        <mesh key={i} position={[Math.cos(a) * r, 0.03 + Math.floor(i / 6) * 0.028, Math.sin(a) * r]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshToonMaterial color={["#2f6fd8", "#1d1a1a", "#7fd0ff"][i % 3]} gradientMap={toonRamp} />
        </mesh>
      );
    })}
  </group>
);

// A brass balance: `tilt` -1..1 (positive drops the right pan).
export const Balance: React.FC<{ position: Vec3; tilt: number; left?: React.ReactNode; right?: React.ReactNode }> = ({ position, tilt, left, right }) => {
  const a = tilt * 0.35;
  return (
    <group position={position}>
      <InkBox size={[0.3, 0.04, 0.2]} position={[0, 0.02, 0]} color="#8a5a1a" />
      <InkCylinder radius={0.02} height={0.6} position={[0, 0.32, 0]} color="#e8b04a" ink={0.003} />
      <group position={[0, 0.62, 0]} rotation={[0, 0, -a]}>
        <InkBox size={[0.9, 0.025, 0.03]} color="#e8b04a" ink={0.003} />
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.42, 0, 0]} rotation={[0, 0, a]}>
            <InkCylinder radius={0.003} height={0.22} position={[0, -0.11, 0]} color="#8a5a1a" ink={0} />
            <InkCylinder radius={0.13} height={0.02} position={[0, -0.22, 0]} color="#e8b04a" ink={0.003} />
            <group position={[0, -0.21, 0]}>{s < 0 ? left : right}</group>
          </group>
        ))}
      </group>
    </group>
  );
};

// A rubber stamp on a wooden handle; `press` 0..1 brings it down onto the paper (y = 0 is the paper).
export const Stamp: React.FC<{ position: Vec3; press: number }> = ({ position, press }) => (
  <group position={[position[0], position[1] + 0.3 * (1 - press) + 0.02, position[2]]}>
    <InkBox size={[0.18, 0.03, 0.12]} position={[0, 0.015, 0]} color="#a3141a" ink={0.003} />
    <InkBox size={[0.2, 0.04, 0.14]} position={[0, 0.05, 0]} color="#5a3a1a" />
    <InkCylinder radius={0.03} height={0.14} position={[0, 0.14, 0]} color="#8a5a3a" ink={0.003} />
    <InkCylinder radius={0.05} height={0.05} position={[0, 0.23, 0]} color="#8a5a3a" ink={0.003} />
  </group>
);

// A sheet of patent paper with a drawing of a safety razor, lying flat.
export const PatentPaper: React.FC<{ position: Vec3; stamped?: boolean }> = ({ position, stamped = false }) => (
  <group position={position}>
    <InkBox size={[0.42, 0.004, 0.56]} color="#f3ead2" ink={0.002} />
    <group position={[0, 0.004, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
      <InkBox size={[0.03, 0.22, 0.002]} position={[0, -0.05, 0]} color={INK} ink={0} shadows={false} />
      <InkBox size={[0.16, 0.04, 0.002]} position={[0, 0.08, 0]} color={INK} ink={0} shadows={false} />
    </group>
    {stamped && <Label text="PATENT" position={[0.08, 0.006, -0.17]} rotation={[-Math.PI / 2, 0, 0.2]} width={0.22} bg="#f3ead2" fg="#a3141a" />}
  </group>
);

// A conveyor belt: a long dark band on legs; children ride along it (move them with the frame).
export const Conveyor: React.FC<{ position: Vec3; length?: number; f: number }> = ({ position, length = 3, f }) => (
  <group position={position}>
    <InkBox size={[length, 0.06, 0.4]} position={[0, 0.72, 0]} color="#2c3a40" />
    {Array.from({ length: Math.round(length / 0.25) }, (_, i) => (
      <InkBox key={i} size={[0.02, 0.004, 0.38]} position={[-length / 2 + ((i * 0.25 + f * 0.02) % length), 0.753, 0]} color="#4a5a64" ink={0} shadows={false} />
    ))}
    {[-length / 2 + 0.2, 0, length / 2 - 0.2].map((x) => (
      <InkBox key={x} size={[0.06, 0.7, 0.3]} position={[x, 0.35, 0]} color="#9aa0a6" ink={0.004} />
    ))}
  </group>
);

// A glass display case like the refill case, for the neighbours: perfume bottles, phones or watches on its shelves.
export const ShowCase: React.FC<{ position: Vec3; kind: "perfume" | "phones" | "watches"; width?: number }> = ({ position, kind, width = 1.1 }) => {
  const h = 1.05;
  const item = (x: number, y: number, k: number) => {
    if (kind === "perfume")
      return (
        <group key={`${x}${y}`} position={[x, y, -0.16]}>
          <InkBox size={[0.08, 0.1, 0.05]} position={[0, 0.05, 0]} color={["#f28482", "#9b5de5", "#ffd23f"][k % 3]} ink={0.003} />
          <InkCylinder radius={0.015} height={0.03} position={[0, 0.115, 0]} color="#e8b04a" ink={0.002} />
        </group>
      );
    if (kind === "phones")
      return (
        <group key={`${x}${y}`} position={[x, y, -0.16]} rotation={[-0.25, 0, 0]}>
          <InkBox size={[0.07, 0.14, 0.012]} position={[0, 0.07, 0]} color="#1d1a1a" ink={0.003} />
          <InkBox size={[0.058, 0.12, 0.002]} position={[0, 0.07, 0.007]} color="#4f7dff" emissive="#1a2a66" ink={0} shadows={false} />
        </group>
      );
    return (
      <group key={`${x}${y}`} position={[x, y + 0.07, -0.16]}>
        <mesh>
          <torusGeometry args={[0.035, 0.008, 8, 20]} />
          <meshToonMaterial color="#5a3a1a" gradientMap={toonRamp} />
        </mesh>
        <InkCylinder radius={0.026} height={0.012} rotation={FACE} color={k % 2 ? "#e8b04a" : STEEL} ink={0.002} />
      </group>
    );
  };
  return (
    <group position={position}>
      <CaseFrame width={width} h={h} />
      {[0.55, 0.9, 1.25].map((y, r) => (
        <group key={y}>
          <InkBox size={[width - 0.02, 0.02, 0.3]} position={[0, y, -0.17]} color="#c9ced3" ink={0.003} shadows={false} />
          {Array.from({ length: 5 }, (_, k) => item(-width / 2 + 0.15 + k * ((width - 0.3) / 4), y + 0.01, k + r))}
        </group>
      ))}
      <mesh position={[0, h / 2 + 0.5, 0.03]}>
        <boxGeometry args={[width, h, 0.012]} />
        <meshBasicMaterial color="#cfe9ff" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <Label text={kind.toUpperCase()} position={[0, h + 0.66, 0.03]} width={0.5} bg="#1d1a1a" fg="#ffffff" />
    </group>
  );
};
