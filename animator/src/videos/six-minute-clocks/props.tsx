import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, Screen, toonRamp, Vec3 } from "../../engine";

// Props for "Why Europe's Oven Clocks Ran Six Minutes Slow".
// Sets built from guide/references/kitchen-oven.md, station-platform.md and grid-control-room.md.

const INK = "#161212";
const BLOCK_FONT = "Arial Black, Impact, sans-serif";

// ---------- small pieces ----------

// A glowing 7-segment style readout in a dark bezel (oven strip, radio alarm, phone lock screen).
export const Readout: React.FC<{ position: Vec3; text: string; size?: [number, number]; glow?: string; rotation?: Vec3; appear?: number; count?: number }> = ({
  position,
  text,
  size = [0.3, 0.12],
  glow = "#ff9f1c",
  rotation,
  appear,
  count,
}) => <Screen position={position} text={text} size={size} glow={glow} bg="#08090b" rotation={rotation} appear={appear} count={count} />;

// A round wall clock face with hour and minute hands (hours 0..12, minutes 0..60).
export const RoundClock: React.FC<{ position: Vec3; hours: number; minutes: number; size?: number; rotation?: Vec3 }> = ({ position, hours, minutes, size = 0.5, rotation = [0, 0, 0] }) => {
  const face = useMemo(
    () =>
      canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(128, 128, 120, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 12;
        ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          ctx.lineWidth = i % 3 === 0 ? 10 : 5;
          ctx.beginPath();
          ctx.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92);
          ctx.lineTo(128 + Math.sin(a) * 108, 128 - Math.cos(a) * 108);
          ctx.stroke();
        }
      }),
    [],
  );
  const hand = (len: number, w: number, angle: number, color: string, z: number) => (
    <group rotation={[0, 0, -angle]} position={[0, 0, z]}>
      <mesh position={[0, len / 2, 0]}>
        <planeGeometry args={[w, len]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
  const r = size / 2;
  return (
    <group position={position} rotation={rotation}>
      <InkCylinder radius={r * 1.06} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#2c3a40" />
      <mesh position={[0, 0, 0.03]}>
        <circleGeometry args={[r, 48]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      {hand(r * 0.55, r * 0.09, ((hours % 12) + minutes / 60) * (Math.PI / 6), INK, 0.035)}
      {hand(r * 0.82, r * 0.06, minutes * (Math.PI / 30), INK, 0.037)}
      <mesh position={[0, 0, 0.04]}>
        <circleGeometry args={[r * 0.07, 16]} />
        <meshBasicMaterial color="#e0262f" toneMapped={false} />
      </mesh>
    </group>
  );
};

// A wall socket plate with two holes; `plug` adds a plug and a cable hanging down to `cableTo` (local y).
export const Socket: React.FC<{ position: Vec3; scale?: number; plug?: boolean; color?: string }> = ({ position, scale = 1, plug = true, color = "#f4f1ea" }) => (
  <group position={position} scale={scale}>
    <InkBox size={[0.16, 0.16, 0.025]} color={color} ink={0.006} />
    {[-0.035, 0.035].map((x) => (
      <mesh key={x} position={[x, 0, 0.014]}>
        <circleGeometry args={[0.012, 16]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    ))}
    {plug && (
      <group position={[0, 0, 0.05]}>
        <InkCylinder radius={0.05} height={0.07} rotation={[Math.PI / 2, 0, 0]} color="#2c3a40" ink={0.006} />
        <InkCylinder radius={0.012} height={0.3} position={[0, -0.17, 0.0]} color="#2c3a40" ink={0.004} />
      </group>
    )}
  </group>
);

// A wall calendar: red header, big month. `flip` 0..1 tears the top page (showing `next` underneath) up and over.
export const WallCalendar: React.FC<{ position: Vec3; month: string; next?: string; flip?: number; width?: number }> = ({ position, month, next, flip = 0, width = 0.5 }) => {
  const h = width * 1.15;
  const page = (text: string) => (
    <group>
      <InkBox size={[width, h, 0.01]} position={[0, -h / 2, 0]} color="#fffaf0" ink={0.006} />
      <InkBox size={[width, h * 0.22, 0.012]} position={[0, -h * 0.11, 0.002]} color="#e0262f" ink={0} />
      <Label text={text} position={[0, -h * 0.58, 0.012]} width={width * 0.92} border={false} bg="#fffaf0" fg={INK} />
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[-width * 0.36 + (i % 4) * width * 0.24, -h * 0.82 - Math.floor(i / 4) * h * 0.05, 0.012]}>
          <planeGeometry args={[width * 0.15, h * 0.025]} />
          <meshBasicMaterial color="#c9ced3" />
        </mesh>
      ))}
    </group>
  );
  return (
    <group position={position}>
      <InkCylinder radius={0.012} height={0.02} position={[0, 0.02, 0.0]} rotation={[Math.PI / 2, 0, 0]} color="#9aa0a6" ink={0.004} />
      {next && <group position={[0, 0, -0.006]}>{page(next)}</group>}
      {flip < 0.98 && (
        <group rotation={[-flip * Math.PI * 0.95, 0, 0]} position={[0, 0, 0.004]}>
          {page(month)}
        </group>
      )}
    </group>
  );
};

