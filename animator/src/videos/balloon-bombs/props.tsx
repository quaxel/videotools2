import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";
import { BALLOON, Blob, Cord, paperCanvas, useOwned } from "../../three/BalloonSets";

// Props for "The WWII Balloon Bombs That Reached America" (guide/references/balloon-bomb.md).

const INK = "#161212";
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// A sheet of washi paper lying flat at y on a table; `lift` 0..1 blows it up off the table, curling toward +z and up
// (to cover a face), pivoting on its back edge.
export const PaperSheet: React.FC<{ position: Vec3; size?: [number, number]; lift?: number; frame?: number }> = ({ position, size = [0.9, 0.6], lift = 0, frame = 0 }) => {
  const paper = useOwned(() => paperCanvas(2));
  // one geometry per sheet, bent in place every frame (a new geometry per frame would leak GPU buffers)
  const flat = useMemo(() => new THREE.PlaneGeometry(size[0], size[1], 16, 12), [size[0], size[1]]);
  const curved = useMemo(() => flat.clone(), [flat]);
  React.useEffect(() => () => {
    flat.dispose();
    curved.dispose();
  }, [flat, curved]);
  const src = flat.attributes.position;
  const pos = curved.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = src.getX(i);
    const y = src.getY(i) + size[1] / 2; // 0 at the back edge
    const a = lift * 1.9 * (y / size[1]);
    const flutter = Math.sin(x * 9 + frame * 0.6) * 0.03 * lift;
    pos.setXYZ(i, x, Math.sin(a) * y * 0.9 + flutter, -Math.cos(a) * y + size[1] / 2);
  }
  pos.needsUpdate = true;
  curved.computeVertexNormals();
  return (
    <group position={position}>
      <mesh geometry={curved} rotation={[0, 0, 0]} position={[0, 0.006, -size[1] / 2]} castShadow>
        <meshToonMaterial color="#fffaf0" gradientMap={toonRamp} map={paper} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Long workbench with a paste pot and brush.
export const PasteTable: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 2.4 }) => (
  <group position={position}>
    <InkBox size={[width, 0.06, 0.9]} position={[0, 0.62, 0]} color="#b08458" />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.06, 0.62, 0.06]} position={[sx * (width / 2 - 0.08), 0.31, sz * 0.38]} color="#6b4a2e" ink={0.006} />))}
    <InkCylinder radius={0.09} height={0.12} position={[width / 2 - 0.3, 0.71, 0.15]} color="#8a8a7a" />
    <mesh position={[width / 2 - 0.3, 0.775, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.08, 20]} />
      <meshBasicMaterial color="#e8e0c8" />
    </mesh>
  </group>
);

// Test balloons hanging from the hall ceiling: paper spheres in rows, each swaying a little.
export const HangingBalloons: React.FC<{ frame: number; rows?: number; cols?: number; z0?: number }> = ({ frame, rows = 2, cols = 4, z0 = -2.6 }) => {
  const paper = useOwned(() => paperCanvas(16));
  return (
    <group>
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = (c - (cols - 1) / 2) * 1.9 + (r % 2) * 0.9;
        const z = z0 + r * 1.3;
        const y = 2.25 + Math.sin(frame * 0.04 + i) * 0.03;
        return (
          <group key={i} position={[x, y, z]} rotation={[0, 0, Math.sin(frame * 0.03 + i * 2) * 0.03]}>
            <mesh castShadow>
              <sphereGeometry args={[0.75, 32, 20]} />
              <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={paper} />
            </mesh>
            <mesh scale={1.02}>
              <sphereGeometry args={[0.75, 24, 16]} />
              <meshBasicMaterial color={INK} side={THREE.BackSide} />
            </mesh>
            <Cord a={[0, 0.75, 0]} b={[0, 1.4, 0]} width={0.008} />
          </group>
        );
      })}
    </group>
  );
};

