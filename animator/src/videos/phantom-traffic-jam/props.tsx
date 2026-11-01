import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, Halo, Haze, InkBox, InkCylinder, Label, Pine, Ridge, Screen, toonRamp, Vec3 } from "../../engine";

// Props and outdoor sets for "Why Traffic Jams Form With Nothing in the Way".
// Built from guide/references/highway-jam.md and guide/references/ring-track.md.

const INK = "#161212";
const BLOCK_FONT = "Arial Black, Impact, sans-serif";
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- car ----------

// A small cel car lying along x, nose toward +x, wheels on y = 0. The cabin has open side windows so a driver
// sitting inside shows. `brake` 0..1 lights the tail lamps; `lights` turns the headlamps on.
export const CAR_COLORS = ["#f4f6f8", "#c9ced3", "#1d4fa8", "#e0262f", "#f4f6f8", "#2a9d8f", "#ffd23f", "#c9ced3", "#3a3f4a", "#f28482"];
export const Car: React.FC<{ position: Vec3; color?: string; brake?: number; lights?: boolean; rotationY?: number; scale?: number; roofless?: boolean }> = ({
  position,
  color = "#f4f6f8",
  brake = 0,
  lights = false,
  rotationY = 0,
  scale = 1.35,
  roofless = false,
}) => (
  <group position={position} rotation={[0, rotationY, 0]} scale={scale} userData={{ ghost: true }}>
    {/* lower body */}
    <InkBox size={[1.5, 0.36, 0.8]} position={[0, 0.34, 0]} color={color} ink={0.012} />
    {/* hood slope and cabin pillars */}
    {!roofless && (
      <>
        <InkBox size={[0.82, 0.05, 0.76]} position={[-0.12, 1.06, 0]} color={color} ink={0.01} />
        {[-0.48, 0.24].map((x) =>
          [-0.36, 0.36].map((z) => <InkBox key={`${x}${z}`} size={[0.05, 0.54, 0.04]} position={[x, 0.79, z]} rotation={[0, 0, x > 0 ? -0.35 : 0.15]} color={color} ink={0.006} />),
        )}
        <mesh position={[0.33, 0.79, 0]} rotation={[0, Math.PI / 2, 0.0]}>
          <planeGeometry args={[0.72, 0.48]} />
          <meshBasicMaterial color="#9fd8ff" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      </>
    )}
    {/* wheels */}
    {[-0.48, 0.48].map((x) =>
      [-0.4, 0.4].map((z) => <InkCylinder key={`${x}${z}`} radius={0.16} height={0.1} position={[x, 0.16, z]} rotation={[Math.PI / 2, 0, 0]} color="#1d1a1a" ink={0.008} />),
    )}
    {/* tail lamps */}
    {[-0.28, 0.28].map((z) => (
      <group key={z} position={[-0.755, 0.42, z]}>
        <InkBox size={[0.02, 0.08, 0.16]} color={brake > 0.3 ? "#ff3b30" : "#7a1a1a"} ink={0.004} emissive={brake > 0.3 ? "#ff1a10" : "#000"} />
        {brake > 0.3 && <Halo position={[-0.03, 0, 0]} size={0.5 * brake} color="#ff3b30" strength={0.7 * brake} />}
      </group>
    ))}
    {/* head lamps */}
    {[-0.28, 0.28].map((z) => (
      <group key={z} position={[0.755, 0.42, z]}>
        <InkBox size={[0.02, 0.07, 0.16]} color={lights ? "#fff6d8" : "#e6ecf2"} ink={0.004} emissive={lights ? "#fff1c8" : "#000"} />
        {lights && <Halo position={[0.04, 0, 0]} size={0.6} color="#fff1c8" strength={0.6} />}
      </group>
    ))}
  </group>
);

// ---------- highway at dusk / night ----------

