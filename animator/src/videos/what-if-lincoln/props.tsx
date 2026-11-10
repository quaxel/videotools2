import React from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BlenderModel, canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

// Props for what-if-lincoln (Ford's Theatre, 14 April 1865). Models: ../videos/what-if-lincoln/sand3d/.

export const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const MODELS = {
  chair: "videos/what-if-lincoln/models/chair.glb",
  rocker: "videos/what-if-lincoln/models/rocker.glb",
  statebox: "videos/what-if-lincoln/models/statebox.glb",
};

export const GuardChair: React.FC<{ position: Vec3; rotationY?: number; tip?: number }> = ({ position, rotationY = 0, tip = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <group rotation={[tip, 0, 0]}>
      <BlenderModel src={MODELS.chair} ink={0.012} />
    </group>
  </group>
);

// The rocker rocks about the point where its rockers touch the floor.
export const Rocker: React.FC<{ position: Vec3; rotationY?: number; rock?: number }> = ({ position, rotationY = 0, rock = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <group rotation={[rock, 0, 0]}>
      <BlenderModel src={MODELS.rocker} ink={0.012} />
    </group>
  </group>
);

// ---------- light and air ----------

// A soft additive glow card (gas haze, a light shaft's bloom); faces +z unless rotated.
const softTex = () =>
  canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });

export const HazeCard: React.FC<{ position: Vec3; size: [number, number]; color: string; opacity?: number; rotation?: Vec3 }> = ({ position, size, color, opacity = 0.18, rotation = [0, 0, 0] }) => {
  const tex = useOwned(softTex);
  return (
    <mesh position={position} rotation={rotation} userData={{ ghost: true, noInk: true }}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

// A cone of light (a gas jet's or a window's shaft) from `from` toward `to`, additive, fading along its length.
const shaftTex = () =>
  canvasTexture(64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    const s = ctx.createLinearGradient(0, 0, 64, 0);
    s.addColorStop(0, "rgba(0,0,0,1)");
    s.addColorStop(0.5, "rgba(0,0,0,0)");
    s.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 64, 256);
  });
export const LightShaft: React.FC<{ from: Vec3; to: Vec3; width: number; color: string; opacity?: number }> = ({ from, to, width, color, opacity = 0.2 }) => {
  const tex = useOwned(shaftTex);
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), b.clone().sub(a).normalize());
  return (
    <group position={mid.toArray()} quaternion={q} userData={{ ghost: true, noInk: true }}>
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} rotation={[0, r, 0]}>
          <planeGeometry args={[width, len]} />
          <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

// Dust motes drifting in a box of air, catching a light: closed-form, any frame renders on its own.
export const Motes: React.FC<{ center: Vec3; size: Vec3; frame: number; count?: number; color?: string; seed?: number; speck?: number }> = ({ center, size, frame, count = 80, color = "#ffe2a8", seed = 1, speck = 0.006 }) => {
  const mesh = useOwned(
    () => new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), count),
    [count, color],
  );
  const o = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const k = seed * 53 + i;
    const fall = ((rand(k + 0.3) + frame * 0.0012 * (0.4 + rand(k + 0.4))) % 1) * size[1];
    o.position.set(
      center[0] + (rand(k) - 0.5) * size[0] + 0.05 * Math.sin(frame * 0.03 + k),
      center[1] + size[1] / 2 - fall,
      center[2] + (rand(k + 0.2) - 0.5) * size[2] + 0.04 * Math.cos(frame * 0.025 + k * 1.7),
    );
    o.scale.setScalar(speck * (0.6 + rand(k + 0.7)));
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} userData={{ ghost: true, noInk: true }} />;
};

