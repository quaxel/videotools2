import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, Halo, Haze, InkBox, InkCylinder, Label, Ridge, Screen, toonRamp, Vec3 } from "../../engine";

// Props and the outdoor set for "Why a City Dumped 96 Million Black Balls in Its Water".
// Reservoir built from guide/references/shade-ball-reservoir.md.

const INK = "#161212";
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- reservoir ----------

// Path at y = 0 for z > -0.8; the bank slopes down to the water line at z = WATER_Z (y = WATER_Y); beyond, a
// sheet of shade balls to the horizon. A real ball is 4 inches across (r = 0.05 m).
export const WATER_Y = -0.4;
export const WATER_Z = -1.8;
const BALL_R = 0.05;
const NEAR = { x0: -7, x1: 7, z0: WATER_Z - 0.05, z1: -9.5, step: 0.105 };

// The near field: one instanced mesh, matrices rewritten every frame (bob, a boat wake, a gap).
// `clear(x, z)` returns true where there should be open water instead of balls.
const BallField: React.FC<{ f: number; clear?: (x: number, z: number) => boolean }> = ({ f, clear }) => {
  const nx = Math.floor((NEAR.x1 - NEAR.x0) / NEAR.step);
  const nz = Math.floor((NEAR.z0 - NEAR.z1) / (NEAR.step * 0.87));
  const count = nx * nz;
  const mesh = useMemo(() => {
    const geo = new THREE.SphereGeometry(BALL_R, 12, 8);
    const mat = new THREE.MeshPhongMaterial({ color: "#161616", specular: "#9aa8b8", shininess: 60 });
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.frustumCulled = false;
    return m;
  }, [count]);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  let k = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = NEAR.x0 + i * NEAR.step + (j % 2) * NEAR.step * 0.5;
      const z = NEAR.z0 - j * NEAR.step * 0.87;
      const gone = clear?.(x, z);
      tmp.position.set(x, WATER_Y + BALL_R * 0.55 + Math.sin(f * 0.12 + x * 3.1 + z * 2.3) * 0.008, z);
      tmp.scale.setScalar(gone ? 0.0001 : 1);
      tmp.updateMatrix();
      mesh.setMatrixAt(k++, tmp.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

// The far field: a flat sheet painted with packed balls and highlights.
const farTexture = () => {
  const t = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#0e0e10";
    ctx.fillRect(0, 0, 256, 256);
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 8; i++) {
        const x = i * 32 + (j % 2) * 16 + 16;
        const y = j * 32 + 16;
        ctx.fillStyle = "#202024";
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8a96a6";
        ctx.beginPath();
        ctx.arc(x - 5, y - 6, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(220, 110);
  return t;
};

// Chain-link fence along x between x0 and x1 at z, 1.3 m tall.
const Fence: React.FC<{ x0: number; x1: number; z: number }> = ({ x0, x1, z }) => {
  const tex = useMemo(() => {
    const t = canvasTexture(64, 64, (ctx) => {
      ctx.clearRect(0, 0, 64, 64);
      ctx.strokeStyle = "#c9ced3";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 32);
      ctx.lineTo(32, 0);
      ctx.lineTo(64, 32);
      ctx.lineTo(32, 64);
      ctx.closePath();
      ctx.stroke();
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set((x1 - x0) / 0.12, 1.3 / 0.12);
    return t;
  }, [x0, x1]);
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, 0.65, z]}>
        <planeGeometry args={[x1 - x0, 1.3]} />
        <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <InkBox size={[x1 - x0, 0.04, 0.04]} position={[(x0 + x1) / 2, 1.3, z]} color="#9aa0a6" ink={0.004} />
      {Array.from({ length: Math.floor((x1 - x0) / 2) + 1 }, (_, i) => (
        <InkCylinder key={i} radius={0.025} height={1.32} position={[x0 + i * 2, 0.66, z]} color="#9aa0a6" ink={0.004} />
      ))}
    </group>
  );
};

// A power pylon (lattice tower) silhouette.
const Pylon: React.FC<{ position: Vec3; scale?: number; color?: string }> = ({ position, scale = 1, color = "#5a5048" }) => (
  <group position={position} scale={scale}>
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.08, 6, 0.08]} position={[s * 0.5, 3, 0]} rotation={[0, 0, s * 0.08]} color={color} ink={0} />
    ))}
    {[1.5, 3, 4.5].map((y) => (
      <InkBox key={y} size={[1.2 - y * 0.08, 0.06, 0.06]} position={[0, y, 0]} color={color} ink={0} />
    ))}
    <InkBox size={[2.4, 0.08, 0.08]} position={[0, 5.4, 0]} color={color} ink={0} />
  </group>
);