// A pendant lamp hanging from the ceiling with a glowing bulb.
export const Pendant: React.FC<{ position: Vec3; color?: string; shade?: string }> = ({ position, color = "#ffd27a", shade = "#2a9d8f" }) => (
  <group position={position}>
    <InkCylinder radius={0.006} height={0.9} position={[0, 0.5, 0]} color={INK} ink={0} />
    <mesh position={[0, 0, 0]} castShadow>
      <coneGeometry args={[0.2, 0.18, 32, 1, true]} />
      <meshToonMaterial color={shade} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, -0.08, 0]}>
      <sphereGeometry args={[0.06, 16, 12]} />
      <meshBasicMaterial color="#fff6d8" toneMapped={false} />
    </mesh>
    <Halo position={[0, -0.1, 0]} size={0.9} color={color} strength={0.55} />
    <pointLight position={[0, -0.2, 0]} intensity={3} distance={4} color={color} />
  </group>
);

// ---------- kitchen ----------

// A tall cabinet column with a built-in oven at chest height: control strip with two knobs and the clock readout.
// Front face at z = position.z + 0.3. `clock` is the time shown; `door` 0..1 drops the oven door open.
export const OvenColumn: React.FC<{ position: Vec3; clock: string; door?: number; glow?: string; blink?: boolean; f?: number }> = ({ position, clock, door = 0, glow = "#39ff7a", blink, f = 0 }) => {
  const on = !blink || Math.floor(f / 10) % 2 === 0;
  return (
    <group position={position}>
      <InkBox size={[0.7, 2.3, 0.6]} position={[0, 1.15, 0]} color="#f2d3a0" />
      {/* oven body */}
      <InkBox size={[0.62, 0.62, 0.04]} position={[0, 1.06, 0.31]} color="#c9ced3" ink={0.008} />
      <group position={[0, 0.78, 0.34]} rotation={[door * 1.4, 0, 0]}>
        <InkBox size={[0.58, 0.46, 0.04]} position={[0, 0.23, 0]} color="#1b1f24" ink={0.008} />
        <InkBox size={[0.42, 0.03, 0.04]} position={[0, 0.4, 0.05]} color="#e6ecf2" ink={0.005} />
      </group>
      {door > 0.05 && <pointLight position={[0, 1.0, 0.1]} intensity={2 * door} distance={1.5} color="#ffb347" />}
      {/* control strip */}
      <InkBox size={[0.62, 0.13, 0.03]} position={[0, 1.42, 0.33]} color="#9aa0a6" ink={0.006} />
      {[-0.23, 0.23].map((x) => (
        <InkCylinder key={x} radius={0.04} height={0.04} position={[x, 1.42, 0.36]} rotation={[Math.PI / 2, 0, 0]} color="#2c3a40" ink={0.005} />
      ))}
      {on ? <Readout position={[0, 1.42, 0.35]} text={clock} size={[0.26, 0.09]} glow={glow} /> : <InkBox size={[0.26, 0.09, 0.02]} position={[0, 1.42, 0.35]} color="#08090b" ink={0.004} />}
      {/* lower drawer and upper cupboard lines */}
      <InkBox size={[0.6, 0.02, 0.01]} position={[0, 0.5, 0.305]} color="#c79a5e" ink={0} />
      <InkBox size={[0.6, 0.02, 0.01]} position={[0, 1.62, 0.305]} color="#c79a5e" ink={0} />
    </group>
  );
};