// A wall gas bracket: a brass arm, a frosted globe and a flame that flickers, with a glow.
export const GasBracket: React.FC<{ position: Vec3; rotationY?: number; frame: number; lit?: number; color?: string; glow?: number }> = ({ position, rotationY = 0, frame, lit = 1, color = "#ffc070", glow = 1 }) => {
  const flick = 0.9 + 0.06 * Math.sin(frame * 0.7) + 0.04 * Math.sin(frame * 1.9 + 1.3);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkBox size={[0.12, 0.16, 0.03]} position={[0, 0, 0.015]} color="#a8803a" ink={0.006} />
      <InkCylinder radius={0.015} height={0.22} position={[0, 0.02, 0.12]} rotation={[Math.PI / 2, 0, 0]} color="#b8903a" ink={0.006} />
      <InkCylinder radius={0.02} height={0.08} position={[0, 0.06, 0.23]} color="#b8903a" ink={0.006} />
      <mesh position={[0, 0.16, 0.23]} userData={{ noInk: true }}>
        <sphereGeometry args={[0.075, 18, 14]} />
        <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(0.6 + 1.6 * lit * flick)} toneMapped={false} transparent opacity={0.92} />
      </mesh>
      {lit > 0.02 && <Halo position={[0, 0.16, 0.3]} size={0.9 * glow * flick} color={color} strength={0.55 * lit} />}
      {lit > 0.02 && <Halo position={[0, 0.16, 0.32]} size={2.6 * glow} color={color} strength={0.12 * lit} />}
    </group>
  );
};

// Flash of a single shot, seen from across the house: a hot white-yellow burst for a few frames.
export const Flash: React.FC<{ at: Vec3; t: number; size?: number }> = ({ at, t, size = 0.5 }) => {
  if (t < 0 || t > 7) return null;
  const k = 1 - t / 7;
  return (
    <group position={at} userData={{ ghost: true, noInk: true }}>
      <mesh scale={size * (0.6 + (t / 7) * 0.8)}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color={new THREE.Color(5 * k, 4 * k, 2 * k)} transparent opacity={k} toneMapped={false} depthWrite={false} />
      </mesh>
      <Halo position={[0, 0, 0.2]} size={size * 7} color="#fff2c8" strength={0.8 * k} />
    </group>
  );
};

// ---------- small props ----------

export const TopHat: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; color?: string }> = ({ position, rotation = [0, 0, 0], scale = 1, color = "#181418" }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkCylinder radius={0.17} height={0.02} position={[0, 0.01, 0]} color={color} ink={0.008} />
    <InkCylinder radius={0.105} height={0.3} position={[0, 0.17, 0]} color={color} ink={0.008} />
    <InkCylinder radius={0.107} height={0.04} position={[0, 0.05, 0]} color="#3a2a3a" ink={0} />
  </group>
);

export const Plank: React.FC<{ from: Vec3; to: Vec3 }> = ({ from, to }) => {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), b.clone().sub(a).normalize());
  return (
    <group position={mid.toArray()} quaternion={q} userData={{ ghost: true }}>
      <InkBox size={[a.distanceTo(b), 0.07, 0.045]} color="#d8b47a" ink={0.008} />
    </group>
  );
};

export const CallingCard: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkBox size={[0.13, 0.08, 0.006]} color="#fbf6ea" ink={0.005} />
    <InkBox size={[0.08, 0.008, 0.002]} position={[0, 0.012, 0.004]} color="#2a2a2a" ink={0} />
    <InkBox size={[0.06, 0.006, 0.002]} position={[0, -0.01, 0.004]} color="#5a5a5a" ink={0} />
  </group>
);

export const Bottle: React.FC<{ position: Vec3; color?: string; h?: number }> = ({ position, color = "#2f6a3a", h = 0.26 }) => (
  <group position={position}>
    <InkCylinder radius={0.045} height={h * 0.62} position={[0, h * 0.31, 0]} color={color} ink={0.006} />
    <InkCylinder radius={0.018} height={h * 0.38} position={[0, h * 0.8, 0]} color={color} ink={0.006} />
    <InkBox size={[0.06, 0.06, 0.004]} position={[0, h * 0.32, 0.046]} color="#efe2b8" ink={0} />
  </group>
);

export const Glass: React.FC<{ position: Vec3; fill?: string }> = ({ position, fill = "#c88a2a" }) => (
  <group position={position}>
    <mesh position={[0, 0.05, 0]} userData={{ noInk: true }}>
      <cylinderGeometry args={[0.035, 0.028, 0.1, 18]} />
      <meshToonMaterial color="#e8f0f0" gradientMap={toonRamp} transparent opacity={0.55} />
    </mesh>
    <mesh position={[0, 0.035, 0]}>
      <cylinderGeometry args={[0.03, 0.026, 0.06, 18]} />
      <meshToonMaterial color={fill} gradientMap={toonRamp} />
    </mesh>
  </group>
);

