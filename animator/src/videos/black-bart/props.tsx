import React, { useMemo } from "react";
import * as THREE from "three";
import { BlenderModel, canvasTexture, InkBox, InkCylinder, toonRamp } from "../../engine";
import { Horse } from "../niagara-silent/props";

type Vec3 = [number, number, number];

const tex = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => canvasTexture(w, h, draw);

// ---------- Bart's kit ----------

// The flour sack over Bart's head: a lumpy bag with two cut eye holes, tied at the neck, his derby on top.
// `at` is the centre of the head; it faces the camera along `yaw`.
export const SackHead: React.FC<{ at: Vec3; yaw: number; derby?: boolean }> = ({ at, yaw, derby = true }) => {
  const cloth = useMemo(
    () =>
      tex(256, 256, (ctx) => {
        ctx.fillStyle = "#e8dcc0";
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = `rgba(150,120,80,${0.08 + (i % 5) * 0.02})`;
          ctx.fillRect((i * 53) % 256, 0, 2, 256);
          ctx.fillRect(0, (i * 37) % 256, 256, 2);
        }
        // eye holes
        ctx.fillStyle = "#1a1412";
        ctx.beginPath();
        ctx.ellipse(96, 118, 16, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(160, 118, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // a printed mill stamp, half worn away
        ctx.fillStyle = "rgba(160,60,40,0.35)";
        ctx.font = "bold 30px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("FLOUR", 128, 190);
      }),
    [],
  );
  return (
    <group position={at} rotation={[0, yaw, 0]} userData={{ ghost: true }}>
      <mesh scale={[0.2, 0.25, 0.18]} castShadow>
        <sphereGeometry args={[1, 24, 18]} />
        <meshToonMaterial map={cloth} gradientMap={toonRamp} />
      </mesh>
      <mesh scale={[0.205, 0.255, 0.185]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial color="#161212" side={THREE.BackSide} />
      </mesh>
      {/* the tie at the neck */}
      <InkCylinder radius={0.11} height={0.05} position={[0, -0.22, 0]} color="#c8b890" ink={0.008} />
      {derby && (
        <group position={[0, 0.2, 0]}>
          <InkCylinder radius={0.24} height={0.025} color="#1c1a1a" ink={0.01} />
          <mesh position={[0, 0.07, 0]} scale={[0.15, 0.12, 0.15]}>
            <sphereGeometry args={[1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshToonMaterial color="#1c1a1a" gradientMap={toonRamp} />
          </mesh>
          <InkCylinder radius={0.152} height={0.03} position={[0, 0.02, 0]} color="#3a2a24" ink={0} />
        </group>
      )}
    </group>
  );
};

// A double-barrelled shotgun held across the body: `at` the grip, pointing along `yaw` with `pitch`.
export const Shotgun: React.FC<{ at: Vec3; yaw: number; pitch?: number; length?: number }> = ({ at, yaw, pitch = 0, length = 0.85 }) => (
  <group position={at} rotation={[0, yaw, pitch, "YZX"]} userData={{ ghost: true }}>
    <InkBox size={[0.28, 0.06, 0.05]} position={[-0.12, -0.02, 0]} rotation={[0, 0, -0.15]} color="#6a3a1e" ink={0.008} />
    <InkCylinder radius={0.016} height={length} position={[length / 2, 0.02, 0.017]} rotation={[0, 0, Math.PI / 2]} color="#3a3a42" ink={0.006} />
    <InkCylinder radius={0.016} height={length} position={[length / 2, 0.02, -0.017]} rotation={[0, 0, Math.PI / 2]} color="#3a3a42" ink={0.006} />
  </group>
);

// The heavy iron-bound strongbox; `label` on its front.
export const Strongbox: React.FC<{ position: Vec3; rotation?: Vec3; open?: number; scale?: number }> = ({ position, rotation = [0, 0, 0], open = 0, scale = 1 }) => {
  const face = useMemo(
    () =>
      tex(512, 256, (ctx) => {
        ctx.fillStyle = "#2f5a3a";
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 18;
        ctx.strokeRect(9, 9, 494, 238);
        ctx.fillStyle = "#e8d088";
        ctx.font = "bold 64px Georgia";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("STRONGBOX", 256, 132);
      }),
    [],
  );
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <InkBox size={[0.62, 0.3, 0.34]} position={[0, 0.15, 0]} color="#2f5a3a" ink={0.012} />
      <mesh position={[0, 0.15, 0.172]}>
        <planeGeometry args={[0.6, 0.28]} />
        <meshToonMaterial map={face} gradientMap={toonRamp} />
      </mesh>
      {[-0.26, 0.26].map((x) => (
        <InkBox key={x} size={[0.04, 0.31, 0.35]} position={[x, 0.15, 0]} color="#1e1e1e" ink={0} />
      ))}
      <group position={[0, 0.3, -0.17]} rotation={[-open * 1.6, 0, 0]}>
        <InkBox size={[0.62, 0.05, 0.34]} position={[0, 0.025, 0.17]} color="#2a4e32" ink={0.012} />
      </group>
    </group>
  );
};

// A sheet of paper with a few lines of verse (a poem), flat on a surface or held.
export const Poem: React.FC<{ position: Vec3; rotation?: Vec3; size?: number }> = ({ position, rotation = [-Math.PI / 2, 0, 0], size = 0.32 }) => {
  const page = useMemo(
    () =>
      tex(256, 320, (ctx) => {
        ctx.fillStyle = "#f2ead6";
        ctx.fillRect(0, 0, 256, 320);
        ctx.fillStyle = "#3a2a20";
        ctx.font = "bold 30px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("POEM", 128, 50);
        ctx.strokeStyle = "rgba(50,40,30,0.6)";
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.moveTo(34, 90 + i * 26);
          for (let x = 34; x < 222; x += 12) ctx.lineTo(x, 90 + i * 26 + Math.sin(x * 0.4 + i) * 3);
          ctx.stroke();
        }
      }),
    [],
  );
  return (
    <mesh position={position} rotation={rotation} userData={{ ghost: true }}>
      <planeGeometry args={[size * 0.8, size]} />
      <meshToonMaterial map={page} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
  );
};

// The handkerchief: white linen, a folded corner with the laundry mark F.X.O.7 (readable in a macro).
export const Handkerchief: React.FC<{ position: Vec3; rotation?: Vec3; size?: number; crumple?: number; mark?: boolean; color?: string }> = ({ position, rotation = [-Math.PI / 2, 0, 0], size = 0.32, crumple = 0.3, mark = true, color = "#ffffff" }) => {
  const linen = useMemo(
    () =>
      tex(512, 512, (ctx) => {
        ctx.fillStyle = "#f6f4ee";
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = "rgba(160,170,190,0.5)";
        ctx.lineWidth = 6;
        ctx.strokeRect(24, 24, 464, 464);
        ctx.fillStyle = "rgba(120,100,70,0.18)";
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.ellipse(120 + i * 60, 300 + (i % 3) * 40, 40, 18, i, 0, Math.PI * 2);
          ctx.fill();
        }
        if (mark) {
          ctx.save();
          ctx.translate(350, 410);
          ctx.rotate(-0.08);
          ctx.fillStyle = "#1a2a5a";
          ctx.font = "bold 64px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.fillText("F.X.O.7", 0, 0);
          ctx.restore();
        }
      }),
    [mark],
  );
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, 16, 16);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, (Math.sin(x * 31) * Math.cos(y * 27) + Math.sin((x + y) * 19) * 0.6) * 0.012 * crumple * (size / 0.32));
    }
    g.computeVertexNormals();
    return g;
  }, [size, crumple]);
  return (
    <mesh geometry={geo} position={position} rotation={rotation} castShadow userData={{ ghost: true }}>
      <meshToonMaterial map={linen} color={color} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
  );
};