// A small aluminium boat lying along x (bow +x).
export const Boat: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]} userData={{ ghost: true }}>
    <InkBox size={[2.0, 0.32, 0.9]} position={[0, 0.06, 0]} color="#c9ced3" ink={0.012} />
    <InkBox size={[1.9, 0.04, 0.8]} position={[0, 0.2, 0]} color="#9aa0a6" ink={0} />
    <InkBox size={[0.3, 0.3, 0.2]} position={[-1.0, 0.25, 0]} color="#2c3a40" ink={0.008} />
    <InkBox size={[0.1, 0.06, 0.82]} position={[0.2, 0.24, 0]} color="#8a5a3a" ink={0.004} />
  </group>
);

export type ReservoirOpts = { golden?: boolean; clear?: (x: number, z: number) => boolean; children?: React.ReactNode };
export const ReservoirSet: React.FC<{ camera: CameraShot; f: number } & ReservoirOpts> = ({ camera, f, golden, clear, children }) => {
  const camX = camera.position[0];
  const sky = useMemo(
    () =>
      canvasTexture(256, 1024, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 1024);
        g.addColorStop(0, golden ? "#ff8a4a" : "#3f8fe0");
        g.addColorStop(0.7, golden ? "#ffc070" : "#8fc8ff");
        g.addColorStop(1, golden ? "#ffe0a0" : "#d8eeff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 1024);
      }),
    [golden],
  );
  const far = useMemo(farTexture, []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[golden ? "#3a2208" : "#bfe6ff"]} />
      <fog attach="fog" args={[golden ? "#ffcf8a" : "#cfe6ff", 22, 70]} />
      <ambientLight intensity={golden ? 1.4 : 1.7} color={golden ? "#ffe0a0" : "#ffffff"} />
      <hemisphereLight args={[golden ? "#ffcf8a" : "#cfe9ff", "#4a3a2a", 0.6]} />
      <directionalLight
        position={golden ? [8, 5, -6] : [-6, 10, 6]}
        intensity={golden ? 2.6 : 2.4}
        color={golden ? "#ffc070" : "#fffaf0"}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
      <group position={[camX, 0, 0]}>
        <mesh position={[0, 8, -45]}>
          <planeGeometry args={[140, 40]} />
          <meshBasicMaterial map={sky} fog={false} toneMapped={false} />
        </mesh>
        <mesh position={golden ? [9, 3.5, -44] : [-12, 16, -44]}>
          <circleGeometry args={[golden ? 2.4 : 1.8, 40]} />
          <meshBasicMaterial color={golden ? "#ffd27a" : "#fffbe0"} fog={false} toneMapped={false} />
        </mesh>
        <Halo position={golden ? [9, 3.5, -43.9] : [-12, 16, -43.9]} size={golden ? 10 : 7} color={golden ? "#ffb35c" : "#fff6d8"} strength={0.5} />
      </group>
      <Ridge z={-40} shift={camX * 0.6} width={150} low={1.5} high={4.5} peaks={9} color={golden ? "#b9774a" : "#c9a06a"} seed={7} />
      <Haze z={-38} color={golden ? "#ffb06a" : "#e8d8c0"} />
      <Ridge z={-34} shift={camX * 0.3} width={150} low={0.6} high={2.6} peaks={12} color={golden ? "#8a5a3a" : "#b98a4a"} seed={19} />
      {Array.from({ length: 7 }, (_, i) => (
        <Pylon key={i} position={[-30 + i * 10 + camX * 0.3, WATER_Y + 0.5, -32]} scale={1.1} color={golden ? "#5a3a2a" : "#7a6a58"} />
      ))}
      {/* far shore */}
      <InkBox size={[160, 1.2, 6]} position={[0, WATER_Y + 0.2, -31]} color={golden ? "#c08a50" : "#d8c39a"} ink={0} />
      {/* the far sheet of balls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y + 0.03, -19]}>
        <planeGeometry args={[160, 22]} />
        <meshBasicMaterial map={far} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y - 0.02, -5]}>
        <planeGeometry args={[60, 10]} />
        <meshToonMaterial color="#2a4a5a" gradientMap={toonRamp} />
      </mesh>
      <BallField f={f} clear={clear} />
      {/* the bank: a slope from the path down to the water */}
      <group position={[0, WATER_Y / 2, (-0.8 + WATER_Z) / 2]} rotation={[Math.atan2(-WATER_Y, -0.8 - WATER_Z), 0, 0]}>
        <InkBox size={[60, 0.08, Math.hypot(WATER_Y, WATER_Z + 0.8) + 0.1]} color={golden ? "#d8a870" : "#d8c39a"} ink={0} />
      </group>
      {/* the path and the verge */}
      <InkBox size={[60, 0.1, 6]} position={[0, -0.05, 2.2]} color={golden ? "#b9925a" : "#c9b48a"} ink={0} />
      <InkBox size={[60, 0.02, 1.4]} position={[0, 0.01, 0.15]} color="#8a8478" ink={0} />
      <Fence x0={-12} x1={-1.4} z={-0.75} />
      <Fence x0={2.2} x1={12} z={-0.75} />
      {children}
    </>
  );
};