export const Candle: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => {
  const flick = 1 + 0.08 * Math.sin(frame * 0.9) + 0.05 * Math.sin(frame * 2.3);
  return (
    <group position={position} userData={{ ghost: true }}>
      <InkCylinder radius={0.03} height={0.03} position={[0, 0.015, 0]} color="#c8a040" ink={0.005} />
      <InkCylinder radius={0.018} height={0.16} position={[0, 0.11, 0]} color="#f4ecd8" ink={0.005} />
      <mesh position={[0, 0.215, 0]} scale={[1, 1.8 * flick, 1]}>
        <sphereGeometry args={[0.018, 10, 8]} />
        <meshBasicMaterial color={new THREE.Color(3.2, 2.2, 0.8)} toneMapped={false} />
      </mesh>
      <Halo position={[0, 0.22, 0.04]} size={0.7 * flick} color="#ffc070" strength={0.6} />
    </group>
  );
};

export const Lantern: React.FC<{ position: Vec3; frame: number; seed?: number; glow?: number }> = ({ position, frame, seed = 1, glow = 1 }) => {
  const flick = 1 + 0.07 * Math.sin(frame * 0.8 + seed) + 0.04 * Math.sin(frame * 2.1 + seed * 3);
  return (
    <group position={position} userData={{ ghost: true }}>
      <InkBox size={[0.11, 0.015, 0.11]} position={[0, 0.17, 0]} color="#2a2420" ink={0.005} />
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.09, 0.14, 0.09]} />
        <meshBasicMaterial color={new THREE.Color(2.6 * flick, 1.8 * flick, 0.7)} toneMapped={false} />
      </mesh>
      <InkBox size={[0.11, 0.015, 0.11]} position={[0, 0.01, 0]} color="#2a2420" ink={0.005} />
      <Halo position={[0, 0.09, 0.08]} size={1.1 * glow * flick} color="#ffb860" strength={0.5} />
    </group>
  );
};

export const Umbrella: React.FC<{ position: Vec3; color?: string; tilt?: number }> = ({ position, color = "#1a1a22", tilt = 0 }) => (
  <group position={position} rotation={[0, 0, tilt]} userData={{ ghost: true }}>
    <mesh position={[0, 0.0, 0]} castShadow>
      <coneGeometry args={[0.42, 0.18, 10, 1, true]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <InkCylinder radius={0.008} height={0.7} position={[0, -0.3, 0]} color="#3a2a1a" ink={0.004} />
  </group>
);

// A rubber stamp: wooden knob and handle on a block; `press` 0..1 lowers it by `lift`.
export const HandStamp: React.FC<{ position: Vec3; press?: number; lift?: number }> = ({ position, press = 1, lift = 0.18 }) => (
  <group position={[position[0], position[1] + (1 - press) * lift, position[2]]} userData={{ ghost: true }}>
    <InkBox size={[0.13, 0.04, 0.08]} position={[0, 0.02, 0]} color="#3a2a1a" ink={0.006} />
    <InkBox size={[0.12, 0.01, 0.07]} position={[0, 0.003, 0]} color="#8a1a1a" ink={0} />
    <InkCylinder radius={0.015} height={0.08} position={[0, 0.08, 0]} color="#7a4a24" ink={0.005} />
    <mesh position={[0, 0.14, 0]}>
      <sphereGeometry args={[0.035, 14, 10]} />
      <meshToonMaterial color="#7a4a24" gradientMap={toonRamp} />
    </mesh>
  </group>
);

const paperTex = (seed: number) =>
  canvasTexture(256, 340, (ctx) => {
    ctx.fillStyle = "#f2ead6";
    ctx.fillRect(0, 0, 256, 340);
    ctx.fillStyle = "rgba(60,50,40,0.5)";
    for (let l = 0; l < 20; l++) ctx.fillRect(22, 40 + l * 13, 200 - rand(seed + l) * 70, 4);
    ctx.strokeStyle = "rgba(90,70,50,0.25)";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 244, 328);
  });

