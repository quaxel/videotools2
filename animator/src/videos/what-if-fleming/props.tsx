import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, Halo, Haze, Hills, InkBox, InkCylinder, Label, SkyDome, toonRamp, Vec3 } from "../../engine";

// Props for "What if Fleming had cleaned up his lab?" (St Mary's Hospital, London, 1928; Oxford 1940; D-Day 1944).
// Notes for the lab: guide/references/st-marys-lab-1928.md.

const INK = "#1a1418";
const q = (v: number, step = 0.05) => Math.round(Math.max(0, Math.min(1, v)) / step) * step;

const rng = (seed: number) => {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

// ---------- Petri dishes ----------

// The top of the agar: cream colonies of germs, a fuzzy blue-green mould spot and the clear ring of dead germs round it.
const dishTexture = (seed: number, colonies: number, mould: number, clear: number, overgrow: number) =>
  canvasTexture(512, 512, (ctx) => {
    const r = rng(seed);
    ctx.fillStyle = "#e8d48a";
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();
    // a soft rim shade
    const g = ctx.createRadialGradient(256, 256, 160, 256, 256, 252);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(120,90,30,0.35)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(256, 256, 252, 0, Math.PI * 2);
    ctx.fill();
    const mx = 300;
    const my = 210;
    const mr = 70 * mould;
    const cr = mr + 120 * clear;
    // germ colonies
    const n = Math.round(150 * colonies);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 225;
      const x = 256 + Math.cos(a) * d;
      const y = 256 + Math.sin(a) * d;
      const near = Math.hypot(x - mx, y - my);
      const size = (6 + r() * 12) * (0.6 + 0.6 * overgrow);
      if (mould > 0 && near < cr) {
        // dying colonies fade to ghosts at the edge of the clear ring
        if (near < cr - 30) continue;
        ctx.fillStyle = "rgba(240,236,214,0.45)";
      } else ctx.fillStyle = r() > 0.5 ? "#f7f1d8" : "#efe3b4";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(150,120,50,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (overgrow > 0) {
      // a creamy lawn of germs grown over everything
      ctx.fillStyle = `rgba(246,238,206,${0.75 * overgrow})`;
      ctx.beginPath();
      ctx.arc(256, 256, 236, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mould > 0 && clear > 0) {
      // the clear ring where the germs died: the agar shows through, paler and glassy
      ctx.fillStyle = "rgba(250,246,226,0.55)";
      ctx.beginPath();
      ctx.arc(mx, my, cr - 18, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mould > 0) {
      // fuzzy mould: a white felt edge, blue-green centre
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2;
        const rr = mr * (0.9 + 0.25 * r());
        ctx.fillStyle = "#f4f7ee";
        ctx.beginPath();
        ctx.arc(mx + Math.cos(a) * rr * 0.85, my + Math.sin(a) * rr * 0.85, mr * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#3f9a86";
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2c7a6c";
      for (let k = 0; k < 14; k++) {
        ctx.beginPath();
        ctx.arc(mx + (r() - 0.5) * mr, my + (r() - 0.5) * mr, mr * (0.1 + r() * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

// A glass Petri dish (drawn ~2x real size: radius 0.09 m). `lid` slides the lid off sideways (metres).
export const PetriDish: React.FC<{
  position: Vec3;
  radius?: number;
  seed?: number;
  colonies?: number;
  mould?: number;
  clear?: number;
  overgrow?: number;
  lid?: number;
  lidOn?: boolean;
  rotation?: Vec3;
}> = ({ position, radius = 0.09, seed = 1, colonies = 1, mould = 0, clear = 0, overgrow = 0, lid = 0, lidOn = true, rotation = [0, 0, 0] }) => {
  const c = q(colonies, 0.1);
  const m = q(mould);
  const cl = q(clear);
  const o = q(overgrow, 0.1);
  const tex = useMemo(() => dishTexture(seed, c, m, cl, o), [seed, c, m, cl, o]);
  const h = radius * 0.17;
  return (
    <group position={position} rotation={rotation}>
      {/* glass base */}
      <InkCylinder radius={radius} height={h} position={[0, h / 2, 0]} color="#cfe6e4" ink={0.003} />
      <mesh position={[0, h + 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.94, 40]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {lidOn && (
        <group position={[lid, h * 1.25, lid * 0.2]}>
          <mesh position={[0, h * 0.35, 0]}>
            <cylinderGeometry args={[radius * 1.05, radius * 1.05, h * 0.7, 40, 1, true]} />
            <meshBasicMaterial color="#e8f6f4" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh position={[0, h * 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radius * 1.05, 40]} />
            <meshBasicMaterial color="#f2fbfa" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <mesh position={[0, h * 0.7 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 1.0, radius * 1.07, 40]} />
            <meshBasicMaterial color="#7aa8a6" />
          </mesh>
        </group>
      )}
    </group>
  );
};

// A leaning stack of dishes on a bench (a mess of them).
export const DishStack: React.FC<{ position: Vec3; count?: number; seed?: number; lean?: number; radius?: number }> = ({ position, count = 5, seed = 3, lean = 0.012, radius = 0.09 }) => {
  const r = rng(seed);
  const offs = Array.from({ length: count }, () => [(r() - 0.5) * lean * 2, (r() - 0.5) * lean * 2]);
  return (
    <group position={position}>
      {offs.map(([dx, dz], i) => (
        <PetriDish key={i} position={[dx + i * lean * 0.3, i * radius * 0.4, dz]} radius={radius} seed={seed * 10 + i} colonies={0.7} />
      ))}
    </group>
  );
};

// ---------- the lab ----------

export const Bench: React.FC<{ position: Vec3; size?: Vec3; color?: string }> = ({ position, size = [2.4, 0.55, 0.62], color = "#7a4e2c" }) => {
  const [w, h, d] = size;
  const n = Math.max(2, Math.round(w / 0.6));
  return (
    <group position={position}>
      <InkBox size={[w, 0.05, d]} position={[0, h - 0.025, 0]} color={color} ink={0.01} />
      <InkBox size={[w - 0.06, h - 0.05, d - 0.08]} position={[0, (h - 0.05) / 2, -0.02]} color="#5e3a20" ink={0.008} />
      {/* drawer fronts */}
      {Array.from({ length: n }, (_, i) => (
        <InkBox key={i} size={[w / n - 0.06, 0.14, 0.012]} position={[-w / 2 + (i + 0.5) * (w / n), h - 0.14, d / 2 - 0.05]} color="#6a4426" ink={0.004} />
      ))}
    </group>
  );
};

export const Microscope: React.FC<{ position: Vec3; scale?: number; rotationY?: number }> = ({ position, scale = 1, rotationY = 0 }) => (
  <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.14, 0.03, 0.18]} position={[0, 0.015, 0]} color="#2a2a2a" ink={0.006} />
    <InkBox size={[0.04, 0.2, 0.05]} position={[0, 0.12, -0.06]} rotation={[0.25, 0, 0]} color="#b8862a" ink={0.006} />
    <InkBox size={[0.11, 0.015, 0.1]} position={[0, 0.11, 0.0]} color="#2a2a2a" ink={0.004} />
    <InkCylinder radius={0.022} height={0.2} position={[0, 0.24, -0.01]} rotation={[0.35, 0, 0]} color="#c8962e" ink={0.006} />
    <InkCylinder radius={0.014} height={0.05} position={[0, 0.33, -0.05]} rotation={[0.35, 0, 0]} color="#2a2a2a" ink={0.004} />
    <InkCylinder radius={0.01} height={0.05} position={[0, 0.14, 0.02]} color="#9a9a9a" ink={0.003} />
  </group>
);

// A brown reagent bottle or a clear one with a stopper.
export const Bottle: React.FC<{ position: Vec3; color?: string; h?: number }> = ({ position, color = "#6a3a14", h = 0.16 }) => (
  <group position={position}>
    <InkCylinder radius={h * 0.28} height={h * 0.72} position={[0, h * 0.36, 0]} color={color} ink={0.004} />
    <InkCylinder radius={h * 0.1} height={h * 0.2} position={[0, h * 0.82, 0]} color={color} ink={0.003} />
    <InkCylinder radius={h * 0.12} height={h * 0.08} position={[0, h * 0.95, 0]} color="#d8cba8" ink={0.003} />
  </group>
);

export const TubeRack: React.FC<{ position: Vec3; n?: number }> = ({ position, n = 6 }) => (
  <group position={position}>
    <InkBox size={[0.05 * n + 0.04, 0.03, 0.08]} position={[0, 0.06, 0]} color="#8a5a32" ink={0.004} />
    <InkBox size={[0.05 * n + 0.04, 0.012, 0.08]} position={[0, 0.005, 0]} color="#8a5a32" ink={0.003} />
    {Array.from({ length: n }, (_, i) => (
      <group key={i} position={[-0.025 * (n - 1) + i * 0.05, 0, 0]}>
        <InkCylinder radius={0.012} height={0.15} position={[0, 0.075, 0]} color="#d8ece8" ink={0.002} />
        <InkCylinder radius={0.011} height={0.05} position={[0, 0.03, 0]} color={["#e8c860", "#c8e0a0", "#f0d8a0"][i % 3]} ink={0} />
        <InkCylinder radius={0.014} height={0.02} position={[0, 0.155, 0]} color="#f0ece0" ink={0.002} />
      </group>
    ))}
  </group>
);

export const Bunsen: React.FC<{ position: Vec3; frame?: number; lit?: boolean }> = ({ position, frame = 0, lit = true }) => (
  <group position={position}>
    <InkCylinder radius={0.04} height={0.015} position={[0, 0.008, 0]} color="#3a3a3a" ink={0.004} />
    <InkCylinder radius={0.011} height={0.13} position={[0, 0.08, 0]} color="#a8a8a8" ink={0.003} />
    {lit && (
      <group position={[0, 0.17 + Math.sin(frame * 0.7) * 0.003, 0]} scale={[1, 1 + Math.sin(frame * 0.9) * 0.12, 1]}>
        <mesh>
          <coneGeometry args={[0.012, 0.06, 12]} />
          <meshBasicMaterial color={new THREE.Color(0.6, 0.9, 2.2)} toneMapped={false} transparent opacity={0.85} />
        </mesh>
      </group>
    )}
  </group>
);

// The warm incubator: a metal cabinet with a glass inner door, shelves of dishes and a glowing interior.
// `open` 0..1 swings the door (hinged on the left); `glow` 0..1 lights the inside.
export const Incubator: React.FC<{ position: Vec3; open?: number; glow?: number; halo?: boolean; label?: boolean; dishes?: number; rotationY?: number; children?: React.ReactNode }> = ({
  position,
  open = 0,
  glow = 1,
  halo = true,
  label = true,
  dishes = 6,
  rotationY = 0,
  children,
}) => {
  const W = 0.7;
  const H = 0.95;
  const D = 0.5;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* stand */}
      <InkBox size={[W + 0.04, 0.35, D]} position={[0, 0.175, 0]} color="#4a3a2a" ink={0.01} />
      {/* body: back, sides, top, bottom */}
      <InkBox size={[W, H, 0.04]} position={[0, 0.35 + H / 2, -D / 2 + 0.02]} color="#9a7a4a" ink={0.01} />
      <InkBox size={[0.05, H, D]} position={[-W / 2 + 0.025, 0.35 + H / 2, 0]} color="#a88654" ink={0.01} />
      <InkBox size={[0.05, H, D]} position={[W / 2 - 0.025, 0.35 + H / 2, 0]} color="#a88654" ink={0.01} />
      <InkBox size={[W, 0.06, D]} position={[0, 0.35 + H - 0.03, 0]} color="#b8945e" ink={0.01} />
      <InkBox size={[W, 0.05, D]} position={[0, 0.375, 0]} color="#8a6a3e" ink={0.008} />
      {/* warm inside */}
      <mesh position={[0, 0.35 + H / 2, -D / 2 + 0.045]}>
        <planeGeometry args={[W - 0.1, H - 0.12]} />
        <meshBasicMaterial color={new THREE.Color("#ff9a4a").multiplyScalar(Math.min(0.92, 0.5 + 0.42 * glow))} toneMapped={false} />
      </mesh>
      {[0.55, 0.85].map((y) => (
        <InkBox key={y} size={[W - 0.1, 0.015, D - 0.08]} position={[0, y, 0]} color="#c8b080" ink={0.003} />
      ))}
      {Array.from({ length: dishes }, (_, i) => (
        <PetriDish key={i} position={[-0.17 + (i % 3) * 0.17, i < 3 ? 0.565 : 0.865, 0.02]} radius={0.07} seed={40 + i} colonies={0.8} />
      ))}
      {children}
      {glow > 0 && <pointLight position={[0, 0.8, 0.1]} color="#ffa050" intensity={0.9 * glow} distance={1.8} />}
      {glow > 0 && halo && <Halo position={[0, 0.8, D / 2 + 0.03]} size={1.3} color="#ffa050" strength={0.28 * glow} />}
      {/* the door: a metal frame round a glass pane, hinged at the left edge */}
      <group position={[-W / 2, 0.35 + H / 2, D / 2]} rotation={[0, -open * 1.9, 0]}>
        <InkBox size={[W, 0.06, 0.03]} position={[W / 2, H / 2 - 0.03, 0]} color="#b8945e" ink={0.006} />
        <InkBox size={[W, 0.06, 0.03]} position={[W / 2, -H / 2 + 0.03, 0]} color="#b8945e" ink={0.006} />
        <InkBox size={[0.06, H, 0.03]} position={[0.03, 0, 0]} color="#b8945e" ink={0.006} />
        <InkBox size={[0.06, H, 0.03]} position={[W - 0.03, 0, 0]} color="#b8945e" ink={0.006} />
        <mesh position={[W / 2, 0, 0]}>
          <planeGeometry args={[W - 0.12, H - 0.12]} />
          <meshBasicMaterial color="#fff0d8" transparent opacity={0.16} depthWrite={false} />
        </mesh>
        <InkBox size={[0.03, 0.12, 0.04]} position={[W - 0.07, 0, 0.03]} color="#3a3a3a" ink={0.003} />
      </group>
      {/* thermometer on top */}
      <InkCylinder radius={0.012} height={0.22} position={[0.2, 0.35 + H + 0.11, 0]} color="#f0ece0" ink={0.003} />
      <InkCylinder radius={0.008} height={0.12} position={[0.2, 0.35 + H + 0.08, 0.006]} color="#d62828" ink={0} />
      {label && <Label text="INCUBATOR" position={[0, 0.2, D / 2 + 0.006]} width={0.5} bg="#f2e6c8" />}
    </group>
  );
};

// A tall sash window with a painted London street view (shut).
export const LondonWindow: React.FC<{ position: Vec3; size?: [number, number]; dusk?: number }> = ({ position, size = [1.0, 1.4], dusk = 0 }) => {
  const d = q(dusk, 0.1);
  const tex = useMemo(
    () =>
      canvasTexture(512, 720, (ctx) => {
        const sky = ctx.createLinearGradient(0, 0, 0, 720);
        sky.addColorStop(0, d > 0.5 ? "#3a3060" : "#bcd8ec");
        sky.addColorStop(1, d > 0.5 ? "#e08a5a" : "#eef2e8");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 512, 720);
        // brick fronts across the street
        const fronts = ["#8a4a34", "#a0644a", "#7a3e2e", "#946048"];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = fronts[i];
          const top = 200 + (i % 2) * 60;
          ctx.fillRect(i * 128, top, 130, 720 - top);
          ctx.fillStyle = d > 0.5 ? "#ffd27a" : "#cfe0ea";
          for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) ctx.fillRect(i * 128 + 20 + c * 56, top + 40 + r * 110, 34, 60);
          ctx.fillStyle = "#3a2a24";
          ctx.fillRect(i * 128 + 10, top - 14, 110, 14);
          // chimney pots
          ctx.fillRect(i * 128 + 80, top - 50, 22, 40);
        }
      }),
    [d],
  );
  const [w, h] = size;
  return (
    <group position={position}>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <InkBox size={[w + 0.12, 0.08, 0.08]} position={[0, h / 2 + 0.04, 0.02]} color="#e8e0cc" ink={0.006} />
      <InkBox size={[w + 0.16, 0.06, 0.16]} position={[0, -h / 2 - 0.03, 0.06]} color="#e8e0cc" ink={0.006} />
      <InkBox size={[0.06, h, 0.08]} position={[-w / 2 - 0.03, 0, 0.02]} color="#e8e0cc" ink={0.006} />
      <InkBox size={[0.06, h, 0.08]} position={[w / 2 + 0.03, 0, 0.02]} color="#e8e0cc" ink={0.006} />
      <InkBox size={[w, 0.05, 0.06]} position={[0, 0, 0.04]} color="#e8e0cc" ink={0.005} />
      <InkBox size={[0.03, h, 0.04]} position={[0, 0, 0.03]} color="#e8e0cc" ink={0.004} />
    </group>
  );
};

export const Calendar: React.FC<{ position: Vec3; text: string; appear?: number; width?: number }> = ({ position, text, appear, width = 0.36 }) => (
  <group position={position}>
    <InkBox size={[width + 0.06, width * 1.1, 0.02]} color="#f4f0e6" ink={0.006} />
    <InkBox size={[width + 0.06, width * 0.22, 0.025]} position={[0, width * 0.44, 0.004]} color="#2a5a8a" ink={0.004} />
    <Label text={text} position={[0, -0.03, 0.016]} width={width} bg="#f4f0e6" border={false} appear={appear} />
  </group>
);

export const WallClock: React.FC<{ position: Vec3; minutes: number; size?: number; face?: string }> = ({ position, minutes, size = 0.2, face = "#f4ecd8" }) => (
  <group position={position}>
    <InkCylinder radius={size} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#5a3a24" ink={0.006} />
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

// A conical lab flask with liquid; `foam` 0..1 swells foam out of the neck, `cork` 0..1 sends the cork flying.
export const Flask: React.FC<{ position: Vec3; scale?: number; liquid?: string; foam?: number; cork?: number; frame?: number }> = ({ position, scale = 1, liquid = "#e8c24a", foam = 0, cork = 0, frame = 0 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.11, 0]} castShadow>
      <coneGeometry args={[0.12, 0.22, 32, 1, true]} />
      <meshToonMaterial color="#d8ecea" gradientMap={toonRamp} transparent opacity={0.55} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.11, 0]} scale={[1.06, 1.02, 1.06]}>
      <coneGeometry args={[0.12, 0.22, 32, 1, true]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <mesh position={[0, 0.05, 0]}>
      <cylinderGeometry args={[0.055, 0.1, 0.1, 32]} />
      <meshToonMaterial color={liquid} gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.028} height={0.09} position={[0, 0.25, 0]} color="#d8ecea" ink={0.004} />
    <group position={[cork * 0.12, 0.3 + cork * 0.35 - cork * cork * 0.2, 0]} rotation={[0, 0, cork * 5]}>
      <InkCylinder radius={0.026} height={0.04} color="#b07a44" ink={0.004} />
    </group>
    {foam > 0 && (
      <group>
        {Array.from({ length: 9 }, (_, i) => {
          const a = i * 2.4;
          const s = 0.028 + 0.02 * Math.sin(i * 1.7 + frame * 0.3) * 0.5;
          const down = foam * (0.04 + (i % 4) * 0.05);
          return (
            <mesh key={i} position={[Math.cos(a) * 0.03 * foam + Math.cos(a) * down * 0.35, 0.3 + foam * 0.04 - down * 0.6, Math.sin(a) * 0.03 * foam]} scale={foam}>
              <sphereGeometry args={[s, 12, 10]} />
              <meshToonMaterial color="#fff8e0" gradientMap={toonRamp} />
            </mesh>
          );
        })}
      </group>
    )}
  </group>
);

// ---------- Oxford 1940 ----------

// A flat rectangular culture vessel (the Oxford team's bedpan-shaped vessels) with a golden broth and a mould crust.
export const CultureVessel: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <InkBox size={[0.3, 0.07, 0.22]} position={[0, 0.035, 0]} color="#e8e2d0" ink={0.005} />
    <InkBox size={[0.26, 0.012, 0.18]} position={[0, 0.072, 0]} color="#5aa08e" ink={0} />
    <InkCylinder radius={0.025} height={0.05} position={[0.12, 0.09, -0.06]} rotation={[0, 0, -0.5]} color="#e8e2d0" ink={0.003} />
  </group>
);

// A wire cage with mice that scatter when `scatter` rises (0..1).
export const MouseCage: React.FC<{ position: Vec3; frame: number; scatter?: number }> = ({ position, frame, scatter = 0 }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.02, 0.3]} position={[0, 0.01, 0]} color="#9a8a6a" ink={0.004} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.5, 0.01, 0.01]} position={[0, 0.22, s * 0.15]} color="#8a8a8a" ink={0} />
    ))}
    {Array.from({ length: 11 }, (_, i) => (
      <InkBox key={i} size={[0.006, 0.22, 0.006]} position={[-0.25 + i * 0.05, 0.11, 0.15]} color="#9a9a9a" ink={0} />
    ))}
    <InkBox size={[0.5, 0.01, 0.3]} position={[0, 0.225, 0]} color="#8a8a8a" ink={0.002} />
    {[0, 1, 2].map((i) => {
      const run = scatter * (0.12 + i * 0.05) * (i % 2 ? -1 : 1);
      const hop = scatter > 0 && scatter < 1 ? Math.abs(Math.sin(frame * 0.8 + i)) * 0.03 : 0;
      return (
        <group key={i} position={[-0.12 + i * 0.12 + run, 0.04 + hop, -0.03 + (i % 2) * 0.06]} rotation={[0, run > 0 ? 0 : Math.PI, 0]}>
          <mesh scale={[1.5, 1, 1]}>
            <sphereGeometry args={[0.028, 14, 10]} />
            <meshToonMaterial color="#f4f0ec" gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0.04, 0.01, 0]}>
            <sphereGeometry args={[0.016, 10, 8]} />
            <meshToonMaterial color="#f4f0ec" gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0.034, 0.03, 0]}>
            <sphereGeometry args={[0.01, 8, 6]} />
            <meshToonMaterial color="#f0a0a8" gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0.057, 0.012, 0.008]}>
            <sphereGeometry args={[0.004, 6, 4]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        </group>
      );
    })}
  </group>
);