// A hunting rifle held by the young man: `at` the grip.
export const Rifle: React.FC<{ at: Vec3; yaw: number; pitch?: number }> = ({ at, yaw, pitch = 0 }) => (
  <group position={at} rotation={[0, yaw, pitch, "YZX"]} userData={{ ghost: true }}>
    <InkBox size={[0.32, 0.07, 0.05]} position={[-0.16, -0.03, 0]} rotation={[0, 0, -0.12]} color="#7a4a22" ink={0.008} />
    <InkCylinder radius={0.014} height={0.8} position={[0.4, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} color="#2a2a30" ink={0.006} />
  </group>
);

// ---------- the laundry ----------

// The laundry's rubber stamp on its wooden handle; `press` 0..1 brings it down.
export const Stamp: React.FC<{ position: Vec3; press?: number }> = ({ position, press = 0 }) => (
  <group position={[position[0], position[1] + 0.22 - press * 0.16, position[2]]}>
    <InkCylinder radius={0.04} height={0.16} position={[0, 0.08, 0]} color="#8a5a32" ink={0.008} />
    <mesh position={[0, 0.2, 0]}>
      <sphereGeometry args={[0.055, 14, 10]} />
      <meshToonMaterial color="#6a3a1e" gradientMap={toonRamp} />
    </mesh>
    <InkBox size={[0.16, 0.03, 0.09]} position={[0, -0.005, 0]} color="#2a2a2a" ink={0.006} />
  </group>
);

// The laundry book, open: codes on the left, names on the right. `rows` are [code, name]; `hl` highlights one row.
export const Ledger: React.FC<{ position: Vec3; rotation?: Vec3; rows: [string, string][]; hl?: number; size?: number }> = ({ position, rotation = [-Math.PI / 2 + 0.25, 0, 0], rows, hl = -1, size = 0.6 }) => {
  const pages = useMemo(
    () =>
      tex(1024, 640, (ctx) => {
        ctx.fillStyle = "#efe4c8";
        ctx.fillRect(0, 0, 1024, 640);
        ctx.fillStyle = "rgba(120,90,50,0.25)";
        ctx.fillRect(506, 0, 12, 640);
        ctx.fillStyle = "#3a2a1a";
        ctx.font = "bold 46px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("CODE", 256, 70);
        ctx.fillText("CUSTOMER", 768, 70);
        ctx.strokeStyle = "rgba(60,80,140,0.35)";
        ctx.lineWidth = 2;
        rows.forEach(([code, name], i) => {
          const y = 150 + i * 90;
          if (i === hl) {
            ctx.fillStyle = "rgba(255,210,60,0.55)";
            ctx.fillRect(30, y - 52, 964, 74);
          }
          ctx.beginPath();
          ctx.moveTo(40, y + 22);
          ctx.lineTo(984, y + 22);
          ctx.stroke();
          ctx.fillStyle = "#1a2a5a";
          ctx.font = "bold 52px 'Courier New', monospace";
          ctx.fillText(code, 256, y);
          ctx.fillStyle = "#2a1a10";
          ctx.font = "italic bold 50px Georgia";
          ctx.fillText(name, 768, y);
        });
      }),
    [rows, hl],
  );
  return (
    <group position={position} rotation={rotation}>
      <InkBox size={[size * 1.06, size * 0.66, 0.03]} position={[0, 0, -0.016]} color="#5a2a1a" ink={0.008} />
      <mesh>
        <planeGeometry args={[size, size * 0.625]} />
        <meshToonMaterial map={pages} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// A white shirt hanging from a line (two pegs), swaying a little.
export const HangingShirt: React.FC<{ position: Vec3; sway?: number; color?: string }> = ({ position, sway = 0, color = "#f4f6f8" }) => (
  <group position={position} rotation={[sway * 0.08, 0, sway * 0.05]}>
    <InkBox size={[0.42, 0.5, 0.02]} position={[0, -0.27, 0]} color={color} ink={0.006} />
    <InkBox size={[0.2, 0.14, 0.02]} position={[-0.28, -0.1, 0]} rotation={[0, 0, 0.6]} color={color} ink={0.006} />
    <InkBox size={[0.2, 0.14, 0.02]} position={[0.28, -0.1, 0]} rotation={[0, 0, -0.6]} color={color} ink={0.006} />
    <InkBox size={[0.14, 0.05, 0.025]} position={[0, -0.03, 0.002]} color="#e0e4ea" ink={0.004} />
  </group>
);

// ---------- the stagecoach ----------

// The coach with its pair of horses in front, travelling toward +x. `x` the coach centre, `rolled` metres
// travelled (wheels and the horses' gait follow it), `trot` 0 standing .. 1 trotting.
export const Coach: React.FC<{ x: number; z?: number; rolled?: number; trot?: number; door?: number }> = ({ x, z = 0, rolled = 0, trot = 0, door = 0 }) => {
  const deg = (r: number) => -(rolled / r) * (180 / Math.PI);
  const phase = rolled * 4.2;
  return (
    <group position={[x, 0, z]}>
      <BlenderModel
        src="videos/black-bart/models/stagecoach.glb"
        rotation={[0, Math.PI / 2, 0]}
        joints={{ spin_FL: deg(0.42), spin_FR: deg(0.42), spin_RL: deg(0.52), spin_RR: deg(0.52), door }}
      />
      {[-0.42, 0.42].map((dz, i) => (
        <group key={i} position={[2.15, 0, dz]}>
          <Horse phase={phase + i * 0.6} run={trot} bare coat={i ? "#6a3a22" : "#3a2a1e"} scale={0.95} />
        </group>
      ))}
      {/* the traces from the horses back to the coach */}
      {[-0.42, 0.42].map((dz, i) => (
        <InkBox key={i} size={[1.5, 0.02, 0.02]} position={[1.35, 0.85, dz]} color="#2a1a10" ink={0} />
      ))}
    </group>
  );
};

export { toonRamp };