// A sheet of paper lying flat (written lines), with optional rotation about y.
export const Sheet: React.FC<{ position: Vec3; rotY?: number; size?: [number, number]; seed?: number }> = ({ position, rotY = 0, size = [0.21, 0.28], seed = 1 }) => {
  const tex = useOwned(() => paperTex(seed), [seed]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotY]} receiveShadow>
      <planeGeometry args={size} />
      <meshToonMaterial map={tex} gradientMap={toonRamp} />
    </mesh>
  );
};

// A stack of papers `n` sheets high (each 3 mm, slightly askew).
export const PaperStack: React.FC<{ position: Vec3; n: number; seed?: number }> = ({ position, n, seed = 1 }) => (
  <group position={position}>
    {n > 0 && <InkBox size={[0.22, Math.max(0.003, n * 0.004), 0.29]} position={[0, (n * 0.004) / 2, 0]} color="#efe6d0" ink={0.004} />}
    {Array.from({ length: Math.min(n, 6) }, (_, i) => (
      <Sheet key={i} position={[(rand(seed + i) - 0.5) * 0.02, n * 0.004 - i * 0.004 + 0.001, (rand(seed + i + 9) - 0.5) * 0.02]} rotY={(rand(seed + i * 3) - 0.5) * 0.12} seed={seed + i} />
    ))}
  </group>
);

// A two-pan balance on a brass column: `tilt` > 0 lowers the left pan. Labels hang on the pans' fronts.
export const Balance: React.FC<{ position: Vec3; tilt: number; left: string; right: string; appear?: number }> = ({ position, tilt, left, right, appear }) => {
  const arm = 0.26;
  const pan = (side: number) => {
    const y = 0.86 + side * Math.sin(tilt) * arm;
    const x = side * Math.cos(tilt) * arm;
    return (
      <group position={[x, y, 0]}>
        {[-1, 1].map((s) => (
          <InkCylinder key={s} radius={0.004} height={0.3} position={[s * 0.08, -0.15, 0]} rotation={[0, 0, s * 0.25]} color="#c8a040" ink={0.003} />
        ))}
        <InkCylinder radius={0.11} height={0.025} position={[0, -0.3, 0]} color="#d8b048" ink={0.006} />
        <Label text={side < 0 ? left : right} position={[0, -0.4, 0.14]} width={0.3} appear={appear} />
      </group>
    );
  };
  return (
    <group position={position}>
      <InkBox size={[0.36, 0.05, 0.22]} position={[0, 0.025, 0]} color="#3a2416" ink={0.008} />
      <InkCylinder radius={0.03} height={0.84} position={[0, 0.47, 0]} color="#c8a040" ink={0.006} />
      <group position={[0, 0.88, 0]} rotation={[0, 0, tilt]}>
        <InkBox size={[arm * 2 + 0.04, 0.035, 0.035]} color="#d8b048" ink={0.006} />
      </group>
      <InkCylinder radius={0.05} height={0.05} position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]} color="#e8c050" ink={0.006} />
      {pan(-1)}
      {pan(1)}
    </group>
  );
};

// ---------- the audience ----------

// Theatregoers as set dressing: seated bodies, heads with hair or bonnets, instanced. `laugh` 0..1 makes them rock
// back and bob; `turn` turns heads toward +x (the box). Seats on rows at `rows` (z) along x between x0 and x1.
export type Seat = { p: Vec3; coat: string; skin: string; hair: string; bonnet: boolean; s: number };
export const makeSeats = (rows: { z: number; y: number; x0: number; x1: number; step?: number }[], seed = 1): Seat[] => {
  const coats = ["#2a2a34", "#3a2a24", "#1e2430", "#6a2a3a", "#2a4a5a", "#7a5a2a", "#4a2a5a", "#2a3a2a", "#8a3a2a", "#3a3a3a"];
  const skins = ["#f2d0b0", "#e8c09a", "#d8a47a", "#f6dcc4", "#c89068"];
  const hairs = ["#2a1e18", "#4a3020", "#6a4a2a", "#1a1414", "#8a6a4a", "#9a9a9a"];
  const out: Seat[] = [];
  let k = seed * 101;
  for (const r of rows) {
    const step = r.step ?? 0.42;
    for (let x = r.x0; x <= r.x1 + 1e-6; x += step) {
      k++;
      const woman = rand(k) > 0.55;
      out.push({
        p: [x + (rand(k + 0.5) - 0.5) * 0.08, r.y, r.z + (rand(k + 0.6) - 0.5) * 0.06],
        coat: woman ? ["#8a2a4a", "#3a5a8a", "#6a4a8a", "#2a6a5a", "#a8603a", "#5a2a2a"][Math.floor(rand(k + 1) * 6)] : coats[Math.floor(rand(k + 1) * coats.length)],
        skin: skins[Math.floor(rand(k + 2) * skins.length)],
        hair: hairs[Math.floor(rand(k + 3) * hairs.length)],
        bonnet: woman,
        s: 0.92 + rand(k + 4) * 0.16,
      });
    }
  }
  return out;
};