// A black office typewriter on a desk, keys clacking (`clack` shifts the carriage).
export const Typewriter: React.FC<{ position: Vec3; clack?: number }> = ({ position, clack = 0 }) => (
  <group position={position}>
    <InkBox size={[0.42, 0.1, 0.3]} position={[0, 0.05, 0]} color="#22262a" />
    <InkBox size={[0.36, 0.08, 0.14]} position={[0, 0.12, 0.06]} color="#2a2e34" rotation={[-0.35, 0, 0]} />
    <InkCylinder radius={0.035} height={0.5} position={[clack * 0.08, 0.17, -0.11]} rotation={[0, 0, Math.PI / 2]} color="#1a1c20" />
    <mesh position={[clack * 0.08, 0.3, -0.12]} rotation={[-0.15, 0, 0]}>
      <planeGeometry args={[0.24, 0.26]} />
      <meshToonMaterial color="#fbf8f0" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => (
      <mesh key={i} position={[-0.15 + (i % 6) * 0.06, 0.155 + Math.floor(i / 6) * 0.012, 0.08 - Math.floor(i / 6) * 0.04]}>
        <cylinderGeometry args={[0.014, 0.014, 0.012, 10]} />
        <meshBasicMaterial color="#e8e4d8" />
      </mesh>
    ))}
  </group>
);

// A story typed on a sheet with a photo of the balloon: lies flat on the desk, top toward -z.
export const StorySheet: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => {
  const tex = useOwned(
    () =>
      canvasTexture(256, 340, (ctx) => {
        ctx.fillStyle = "#fbf8ef";
        ctx.fillRect(0, 0, 256, 340);
        ctx.fillStyle = "#1d1712";
        ctx.font = "900 26px serif";
        ctx.fillText("PAPER BALLOON", 22, 40);
        ctx.fillText("FOUND IN WEST", 22, 70);
        ctx.fillStyle = "#c8c0b0";
        ctx.fillRect(40, 90, 176, 120);
        ctx.fillStyle = "#f4f0e4";
        ctx.beginPath();
        ctx.arc(128, 135, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#3a342c";
        ctx.beginPath();
        ctx.moveTo(100, 160);
        ctx.lineTo(128, 200);
        ctx.lineTo(156, 160);
        ctx.stroke();
        ctx.fillStyle = "#6a6258";
        for (let l = 0; l < 9; l++) ctx.fillRect(28, 228 + l * 12, 200 - (l % 3) * 30, 4);
      }),
    [],
  );
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotationY]}>
      <planeGeometry args={[0.32, 0.42]} />
      <meshToonMaterial map={tex} gradientMap={toonRamp} />
    </mesh>
  );
};

// A big rubber stamp held over the desk: `drop` 0..1 brings it down; once it has hit (`stamped`), a red
// DO NOT PRINT mark shows on the sheet below.
export const RubberStamp: React.FC<{ position: Vec3; drop: number; stamped: number }> = ({ position, drop, stamped }) => (
  <group position={position}>
    <group position={[0, 0.5 - drop * 0.47, 0]}>
      <InkBox size={[0.26, 0.05, 0.16]} position={[0, 0, 0]} color="#5a3a24" />
      <InkCylinder radius={0.035} height={0.16} position={[0, 0.1, 0]} color="#7a5232" />
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshToonMaterial color="#c8a070" gradientMap={toonRamp} />
      </mesh>
    </group>
    {stamped > 0 && <Label text="DO NOT PRINT" position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0.12]} width={0.36} fg="#c4161c" bg="#fbf8ef" appear={stamped} />}
  </group>
);