// Lanes run along x. Our lane at z = 0, the next at z = -1.3; guardrail at z = -2.3; verge and hills beyond.
export const LANE_Z = [0, -1.3];
export const HighwaySet: React.FC<{ camera: CameraShot; night?: boolean; children?: React.ReactNode }> = ({ camera, night, children }) => {
  const camX = camera.position[0];
  const sky = useMemo(
    () =>
      canvasTexture(256, 1024, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 1024);
        if (night) {
          g.addColorStop(0, "#04061a");
          g.addColorStop(0.6, "#0d1640");
          g.addColorStop(1, "#24305e");
        } else {
          g.addColorStop(0, "#2a1d5a");
          g.addColorStop(0.45, "#6a3f7a");
          g.addColorStop(0.75, "#e0708a");
          g.addColorStop(1, "#ffb36a");
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 1024);
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < (night ? 80 : 25); i++) ctx.fillRect(rand(i) * 256, rand(i + 300) * 420, 2, 2);
      }),
    [night],
  );
  const lane = useMemo(
    () =>
      canvasTexture(512, 64, (ctx) => {
        ctx.fillStyle = "#3a3f4a";
        ctx.fillRect(0, 0, 512, 64);
        ctx.fillStyle = "#f4f1ea";
        for (let x = 0; x < 512; x += 128) ctx.fillRect(x, 28, 70, 8);
      }),
    [],
  );
  lane.wrapS = THREE.RepeatWrapping;
  lane.repeat.set(30, 1);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[night ? "#070b1c" : "#3b2a6b"]} />
      <fog attach="fog" args={[night ? "#0d1640" : "#8a4f86", 14, 40]} />
      <ambientLight intensity={night ? 0.9 : 1.3} color={night ? "#8fa8ff" : "#ffd0c0"} />
      <hemisphereLight args={[night ? "#3a4a9a" : "#ffb37a", "#1a1430", 0.6]} />
      <directionalLight
        position={[-4, 6, 5]}
        intensity={night ? 0.9 : 2.0}
        color={night ? "#b9c8ff" : "#ffc890"}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
      <group position={[camX, 0, 0]}>
        <mesh position={[0, 7, -26]}>
          <planeGeometry args={[80, 36]} />
          <meshBasicMaterial map={sky} fog={false} toneMapped={false} />
        </mesh>
        {!night && (
          <mesh position={[6, 2.6, -25.5]}>
            <circleGeometry args={[1.5, 40]} />
            <meshBasicMaterial color="#ffe3a0" fog={false} toneMapped={false} />
          </mesh>
        )}
        {night && (
          <mesh position={[-5, 9, -25.5]}>
            <circleGeometry args={[0.9, 40]} />
            <meshBasicMaterial color="#f4f1ea" fog={false} toneMapped={false} />
          </mesh>
        )}
      </group>
      <Ridge z={-22} shift={camX * 0.55} width={90} low={2.0} high={5.2} peaks={8} color={night ? "#1b2550" : "#7a4a8c"} seed={5} />
      <Haze z={-20.5} color={night ? "#2a3a7a" : "#c9577a"} />
      <Ridge z={-18} shift={0} width={90} low={1.0} high={3.0} peaks={11} color={night ? "#121a3c" : "#53336f"} seed={17} />
      <Haze z={-16.5} color={night ? "#1b2550" : "#9a4a86"} />
      <Ridge z={-14} shift={-camX * 0.4} width={90} low={0.4} high={1.4} peaks={16} color={night ? "#0b1030" : "#3a2656"} seed={29} />
      {/* verge with pines */}
      <InkBox size={[120, 0.1, 10]} position={[0, -0.05, -8]} color={night ? "#1c2a2a" : "#4f6a4a"} ink={0} />
      {Array.from({ length: 40 }, (_, i) => (
        <Pine key={i} position={[-60 + i * 3 + rand(i) * 1.5, 0, -5.5 - rand(i + 9) * 4]} scale={0.9 + rand(i + 4) * 0.8} color={night ? "#14261f" : "#2f5a4a"} ink={0.012} />
      ))}
      {/* road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -0.65]} receiveShadow>
        <planeGeometry args={[120, 3.6]} />
        <meshToonMaterial color="#5a5f6a" gradientMap={toonRamp} map={lane} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 3.0]}>
        <planeGeometry args={[120, 4]} />
        <meshToonMaterial color="#3a3f4a" gradientMap={toonRamp} />
      </mesh>
      {/* guardrail */}
      <InkBox size={[120, 0.12, 0.05]} position={[0, 0.5, -2.45]} color="#c9ced3" ink={0.006} />
      {Array.from({ length: 60 }, (_, i) => (
        <InkBox key={i} size={[0.06, 0.5, 0.06]} position={[-60 + i * 2, 0.25, -2.45]} color="#9aa0a6" ink={0.004} />
      ))}
      {/* lamp posts */}
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} position={[-55 + i * 10, 0, -2.7]}>
          <InkCylinder radius={0.05} height={4} position={[0, 2, 0]} color="#5a5f6a" />
          <InkBox size={[0.7, 0.05, 0.05]} position={[0.3, 3.95, 0]} color="#5a5f6a" ink={0.004} />
          <InkBox size={[0.25, 0.08, 0.14]} position={[0.62, 3.9, 0]} color="#ffb347" ink={0.004} emissive="#ff9a30" />
          <Halo position={[0.62, 3.85, 0.05]} size={night ? 1.4 : 0.8} color="#ffb347" strength={night ? 0.5 : 0.25} />
        </group>
      ))}
      {/* overhead gantry */}
      <group position={[6, 0, -0.6]}>
        <InkCylinder radius={0.08} height={4.6} position={[0, 2.3, -1.9]} color="#9aa0a6" />
        <InkCylinder radius={0.08} height={4.6} position={[0, 2.3, 1.2]} color="#9aa0a6" />
        <InkBox size={[0.12, 0.12, 3.3]} position={[0, 4.5, -0.35]} color="#9aa0a6" ink={0.006} />
        <group position={[0, 3.95, -0.35]} rotation={[0, Math.PI / 2, 0]}>
          <InkBox size={[2.2, 0.8, 0.06]} color="#1f7a4a" ink={0.01} />
          <Label text={"NORTH\nCITY 24"} position={[0, 0, 0.04]} width={1.9} fg="#ffffff" bg="#1f7a4a" border={false} />
        </group>
      </group>
      {children}
    </>
  );
};