// A tiny glass vial with a few golden drops (drawn ~2x).
export const Vial: React.FC<{ position: Vec3; fill?: number; glow?: number }> = ({ position, fill = 0.25, glow = 0 }) => (
  <group position={position}>
    {glow > 0 && <Halo position={[0, 0.05, -0.02]} size={0.35} color="#ffd86a" strength={0.5 * glow} />}
    <InkCylinder radius={0.018} height={0.09} position={[0, 0.045, 0]} color="#e0f0ee" ink={0.003} />
    <InkCylinder radius={0.016} height={0.09 * fill} position={[0, 0.045 * fill + 0.002, 0.001]} color="#f0b828" ink={0} />
    <InkCylinder radius={0.02} height={0.02} position={[0, 0.1, 0]} color="#a83a2a" ink={0.003} />
  </group>
);

// ---------- D-Day ----------

// A wooden crate stencilled PENICILLIN.
export const PenCrate: React.FC<{ position: Vec3; rotation?: Vec3; label?: boolean }> = ({ position, rotation = [0, 0, 0], label = true }) => (
  <group position={position} rotation={rotation}>
    <InkBox size={[0.6, 0.36, 0.42]} position={[0, 0.18, 0]} color="#8a7a4a" ink={0.01} />
    {[-0.27, 0.27].map((x) => (
      <InkBox key={x} size={[0.04, 0.37, 0.43]} position={[x, 0.18, 0]} color="#6e6038" ink={0.004} />
    ))}
    {label && <Label text="PENICILLIN" position={[0, 0.19, 0.215]} width={0.46} bg="#8a7a4a" fg="#f4ead0" border={false} />}
  </group>
);