// A loose ball (thrown, bouncing, held).
export const Ball: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale} userData={{ ghost: true }}>
    <mesh>
      <sphereGeometry args={[BALL_R, 20, 14]} />
      <meshPhongMaterial color="#161616" specular="#b0bccb" shininess={70} />
    </mesh>
    <mesh>
      <sphereGeometry args={[BALL_R + 0.004, 20, 14]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

// A white bulk sack on the slope pouring balls that roll down to the water; `t` advances the pour.
export const BulkSack: React.FC<{ position: Vec3; t: number; seed?: number }> = ({ position, t, seed = 0 }) => (
  <group position={position}>
    <InkBox size={[0.8, 0.8, 0.8]} position={[0, 0.4, 0]} color="#f4f1ea" ink={0.012} />
    <InkBox size={[0.82, 0.05, 0.82]} position={[0, 0.82, 0]} color="#e0e0d8" ink={0.006} />
    {[-0.35, 0.35].map((x) => (
      <InkBox key={x} size={[0.06, 0.3, 0.06]} position={[x, 0.95, 0]} color="#e8ff3a" ink={0.004} />
    ))}
    <group userData={{ ghost: true }}>
      {Array.from({ length: 26 }, (_, i) => {
        const a = (t * 0.9 + rand(i + seed) ) % 1;
        // roll from the sack mouth down the slope (−z, −y) with a bounce
        const z = 0.45 + a * 1.1;
        const y = 0.2 - a * 0.55 + Math.abs(Math.sin(a * 9 + i)) * 0.05 * (1 - a);
        return (
          <mesh key={i} position={[(rand(i * 3 + seed) - 0.5) * 0.9, y, -z]}>
            <sphereGeometry args={[BALL_R, 10, 8]} />
            <meshPhongMaterial color="#161616" specular="#b0bccb" shininess={70} />
          </mesh>
        );
      })}
    </group>
  </group>
);

// ---------- lab pieces ----------

// A glass beaker with coloured liquid (`fill` 0..1) and a label on the front.
export const Beaker: React.FC<{ position: Vec3; color: string; fill?: number; label?: string; scale?: number; bubbles?: number; f?: number }> = ({ position, color, fill = 0.6, label, scale = 1, bubbles = 0, f = 0 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.16, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 0.32, 32, 1, true]} />
      <meshBasicMaterial color="#dff4ff" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <mesh position={[0, 0.16 * fill, 0]}>
      <cylinderGeometry args={[0.112, 0.112, 0.32 * fill, 32]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} transparent opacity={0.85} />
    </mesh>
    <mesh position={[0, 0.16, 0]}>
      <cylinderGeometry args={[0.128, 0.128, 0.33, 32, 1, true]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {label && <Label text={label} position={[0, 0.12, 0.13]} width={0.3} />}
    {bubbles > 0 &&
      Array.from({ length: 6 }, (_, i) => {
        const a = ((f * 0.04 + i / 6) % 1);
        return (
          <mesh key={i} position={[Math.sin(i * 2.1) * 0.06, 0.02 + a * 0.32 * fill, Math.cos(i * 2.1) * 0.05]}>
            <sphereGeometry args={[0.012 * bubbles, 8, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
          </mesh>
        );
      })}
  </group>
);

// A sample bottle (clear plastic) with a cap; `tint` 0..1 turns its water red (bromate).
export const SampleBottle: React.FC<{ position: Vec3; tint?: number; scale?: number }> = ({ position, tint = 0, scale = 1 }) => {
  const c = new THREE.Color("#f4fbff").lerp(new THREE.Color("#e0262f"), tint);
  return (
    <group position={position} scale={scale}>
      <InkCylinder radius={0.06} height={0.2} position={[0, 0, 0]} color={`#${c.getHexString()}`} ink={0.006} />
      <InkCylinder radius={0.03} height={0.05} position={[0, 0.125, 0]} color="#1d4fa8" ink={0.004} />
    </group>
  );
};

// A lamp on an arm shining down: a cone of light (`on` 0..1, `power` 0..1 dims it).
export const SunLamp: React.FC<{ position: Vec3; on?: number; power?: number; color?: string; beam?: number }> = ({ position, on = 1, power = 1, color = "#ffd23f", beam = 1.2 }) => (
  <group position={position}>
    <InkCylinder radius={0.03} height={0.6} position={[0, 0.3, 0]} color="#2c3a40" ink={0.004} />
    <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[0.18, 0.2, 24, 1, true]} />
      <meshToonMaterial color="#e6ecf2" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    {on > 0 && (
      <group userData={{ ghost: true }}>
        <mesh position={[0, -0.06, 0]}>
          <sphereGeometry args={[0.07, 12, 8]} />
          <meshBasicMaterial color="#fffbe0" toneMapped={false} />
        </mesh>
        <mesh position={[0, -beam / 2 - 0.05, 0]}>
          <coneGeometry args={[0.5, beam, 32, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={0.22 * on * power} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
        <Halo position={[0, -0.06, 0.05]} size={0.9} color={color} strength={0.6 * on * power} />
      </group>
    )}
  </group>
);

// A big rotary knob on a panel with a label; `value` 0..1 turns it.
export const Knob: React.FC<{ position: Vec3; value: number; label: string }> = ({ position, value, label }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.6, 0.06]} color="#e6ecf2" ink={0.008} />
    <group position={[0, 0.04, 0.05]} rotation={[0, 0, 2.2 - value * 4.4]}>
      <InkCylinder radius={0.14} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#2c3a40" ink={0.006} />
      <InkBox size={[0.03, 0.12, 0.02]} position={[0, 0.07, 0.035]} color="#ffd23f" ink={0} />
    </group>
    <Label text={label} position={[0, -0.21, 0.04]} width={0.4} />
  </group>
);

// A price tag on a little stand.
export const PriceTag: React.FC<{ position: Vec3; text: string; appear?: number; width?: number; color?: string }> = ({ position, text, appear, width = 0.7, color = "#ffd23f" }) => (
  <group position={position}>
    <InkCylinder radius={0.01} height={0.35} position={[0, -0.2, 0]} color="#2c3a40" ink={0} />
    <Label text={text} position={[0, 0, 0]} width={width} bg={color} appear={appear} />
  </group>
);

// A conveyor with a hopper; balls come out the bottom and ride to the right.
export const BallMachine: React.FC<{ position: Vec3; f: number; sack?: number }> = ({ position, f, sack = 0 }) => (
  <group position={position}>
    <InkBox size={[2.6, 0.12, 0.5]} position={[0.6, 0.7, 0]} color="#2c3a40" />
    {[-0.6, 1.8].map((x) => (
      <InkBox key={x} size={[0.08, 0.7, 0.08]} position={[x, 0.35, 0]} color="#9aa0a6" ink={0.004} />
    ))}
    {/* hopper */}
    <mesh position={[-0.5, 1.45, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[0.45, 0.7, 4, 1, true]} />
      <meshToonMaterial color="#c9ced3" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <Label text="HOPPER" position={[-0.5, 1.55, 0.33]} width={0.5} />
    {/* sack tipping into the hopper */}
    <group position={[-0.5, 2.0 + 0.1 * (1 - sack), 0]} rotation={[0, 0, -sack * 1.2]}>
      <InkBox size={[0.5, 0.6, 0.4]} position={[0, 0.2, 0]} color="#1d1a1a" ink={0.01} />
      <Label text={"CARBON\nBLACK"} position={[0, 0.2, 0.21]} width={0.44} fg="#ffffff" bg="#1d1a1a" />
    </group>
    {Array.from({ length: 10 }, (_, i) => {
      const a = ((f * 0.012 + i / 10) % 1);
      return (
        <mesh key={i} position={[-0.4 + a * 2.2, 0.82, 0]}>
          <sphereGeometry args={[0.07, 14, 10]} />
          <meshPhongMaterial color="#161616" specular="#b0bccb" shininess={70} />
        </mesh>
      );
    })}
  </group>
);

// A glass tank seen side-on (front at z + 0.45): water to `level`, bottles on a rope at given depths.
export const DepthTank: React.FC<{ position: Vec3; tints: number[]; light: number; f: number }> = ({ position, tints, light, f }) => (
  <group position={position}>
    <InkBox size={[2.0, 0.1, 1.0]} position={[0, 0.05, 0]} color="#2c3a40" />
    {/* water volume */}
    <mesh position={[0, 1.05, 0]}>
      <boxGeometry args={[1.9, 1.9, 0.9]} />
      <meshBasicMaterial color="#2f7ac8" transparent opacity={0.22} depthWrite={false} />
    </mesh>
    {/* light falling in: brighter near the top */}
    {[0, 1, 2, 3].map((k) => (
      <mesh key={k} position={[0, 1.85 - k * 0.45, 0.46]}>
        <planeGeometry args={[1.9, 0.45]} />
        <meshBasicMaterial color="#fff6c0" transparent opacity={(0.32 - k * 0.08) * light} depthWrite={false} toneMapped={false} />
      </mesh>
    ))}
    {/* frame */}
    {[-0.97, 0.97].map((x) => (
      <InkBox key={x} size={[0.05, 2.0, 0.95]} position={[x, 1.05, 0]} color="#9aa0a6" ink={0.006} />
    ))}
    <InkBox size={[2.0, 0.05, 0.95]} position={[0, 2.05, 0]} color="#9aa0a6" ink={0.006} />
    {/* beam with the rope and bottles */}
    <InkBox size={[0.06, 0.06, 1.2]} position={[0, 2.25, 0]} color="#8a5a3a" ink={0.006} />
    <InkCylinder radius={0.008} height={1.9} position={[0, 1.3, 0.3]} color="#f4f1ea" ink={0} />
    {tints.map((t, i) => (
      <SampleBottle key={i} position={[Math.sin(f / 20 + i) * 0.01, 1.8 - i * 0.6, 0.3]} tint={t} scale={1.5} />
    ))}
  </group>
);