// ---------- ring track ----------

// The experiment, simulated: 22 cars on a ring following an optimal-velocity rule (each car eases toward the speed
// its gap allows). The uniform flow is unstable at this density, so a small wobble grows into a stop-and-go jam that
// travels backward. Positions in ring units (one lap = N * H).
export const RING_N = 22;
const H = 2;
const RING_L = RING_N * H;
const SIM_DT = 0.05;
const SIM_STEPS = 3200;
const Vopt = (d: number) => Math.max(0, Math.tanh(d - 2) + Math.tanh(0.6));
const SIM = (() => {
  const x = Array.from({ length: RING_N }, (_, i) => i * H + (i === 0 ? 0.3 : 0));
  const v = Array(RING_N).fill(Vopt(H));
  const xs = new Float32Array((SIM_STEPS + 1) * RING_N);
  const vs = new Float32Array((SIM_STEPS + 1) * RING_N);
  const as = new Float32Array((SIM_STEPS + 1) * RING_N);
  for (let s = 0; s <= SIM_STEPS; s++) {
    const gaps = x.map((xi, i) => (((x[(i + 1) % RING_N] - xi) % RING_L) + RING_L) % RING_L);
    const acc = gaps.map((g, i) => 0.7 * (Vopt(g) - v[i]));
    for (let i = 0; i < RING_N; i++) {
      xs[s * RING_N + i] = x[i];
      vs[s * RING_N + i] = v[i];
      as[s * RING_N + i] = acc[i];
      v[i] = Math.max(0, Math.min(v[i] + acc[i] * SIM_DT, Math.max(0, gaps[i] - 1.05) * 2));
      x[i] += v[i] * SIM_DT;
    }
  }
  return { xs, vs, as };
})();
export type RingCar = { angle: number; v: number; brake: number };
// The cars at sim time t (seconds of sim). Angle 0 at +x, increasing counter-clockwise seen from above.
export const ringAt = (t: number): RingCar[] => {
  const s = Math.max(0, Math.min(SIM_STEPS - 1, t / SIM_DT));
  const s0 = Math.floor(s);
  const k = s - s0;
  return Array.from({ length: RING_N }, (_, i) => {
    const x = SIM.xs[s0 * RING_N + i] * (1 - k) + SIM.xs[(s0 + 1) * RING_N + i] * k;
    const v = SIM.vs[s0 * RING_N + i];
    const a = SIM.as[s0 * RING_N + i];
    return { angle: (x / RING_L) * Math.PI * 2, v, brake: a < -0.04 || v < 0.08 ? 1 : 0 };
  });
};
// The angle of the middle of the jam (the slowest stretch), or null while the flow is smooth.
export const jamAngle = (t: number): number | null => {
  const cars = ringAt(t);
  const slow = cars.filter((c) => c.v < 0.12);
  if (slow.length < 2) return null;
  const sx = slow.reduce((a, c) => a + Math.cos(c.angle), 0);
  const sy = slow.reduce((a, c) => a + Math.sin(c.angle), 0);
  return Math.atan2(sy, sx);
};
export const RING_R = 14;
export const ringPoint = (angle: number, r = RING_R): [number, number] => [Math.cos(angle) * r, -Math.sin(angle) * r];

