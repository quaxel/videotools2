import React, { useMemo } from "react";
import * as THREE from "three";
import { BlenderModel, CameraRig, CameraShot, canvasTexture, Hills, InkBox, InkCylinder, SkyDome, toonRamp, Vec3 } from "../../engine";
import { useOwnedTex } from "../dog-nose/sets";

// Props and sets for "Why a Volcano Invented the Bicycle" (Tambora 1815, Baden 1816-17). References:
// guide/references/mannheim-1817.md. The running machine is a sand3d model (../videos/volcano-bicycle/sand3d/).

const INK = "#161212";
export const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- the running machine ----------

export const WHEEL_R = 0.15;
export const SADDLE_Y = 0.343; // saddle top = the puppet's hip
export const SADDLE_BACK = 0.07; // the saddle sits this far behind the machine's centre
export const HANDLE = { ahead: 0.16, y: 0.51 }; // the cross handle: ahead of the centre, height
export const ARMREST = { ahead: 0.115, y: 0.47 };

// The machine at `position` (its centre on the ground), heading along `heading` (radians, 0 = toward +x),
// wheels rolled by the distance it has covered.
export const Draisine: React.FC<{ position: Vec3; heading?: number; dist?: number; steer?: number; scale?: number; tilt?: number }> = ({ position, heading = 0, dist = 0, steer = 0, scale = 1, tilt = 0 }) => {
  const deg = ((dist / (WHEEL_R * scale)) * 180) / Math.PI;
  return (
    <group position={position} rotation={[0, heading, 0]} userData={{ ghost: true }}>
      <group rotation={[0, Math.PI / 2, 0]}>
        <group rotation={[tilt, 0, 0]}>
          <BlenderModel src="videos/volcano-bicycle/models/draisine.glb" scale={scale} heads={false} joints={{ spin_F: deg, spin_R: deg, steer }} />
        </group>
      </group>
    </group>
  );
};
// Where a point given along the machine (ahead metres, up metres, side metres toward the camera) lies in the world.
export const onMachine = (position: Vec3, heading: number, ahead: number, up: number, side = 0): Vec3 => [
  position[0] + Math.cos(heading) * ahead - Math.sin(heading) * side,
  position[1] + up,
  position[2] - Math.sin(heading) * ahead - Math.cos(heading) * side,
];

// ---------- painted textures ----------

const PLASTER = ["#ecd9b0", "#e6c58e", "#efd2c4", "#d8dcb8", "#f0e2c4", "#e2b88a"];
const SHUTTER = ["#3e6a4a", "#5a3a26", "#3a5a6a", "#4e6a3a"];