// Heads that would be sliced by the frame edge sink into deep shadow: each figure is darkened by how close its head
// comes to the nearest frame edge (in head radii), smoothly, so a figure at the edge reads as part of a dark mass
// rather than a cut head, and nothing pops as the camera moves. `yOff` = the set's vertical shift (a dropped set).
export const Audience: React.FC<{ seats: Seat[]; frame: number; laugh?: number; facing?: number; yOff?: number }> = ({ seats, frame, laugh = 0, facing = 0, yOff = 0 }) => {
  const n = seats.length;
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  camera.updateMatrixWorld();
  const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
  const v = new THREE.Vector3();
  const edgeShade = (x: number, y: number, z: number) => {
    v.set(x, y + yOff, z);
    const dist = v.distanceTo(camera.position);
    v.project(camera);
    if (v.z > 1 || v.z < -1) return 1;
    const ry = 0.16 / (dist * tanHalf);
    const rx = ry / camera.aspect;
    const d = Math.min((1 - Math.abs(v.x)) / rx, (1 + v.y) / ry, (1 - v.y) / ry);
    const t = Math.min(1, Math.max(0, (d - 2.6) / 3.0));
    return 0.03 + 0.97 * t * t * (3 - 2 * t);
  };
  const parts = useOwned(() => {
    const mk = (geo: THREE.BufferGeometry) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), n);
      m.castShadow = false;
      m.receiveShadow = true;
      return m;
    };
    const ink = (geo: THREE.BufferGeometry) => new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: "#161212", side: THREE.BackSide }), n);
    const body = new THREE.CapsuleGeometry(0.15, 0.2, 4, 10);
    const head = new THREE.SphereGeometry(0.11, 14, 10);
    const hair = new THREE.SphereGeometry(0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const all = { body: mk(body), head: mk(head), hair: mk(hair), bodyInk: ink(body), headInk: ink(head) };
    return { ...all, dispose: () => Object.values(all).forEach((m) => m.dispose()) };
  }, [n]);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  seats.forEach((s, i) => {
    const ph = i * 1.37;
    const shake = laugh * (0.5 + 0.5 * Math.sin(frame * 0.55 + ph)) * (0.6 + 0.4 * rand(i));
    const lean = -0.22 * laugh * (0.7 + 0.3 * Math.sin(frame * 0.21 + ph)) + 0.03 * Math.sin(frame * 0.04 + ph);
    const by = s.p[1] + 0.42 * s.s + shake * 0.035;
    o.position.set(s.p[0], by, s.p[2]);
    o.rotation.set(lean, 0, 0);
    o.scale.setScalar(s.s);
    o.updateMatrix();
    parts.body.setMatrixAt(i, o.matrix);
    const hy0 = by + 0.32 * s.s + shake * 0.03;
    const k = edgeShade(s.p[0], hy0, s.p[2] + Math.sin(lean) * 0.3);
    parts.body.setColorAt(i, c.set(s.coat).multiplyScalar(k));
    o.scale.setScalar(s.s * 1.05);
    o.updateMatrix();
    parts.bodyInk.setMatrixAt(i, o.matrix);
    const hy = by + 0.32 * s.s + shake * 0.03;
    const hz = s.p[2] + Math.sin(lean) * 0.3;
    o.position.set(s.p[0], hy, hz);
    o.rotation.set(lean * 1.4 - shake * 0.2, facing * (0.6 + 0.3 * rand(i + 3)), 0);
    o.scale.setScalar(s.s);
    o.updateMatrix();
    parts.head.setMatrixAt(i, o.matrix);
    parts.head.setColorAt(i, c.set(s.skin).multiplyScalar(k));
    // hair from behind (the camera mostly sees the backs of heads): a cap tilted back; bonnets bigger
    o.position.set(s.p[0], hy + 0.01, hz - 0.012);
    o.rotation.set(lean * 1.4 - 0.5 - shake * 0.2, 0, 0);
    o.scale.setScalar(s.s * (s.bonnet ? 1.22 : 1.02));
    o.updateMatrix();
    parts.hair.setMatrixAt(i, o.matrix);
    parts.hair.setColorAt(i, c.set(s.bonnet ? s.coat : s.hair).multiplyScalar(k));
    o.position.set(s.p[0], hy, hz);
    o.scale.setScalar(s.s * 1.08);
    o.updateMatrix();
    parts.headInk.setMatrixAt(i, o.matrix);
  });
  for (const m of [parts.body, parts.head, parts.hair, parts.bodyInk, parts.headInk]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
  return (
    <group userData={{ ghost: true }}>
      <primitive object={parts.bodyInk} />
      <primitive object={parts.headInk} />
      <primitive object={parts.body} />
      <primitive object={parts.head} />
      <primitive object={parts.hair} />
    </group>
  );
};