// Flying sheets of copy paper scattered by the stamp's blow.
export const FlyingPapers: React.FC<{ origin: Vec3; t: number }> = ({ origin, t }) =>
  t <= 0 ? null : (
    <group userData={{ ghost: true }}>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        const k = Math.min(t, 40) / 40;
        const x = origin[0] + Math.cos(a) * k * (0.5 + rand(i) * 0.5);
        const z = origin[2] + Math.sin(a) * k * 0.4;
        const y = origin[1] + Math.sin(k * Math.PI) * (0.4 + rand(i + 3) * 0.4) + k * 0.05;
        return (
          <mesh key={i} position={[x, y, z]} rotation={[k * 6 * rand(i + 5) - 1.4, k * 4 * rand(i + 6), k * 5 * rand(i + 7)]}>
            <planeGeometry args={[0.2, 0.26]} />
            <meshToonMaterial color="#fbf8ef" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );

// A newspaper held open: blank columns where the story would be (nothing printed).
export const BlankNewspaper: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => {
  const tex = useOwned(
    () =>
      canvasTexture(400, 300, (ctx) => {
        ctx.fillStyle = "#f2ecdc";
        ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = "#1d1712";
        ctx.font = "900 34px serif";
        ctx.textAlign = "center";
        ctx.fillText("THE DAILY NEWS", 200, 40);
        ctx.fillRect(16, 52, 368, 4);
        ctx.fillStyle = "#8a8274";
        for (let c = 0; c < 4; c++) {
          if (c === 1 || c === 2) continue; // the empty space
          for (let l = 0; l < 18; l++) ctx.fillRect(22 + c * 92, 70 + l * 12, 76, 4);
        }
        ctx.strokeStyle = "#b8b0a0";
        ctx.lineWidth = 3;
        ctx.strokeRect(118, 66, 168, 214);
      }),
    [],
  );
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[0.62, 0.46]} />
      <meshToonMaterial map={tex} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
  );
};

// A brass microscope on the bench.
export const Microscope: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.22, 0.04, 0.26]} position={[0, 0.02, 0]} color="#2a2a30" />
    <InkBox size={[0.05, 0.32, 0.05]} position={[0, 0.18, -0.08]} color="#2a2a30" rotation={[0.15, 0, 0]} />
    <InkBox size={[0.16, 0.02, 0.12]} position={[0, 0.14, 0.02]} color="#3a3a42" />
    <InkCylinder radius={0.03} height={0.26} position={[0, 0.3, 0.0]} rotation={[-0.35, 0, 0]} color="#c8a040" />
    <InkCylinder radius={0.022} height={0.08} position={[0, 0.45, -0.05]} rotation={[-0.35, 0, 0]} color="#2a2a30" />
  </group>
);

// A small heap of grey-brown ballast sand on a white tray.
export const SandTray: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.36, 0.03, 0.26]} position={[0, 0.015, 0]} color="#f2f2ee" />
    <Blob position={[0, 0.04, 0]} scale={[0.13, 0.05, 0.09]} color="#8c8478" ink={0.1} />
    {Array.from({ length: 10 }, (_, i) => (
      <mesh key={i} position={[-0.14 + rand(i) * 0.28, 0.034, -0.1 + rand(i + 4) * 0.2]}>
        <sphereGeometry args={[0.006, 5, 4]} />
        <meshBasicMaterial color={rand(i + 8) > 0.5 ? "#5a544a" : "#b0a898"} />
      </mesh>
    ))}
  </group>
);

// A burlap ballast bag, open, sand spilling.
export const Sandbag: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <Blob position={[0, 0.11, 0]} scale={[0.1, 0.13, 0.09]} color="#c8b08a" ink={0.1} detail={2} />
    <InkCylinder radius={0.04} height={0.05} position={[0, 0.25, 0]} color="#a8906a" ink={0.006} />
  </group>
);

// The coast map pinned up in the lab: Japan's east coast with three pins; "ICHINOMIYA?" circled.
export const CoastMap: React.FC<{ position: Vec3; appear?: number }> = ({ position, appear }) => {
  const tex = useOwned(
    () =>
      canvasTexture(512, 640, (ctx) => {
        ctx.fillStyle = "#a8c8dc";
        ctx.fillRect(0, 0, 512, 640);
        ctx.fillStyle = "#e8dcb8";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(250, 0);
        ctx.bezierCurveTo(300, 120, 260, 220, 320, 300);
        ctx.bezierCurveTo(380, 380, 300, 470, 340, 560);
        ctx.lineTo(300, 640);
        ctx.lineTo(0, 640);
        ctx.fill();
        ctx.strokeStyle = "#5a4a36";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = "#1d1712";
        ctx.font = "900 40px sans-serif";
        ctx.fillText("JAPAN", 60, 330);
        ctx.font = "900 30px sans-serif";
        ctx.fillText("PACIFIC", 360, 120);
      }),
    [],
  );
  const pins: Vec3[] = [
    [0.08, 0.22, 0.02],
    [0.16, -0.02, 0.02],
    [0.13, -0.26, 0.02],
  ];
  return (
    <group position={position}>
      <InkBox size={[0.86, 1.06, 0.03]} position={[0, 0, -0.02]} color="#6b4a2e" />
      <mesh>
        <planeGeometry args={[0.8, 1.0]} />
        <meshToonMaterial map={tex} gradientMap={toonRamp} />
      </mesh>
      {pins.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.022, 12, 8]} />
          <meshToonMaterial color="#d42020" gradientMap={toonRamp} />
        </mesh>
      ))}
      <Label text="LAUNCH BEACHES?" position={[0, 0.62, 0.02]} width={0.8} appear={appear} />
    </group>
  );
};