const facadeCanvas = (seed: number, w: number, h: number, mode: TownMode) => {
  const W = 512;
  const H = Math.round((512 * h) / w);
  return canvasTexture(W, H, (ctx) => {
    const base = PLASTER[Math.floor(rnd(seed, 3) * PLASTER.length)];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    // a soft gradient, damp stains near the foot, chips
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,255,240,0.18)");
    g.addColorStop(0.8, "rgba(120,90,60,0.0)");
    g.addColorStop(1, mode === "overcast" ? "rgba(60,60,70,0.4)" : "rgba(110,80,50,0.32)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${90 + rnd(i, seed) * 40},${70 + rnd(i + 1, seed) * 30},${50},${0.06 + rnd(i + 2, seed) * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(rnd(i + 3, seed) * W, rnd(i + 4, seed) * H, 6 + rnd(i + 5, seed) * 26, 4 + rnd(i + 6, seed) * 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // red sandstone corner stones and base course
    const stone = "#b4553e";
    for (let y = 0; y < H; y += 36) {
      const ww = (y / 36) % 2 ? 26 : 40;
      ctx.fillStyle = stone;
      ctx.fillRect(0, y, ww, 32);
      ctx.fillRect(W - ww, y, ww, 32);
    }
    ctx.fillStyle = stone;
    ctx.fillRect(0, H - 42, W, 42);
    // windows: columns and rows; shutters; the ground floor has a door
    const cols = w > 2.8 ? 3 : 2;
    const rows = h > 3.6 ? 3 : 2;
    const shutter = SHUTTER[Math.floor(rnd(seed + 1, 3) * SHUTTER.length)];
    const ww = 64;
    const wh = 112;
    const floorH = (H - 60) / rows;
    const doorCol = Math.floor(rnd(seed + 2, 3) * cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = (W / cols) * (c + 0.5);
        const cy = 30 + floorH * (r + 0.5);
        if (r === rows - 1 && c === doorCol) {
          // arched door with a sandstone frame
          ctx.fillStyle = stone;
          ctx.fillRect(cx - 50, cy - 70, 100, floorH * 0.5 + 70 + 30);
          ctx.beginPath();
          ctx.arc(cx, cy - 70, 50, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = "#4a2e1c";
          ctx.fillRect(cx - 38, cy - 64, 76, floorH * 0.5 + 64 + 30);
          ctx.beginPath();
          ctx.arc(cx, cy - 64, 38, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = "#3a2214";
          ctx.fillRect(cx - 2, cy - 60, 4, floorH * 0.5 + 90);
          continue;
        }
        ctx.fillStyle = shutter;
        ctx.fillRect(cx - ww / 2 - 34, cy - wh / 2, 30, wh);
        ctx.fillRect(cx + ww / 2 + 4, cy - wh / 2, 30, wh);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        for (let s = 0; s < 6; s++) {
          ctx.fillRect(cx - ww / 2 - 32, cy - wh / 2 + 8 + s * 18, 26, 3);
          ctx.fillRect(cx + ww / 2 + 6, cy - wh / 2 + 8 + s * 18, 26, 3);
        }
        ctx.fillStyle = stone;
        ctx.fillRect(cx - ww / 2 - 6, cy - wh / 2 - 8, ww + 12, wh + 20);
        ctx.fillStyle = mode === "dusk" && rnd(seed + r * 7 + c, 5) > 0.5 ? "#f4c070" : mode === "overcast" ? "#44505e" : "#3a4c66";
        ctx.fillRect(cx - ww / 2, cy - wh / 2, ww, wh);
        ctx.fillStyle = "#f4efe2";
        ctx.fillRect(cx - 2, cy - wh / 2, 4, wh);
        ctx.fillRect(cx - ww / 2, cy - 4, ww, 4);
        ctx.fillRect(cx - ww / 2, cy - wh / 2 + wh * 0.25, ww, 3);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(cx - ww / 2 + 6, cy - wh / 2 + 6, 10, wh * 0.35);
      }
    }
    // cornice
    ctx.fillStyle = "rgba(90,60,40,0.45)";
    ctx.fillRect(0, 0, W, 14);
  });
};

const roofCanvas = (seed: number) =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = "#9a4a32";
    ctx.fillRect(0, 0, 512, 256);
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 26; c++) {
        const v = rnd(r * 31 + c, seed);
        ctx.fillStyle = v > 0.7 ? "#7a3826" : v > 0.35 ? "#a8543a" : "#8e4430";
        ctx.fillRect(c * 20 + (r % 2) * 10, r * 16, 18, 14);
      }
      ctx.fillStyle = "rgba(40,20,14,0.35)";
      ctx.fillRect(0, r * 16 + 13, 512, 3);
    }
  });