// A gilt picture-frame style panel with a painted canvas (used for the theatre's painted drop and the street view).
export const Painted: React.FC<{ position: Vec3; size: [number, number]; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; rotation?: Vec3; deps?: React.DependencyList; emissive?: number }> = ({ position, size, draw, rotation = [0, 0, 0], deps = [], emissive = 0 }) => {
  const W = 1024;
  const H = Math.round((1024 * size[1]) / size[0]);
  const tex = useOwned(() => canvasTexture(W, H, (ctx) => draw(ctx, W, H)), deps);
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={size} />
      {emissive > 0 ? <meshBasicMaterial map={tex} color={new THREE.Color(emissive, emissive, emissive)} toneMapped={false} /> : <meshToonMaterial map={tex} gradientMap={toonRamp} />}
    </mesh>
  );
};


// A standing figure seen from behind (a crowd member as set dressing): coat, head, hair, an optional low hat.
export const BackFigure: React.FC<{ position: Vec3; coat: string; skin?: string; hair?: string; hat?: string; scale?: number; turn?: number }> = ({ position, coat, skin = "#e8c09c", hair = "#141010", hat, scale = 1, turn = 0 }) => (
  <group position={position} scale={scale} rotation={[0, turn, 0]} userData={{ ghost: true }}>
    <InkCylinder radius={0.03} height={0.42} position={[-0.07, 0.21, 0]} color="#141418" ink={0.006} />
    <InkCylinder radius={0.03} height={0.42} position={[0.07, 0.21, 0]} color="#141418" ink={0.006} />
    <mesh position={[0, 0.66, 0]} castShadow>
      <capsuleGeometry args={[0.16, 0.32, 4, 12]} />
      <meshToonMaterial color={coat} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.66, 0]}>
      <capsuleGeometry args={[0.172, 0.32, 4, 12]} />
      <meshBasicMaterial color="#161212" side={THREE.BackSide} />
    </mesh>
    <mesh position={[0, 1.08, 0]}>
      <sphereGeometry args={[0.13, 16, 12]} />
      <meshToonMaterial color={skin} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 1.1, -0.015]} rotation={[-0.4, 0, 0]}>
      <sphereGeometry args={[0.135, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
      <meshToonMaterial color={hair} gradientMap={toonRamp} />
    </mesh>
    {hat && (
      <group position={[0, 1.18, 0]}>
        <InkCylinder radius={0.2} height={0.02} color={hat} ink={0.006} />
        <InkCylinder radius={0.12} height={0.12} position={[0, 0.07, 0]} color={hat} ink={0.006} />
      </group>
    )}
  </group>
);