export const TrackSet: React.FC<{ camera: CameraShot; t: number; golden?: boolean; jamFlag?: number; children?: React.ReactNode }> = ({ camera, t, golden, jamFlag, children }) => {
  const cars = ringAt(t);
  const jam = jamFlag ?? null;
  const sky = useMemo(
    () =>
      canvasTexture(256, 1024, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 1024);
        g.addColorStop(0, golden ? "#ff9f5a" : "#5aa0e0");
        g.addColorStop(1, golden ? "#ffe0a0" : "#d8eeff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 1024);
      }),
    [golden],
  );
  const camX = camera.position[0];
  const camZ = camera.position[2];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[golden ? "#3a2208" : "#bfe6ff"]} />
      <fog attach="fog" args={[golden ? "#ffcf8a" : "#d8eeff", 40, 90]} />
      <ambientLight intensity={golden ? 1.5 : 1.9} color={golden ? "#ffe0a0" : "#ffffff"} />
      <hemisphereLight args={[golden ? "#ffcf8a" : "#cfe9ff", "#4a4a40", 0.6]} />
      <directionalLight
        position={golden ? [-14, 8, -6] : [-8, 16, 10]}
        intensity={golden ? 2.6 : 2.2}
        color={golden ? "#ffc070" : "#fffaf0"}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
      />
      {/* sky wall that follows the camera, far behind */}
      <group position={[camX, 0, camZ]}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} rotation={[0, (k * Math.PI) / 2, 0]} position={[Math.sin((k * Math.PI) / 2) * -60, 18, Math.cos((k * Math.PI) / 2) * -60]}>
            <planeGeometry args={[130, 40]} />
            <meshBasicMaterial map={sky} fog={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* fields and a low town line on the horizon */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[70, 64]} />
        <meshToonMaterial color={golden ? "#8a9a4a" : "#6aa84f"} gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        const r = 34 + rand(i) * 6;
        return <InkBox key={i} size={[3 + rand(i + 3) * 4, 1.5 + rand(i + 7) * 3, 3]} position={[Math.cos(a) * r, 1.2, Math.sin(a) * r]} rotation={[0, -a, 0]} color={i % 3 ? "#e6ecf2" : "#c9a26b"} ink={0.02} />;
      })}
      {/* the asphalt lot and the painted ring lane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]} receiveShadow>
        <circleGeometry args={[RING_R + 6, 96]} />
        <meshToonMaterial color="#7d8590" gradientMap={toonRamp} />
      </mesh>
      {[RING_R - 0.75, RING_R + 0.75].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <ringGeometry args={[r - 0.06, r + 0.06, 160]} />
          <meshBasicMaterial color="#f4f1ea" />
        </mesh>
      ))}
      {/* camera mast in the centre */}
      <InkCylinder radius={0.08} height={5} position={[0, 2.5, 0]} color="#c9ced3" />
      <InkBox size={[0.4, 0.3, 0.3]} position={[0, 5.1, 0]} color="#2c3a40" />
      <InkCylinder radius={0.11} height={0.12} position={[0, 4.92, 0]} color="#1d1a1a" />
      {/* the cars, driving counter-clockwise */}
      {cars.map((c, i) => {
        const [x, z] = ringPoint(c.angle);
        return <Car key={i} position={[x, 0, z]} rotationY={c.angle + Math.PI / 2} color={CAR_COLORS[i % CAR_COLORS.length]} brake={c.brake} />;
      })}
      {jam !== null && (
        <group userData={{ ghost: true }} position={[ringPoint(jam, RING_R + 1.6)[0], 0, ringPoint(jam, RING_R + 1.6)[1]]}>
          <InkCylinder radius={0.05} height={2.6} position={[0, 1.3, 0]} color="#2c3a40" />
          <group position={[0, 2.35, 0]} rotation={[0, Math.atan2(camera.position[0] - ringPoint(jam, RING_R + 1.6)[0], camera.position[2] - ringPoint(jam, RING_R + 1.6)[1]), 0]}>
            <Label text="JAM" position={[0.32, 0, 0]} width={0.6} fg="#ffffff" bg="#e0262f" />
          </group>
        </group>
      )}
      {children}
    </>
  );
};