// A field-hospital cot.
export const Cot: React.FC<{ position: Vec3; color?: string; rotationY?: number }> = ({ position, color = "#5a6a3a", rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.62, 0.05, 1.5]} position={[0, 0.34, 0]} color={color} ink={0.008} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.03, 0.34, 0.03]} position={[sx * 0.28, 0.17, sz * 0.7]} color="#3a3a2a" ink={0.003} />))}
    <InkBox size={[0.5, 0.06, 0.25]} position={[0, 0.39, -0.58]} color="#f0ecdc" ink={0.004} />
  </group>
);

// A canvas tent wall and roof behind a field hospital (the camera looks out of its open front).
export const Tent: React.FC<{ position: Vec3; width?: number; depth?: number; color?: string }> = ({ position, width = 5, depth = 3.2, color = "#7a7a4a" }) => {
  const tex = useMemo(
    () =>
      canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = "rgba(60,50,20,0.10)";
        for (let i = 0; i < 40; i++) ctx.fillRect((i * 53) % 256, (i * 97) % 256, 30 + (i % 5) * 10, 6);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        for (let x = 0; x < 256; x += 64) ctx.fillRect(x, 0, 3, 256);
      }),
    [],
  );
  return (
    <group position={position}>
      <InkBox size={[width, 2.2, 0.06]} position={[0, 1.1, -depth / 2]} color={color} ink={0.01} map={tex} />
      <InkBox size={[0.06, 2.2, depth]} position={[-width / 2, 1.1, 0]} color={color} ink={0.01} map={tex} />
      <InkBox size={[width, 0.06, depth * 0.6]} position={[0, 2.55, -depth / 2 + depth * 0.25]} rotation={[0.45, 0, 0]} color="#6a6a3e" ink={0.01} map={tex} />
      <InkCylinder radius={0.04} height={2.6} position={[width / 2 - 0.1, 1.3, depth / 2 - 0.2]} color="#5a4a2a" ink={0.006} />
    </group>
  );
};