// The microscope's view: round, glowing, full of diatoms (glassy discs, rods, boats) and shell bits.
export const DiatomView: React.FC<{ position: Vec3; frame: number; size?: number }> = ({ position, frame, size = 1.4 }) => {
  const tex = useOwned(
    () =>
      canvasTexture(512, 512, (ctx) => {
        const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
        g.addColorStop(0, "#f4fbff");
        g.addColorStop(0.85, "#c8e4f0");
        g.addColorStop(1, "#7aa8c0");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(256, 256, 250, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#3a6a80";
        ctx.lineWidth = 3;
        for (let i = 0; i < 26; i++) {
          const x = 70 + rand(i) * 372;
          const y = 70 + rand(i + 50) * 372;
          if (Math.hypot(x - 256, y - 256) > 210) continue;
          const kind = i % 3;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rand(i + 9) * 3);
          ctx.fillStyle = "rgba(200,235,240,0.7)";
          if (kind === 0) {
            ctx.beginPath();
            ctx.arc(0, 0, 18 + rand(i) * 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            for (let k = 0; k < 10; k++) {
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(k * 0.63) * 22, Math.sin(k * 0.63) * 22);
              ctx.stroke();
            }
          } else if (kind === 1) {
            ctx.beginPath();
            ctx.ellipse(0, 0, 34, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            for (let k = -3; k <= 3; k++) ctx.fillRect(k * 8 - 1, -6, 2, 12);
          } else {
            ctx.fillStyle = "rgba(240,220,190,0.85)";
            ctx.beginPath();
            ctx.moveTo(-14, 10);
            ctx.lineTo(0, -16);
            ctx.lineTo(16, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.strokeStyle = "#161212";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(256, 256, 249, 0, Math.PI * 2);
        ctx.stroke();
      }),
    [],
  );
  return (
    <mesh position={position} rotation={[0, 0, frame * 0.004]}>
      <circleGeometry args={[size / 2, 64]} />
      <meshBasicMaterial map={tex} toneMapped={false} transparent />
    </mesh>
  );
};

// A short wooden post with a sign board carrying a place name.
export const PlaceSign: React.FC<{ position: Vec3; text: string; rotationY?: number; appear?: number }> = ({ position, text, rotationY = 0, appear }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkCylinder radius={0.045} height={1.04} position={[0, 0.52, 0]} color="#6a4a32" ink={0.012} />
    <InkBox size={[0.98, 0.3, 0.04]} position={[0, 1.2, 0]} color="#8a6a46" />
    <Label text={text} position={[0, 1.2, 0.025]} width={0.9} bg="#f4ead0" appear={appear} />
  </group>
);

// The Mitchell Monument: a low wall of native fieldstone with a bronze plaque.
export const Monument: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    {Array.from({ length: 30 }, (_, i) => {
      const row = Math.floor(i / 6);
      const col = i % 6;
      return (
        <Blob
          key={i}
          position={[-0.75 + col * 0.3 + (row % 2) * 0.12, 0.13 + row * 0.24, (rand(i) - 0.5) * 0.04]}
          scale={[0.16 + rand(i + 3) * 0.04, 0.12, 0.16]}
          color={rand(i + 7) > 0.5 ? "#9a948a" : "#857e74"}
          ink={0.06}
        />
      );
    })}
    <InkBox size={[1.9, 0.08, 0.42]} position={[0, 1.24, 0]} color="#8a847a" />
    <Label text={"BLY, OREGON\nMAY 5, 1945"} position={[0, 0.72, 0.19]} width={0.8} fg="#2a1e10" bg="#b8904a" />
  </group>
);

// A picnic basket with a checked cloth, set down on the needles.
export const PicnicBasket: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.4, 0.22, 0.28]} position={[0, 0.11, 0]} color="#b88a4a" />
    <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0.2]}>
      <planeGeometry args={[0.36, 0.3]} />
      <meshToonMaterial color="#d84a4a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[0.14, 0.012, 6, 20, Math.PI]} />
      <meshToonMaterial color="#8a6a3a" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// What is left of a balloon nobody found: grey, rotted paper shreds over a rusted ring half sunk in the needles.