// A worktop run with a tiled splashback, a kettle and a mug. Front at z + 0.3.
export const Worktop: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 1.6 }) => (
  <group position={position}>
    <InkBox size={[width, 0.86, 0.6]} position={[0, 0.43, 0]} color="#f2d3a0" />
    <InkBox size={[width + 0.04, 0.05, 0.64]} position={[0, 0.885, 0]} color="#b9773f" ink={0.008} />
    {Array.from({ length: Math.round(width / 0.4) - 1 }, (_, i) => (
      <InkBox key={i} size={[0.012, 0.8, 0.01]} position={[-width / 2 + 0.4 * (i + 1), 0.43, 0.301]} color="#c79a5e" ink={0} />
    ))}
    {/* kettle */}
    <InkCylinder radius={0.09} height={0.2} position={[-width / 2 + 0.25, 1.01, -0.1]} color="#e0262f" ink={0.008} />
    <Plant3 position={[width / 2 - 0.2, 0.91, -0.12]} />
  </group>
);

const Plant3: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.07} height={0.12} position={[0, 0.06, 0]} color="#e07a3a" ink={0.006} />
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh key={i} position={[Math.sin(i * 1.3) * 0.05, 0.2 + (i % 2) * 0.05, Math.cos(i * 1.3) * 0.05]} rotation={[0.3 * Math.sin(i), i, 0.4 * Math.cos(i)]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshToonMaterial color="#3fae5a" gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

// A coffee mug on a surface; `pour` 0..1 shows a stream and `spill` 0..1 a growing puddle (overflow gag).
export const Mug: React.FC<{ position: Vec3; pour?: number; spill?: number }> = ({ position, pour = 0, spill = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.05} height={0.1} position={[0, 0.05, 0]} color="#ffffff" ink={0.006} />
    <mesh position={[0, 0.1 + Math.min(pour, 1) * 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.045, 24]} />
      <meshBasicMaterial color="#5a3420" />
    </mesh>
    {pour > 0 && pour < 1 && <InkCylinder radius={0.008} height={0.3} position={[0, 0.27, 0]} color="#5a3420" ink={0.003} />}
    {spill > 0 && (
      <group userData={{ ghost: true }}>
        <mesh position={[0.03, 0.003, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[1 + spill * 1.6, 1 + spill * 1.2, 1]}>
          <circleGeometry args={[0.07 * spill + 0.02, 24]} />
          <meshBasicMaterial color="#6a3e24" />
        </mesh>
        <InkBox size={[0.012, 0.1 * spill, 0.012]} position={[0.05, 0.05, 0.03]} color="#5a3420" ink={0} />
      </group>
    )}
  </group>
);

// ---------- radio alarm clock ----------

// A chunky radio alarm clock: red LED digits, a speaker grille, buttons on top. `buzz` 0..1 shakes it.
export const RadioClock: React.FC<{ position: Vec3; text: string; buzz?: number; f?: number; rotation?: Vec3; scale?: number; blink?: boolean }> = ({
  position,
  text,
  buzz = 0,
  f = 0,
  rotation = [0, 0, 0],
  scale = 1,
  blink,
}) => {
  const jig = buzz * Math.sin(f * 2.6) * 0.06;
  const on = !blink || Math.floor(f / 8) % 2 === 0;
  return (
    <group position={position} rotation={[rotation[0], rotation[1], rotation[2] + jig]} scale={scale}>
      <InkBox size={[0.34, 0.15, 0.13]} position={[0, 0, 0]} color="#3a2a40" ink={0.008} />
      {on ? <Readout position={[-0.05, 0, 0.066]} text={text} size={[0.19, 0.08]} glow="#ff3b30" /> : <InkBox size={[0.19, 0.08, 0.01]} position={[-0.05, 0, 0.07]} color="#08090b" ink={0} />}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[0.12, 0.045 - i * 0.03, 0.067]}>
          <planeGeometry args={[0.07, 0.012]} />
          <meshBasicMaterial color="#1b1218" />
        </mesh>
      ))}
      {[-0.1, 0, 0.1].map((x) => (
        <InkBox key={x} size={[0.06, 0.02, 0.04]} position={[x, 0.085, 0]} color="#c9ced3" ink={0.004} />
      ))}
      {buzz > 0.1 && (
        <group userData={{ ghost: true }}>
          {[0, 1, 2].map((i) => {
            const a = ((f * 0.08 + i / 3) % 1);
            return (
              <mesh key={i} position={[0.24 + a * 0.12, 0.05, 0.02]} rotation={[0, 0, 0]}>
                <ringGeometry args={[0.03 + a * 0.1, 0.04 + a * 0.1, 24, 1, -0.9, 1.8]} />
                <meshBasicMaterial color="#ffd23f" transparent opacity={1 - a} toneMapped={false} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// A big phone (lock screen shows the time) standing on its edge; `quartz` opens its back to show a crystal.
export const BigPhone: React.FC<{ position: Vec3; text: string; scale?: number; rotation?: Vec3; quartz?: boolean; f?: number }> = ({ position, text, scale = 1, rotation = [0, 0, 0], quartz, f = 0 }) => (
  <group position={position} scale={scale} rotation={rotation}>
    <InkBox size={[0.34, 0.66, 0.04]} position={[0, 0, 0]} color="#1d1a1a" ink={0.01} />
    <Screen position={[0, 0.02, 0.022]} text={text} size={[0.28, 0.5]} glow="#ffffff" bg="#2a4f9e" />
    {quartz && (
      <group position={[0, -0.12, 0.09]}>
        <mesh rotation={[0, 0, Math.sin(f * 1.7) * 0.05]}>
          <octahedronGeometry args={[0.07, 0]} />
          <meshToonMaterial color="#d8f3ff" gradientMap={toonRamp} emissive="#5ad1ff" emissiveIntensity={0.4} />
        </mesh>
        <Halo position={[0, 0, -0.02]} size={0.3} color="#bfefff" strength={0.5} />
      </group>
    )}
  </group>
);

// A wall of mains-clock displays (oven strips and radio clocks) all showing the same late time, blinking a little.
export const ClockWall: React.FC<{ position: Vec3; text: string; f: number; cols?: number; rows?: number }> = ({ position, text, f, cols = 5, rows = 5 }) => (
  <group position={position}>
    {Array.from({ length: cols * rows }, (_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = (c - (cols - 1) / 2) * 0.48;
      const y = r * 0.42;
      const kind = (c * 3 + r * 2) % 3;
      const lit = Math.floor((f + i * 7) / 14) % 5 !== 0;
      if (kind === 0) return <RadioClock key={i} position={[x, y, 0]} text={lit ? text : ""} />;
      const col = ["#c9ced3", "#f2d3a0", "#ffffff"][kind];
      return (
        <group key={i} position={[x, y, 0]}>
          <InkBox size={[0.4, 0.17, 0.06]} color={col} ink={0.008} />
          <Readout position={[0, 0, 0.04]} text={lit ? text : ""} size={[0.2, 0.08]} glow={kind === 1 ? "#39ff7a" : "#ff9f1c"} />
        </group>
      );
    })}
  </group>
);

// ---------- clockworks ----------

// The mains current as a rope swinging up and down from `from` to `to`: `phase` slides the wave along.
// `cycles` is how many waves fit on it; `amp` its height.
export const WaveRope: React.FC<{ from: Vec3; to: Vec3; phase: number; cycles?: number; amp?: number; color?: string; radius?: number }> = ({
  from,
  to,
  phase,
  cycles = 3,
  amp = 0.12,
  color = "#ffd23f",
  radius = 0.022,
}) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = 120;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const env = Math.sin(Math.PI * Math.min(1, t * 6)) * (t < 1 / 6 ? 1 : 1);
      const k = t < 1 / 12 ? env : 1;
      pts.push(
        new THREE.Vector3(
          from[0] + (to[0] - from[0]) * t,
          from[1] + (to[1] - from[1]) * t + Math.sin(t * cycles * Math.PI * 2 - phase) * amp * k,
          from[2] + (to[2] - from[2]) * t,
        ),
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return [new THREE.TubeGeometry(curve, 240, radius, 10, false), new THREE.TubeGeometry(curve, 240, radius + 0.008, 10, false)];
  }, [from[0], from[1], from[2], to[0], to[1], to[2], phase, cycles, amp, radius]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group userData={{ ghost: true }}>
      <mesh geometry={geo[0]}>
        <meshToonMaterial color={color} gradientMap={toonRamp} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      <mesh geometry={geo[1]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

// A mechanical counter box: a SWINGS drum that counts 0..49 and a SECONDS window that clicks on each fiftieth.
export const SwingCounter: React.FC<{ position: Vec3; swings: number; seconds: number; tick?: number; scale?: number }> = ({ position, swings, seconds, tick = 0, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[1.3, 0.62, 0.35]} position={[0, 0, 0]} color="#e6ecf2" ink={0.014} />
    <Label text="SWINGS" position={[-0.3, 0.19, 0.18]} width={0.46} bg="#e6ecf2" border={false} />
    <Readout position={[-0.3, -0.06, 0.19]} text={String(Math.floor(swings)).padStart(2, "0")} size={[0.42, 0.26]} glow="#ffd23f" />
    <Label text="SECONDS" position={[0.32, 0.19, 0.18]} width={0.46} bg="#e6ecf2" border={false} />
    <group position={[0.32, -0.06, 0]} scale={1 + tick * 0.15}>
      <Readout position={[0, 0, 0.19]} text={String(seconds)} size={[0.42, 0.26]} glow="#39ff7a" />
    </group>
    {/* gears on the side */}
    {[[-0.72, 0.15, 0.12], [-0.74, -0.18, 0.09]].map(([x, y, r], i) => (
      <group key={i} position={[x, y, 0]} rotation={[0, 0, (i ? -1 : 1) * swings * 0.6]}>
        <InkCylinder radius={r} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#ffb000" ink={0.006} />
        {Array.from({ length: 8 }, (_, k) => (
          <InkBox key={k} size={[0.03, r * 2.4, 0.05]} rotation={[0, 0, (k * Math.PI) / 8]} color="#ffb000" ink={0.004} />
        ))}
      </group>
    ))}
  </group>
);

// ---------- power strip ----------

// A long power strip lying along x with `n` plugs; each plug's cable rises to a small tag in a country colour.
const TAG_COLORS = ["#e0262f", "#ffd23f", "#1d4fa8", "#3fae5a", "#ff9f1c", "#9b5de5", "#2a9d8f", "#f28482", "#ffffff"];
export const PowerStrip: React.FC<{ position: Vec3; n?: number; spacing?: number; pulse?: number }> = ({ position, n = 25, spacing = 0.26, pulse = 0 }) => {
  const len = n * spacing + 0.3;
  return (
    <group position={position}>
      <InkBox size={[len, 0.12, 0.22]} position={[0, 0.06, 0]} color="#f4f1ea" ink={0.01} />
      {Array.from({ length: n }, (_, i) => {
        const x = -len / 2 + 0.15 + spacing * (i + 0.5);
        const glow = 0.5 + 0.5 * Math.sin(pulse - i * 0.0);
        return (
          <group key={i} position={[x, 0.12, 0]}>
            <InkBox size={[0.1, 0.06, 0.1]} position={[0, 0.03, 0]} color="#2c3a40" ink={0.005} />
            <InkCylinder radius={0.008} height={0.5} position={[0, 0.3, 0]} color="#2c3a40" ink={0} />
            <InkBox size={[0.13, 0.09, 0.02]} position={[0, 0.58, 0]} color={TAG_COLORS[(i * 4) % TAG_COLORS.length]} ink={0.005} />
            <mesh position={[0, 0.07, 0.06]}>
              <circleGeometry args={[0.012, 12]} />
              <meshBasicMaterial color={glow > 0.5 ? "#39ff7a" : "#1b5e30"} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- control room ----------

// The video wall: a dark panel with a network of green/yellow/red lines and square nodes. `alarm` reddens lines.
export const VideoWall: React.FC<{ position: Vec3; width?: number; height?: number; alarm?: boolean }> = ({ position, width = 5, height = 1.6, alarm }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, Math.round((1024 * height) / width), (ctx) => {
        const W = 1024;
        const H = Math.round((1024 * height) / width);
        ctx.fillStyle = "#06121c";
        ctx.fillRect(0, 0, W, H);
        let s = 7;
        const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
        const nodes = Array.from({ length: 34 }, () => [30 + rnd() * (W - 60), 20 + rnd() * (H - 40)]);
        const cols = alarm ? ["#ff3b30", "#ffb000", "#ff3b30"] : ["#39ff7a", "#ffd23f", "#5ad1ff"];
        ctx.lineWidth = 4;
        nodes.forEach(([x, y], i) => {
          const [x2, y2] = nodes[(i * 7 + 3) % nodes.length];
          ctx.strokeStyle = cols[i % 3];
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x2, y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });
        nodes.forEach(([x, y], i) => {
          ctx.fillStyle = i % 5 === 0 ? (alarm ? "#ff3b30" : "#ffffff") : "#9fb6ff";
          ctx.fillRect(x - 7, y - 7, 14, 14);
        });
      }),
    [width, height, alarm],
  );
  return (
    <group position={position}>
      <InkBox size={[width + 0.1, height + 0.1, 0.06]} color="#1b222b" ink={0.01} />
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <Halo position={[0, 0, 0.02]} size={width * 0.9} color={alarm ? "#ff3b30" : "#5ad1ff"} strength={0.18} />
    </group>
  );
};

// A console desk with a bank of monitors stacked two high (front edge toward +z). 0.75 m high.
export const Console: React.FC<{ position: Vec3; width?: number; alarm?: boolean; rotationY?: number }> = ({ position, width = 1.4, alarm, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[width, 0.72, 0.6]} position={[0, 0.36, 0]} color="#3a4652" />
    <InkBox size={[width + 0.06, 0.04, 0.66]} position={[0, 0.74, 0]} color="#c9ced3" ink={0.008} />
    {Array.from({ length: Math.max(2, Math.round(width / 0.45)) }, (_, i) =>
      [0, 1].map((row) => {
        const n = Math.max(2, Math.round(width / 0.45));
        const x = (i - (n - 1) / 2) * 0.42;
        const c = alarm && (i + row) % 2 === 0 ? "#ff6a5a" : row ? "#5ad1ff" : "#39ff7a";
        return (
          <group key={`${i}${row}`} position={[x, 0.98 + row * 0.27, -0.18]} rotation={[-0.08, 0, 0]}>
            <InkBox size={[0.4, 0.25, 0.03]} color="#22262b" ink={0.006} />
            <mesh position={[0, 0, 0.017]}>
              <planeGeometry args={[0.36, 0.21]} />
              <meshBasicMaterial color="#0b1a2a" toneMapped={false} />
            </mesh>
            {[0, 1, 2].map((k) => (
              <mesh key={k} position={[-0.08 + k * 0.08, -0.03 + ((i + k + row) % 3) * 0.03, 0.018]}>
                <planeGeometry args={[0.06, 0.012]} />
                <meshBasicMaterial color={c} toneMapped={false} />
              </mesh>
            ))}
          </group>
        );
      }),
    )}
    <InkCylinder radius={0.02} height={0.3} position={[0, 0.88, -0.18]} color="#22262b" ink={0} />
  </group>
);

// A big round frequency gauge: dial face 49.9 .. 50.1 HZ, needle at `hz`.
export const HzDial: React.FC<{ position: Vec3; hz: number; size?: number; alarm?: boolean }> = ({ position, hz, size = 0.9, alarm }) => {
  const face = useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = alarm ? "#ffe2dc" : "#fffaf0";
        ctx.beginPath();
        ctx.arc(256, 256, 248, 0, Math.PI * 2);
        ctx.fill();
        // zones: red low, green middle, red high
        const arc = (a0: number, a1: number, col: string) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = 34;
          ctx.beginPath();
          ctx.arc(256, 300, 190, a0, a1);
          ctx.stroke();
        };
        arc(Math.PI * 1.1, Math.PI * 1.35, "#e0262f");
        arc(Math.PI * 1.35, Math.PI * 1.65, "#3fae5a");
        arc(Math.PI * 1.65, Math.PI * 1.9, "#e0262f");
        ctx.fillStyle = INK;
        ctx.textAlign = "center";
        ctx.font = `900 64px ${BLOCK_FONT}`;
        ctx.fillText("50", 256, 82);
        ctx.font = `900 72px ${BLOCK_FONT}`;
        ctx.fillText("HZ", 256, 420);
      }),
    [alarm],
  );
  // 50 Hz points straight up; ±0.01 Hz swings the needle ±0.9 rad (exaggerated so the sag reads).
  const angle = Math.max(-1.3, Math.min(1.3, (hz - 50) * 90));
  return (
    <group position={position}>
      <InkCylinder radius={size / 2 + 0.03} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#2c3a40" />
      <mesh position={[0, 0, 0.035]}>
        <circleGeometry args={[size / 2, 48]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      <group position={[0, -size * 0.088, 0.045]} rotation={[0, 0, -angle]}>
        <mesh position={[0, size * 0.18, 0]}>
          <planeGeometry args={[size * 0.035, size * 0.36]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      </group>
      <mesh position={[0, -size * 0.088, 0.05]}>
        <circleGeometry args={[size * 0.04, 16]} />
        <meshBasicMaterial color="#e0262f" />
      </mesh>
    </group>
  );
};

// A balance scale on a post: left pan POWER IN, right pan POWER OUT. `tilt` > 0 drops the right pan.
// `inLoad` / `outLoad` stack crates (labelled ENERGY) on each pan.
export const BalanceScale: React.FC<{ position: Vec3; tilt: number; inLoad?: number; outLoad?: number; leftLabel?: string; rightLabel?: string; extra?: number }> = ({
  position,
  tilt,
  inLoad = 2,
  outLoad = 2,
  leftLabel = "POWER IN",
  rightLabel = "POWER OUT",
  extra = 0,
}) => {
  const arm = 0.62;
  const pan = (side: -1 | 1, load: number, label: string, color: string) => {
    const y = -side * Math.sin(tilt) * arm;
    return (
      <group position={[side * arm * Math.cos(tilt), 1.3 + y, 0]}>
        <InkCylinder radius={0.005} height={0.4} position={[-0.1, -0.2, 0]} rotation={[0, 0, -0.25]} color={INK} ink={0} />
        <InkCylinder radius={0.005} height={0.4} position={[0.1, -0.2, 0]} rotation={[0, 0, 0.25]} color={INK} ink={0} />
        <InkCylinder radius={0.26} height={0.04} position={[0, -0.4, 0]} color="#ffb000" ink={0.008} />
        {Array.from({ length: Math.floor(load) }, (_, i) => (
          <InkBox key={i} size={[0.16, 0.12, 0.14]} position={[(i % 2) * 0.17 - 0.08, -0.32 + Math.floor(i / 2) * 0.125, 0]} color={color} ink={0.006} />
        ))}
        <Label text={label} position={[0, -0.62, 0.05]} width={0.46} />
      </group>
    );
  };
  return (
    <group position={position}>
      <InkBox size={[0.4, 0.06, 0.3]} position={[0, 0.03, 0]} color="#2c3a40" />
      <InkCylinder radius={0.035} height={1.3} position={[0, 0.68, 0]} color="#9aa0a6" />
      <group position={[0, 1.33, 0]} rotation={[0, 0, -tilt]}>
        <InkBox size={[arm * 2 + 0.1, 0.05, 0.06]} color="#ffb000" ink={0.008} />
      </group>
      <InkCylinder radius={0.05} height={0.08} position={[0, 1.33, 0.02]} rotation={[Math.PI / 2, 0, 0]} color="#e0262f" />
      {pan(-1, inLoad + extra, leftLabel, "#39ff7a")}
      {pan(1, outLoad, rightLabel, "#5ad1ff")}
    </group>
  );
};

// A rotating red beacon (alarm) with a halo that sweeps.
export const Beacon: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position}>
    <InkCylinder radius={0.08} height={0.12} color="#ff3b30" ink={0.008} emissive="#ff1a10" />
    <Halo position={[Math.sin(f * 0.3) * 0.12, 0, 0.1]} size={0.9 + 0.3 * Math.abs(Math.sin(f * 0.3))} color="#ff3b30" strength={0.6} />
  </group>
);

// A crate labelled ENERGY (pushed into the grid in March).
export const EnergyCrate: React.FC<{ position: Vec3; scale?: number; rotationY?: number }> = ({ position, scale = 1, rotationY = 0 }) => (
  <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.42, 0.32, 0.36]} position={[0, 0.16, 0]} color="#39ff7a" />
    <Label text="ENERGY" position={[0, 0.17, 0.185]} width={0.36} bg="#ffffff" />
  </group>
);

// ---------- platform ----------

// A commuter train lying along x, its side facing +z, doors at `doors` 0..1 closed. `x` slides it away.
export const Train: React.FC<{ position: Vec3; doors?: number; length?: number }> = ({ position, doors = 1, length = 9 }) => (
  <group position={position}>
    <InkBox size={[length, 1.7, 1.2]} position={[0, 1.0, 0]} color="#f4f6f8" />
    <InkBox size={[length, 0.14, 0.02]} position={[0, 0.55, 0.61]} color="#e0262f" ink={0} />
    <InkBox size={[length, 0.06, 0.02]} position={[0, 1.78, 0.61]} color="#2a9d8f" ink={0} />
    <InkBox size={[length, 0.25, 1.1]} position={[0, 0.05, 0]} color="#2c3a40" />
    {Array.from({ length: Math.floor(length / 1.5) }, (_, i) => {
      const x = -length / 2 + 0.75 + i * 1.5;
      const isDoor = i % 2 === 1;
      return isDoor ? (
        <group key={i} position={[x, 0.95, 0.61]}>
          {[-1, 1].map((s) => (
            <InkBox key={s} size={[0.36, 1.3, 0.02]} position={[s * (0.18 + (1 - doors) * 0.34), 0, 0.01]} color="#c9ced3" ink={0.006} />
          ))}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[0.72, 1.3]} />
            <meshBasicMaterial color="#1b2a4a" />
          </mesh>
          <mesh position={[0, 0.75, 0.02]}>
            <circleGeometry args={[0.04, 12]} />
            <meshBasicMaterial color={doors > 0.9 ? "#ff3b30" : "#39ff7a"} toneMapped={false} />
          </mesh>
        </group>
      ) : (
        <mesh key={i} position={[x, 1.25, 0.611]}>
          <planeGeometry args={[1.1, 0.55]} />
          <meshBasicMaterial color="#5a7dbf" />
        </mesh>
      );
    })}
  </group>
);

// Platform furniture: the yellow edge line at z, a canopy post with a round clock and a departure board.
export const PlatformKit: React.FC<{ edgeZ: number; clock: [number, number]; board: string; postX?: number }> = ({ edgeZ, clock, board, postX = 0.9 }) => (
  <group>
    <mesh position={[0, 0.004, edgeZ + 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[30, 0.12]} />
      <meshBasicMaterial color="#ffd23f" />
    </mesh>
    <InkBox size={[30, 0.08, 0.3]} position={[0, 0.0, edgeZ]} color="#9aa0a6" ink={0.006} />
    <InkCylinder radius={0.05} height={2.8} position={[postX, 1.4, edgeZ + 1.3]} color="#2c3a40" />
    <RoundClock position={[postX, 2.35, edgeZ + 1.36]} hours={clock[0]} minutes={clock[1]} size={0.42} />
    <group position={[postX - 0.85, 2.3, edgeZ + 1.3]}>
      <InkCylinder radius={0.006} height={0.3} position={[-0.4, 0.33, 0]} color={INK} ink={0} />
      <InkCylinder radius={0.006} height={0.3} position={[0.4, 0.33, 0]} color={INK} ink={0} />
      <Screen position={[0, 0, 0]} text={board} size={[1.1, 0.34]} glow="#ffb000" bg="#0b0a06" />
    </group>
    <InkBox size={[1.0, 0.08, 0.32]} position={[-2.2, 0.45, edgeZ + 2.2]} color="#2a9d8f" />
    <InkBox size={[0.08, 0.45, 0.3]} position={[-2.6, 0.22, edgeZ + 2.2]} color="#2c3a40" />
    <InkBox size={[0.08, 0.45, 0.3]} position={[-1.8, 0.22, edgeZ + 2.2]} color="#2c3a40" />
  </group>
);

// A briefcase/bag flying out of a hand during the skid gag (t 0..1 along an arc).
export const FlyingBag: React.FC<{ from: Vec3; to: Vec3; t: number }> = ({ from, to, t }) => {
  const p = Math.min(1, Math.max(0, t));
  const y = from[1] + (to[1] - from[1]) * p + Math.sin(p * Math.PI) * 0.5;
  return (
    <group userData={{ ghost: true }} position={[from[0] + (to[0] - from[0]) * p, y, from[2] + (to[2] - from[2]) * p]} rotation={[0, 0, p * 5]}>
      <InkBox size={[0.3, 0.22, 0.1]} color="#8a4f24" ink={0.008} />
      <InkBox size={[0.12, 0.04, 0.03]} position={[0, 0.13, 0]} color="#5a3420" ink={0.004} />
    </group>
  );
};

// A coat rack with a scarf for the hallway.
export const CoatRack: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.025} height={1.7} position={[0, 0.85, 0]} color="#8a5a3a" />
    <InkCylinder radius={0.18} height={0.04} position={[0, 0.02, 0]} color="#8a5a3a" />
    <InkBox size={[0.3, 0.6, 0.1]} position={[0.12, 1.3, 0.05]} color="#1d4fa8" ink={0.008} />
    <InkBox size={[0.08, 0.7, 0.05]} position={[-0.1, 1.25, 0.08]} color="#e0262f" ink={0.006} />
  </group>
);
