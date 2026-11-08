import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, CameraRig, CameraShot, handWorld, Haze, Hills, InkBox, InkCylinder, PUPPET_HEIGHT, PuppetLight, SkyDome, toonRamp, Vec3 } from "../../engine";
import { Barn, Bucket, ClothLine, Fields, Hen, Longhouse, Scatter, Sheep, Tree, WattleFence } from "./farm";

const K_UNITS = PUPPET_HEIGHT / 1060; // metres per puppet unit (as in PuppetBillboard)

// Test set for the first design pass of viking-vs-roman: a Danish farmyard on a cool morning, with the gate the story
// keeps coming back to. A stand-in to check hand contact, feet on the ground and puppets taking the set's light; the
// real farm set (longhouse, pen, woodpile, shore path) is built after the reference research (guide/references/).

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Morning sun: low, from the front left, pale and a little cool.
export const MORNING_SUN: Vec3 = [-5, 4.2, 6];
export const morningLight = (): PuppetLight => ({
  tint: "#f4f6f8",
  shadow: 0.16,
  distant: [{ direction: [-0.6, 0.5, 0.62], color: "#fff4e2", strength: 1.25 }],
});

// ---------- textures ----------

const grassCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#7a9050";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 120; i++) {
      const v = rand(i + 50);
      ctx.fillStyle = v > 0.66 ? "rgba(86,112,52,0.35)" : v > 0.33 ? "rgba(176,160,96,0.28)" : "rgba(132,160,80,0.35)";
      ctx.beginPath();
      ctx.ellipse(rand(i) * 1024, rand(i + 400) * 1024, 26 + rand(i + 9) * 70, 16 + rand(i + 11) * 44, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(60,84,36,0.25)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 1400; i++) {
      const x = rand(i * 3 + 7) * 1024;
      const y = rand(i * 3 + 8) * 1024;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i) - 0.5) * 8, y - 8 - rand(i + 1) * 10);
      ctx.stroke();
    }
  });

const mudCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
    g.addColorStop(0, "rgba(112,86,58,0.95)");
    g.addColorStop(0.7, "rgba(112,86,58,0.7)");
    g.addColorStop(1, "rgba(112,86,58,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(80,60,40,0.35)" : "rgba(150,124,90,0.3)";
      ctx.beginPath();
      ctx.ellipse(80 + rand(i + 3) * 352, 80 + rand(i + 5) * 352, 4 + rand(i + 7) * 14, 3 + rand(i + 8) * 8, rand(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// Wood with grain, aged (grey-brown, weathered) or fresh (pale, the new repair).
const woodCanvas = (fresh: boolean) =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = fresh ? "#e2d0b2" : "#b5a08a";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = fresh ? `rgba(150,104,60,${0.18 + rand(i) * 0.2})` : `rgba(70,56,44,${0.2 + rand(i) * 0.25})`;
      ctx.lineWidth = 1 + rand(i + 3) * 2.5;
      ctx.beginPath();
      const x = rand(i + 9) * 256;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (rand(i + 1) - 0.5) * 30, 90, x + (rand(i + 2) - 0.5) * 30, 170, x + (rand(i + 4) - 0.5) * 20, 256);
      ctx.stroke();
    }
    for (let i = 0; i < (fresh ? 2 : 5); i++) {
      ctx.fillStyle = fresh ? "rgba(140,96,56,0.4)" : "rgba(52,42,34,0.45)";
      ctx.beginPath();
      ctx.ellipse(rand(i + 30) * 256, rand(i + 40) * 256, 5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

const useTex = (make: () => THREE.Texture) => {
  const t = useMemo(make, []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => () => t.dispose(), [t]);
  return t;
};

// ---------- props ----------

const OLD_WOOD = "#8a7056";
const NEW_WOOD = "#cdb592";

const Beam: React.FC<{ a: Vec3; b: Vec3; r?: number; map: THREE.Texture; color?: string }> = ({ a, b, r = 0.035, map, color = OLD_WOOD }) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const len = va.distanceTo(vb);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <group position={mid.toArray() as Vec3} rotation={[e.x, e.y, e.z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[r * 2, len, r * 1.6]} />
        <meshToonMaterial color={color} gradientMap={toonRamp} map={map} />
      </mesh>
      <mesh>
        <boxGeometry args={[r * 2 + 0.024, len + 0.024, r * 1.6 + 0.024]} />
        <meshBasicMaterial color="#2a241d" side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

const Post: React.FC<{ at: [number, number]; h?: number; lean?: [number, number]; map: THREE.Texture; color?: string }> = ({ at, h = 1.0, lean = [0, 0], map, color = OLD_WOOD }) => (
  <group position={[at[0], 0, at[1]]} rotation={[lean[1], 0, lean[0]]}>
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.055, 0.065, h, 9]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} map={map} />
    </mesh>
    <mesh position={[0, h / 2, 0]}>
      <cylinderGeometry args={[0.067, 0.077, h + 0.02, 9]} />
      <meshBasicMaterial color="#2a241d" side={THREE.BackSide} />
    </mesh>
    {/* worn, rounded top */}
    <mesh position={[0, h, 0]} castShadow>
      <sphereGeometry args={[0.056, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} map={map} />
    </mesh>
  </group>
);

// The gate. Hinge post at GATE.hinge, latch post at GATE.latch; the panel is 1 m wide.
export const GATE = { hinge: [-0.56, 0] as [number, number], latch: [0.56, 0] as [number, number], top: 0.72, width: 1.0 };
// Where a hand rests on the latch end of the top rail (state "loose", before any push).
export const GATE_GRIP: Vec3 = [GATE.hinge[0] + 0.04 + GATE.width - 0.06, GATE.top - 0.07, 0];

export type GateState = { sag?: number; wobble?: number; fall?: number; fixed?: boolean };

// The panel: two stiles, three rails and a diagonal brace, in the panel's own frame (hinge stile at x = 0, foot at y = 0).
const GatePanel: React.FC<{ old: THREE.Texture; fresh: THREE.Texture; fixed: boolean }> = ({ old, fresh, fixed }) => {
  const w = GATE.width;
  return (
    <group>
      <Beam a={[0, 0.02, 0]} b={[0, GATE.top + 0.04, 0]} map={old} r={0.032} />
      <Beam a={[w, 0.02, 0]} b={[w, GATE.top + 0.04, 0]} map={old} r={0.032} />
      {[0.12, 0.42, GATE.top].map((y, i) => (
        <Beam key={y} a={[-0.02, y, 0.01]} b={[w + 0.02, y + (i === 1 ? 0.012 : 0), 0.01]} map={old} r={0.028} />
      ))}
      {/* brace: old and cracked before the repair, a new pale one after */}
      {fixed ? <Beam a={[0.05, 0.14, 0.03]} b={[w - 0.05, GATE.top - 0.03, 0.03]} map={fresh} color={NEW_WOOD} r={0.03} /> : <Beam a={[0.05, 0.14, 0.03]} b={[w - 0.08, GATE.top - 0.05, 0.03]} map={old} r={0.026} />}
      {/* rope loop of the latch */}
      <mesh position={[w + 0.03, GATE.top - 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.05, 0.012, 6, 16]} />
        <meshToonMaterial color="#b89a64" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

export const Gate: React.FC<{ state: GateState }> = ({ state }) => {
  const old = useTex(() => woodCanvas(false));
  const fresh = useTex(() => woodCanvas(true));
  const fall = Math.max(0, Math.min(1, state.fall ?? 0));
  const sag = state.fixed ? 0 : (state.sag ?? 1) * 0.085;
  const wob = state.wobble ?? 0;
  // Falling: the top hinge lets go, the panel swings down about its bottom hinge corner and tips over toward the camera.
  const tipZ = sag + fall * 1.05;
  const tipX = fall * 0.9;
  const hingeLean = state.fixed ? 0 : 0.07 + fall * 0.05;
  return (
    <group>
      <Post at={GATE.hinge} h={1.05} lean={[hingeLean, 0]} map={old} />
      <Post at={GATE.latch} h={1.02} lean={[-0.015, 0]} map={old} />
      {state.fixed && (
        // The repair: a new support strut braced against the hinge post, pegged at the ground.
        <group>
          <Beam a={[GATE.hinge[0] - 0.5, 0.02, -0.04]} b={[GATE.hinge[0] - 0.05, 0.78, -0.04]} map={fresh} color={NEW_WOOD} r={0.034} />
          <InkCylinder radius={0.03} height={0.12} position={[GATE.hinge[0] - 0.52, 0.04, -0.04]} color={NEW_WOOD} />
        </group>
      )}
      {/* rope hinges on the post */}
      {!fall && [0.18, GATE.top - 0.05].map((y) => (
        <mesh key={y} position={[GATE.hinge[0] + 0.04, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.07, 0.014, 6, 16]} />
          <meshToonMaterial color="#a88c5c" gradientMap={toonRamp} />
        </mesh>
      ))}
      <group position={[GATE.hinge[0] + 0.04, 0.02, 0]}>
        <group rotation={[tipX, wob * 0.06, -tipZ]}>
          <GatePanel old={old} fresh={fresh} fixed={!!state.fixed} />
        </group>
      </group>
    </group>
  );
};

const Woodpile: React.FC<{ position: Vec3; map: THREE.Texture }> = ({ position, map }) => (
  <group position={position}>
    {Array.from({ length: 14 }, (_, i) => {
      const row = i < 6 ? 0 : i < 11 ? 1 : 2;
      const k = i < 6 ? i : i < 11 ? i - 6 : i - 11;
      const n = row === 0 ? 6 : row === 1 ? 5 : 3;
      return (
        <InkCylinder
          key={i}
          radius={0.075 + rand(i) * 0.02}
          height={0.62 + rand(i + 4) * 0.12}
          position={[(k - (n - 1) / 2) * 0.17, 0.08 + row * 0.145, (rand(i + 9) - 0.5) * 0.06]}
          rotation={[Math.PI / 2, 0, 0]}
          color={rand(i + 2) > 0.5 ? "#9a7a58" : "#866a4c"}
        />
      );
    })}
    <InkCylinder radius={0.2} height={0.4} position={[0.95, 0.2, 0.25]} color="#8a6c4e" />
    <InkBox size={[0.04, 0.42, 0.04]} position={[0.95, 0.55, 0.25]} rotation={[0, 0, 0.5]} color="#6a5038" map={map} />
  </group>
);

const Tufts: React.FC<{ clear: (x: number, z: number) => boolean }> = ({ clear }) => {
  const mesh = useMemo(() => {
    const blade = new THREE.ConeGeometry(0.009, 0.075, 3);
    blade.translate(0, 0.0375, 0);
    const pos: number[] = [];
    [-0.4, 0, 0.4].forEach((a, k) => {
      const b = blade.clone();
      b.rotateZ(a);
      b.translate((k - 1) * 0.014, 0, (k % 2) * 0.01);
      pos.push(...(b.toNonIndexed().attributes.position.array as Float32Array));
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const count = 5200;
    const m = new THREE.InstancedMesh(g, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), count);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let n = 0;
    for (let i = 0; n < count && i < count * 4; i++) {
      const x = -4 + rand(i * 3 + 1) * 8;
      const z = -3.5 + rand(i * 3 + 2) * 7;
      if (!clear(x, z) && rand(i + 77) > 0.1) continue;
      o.position.set(x, 0, z);
      o.rotation.set(0, rand(i * 5) * 6.28, 0);
      const k = 0.7 + rand(i * 7);
      o.scale.set(k, k * (0.8 + rand(i * 11) * 0.7), k);
      o.updateMatrix();
      m.setMatrixAt(n, o.matrix);
      const v = rand(i * 13);
      m.setColorAt(n, c.set(v > 0.75 ? "#a49c68" : v > 0.35 ? "#66804a" : "#7a9152"));
      n++;
    }
    m.count = n;
    m.receiveShadow = true;
    return m;
  }, [clear]);
  React.useEffect(() => () => { mesh.dispose(); }, [mesh]);
  return <primitive object={mesh} />;
};

const MORNING_SKY: [number, string][] = [
  [-0.1, "#eef0ea"],
  [0.0, "#e4ebec"],
  [0.08, "#c6dbe8"],
  [0.18, "#98c0e2"],
  [0.4, "#6a9ad2"],
  [1.0, "#4a7cc0"],
];

// The dirt path from the gate back toward the house is kept free of grass tufts.
// It runs from the gate (0, 0) to the longhouse door at about (-0.6, -14).
const pathX = (z: number) => z * 0.043;
const onPath = (x: number, z: number) => Math.abs(x - pathX(z)) < 0.45 && z < 1.4 && z > -14.5;
const clearOf = (x: number, z: number) => !onPath(x, z) && Math.hypot(x - 1.2, z - 0.5) > 0.3;

export const FarmTestSet: React.FC<{ camera: CameraShot; frame: number; gate: GateState; house?: boolean; children?: React.ReactNode }> = ({ camera, frame, gate, house = true, children }) => {
  const camX = camera.position[0];
  const grass = useTex(() => {
    const t = grassCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(16, 12);
    t.anisotropy = 8;
    return t;
  });
  const mud = useTex(mudCanvas);
  const rail = useTex(() => woodCanvas(false));
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#c6dbe8"]} />
      <fog attach="fog" args={["#dfe7e8", 14, 70]} />
      <ambientLight intensity={1.05} color="#eef2f6" />
      <hemisphereLight args={["#d4e2f0", "#5f6e3a", 0.65]} />
      <directionalLight
        position={MORNING_SUN}
        intensity={2.4}
        color="#fff2de"
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
        <SkyDome sun={MORNING_SUN} stops={MORNING_SKY} glow="#fff4e0" />
      </group>
      <Hills z={-70} shift={camX * 0.7} width={300} low={3} high={8} color="#a3b4bc" seed={4} flat />
      <Hills z={-40} shift={camX * 0.35} width={200} low={0.8} high={3.2} color="#8aa070" seed={8} />
      <Hills z={-24} shift={-camX * 0.15} width={140} low={0.3} high={1.4} color="#91a65e" seed={12} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={grass} />
      </mesh>
      {/* trodden mud through the gateway and up the path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.05, 0.003, 0.15]}>
        <planeGeometry args={[2.0, 1.6]} />
        <meshBasicMaterial map={mud} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* the trodden path from the gate up to the longhouse door */}
      {[-0.9, -2.0, -3.2, -4.5, -5.9, -7.4, -9.0, -10.6, -12.2, -13.6].map((z, i) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, -0.04]} position={[pathX(z), 0.002 + i * 0.0003, z]}>
          <planeGeometry args={[1.0 + i * 0.04, 1.6]} />
          <meshBasicMaterial map={mud} transparent depthWrite={false} toneMapped={false} opacity={0.85 - i * 0.04} />
        </mesh>
      ))}
      <Tufts clear={clearOf} />

      <Fields camX={camX} />
      <Haze z={-26} color="#e8eeee" />
      <Haze z={-20} color="#eef2f0" />
      {/* the yard: longhouse on the left behind, woodpile and work area to its right, the pen on the right */}
      {house && <Longhouse position={[-4.6, 0, -15]} rotationY={0.38} frame={frame} />}
      <Barn position={[6.5, 0, -12.5]} rotationY={-0.4} />
      <Woodpile position={[1.9, 0, -6.4]} map={rail} />
      <ClothLine a={[2.6, 0, -3.6]} b={[3.9, 0, -3.9]} frame={frame} />
      <Bucket position={[-0.95, 0, 0.55]} frame={frame} />
      {/* sheep pen */}
      <WattleFence a={[2.6, -1.6]} b={[5.4, -1.9]} h={0.7} seed={41} />
      <WattleFence a={[5.4, -1.9]} b={[5.6, -4.6]} h={0.7} seed={43} />
      <WattleFence a={[2.6, -1.6]} b={[2.8, -4.4]} h={0.7} seed={45} />
      <Sheep position={[3.6, 0, -2.7]} rotationY={-0.6} frame={frame} seed={1} />
      <Sheep position={[4.5, 0, -3.5]} rotationY={0.9} frame={frame} seed={2} />
      <Sheep position={[3.4, 0, -3.9]} rotationY={2.4} frame={frame} seed={3} />
      <Hen position={[-1.6, 0, -1.2]} rotationY={0.8} frame={frame} seed={1} />
      <Hen position={[-2.3, 0, -1.9]} rotationY={-1.2} frame={frame} seed={2} />
      <Hen position={[0.9, 0, -2.4]} rotationY={2.2} frame={frame} seed={3} />
      <Tree position={[-11, 0, -10]} kind="oak" scale={1.3} seed={1} />
      <Tree position={[1.2, 0, -12.5]} kind="birch" seed={2} />
      <Tree position={[2.3, 0, -13.5]} kind="birch" scale={0.85} seed={3} />
      <Tree position={[9.5, 0, -14]} kind="oak" seed={4} />
      <Scatter clear={clearOf} />
      {/* the yard's wattle fence, with the gate in it */}
      <WattleFence a={[-6.5, 0.15]} b={[GATE.hinge[0] - 0.07, 0]} seed={3} />
      <WattleFence a={[GATE.latch[0] + 0.07, 0]} b={[6.5, -0.2]} seed={9} />
      <Gate state={gate} />
      {children}
    </>
  );
};

// The reach (puppet units) that puts a hand of a card standing at `at` on the world point `p`, for this camera:
// the inverse of handWorld, in the card's plane.
export const reachTo = (at: [number, number], p: Vec3, camera: CameraShot): [number, number] => {
  const dx = camera.position[0] - at[0];
  const dz = camera.position[2] - at[1];
  const l = Math.hypot(dx, dz) || 1;
  const right: [number, number] = [dz / l, -dx / l];
  const x = ((p[0] - at[0]) * right[0] + (p[2] - at[1]) * right[1]) / K_UNITS;
  // Solve the height through handWorld (it leans the card back from high cameras).
  const probe = handWorld(at, [x, -1000], camera);
  return [x, -1000 * (p[1] / probe[1])];
};

// Seen from inside the longhouse: a dark plank wall with the doorway, the door leaf swinging out (open 0..1) onto the
// bright yard. The camera sits between this wall and DOORWAY.z - 2 (dark: the house's inside). Use with house={false}.
export const DOORWAY = { x: 0.2, z: -7.5 };
export const Doorway: React.FC<{ open: number }> = ({ open }) => {
  const planks = useTex(() => {
    const t = woodCanvas(false);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2);
    return t;
  });
  const { x, z } = DOORWAY;
  const w = 0.78;
  const h = 1.08;
  return (
    <group position={[x, 0, z]}>
      {/* wall left and right of the opening and above it, dark on the inside */}
      <InkBox size={[3, 2.4, 0.12]} position={[-w / 2 - 1.5, 1.2, 0]} color="#3a2c22" map={planks} />
      <InkBox size={[3, 2.4, 0.12]} position={[w / 2 + 1.5, 1.2, 0]} color="#3a2c22" map={planks} />
      <InkBox size={[w + 0.1, 2.4 - h, 0.12]} position={[0, h + (2.4 - h) / 2, 0]} color="#3a2c22" map={planks} />
      <InkBox size={[0.1, h, 0.16]} position={[-w / 2 - 0.05, h / 2, 0]} color="#5e4734" />
      <InkBox size={[0.1, h, 0.16]} position={[w / 2 + 0.05, h / 2, 0]} color="#5e4734" />
      {/* the inside: a dark room round the camera, a few things hanging catching the light */}
      {/* open toward the doorway: back, sides, roof and floor only */}
      {[
        [[0, 1.2, -5.1], [0, 0, 0], [6, 2.6]],
        [[-3, 1.2, -2.6], [0, Math.PI / 2, 0], [5, 2.6]],
        [[3, 1.2, -2.6], [0, -Math.PI / 2, 0], [5, 2.6]],
        [[0, 2.5, -2.6], [Math.PI / 2, 0, 0], [6, 5]],
        [[0, 0.004, -2.6], [-Math.PI / 2, 0, 0], [6, 5]],
      ].map(([p, r, s], i) => (
        <mesh key={i} position={p as Vec3} rotation={r as Vec3}>
          <planeGeometry args={s as [number, number]} />
          <meshBasicMaterial color={i === 4 ? "#2a2018" : "#17120e"} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <InkBox size={[0.06, 0.5, 0.3]} position={[-0.9, 1.25, -0.25]} color="#7d6d5b" />
      <InkCylinder radius={0.09} height={0.2} position={[0.85, 0.1, -0.35]} color="#5e4734" />
      {/* the door leaf: hinged on the left jamb, swinging out into the yard */}
      <group position={[-w / 2, 0, 0.04]} rotation={[0, -open * 1.9, 0]}>
        <InkBox size={[w, h - 0.02, 0.06]} position={[w / 2, h / 2, 0.03]} color="#6a5240" map={planks} />
        <InkBox size={[w - 0.1, 0.06, 0.03]} position={[w / 2, h * 0.3, 0.07]} color="#4e3a2a" />
        <InkBox size={[w - 0.1, 0.06, 0.03]} position={[w / 2, h * 0.75, 0.07]} color="#4e3a2a" />
      </group>
    </group>
  );
};