// ---------- family room ----------

// A family tree painted on the wall with framed portraits on its branches. `portraits` are faces (skin, hair).
export const FamilyTree: React.FC<{ position: Vec3; scale?: number; glow?: number }> = ({ position, scale = 1, glow = 0 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(768, 768, (ctx) => {
        ctx.clearRect(0, 0, 768, 768);
        ctx.strokeStyle = "#6a3a24";
        ctx.lineCap = "round";
        const branch = (x: number, y: number, a: number, len: number, w: number, d: number) => {
          if (d === 0) return;
          const x2 = x + Math.cos(a) * len;
          const y2 = y + Math.sin(a) * len;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          branch(x2, y2, a - 0.5, len * 0.72, w * 0.65, d - 1);
          branch(x2, y2, a + 0.5, len * 0.72, w * 0.65, d - 1);
        };
        branch(384, 760, -Math.PI / 2, 230, 44, 4);
        ctx.fillStyle = "rgba(90,150,80,0.55)";
        for (let i = 0; i < 70; i++) {
          const a = i * 2.39;
          const r = 120 + (i % 7) * 30;
          ctx.beginPath();
          ctx.ellipse(384 + Math.cos(a) * r * 1.1, 300 + Math.sin(a) * r * 0.75, 22, 13, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [],
  );
  const FRAMES: [number, number, string, string][] = [
    [0, 0.55, "#f0c8a8", "#c8c8c8"],
    [-0.42, 0.3, "#e8b898", "#3a2a1e"],
    [0.42, 0.3, "#f4d0b0", "#8a5a2a"],
    [-0.62, -0.05, "#f0c8a8", "#d8b060"],
    [0.62, -0.05, "#d8a888", "#1a1410"],
    [-0.22, 0.02, "#f4d0b0", "#6a3a1e"],
    [0.22, 0.02, "#e8c0a0", "#b8b8b8"],
  ];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.1, 0]}>
        <planeGeometry args={[1.7, 1.7]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      {glow > 0 && <Halo position={[0, 0.2, -0.01]} size={2.2} color="#ffd8a0" strength={0.35 * glow} />}
      {FRAMES.map(([x, y, skin, hair], i) => (
        <group key={i} position={[x, y, 0.02]}>
          <InkBox size={[0.2, 0.24, 0.02]} color="#b8862a" ink={0.004} />
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[0.15, 0.19]} />
            <meshBasicMaterial color="#f0e4c8" />
          </mesh>
          <mesh position={[0, -0.01, 0.014]}>
            <circleGeometry args={[0.045, 20]} />
            <meshBasicMaterial color={skin} />
          </mesh>
          <mesh position={[0, 0.025, 0.015]}>
            <circleGeometry args={[0.048, 20, 0, Math.PI]} />
            <meshBasicMaterial color={hair} />
          </mesh>
          <mesh position={[0, -0.08, 0.014]}>
            <circleGeometry args={[0.06, 20, 0, Math.PI]} />
            <meshBasicMaterial color={["#4a5a6e", "#7a3a3a", "#5a6a3a", "#2a4a7a"][i % 4]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ---------- outdoors ----------

// Open air: a grass (or sand) ground, a sky dome riding with the camera, rolling hills with parallax.
export const Outdoors: React.FC<{
  camera: CameraShot;
  ground: string;
  sky?: [number, string][];
  sun?: [number, number, number];
  hills?: string[];
  haze?: string;
  keyLight?: [number, string];
  ambient?: [number, string];
  children?: React.ReactNode;
}> = ({ camera, ground, sky, sun = [-6, 9, 5], hills = ["#9fb4c8", "#7f9a6a", "#93a860"], haze = "#e6eef4", keyLight = [2.2, "#fff4dc"], ambient = [1.3, "#dfe8ff"], children }) => {
  const camX = camera.position[0];
  const tex = useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 900; i++) {
          ctx.fillStyle = i % 3 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.18)";
          ctx.fillRect((i * 137) % 512, (i * 271) % 512, 4 + (i % 4) * 2, 2 + (i % 3));
        }
      }),
    [],
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return (
    <>
      <CameraRig {...camera} />
      <fog attach="fog" args={[haze, 14, 60]} />
      <ambientLight intensity={ambient[0]} color={ambient[1]} />
      <directionalLight
        position={sun}
        intensity={keyLight[0]}
        color={keyLight[1]}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <group position={camera.position}>
        <SkyDome sun={sun} stops={sky} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshToonMaterial color={ground} gradientMap={toonRamp} map={tex} />
      </mesh>
      <Hills z={-60} shift={camX * 0.7} width={260} low={3} high={8} color={hills[0]} seed={2} flat />
      <Haze z={-50} color={haze} />
      <Hills z={-34} shift={camX * 0.35} width={180} low={1} high={3.5} color={hills[1]} seed={9} />
      <Hills z={-22} shift={-camX * 0.15} width={120} low={0.3} high={1.4} color={hills[2]} seed={13} />
      {children}
    </>
  );
};

// A round garden tree (trunk and two inked leaf balls).
export const RoundTree: React.FC<{ position: Vec3; scale?: number; color?: string }> = ({ position, scale = 1, color = "#4a8a3a" }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.1} height={1.2} position={[0, 0.6, 0]} color="#6a4a2a" ink={0.01} />
    {[
      [0, 1.55, 0, 0.62],
      [0.35, 1.3, 0.1, 0.42],
      [-0.3, 1.35, -0.1, 0.45],
    ].map(([x, y, z, r], i) => (
      <group key={i}>
        <mesh position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 20, 16]} />
          <meshToonMaterial color={color} gradientMap={toonRamp} />
        </mesh>
        <mesh position={[x, y, z]} scale={1.04}>
          <sphereGeometry args={[r, 20, 16]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      </group>
    ))}
  </group>
);

// A deckchair (striped canvas sling) facing +z.
export const Deckchair: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    {[-1, 1].map((s) => (
      <group key={s}>
        <InkBox size={[0.03, 0.03, 0.75]} position={[s * 0.24, 0.3, 0]} rotation={[0.55, 0, 0]} color="#8a6a3a" ink={0.003} />
        <InkBox size={[0.03, 0.03, 0.6]} position={[s * 0.24, 0.2, 0.05]} rotation={[-0.6, 0, 0]} color="#8a6a3a" ink={0.003} />
      </group>
    ))}
    <InkBox size={[0.46, 0.02, 0.62]} position={[0, 0.3, -0.03]} rotation={[0.75, 0, 0]} color="#d84a3a" ink={0.004} />
    {[-0.12, 0.12].map((x) => (
      <InkBox key={x} size={[0.08, 0.021, 0.62]} position={[x, 0.302, -0.03]} rotation={[0.75, 0, 0]} color="#f4ecd8" ink={0} />
    ))}
  </group>
);

// A white cottage with a dark roof (Suffolk country house, simplified).
export const Cottage: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[3.2, 1.8, 1.8]} position={[0, 0.9, 0]} color="#f2ece0" ink={0.014} />
    <mesh position={[0, 2.25, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.6, 0.9, 1.0]} castShadow>
      <coneGeometry args={[1.6, 1.0, 4]} />
      <meshToonMaterial color="#5a3a3a" gradientMap={toonRamp} />
    </mesh>
    {[-1, 0, 1].map((i) => (
      <InkBox key={i} size={[0.42, 0.5, 0.04]} position={[i * 0.95, 1.1, 0.91]} color="#3a5a7a" ink={0.006} />
    ))}
    <InkBox size={[0.5, 0.9, 0.04]} position={[0.5, 0.45, 0.91]} color="#2e5a3a" ink={0.006} />
    <InkBox size={[0.3, 0.7, 0.3]} position={[1.1, 2.6, 0]} color="#8a4a34" ink={0.008} />
  </group>
);