const cobbleCanvas = (mode: TownMode) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = mode === "overcast" ? "#6a6a6e" : mode === "dusk" ? "#8a6a6a" : "#9a8c78";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let r = 0; r < 34; r++) {
      for (let c = 0; c < 30; c++) {
        const v = rnd(r * 37 + c, 9);
        const x = c * 34 + (r % 2) * 17 + (rnd(r + c, 4) - 0.5) * 6;
        const y = r * 30 + (rnd(c + r * 3, 4) - 0.5) * 5;
        const tone = mode === "overcast" ? [100, 100, 108] : mode === "dusk" ? [150, 112, 108] : [170, 154, 128];
        ctx.fillStyle = `rgb(${tone[0] + (v - 0.5) * 40},${tone[1] + (v - 0.5) * 36},${tone[2] + (v - 0.5) * 30})`;
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 13, 14, 11.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.ellipse(x + 11, y + 9, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

// ---------- Mannheim street ----------

export type TownMode = "morning" | "overcast" | "dusk";
const TOWN = {
  morning: { fog: "#e8e4d4", sky: [[-0.1, "#f4ecd8"], [0.0, "#f2e6cc"], [0.08, "#cfe0ec"], [0.2, "#9cc4e4"], [0.5, "#6aa0d8"], [1.0, "#4a84c8"]] as [number, string][], sun: [-6, 5, 4] as Vec3, key: "#ffe6c0", ki: 2.3, amb: 1.0, glow: "#fff2d0", hills: "#a8b4b8" },
  overcast: { fog: "#b8bcc0", sky: [[-0.1, "#c4c6c8"], [0.0, "#bcc0c4"], [0.15, "#a8aeb4"], [0.5, "#8e969e"], [1.0, "#7a828c"]] as [number, string][], sun: [-3, 8, 3] as Vec3, key: "#dfe4ea", ki: 0.9, amb: 1.25, glow: "#c8ccd0", hills: "#8a9098" },
  dusk: { fog: "#e8a898", sky: [[-0.1, "#ffd0a0"], [0.0, "#ffc090"], [0.08, "#f09a8a"], [0.2, "#c87a9a"], [0.45, "#7a6aa8"], [1.0, "#3e4a8a"]] as [number, string][], sun: [8, 1.6, -6] as Vec3, key: "#ffb08a", ki: 1.9, amb: 0.85, glow: "#ffe0a0", hills: "#8a6a8a" },
};

type HouseSpec = { x: number; w: number; h: number; seed: number };
const HOUSES: HouseSpec[] = (() => {
  const out: HouseSpec[] = [];
  let x = -16;
  let i = 0;
  while (x < 18) {
    const w = 2.3 + rnd(i, 11) * 1.0;
    out.push({ x: x + w / 2, w, h: 3.1 + rnd(i + 1, 11) * 1.2, seed: i * 3 + 1 });
    x += w + 0.02;
    i++;
  }
  return out;
})();
export const HOUSE_Z = -2.6; // the house fronts

const House: React.FC<{ spec: HouseSpec; mode: TownMode; z: number }> = ({ spec, mode, z }) => {
  const fac = useOwnedTex(() => facadeCanvas(spec.seed, spec.w, spec.h, mode), [spec.seed, mode]);
  const roof = useOwnedTex(() => roofCanvas(spec.seed), [spec.seed]);
  const roofH = 1.1 + rnd(spec.seed, 13) * 0.5;
  const D = 3;
  const roofGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-D / 2 - 0.15, 0);
    s.lineTo(D / 2 + 0.15, 0);
    s.lineTo(0, roofH);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: spec.w + 0.08, bevelEnabled: false });
    g.translate(0, 0, -(spec.w + 0.08) / 2);
    g.rotateY(Math.PI / 2);
    return g;
  }, [spec.w, roofH]);
  return (
    <group position={[spec.x, 0, z - D / 2]}>
      {/* plain plastered body; the painted front sits 1 cm proud of it (the side walls stay plain) */}
      <InkBox size={[spec.w, spec.h, D]} position={[0, spec.h / 2, 0]} color={PLASTER[Math.floor(rnd(spec.seed, 3) * PLASTER.length)]} ink={0.02} />
      <mesh position={[0, spec.h / 2, D / 2 + 0.01]} receiveShadow>
        <planeGeometry args={[spec.w, spec.h]} />
        <meshToonMaterial color="#ffffff" map={fac} gradientMap={toonRamp} />
      </mesh>
      <mesh geometry={roofGeo} position={[0, spec.h, 0]} castShadow>
        <meshToonMaterial color="#ffffff" map={roof} gradientMap={toonRamp} />
      </mesh>
      <mesh geometry={roofGeo} position={[0, spec.h - 0.02, 0]} scale={[1.01, 1.03, 1.02]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {rnd(spec.seed, 17) > 0.45 && (
        // a dormer on the street side of the roof
        <group position={[0, spec.h + roofH * 0.35, D / 4 + 0.05]}>
          <InkBox size={[0.6, 0.55, 0.4]} color={PLASTER[Math.floor(rnd(spec.seed, 3) * PLASTER.length)]} ink={0.012} />
          <InkBox size={[0.32, 0.36, 0.02]} position={[0, -0.02, 0.21]} color="#3a4c66" ink={0.006} />
          <InkBox size={[0.72, 0.06, 0.5]} position={[0, 0.3, 0]} rotation={[0.25, 0, 0]} color="#8e4430" ink={0.01} />
        </group>
      )}
      {/* a chimney */}
      <InkBox size={[0.3, 0.8, 0.3]} position={[spec.w * 0.25 * (rnd(spec.seed, 19) > 0.5 ? 1 : -1), spec.h + roofH * 0.6, -0.4]} color="#b4553e" ink={0.012} />
    </group>
  );
};