// A round speed-limit sign on a post with the number in it.
export const SpeedSign: React.FC<{ position: Vec3; value: string; rotationY?: number; size?: number }> = ({ position, value, rotationY = 0, size = 0.7 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(128, 128, 122, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e0262f";
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.arc(128, 128, 104, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `900 ${value.length > 2 ? 80 : 110}px ${BLOCK_FONT}`;
        ctx.fillText(value, 128, 136);
      }),
    [value],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkCylinder radius={0.04} height={1.6} position={[0, 0.8, 0]} color="#9aa0a6" />
      <InkCylinder radius={size / 2 + 0.02} height={0.04} position={[0, 1.6 + size / 2, -0.03]} rotation={[Math.PI / 2, 0, 0]} color="#2c3a40" ink={0.006} />
      <mesh position={[0, 1.6 + size / 2, 0]}>
        <circleGeometry args={[size / 2, 48]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// A speed gauge (0..max) with a needle, on a stand; `value` 0..1.
export const SpeedGauge: React.FC<{ position: Vec3; value: number; size?: number }> = ({ position, value, size = 0.36 }) => {
  const face = useMemo(
    () =>
      canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = "#fffaf0";
        ctx.beginPath();
        ctx.arc(128, 128, 124, 0, Math.PI * 2);
        ctx.fill();
        const arc = (a0: number, a1: number, c: string) => {
          ctx.strokeStyle = c;
          ctx.lineWidth = 26;
          ctx.beginPath();
          ctx.arc(128, 150, 90, a0, a1);
          ctx.stroke();
        };
        arc(Math.PI * 0.9, Math.PI * 1.3, "#e0262f");
        arc(Math.PI * 1.3, Math.PI * 1.7, "#ffd23f");
        arc(Math.PI * 1.7, Math.PI * 2.1, "#3fae5a");
      }),
    [],
  );
  const angle = -1.25 + value * 2.5;
  return (
    <group position={position}>
      <InkCylinder radius={size / 2 + 0.02} height={0.04} rotation={[Math.PI / 2, 0, 0]} color="#2c3a40" ink={0.006} />
      <mesh position={[0, 0, 0.025]}>
        <circleGeometry args={[size / 2, 40]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      <group position={[0, -size * 0.09, 0.03]} rotation={[0, 0, -angle]}>
        <mesh position={[0, size * 0.17, 0]}>
          <planeGeometry args={[size * 0.05, size * 0.34]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- diner ----------

// A neon sign: glowing text on a dark backing with a halo.
export const NeonSign: React.FC<{ position: Vec3; text: string; color?: string; width?: number; flicker?: number }> = ({ position, text, color = "#ff4fd8", width = 1.4, flicker = 1 }) => (
  <group position={position}>
    <Screen position={[0, 0, 0]} text={text} size={[width, width * 0.3]} glow={flicker > 0.5 ? color : "#3a1030"} bg="#14061b" />
  </group>
);

// A tall stool (seat at HIP_HEIGHT-ish 0.62 for a counter stool).
export const Stool: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#e0262f" }) => (
  <group position={position}>
    <InkCylinder radius={0.03} height={0.28} position={[0, 0.14, 0]} color="#c9ced3" ink={0.004} />
    <InkCylinder radius={0.18} height={0.06} position={[0, 0.3, 0]} color={color} ink={0.008} />
    <InkCylinder radius={0.16} height={0.02} position={[0, 0.01, 0]} color="#9aa0a6" ink={0.004} />
  </group>
);

// A coffee cup on the counter, optionally with steam.
export const CoffeeCup: React.FC<{ position: Vec3; f?: number; steam?: boolean }> = ({ position, f = 0, steam = true }) => (
  <group position={position}>
    <InkCylinder radius={0.05} height={0.1} position={[0, 0.05, 0]} color="#ffffff" ink={0.006} />
    <mesh position={[0, 0.101, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.045, 20]} />
      <meshBasicMaterial color="#5a3420" />
    </mesh>
    {steam && (
      <group userData={{ ghost: true }}>
        {[0, 1, 2].map((i) => {
          const a = ((f * 0.02 + i / 3) % 1);
          return (
            <mesh key={i} position={[Math.sin(a * 6 + i) * 0.02, 0.14 + a * 0.25, 0]}>
              <sphereGeometry args={[0.02 + a * 0.02, 8, 6]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.6 * (1 - a)} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    )}
  </group>
);

// A coffee spray arc for the spit-take (t 0..1).
export const Spray: React.FC<{ origin: Vec3; t: number; dir?: number }> = ({ origin, t, dir = 1 }) => (
  <group userData={{ ghost: true }}>
    {t > 0 &&
      t < 1 &&
      Array.from({ length: 14 }, (_, i) => {
        const k = Math.min(1, t * 1.6 - i * 0.03);
        if (k <= 0) return null;
        return (
          <mesh key={i} position={[origin[0] + dir * k * (0.5 + (i % 4) * 0.1), origin[1] + Math.sin(k * Math.PI) * 0.15 - k * k * 0.3 + (i % 3) * 0.02, origin[2] + ((i % 5) - 2) * 0.04]}>
            <sphereGeometry args={[0.018 + (i % 3) * 0.006, 8, 6]} />
            <meshBasicMaterial color="#6a3e24" />
          </mesh>
        );
      })}
  </group>
);

// ---------- mechanism props ----------

// A bottleneck model on a table: a funnel of two walls narrowing toward +x, with toy cars squeezing into it.
export const Funnel: React.FC<{ position: Vec3; t: number }> = ({ position, t }) => (
  <group position={position}>
    <InkBox size={[3.2, 0.7, 1.4]} position={[0, 0.35, 0]} color="#2f5fb0" />
    <InkBox size={[3.2, 0.02, 1.3]} position={[0, 0.71, 0]} color="#3a3f4a" ink={0} />
    {[-1, 1].map((s) => (
      <group key={s}>
        <InkBox size={[1.6, 0.16, 0.06]} position={[-0.8, 0.79, s * 0.6]} color="#ffd23f" ink={0.006} />
        <InkBox size={[1.0, 0.16, 0.06]} position={[0.45, 0.79, s * 0.4]} rotation={[0, s * 0.4, 0]} color="#ffd23f" ink={0.006} />
        <InkBox size={[0.7, 0.16, 0.06]} position={[1.25, 0.79, s * 0.2]} color="#ffd23f" ink={0.006} />
      </group>
    ))}
    {/* tunnel mouth */}
    <InkBox size={[0.5, 0.4, 0.5]} position={[1.35, 0.92, 0]} color="#5a5f6a" />
    <mesh position={[1.099, 0.88, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[0.3, 0.26]} />
      <meshBasicMaterial color="#0b0b12" />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => {
      // cars arrive spread out on the left and bunch up before the narrow mouth
      const u = (i / 12 + t * 0.25) % 1;
      const x = -1.5 + u * 2.6;
      const bunch = x > 0 ? 1 : 0;
      const lane = i % 2 ? 0.25 : -0.25;
      const z = lane * (1 - Math.min(1, Math.max(0, (x + 0.2) / 1.0)));
      return <Car key={i} position={[Math.min(x, 0.9 - (i % 3) * 0.2 * bunch), 0.72, z]} scale={0.18} color={CAR_COLORS[i % CAR_COLORS.length]} brake={x > -0.1 ? 1 : 0} />;
    })}
  </group>
);

// A brake pedal on a plinth, labelled; `press` 0..1.
export const BrakePedal: React.FC<{ position: Vec3; press: number }> = ({ position, press }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.2, 0.5]} position={[0, 0.1, 0]} color="#2c3a40" />
    <group position={[0, 0.2, -0.15]} rotation={[-0.6 + press * 0.45, 0, 0]}>
      <InkBox size={[0.06, 0.06, 0.4]} position={[0, 0, 0.2]} color="#9aa0a6" ink={0.006} />
      <InkBox size={[0.3, 0.06, 0.16]} position={[0, 0.02, 0.42]} color="#1d1a1a" ink={0.008} />
    </group>
    <Label text="BRAKE" position={[0, 0.1, 0.26]} width={0.44} fg="#ffffff" bg="#e0262f" />
  </group>
);