export const Remnant: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => {
  const paper = useOwned(() => paperCanvas(8));
  return (
    <group position={position}>
      <group rotation={[0.25, 0.4, 0.1]} position={[0, -0.05, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[BALLOON.ring, 0.03, 8, 40]} />
          <meshToonMaterial color="#8a5a3a" gradientMap={toonRamp} />
        </mesh>
      </group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.5 + i * 0.22, 0.05 + rand(i) * 0.08, (rand(i + 3) - 0.5) * 0.6]} rotation={[-Math.PI / 2 + (rand(i + 5) - 0.5) * 0.8, 0, rand(i + 7) * 3 + Math.sin(frame * 0.05 + i) * 0.04]}>
          <planeGeometry args={[0.22 + rand(i) * 0.18, 0.14 + rand(i + 1) * 0.12]} />
          <meshToonMaterial color="#a8a294" gradientMap={toonRamp} map={paper} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <InkCylinder radius={0.07} height={0.3} position={[0.2, 0.06, 0.1]} rotation={[1.3, 0.3, 0]} color="#4a4038" />
    </group>
  );
};

// The altimeter control box blown up big for a macro: a dial with a needle, a label underneath.
export const AltimeterDial: React.FC<{ position: Vec3; needle: number; label?: string; appear?: number }> = ({ position, needle, label = "ALTIMETER", appear }) => (
  <group position={position}>
    <InkCylinder radius={0.32} height={0.12} rotation={[Math.PI / 2, 0, 0]} color="#7a8088" />
    <mesh position={[0, 0, 0.065]}>
      <circleGeometry args={[0.27, 40]} />
      <meshBasicMaterial color="#f4f0e4" />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => (
      <mesh key={i} position={[Math.cos((i / 12) * Math.PI * 2) * 0.23, Math.sin((i / 12) * Math.PI * 2) * 0.23, 0.067]} rotation={[0, 0, (i / 12) * Math.PI * 2]}>
        <planeGeometry args={[0.05, 0.012]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    ))}
    <mesh position={[0, 0, 0.07]} rotation={[0, 0, needle]}>
      <planeGeometry args={[0.02, 0.4]} />
      <meshBasicMaterial color="#c4161c" />
    </mesh>
    <mesh position={[0, 0, 0.072]}>
      <circleGeometry args={[0.025, 16]} />
      <meshBasicMaterial color={INK} />
    </mesh>
    <Label text={label} position={[0, -0.46, 0.06]} width={0.7} appear={appear} />
  </group>
);

// A wooden signpost on a rock in the open ocean (the gag milepost): AMERICA 6,000 MI.
export const OceanMilepost: React.FC<{ position: Vec3; appear?: number }> = ({ position, appear }) => (
  <group position={position}>
    <Blob position={[0, -0.1, 0]} scale={[0.9, 0.4, 0.7]} color="#4a4a58" ink={0.05} />
    <InkCylinder radius={0.06} height={1.6} position={[0, 0.8, 0]} color="#6a4a32" ink={0.012} />
    <group position={[0.35, 1.4, 0]} rotation={[0, 0, -0.04]}>
      <InkBox size={[1.2, 0.34, 0.05]} color="#8a6a46" />
      <Label text="AMERICA 6,000 MI →" position={[0, 0, 0.03]} width={1.1} bg="#f4ead0" appear={appear} />
    </group>
  </group>
);