// The church tower over the roofs: a sandstone tower with a baroque cap and lantern.
const ChurchTower: React.FC<{ position: Vec3; mode: TownMode }> = ({ position, mode }) => (
  <group position={position}>
    <InkBox size={[2.4, 10, 2.4]} position={[0, 5, 0]} color={mode === "overcast" ? "#a08a80" : "#d8a080"} ink={0.04} />
    <InkBox size={[2.6, 0.3, 2.6]} position={[0, 10.1, 0]} color="#b4553e" ink={0.03} />
    <InkBox size={[0.6, 1.2, 0.05]} position={[0, 8.2, 1.22]} color="#2a2a38" ink={0.02} />
    <mesh position={[0, 11.0, 0]} scale={[1.3, 1.0, 1.3]}>
      <sphereGeometry args={[1.0, 24, 16]} />
      <meshToonMaterial color="#5a7a6a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 11.0, 0]} scale={[1.35, 1.05, 1.35]}>
      <sphereGeometry args={[1.0, 24, 16]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <InkCylinder radius={0.35} height={1.0} position={[0, 12.4, 0]} color="#5a7a6a" ink={0.03} />
    <mesh position={[0, 13.4, 0]}>
      <coneGeometry args={[0.45, 1.2, 16]} />
      <meshToonMaterial color="#5a7a6a" gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.03} height={0.8} position={[0, 14.3, 0]} color="#c8a040" ink={0.01} />
  </group>
);

// The far ash plume (picture device for the hook): inked grey-violet puffs boiling up into a spreading head.
export const AshPlume: React.FC<{ position: Vec3; frame: number; size?: number; lit?: number; color?: string; count?: number }> = ({ position, frame, size = 1, lit = 0, color = "#8a7a90", count = 26 }) => {
  const puffs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1);
        const spread = t < 0.6 ? 0.25 + t * 0.6 : 0.6 + (t - 0.6) * 4.5;
        const ang = rnd(i, 7) * Math.PI * 2;
        return { y: t * 1.0, x: Math.cos(ang) * spread * 0.22 * (0.5 + rnd(i + 1, 7)), z: Math.sin(ang) * 0.1, r: 0.07 + t * 0.12 + rnd(i + 2, 7) * 0.05, ph: rnd(i + 3, 7) * 6 };
      }),
    [count],
  );
  const base = new THREE.Color(color);
  return (
    <group position={position} scale={[size * 0.7, size, size]} userData={{ ghost: true, audit: false }}>
      {puffs.map((p, i) => {
        const boil = 1 + 0.08 * Math.sin(frame * 0.05 + p.ph);
        const rise = (frame * 0.0008 + p.ph * 0.01) % 0.02;
        const c = base.clone().lerp(new THREE.Color("#ff7a3a"), lit * Math.max(0, 1 - p.y * 2.2));
        return (
          <group key={i} position={[p.x + 0.02 * Math.sin(frame * 0.02 + p.ph), p.y + rise, p.z]}>
            <mesh scale={p.r * boil}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshToonMaterial color={c} gradientMap={toonRamp} fog={false} />
            </mesh>
            <mesh scale={p.r * boil * 1.07}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshBasicMaterial color={INK} side={THREE.BackSide} fog={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// A volcano's cone far on the horizon: a flat silhouette with a notched summit (the plume rises from it).
export const FarVolcano: React.FC<{ position: Vec3; color: string; w?: number; h?: number }> = ({ position, color, w = 26, h = 4 }) => {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -0.5);
    s.quadraticCurveTo(-w * 0.2, h * 0.35, -w * 0.07, h);
    s.lineTo(-w * 0.03, h * 0.93);
    s.lineTo(w * 0.03, h * 0.95);
    s.lineTo(w * 0.07, h);
    s.quadraticCurveTo(w * 0.2, h * 0.35, w / 2, -0.5);
    s.closePath();
    return new THREE.ShapeGeometry(s, 24);
  }, [w, h]);
  return (
    <mesh geometry={geo} position={position}>
      <meshBasicMaterial color={color} fog={false} toneMapped={false} />
    </mesh>
  );
};

export const townLight = (mode: TownMode) =>
  mode === "morning"
    ? { tint: "#fff4e0", tintAmount: 0.06, shadow: 0.18, distant: [{ direction: [-0.7, 0.6, 0.45] as Vec3, color: "#ffe8c8", strength: 1.1 }] }
    : mode === "dusk"
      ? { tint: "#ffc0a0", tintAmount: 0.14, shadow: 0.3, distant: [{ direction: [0.8, 0.25, -0.5] as Vec3, color: "#ffa070", strength: 1.6 }] }
      : { tint: "#dfe4ea", tintAmount: 0.1, shadow: 0.22, distant: [{ direction: [-0.3, 0.8, 0.4] as Vec3, color: "#e8ecf0", strength: 0.6 }] };

// A Baden town street, 1816-17: cobbles along x, plastered gabled houses with sandstone frames and shutters on the
// far side (fronts at z = HOUSE_Z), a church tower over the roofs, the Rhine plain's low hills beyond.
// `plume` > 0 raises the far ash plume over the roofs (the hook).
export const TownSet: React.FC<{ camera: CameraShot; frame: number; mode: TownMode; plume?: number; houses?: [number, number]; children?: React.ReactNode }> = ({ camera, frame, mode, plume = 0, houses = [-99, 99], children }) => {
  const L = TOWN[mode];
  const camX = camera.position[0];
  const cob = useOwnedTex(() => {
    const t = cobbleCanvas(mode);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 3);
    return t;
  }, [mode]);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[L.fog]} />
      <fog attach="fog" args={[L.fog, 30, 120]} />
      <ambientLight intensity={L.amb} color={mode === "dusk" ? "#ffd8d0" : "#ffffff"} />
      <hemisphereLight args={[mode === "dusk" ? "#c8a0d0" : "#d8e8ff", "#7a6a50", 0.45]} />
      <directionalLight
        position={L.sun}
        intensity={L.ki}
        color={L.key}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />
      <group position={camera.position}>
        <SkyDome sun={L.sun} stops={L.sky} glow={L.glow} />
      </group>
      {plume > 0 && <FarVolcano position={[camX * 0.97 + 7.0, 0, -55]} color={mode === "dusk" ? "#5a3a5a" : "#6a6884"} h={3.8} w={20} />}
      {plume > 0 && <AshPlume position={[camX * 0.97 + 7.0, 3.4, -54]} frame={frame} size={7.5 * plume} lit={0.75} color={mode === "dusk" ? "#7a5a80" : "#8a7e96"} />}
      <Hills z={-60} shift={camX * 0.7} width={300} low={2} high={5} color={L.hills} seed={3} />
      <ChurchTower position={[camX * 0.25 + (houses[1] < 5 ? houses[1] - 5.5 : 3.5), 0, -14]} mode={mode} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -40]}>
        <planeGeometry args={[300, 76]} />
        <meshToonMaterial color={mode === "dusk" ? "#7a6a4a" : mode === "overcast" ? "#6a7060" : "#9aa05a"} gradientMap={toonRamp} />
      </mesh>
      {HOUSES.filter((h) => h.x + h.w / 2 <= houses[1] && h.x - h.w / 2 >= houses[0]).map((h) => (
        <House key={h.seed} spec={h} mode={mode} z={HOUSE_Z} />
      ))}
      {/* the pavement strip along the fronts, the gutter, and the cobbled street */}
      <InkBox size={[40, 0.08, 0.9]} position={[0, 0.04, HOUSE_Z + 0.45]} color={mode === "overcast" ? "#8a8a90" : "#b8a890"} ink={0.01} />
      <InkBox size={[40, 0.01, 0.16]} position={[0, 0.004, HOUSE_Z + 1.0]} color="#5a5650" ink={0} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4]} receiveShadow>
        <planeGeometry args={[60, 14]} />
        <meshToonMaterial color="#ffffff" map={cob} gradientMap={toonRamp} />
      </mesh>
      {children}
    </>
  );
};

// A hitching post with an iron ring (empty: no horse).
export const HitchPost: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.05} height={0.9} position={[0, 0.45, 0]} color="#5a3a24" ink={0.01} />
    <mesh position={[0, 0.75, 0.06]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.05, 0.01, 8, 18]} />
      <meshToonMaterial color="#3a3a40" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// A wall-bracket oil lantern.
export const WallLantern: React.FC<{ position: Vec3; lit?: number }> = ({ position, lit = 0 }) => (
  <group position={position}>
    <InkBox size={[0.04, 0.04, 0.35]} position={[0, 0.1, 0.17]} color="#2a2a2e" ink={0.006} />
    <InkBox size={[0.16, 0.22, 0.16]} position={[0, -0.05, 0.34]} color={lit > 0 ? "#ffd890" : "#c8d0d4"} ink={0.008} emissive={lit > 0 ? "#a06020" : undefined} />
    <mesh position={[0, 0.1, 0.34]}>
      <coneGeometry args={[0.13, 0.12, 4]} />
      <meshToonMaterial color="#2a2a2e" gradientMap={toonRamp} />
    </mesh>
  </group>
);
